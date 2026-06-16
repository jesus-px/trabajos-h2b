let allJobs=[], filteredJobs=[], currentPage=1;
const perPage=10;
const state={q:"",category:"",estado:"",salary:0,activeOnly:true,sort:"recent"};

document.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  try{
    allJobs=await loadJobs();
    initFilters();
    applyQueryParams();
    applyFilters();
  }catch(e){
    console.error(e);
    document.getElementById("jobList").innerHTML = `<div class="empty">No se pudieron cargar las vacantes.</div>`;
  }
});

function bindUI(){
  document.getElementById("searchInput").addEventListener("input",e=>{state.q=e.target.value.toLowerCase();currentPage=1;applyFilters();});
  document.getElementById("stateFilter").addEventListener("change",e=>{state.estado=e.target.value;currentPage=1;applyFilters();});
  document.getElementById("salaryFilter").addEventListener("input",e=>{state.salary=Number(e.target.value);document.getElementById("salaryLabel").textContent=`$${state.salary}/hr`;currentPage=1;applyFilters();});
  document.getElementById("activeOnly").addEventListener("change",e=>{state.activeOnly=e.target.checked;currentPage=1;applyFilters();});
  document.getElementById("sortFilter").addEventListener("change",e=>{state.sort=e.target.value;applyFilters();});
  document.getElementById("clearFilters").addEventListener("click",clearFilters);
  document.getElementById("clearFiltersTop").addEventListener("click",clearFilters);
  document.getElementById("prevPage").addEventListener("click",()=>{if(currentPage>1){currentPage--;render();}});
  document.getElementById("nextPage").addEventListener("click",()=>{const total=Math.ceil(filteredJobs.length/perPage)||1;if(currentPage<total){currentPage++;render();}});
  const mobileBtn=document.getElementById("mobileFilterBtn"), panel=document.getElementById("filtersPanel"), overlay=document.getElementById("overlay");
  mobileBtn.addEventListener("click",()=>{panel.classList.add("open");overlay.classList.add("show");});
  overlay.addEventListener("click",()=>{panel.classList.remove("open");overlay.classList.remove("show");});
}

function applyQueryParams(){ const cat=new URLSearchParams(location.search).get("categoria"); if(cat) state.category=cat; }

function initFilters(){
  const activeJobs=allJobs.filter(j=>j.activa), catCounts={}, stateSet=new Map();
  activeJobs.forEach(j=>{catCounts[j.categoria]=(catCounts[j.categoria]||0)+1;if(j.estado)stateSet.set(j.estado,j.estadoCompleto||j.estado);});
  const cats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]);
  document.getElementById("categoryFilters").innerHTML = `<label class="check-item"><input type="radio" name="cat" value="" checked><span>Todas las categorías</span><span class="count">${activeJobs.length}</span></label>` + cats.map(([cat,count])=>{const info=getCategoryInfo(cat);return `<label class="check-item"><input type="radio" name="cat" value="${cat}"><span>${info.icon} ${info.name}</span><span class="count">${count}</span></label>`;}).join("");
  document.querySelectorAll("input[name=cat]").forEach(input=>input.addEventListener("change",e=>{state.category=e.target.value;currentPage=1;applyFilters();}));
  const stateFilter=document.getElementById("stateFilter");
  [...stateSet.entries()].sort((a,b)=>a[1].localeCompare(b[1])).forEach(([code,name])=>{const opt=document.createElement("option");opt.value=code;opt.textContent=`${name} (${code})`;stateFilter.appendChild(opt);});
}

function applyFilters(){
  filteredJobs=allJobs.filter(job=>{
    if(state.activeOnly && !job.activa)return false;
    if(state.category && job.categoria!==state.category)return false;
    if(state.estado && job.estado!==state.estado)return false;
    if(job.salarioDesde < state.salary)return false;
    const text=[job.empresa,job.posicion,job.ciudad,job.estado,job.estadoCompleto,job.categoria,job.keywords].join(" ").toLowerCase();
    if(state.q && !text.includes(state.q))return false;
    return true;
  });
  sortJobs(); render();
}

function sortJobs(){
  filteredJobs.sort((a,b)=>{
    if(state.sort==="salary_desc")return b.salarioDesde-a.salarioDesde;
    if(state.sort==="salary_asc")return a.salarioDesde-b.salarioDesde;
    if(state.sort==="start_asc")return parseDate(a.fechaInicio)-parseDate(b.fechaInicio);
    return parseDate(b.ultimaActualizacion)-parseDate(a.ultimaActualizacion);
  });
}

function parseDate(value){ if(!value)return 0; const d=new Date(String(value).replace(" ","T")); return isNaN(d)?0:d.getTime(); }

function render(){
  document.getElementById("resultCount").textContent=filteredJobs.length;
  const totalPages=Math.ceil(filteredJobs.length/perPage)||1;
  currentPage=Math.min(currentPage,totalPages);
  const pageJobs=filteredJobs.slice((currentPage-1)*perPage,(currentPage-1)*perPage+perPage);
  document.getElementById("jobList").innerHTML = pageJobs.length ? pageJobs.map(jobCard).join("") : `<div class="empty">No se encontraron vacantes con esos filtros.</div>`;
  document.getElementById("pageInfo").textContent=`Página ${currentPage} de ${totalPages}`;
  document.getElementById("prevPage").disabled=currentPage<=1;
  document.getElementById("nextPage").disabled=currentPage>=totalPages;
}

function jobCard(job){
  const cat=getCategoryInfo(job.categoria);
  const statusClass=job.activa?"active-pill":"active-pill inactive-pill";
  const applyUrl=cleanUrl(job.urlAplicacion||job.sitioWeb);
  return `<article class="job-card"><div class="job-main"><div class="job-icon">${cat.icon}</div><div><div class="job-title">${escapeHtml(job.posicion||"Sin título")}</div><div class="company">${escapeHtml(job.empresa||"Empresa no indicada")}</div><div class="location">📍 ${escapeHtml(job.ciudad)}, ${escapeHtml(job.estadoCompleto||job.estado)} (${escapeHtml(job.estado)})</div><span class="badge ${job.categoria}">${cat.name}</span></div></div><div><div class="money">💵 ${formatSalary(job)}</div><div class="date-row">📅 ${escapeHtml(job.fechaInicio||"Sin fecha")}</div><div class="date-row">📅 ${escapeHtml(job.fechaFin||"Sin fecha")}</div></div><div><span class="${statusClass}">${job.activa?"Activa":"Inactiva"}</span><div class="contact-row">📞 ${escapeHtml(job.telefono||"No disponible")}</div><div class="contact-row">✉️ ${escapeHtml(job.email||"No disponible")}</div>${applyUrl?`<a class="details-btn" target="_blank" href="${applyUrl}">Aplicar / Ver detalles</a>`:`<span class="details-btn">Sin enlace</span>`}</div></article>`;
}

function cleanUrl(url){ if(!url || url==="N/A")return ""; return url.startsWith("http")?url:"https://"+url; }

function clearFilters(){
  state.q="";state.category="";state.estado="";state.salary=0;state.activeOnly=true;state.sort="recent";currentPage=1;
  document.getElementById("searchInput").value="";
  document.getElementById("stateFilter").value="";
  document.getElementById("salaryFilter").value=0;
  document.getElementById("salaryLabel").textContent="$0/hr";
  document.getElementById("activeOnly").checked=true;
  document.getElementById("sortFilter").value="recent";
  document.querySelector("input[name=cat][value='']").checked=true;
  applyFilters();
}
function escapeHtml(text){return String(text||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
