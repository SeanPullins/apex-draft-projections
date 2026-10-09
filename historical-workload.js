/* Descriptive NFL-workload history: aggregates ONLY, no player-success probabilities. */
(function(){
"use strict";
const records=window.APEX_HISTORICAL_COHORT;
const existing=(window.APEX2026&&window.APEX2026.players)||{};
if(!records||!records.rows)return;
const map={ED:"EDGE",DT:"DL",CB:"DB",S:"DB"};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=v=>Number(v).toLocaleString("en-US");
const pct=(successes,n)=>n>0?Math.round(100*successes/n):0;
const labels=[
  ["Earned a role","At least one NFL season with 25%+ offensive/defensive snaps."],
  ["Sustained a role","At least three seasons with 25%+ offensive/defensive snaps."],
  ["High workload","At least two seasons with position-relative starter-equivalent snaps."]
];
function analysis(p){
 const position=map[p.p]||p.p;
 const row=records.rows[position]||null;
 if(!row)return null;
 const weight=existing[p.r]&&existing[p.r].w;
 const valid=typeof weight==="number"&&Number.isFinite(weight)&&weight>=125&&weight<=400;
 const tier=valid?(weight<=row.q[0]?0:weight<=row.q[1]?1:2):null;
 const band=tier===null?row.all:row.bands[tier];
 const range=tier===0?("Up to "+row.q[0]+" lb"):
   tier===1?(row.q[0]+1)+"–"+row.q[1]+" lb":
   tier===2?("Above "+row.q[1]+" lb"):"All listed weights";
 return {position,weight:valid?weight:null,tier,range,n:band[0],counts:band.slice(1),
   overall:row.all.slice(),historicalYears:records.years};
}
function render(p,root){
 if(!root)return;
 const x=analysis(p);if(!x)return;
 const useBand=x.tier!==null;
 const desc=useBand?"Historical NFL combine weight band: "+x.range:
   "No usable college roster weight; showing the full drafted position cohort.";
 const bars=labels.map(([label,help],i)=>{
   const success=x.counts[i],n=x.n,all=x.overall,rate=pct(success,n),overallRate=pct(all[i+1],all[0]);
   return '<div class="intel-career-row">'+
     '<div class="intel-career-name"><strong>'+esc(label)+'</strong><small>'+esc(help)+'</small></div>'+
     '<div class="intel-career-chart" aria-label="Historical cohort '+esc(label)+': '+rate+' percent, '+number(success)+' of '+number(n)+' players">'+
       '<span class="intel-career-track"><i style="width:'+rate+'%"></i></span>'+
       '<div class="intel-career-values"><strong>'+rate+'%</strong><span>'+number(success)+' of '+number(n)+'</span></div>'+
     '</div>'+
     '<span class="intel-career-position">All '+esc(x.position)+': '+overallRate+'%</span></div>';
 }).join("");
 const html='<section class="intel-dev-section intel-career-context" aria-label="Historical four-year NFL workload cohort">'+
   '<div class="intel-section-head"><span>03B / NFL HISTORY</span><h3>What happened to drafted players in this group?</h3></div>'+
   '<p class="intel-dev-intro">A real-world reference point from '+records.years[0]+'–'+records.years[1]+
   ' NFL drafts. <strong>These are past results—not this player’s predicted chances.</strong></p>'+
   '<div class="intel-career-cohort"><div><span>REFERENCE GROUP</span><strong>'+esc(x.position)+(useBand?" · "+esc(x.range):" · All sizes")+
   '</strong><small>'+esc(desc)+'</small></div><div class="intel-career-count"><strong>'+number(x.n)+'</strong><span>historically drafted players</span></div></div>'+
   '<div class="intel-career-rows">'+bars+'</div>'+
   '<div class="intel-career-explain"><strong>What this does—and doesn’t—mean</strong>'+
   '<p>Matched on position'+(useBand?" and weight band":" only")+
   '. Past NFL playing time reflects many things, including draft selection and opportunity. It does not measure college talent, prove similarity in football skills, or establish an APEX prediction for '+esc(p.n)+'.</p></div>'+
   '<details class="intel-career-method"><summary>Where do these numbers come from?</summary>'+
   '<p>From the APEX Phase 4 nflverse snap-count outcome audit, joined by stable NFL player ID to historical combine measurements. The cohort includes <strong>drafted non-specialists</strong> with known first-four-year outcomes during 2013–2022. Missing combine weights are excluded. Results are aggregated before publication.</p>'+
   '<p>The comparison uses public 2026 college-listed weights, which are not NFL Combine measurements. '+
   'The three historical workload outcomes do <strong>not</strong> measure Approximate Value, official games started, or player quality. Undrafted prospects are not represented.</p>'+
   '</details></section>';
 const anchor=root.querySelector(".intel-dev-section");
 if(anchor)anchor.insertAdjacentHTML("afterend",html);
 else root.insertAdjacentHTML("beforeend",html);
}
window.APEX_HISTORICAL_WIDGET={analysis,render};
})();
