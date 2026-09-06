const {JSDOM, VirtualConsole} = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
const vc = new VirtualConsole();
const errors = [];
vc.on("jsdomError", e => { if(!/Not implemented/.test(e.message)) errors.push(e.message); });
vc.on("error", (...a) => errors.push(a.join(" ")));
const seed = {name:"Test", course:"B1.1", p:{}, xp:0, streak:0, goalDay:0, dayD:0, dayXp:0, bestCombo:0, blitzBest:0,
  stamps:{}, dir:"de", sessions:0, ansBySec:{}, bonusBySec:{}, hist:{}, lastBackup:0, goalMin:15};
const dom = new JSDOM(html, {url:"http://localhost:8123/", runScripts:"dangerously", pretendToBeVisual:true, virtualConsole: vc,
  beforeParse(w){ w.localStorage.setItem("dekurs-v3", JSON.stringify(seed));
    w.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}}); }});
const w = dom.window, d = w.document, $ = s => d.querySelector(s);
const ev = code => w.eval(code);
const tick = (ms=30) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if(!cond) fails++; };
const G = () => ev("GRAMMAR"); const IDX = id => ev("idx")(id);
const answerOf = id => G()[IDX(id)][3];
const clickOpt = (val) => { const b = [...d.querySelectorAll(".opt")].find(x => x.dataset.v === val); b.click(); };
const wrongOpt = id => [...d.querySelectorAll(".opt")].find(x => x.dataset.v !== answerOf(id)).dataset.v;

