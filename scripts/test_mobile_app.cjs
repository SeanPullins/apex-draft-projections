const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");

(async()=>{
  const root=path.resolve(__dirname,"..");
  const dom=new JSDOM(fs.readFileSync(path.join(root,"index.html"),"utf8"),{
    url:"https://example.test/#board",runScripts:"outside-only",pretendToBeVisual:true
  });
  const w=dom.window,d=w.document,errors=[];
  w.addEventListener("error",e=>errors.push(e.error||e.message));
  Object.defineProperty(w,"innerWidth",{value:390,configurable:true});
  w.matchMedia=q=>({matches:q.includes("max-width:480px"),addEventListener(){}});
  w.scrollTo=()=>{};
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  try{
    const sourceHash=fs.readFileSync(path.join(root,"data2027.js"),"utf8");
    for(const node of d.querySelectorAll("script[src]"))
      w.eval(fs.readFileSync(path.join(root,node.getAttribute("src").split("?")[0]),"utf8"));
    assert(w.APEX_MOBILE,"Mobile app must boot at a 390px viewport");
    assert.equal(d.querySelectorAll(".apex-mob-bottomnav button").length,5);
    assert.equal(d.querySelectorAll(".tabs .tab").length,6,"Desktop tabs kept as routing source");
    assert.equal(d.querySelector("#apexMobHeader .apex-mob-wordmark").textContent.replace(/\s/g,""),"APEX2027");
    assert.equal(w.APEX_MOBILE.state().tab,"board");
    assert.equal(d.querySelectorAll("#apexMobBoard .apex-mob-card").length,25);
    assert.equal(d.querySelector("#apexMobBoard .apex-mob-count").textContent,"201 prospects · 25 shown");
    assert.equal(d.querySelectorAll("#boardBody tr").length,0,
      "On the phone, the redundant hidden 201-row table must be removed after cards mount");

    const first=d.querySelector("#apexMobBoard .apex-mob-card");
    assert.equal(first.dataset.rank,"1");
    assert(first.textContent.includes("Jeremiah Smith"));
    assert(first.textContent.includes("APEX"));
    assert(first.querySelector(".apex-mob-stat"));
    assert(first.querySelector(".apex-mob-why"));
    assert(d.querySelector("#apexMobBoard .apex-mob-showmore"));
    d.querySelector("#apexMobBoard .apex-mob-showmore").click();
    assert.equal(d.querySelectorAll("#apexMobBoard .apex-mob-card").length,50);

    const red=d.querySelector('[data-mob-filter="red"]');
    red.click();
    assert.equal(d.querySelectorAll("#apexMobBoard .apex-mob-card").length,13);
    assert.equal(red.getAttribute("aria-pressed"),"true");
    assert([...d.querySelectorAll("#apexMobBoard .apex-mob-card")]
      .every(card=>card.querySelector(".apex-mob-confidence").textContent==="RED"));
    d.querySelector('[data-mob-filter="topology"]').click();
    assert.equal(d.querySelector("#apexMobBoard .apex-mob-count").textContent,"104 prospects · 25 shown");
    d.querySelector('[data-mob-filter="all"]').click();
    const pos=d.querySelector("#apexMobPosition");pos.value="QB";pos.dispatchEvent(new w.Event("change",{bubbles:true}));
    assert.equal(d.querySelectorAll("#apexMobBoard .apex-mob-card").length,17);
    pos.value="ALL";pos.dispatchEvent(new w.Event("change",{bubbles:true}));
    assert(d.querySelector("#apexMobBoard .apex-mob-card[data-rank='2'] .apex-mob-confidence").textContent.includes("Not rated"));

    const why=d.querySelector("#apexMobBoard .apex-mob-card .apex-mob-why summary");
    why.click();
    assert.equal(d.querySelector("#modalBackdrop").hidden,true,
      "Expanding the Why area must not accidentally open a modal");
    const mario=d.querySelector("#apexMobBoard .apex-mob-card[data-rank='1']");
    mario.querySelector(".apex-mob-card-head").click();
    assert.equal(d.querySelector("#modalBackdrop").hidden,false,"Card opens the existing evidence dossier");
    assert(d.querySelector("#modal").textContent.includes("Jeremiah Smith"));
    await new Promise(resolve=>w.setTimeout(resolve,0)); // Wait for modal MutationObserver to push state.
    assert.equal(w.history.state.apexMobileSheet,true,"Mobile profile gets a history entry for Back");
    w.history.back();
    await new Promise(resolve=>w.setTimeout(resolve,35));
    assert.equal(d.querySelector("#modalBackdrop").hidden,true,"Back should close the sheet");
    assert.equal(w.APEX2027.players[0].n,"Jeremiah Smith");

    // Saved dismissal survives re-render without mutating prospect records.
    const how=d.querySelector("#apexMobHowto");
    assert.equal(how.hidden,false);
    how.querySelector("button").click();
    assert.equal(how.hidden,true);
    assert.equal(w.localStorage.getItem("apex-mobile-howto-dismissed"),"1");

    // Search starts from header and filters without changing model scores.
    d.querySelector("#apexMobSearchToggle").click();
    assert.equal(d.querySelector("#apexMobSearchPanel").hidden,false);
    const search=d.querySelector("#apexMobSearch");
    search.value="Arch Manning";search.dispatchEvent(new w.Event("input",{bubbles:true}));
    assert.equal(d.querySelectorAll("#apexMobBoard .apex-mob-card").length,1);
    assert(d.querySelector("#apexMobBoard").textContent.includes("Arch Manning"));
    d.querySelector("#apexMobClearSearch").click();
    assert.equal(d.querySelectorAll("#apexMobBoard .apex-mob-card").length,25);
    d.querySelector("#apexMobSearchToggle").click();

    // Navigation keeps the original top six routes as the single source of truth.
    d.querySelector('[data-mob-route="team"]').click();
    assert.equal(d.querySelector(".tab-panel.is-active").id,"tab-team");
    assert.equal(d.querySelector("#apexMobTeamWizard").querySelectorAll("[data-team-stage]").length,4);
    assert.equal(d.querySelector("#tab-team").dataset.mobileStage,"0");
    d.querySelector("#apexMobTeamNext").click();
    assert.equal(d.querySelector("#tab-team").dataset.mobileStage,"1");
    d.querySelector("#apexMobTeamNext").click();
    assert.equal(d.querySelector("#tab-team").dataset.mobileStage,"2");
    const risk=d.querySelector('#apexMobTeamSegments [data-for="teamRisk"] [data-value="aggressive"]');
    risk.click();
    assert.equal(d.querySelector("#teamRisk").value,"aggressive");
    d.querySelector("#apexMobTeamNext").click();
    assert.equal(d.querySelector("#tab-team").dataset.mobileStage,"3");
    assert.equal(d.querySelectorAll("#teamBoardBody tr").length,24);
    d.querySelector("#apexMobTeamEdit").click();
    assert.equal(d.querySelector("#tab-team").dataset.mobileStage,"0");

    d.querySelector('[data-mob-route="more"]').click();
    assert.equal(d.querySelector("#apexMobMore").hidden,false);
    d.querySelector('#apexMobMore [data-route="validation"]').click();
    assert.equal(d.querySelector(".tab-panel.is-active").id,"tab-validation");
    assert.equal(d.querySelector("#apexMobMore").hidden,true);
    assert.equal(d.querySelector('[data-mob-route="more"]').getAttribute("aria-current"),"page");
    d.querySelector('[data-mob-route="more"]').click();
    d.querySelector("#apexMobTheme").click();
    assert.equal(d.querySelector("#apexMobMore").hidden,true);
    assert(d.documentElement.dataset.theme==="dark"||d.documentElement.dataset.theme==="light");

    d.querySelector('[data-mob-route="lab"]').click();
    assert.equal(d.querySelector("#tab-lab").classList.contains("is-active"),true);
    assert.equal(d.querySelector("#advisorCompareHost").contains(d.querySelector("#sharedCompare")),true);
    assert.equal(d.querySelectorAll(".apex-mob-stories [data-focus]").length,5);
    d.querySelector('.apex-mob-stories [data-focus="top"]').click();
    assert.equal(d.querySelector("#labFocus").value,"top");
    const cmp=d.querySelector("#compareA");
    cmp.dispatchEvent(new w.Event("pointerdown",{bubbles:true,cancelable:true}));
    assert.equal(d.querySelector("#apexMobPicker").hidden,false);
    const pickerInput=d.querySelector("#apexMobPickerQuery");
    pickerInput.value="Arch Manning";pickerInput.dispatchEvent(new w.Event("input",{bubbles:true}));
    assert.equal(d.querySelectorAll("#apexMobPickerOptions button").length,1);
    d.querySelector("#apexMobPickerOptions button").click();
    assert.equal(d.querySelector("#compareA").value,"5");
    assert.equal(d.querySelector("#apexMobPicker").hidden,true);
    d.querySelector("#compareB").value="7";
    d.querySelector("#compareB").dispatchEvent(new w.Event("change",{bubbles:true}));
    d.querySelector("#compareButton").click();
    assert.equal(d.querySelector("#compareBackdrop").hidden,false);
    assert(d.querySelector("#compareModal").textContent.includes("No synthetic winner."));
    d.querySelector("#compareModal .compare-close").click();
    assert.equal(d.querySelector("#compareBackdrop").hidden,true);

    // Important evidence disclosures and the original data inputs are still untouched.
    assert(d.querySelector("#tab-validation").textContent.includes("not demonstrated superiority"));
    assert.equal(sourceHash,fs.readFileSync(path.join(root,"data2027.js"),"utf8"));
    assert.equal(d.querySelectorAll("#boardBody tr").length,0);
    assert.equal(errors.length,0,errors.map(String).join("\n"));

    const css=fs.readFileSync(path.join(root,"mobile-app.css"),"utf8");
    assert(css.includes("env(safe-area-inset-bottom"));
    assert(css.includes("@media(max-width:480px)"));
    assert(css.includes("prefers-reduced-motion"));
    assert(css.includes("font-size:16px"));
    assert(css.includes("min-height:44px"));
    assert(css.includes("max-height:85dvh"));
    console.log("PASS: mobile nav, 25-card paging, RED/context, filtered search, player history, team steps, picker and safe source data");
  }finally{
    dom.window.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1});
