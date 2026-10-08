const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {JSDOM} = require("jsdom");

const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{
  url:"https://example.test/#lab",runScripts:"outside-only",pretendToBeVisual:true
});
const w=dom.window,d=w.document,errors=[];
w.addEventListener("error",event=>errors.push(event.error||event.message));
w.matchMedia=()=>({matches:false,addEventListener(){}});
w.scrollTo=()=>{};

try{
  for(const script of d.querySelectorAll("script[src]")) {
    const name=script.getAttribute("src").split("?")[0];
    w.eval(fs.readFileSync(path.join(root,name),"utf8"));
  }
  const lab=w.APEX_DECISION_LAB;
  assert(lab,"public Decision Lab module must initialize");
  assert.equal(d.querySelector(".tab-panel.is-active").id,"tab-lab","Direct link must work");
  assert.equal(d.querySelectorAll(".tab").length,5,"Lab is a first-class section");
  assert.equal(d.querySelectorAll("#labPosition option").length,11);
  assert.equal(d.querySelectorAll("#labPlayer option").length,201);
  assert(d.querySelector("#labQueue .lab-case"),"Lab should show real player assignments");
  const sources=d.querySelectorAll(".lab-source");
  assert(sources.length>0);
  const board=JSON.stringify(w.APEX2027.players);
  const market=w.APEX2027.players.find(p=>p.r===8);
  assert(market&&market.a==="URGENT_DATA_GAP");
  const reference=lab.evidence(market);
  assert.equal(reference.kind,"review");
  assert.equal(reference.label,"Source pending review","Private source receipt is not VERIFIED");
  const noPlay=w.APEX2027.players.find(p=>p.r===187);
  assert(["history","missing"].includes(lab.evidence(noPlay).kind),
    "Unavailable 2026 opportunity must remain separate from poor performance");

  // Build capacity-limited scouting desk from first-class question.
  d.querySelector("#labCapacity").value="3";
  d.querySelector("#labCapacity").dispatchEvent(new w.Event("change",{bubbles:true}));
  d.querySelector("#labBuild").click();
  assert.equal(d.querySelectorAll("#labPlan li:not(.lab-no-plan)").length,3);
  assert.equal(lab.current().chosen.length,3);
  assert(new Set(lab.current().chosen.map(rank=>w.APEX2027.players.find(p=>p.r===rank).p)).size>=2,
    "Default scout dispatch must cover multiple positions");
  assert.equal(d.querySelector("#labExport").disabled,false);
  assert.equal(JSON.parse(w.localStorage.getItem("apex-decision-lab-plan-v1")).length,3);

  d.querySelector("#labFocus").value="gaps";
  d.querySelector("#labFocus").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(d.querySelector("#labQueue").textContent.includes("Source pending review") ||
    d.querySelector("#labQueue").textContent.includes("Licensed 2026"));
  d.querySelector("#labPosition").value="OL";
  d.querySelector("#labPosition").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert([...d.querySelectorAll(".lab-case-school")].every(x=>x.textContent.includes("OL")));
  assert(d.querySelector("#labMatchCount").textContent.includes("matching players"));
  d.querySelector("#labBuild").click();
  const receipt=lab.brief();
  assert(receipt.includes("APEX — PUBLIC DECISION LAB"));
  assert(receipt.includes("RESEARCH ONLY"));
  assert(receipt.includes("WHAT TO VERIFY"));
  assert(!receipt.includes('"pass_block_grade"'),"Raw private PFF source metrics must not leak");
  assert.equal(JSON.stringify(w.APEX2027.players),board,"Decision desk must not mutate original data");

  // A case challenge changes the research process, not stored evaluations.
  const playerSelector=d.querySelector("#labPlayer");
  playerSelector.value="8";
  playerSelector.dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(d.querySelector("#labSelectedName").textContent.includes("Trevor Goosby"));
  d.querySelector("#labFinding").value="verified";
  d.querySelector("#labFinding").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(d.querySelector("#labScenarioBadge").textContent.includes("no auto promotion"));
  d.querySelector("#labFinding").value="contradiction";
  d.querySelector("#labFinding").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(d.querySelector("#labScenarioResult").textContent.includes("independent second evaluator"));
  d.querySelector("#labFinding").value="unverified";
  d.querySelector("#labFinding").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(d.querySelector("#labScenarioBadge").textContent.includes("Abstain"));
  assert.equal(JSON.stringify(w.APEX2027.players),board,"Hypotheses cannot change player scores");
  d.querySelector("#labViewDossier").click();
  assert.equal(d.querySelector("#modalBackdrop").hidden,false,"Lab opens real player dossier");
  assert(d.querySelector("#modal").textContent.includes("Trevor Goosby"));
  d.querySelector("#modal .modal-close").click();

  // Fan can pivot to sleepers without recomputing the actual board.
  d.querySelector("#labFocus").value="surprise";
  d.querySelector("#labPosition").value="ALL";
  d.querySelector("#labFocus").dispatchEvent(new w.Event("change",{bubbles:true}));
  d.querySelector("#labPosition").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(lab.pool("surprise").every(p=>p.r>32&&
    ["EXECUTIVE_REVIEW_UP","SLEEPER_DISCOVERY"].includes(p.a)));
  assert(lab.pool("surprise").length>0);
  d.querySelector("#labClear").click();
  assert.equal(lab.current().chosen.length,0);
  assert.equal(d.querySelector("#labExport").disabled,true);
  assert.equal(JSON.stringify(w.APEX2027.players),board,"All interactions must be read-only");
  assert.equal(errors.length,0,errors.map(String).join("\n"));
  console.log("PASS: Decision Lab direct-link, 201-player selectors, scenarios, safe briefs, iPhone navigation and immutable scores");
}finally{
  dom.window.close();
}