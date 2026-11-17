"""ATLAS-076 reproducible synthetic head-to-head benchmark, not customer evidence."""
from __future__ import annotations
import math
from atlas074 import trial
SCENARIOS={'baseline':'Stable preferences','segments':'Two customer segments','fatigue_dropout':'Skips and dropout','cyclic':'Conflicting / cyclic preferences'}
POLICIES=('balanced','guarded','variance')
METRICS=('raw_gap_rmse','model_gap_rmse')
def run_experiment(scenario='baseline',budget=160,repetitions=16,items=8,seed=76026):
    if scenario not in SCENARIOS:raise ValueError('Unknown scenario')
    if type(budget)!=int or not 40<=budget<=320:raise ValueError('budget must be 40–320')
    if type(repetitions)!=int or not 4<=repetitions<=40:raise ValueError('repetitions must be 4–40')
    if type(items)!=int or not 5<=items<=12:raise ValueError('items must be 5–12')
    if type(seed)!=int or not 0<=seed<=2**31-1:raise ValueError('seed must be a nonnegative 32-bit integer')
    checkpoints=tuple(sorted(set([max(10,budget//4),max(20,budget//2),max(30,3*budget//4),budget])))
    rows=[]
    for rep in range(repetitions):
        rows.extend(trial(seed+rep,scenario,n=items,budgets=checkpoints))
    series=[]
    for point in checkpoints:
        for policy in POLICIES:
            records=[r for r in rows if r['budget']==point and r['policy']==policy]
            summary={'budget':point,'policy':policy,'runs':repetitions}
            for metric in (*METRICS,'coverage','answered','skipped','dropped','exposure_spread'):
                good=[float(r[metric]) for r in records if math.isfinite(float(r[metric]))]
                summary[metric]=round(sum(good)/len(good),6) if good else None
            series.append(summary)
    final=[r for r in rows if r['budget']==budget]
    by_seed={(r['seed'],r['policy']):r for r in final}
    comparisons=[]
    for policy in POLICIES[1:]:
        paired=[]
        for k in range(repetitions):
            baseline=by_seed[(seed+k,'balanced')]; adaptive=by_seed[(seed+k,policy)]
            paired.append({'seed':seed+k,'raw_gap_change':round(adaptive['raw_gap_rmse']-baseline['raw_gap_rmse'],8),'model_gap_change':round(adaptive['model_gap_rmse']-baseline['model_gap_rmse'],8)})
        d=[x['raw_gap_change'] for x in paired];md=[x['model_gap_change'] for x in paired]
        comparisons.append({'policy':policy,'raw_wins':sum(x<-1e-10 for x in d),'raw_losses':sum(x>1e-10 for x in d),'raw_ties':sum(abs(x)<=1e-10 for x in d),'model_wins':sum(x<-1e-10 for x in md),'model_losses':sum(x>1e-10 for x in md),'model_ties':sum(abs(x)<=1e-10 for x in md),'paired_raw_gap_delta':round(sum(d)/len(d),8),'paired_model_gap_delta':round(sum(md)/len(md),8),'paired_runs':paired})
    return {'status':'ok','engine':'ATLAS-074 simulator / ATLAS-076 interactive benchmark','scenario':scenario,'scenario_label':SCENARIOS[scenario],
      'configuration':{'items':items,'budget':budget,'repetitions':repetitions,'seed':seed,'checkpoints':list(checkpoints),'metric':'Pairwise score-gap RMSE (lower is better)','budget_unit':'pair presentations; skips do not count as answers'},
      'series':series,'comparisons':comparisons,
      'limitations':['Entirely synthetic; not OpinionX customer data.','Fixed synthetic respondent panels and pre-generated potential outcomes shared across policies.','Raw score gaps are confounded by opponent selection; smoothed model gaps use a different estimator.','Adaptive policies do not guarantee better performance; findings depend on scenario and seed.','No established savings in survey length or calibrated confidence intervals.']}
