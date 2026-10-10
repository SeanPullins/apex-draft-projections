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
assert.equal(lab.reviewedCount,4);
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
assert.equal(all.filter(p=>lab.analysis(p)).length,4);
d.querySelector('[data-tab="dna"]').click();
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:1}}));
assert.equal(d.querySelectorAll(".dna-trend-study").length,1);
assert(d.querySelector(".dna-trend-study").textContent.includes("THREE")||
 d.querySelector(".dna-trend-study").textContent.includes("Three seasons."));
assert(d.querySelector(".dna-trend-study").textContent.includes("1,315"));
assert(d.querySelector(".dna-trend-study").textContent.includes("PARTIAL"));
assert(d.querySelector(".dna-trend-source[href^='https://']"));
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:5}}));
assert(d.querySelector(".dna-trend-study").textContent.includes("Rate unavailable"));
assert(!d.querySelector(".dna-trend-study").textContent.includes("664"));
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:8}}));
assert.equal(d.querySelectorAll(".dna-trend-study").length,0,"fallback for unreviewed");
assert(d.querySelector(".intel-trajectory").textContent.includes("Comparable historical trend not yet verified")||
 d.querySelector(".intel-trajectory").textContent.includes("Earlier college seasons"));
assert.equal(JSON.stringify(all),original,"do not mutate production player model");
assert(fs.readFileSync(path.join(root,"player-trends.css"),"utf8").includes("max-width:650px"));
assert(!JSON.stringify(lab).includes("pfr_player_id"),"no private NFL join IDs");
console.log("PASS: reviewed public 2024/25 player trends, partial 2026 abstention, mobile and unchanged predictions");