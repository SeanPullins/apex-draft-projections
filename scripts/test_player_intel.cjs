/* Regression tests for public-safe, accessible Player DNA and Model Lab. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");
const root=path.resolve(__dirname,"..");
const dom=new JSDOM(fs.readFileSync(path.join(root,"index.html"),"utf8"),{
  url:"https://example.test/#board",runScripts:"outside-only",pretendToBeVisual:true
});
const w=dom.window,d=w.document,errors=[];
w.matchMedia=()=>({matches:false,addEventListener(){}});
w.scrollTo=()=>{};
w.addEventListener("error",e=>errors.push(e.error||e.message));
for(const script of d.querySelectorAll("script[src]")){
  w.eval(fs.readFileSync(path.join(root,script.getAttribute("src").split("?")[0]),"utf8"));
}
assert.deepEqual(errors,[],"scripts must execute without browser errors");
assert(w.APEX_INTEL,"interactive Player DNA and Model Lab initialization");
assert.equal(w.APEX2027.players.length,201);
const original=JSON.stringify(w.APEX2027.players);
assert.equal(d.querySelectorAll(".tab").length,6);
d.querySelector('[data-tab="dna"]').click();
assert(d.querySelector('#tab-dna').classList.contains("is-active"));
assert.equal(d.querySelector("#intelCount").textContent,"201 prospects");
assert(d.querySelector("#intelProfile").textContent.includes("Jeremiah Smith"));
assert(d.querySelector("#intelProfile").textContent.includes("823 receiving yards"),"observed public 2026 statistics");
assert(d.querySelector("#intelProfile").textContent.includes("Oct. 7"),"public data boundary");
assert(d.querySelector("#intelProfile").textContent.includes("not an NFL success probability"),"avoid fake prediction framing");
assert(d.querySelector("#intelDirectory button[data-intel-rank]"));
assert(!d.querySelector("#intelProfile").textContent.includes("pass_block_grade"),"must never leak licensed PFF data");
const search=d.querySelector("#intelSearch");
search.value="Arch Manning";search.dispatchEvent(new w.Event("input",{bubbles:true}));
assert.equal(d.querySelector("#intelCount").textContent,"1 prospects");
d.querySelector('#intelDirectory [data-intel-rank="5"]').click();
assert(d.querySelector("#dnaPlayerName").textContent.includes("Arch Manning"));
const sel=d.querySelector("#intelPosition");
search.value="";search.dispatchEvent(new w.Event("input",{bubbles:true}));
sel.value="OL";sel.dispatchEvent(new w.Event("change",{bubbles:true}));
assert(d.querySelectorAll('#intelDirectory [data-intel-rank]').length>0);
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:8}}));
assert.equal(d.querySelector("#dnaPlayerName").textContent,"Trevor Goosby");
assert(d.querySelector("#intelProfile").textContent.includes("blocking"),"OL is unmeasured, not 0-rated");
assert.equal(sel.value,"ALL");
assert.equal(search.value,"");
d.querySelector("#intelDossier").click();
assert.equal(d.querySelector("#modalBackdrop").hidden,false);
assert(d.querySelector("#modalName").textContent.includes("Trevor Goosby"));
d.querySelector("#modal .modal-close").click();
assert.equal(d.querySelector("#modalBackdrop").hidden,true);
d.querySelector('[data-tab="validation"]').click();
assert(d.querySelector("#tab-validation").classList.contains("is-active"));
assert(d.querySelector("#modelLabApp").textContent.includes("1,010"));
assert(d.querySelector("#modelLabApp").textContent.includes("Research only"));
assert(d.querySelector("#modelLabApp").textContent.includes("0.2135"));
const outcome=d.querySelector("#intelOutcome");
outcome.value="high";outcome.dispatchEvent(new w.Event("change",{bubbles:true}));
assert(d.querySelector("#intelBrierRows").textContent.includes("0.2095"));
assert(d.querySelector("#intelOutcomeHelp").textContent.includes("starter-equivalent"));
assert(d.querySelector("#modelLabApp").textContent.includes("not an untouched confirmation"));
d.querySelector('[data-tab="board"]').click();
d.querySelector('#boardBody tr[data-rank="5"]').click();
assert(d.querySelector("#modalDNA"),"dossier must link to Player DNA");
d.querySelector("#modalDNA").click();
assert(d.querySelector("#tab-dna").classList.contains("is-active"));
assert.equal(d.querySelector("#dnaPlayerName").textContent,"Arch Manning");
assert.equal(JSON.stringify(w.APEX2027.players),original,"no production player mutation");
const css=fs.readFileSync(path.join(root,"player-intel.css"),"utf8");
assert(css.includes(".tab[data-tab=\"dna\"]"),"DNA visible on narrow phones");
assert(css.includes("max-width:650px"),"mobile evidence layout");
assert(css.includes("focus-visible"),"keyboard focus states");

assert(w.APEX_DEVELOP && w.APEX_HISTORY_PHYSICAL,"historical + development module must load");
assert.equal(w.APEX_HISTORY_PHYSICAL.length,155,"historical reference count is frozen");
assert(w.APEX_DEVELOP.analysis(w.APEX2027.players.find(p=>p.r===1)).physical.matches.length>0,
  "Jeremiah Smith must have size-only historical neighbors");
const first=w.APEX_DEVELOP.analysis(w.APEX2027.players.find(p=>p.r===1));
assert(first.snapshot && first.snapshot.cohort>=5,"WR position-specific 2026 recorded-stat comparison");
assert.equal(first.snapshot.label,"Receiving yards per recorded-stat game");
assert.equal(first.physical.matches[0].position,"WR","historical matches stay within position group");
assert(first.physical.matches.every(x=>Math.abs(x.heightDelta)<=3 && Math.abs(x.weightDelta)<=25),
  "historical comp candidates limited by explicit physical difference gates");
d.querySelector('[data-tab="dna"]').click();
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:1}}));
assert(d.querySelector("#intelDevelopment").textContent.includes("Who had a similar build?"));
assert(d.querySelector("#intelDevelopment").textContent.includes("not a national percentile") ||
       d.querySelector("#intelDevelopment").textContent.includes("Not a national percentile"));
assert(d.querySelector("#intelDevelopment").textContent.includes("Similar size does not imply a similar NFL career."));
assert(d.querySelector("#intelDevelopment").textContent.includes("Nico Collins"),"known size neighbor");
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:8}}));
assert(d.querySelector("#intelDevelopment").textContent.includes("Individual OL production isn’t available from box scores."),
 "OL metrics must be abstained");
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:144}}));
assert(d.querySelector("#intelDevelopment").textContent.includes("2025: 59 tackles"),"verified prior-season source only");
assert(d.querySelector("#intelDevelopment").querySelector(".intel-timeline a[href^='https://']"));
w.dispatchEvent(new w.CustomEvent("apex:focus-dna-player",{detail:{rank:61}}));
assert(d.querySelector("#intelDevelopment").textContent.includes("Public roster height or weight is unavailable."),
 "No guess when measurements are missing");
assert.equal(JSON.stringify(w.APEX2027.players),original,"historical comparisons must not modify forecasts");
const devcss=fs.readFileSync(path.join(root,"player-development.css"),"utf8");
assert(devcss.includes("max-width:650px") && devcss.includes("intel-hist-grid"),"stack historical profiles on mobile");
assert(!JSON.stringify(w.APEX_HISTORY_PHYSICAL).includes("A_earns_nfl_role"),"never publish private NFL success labels");

console.log("PASS: Player DNA, source scope, 201 prospects, linked dossiers, mobile navigation, Model Lab and immutable projections");
