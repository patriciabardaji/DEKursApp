// First-start screen: name + optional account. Runs against a fake Supabase.
const {JSDOM, VirtualConsole} = require("jsdom");
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if(!c) fails++; };
const tick = (ms=60) => new Promise(r => setTimeout(r, ms));
const json = (status, body) => ({ok: status < 300, status, text: async () => JSON.stringify(body)});

// remote: what the fake Supabase holds; calls: every request made
function boot(remote){
  const calls = [];
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { if(!/Not implemented/.test(e.message)) errors.push(e.message); });
  const dom = new JSDOM(html, {url:"http://localhost:8123/", runScripts:"dangerously", pretendToBeVisual:true, virtualConsole: vc,
    beforeParse(w){
      w.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
      w.fetch = async (url, opts) => {
        const body = opts && opts.body ? JSON.parse(opts.body) : null;
        calls.push({url, method: (opts && opts.method) || "GET", body});
        if(url.includes("/auth/v1/signup")){
          if(remote.users[body.email]) return json(422, {msg:"User already registered"});
          remote.users[body.email] = body.password;
          if(remote.confirmEmail) return json(200, {user:{id:"u-new"}});                 // no session yet
          return json(200, {access_token:"at", refresh_token:"rt", user:{id:"u-new"}});
        }
        if(url.includes("/auth/v1/token?grant_type=password")){
          if(remote.users[body.email] !== body.password) return json(400, {error_description:"Invalid login credentials"});
          return json(200, {access_token:"at", refresh_token:"rt", user:{id:"u-1"}});
        }
        if(url.includes("/rest/v1/progress") && (!opts || !opts.method || opts.method === "GET"))
          return json(200, remote.progress ? [{data: remote.progress, updated_at: "2026-09-01T00:00:00Z"}] : []);
        if(url.includes("/rest/v1/progress")){ remote.pushed = body; return json(201, null); }
        return json(404, {msg:"unexpected " + url});
      };
    }});
  const w = dom.window, d = w.document;
  return {w, d, $: s => d.querySelector(s), ev: c => w.eval(c), calls, errors, remote};
}
const fill = ($, v) => { for(const [id, val] of Object.entries(v)){ $(id).value = val; } };

