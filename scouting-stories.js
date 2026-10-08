/* Player-specific 2026 editorial snapshots. No new player grades or model changes. */
(function(){
  "use strict";
  const LIVE=(window.APEX2026 && window.APEX2026.players)||{};
  const RESEARCH=(window.APEX2027Context && window.APEX2027Context.rows)||{};
  const context=p=>RESEARCH[p.r]||null;
  const OFF=["OUT_INJURY_2026","LIMITED_INJURY_2026","SITTING_OUT_2026","ELIGIBILITY_NO_2026_GAMES"];
  const has=x=>typeof x==="number"&&Number.isFinite(x);
  const num=x=>Number(x).toLocaleString("en-US",{maximumFractionDigits:1});
  function stats(p){
    const l=LIVE[p.r];
    if(!l)return [];
    const raw=(key,label)=>has(l[key])?{key,label,value:l[key]}:null;
    const groups={
      QB:[raw("py","passing yards"),raw("ptd","passing TD"),raw("ry","rushing yards")],
      RB:[raw("ry","rushing yards"),raw("rtd","rushing TD"),raw("rey","receiving yards"),raw("rec","catches")],
      WR:[raw("rey","receiving yards"),raw("rec","receptions"),raw("retd","receiving TD")],
      TE:[raw("rey","receiving yards"),raw("rec","receptions"),raw("retd","receiving TD")],
      ED:[raw("sk","sacks"),raw("tfl","tackles for loss"),raw("tk","tackles")],
      DT:[raw("sk","sacks"),raw("tfl","tackles for loss"),raw("tk","tackles")],
      LB:[raw("tk","tackles"),raw("tfl","tackles for loss"),raw("sk","sacks")],
      CB:[raw("pd","passes defended"),raw("int","interceptions"),raw("tk","tackles")],
      S:[raw("tk","tackles"),raw("pd","passes defended"),raw("int","interceptions")]
    };
    return (groups[p.p]||[]).filter(Boolean);
  }
  function status(p) {
    const l=LIVE[p.r];
    if(!l)return {label:"2026 snapshot unavailable",kind:"limited"};
    if(OFF.includes(l.status)){
      const c=context(p);
      if(c?.verified_scope==="partial_2026_availability")
        return {label:"2026 participation still unresolved",kind:"limited"};
      if(c?.verified_scope==="historical_availability")
        return {label:"Historical injury documented; 2026 availability requires verification",kind:"limited"};
      const info=l.status==="OUT_INJURY_2026"?"2026 injury absence":
        l.status==="LIMITED_INJURY_2026"?"2026 injury-limited season":
        l.status==="SITTING_OUT_2026"?"Not playing in 2026":"No 2026 games";
      return {label:info,kind:"limited"};
    }
    if(p.p==="OL")return {label:context(p)?"Role research available":"Individual OL grade unavailable",kind:"ol"};
    if(l.ds==="LIVE_2026_SCORED" && stats(p).length)return {label:"2026 college season",kind:"season"};
    return {label:"2026 individual sample limited",kind:"limited"};
  }
  const action={
    HOLD_PRIOR:"In line with consensus",
    EXECUTIVE_REVIEW_UP:"Possible upside vs consensus",
    SLEEPER_DISCOVERY:"Sleeper candidate",
    EXECUTIVE_REVIEW_DOWN:"APEX questions consensus",
    URGENT_DATA_GAP:"No supported 2026 verdict",
    DATA_GAP:"No supported 2026 verdict",
    SCOUT_MORE:"Evaluation still limited"
  };
  function take(p){
    const l=LIVE[p.r],c=context(p);
    if(p.a==="URGENT_DATA_GAP"||p.a==="DATA_GAP"||p.a==="SCOUT_MORE"){
      if(c&&c.kind==="history")return c.verified?"Previous seasons confirmed":"Earlier seasons documented";
      if(l&&OFF.includes(l.status))return "Limited 2026 opportunity";
      if(c&&c.kind==="role")return c.verified?"College record corroborated":l?.muse_private_blocking_received?"Blocking research received":"College role documented";
      if(p.p==="OL")return "No public OL grade";
      return "No supported 2026 verdict";
    }
    return action[p.a]||"Current board view";
  }
  function factLine(p){
    const l=LIVE[p.r],s=stats(p),st=status(p);
    const c=context(p);
    if(st.kind==="limited")return c&&c.kind==="history"?c.detail:st.label;
    if(st.kind==="ol"){
      if(c&&c.kind==="role"){
        if(c.verified)return c.detail+" · individual blocking grade not published";
        return "Reported 2026 "+c.role+" · individual blocking grade not published";
      }
      const measurements=[];
      if(l && l.rp && l.rp!=="OL")measurements.push("listed "+l.rp);
      if(l && has(l.h)){
        const total=Math.round(l.h);
        measurements.push(Math.floor(total/12)+"′"+(total%12)+"″");
      }
      if(l && has(l.w))measurements.push(num(l.w)+" lb");
      return measurements.length ? "2026 roster: "+measurements.join(" · ")+" · no public blocking grade" :
        "Offensive line · public box scores don't grade blocking";
    }
    if(!s.length)return "2026 stats not yet usable for this position";
    const gp=has(l.gp)?" ("+num(l.gp)+" game"+(l.gp===1?"":"s")+")":"";
    return s.slice(0,p.p==="RB"?3:2).map(v=>num(v.value)+" "+v.label).join(" · ")+gp;
  }
  function footballContext(p){
    const messages={
      QB:"Passing production alone cannot show pressure response, reads or ball placement.",
      RB:"Rushing production depends on carries and blocking; it does not isolate contact balance or pass protection.",
      WR:"Receiving totals do not isolate route separation, coverage difficulty or yards created by scheme.",
      TE:"Receiving production cannot establish inline blocking, alignment or all-around role.",
      OL:"Blocking quality needs actual assignments, pass-set exposure and opponent context—not team box scores.",
      ED:"Sacks alone cannot isolate pass-rush win rate, alignment or opponent tackle quality.",
      DT:"Interior disruption depends on assignments and double teams; tackles and sacks are incomplete measures.",
      LB:"Tackle totals do not separate coverage assignments, run fits and opportunity.",
      CB:"Passes defended depend on targets and coverage responsibilities; totals are not coverage grades.",
      S:"Tackles and passes defended vary with deep/box alignment and defensive role."
    };
    return messages[p.p]||"Raw college statistics do not independently establish NFL translation.";
  }
  function interpretation(p){
    const st=status(p),line=factLine(p);
    const market=p.a==="EXECUTIVE_REVIEW_UP"||p.a==="SLEEPER_DISCOVERY"?
      "APEX has a positive signal relative to consensus; it is not a validated NFL-success probability.":
      p.a==="EXECUTIVE_REVIEW_DOWN"?
      "APEX's frozen evaluation is more cautious than consensus; that does not mean this player will fail.":
      p.a==="HOLD_PRIOR"?
      "APEX currently has no strong reason to depart from consensus.":
      "The public season data cannot support a firm updated APEX conclusion.";
    const c=context(p);
    if(c && (p.a==="URGENT_DATA_GAP"||p.a==="DATA_GAP"||p.a==="SCOUT_MORE")){
      return line+". "+(c.verified?
          (c.source==="official"?"The cited school source corroborates this specific fact. ":"Independent reporting supports this specific dated fact. "):
          "This role/history is from Muse research and has not been independently cross-checked. ")+
        "This does not verify 2026 performance grades or update the frozen NFL projection.";
    }
    if(st.kind==="limited")return line+". "+market;
    if(st.kind==="ol")return line+". Individual blocking cannot be graded from team box scores. "+market;
    return line+". "+market;
  }
  function profile(p){
    return {
      take:take(p),
      fact:factLine(p),
      status:status(p).label,
      kind:status(p).kind,
      context:footballContext(p),
      interpretation:interpretation(p),
      note:LIVE[p.r]?.muse_private_blocking_received ?
        "A private blocking source was received but has not been independently reconciled; no public grade or forecast was updated.":
        "The 2027 model snapshot has not been updated from this editorial summary.",
      stable:p.ta||null,
      research:context(p),
      sourceUrl:context(p)?.url||null,
      contextVerified:context(p)?.verified||false,
      modelReady:context(p)?.model_ready===true,
      verifiedScope:context(p)?.verified_scope||null
    };
  }
  window.APEX_STORIES={profile,stats,status,take,factLine,footballContext,interpretation};
})();