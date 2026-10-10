/* Reproducible public season-trend pilot tests (no model rank changes). */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("jsdom");
const root=path.resolve(__dirname,"..");
const dom=new JSDOM(fs.readFileSync(path.join(root,"index.html"),"utf8"),{
 url:"https://example.test/#board",runScripts:"outside-only",pretendToBeVisual:true
});
const w=dom.window,d=w.document;
w.matchMedia=()=>({matches:false,addEventListener(){}});
w.scrollTo=()=>{};
for(const tag of d.querySelectorAll("script[src]")){
 w.eval(fs.readFileSync(path.join(root,tag.getAttribute("src").split("?")[0]),"utf8"));
}
const all=w.APEX2027.players,original=JSON.stringify(all),lab=w.APEX_PLAYER_TRENDS;
assert(lab,"development module loaded");
assert.equal(lab.reviewedCount,20);
const player=r=>all.find(p=>p.r===r);
const smith=lab.analysis(player(1));
assert.equal(smith.seasons[0].yards,1315);
assert.equal(smith.seasons[1].n,87);
assert.equal(smith.current.yards,823);
assert.equal(smith.current.n,44);
assert.equal(smith.current.complete,false);
assert.equal(smith.comparable,true);
assert.equal(Number(smith.current.rate.toFixed(1)),18.7);
const cam=lab.analysis(player(6));
assert.equal(cam.seasons[0].team,"Auburn");
assert.equal(cam.current.team,"Texas","transfer must preserve school-by-season");
assert.equal(cam.current.rate,null,"Cam 2026 conflict must abstain rather than choose a version");
assert(cam.current.scope.includes("Source conflict"));
assert.equal(cam.seasons[1].yards,708);
const arch=lab.analysis(player(5));
assert.equal(arch.seasons[0].n,90);
assert.equal(arch.seasons[1].n,404);
assert.equal(arch.comparable,false,"90 attempts too small to infer rate trend");
assert.equal(arch.current.rate,null,"no 2026 QB attempt denominator");
const julian=lab.analysis(player(21));
assert.equal(julian.seasons[0].n,12);
assert.equal(julian.comparable,false);
assert.equal(julian.current.rate,null);
assert.equal(lab.analysis(player(8)),null,"OL has no invented box-score blocking history");
assert.equal(all.filter(p=>lab.analysis(p)).length,20);
d.querySelector('[data-tab="dna"]').click();
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:1}}));
assert.equal(d.querySelectorAll(".dna-trend-study").length,1);
assert(d.querySelector(".dna-trend-study").textContent.includes("Season development"));
assert(d.querySelector(".dna-trend-study").textContent.includes("1,315"));
assert(d.querySelector(".dna-trend-study").textContent.toLowerCase().includes("partial"));
assert(d.querySelector(".dna-trend-source[href^='https://']"));
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:5}}));
assert(d.querySelector(".dna-trend-study").textContent.includes("Rate unavailable"));
assert(!d.querySelector(".dna-trend-study").textContent.includes("664"));
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:8}}));
assert.equal(d.querySelectorAll(".dna-trend-study").length,0,"fallback for unreviewed");
assert(d.querySelector(".intel-trajectory").textContent.includes("Comparable historical trend not yet verified")||
 d.querySelector(".intel-trajectory").textContent.includes("Earlier college seasons"));

assert.equal(w.APEX_PLAYER_SEASON_HISTORY.version,"2026-10-09-v2");
const ranks=[1,5,6,7,14,16,18,21,24,27,29,31,33,41,49,52,53,54,58,62];
assert.equal(Object.keys(w.APEX_PLAYER_SEASON_HISTORY.records).length,20);
for(const r of ranks){
 const p=player(r),x=lab.analysis(p);
 assert(x,p.n+" must have a reviewed identity and positional source");
 assert(x.source.startsWith("https://"),"only published source links");
 assert.deepEqual(x.seasons.map(s=>s.year),[2024,2025]);
 for(const row of x.seasons){
   assert(Number.isFinite(row.yards)&&row.n>0&&Number.isFinite(row.rate));
 }
}
const lacy=lab.analysis(player(27));
assert.equal(lacy.seasons[0].n,23);
assert.equal(lacy.seasons[1].n,306);
assert.equal(lacy.comparable,false,"23 carries below minimum workload");
assert(lacy.schoolChanged);
assert.equal(lacy.conferenceChanged,false,"Missouri and Ole Miss both SEC");
const mensah=lab.analysis(player(24));
assert(mensah.schoolChanged&&mensah.conferenceChanged);
assert.equal(mensah.seasons[0].conference,"American");
assert.equal(mensah.seasons[1].conference,"ACC");
const baugh=lab.analysis(player(16));
assert.equal(baugh.seasons[0].yards,673);
assert.equal(baugh.seasons[1].yards,1170);
assert.equal(baugh.current.n,95);
assert.equal(baugh.current.yards,613);
assert.equal(baugh.current.complete,false);
const hardy=lab.analysis(player(29));
assert.equal(hardy.current,null,"injured athlete cannot have inferred 2026 rate");
const moore=lab.analysis(player(7));
assert.equal(moore.seasons[0].n,8);
assert.equal(moore.comparable,false);
const wingo=lab.analysis(player(53));
assert.equal(wingo.seasons[0].g,null,"unknown appearance denominators must not be invented");
assert.equal(wingo.comparable,true,"both receptions samples >=20");
const solo=all.find(p=>p.p==="CB");
assert.equal(lab.analysis(solo),null,"no fictional CB coverage rate");
assert(d.querySelector("#intelWithHistory"),"find by source-reviewed season history");
assert.equal(d.querySelectorAll("#intelDirectory [data-intel-rank]").length,201);
const filter=d.querySelector("#intelWithHistory");
filter.checked=true;filter.dispatchEvent(new w.Event("change",{bubbles:true}));
assert.equal(d.querySelectorAll("#intelDirectory [data-intel-rank]").length,20);
assert.equal(d.querySelector("#intelShown").textContent,"20 of 201 shown");
filter.checked=false;filter.dispatchEvent(new w.Event("change",{bubbles:true}));
assert.equal(d.querySelectorAll("#intelDirectory [data-intel-rank]").length,201);
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:27}}));
assert(d.querySelector(".dna-history-cta"));
d.querySelector(".dna-history-cta").click();
assert.equal(d.querySelector("#dnaMoreResearch").open,true);
assert(d.querySelector(".dna-trend-study").textContent.toLowerCase().includes("opportunity"));
assert(d.querySelector(".dna-trend-study").textContent.includes("Opponent-strength adjustment is not yet available"));
assert(d.querySelector(".dna-trend-study").textContent.includes("Small season sample"));
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:8}}));
assert(!d.querySelector("#dnaOpenTrends"),"unreviewed OL has no fake history CTA");
assert.equal(JSON.stringify(all),original,"do not mutate production player model");
assert(fs.readFileSync(path.join(root,"player-trends.css"),"utf8").includes("max-width:650px"));
assert(!JSON.stringify(lab).includes("pfr_player_id"),"no private NFL join IDs");
console.log("PASS: reviewed public 2024/25 player trends, partial 2026 abstention, mobile and unchanged predictions");