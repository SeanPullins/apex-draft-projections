"""Public-data-only, fixed-specification position-curve experiment.
Retrospective class holdout; no claim of draft-night validation or promotion.
Run with Python + numpy/pandas/scikit-learn and Node installed.
"""
import hashlib,json,subprocess
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.preprocessing import SplineTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score,brier_score_loss,log_loss
from threadpoolctl import threadpool_limits
ROOT=Path(__file__).resolve().parents[1]

def run():
    js="const fs=require('fs'),vm=require('vm'),c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.APEX.players));"
    d=pd.DataFrame(json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT)))
    d=d[d.yr.between(2000,2021)].reset_index(drop=True)
    positions=sorted(d.pg.unique())
    def design(tr,te,interaction):
        s=SplineTransformer(n_knots=6,degree=3,include_bias=False)
        a=s.fit_transform(np.log2(tr[['pk']].to_numpy()));b=s.transform(np.log2(te[['pk']].to_numpy()))
        pa=np.column_stack([tr.pg.eq(p) for p in positions]).astype(float)
        pb=np.column_stack([te.pg.eq(p) for p in positions]).astype(float)
        aa=[a,pa];bb=[b,pb]
        if interaction:
            aa.append((a[:,:,None]*pa[:,None,:]).reshape(len(tr),-1))
            bb.append((b[:,:,None]*pb[:,None,:]).reshape(len(te),-1))
        return np.column_stack(aa),np.column_stack(bb)
    result=d[['yr','pk','pg','lh','ls','lp']].copy()
    for yr in range(2003,2022):
        tr=d[d.yr!=yr];te=d[d.yr==yr]
        assert not set(tr.yr)&set(te.yr)
        for interaction,name in [(False,'baseline'),(True,'position')]:
            a,b=design(tr,te,interaction)
            for label in ['lh','ls','lp']:
                model=LogisticRegression(C=1,max_iter=2000).fit(a,tr[label])
                result.loc[te.index,name+'_'+label]=model.predict_proba(b)[:,1]
    ev=result[result.yr>=2003].copy()
    def metrics(g,label,name):
        y=g[label];p=g[name+'_'+label]
        return dict(n=len(g),auc=float(roc_auc_score(y,p)),brier=float(brier_score_loss(y,p)),logloss=float(log_loss(y,p)))
    summary={'protocol':'Fixed C=1 position-by-spline interactions versus additive spline prior; retrospective leave-one-class-out 2003–2021. No calibration, selection, or labels from the evaluation class enter fitting.','input_sha256':hashlib.sha256((ROOT/'data.js').read_bytes()).hexdigest(),'metrics':{},'promoted':False,'limitations':['Career labels have unequal follow-up.','This tests a market baseline, not the full deployed model.','Historical outcomes and features are not timestamped as-of snapshots.','No PFF-private data used.']}
    rng=np.random.default_rng(77)
    for label in ['lh','ls','lp']:
        delta=(ev['position_'+label]-ev[label])**2-(ev['baseline_'+label]-ev[label])**2
        g=pd.DataFrame({'yr':ev.yr,'delta':delta}).groupby('yr').delta.agg(['sum','count']).to_numpy()
        samples=g[rng.integers(0,len(g),(5000,len(g)))].sum(axis=1)
        summary['metrics'][label]={'all':{n:metrics(ev,label,n) for n in ['baseline','position']},'QB':{n:metrics(ev[ev.pg=='QB'],label,n) for n in ['baseline','position']},'modern':{n:metrics(ev[ev.yr>=2015],label,n) for n in ['baseline','position']},'brier_difference_ci95':np.quantile(samples[:,0]/samples[:,1],[.025,.975]).tolist()}
    out=ROOT/'reports/position-prior';out.mkdir(parents=True,exist_ok=True)
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    ev.to_csv(out/'predictions.csv',index=False)
    print(json.dumps(summary,indent=2))
if __name__=='__main__':
    with threadpool_limits(limits=2):run()
