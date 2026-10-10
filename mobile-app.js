/* APEX mobile app shell; <=480px only. No model calculations or data mutations.
 * Desktop navigation, scores, and player data are deliberately left intact. */
(function(){
  "use strict";
  const mq=window.matchMedia?window.matchMedia("(max-width:480px)"):{matches:window.innerWidth<=480};
  let mounted=false;
  function init(){
    if(mounted||!mq.matches)return;
    const D=window.APEX2027,Stories=window.APEX_STORIES;
    if(!D||!Array.isArray(D.players)||!Stories)return;
    mounted=true;
    const $=s=>document.querySelector(s);
    const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const all=D.players.slice().sort((a,b)=>a.r-b.r);
    const byRank=new Map(all.map(p=>[p.r,p]));
    document.documentElement.classList.add("apex-mobile-ready");

    /* Five destinations; More deliberately holds the sixth and methodology pages. */
    const chrome=document.createElement("div");
    chrome.id="apexMobileChrome";
    chrome.innerHTML=
      '<header class="apex-mob-header" id="apexMobHeader">' +
        '<a href="#board" class="apex-mob-wordmark" aria-label="APEX 2027 home">APEX<span>2027</span></a>' +
        '<button type="button" class="apex-mob-search-toggle" id="apexMobSearchToggle" aria-label="Search prospects" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.5"/><path d="m16 16 5 5"/></svg></button>' +
      '</header>' +
      '<div class="apex-mob-search-panel" id="apexMobSearchPanel" hidden><input type="search" id="apexMobSearch" placeholder="Find player or school…" aria-label="Find prospect"><button type="button" id="apexMobClearSearch" aria-label="Clear search">Clear</button></div>' +
      '<nav class="apex-mob-bottomnav" aria-label="Main navigation">' +
       nav("board","Board","M4 5h16v14H4zM4 10h16M9 5v14") +
       nav("dna","Player","M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0") +
       nav("team","Team","M3 20V9l9-6 9 6v11M9 20v-7h6v7M3 20h18") +
       nav("lab","Advisor","M5 20V8m7 12V4m7 16v-9M2 20h20") +
       nav("more","More","M4 7h16M4 12h16M4 17h16")+
      '</nav>' +
      '<div class="apex-mob-overlay" id="apexMobMore" hidden><div class="apex-mob-overlay-backdrop" data-close-more></div><div class="apex-mob-sheet" role="dialog" aria-modal="true" aria-label="More APEX sections" tabindex="-1"><div class="apex-mob-handle"></div><div class="apex-mob-sheet-head"><strong>Explore APEX</strong><button type="button" data-close-more aria-label="Close More">×</button></div><button type="button" data-route="how">How APEX Works <span>→</span></button><button type="button" data-route="validation">Model Lab <span>→</span></button><button type="button" id="apexMobTheme">Toggle light / dark theme <span>◐</span></button><p>APEX 2027 Draft Intelligence</p></div></div>' +
      '<div class="apex-mob-overlay" id="apexMobPicker" hidden><div class="apex-mob-overlay-backdrop" data-close-picker></div><div class="apex-mob-sheet apex-mob-picker" role="dialog" aria-modal="true" aria-label="Choose a prospect" tabindex="-1"><div class="apex-mob-handle"></div><div class="apex-mob-sheet-head"><strong>Choose a prospect</strong><button type="button" data-close-picker aria-label="Close picker">×</button></div><input type="search" id="apexMobPickerQuery" placeholder="Search all 201 players…" aria-label="Search players to compare"><div id="apexMobPickerOptions" class="apex-mob-picker-list"></div></div></div>';
    document.body.insertBefore(chrome,document.body.firstChild);
    function nav(route,title,path){
      return '<button type="button" class="apex-mob-tab" data-mob-route="'+route+'" aria-label="'+title+'" aria-current="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg><span>'+title+'</span></button>';
    }
    const more=$("#apexMobMore");
    const picker=$("#apexMobPicker");
    const searchPanel=$("#apexMobSearchPanel");
    let searchOpen=false,filter={attention:"all",position:"ALL",query:""},pageSize=25,activePicker=null;
    function activeTab(){
      const tab=$(".tabs .tab.is-active");
      return tab?tab.dataset.tab:"board";
    }
    function syncNav(){
      const tab=activeTab();
      chrome.querySelectorAll("[data-mob-route]").forEach(b=>{
        const on=b.dataset.mobRoute===(tab==="how"||tab==="validation"?"more":tab);
        b.classList.toggle("is-current",on);
        b.setAttribute("aria-current",on?"page":"false");
      });
    }
    function navigate(tab){
      const original=$('.tabs .tab[data-tab="'+tab+'"]');
      if(original)original.click();
      more.hidden=true;syncNav();
    }
    chrome.querySelector(".apex-mob-bottomnav").addEventListener("click",e=>{
      const b=e.target.closest("[data-mob-route]");
      if(!b)return;
      if(b.dataset.mobRoute==="more"){more.hidden=false;more.querySelector(".apex-mob-sheet").focus();}
      else navigate(b.dataset.mobRoute);
    });
    more.addEventListener("click",e=>{
      if(e.target.closest("[data-close-more]"))more.hidden=true;
      const go=e.target.closest("[data-route]");
      if(go)navigate(go.dataset.route);
      if(e.target.closest("#apexMobTheme")){const theme=$("#themeToggle");if(theme)theme.click();more.hidden=true;}
    });
    window.addEventListener("hashchange",()=>{syncNav();more.hidden=true;});
    document.querySelector(".tabs").addEventListener("click",()=>window.setTimeout(syncNav,0));
    syncNav();

    function setSearch(open){
      searchOpen=!!open;
      searchPanel.hidden=!open;
      $("#apexMobSearchToggle").setAttribute("aria-expanded",String(open));
      document.documentElement.classList.toggle("apex-mob-search-open",open);
      if(open){document.documentElement.classList.remove("apex-mob-header-hidden");$("#apexMobSearch").focus();}
    }
    $("#apexMobSearchToggle").addEventListener("click",()=>{if(activeTab()!=="board")navigate("board");setSearch(!searchOpen);});
    $("#apexMobClearSearch").addEventListener("click",()=>{$("#apexMobSearch").value="";filter.query="";pageSize=25;renderBoard();$("#apexMobSearch").focus();});
    $("#apexMobSearch").addEventListener("input",e=>{filter.query=e.target.value.trim().toLowerCase();pageSize=25;renderBoard();});
    let prevY=window.scrollY||0;
    window.addEventListener("scroll",()=>{
      if(!mq.matches)return;
      const now=window.scrollY||0,delta=now-prevY;
      if(!searchOpen && now>110 && delta>9)document.documentElement.classList.add("apex-mob-header-hidden");
      else if(delta< -8 || now<70)document.documentElement.classList.remove("apex-mob-header-hidden");
      prevY=now;
    },{passive:true});

    /* Native source fields for all 201 prospects; no score is recomputed. */
    const bar=document.createElement("div");
    bar.id="apexMobFilters";bar.className="apex-mob-filterbar";
    bar.innerHTML='<div class="apex-mob-filter-scroll" role="group" aria-label="Filter 2027 players">' +
      [["all","All"],["attention","Signals"],["season","2026 data"],["red","RED"],["topology","Context"]].map(([v,label])=>
        '<button type="button" class="apex-mob-chip" data-mob-filter="'+v+'" aria-pressed="'+(v==="all"?"true":"false")+'">'+label+'</button>').join("") +
      '</div><label class="apex-mob-position"><span>Position</span><select id="apexMobPosition" aria-label="Filter position">'+
      ['ALL',...[...new Set(all.map(p=>p.p))].sort()].map(pos=>
        '<option value="'+clean(pos)+'">'+(pos==="ALL"?"All positions":clean(pos))+'</option>').join("")+
      '</select></label>';
    const controls=$("#tab-board .controls");
    controls.parentNode.insertBefore(bar,controls);
    const mobileBoard=document.createElement("section");
    mobileBoard.id="apexMobBoard";mobileBoard.setAttribute("aria-label","2027 prospect cards");
    mobileBoard.innerHTML='<div class="apex-mob-skeleton" aria-hidden="true"></div><div class="apex-mob-skeleton" aria-hidden="true"></div>';
    $("#tab-board .board-shell").appendChild(mobileBoard);
    bar.addEventListener("click",e=>{
      const b=e.target.closest("[data-mob-filter]");
      if(!b)return;
      filter.attention=b.dataset.mobFilter;pageSize=25;renderBoard();
    });
    $("#apexMobPosition").addEventListener("change",e=>{filter.position=e.target.value;pageSize=25;renderBoard();});
    function statPairs(p){
      const x=(window.APEX2026&&window.APEX2026.players&&window.APEX2026.players[p.r])||{};
      const specs={
        QB:[["py","Pass YDS"],["ptd","Pass TD"],["ry","Rush YDS"]],
        RB:[["ry","Rush YDS"],["rtd","Rush TD"],["rec","Catches"]],
        WR:[["rec","Catches"],["rey","Rec YDS"],["retd","Rec TD"]],
        TE:[["rec","Catches"],["rey","Rec YDS"],["retd","Rec TD"]],
        ED:[["sk","Sacks"],["tfl","TFL"],["tk","Tackles"]],
        DT:[["sk","Sacks"],["tfl","TFL"],["tk","Tackles"]],
        LB:[["tk","Tackles"],["tfl","TFL"],["sk","Sacks"]],
        CB:[["pd","Pass DEF"],["int","INT"],["tk","Tackles"]],
        S:[["tk","Tackles"],["pd","Pass DEF"],["int","INT"]]
      };
      return (specs[p.p]||[]).filter(([k])=>typeof x[k]==="number"&&Number.isFinite(x[k])).slice(0,3)
        .map(([k,label])=>'<div class="apex-mob-stat"><strong>'+clean(x[k].toLocaleString())+'</strong><span>'+clean(label)+'</span></div>').join("");
    }
    function included(p){
      const prof=Stories.profile(p);
      if(filter.position!=="ALL"&&p.p!==filter.position)return false;
      if(filter.query&&!(p.n.toLowerCase().includes(filter.query)||p.s.toLowerCase().includes(filter.query)))return false;
      if(filter.attention==="attention"&&p.a==="HOLD_PRIOR"&&p.ta!=="RED"&&p.ta!=="AMBER")return false;
      if(filter.attention==="season"&&prof.kind!=="season")return false;
      if(filter.attention==="red"&&p.ta!=="RED")return false;
      if(filter.attention==="topology"&&!p.ta)return false;
      return true;
    }
    function card(p){
      const prof=Stories.profile(p);
      const colors=["GREEN","AMBER","RED"];
      const confidence=colors.includes(p.ta)?p.ta:"Not rated";
      const context=p.ta?"Context rated":"Context not rated";
      const a=statPairs(p);
      return '<article class="apex-mob-card" data-rank="'+p.r+'" role="button" tabindex="0" aria-label="Open '+clean(p.n)+' player profile">'+
        '<div class="apex-mob-card-head"><span class="apex-mob-rank">#'+p.r+'</span><div class="apex-mob-identity"><strong>'+clean(p.n)+'</strong><span>'+clean(p.p)+' · '+clean(p.s)+'</span></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></div>'+
        '<div class="apex-mob-badges"><span class="apex-mob-take">'+clean(prof.take||"Current assessment")+'</span><span class="apex-mob-confidence '+(p.ta?'tone-'+p.ta.toLowerCase():'')+'"><i aria-hidden="true"></i>'+clean(confidence)+'</span></div>'+
        (a?'<div class="apex-mob-stats">'+a+'</div>':'<p class="apex-mob-stat-empty">'+clean(prof.fact||"2026 individual figures unavailable")+'</p>')+
        '<details class="apex-mob-why"><summary>Why APEX says this <span aria-hidden="true">⌄</span></summary><p>'+clean(prof.interpretation||"Insufficient current evidence for a stronger conclusion.")+'</p><p class="apex-mob-context">'+context+'. Market rank is not an NFL outcome probability.</p></details>'+
      '</article>';
    }
    function renderBoard(){
      mobileBoard.querySelectorAll(".apex-mob-card,.apex-mob-page,.apex-mob-count,.apex-mob-empty,.apex-mob-skeleton").forEach(n=>n.remove());
      bar.querySelectorAll("[data-mob-filter]").forEach(n=>n.setAttribute("aria-pressed",String(n.dataset.mobFilter===filter.attention)));
      const matches=all.filter(included),slice=matches.slice(0,pageSize);
      mobileBoard.insertAdjacentHTML("beforeend",
        '<div class="apex-mob-count" role="status">'+matches.length+' prospects · '+Math.min(slice.length,matches.length)+' shown</div>'+
        (slice.length?slice.map(card).join(""):'<div class="apex-mob-empty">No players match. Try All or another position.</div>')+
        (matches.length>slice.length?'<button type="button" class="apex-mob-showmore">Show 25 more · '+(matches.length-slice.length)+' remaining</button>':''));
    }
    mobileBoard.addEventListener("click",e=>{
      if(e.target.closest(".apex-mob-showmore")){pageSize+=25;renderBoard();return;}
      if(e.target.closest("details,summary"))return;
      const c=e.target.closest(".apex-mob-card");
      if(c)openProspect(+c.dataset.rank);
    });
    mobileBoard.addEventListener("keydown",e=>{
      const c=e.target.closest(".apex-mob-card");
      if(c&&e.target===c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openProspect(+c.dataset.rank);}
    });
    function openProspect(rank){
      if(!byRank.has(rank))return;
      window.dispatchEvent(new CustomEvent("apex:open-dossier",{detail:{rank}}));
    }
    renderBoard();

    /* Dismissible guidance: retained on device, always recoverable via Board legend. */
    const guide=$("#tab-board .hero-guide");
    if(guide){
      const note=document.createElement("section");
      note.className="apex-mob-howto";note.id="apexMobHowto";
      note.innerHTML='<div><strong>How to read this board</strong><span>Market = consensus order · APEX Take = our current view · 2026 stats = observed production.</span></div><button type="button" aria-label="Dismiss how to read this card">×</button>';
      $("#tab-board .hero").insertAdjacentElement("afterend",note);
      try{note.hidden=localStorage.getItem("apex-mobile-howto-dismissed")==="1";}catch(_){}
      note.querySelector("button").addEventListener("click",()=>{note.hidden=true;try{localStorage.setItem("apex-mobile-howto-dismissed","1");}catch(_){}});
    }

    /* Team Mode stage control proxies existing inputs; scoring source remains app.js. */
    const team=$("#tab-team");
    const stages=["Team & picks","Roster needs","Approach","Results"];
    const guideTeam=document.createElement("div");
    guideTeam.id="apexMobTeamWizard";guideTeam.className="apex-mob-team-wizard";
    guideTeam.innerHTML='<div class="apex-mob-stage-dots">'+stages.map((v,i)=>'<button type="button" data-team-stage="'+i+'"><span>'+(i+1)+'</span><small>'+v+'</small></button>').join("")+'</div>'+
      '<div class="apex-mob-stage-actions"><button type="button" id="apexMobTeamBack">← Back</button><strong id="apexMobStageTitle"></strong><button type="button" id="apexMobTeamNext">Next →</button></div>';
    team.querySelector(".team-mode").insertBefore(guideTeam,team.querySelector(".team-config"));
    const settings=document.createElement("div");
    settings.className="apex-mob-team-segments";settings.id="apexMobTeamSegments";
    for(const field of [["teamPhilosophy","Draft philosophy"],["teamRisk","Risk tolerance"]]){
      const native=$("#"+field[0]);
      settings.innerHTML+='<fieldset><legend>'+field[1]+'</legend><div class="apex-mob-segments" data-for="'+field[0]+'">'+[...native.options].map(o=>'<button type="button" data-value="'+clean(o.value)+'">'+clean(o.textContent)+'</button>').join("")+'</div></fieldset>';
    }
    guideTeam.insertAdjacentElement("afterend",settings);
    const stickyEdit=document.createElement("button");
    stickyEdit.id="apexMobTeamEdit";stickyEdit.type="button";stickyEdit.textContent="Edit draft room settings";
    team.querySelector(".team-board-shell").insertAdjacentElement("beforebegin",stickyEdit);
    let stage=0;
    function syncSegments(){
      settings.querySelectorAll("[data-for]").forEach(group=>{
        const el=$("#"+group.dataset.for);
        group.querySelectorAll("[data-value]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.value===el.value)));
      });
    }
    function setStage(next){
      stage=Math.min(3,Math.max(0,next));
      team.dataset.mobileStage=String(stage);
      $("#apexMobStageTitle").textContent=stages[stage];
      $("#apexMobTeamBack").disabled=stage===0;
      $("#apexMobTeamNext").hidden=stage===3;
      $("#apexMobTeamNext").textContent=stage===2?"See results →":"Next →";
      guideTeam.querySelectorAll("[data-team-stage]").forEach(b=>b.classList.toggle("is-selected",+b.dataset.teamStage===stage));
      syncSegments();
      const head=guideTeam.getBoundingClientRect();
      if(head.top<0)guideTeam.scrollIntoView?.({block:"start"});
    }
    guideTeam.addEventListener("click",e=>{
      const step=e.target.closest("[data-team-stage]");
      if(step)setStage(+step.dataset.teamStage);
    });
    $("#apexMobTeamBack").addEventListener("click",()=>setStage(stage-1));
    $("#apexMobTeamNext").addEventListener("click",()=>setStage(stage+1));
    $("#apexMobTeamEdit").addEventListener("click",()=>{setStage(0);guideTeam.scrollIntoView?.({block:"start",behavior:"smooth"});});
    settings.addEventListener("click",e=>{
      const b=e.target.closest("[data-value]"),group=b&&b.closest("[data-for]");
      if(!group)return;
      const native=$("#"+group.dataset.for);
      native.value=b.dataset.value;
      native.dispatchEvent(new Event("change",{bubbles:true}));
      syncSegments();
    });
    setStage(0);

    /* Reuse existing Board compare controls, with searchable player choice. */
    const selectors=["#compareA","#compareB"];
    for(const selector of selectors){
      const control=$(selector);
      if(!control)continue;
      control.addEventListener("pointerdown",e=>{if(!mq.matches)return;e.preventDefault();openPicker(control);});
      control.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&mq.matches){e.preventDefault();openPicker(control);}});
    }
    function openPicker(select){
      activePicker=select;picker.hidden=false;
      $("#apexMobPickerQuery").value="";renderPicker("");$("#apexMobPickerQuery").focus();
    }
    function renderPicker(value){
      const q=value.trim().toLowerCase();
      const matches=all.filter(p=>(p.n+" "+p.s+" "+p.p).toLowerCase().includes(q)).slice(0,80);
      $("#apexMobPickerOptions").innerHTML=matches.map(p=>
        '<button type="button" data-pick-rank="'+p.r+'"><strong>#'+p.r+' · '+clean(p.n)+'</strong><span>'+clean(p.p)+' · '+clean(p.s)+'</span></button>').join("")||
        '<p class="apex-mob-empty">No matching prospect</p>';
    }
    $("#apexMobPickerQuery").addEventListener("input",e=>renderPicker(e.target.value));
    picker.addEventListener("click",e=>{
      if(e.target.closest("[data-close-picker]")){picker.hidden=true;return;}
      const item=e.target.closest("[data-pick-rank]");
      if(item&&activePicker){
        activePicker.value=item.dataset.pickRank;
        activePicker.dispatchEvent(new Event("change",{bubbles:true}));
        picker.hidden=true;activePicker.focus();
      }
    });

    /* Advisor stories as a horizontal quick-switcher for the existing select. */
    const focus=$("#labFocus");
    if(focus){
      const stories=document.createElement("div");
      stories.className="apex-mob-stories";stories.setAttribute("aria-label","Draft Advisor storylines");
      stories.innerHTML=[...focus.options].map(o=>
        '<button type="button" data-focus="'+clean(o.value)+'">'+clean(o.textContent)+'</button>').join("");
      $("#tab-lab .fan-controls").insertAdjacentElement("beforebegin",stories);
      function sync(){stories.querySelectorAll("[data-focus]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.focus===focus.value)));}
      stories.addEventListener("click",e=>{const b=e.target.closest("[data-focus]");if(!b)return;focus.value=b.dataset.focus;focus.dispatchEvent(new Event("change",{bubbles:true}));sync();});
      focus.addEventListener("change",sync);sync();
    }

    /* Text kept accessible, expandable on long educational paragraphs. */
    for(const p of document.querySelectorAll("#tab-how .prose p,#tab-validation .intel-legacy-research p")){
      if(p.textContent.trim().length<165||p.closest(".callout"))continue;
      p.classList.add("apex-mob-clamped");
      const button=document.createElement("button");
      button.className="apex-mob-readmore";button.type="button";
      button.textContent="Read more";
      p.insertAdjacentElement("afterend",button);
      button.addEventListener("click",()=>{
        const expanded=p.classList.toggle("is-expanded");
        button.textContent=expanded?"Read less":"Read more";
        button.setAttribute("aria-expanded",String(expanded));
      });
      button.setAttribute("aria-expanded","false");
    }

    /* Mobile dialog accessibility. Only slide-to-close from the handle / top edge. */
    const layers=["#modalBackdrop","#compareBackdrop","#plainEnglishSheet","#columnHelpSheet","#teamFormulaSheet","#apexMobMore","#apexMobPicker"]
      .map($).filter(Boolean);
    let restoredFocus=null,historyClosing=false,hasSheetHistory=false;
    function topLayer(){return layers.slice().reverse().find(el=>!el.hidden);}
    function closeLayer(el){
      if(!el)return;
      if(el.id==="apexMobMore"||el.id==="apexMobPicker"){el.hidden=true;return;}
      if(el.id==="modalBackdrop"&&hasSheetHistory&&!historyClosing){history.back();return;}
      const close=el.querySelector(".modal-close,[data-close-sheet],[data-close-column-help],[data-close-team-formula]");
      if(close)close.click();
    }
    const observer=new MutationObserver(items=>{
      for(const m of items){
        const el=m.target;
        if(!el.hidden){
          restoredFocus=document.activeElement;
          const close=el.querySelector(".modal-close,[data-close-sheet],[data-close-column-help],[data-close-team-formula]");
          if(close)close.focus();
          else if(el.querySelector("[role=dialog]"))el.querySelector("[role=dialog]").focus();
          if(el.id==="modalBackdrop"&&!hasSheetHistory){
            hasSheetHistory=true;
            try{history.pushState({apexMobileSheet:true},"",location.href);}catch(_){hasSheetHistory=false;}
          }
        }else if(!topLayer()&&restoredFocus?.focus){restoredFocus.focus();}
      }
    });
    layers.forEach(el=>observer.observe(el,{attributes:true,attributeFilter:["hidden"]}));
    window.addEventListener("popstate",()=>{
      if(hasSheetHistory){
        hasSheetHistory=false;historyClosing=true;
        const modal=$("#modalBackdrop");
        if(modal&&!modal.hidden){const close=modal.querySelector(".modal-close");if(close)close.click();}
        historyClosing=false;
      }
    });
    document.addEventListener("click",e=>{
      if(!mq.matches)return;
      const layer=topLayer();
      if(layer?.id==="modalBackdrop"&&hasSheetHistory&&(e.target===layer||e.target.closest(".modal-close"))){
        e.preventDefault();e.stopPropagation();history.back();
      }
    },true);
    document.addEventListener("keydown",e=>{
      if(!mq.matches)return;
      if(e.key==="Escape"&&!more.hidden){more.hidden=true;return;}
      if(e.key==="Escape"&&!picker.hidden){picker.hidden=true;return;}
      if(e.key!=="Tab")return;
      const layer=topLayer();if(!layer)return;
      const dialog=layer.querySelector("[role=dialog]")||layer;
      const allFocus=[...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter(el=>el.getClientRects().length>0);
      if(!allFocus.length)return;
      const first=allFocus[0],last=allFocus[allFocus.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    },true);
    for(const el of layers){
      let y=0,x=0,touch=false;
      el.addEventListener("touchstart",e=>{
        const target=e.target,dialog=el.querySelector("[role=dialog]")||el;
        if(!el.hidden&&target&&target.closest(".modal-head,.sheet-head,.apex-mob-handle,.apex-mob-sheet-head")&&e.touches.length===1){
          y=e.touches[0].clientY;x=e.touches[0].clientX;touch=true;
        }
      },{passive:true});
      el.addEventListener("touchend",e=>{
        if(!touch||!e.changedTouches.length)return;
        const dy=e.changedTouches[0].clientY-y,dx=e.changedTouches[0].clientX-x;
        if(dy>85&&Math.abs(dx)<65)closeLayer(el);
        touch=false;
      },{passive:true});
    }
    window.APEX_MOBILE={
      active:()=>mq.matches,
      state:()=>({tab:activeTab(),filter:{...filter},shown:pageSize,teamStep:stage}),
      filter:(k,v)=>{filter[k]=v;pageSize=25;renderBoard();},
      chooseTeamStage:setStage,
      closeTop:()=>closeLayer(topLayer()),
      openProspect
    };
  }
  if(mq.matches)init();
  if(mq.addEventListener)mq.addEventListener("change",e=>{if(e.matches)init();});
})();
