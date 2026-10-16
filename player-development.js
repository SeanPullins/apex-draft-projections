/* Player DNA v2: historical size neighbors + transparent position-specific snapshot.
 * NEVER uses NFL future outcomes, market rank or licensed private charting to rank comps. */
(function(){
  "use strict";
  const players=window.APEX2027?.players||[];
  const live=window.APEX2026?.players||{};
  const ctx=window.APEX2027Context?.rows||{};
  const history=window.APEX_HISTORY_PHYSICAL||[];
  const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ht=h=>Math.floor(h/12)+"′"+(h%12)+"″";
  const metricMap={
    QB:{key:"py",label:"Passing yards per recorded-stat game"},
    RB:{key:"ry",label:"Rushing yards per recorded-stat game"},
    WR:{key:"rey",label:"Receiving yards per recorded-stat game"},
    TE:{key:"rey",label:"Receiving yards per recorded-stat game"},
    ED:{key:"sk",label:"Sacks per recorded-stat game"},
    DT:{key:"sk",label:"Sacks per recorded-stat game"},
    LB:{key:"tk",label:"Tackles per recorded-stat game"},
    CB:{key:"pd",label:"Passes defended per recorded-stat game"},
    S:{key:"tk",label:"Tackles per recorded-stat game"}
  };
  const nonplay=new Set(["OUT_INJURY_2026","LIMITED_INJURY_2026","SITTING_OUT_2026","ELIGIBILITY_NO_2026_GAMES"]);
  const valid=n=>typeof n==="number"&&Number.isFinite(n);
  const rounded=n=>n.toLocaleString("en-US",{maximumFractionDigits:1,minimumFractionDigits:0});
  function snapshots(p){
    const m=metricMap[p.p];
    const l=live[p.r];
    if(!m||!l||!valid(l[m.key])||!valid(l.gp)||l.gp<2||nonplay.has(l.status))return null;
    const thisValue=l[m.key]/l.gp;
    const eligible=players.filter(q=>q.p===p.p).map(q=>{
      const r=live[q.r];return r&&valid(r[m.key])&&valid(r.gp)&&r.gp>=2&&!nonplay.has(r.status)?r[m.key]/r.gp:null;
    }).filter(valid);
    if(eligible.length<5)return null;
    const smaller=eligible.filter(v=>v<thisValue-1e-8).length;
    const ties=eligible.filter(v=>Math.abs(v-thisValue)<=1e-8).length;
    const ordered=eligible.slice().sort((a,b)=>a-b);
    const median=eligible.length%2?ordered[(eligible.length-1)/2]:(ordered[eligible.length/2-1]+ordered[eligible.length/2])/2;
    return {label:m.label,perGame:thisValue,median,cohort:eligible.length,
      position:p.p,relative:Math.round(100*(smaller+ties/2)/eligible.length),
      games:l.gp,key:m.key};
  }
  function physical(p){
    const r=live[p.r];
    if(!r||!valid(r.h)||!valid(r.w))return {reason:"Public roster height or weight is unavailable.",matches:[]};
    // Do not align CB with safeties, or OL with unrelated defensive positions.
    const scale=p.p==="OL"||p.p==="DT"?18:14;
    const matched=history.filter(x=>x[2]===p.p).map(x=>{
      const heightDelta=r.h-x[3],weightDelta=r.w-x[4];
      const d=Math.hypot(heightDelta/2,weightDelta/scale);
      return {name:x[0],year:x[1],position:x[2],height:x[3],weight:x[4],
        heightDelta,weightDelta,d};
    }).filter(x=>Math.abs(x.heightDelta)<=3&&Math.abs(x.weightDelta)<=(scale===18?35:25)&&x.d<=1.8);
    matched.sort((a,b)=>a.d-b.d||b.year-a.year||a.name.localeCompare(b.name));
    return {reason:matched.length?"":"No reasonably close historical measurement match in this limited reference sample.",matches:matched.slice(0,3)};
  }
  function trajectory(p){
    const c=ctx[p.r],l=live[p.r];
    // A year only qualifies if the independently source-checked DETAIL actually names a prior year.
    const prior=!!(c?.verified && typeof c.detail==="string" && /\b(?:2023|2024|2025)\b/.test(c.detail));
    const available=!!(l && valid(l.gp) && l.gp>=1);
    return {prior,priorDetail:prior?c.detail:null,priorUrl:prior&&/^https:\/\//.test(c.url||"")?c.url:null,
      current:available?window.APEX_STORIES.profile(p).fact:"2026 position-specific recorded production unavailable",
      currentAvailable:available};
  }
  function analysis(p){return {snapshot:snapshots(p),physical:physical(p),trajectory:trajectory(p)}}
  function render(p){
    const root=document.getElementById("intelDevelopment");
    if(!root)return;
    const d=analysis(p),snap=d.snapshot,phy=d.physical,t=d.trajectory;
    let benchmark;
    if(p.p==="OL")benchmark='<div class="intel-dev-empty"><strong>Individual OL production isn’t available from box scores.</strong><p>Blocking requires assignment and opponent context. There is no credible position-rank calculation from these fields.</p></div>';
    else if(snap){
      const rel=snap.perGame>snap.median+1e-8?"above":snap.perGame<snap.median-1e-8?"below":"near";
      benchmark='<div class="intel-dev-rate"><div><span>Your prospect</span><strong>'+rounded(snap.perGame)+'</strong></div>'+
       '<div><span>Position peer median</span><strong>'+rounded(snap.median)+'</strong></div>'+
       '<div><span>APEX position sample</span><strong>'+snap.cohort+'</strong></div></div>'+
       '<p class="intel-dev-ratecopy">'+safe(snap.label)+': '+safe(p.n)+' is '+rel+' the median among '+snap.cohort+
       ' same-position APEX prospects with at least two recorded-stat games. This measures one box-score category—not talent or future success.</p>';
    }else benchmark='<div class="intel-dev-empty"><strong>Not enough comparable recorded statistics.</strong><p>This player or position lacks a defensible same-position metric sample. Missing production is never counted as a zero or a poor grade.</p></div>';
    const historical=phy.matches.length?
      phy.matches.map(x=>{
        const diffH=x.heightDelta===0?"Same listed height":Math.abs(x.heightDelta)+'″ '+(x.heightDelta>0?"taller":"shorter");
        const diffW=x.weightDelta===0?"Same listed weight":Math.abs(x.weightDelta)+' lb '+(x.weightDelta>0?"heavier":"lighter");
        return '<article class="intel-hist-card"><div><span class="intel-hist-year">'+x.year+' draft</span><strong>'+safe(x.name)+'</strong>'+
          '<small>'+safe(x.position)+' · '+ht(x.height)+' · '+x.weight+' lb</small></div>'+
          '<p>'+diffH+' · '+diffW+'</p></article>';
      }).join(""):
      '<div class="intel-dev-empty"><strong>No defensible historical size neighbor in this sample.</strong><p>'+safe(phy.reason||"Listed size is not available.")+'</p></div>';
    const source=(t.priorUrl?
      '<a href="'+safe(t.priorUrl)+'" target="_blank" rel="noopener noreferrer">Review dated college source ↗</a>':'');
    root.innerHTML=
     '<section class="intel-dev-section" aria-label="Historical physical comparisons"><div class="intel-section-head"><span>03 / HISTORICAL REFERENCE</span>'+
       '<h3>Who had a similar build?</h3></div><p class="intel-dev-intro">These are <strong>size-only neighbors</strong> from a sampled 2015–2022 NFL draft cohort. Matching uses listed position, height and weight—<strong>not</strong> production, film, age, success or career value.</p>'+
       '<div class="intel-hist-grid">'+historical+'</div>'+
       '<p class="intel-dev-foot">Historical pre-draft measurements are taken from APEX research records and have not all been independently rechecked. 2026 roster listings and historical measurements may use different measurement methods. Similar size does not imply a similar NFL career.</p></section>'+
     '<section class="intel-dev-section" aria-label="2026 position-specific production context"><div class="intel-section-head"><span>04 / POSITION CONTEXT</span>'+
       '<h3>How does this season compare?</h3></div>'+benchmark+
       '<p class="intel-dev-foot">Descriptive comparison within the 2027 APEX board using October 7, 2026 public ESPN-derived statistics. “Recorded-stat games” are not official games played; competition and workload differences are unadjusted. Not a national percentile or NFL forecast.</p></section>'+
     '<section class="intel-dev-section intel-trajectory" aria-label="Development evidence over time"><div class="intel-section-head"><span>05 / DEVELOPMENT EVIDENCE</span>'+
       '<h3>What do we actually know across seasons?</h3></div>'+
       '<div class="intel-timeline"><div class="intel-time-item"><span>Earlier college seasons</span><strong>'+
         (t.prior?"A source-backed prior-season fact":"Comparable historical trend not yet verified")+'</strong>'+
         '<p>'+safe(t.prior?t.priorDetail:"We need consistently defined, identity-verified year-by-year stats to measure development. A single season cannot establish an improvement curve.")+'</p>'+source+'</div>'+
       '<div class="intel-time-item"><span>2026 snapshot</span><strong>'+safe(t.currentAvailable?"Public season evidence":"Evidence incomplete")+'</strong>'+
         '<p>'+safe(t.current)+'</p></div></div>'+
       '<p class="intel-dev-foot">A season-to-season growth rate is deliberately not shown unless comparable player-season measurements exist. Absences, transfers and positions change what a trend can mean.</p></section>';
    window.APEX_HISTORICAL_WIDGET?.render(p,root);
    window.APEX_PLAYER_TRENDS?.render(p,root);
  }
  window.APEX_DEVELOP={analysis,render,historyCount:history.length};
})();