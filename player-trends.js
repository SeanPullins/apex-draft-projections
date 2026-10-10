/* APEX Player DNA — public, source-checked completed 2024/2025 seasons.
   Descriptive UI only. 2026 reads the existing frozen, partial ESPN-derived public summary.
   No NFL outcome labels, private metrics, scoring or model writes. */
(function(){
  "use strict";
  const records={
    1:{name:"Jeremiah Smith",pos:"WR",source:"https://www.espn.com/college-football/player/stats/_/id/5079720/jeremiah-smith",
      seasons:[{year:2024,team:"Ohio State",n:76,yards:1315,td:15},{year:2025,team:"Ohio State",n:87,yards:1243,td:12}]},
    5:{name:"Arch Manning",pos:"QB",source:"https://www.espn.com/college-football/player/stats/_/id/4870906/arch-manning",
      seasons:[{year:2024,team:"Texas",n:90,yards:939,td:9},{year:2025,team:"Texas",n:404,yards:3163,td:26}]},
    6:{name:"Cam Coleman",pos:"WR",source:"https://texaslonghorns.com/sports/football/roster/cam-coleman/16950",
      seasons:[{year:2024,team:"Auburn",n:37,yards:598,td:8},{year:2025,team:"Auburn",n:56,yards:708,td:5}]},
    21:{name:"Julian Sayin",pos:"QB",source:"https://www.espn.com/college-football/player/stats/_/id/5079712/julian-sayin",
      seasons:[{year:2024,team:"Ohio State",n:12,yards:84,td:1},{year:2025,team:"Ohio State",n:391,yards:3610,td:32}]}
  };
  const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=n=>n.toLocaleString("en-US");
  const valid=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0;
  const nonplay=new Set(["OUT_INJURY_2026","LIMITED_INJURY_2026","SITTING_OUT_2026","ELIGIBILITY_NO_2026_GAMES"]);
  function analysis(p){
    const r=p&&records[p.r];
    // Guard rank reuse, an identity mix-up and a prospect's position change.
    if(!r||p.n!==r.name||p.p!==r.pos)return null;
    const seasons=r.seasons.map(s=>Object.assign({},s,{rate:s.n>0?s.yards/s.n:null,complete:true}));
    const live=window.APEX2026?.players?.[p.r];
    const eligible=live&&live.ds==="LIVE_2026_SCORED"&&!nonplay.has(live.status);
    let current=null;
    if(eligible&&p.r===6){
      // Official Texas four-game log: 3+3+4+1 = 11 catches, 70+35+59+30 = 194 yards.
      // Oct 7 APEX2026 extract: 12 catches, 208 yards. Same four-game window is unreconciled.
      current={year:2026,team:live.team,n:null,yards:null,td:null,rate:null,
        complete:false,scope:"Source conflict: Texas official reports 11 catches / 194 yards through four games; APEX Oct. 7 lists 12 / 208. Rate withheld pending reconciliation."};
    }else if(eligible&&r.pos==="WR"&&valid(live.rec)&&live.rec>0&&valid(live.rey)){
      current={year:2026,team:live.team,n:live.rec,yards:live.rey,
        td:valid(live.retd)?live.retd:null,rate:live.rey/live.rec,complete:false,
        scope:"Frozen Oct. 7, 2026 public summary; not a complete season"};
    }else if(eligible&&r.pos==="QB"&&valid(live.py)){
      // Public APEX2026 has passing yards but no passing-attempt denominator.
      // Never estimate attempts or compare that partial total to a full season.
      current={year:2026,team:live.team,n:null,yards:null,td:null,rate:null,
        complete:false,scope:"Passing attempts are absent from the frozen 2026 APEX summary"};
    }
    const min=r.pos==="QB"?100:20;
    const comparable=seasons.every(s=>s.n>=min);
    return {position:r.pos,name:r.name,source:r.source,seasons,current,
      comparable,min,scale:r.pos==="WR"?25:12,
      metric:r.pos==="WR"?"Yards per catch":"Passing yards per attempt",
      denominator:r.pos==="WR"?"receptions":"passing attempts"};
  }
  function yearCard(s,ctx){
    if(!s)return '<article class="dna-trend-year dna-trend-pending"><span>2026 / IN PROGRESS</span>'+
      '<strong>Not available</strong><p>No 2026 reading is released here. Missing does not mean zero.</p></article>';
    const partial=!s.complete;
    const kicker=s.year+(partial?" / OCT 7 SNAPSHOT":" / FINAL");
    if(s.rate==null)return '<article class="dna-trend-year dna-trend-pending"><span>'+kicker+'</span>'+
      '<strong>Rate unavailable</strong><p>'+safe(s.scope)+'</p></article>';
    const value=s.rate.toFixed(1),width=Math.min(100,Math.max(0,100*s.rate/ctx.scale)).toFixed(1);
    const unit=ctx.position==="WR"?"catches":"attempts";
    return '<article class="dna-trend-year'+(partial?" is-partial":"")+'"><span>'+kicker+'</span>'+
      '<strong>'+value+'<small> '+(ctx.position==="WR"?"YDS / CATCH":"YDS / ATT")+'</small></strong>'+
      '<div class="dna-trend-track" role="img" aria-label="'+safe(value+" "+ctx.metric+" in "+s.year)+'"><i style="width:'+width+'%"></i></div>'+
      '<p>'+fmt(s.n)+' '+unit+' · '+fmt(s.yards)+' yards · '+(s.td==null?"—":fmt(s.td))+' TD'+
      (partial?' <b>· PARTIAL</b>':'')+'</p>'+
      '<small class="dna-trend-team">'+safe(s.team||"")+'</small></article>';
  }
  function explanation(d){
    const a=d.seasons[0],b=d.seasons[1];
    if(d.position==="WR"){
      const change=b.n-a.n;
      return 'From 2024 to 2025, catches '+(change>0?"rose":change<0?"fell":"were unchanged")+
        ' ('+fmt(a.n)+' to '+fmt(b.n)+'), while yards per catch moved from '+
        a.rate.toFixed(1)+' to '+b.rate.toFixed(1)+'. This describes usage and receiving output, not route-running quality or player development on its own.';
    }
    return 'Passing attempts changed from '+fmt(a.n)+' in 2024 to '+fmt(b.n)+
      ' in 2025. The 2024 sample is below the '+d.min+'-attempt comparison floor; differences in role and workload prevent a trustworthy improvement claim.';
  }
  function render(p,root){
    const d=analysis(p);
    if(!d||!root)return;
    const host=root.querySelector(".intel-trajectory"),head=host?.querySelector(".intel-section-head");
    if(!head)return;
    const html='<div class="dna-trend-study" aria-label="Reviewed 2024 to 2026 statistical timeline">'+
      '<div class="dna-trend-heading"><div><span>PUBLIC STAT HISTORY · REVIEWED SAMPLE</span>'+
      '<h4>Three seasons. Different sample sizes.</h4></div><span class="dna-trend-count">2024–25 VERIFIED</span></div>'+
      '<p class="dna-trend-description">Compare <strong>'+safe(d.metric)+'</strong>, not unfinished season totals. '+
      'Full 2024 and 2025 records are source-linked; 2026 is a separate, frozen partial APEX snapshot.</p>'+
      '<div class="dna-trend-years">'+d.seasons.map(s=>yearCard(s,d)).join("")+yearCard(d.current,d)+'</div>'+
      '<div class="dna-trend-interpret"><strong>What actually changed?</strong><p>'+safe(explanation(d))+'</p></div>'+
      '<div class="dna-trend-caveat"><strong>Not a player-improvement score.</strong> 2026 is not a full season. '+
      'Competition, scheme, targets, playing time, transfers and opponent quality are not adjusted. '+
      'An efficiency change does not imply a talent change or alter APEX projections.</div>'+
      '<a class="dna-trend-source" href="'+safe(d.source)+'" target="_blank" rel="noopener noreferrer">'+
      'Review 2024–25 source records ↗</a>'+
      '<details class="dna-trend-method"><summary>How to read these rates</summary><p>For WRs: receiving yards divided by receptions. '+
      'For QBs: passing yards divided by passing attempts. These are descriptive box-score ratios, not adjusted efficiency. '+
      'APEX requires at least 20 completed-season catches or 100 completed-season pass attempts before interpreting a change. '+
      'The current public 2026 QB feed lacks a passing-attempt denominator, so its QB efficiency rate is intentionally withheld. '+
      'Sources may differ in whether bowl/postseason games are included; compare cautiously.</p></details>'+
      '</div>';
    head.insertAdjacentHTML("afterend",html);
    // The legacy fallback timeline remains for everyone else. Avoid duplicate unsourced
    // 2026 narrative for the four curated sample records.
    const prior=host.querySelector(".intel-timeline");
    if(prior)prior.remove();
  }
  window.APEX_PLAYER_TRENDS={analysis,render,reviewedCount:Object.keys(records).length};
})();
