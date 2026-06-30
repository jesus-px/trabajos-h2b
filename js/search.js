let allJobs=[], filteredJobs=[], currentPage=1;
const perPage=10;

const state={
  q:"",
  category:"",
  estado:"",
  salary:0,
  activeOnly:true,
  sort:"recent",
  recentOnly:false,
  uid:""
};

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
  document.getElementById("searchInput").addEventListener("input",e=>{
    state.q=e.target.value.toLowerCase();
    currentPage=1;
    applyFilters();
  });

  document.getElementById("stateFilter").addEventListener("change",e=>{
    state.estado=e.target.value;
    currentPage=1;
    applyFilters();
  });

  document.getElementById("salaryFilter").addEventListener("input",e=>{
    state.salary=Number(e.target.value);
    document.getElementById("salaryLabel").textContent=`$${state.salary}/hr`;
    currentPage=1;
    applyFilters();
  });

  document.getElementById("activeOnly").addEventListener("change",e=>{
    state.activeOnly=e.target.checked;
    currentPage=1;
    applyFilters();
  });

  document.getElementById("sortFilter").addEventListener("change",e=>{
    state.sort=e.target.value;
    applyFilters();
  });

  document.getElementById("clearFilters").addEventListener("click",clearFilters);
  document.getElementById("clearFiltersTop").addEventListener("click",clearFilters);

  document.getElementById("prevPage").addEventListener("click",()=>{
    if(currentPage>1){
      currentPage--;
      render();
    }
  });

  document.getElementById("nextPage").addEventListener("click",()=>{
    const total=Math.ceil(filteredJobs.length/perPage)||1;
    if(currentPage<total){
      currentPage++;
      render();
    }
  });

  document.getElementById("jobList").addEventListener("click",e=>{
    const btn=e.target.closest(".details-btn");
    if(!btn)return;

    const card=btn.closest(".job-card");
    const details=card?.querySelector(".job-details");

    if(!details)return;

    const isOpen=card.classList.toggle("details-open");
    details.hidden=!isOpen;
    btn.textContent=isOpen?"Ocultar detalles":"Ver detalles";
    btn.setAttribute("aria-expanded",String(isOpen));
  });

  const mobileBtn=document.getElementById("mobileFilterBtn");
  const panel=document.getElementById("filtersPanel");
  const overlay=document.getElementById("overlay");

  mobileBtn.addEventListener("click",()=>{
    panel.classList.add("open");
    overlay.classList.add("show");
  });

  overlay.addEventListener("click",()=>{
    panel.classList.remove("open");
    overlay.classList.remove("show");
  });
}

function applyQueryParams(){
  const params = new URLSearchParams(location.search);

  const cat = params.get("categoria");
  if(cat) state.category = cat;

  const recientes = params.get("recientes");
  if(recientes === "true"){
    state.recentOnly = true;
  }

  const uid = params.get("uid");
  if(uid){
    state.uid = uid;
  }
}

function initFilters(){
  const activeJobs=allJobs.filter(j=>j.activa);
  const catCounts={};
  const stateSet=new Map();

  activeJobs.forEach(j=>{
    catCounts[j.categoria]=(catCounts[j.categoria]||0)+1;
    if(j.estado)stateSet.set(j.estado,j.estadoCompleto||j.estado);
  });

  const cats=Object.entries(catCounts).sort((a,b)=>{
    if(a[0]==="otros")return 1;
    if(b[0]==="otros")return -1;
    return b[1]-a[1];
  });

  document.getElementById("categoryFilters").innerHTML =
    `<label class="check-item">
      <input type="radio" name="cat" value="" checked>
      <span>Todas las categorías</span>
      <span class="count">${activeJobs.length}</span>
    </label>` +
    cats.map(([cat,count])=>{
      const info=getCategoryInfo(cat);
      return `
        <label class="check-item">
          <input type="radio" name="cat" value="${cat}">
          <span>${info.icon} ${info.name}</span>
          <span class="count">${count}</span>
        </label>`;
    }).join("");

  document.querySelectorAll("input[name=cat]").forEach(input=>
    input.addEventListener("change",e=>{
      state.category=e.target.value;
      currentPage=1;
      applyFilters();
    })
  );

  const stateFilter=document.getElementById("stateFilter");

  [...stateSet.entries()]
    .sort((a,b)=>a[1].localeCompare(b[1]))
    .forEach(([code,name])=>{
      const opt=document.createElement("option");
      opt.value=code;
      opt.textContent=`${name} (${code})`;
      stateFilter.appendChild(opt);
    });
}

function applyFilters(){
  filteredJobs=allJobs.filter(job=>{
    if(state.activeOnly && !job.activa)return false;
    if(state.category && job.categoria!==state.category)return false;
    if(state.estado && job.estado!==state.estado)return false;

    if(state.recentOnly){
      const dias=daysSince(job.ultimaActualizacion);
      if(dias===null || dias>3)
        return false;
    }

    if(state.uid && job.uid !== state.uid)
      return false;

    if(job.salarioDesde < state.salary)return false;

    const text=[
      job.empresa,
      job.posicion,
      job.ciudad,
      job.estado,
      job.estadoCompleto,
      job.categoria,
      job.keywords
    ].join(" ").toLowerCase();

    if(state.q && !text.includes(state.q))return false;

    return true;
  });

  sortJobs();
  render();
}

function sortJobs(){
  filteredJobs.sort((a,b)=>{
    if(state.sort==="salary_desc")return b.salarioDesde-a.salarioDesde;
    if(state.sort==="salary_asc")return a.salarioDesde-b.salarioDesde;
    if(state.sort==="start_asc")return parseDate(a.fechaInicio)-parseDate(b.fechaInicio);
    return parseDate(b.ultimaActualizacion)-parseDate(a.ultimaActualizacion);
  });
}