(async () => {
  // A — fresh device, new account (e-mail confirmation off)
  { const t = boot({users:{}, confirmEmail:false}); await tick(300);
    const {$, ev} = t;
    ok($("#nm") && $("#mail") && $("#pw") && $("#signup") && $("#signin") && $("#skip"), "A: first start shows name, e-mail, password, three actions");
    $("#signup").click(); await tick();
    ok(/Vornamen/.test($("#authmsg").textContent), "A: sign-up without a name asks for the name");
    fill($, {"#nm":"Pat", "#mail":"pat@example.de", "#pw":"secret7"});
    $("#signup").click(); await tick(200);
    ok(!!$("#introgo") && /How DEKurs works/.test($("#stage").textContent) && !t.d.querySelector(".level"), "A: after sign-up the English intro page is shown first");
    $("#introgo").click(); await tick();
    ok(!!t.d.querySelector(".level") && ev("P.introSeen") === true, "A: 'Los geht's' leads to the level picker and remembers the intro");
    ok(ev("P.name") === "Pat", `A: name saved from the form ("${ev("P.name")}")`);
    ok(JSON.parse(t.w.localStorage.getItem("dekurs-auth") || "null")?.email === "pat@example.de", "A: session stored");
    ok(t.remote.pushed && t.remote.pushed.data.name === "Pat", "A: fresh progress with the name was pushed to the account");
    ok(t.errors.length === 0, "A: no runtime errors" + (t.errors[0] ? ": " + t.errors[0] : "")); }

  // B — returning user on a new device: sign in, get name + level from the account, land on home
  { const remoteP = {name:"Anna", course:"A2.1", p:{"A2.1|v0":{b:3,d:0,n:2,k:2}}, xp:340, streak:2, goalDay:0, dayD:0, dayXp:0, bestCombo:4, blitzBest:0,
      stamps:{}, dir:"de", sessions:3, ansBySec:{}, bonusBySec:{}, hist:{}, lastBackup:0, goalMin:15};
    const t = boot({users:{"anna@example.de":"pw123456"}, progress: remoteP}); await tick(300);
    const {$, ev} = t;
    fill($, {"#mail":"anna@example.de", "#pw":"pw123456"});
    $("#signin").click(); await tick(200);
    ok(ev("P.name") === "Anna" && ev("P.course") === "A2.1", `B: name and level come from the account (${ev("P.name")}, ${ev("P.course")})`);
    ok(ev("P.xp") === 340 && ev("P.p")["A2.1|v0"].b === 3, "B: progress merged from the account");
    ok(/Karten heute|Tagesziel|Diese Stufe/.test($("#stage").textContent) && !t.d.querySelector(".level"), "B: lands on home, not the level picker");
    ok(!$("#introgo"), "B: a learner with progress never sees the intro");
    ok(t.errors.length === 0, "B: no runtime errors" + (t.errors[0] ? ": " + t.errors[0] : "")); }

  // B2 — sign in, account has no name: the typed name is used
  { const t = boot({users:{"x@example.de":"pw123456"}, progress:{name:"", p:{}, xp:0}}); await tick(300);
    fill(t.$, {"#nm":"Lea", "#mail":"x@example.de", "#pw":"pw123456"});
    t.$("#signin").click(); await tick(200);
    ok(t.ev("P.name") === "Lea" && !!t.$("#introgo"), `B2: typed name used when the account has none ("${t.ev("P.name")}"), intro shown`);
    t.$("#introgo").click(); await tick(); ok(!!t.d.querySelector(".level"), "B2: then the level picker"); }

  // C — wrong password
  { const t = boot({users:{"anna@example.de":"pw123456"}}); await tick(300);
    fill(t.$, {"#mail":"anna@example.de", "#pw":"wrongpw"});
    t.$("#signin").click(); await tick(150);
    ok(/stimmt nicht/.test(t.$("#authmsg").textContent) && !t.$("#signin").disabled, "C: wrong password shows a hint and re-enables the buttons");
    ok(t.w.localStorage.getItem("dekurs-auth") === null, "C: no session stored"); }

  // D — e-mail confirmation switched on
  { const t = boot({users:{}, confirmEmail:true}); await tick(300);
    fill(t.$, {"#nm":"Tom", "#mail":"tom@example.de", "#pw":"secret7"});
    t.$("#signup").click(); await tick(150);
    ok(/bestätige/.test(t.$("#authmsg").textContent) && !!t.$("#signup") && !t.$("#signup").disabled, "D: with confirmation on, stays on the screen and asks to confirm the e-mail"); }

  // E — validation and skip
  { const t = boot({users:{}}); await tick(300);
    fill(t.$, {"#nm":"Lena", "#mail":"not-an-email", "#pw":"secret7"});
    t.$("#signin").click(); await tick();
    ok(/gültige E-Mail/.test(t.$("#authmsg").textContent), "E: bad e-mail is rejected");
    ok(t.calls.length === 0, "E: nothing was sent to the server");
    t.$("#skip").click(); await tick();
    ok(t.ev("P.name") === "Lena" && !!t.$("#introgo") && t.w.localStorage.getItem("dekurs-auth") === null, "E: 'Ohne Konto weiter' keeps the name, no account, intro shown");
    t.$("#introgo").click(); await tick();
    ok(!!t.d.querySelector(".level") && /How it works/.test(t.$("#stage").textContent) && /Add to your home screen|How it works/.test(t.$("#stage .guide summary").textContent), "E: level picker with the English guides"); }

  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("TEST CRASH", e.stack); process.exit(2); });
