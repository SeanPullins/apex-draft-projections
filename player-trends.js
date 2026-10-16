/* APEX Player DNA: source-checked 2024/25 public college histories.
 * Purely descriptive. No model/grade/rank writes or licensed per-player exports. */
(function(){
  "use strict";
  const registry=window.APEX_PLAYER_SEASON_HISTORY?.records||{};
  const safe=x=>String(x??"").replace(/[&<>"']/g,c=>c==="&"?"&amp;":c==="<"?"&lt;":c===">"?"&gt;":c==='"'?"&quot;":"&#39;");
  const fmt=n=>Number(n).toLocaleString("en-US");
  const valid=n=>typeof n==="number"&&Number.isFinite(n);
  const activityBlocked=new Set(["OUT_INJURY_2026","LIMITED_INJURY_2026","SITTING_OUT_2026","ELIGIBILITY_NO_2026_GAMES"]);
  const settings={
    QB:{limit:100,scale:13,measure:"Passing yards per attempt",short:"YDS / ATT",opportunity:"passes",denominator:"passing attempts"},
    RB:{limit:30,scale:9,measure:"Rushing yards per carry",short:"YDS / CARRY",opportunity:"carries",denominator:"rushing attempts"},
    WR:{limit:20,scale:25,measure:"Receiving yards per catch",short:"YDS / CATCH",opportunity:"catches",denominator:"receptions"},
    TE:{limit:20,scale:25,measure:"Receiving yards per catch",short:"YDS / CATCH",opportunity:"catches",denominator:"receptions"}
  };
  function hasHistory(p){
    const r=p&&registry[p.r];return !!(r&&r.name===p.n&&r.position===p.p&&settings[p.p]);
  }
  function analysis(p){
    if(!hasHistory(p))return null;
    const r=registry[p.r],cfg=settings[p.p];
    const seasons=r.seasons.map(x=>({
      year:x.year,team:x.team,conference:x.conference,g:x.games,
      n:x.opportunities,yards:x.yards,td:x.touchdowns,
      rate:x.opportunities>0?x.yards/x.opportunities:null,
      complete:true,ample:x.opportunities>=cfg.limit
    }));
    if(seasons.length!==2||seasons[0].year!==2024||seasons[1].year!==2025)return null;
    const l=window.APEX2026?.players?.[p.r];
    const eligible=l&&l.ds==="LIVE_2026_SCORED"&&!activityBlocked.has(l.status);
    let current=null;
    if(eligible&&p.r===6){
      // Texas official game-log subtotal vs Oct 7 site extract was not reconciled.
      current={year:2026,team:l.team,n:null,yards:null,td:null,rate:null,
        complete:false,scope:"Source conflict: Texas official lists 11 catches / 194 yards through four games; the frozen APEX Oct. 7 feed lists 12 / 208. Rate withheld pending matched-game reconciliation."};
    }else if(eligible&&p.p==="QB"){
      current={year:2026,team:l.team,n:null,yards:null,td:null,rate:null,
        complete:false,scope:"The frozen Oct. 7 APEX 2026 public feed lacks passing attempts. An efficiency rate cannot be calculated without that denominator."};
    }else if(eligible){
      const n=p.p==="RB"?l.ra:l.rec;
      const yards=p.p==="RB"?l.ry:l.rey;
      const td=p.p==="RB"?l.rtd:l.retd;
      if(valid(n)&&n>0&&valid(yards)){
        current={year:2026,team:l.team,g:valid(l.gp)?l.gp:null,n,yards,
          td:valid(td)?td:null,rate:yards/n,complete:false,
          scope:"Partial October 7 ESPN-derived APEX snapshot. Not reconciled to all latest school game logs or season totals."};
      }
    }
    return {
      position:p.p,name:r.name,source:r.source,scale:cfg.scale,min:cfg.limit,
      metric:cfg.measure,short:cfg.short,opportunity:cfg.opportunity,denominator:cfg.denominator,
      seasons,current,comparable:seasons.every(s=>s.ample),
      schoolChanged:seasons[0].team!==seasons[1].team,
      conferenceChanged:seasons[0].conference!==seasons[1].conference
    };
  }
  function yearCard(s,d){
    if(!s)return '<article class="dna-trend-year dna-trend-pending"><span>2026 / PARTIAL</span>'+
      '<strong>Not available</strong><p>Activity or comparable records not released. Missing is not zero.</p></article>';
    const isPartial=!s.complete,kicker=s.year+(isPartial?" / OCT 7 SNAPSHOT":" / COMPLETE");
    if(s.rate==null)return '<article class="dna-trend-year dna-trend-pending"><span>'+kicker+'</span>'+
      '<strong>Rate unavailable</strong><p>'+safe(s.scope||"Source data missing")+'</p></article>';
    const value=s.rate.toFixed(1);
    const width=(Math.max(0,Math.min(100,100*s.rate/d.scale))).toFixed(1);
    const thin=s.complete&&s.n<d.min;
    let note=(s.g&&s.complete)?' · '+(s.n/s.g).toFixed(1)+' '+d.opportunity+'/game':'';
    return '<article class="dna-trend-year'+(isPartial?' is-partial':"")+(thin?" is-thin":"")+'">'+
      '<span>'+kicker+'</span>'+
      '<strong>'+safe(value)+'<small>'+safe(d.short)+'</small></strong>'+
      '<div class="dna-trend-track" role="img" aria-label="'+safe(value+" "+d.metric+" in "+s.year)+'"><i style="width:'+width+'%"></i></div>'+
      '<p>'+fmt(s.n)+' '+safe(d.opportunity)+' · '+fmt(s.yards)+' yards · '+
        (s.td==null?'—':fmt(s.td))+' TD'+note+'</p>'+
      (thin?'<small class="dna-trend-warning">Small season sample · interpret cautiously</small>':"")+
      (isPartial?'<small class="dna-trend-warning">Partial season · not directly comparable</small>':"")+
      '<small class="dna-trend-team">'+safe(s.team||"")+(s.conference?' · '+safe(s.conference):"")+'</small></article>';
  }
  function interpretation(d){
    const [a,b]=d.seasons;
    if(!d.comparable){
      const short=[a,b].filter(s=>!s.ample).map(s=>s.year+': '+s.n+' '+d.opportunity).join("; ");
      return {
        opportunity:"Role sample too small to interpret a two-year change ("+short+"). "+
          "A reserve season and starter season are not equal exposure.",
        efficiency:"No directional efficiency conclusion. The earlier season has fewer than "+d.min+" "+d.opportunity+"."
      };
    }
    const net=b.n-a.n,rateDiff=b.rate-a.rate;
    const change=net===0?"unchanged":net>0?"increased":"decreased";
    const direction=rateDiff>0?"higher":rateDiff<0?"lower":"unchanged";
    const perGame=valid(a.g)&&a.g>0&&valid(b.g)&&b.g>0?
      " Per appearance, usage was "+(a.n/a.g).toFixed(1)+" to "+(b.n/b.g).toFixed(1)+
      " "+d.opportunity+"; appearances are not snaps or offensive opportunities.":"";
    return {
      opportunity:"Recorded "+d.opportunity+" "+change+" from "+fmt(a.n)+" in 2024 to "+fmt(b.n)+
        " in 2025."+perGame,
      efficiency:d.metric+" was "+a.rate.toFixed(1)+" in 2024 and "+b.rate.toFixed(1)+
        " in 2025 ("+Math.abs(rateDiff).toFixed(1)+" "+(rateDiff===0?"difference":direction)+
        "). This is descriptive efficiency, not a quality or development grade."
    };
  }
  function contextText(d){
    const [a,b]=d.seasons;
    if(d.schoolChanged){
      return "School changed from "+a.team+" to "+b.team+
        (d.conferenceChanged?" ("+a.conference+" → "+b.conference+").":" (both listed in "+a.conference+").")+
        " Different schemes and opponents prevent a clean attribution of the change to player development.";
    }
    return "Both seasons: "+a.team+" ("+a.conference+"). Opponent schedules, assignments and playing time may still differ. ";
  }
  function render(p,root){
    const d=analysis(p);
    if(!d||!root)return;
    const host=root.querySelector(".intel-trajectory"),head=host?.querySelector(".intel-section-head");
    if(!head)return;
    const read=interpretation(d);
    const section='<div class="dna-trend-study" aria-label="2024 to 2026 historical college production timeline">'+
      '<div class="dna-trend-heading"><div><span>SOURCE-CHECKED · 2024–25</span>'+
      '<h4>Season development, without guesswork</h4></div><span class="dna-trend-count">20 / 201 PROFILES</span></div>'+
      '<p class="dna-trend-description">These cards show <strong>'+safe(d.metric)+
      '</strong> and actual volume—not a new player grade. The 2026 column is an older partial public snapshot, not a full season.</p>'+
      '<div class="dna-trend-years">'+d.seasons.map(s=>yearCard(s,d)).join("")+yearCard(d.current,d)+'</div>'+
      '<div class="dna-trend-reads"><div><span>01 / OPPORTUNITY</span><strong>Was the role bigger?</strong><p>'+safe(read.opportunity)+'</p></div>'+
      '<div><span>02 / EFFICIENCY</span><strong>Was the rate different?</strong><p>'+safe(read.efficiency)+'</p></div>'+
      '<div><span>03 / COMPETITION</span><strong>Did context change?</strong><p>'+safe(contextText(d))+
      '<strong> Opponent-strength adjustment is not yet available.</strong></p></div></div>'+
      '<div class="dna-trend-caveat"><strong>Do not read this as an NFL success probability.</strong> '+
      'No defense-adjusted route or rush efficiency, opponent-weighted schedule, playing-time snaps, scheme effects or player-development grade has been validated. '+
      'Different bowl-game treatments may affect cross-provider totals. No current APEX rankings or probabilities change here.</div>'+
      '<a class="dna-trend-source" href="'+safe(d.source)+'" target="_blank" rel="noopener noreferrer">Check 2024–25 source ↗</a>'+
      '<details class="dna-trend-method"><summary>What counts as enough evidence?</summary><p>'+
      'Source-reviewed 2024–25 totals use QB passing attempts and passing yards; RB carries and rushing yards; WR/TE receptions and receiving yards. '+
      'A rate difference is interpreted only when both completed seasons have at least '+
      d.min+' '+safe(d.opportunity)+'. Even then, an unadjusted rate is not player value. '+
      'Appearances are not snaps or targets, and school/conference labels cannot quantify actual opponent difficulty. '+
      '2026 comes solely from a separate, dated public ESPN-derived APEX snapshot and is never treated as another completed season.'+
      '</p></details></div>';
    head.insertAdjacentHTML("afterend",section);
    const old=host.querySelector(".intel-timeline");
    if(old)old.remove();
  }
  window.APEX_PLAYER_TRENDS={
    analysis,render,hasHistory,reviewedCount:Object.keys(registry).length
  };
})();