function render(){
  document.getElementById("resultCount").textContent=filteredJobs.length;

  const totalPages=Math.ceil(filteredJobs.length/perPage)||1;
  currentPage=Math.min(currentPage,totalPages);

  const pageJobs=filteredJobs.slice(
    (currentPage-1)*perPage,
    (currentPage-1)*perPage+perPage
  );

  document.getElementById("jobList").innerHTML =
    pageJobs.length
      ? pageJobs.map(jobCard).join("")
      : `<div class="empty">No se encontraron vacantes con esos filtros.</div>`;

  document.getElementById("pageInfo").textContent=`Página ${currentPage} de ${totalPages}`;
  document.getElementById("prevPage").disabled=currentPage<=1;
  document.getElementById("nextPage").disabled=currentPage>=totalPages;
}

function jobCard(job){
  const cat=getCategoryInfo(job.categoria);
  const statusClass=job.activa?"active-pill":"active-pill inactive-pill";
  const applyUrl=cleanUrl(job.urlAplicacion||job.sitioWeb);
  const email=cleanEmail(job.email);
  const mailto=email ? buildMailto(email, job.posicion) : "";
  const detailsId=`details-${escapeAttr(job.uid||job.id||job.posicion)}`;
  const descripcion=job.descripcion || "Descripción no disponible.";

  return `
    <article class="job-card">
      <div class="job-main">
        <div class="job-icon">${cat.icon}</div>
        <div>
          <div class="job-title">${escapeHtml(job.posicion||"Sin título")}</div>
          <div class="company">${escapeHtml(job.empresa||"Empresa no indicada")}</div>
          <div class="location">📍 ${escapeHtml(job.ciudad||"Ciudad no indicada")}, ${escapeHtml(job.estadoCompleto||job.estado||"Estado no indicado")}</div>
          <span class="badge ${escapeAttr(job.categoria)}">${escapeHtml(cat.name)}</span>
        </div>
      </div>

      <div>
        <div class="money">💵 ${escapeHtml(formatSalary(job))}</div>
        <div class="date-row">📅 Inicio: ${escapeHtml(job.fechaInicio||"Sin fecha")}</div>
        <div class="date-row">📅 Fin: ${escapeHtml(job.fechaFin||"Sin fecha")}</div>
      </div>

      <div>
        <span class="${statusClass}">${job.activa?"Activa":"Inactiva"}</span>
        <div class="contact-row">📞 ${escapeHtml(job.telefono||"No disponible")}</div>
        <div class="contact-row">✉️ ${escapeHtml(email||"No disponible")}</div>
        <button class="details-btn" type="button" aria-expanded="false" aria-controls="${detailsId}">Ver detalles</button>
      </div>

      <div class="job-details" id="${detailsId}" hidden>
        <div class="details-grid">
          <div class="details-section details-description">
            <h3>Detalles de la vacante</h3>
            <p>${escapeHtml(descripcion)}</p>
          </div>

          <div class="details-section">
            <h3>Información</h3>
            <p><strong>Empresa:</strong> ${escapeHtml(job.empresa||"No indicada")}</p>
            <p><strong>Posición:</strong> ${escapeHtml(job.posicion||"No indicada")}</p>
            <p><strong>Categoría:</strong> ${escapeHtml(cat.name)}</p>
            <p><strong>Fuente:</strong> ${escapeHtml(job.fuente||"No indicada")}</p>
          </div>

          <div class="details-section">
            <h3>Aplicación</h3>
            <p><strong>Correo:</strong> ${escapeHtml(email||"No disponible")}</p>
            <p><strong>Web:</strong> ${applyUrl?"Disponible":"No disponible"}</p>
            <p><strong>Actualización:</strong> ${escapeHtml(job.ultimaActualizacion||"No indicada")}</p>
          </div>
        </div>

        <div class="apply-actions">
          ${applyUrl?`<a class="apply-btn apply-web" href="${escapeAttr(applyUrl)}" target="_blank" rel="noopener">Aplicar web</a>`:`<span class="apply-btn disabled">Aplicar web no disponible</span>`}
          ${mailto?`<a class="apply-btn apply-email" href="${escapeAttr(mailto)}">Aplicar por correo</a>`:`<span class="apply-btn disabled">Aplicar por correo no disponible</span>`}
        </div>
      </div>
    </article>`;
}

function cleanUrl(url){
  const value=String(url||"").trim();
  if(!value || value.toUpperCase()==="N/A")return "";
  return value.startsWith("http")?value:"https://"+value;
}

function cleanEmail(email){
  const value=String(email||"").trim();
  if(!value || value.toUpperCase()==="N/A" || !value.includes("@"))return "";
  return value;
}

function buildMailto(email, position){
  const subject=encodeURIComponent(`Application for ${position||"Job Position"}`);
  return `mailto:${email}?subject=${subject}`;
}

function clearFilters(){
  state.q="";
  state.category="";
  state.estado="";
  state.salary=0;
  state.activeOnly=true;
  state.sort="recent";
  state.recentOnly=false;
  state.uid="";
  currentPage=1;

  document.getElementById("searchInput").value="";
  document.getElementById("stateFilter").value="";
  document.getElementById("salaryFilter").value=0;
  document.getElementById("salaryLabel").textContent="$0/hr";
  document.getElementById("activeOnly").checked=true;
  document.getElementById("sortFilter").value="recent";

  const allCat=document.querySelector("input[name=cat][value='']");
  if(allCat) allCat.checked=true;

  applyFilters();
}

function escapeHtml(text){
  return String(text||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function escapeAttr(text){
  return escapeHtml(text).replace(/\s+/g,"-");
}
