// Satzbau: a sentence with repeated words must be judged by the words, not by which identical chip was tapped.
const {JSDOM, VirtualConsole} = require("jsdom");
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if(!c) fails++; };
const tick = (ms=60) => new Promise(r => setTimeout(r, ms));
const seed = {name:"Test", course:"B1.1", introSeen:true, p:{}, xp:0, streak:0, goalDay:0, dayD:0, dayXp:0, bestCombo:0, blitzBest:0,
  stamps:{}, dir:"de", sessions:0, ansBySec:{}, bonusBySec:{}, hist:{}, lastBackup:0, goalMin:15};

function boot(){
  const vc = new VirtualConsole(); const errors = [];
  vc.on("jsdomError", e => { if(!/Not implemented/.test(e.message)) errors.push(e.message); });
  const dom = new JSDOM(html, {url:"http://localhost:8123/", runScripts:"dangerously", pretendToBeVisual:true, virtualConsole: vc,
    beforeParse(w){ w.localStorage.setItem("dekurs-v3", JSON.stringify(seed));
      w.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}}); }});
  const w = dom.window, d = w.document;
  return {w, d, $: s => d.querySelector(s), ev: c => w.eval(c), errors};
}
// open exactly this sentence card
function openCard(t, words){
  t.w.go("satz");
  const S = t.ev("SENTENCES"), i = S.findIndex(x => x[0].join("|") === words.join("|"));
  if(i < 0) throw new Error("sentence not found in this level");
  t.ev(`S.queue = ["${t.ev("CV")}|s${i}"]; S.i = 0; S.retry = {}; render();`);
  return S[i];
}
const tap = (t, chipIndex) => { const c = t.d.querySelector(`#bank .chip[data-i="${chipIndex}"]`); if(!c) throw new Error("chip " + chipIndex + " not in bank"); c.click(); };

(async () => {
  const words = ["Weil","ich","krank","war",",","bin","ich","zu Hause","geblieben"];

  // 1. correct sentence, but the two identical "ich" chips are tapped in swapped order (6 first, then 1)
  { const t = boot(); await tick(300); openCard(t, words); await tick();
    [0, 6, 2, 3, 4, 5, 1, 7, 8].forEach(i => tap(t, i));
    ok([...t.d.querySelectorAll("#line .chip")].map(c => c.textContent).join(" ") === "Weil ich krank war , bin ich zu Hause geblieben", "built sentence reads correctly");
    t.$("#check").click(); await tick();
    ok(t.$("#verd h4") && t.$("#verd h4").textContent === "Richtig", `swapped identical chips → judged correct (got "${t.$("#verd h4") && t.$("#verd h4").textContent}")`);
    ok([...t.d.querySelectorAll("#line .chip")].every(c => c.dataset.state === "right"), "every chip is coloured right");
    ok(t.errors.length === 0, "no runtime errors"); }

  // 2. control: a genuinely wrong order is still rejected and only the misplaced chips are marked
  { const t = boot(); await tick(300); openCard(t, words); await tick();
    [1, 0, 2, 3, 4, 5, 6, 7, 8].forEach(i => tap(t, i));          // "ich Weil krank war , bin ich …"
    t.$("#check").click(); await tick();
    const states = [...t.d.querySelectorAll("#line .chip")].map(c => c.dataset.state);
    ok(t.$("#verd h4").textContent !== "Richtig", "wrong order is still rejected");
    ok(states[0] === "wrong" && states[1] === "wrong" && states.slice(2).every(s => s === "right"), `only the two swapped positions are marked wrong (${states.join(",")})`); }

  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("TEST CRASH", e.stack); process.exit(2); });
