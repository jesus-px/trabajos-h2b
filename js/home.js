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
  }catch(e){
    console.error(e);
    document.getElementById("categoryGrid").innerHTML = "<p>No se pudieron cargar las estadísticas.</p>";
  }
});
