const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");

const root=path.resolve(__dirname,"..");
const dom=new JSDOM(fs.readFileSync(path.join(root,"index.html"),"utf8"),{
  url:"https://example.test/#lab",runScripts:"outside-only",pretendToBeVisual:true
});
const w=dom.window,d=w.document,errors=[];
w.addEventListener("error",e=>errors.push(e.error||e.message));
w.matchMedia=()=>({matches:false,addEventListener(){}});
w.scrollTo=()=>{};
try{
  for(const node of d.querySelectorAll("script[src]")){
    const src=node.getAttribute("src").split("?")[0];
    w.eval(fs.readFileSync(path.join(root,src),"utf8"));
  }
  const fan=w.APEX_FAN_ADVISOR;
  assert(fan,"Fan Draft Advisor must be available");
  assert.equal(d.querySelector(".tab-panel.is-active").id,"tab-lab");
  assert.equal(d.querySelector(".tab[data-tab=lab]").textContent,"Draft Advisor");
  assert.equal(d.querySelectorAll("#labPlayer option").length,201);
  assert.equal(d.querySelectorAll("#labPosition option").length,11);
  assert(d.querySelector("#labQueue .lab-case"),"Automated recommendations must render immediately");
  assert.equal(d.querySelector("#labFocus").value,"sleepers");
  const original=JSON.stringify(w.APEX2027.players);
  assert(fan.pool("sleepers").every(p=>p.r>32&&["SLEEPER_DISCOVERY","EXECUTIVE_REVIEW_UP"].includes(p.a)));
  assert(fan.pool("alerts").every(p=>p.a==="EXECUTIVE_REVIEW_DOWN"));
  assert(fan.pool("top").every(p=>p.r<=32));
  assert(fan.pool("sleepers").length>0);
  const sourcePending=w.APEX2027.players.find(p=>p.r===8);
  assert(sourcePending);
  assert.equal(fan.evidence(sourcePending).kind,"review");
  assert(fan.evidence(sourcePending).label.includes("verification pending"));
  const injured=w.APEX2027.players.find(p=>p.r===187);
  assert(["history","missing"].includes(fan.evidence(injured).kind));
  assert(!JSON.stringify(w.APEX2027).includes("pass_block_grade"),"No restricted raw blocking grades");

  // Browse automated stories by category and position without adding tasks for a fan.
  d.querySelector("#labFocus").value="alerts";
  d.querySelector("#labFocus").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(d.querySelector("#labQueue").textContent.includes("APEX questions consensus"));
  d.querySelector("#labFocus").value="updates";
  d.querySelector("#labFocus").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert(d.querySelector("#labQueue").textContent.includes("2026 college season"));
  d.querySelector("#labPosition").value="OL";
  d.querySelector("#labPosition").dispatchEvent(new w.Event("change",{bubbles:true}));
  assert([...d.querySelectorAll(".lab-case-school")].every(el=>el.textContent.includes("OL")));
  d.querySelector("#labPosition").value="ALL";
  d.querySelector("#labPosition").dispatchEvent(new w.Event("change",{bubbles:true}));

  // Read a verdict immediately; no scouting questions or research assignments.
  const first=d.querySelector('#labQueue button[data-fan-action="open"]');
  assert(first);
  const rank=+first.dataset.rank;
  first.click();
  assert.equal(fan.current().rank,rank);
  assert(d.querySelector("#labCurrentWhy").textContent.length>15);
  assert(d.querySelector("#labQueue .fan-card-fact"),"Every card shows an observed season fact or honest absence");
  assert(!d.querySelector("#labQueue").textContent.includes("Acquire scouting-grade evidence"),"Fan cards must not show generic scouting tasks");
  assert(d.querySelector("#labQuestion").textContent.length>10);
  assert(d.querySelector("#labCurrentStatus").textContent.length>3);
  assert(d.querySelector("#labCurrentSource").textContent.length>6);

  // Watchlist is fan-owned local state, not a claim of alerts/ongoing monitoring.
  d.querySelector("#fanFollow").click();
  assert(fan.current().following.includes(rank));
  assert(JSON.parse(w.localStorage.getItem("apex-fan-watchlist-v1")).includes(rank));
  assert(d.querySelector("#fanFavoriteCount").textContent.includes("1 followed"));
  assert(d.querySelector("#fanFavorites").textContent.includes(w.APEX2027.players.find(p=>p.r===rank).n));
  const followCount=d.querySelectorAll("#fanFavorites .fan-favorite").length;
  assert.equal(followCount,1);

  // Original dossier and comparison flow work without fabricating a winner.
  d.querySelector("#labViewDossier").click();
  assert.equal(d.querySelector("#modalBackdrop").hidden,false);
  assert(d.querySelector("#modal").textContent.includes(w.APEX2027.players.find(p=>p.r===rank).n));
  d.querySelector("#modalInvestigate").click();
  assert.equal(d.querySelector(".tab-panel.is-active").id,"tab-lab");
  assert.equal(fan.current().rank,rank);
  const ca=d.querySelector("#fanCompareA"),cb=d.querySelector("#fanCompareB");
  ca.value="5"; cb.value="5";
  cb.dispatchEvent(new w.Event("change",{bubbles:true}));
  assert.equal(d.querySelector("#fanCompare").disabled,true,"A player cannot be compared to themselves");
  cb.value="7";
  cb.dispatchEvent(new w.Event("change",{bubbles:true}));
  assert.equal(d.querySelector("#fanCompare").disabled,false);
  d.querySelector("#fanCompare").click();
  assert.equal(d.querySelector("#compareBackdrop").hidden,false);
  assert(d.querySelector("#compareModal").textContent.includes("No synthetic winner."));
  d.querySelector("#compareModal .compare-close").click();

  // Existing Team Mode remains the source for user-configured team needs.
  d.querySelector("#fanTeamMode").click();
  assert.equal(d.querySelector(".tab-panel.is-active").id,"tab-team");
  assert.equal(JSON.stringify(w.APEX2027.players),original,"Fan views must not change any stored projections");
  d.querySelector('.tab[data-tab="lab"]').click();
  d.querySelector('#fanFavorites button[data-fan-action="follow"]').click();
  assert.equal(fan.current().following.length,0);
  assert(d.querySelector("#fanFavorites").textContent.includes("Nobody on your list yet"));
  assert.equal(errors.length,0,errors.map(String).join("\n"));
  console.log("PASS: fan-first automated prospect insights, 201-player verdicts, watchlist, comparisons, team handoff and immutable scores");
}finally{
  dom.window.close();
}