(async () => {
  await tick(300);
  ok($("#stage") && /Karten heute|Tagesziel/.test($("#stage").textContent), "app boots to home for seeded B1.1 user");
  const DAY = ev("DAY()"); const S = ev("S"); const Pp = () => ev("P.p");

  // --- card 1: peek before answering, answer right → box stays, due tomorrow, points awarded
  w.go("grammar"); await tick();
  const id1 = S.queue[S.i];
  ok(!!$("#shbtn") && !!$("#infbtn"), "grammar card has both § and ⓘ buttons");
  ok(!!$("#modes #modetab #infbtn") && !$("#stage #infbtn") && !!$("#stage .card #shbtn"), "ⓘ sits in the section tab of the top bar, § in the card corner");
  $("#infbtn").click();
  ok($("#stage > #infbox") && !$("#infbox").classList.contains("hidden") && /Grammar/.test($("#infbox").textContent) && $("#infbtn").dataset.on === "1", "ⓘ opens the explanation above the card");
  $("#infbtn").click(); ok($("#infbox").classList.contains("hidden"), "ⓘ closes it again");
  ok($("#shbox").classList.contains("hidden") && S.peeked === false, "sheet panel starts hidden, peeked=false");
  const topic1 = G()[IDX(id1)][0];
  const box = $("#shbox");
  ok(box.querySelectorAll(".sh-block").length >= 1, `panel has topic block for "${topic1}" (${box.querySelectorAll(".sh-block").length} blocks)`);
  const mapped = (ev("SHEET_FOR")[topic1] || []);
  ok(box.querySelectorAll(".sh-table").length >= mapped.length + (box.querySelector("details") ? 1 : 0) - 1 || mapped.length === 0,
     `panel shows ${box.querySelectorAll(".sh-table").length} tables (mapped ${mapped.length}, rest folded: ${box.querySelector("details") ? "yes" : "no"})`);
  const g1 = G()[IDX(id1)];
  ok(!box.textContent.includes(g1[1].replace("___", g1[3])), "panel does not show the current question's own sentence");
  ok(box.querySelector(".sh-block .rule b") && box.querySelector(".sh-block .rule b").textContent === ev("RULES")[topic1].r, "panel's first block is the topic's rule");
  ok(box.querySelectorAll(".sh-block .words span").length === ev("RULES")[topic1].w.length && /·|\w/.test(box.querySelector(".words b").textContent), `panel lists the topic's ${ev("RULES")[topic1].w.length} key words with English`);
  ok(!!box.querySelector(".sh-block .ex") && !!box.querySelector(".sh-block .ex-en") && !box.querySelector(".ex.drill"), "panel shows one translated example and no untranslated drill sentences");
  ok(!!box.querySelector(".tables .sh-table.ref"), "tables sit in the responsive .tables grid and no longer use the .grid class");
  { w.useCourse("B1.1"); const h = w.sheetHTML("rel", "B1.1|g999");
    ok(/sh-block wide">\s*<h4>Konnektoren/.test(h) && !/sh-block wide">\s*<h4>Artikel und F/.test(h), "long-text tables are marked wide, compact ones are not"); }
  $("#shbtn").click();
  ok(!$("#shbox").classList.contains("hidden") && $("#shbtn").dataset.on === "1", "§ click opens panel");
  ok(S.peeked === true, "peeking before answering sets S.peeked");
  clickOpt(answerOf(id1));
  ok(/nachgeschlagen/.test($("#verd h4").textContent), `verdict says nachgeschlagen: "${$("#verd h4").textContent}"`);
  ok(/Kasten 1/.test($("#verd .why")?.textContent || ""), "note says card stays in Kasten 1");
  const ptsBefore = S.pts;
  $("#go").click(); await tick();
  ok(Pp()[id1].b === 1 && Pp()[id1].d === DAY + 1, `peeked+right: box ${Pp()[id1].b} (expect 1), due +${Pp()[id1].d - DAY} (expect +1)`);
  ok(S.pts > ptsBefore, `points still awarded (${S.pts})`);

  // --- card 2: no peek, right → box 2, due +2
  const id2 = S.queue[S.i];
  ok(S.peeked === false, "peeked resets on next card");
  ok(!!$("#modes #infbtn") && !!$("#infbox") && $("#infbox").classList.contains("hidden"), "after moving to the next card the ⓘ is still in the tab and the box is closed");
  clickOpt(answerOf(id2));
  ok($("#verd h4").textContent === "Richtig", `plain verdict without peek: "${$("#verd h4").textContent}"`);
  ok(!$("#verd .regel"), "right answer keeps the verdict short (no rule block)");
  $("#go").click(); await tick();
  ok(Pp()[id2].b === 2 && Pp()[id2].d === DAY + 2, `no peek+right: box ${Pp()[id2].b} (expect 2), due +${Pp()[id2].d - DAY} (expect +2)`);

  // --- card 3: answer first, then open the sheet → not a peek
  const id3 = S.queue[S.i];
  clickOpt(answerOf(id3));
  $("#shbtn").click();
  ok(S.peeked === false && !$("#shbox").classList.contains("hidden"), "opening the sheet after answering shows it but does not count as peeking");
  $("#go").click(); await tick();
  ok(Pp()[id3].b === 2, `post-answer lookup: box ${Pp()[id3].b} (expect 2)`);

  // --- card 4: peek, answer wrong → box 1, retry queued
  const id4 = S.queue[S.i];
  const qlen = S.queue.length;
  $("#shbtn").click();
  clickOpt(wrongOpt(id4));
  ok(!$("#verd .why"), "no 'bleibt in Kasten' note on a wrong answer");
  const rule4 = ev("RULES")[G()[IDX(id4)][0]];
  ok(!!$("#verd .regel .rule b") && $("#verd .regel .rule b").textContent === rule4.r && !!$("#verd .regel .words") && !$("#verd .regel .ex"), "wrong answer shows the topic's rule and words (no example) under the explanation");
  $("#go").click(); await tick();
  ok(Pp()[id4].b === 1 && Pp()[id4].d === DAY + 1 && S.queue.length === qlen + 1, `peek+wrong: box ${Pp()[id4].b} (expect 1), requeued: ${S.queue.length === qlen + 1}`);

  // --- Spickzettel page still renders with shared helpers
  w.go("sheet"); await tick();
  const nTables = d.querySelectorAll("#stage .sh-table.ref").length, nBlocks = d.querySelectorAll("#stage .sh-block").length;
  ok(nTables === 8 && nBlocks === 8 + 13, `Spickzettel B1.1: ${nTables} tables (expect 8), ${nBlocks} blocks (expect 21)`);
  ok(d.querySelectorAll("#stage .ex.drill").length === 13 * 2 && d.querySelectorAll("#stage .ex-en").length === 13, "Spickzettel topic blocks keep two drill sentences and add the translated example");
  ok(!d.querySelector("#stage .grid .sh-table") && !d.querySelector("#stage table.grid"), "no table carries the layout class .grid any more");

  // --- home keeps its ⓘ on the hero card (no section tab there); blitz intro uses the tab
  w.go("home"); await tick();
  ok(!!$("#stage .hero #infbtn") && !$("#modes #infbtn"), "home: ⓘ stays on the hero card");
  w.go("blitz"); await tick();
  ok(!!$("#modes #modetab #infbtn"), "blitz intro: ⓘ in the Blitz tab");

  // --- Fortschritt: one Konto section with the backup file folded in
  w.go("stats"); await tick();
  const eyebrows = [...d.querySelectorAll("#stage .eyebrow")].map(e => e.textContent.trim());
  ok(eyebrows.filter(t => t === "Konto").length === 1 && !eyebrows.some(t => /^Sicherung/.test(t)), `Fortschritt has one Konto section and no separate Sicherung section (${eyebrows.join(" | ")})`);
  ok(!!$("#exp") && !!$("#imp") && !!$("#file") && !!$("#reset"), "backup save/load and reset are still there");

  // --- mapping sanity across all levels
  const allTopics = new Set(); Object.values(ev("COURSES")).forEach(c => c.gtopics.forEach(t => allTopics.add(t[0])));
  const badKeys = Object.keys(ev("SHEET_FOR")).filter(k => !allTopics.has(k));
  const badTables = Object.values(ev("SHEET_FOR")).flat().filter(k => !ev("TABLES")[k]);
  const RU = ev("RULES");
  const missingRules = [...allTopics].filter(k => !RU[k]);
  const malformed = Object.entries(RU).filter(([k,v]) => typeof v.r !== "string" || !v.r || !Array.isArray(v.w) || v.w.some(x => x.length !== 2) || !Array.isArray(v.ex) || v.ex.length !== 2);
  ok(missingRules.length === 0 && malformed.length === 0, `RULES covers all ${allTopics.size} topics with rule, words and translated example; missing: [${missingRules}] malformed: [${malformed.map(x=>x[0])}]`);
  ok(badKeys.length === 0 && badTables.length === 0, `SHEET_FOR keys all real topics (${Object.keys(ev("SHEET_FOR")).length} of ${allTopics.size} topics mapped); unknown: [${badKeys}] [${badTables}]`);

  // --- every level: § panel renders for every grammar topic without throwing
  let rendered = 0;
  for(const lv of ev("COURSE_ORDER")){ w.useCourse(lv); for(const t of ev("GTOPICS")){ const h = w.sheetHTML(t[0], lv + "|g0"); if(h.includes("sh-block")) rendered++; } }
  const entries = Object.values(ev("COURSES")).reduce((a,c)=>a+c.gtopics.length,0);
  ok(rendered === entries, `sheetHTML renders for all ${rendered}/${entries} topic entries across 8 levels`);
  // no card's own answer sentence may appear in its § panel, for every card of every level
  let leaks = 0, cards = 0;
  for(const lv of ev("COURSE_ORDER")){ w.useCourse(lv); const GR = G();
    GR.forEach((g,i) => { cards++; const h = w.sheetHTML(g[0], lv + "|g" + i).replace(/<[^>]+>/g,"");
      if(h.includes(g[1].replace("___", g[3]))) leaks++; }); }
  ok(leaks === 0, `no answer leaks in § panels: ${leaks} of ${cards} cards`);

  ok(errors.length === 0, "no runtime errors" + (errors.length ? ": " + errors.slice(0,3).join(" | ") : ""));
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("TEST CRASH", e.stack); process.exit(2); });
