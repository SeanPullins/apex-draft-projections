/* Reconcile metrics with the actual payload after score patches. No model fitting. */
(function () {
  'use strict';
  const A = window.APEX;
  if (!A || !A.players) return;
  const validProbability = v => Number.isFinite(v) && v >= 0 && v <= 1;
  const validLabel = v => v === 0 || v === 1;
  const matched = (rows, keys, label) => rows.filter(p => keys.every(k => validProbability(p[k])) && validLabel(p[label]));
  function metrics(rows, score, label) {
    const r = rows.filter(p => Number.isFinite(p[score]) && p[score]>=0 && p[score]<=1 && (p[label] === 0 || p[label] === 1));
    if (!r.length) return null;
    const sorted = r.slice().sort((a,b) => a[score]-b[score]);
    let ranks=0, positives=0, brier=0, loss=0;
    for (let i=0;i<sorted.length;) {
      let j=i+1;
      while(j<sorted.length && sorted[j][score]===sorted[i][score]) j++;
      for(let k=i;k<j;k++) if(sorted[k][label]) { positives++; ranks+=(i+1+j)/2; }
      i=j;
    }
    for(const p of r) {
      const y=p[label], v=Math.max(1e-6,Math.min(1-1e-6,p[score]));
      brier+=(p[score]-y)**2; loss-=y*Math.log(v)+(1-y)*Math.log(1-v);
    }
    return {auc: positives && positives<r.length ? (ranks-positives*(positives+1)/2)/(positives*(r.length-positives)) : null,
      brier:brier/r.length,logloss:loss/r.length,base_rate:positives/r.length,n:r.length,pos:positives};
  }
  const history=A.players.filter(p=>p.yr>=2003 && p.yr<=2021 && p.src===1);
  const labels={hit:['ph','mh','lh'],starter:['ps','ms','ls'],probowl:['pp','mp','lp']};
  for(const [name,[score,market,label]] of Object.entries(labels)) {
    const paired=matched(history,[score,market],label);
    for(const [model,key] of [['deploy',score],['market',market]]) {
      const value=metrics(paired,key,label), modern=metrics(paired.filter(p=>p.yr>=2015),key,label);
      if(value) A.backtest.summary[model][name]={...value,auc_2015_2021:modern?.auc};
    }
    if(paired.length) A.backtest.base_rates[name]=A.backtest.summary.deploy[name].base_rate;
  }
  // Reconcile the pick-free lens too; these are descriptive legacy scores.
  for (const [name, score, label] of [['hit','qh','lh'], ['starter','qs','ls']]) {
    const rows=matched(history,[score],label);
    const value=metrics(rows,score,label), modern=metrics(rows.filter(p=>p.yr>=2015),score,label);
    if (value) A.backtest.summary.predraft[name]={...value,auc_2015_2021:modern?.auc};
  }
  A.backtest.auc_years=Array.from({length:19},(_,i)=>2003+i);
  for(const [name,key] of [['deploy','ph'],['market','mh']]) {
    A.backtest.auc_series[name]=A.backtest.auc_years.map(y=>metrics(matched(history.filter(p=>p.yr===y),['ph','mh'],'lh'),key,'lh')?.auc);
    const eligible=matched(history,['ph','mh'],'lh');
    const top=eligible.slice().sort((a,b)=>b[key]-a[key] || a.yr-b.yr || a.pk-b.pk).slice(0,Math.floor(eligible.length*.1));
    A.backtest.top_decile_hit_rate[name]=top.length ? top.reduce((n,p)=>n+p.lh,0)/top.length : null;
  }
  // Old full-metric summaries describe a different score build; omit them.
  delete A.metrics_full;
  A.calibration.deploy_hit=Array.from({length:10},(_,i)=>{
    const r=matched(history,['ph'],'lh').filter(p=>p.ph>=i/10 && (p.ph<(i+1)/10 || i===9));
    return r.length?{bin_mid:(i+.5)/10,pred_mean:r.reduce((s,p)=>s+p.ph,0)/r.length,
      obs_rate:r.reduce((s,p)=>s+p.lh,0)/r.length,n:r.length}:null;
  }).filter(Boolean);
  if(A.forward) {
    for(const row of A.forward.head_to_head || []) {
      const players=matched(A.players.filter(p=>p.yr===row.yr),['ph','mh'],'fh');
      row.n=players.length;
      const apex=metrics(players,'ph','fh'),market=metrics(players,'mh','fh');
      if(apex && market && A.forward.classes[row.yr]?.hit) {
        A.forward.classes[row.yr].hit.apex=apex.auc;
        A.forward.classes[row.yr].hit.market=market.auc;
      }
      const eligible=players.filter(p=>Number.isFinite(p.apex) && Number.isFinite(p.pk));
      for(const count of [32,64]) {
        const top=eligible.slice().sort((a,b)=>b.apex-a.apex || a.pk-b.pk).slice(0,count);
        const draft=eligible.slice().sort((a,b)=>a.pk-b.pk).slice(0,count);
        row['m'+count]=top.length?top.reduce((n,p)=>n+p.fh,0)/top.length:null;
        row['d'+count]=draft.length?draft.reduce((n,p)=>n+p.fh,0)/draft.length:null;
      }
    }
    const years=new Set((A.forward.head_to_head || []).map(r=>r.yr));
    const all=matched(A.players.filter(p=>years.has(p.yr)),['ph','mh'],'fh');
    const a=metrics(all,'ph','fh'), m=metrics(all,'mh','fh');
    if(a&&m&&A.forward.pooled?.hit) Object.assign(A.forward.pooled.hit,{apex:a.auc,market:m.auc,n:a.n});
  }
  window.APEX_METRICS=metrics;
})();
