const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9Fnx0TZ_xO5Spt__ysZBmxb3HUIJSaC-pLm0ZbaevdkyESsnlVOUYNwSkzO4Rj4vyIYNVawFfk0ZN/pub?gid=1165441440&single=true&output=csv";

const CATEGORY_LABELS = {
  cocina:{name:"Cocina",icon:"🍳"}, limpieza:{name:"Limpieza",icon:"🧹"},
  paisajismo:{name:"Paisajismo",icon:"🌿"}, pesca:{name:"Pesca",icon:"🐟"},
  agro:{name:"Agricultura",icon:"🚜"}, entretenimiento:{name:"Entretenimiento",icon:"🎠"},
  hospitalidad:{name:"Hospitalidad",icon:"🏨"}, equinos:{name:"Equinos",icon:"🐴"},
  construccion:{name:"Construcción",icon:"🧱"}, mantenimiento:{name:"Mantenimiento",icon:"🔧"},
  otros:{name:"Otros",icon:"•••"}
};

function parseCSV(text){
  const rows=[]; let row=[], cur="", inQuotes=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch === '"' && inQuotes && next === '"'){ cur+='"'; i++; }
    else if(ch === '"'){ inQuotes=!inQuotes; }
    else if(ch === "," && !inQuotes){ row.push(cur); cur=""; }
    else if((ch === "\n" || ch === "\r") && !inQuotes){
      if(cur || row.length){ row.push(cur); rows.push(row); row=[]; cur=""; }
      if(ch === "\r" && next === "\n") i++;
    } else cur += ch;
  }
  if(cur || row.length){ row.push(cur); rows.push(row); }
  const headers=rows.shift().map(h=>h.trim());
  return rows.map(r=>{ const obj={}; headers.forEach((h,i)=>obj[h]=(r[i]||"").trim()); return obj; }).filter(r=>r["ID"]||r["UID"]);
}

function salaryNumber(value){ return parseFloat(String(value||"").replace(/[^0-9.]/g,"")) || 0; }

function normalizeCategory(value){
  const cat=String(value||"").trim().toLowerCase();
  return CATEGORY_LABELS[cat] ? cat : "otros";
}

function normalizeJob(j){
  return {
    uid:j["UID"]||"", id:j["ID"]||"", empresa:j["Empresa"]||"", ciudad:j["Ciudad"]||"",
    estado:j["Estado"]||"", estadoCompleto:j["EstadoCompleto"]||"", posicion:j["Posición"]||"",
    categoria:normalizeCategory(j["Categoria"]), salarioDesdeTexto:j["Salario Desde"]||"",
    salarioHastaTexto:j["Salario Hasta"]||"", salarioDesde:salaryNumber(j["Salario Desde"]),
    salarioHasta:salaryNumber(j["Salario Hasta"]), fechaInicio:j["Fecha Inicio"]||"", fechaFin:j["Fecha Fin"]||"",
    activa:String(j["Activa"]).toUpperCase()==="TRUE", telefono:j["Teléfono"]||"", email:j["Email"]||"",
    sitioWeb:j["Sitio Web"]||"", urlAplicacion:j["URL Aplicación"]||"", keywords:j["Keywords"]||"",
    descripcion:j["Descripción ES"]||j["Descripción"]||"", ultimaActualizacion:j["Última Actualización"]||"", fuente:j["Fuente"]||""
  };
}

async function loadJobs(){
  const res = await fetch(CSV_URL + "&t=" + Date.now());
  const text = await res.text();
  return parseCSV(text).map(normalizeJob);
}
function getCategoryInfo(cat){ return CATEGORY_LABELS[cat] || CATEGORY_LABELS.otros; }
function formatSalary(job){
  if(job.salarioDesdeTexto && job.salarioHastaTexto) return `${job.salarioDesdeTexto} - ${job.salarioHastaTexto}`;
  return job.salarioDesdeTexto || job.salarioHastaTexto || "No indicado";
}

// Parseo de fechas robusto: soporta DD/MM/YYYY, DD-MM-YYYY e ISO (YYYY-MM-DD), con hora opcional.
// Devuelve timestamp en ms, o 0 si la fecha es invalida/vacia.
function parseDate(value){
  if(!value)return 0;
  const raw=String(value).trim();

  const dmy=raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(dmy){
    const [,d,m,y,h="0",min="0",s="0"]=dmy;
    const date=new Date(Number(y),Number(m)-1,Number(d),Number(h),Number(min),Number(s));
    return isNaN(date)?0:date.getTime();
  }

  const d=new Date(raw.replace(" ","T"));
  return isNaN(d)?0:d.getTime();
}

// Dias transcurridos desde una fecha hasta ahora. Devuelve null si la fecha es invalida.
function daysSince(value){
  const t=parseDate(value);
  if(!t)return null;
  return (Date.now()-t)/86400000;
}
