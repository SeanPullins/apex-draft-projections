/* PUBLIC: only aggregated historical drafted-NFL cohort observations.
   Four-season offensive/defensive snap outcomes, 2013-2022. No individual private sources. */
window.APEX_HISTORICAL_COHORT={
  version:"2026-10-09-v1",
  source:"APEX Phase 4 NFL snap outcomes + X9 historical combine weights; stable PFR ID join",
  sourceAggregateSha256:"e92274e4d62c9682d3e447203a16d15c1d72f860bbf638d1959076f42c5e68b1",
  years:[2013,2022],
  columns:["cohort_n","earned_role_n","sustained_role_n","high_workload_n"],
  rows:{
    DB:{q:[195,204],all:[520,350,208,219],bands:[[204,133,73,76],[150,106,62,67],[166,111,73,76]]},
    DL:{q:[300,315],all:[217,152,97,64],bands:[[76,56,29,20],[76,53,37,25],[65,43,31,19]]},
    EDGE:{q:[254,270],all:[300,186,106,83],bands:[[102,55,32,24],[111,74,47,36],[87,57,27,23]]},
    LB:{q:[235,242],all:[243,142,80,71],bands:[[98,55,29,29],[66,35,21,17],[79,52,30,25]]},
    OL:{q:[310,318],all:[425,307,180,195],bands:[[172,117,64,74],[113,80,49,51],[140,110,67,70]]},
    QB:{q:[218,225],all:[113,52,25,32],bands:[[38,13,7,8],[43,21,10,15],[32,18,8,9]]},
    RB:{q:[210,223],all:[229,118,65,57],bands:[[90,43,20,18],[67,41,23,16],[72,34,22,23]]},
    TE:{q:[249,255],all:[143,103,57,39],bands:[[51,36,21,15],[48,35,24,16],[44,32,12,8]]},
    WR:{q:[195,210],all:[319,207,115,117],bands:[[115,74,44,44],[113,77,40,41],[91,56,31,32]]}
  }
};
