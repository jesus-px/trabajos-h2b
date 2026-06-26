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

function applyFilters(){
  filteredJobs=allJobs.filter(job=>{
    if(state.activeOnly && !job.activa)return false;
    if(state.category && job.categoria!==state.category)return false;
    if(state.estado && job.estado!==state.estado)return false;

    if(state.recentOnly){
      if(!job.ultimaActualizacion)return false;

      const d = new Date(job.ultimaActualizacion.replace(" ","T"));

      if(isNaN(d) || (Date.now()-d.getTime())/86400000 > 3)
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
