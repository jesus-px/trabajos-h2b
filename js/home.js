document.addEventListener("DOMContentLoaded", async () => {
  try{
    const jobs = await loadJobs();
    const active = jobs.filter(j => j.activa);
    document.getElementById("statActivas").textContent = active.length;
    document.getElementById("statEmpresas").textContent = new Set(active.map(j=>j.empresa).filter(Boolean)).size;
    document.getElementById("statEstados").textContent = new Set(active.map(j=>j.estado).filter(Boolean)).size;

    const recent = jobs.filter(j => {
      if(!j.ultimaActualizacion) return false;
      const d = new Date(j.ultimaActualizacion.replace(" ","T"));
      return !isNaN(d) && (Date.now() - d.getTime()) / 86400000 <= 7;
    });
    document.getElementById("statRecientes").textContent = recent.length || active.length;

    const counts = {};
    active.forEach(j => counts[j.categoria] = (counts[j.categoria] || 0) + 1);
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);

    document.getElementById("categoryGrid").innerHTML = top.map(([cat,count]) => {
      const info = getCategoryInfo(cat);
      return `<a class="category-card" href="buscar.html?categoria=${encodeURIComponent(cat)}"><span class="category-icon">${info.icon}</span><div><strong>${info.name}</strong><span>${count} trabajos</span></div></a>`;
    }).join("");

    const recentJobs = jobs
  .filter(job => {
    if (!job.ultimaActualizacion) return false;

    const d = new Date(job.ultimaActualizacion.replace(" ", "T"));

    return !isNaN(d) &&
      (Date.now() - d.getTime()) / 86400000 <= 3;
  })
  .slice(0, 10);

document.getElementById("recentJobs").innerHTML = recentJobs.length
  ? recentJobs.map(job => {
      const cat = getCategoryInfo(job.categoria);

      return `
        <article class="recent-card">
          <span class="recent-badge">Nuevo</span>

          <div class="recent-icon">${cat.icon}</div>

          <div class="recent-title">
            ${job.posicion || "Sin título"}
          </div>

          <div class="recent-company">
            ${job.empresa || "Empresa no indicada"}
          </div>

          <div class="recent-info">
            📍 ${job.ciudad || "Ciudad no indicada"}, ${job.estado || ""}
          </div>

          <div class="recent-salary">
            ${formatSalary(job)}
          </div>

          <div class="recent-info">
            📅 Inicio: ${job.fechaInicio || "No indicada"}
          </div>

          <a class="recent-btn" href="buscar.html?uid=${encodeURIComponent(job.uid)}">
            Ver detalles
          </a>
        </article>
      `;
    }).join("")
  : `<div class="recent-empty">No hay vacantes nuevas en los últimos 3 días.</div>`;
    
  }catch(e){
    console.error(e);
    document.getElementById("categoryGrid").innerHTML = "<p>No se pudieron cargar las estadísticas.</p>";
  }

});
