/* APEX 2027 Draft Intelligence: canonical routing and explainable legacy links.
 * No changes to player inputs, scores, predictions, or watchlist storage. */
(function(){
  "use strict";
  const routes=new Set(["board","dna","team","lab","how","validation"]);
  const container=document.querySelector("main");
  if(!container)return;
  const notice=document.createElement("div");
  notice.id="apexRouteNotice";
  notice.className="apex-route-notice";
  notice.hidden=true;
  notice.setAttribute("role","status");
  notice.innerHTML='<div><strong>Historical class boards are for validation, not live prospect rankings.</strong>'+
    '<span>The 2027 Board is the active draft class. Visit <a href="#how">How APEX Works</a> for the methodology.</span></div>'+
    '<button type="button" id="apexDismissRoute" aria-label="Dismiss notice">×</button>';
  container.insertBefore(notice,container.firstChild);
  document.getElementById("apexDismissRoute").addEventListener("click",()=>{notice.hidden=true;});
  function canonicalize(){
    const route=decodeURIComponent((location.hash||"#board").slice(1)).trim();
    if(routes.has(route)||(!route && !location.hash))return false;
    const wasLegacy=/^board\/(?:19|20)\d{2}(?:\/|$)/.test(route);
    notice.querySelector("strong").textContent=wasLegacy?
      "Historical draft boards are validation-only.":
      "That APEX link no longer points to an active page.";
    notice.querySelector("span").textContent=wasLegacy?
      "You're viewing the 2027 Board. Historical classes remain available for research in Model Lab.":
      "You're viewing the active 2027 Board instead.";
    const link=document.createElement("a");
    link.href="#how";link.textContent=" How APEX Works →";
    notice.querySelector("span").appendChild(link);
    notice.hidden=false;
    // replaceState canonicalizes the URL without adding a broken route to Back history.
    try{history.replaceState(history.state,"",location.pathname+location.search+"#board");}
    catch(_){location.hash="#board";}
    const board=document.querySelector('.tab[data-tab="board"]');
    if(board&&!board.classList.contains("is-active"))board.click();
    return true;
  }
  canonicalize();
  window.addEventListener("hashchange",canonicalize);
  window.APEX_UX={canonicalize,routeNotice:()=>!notice.hidden};
})();
