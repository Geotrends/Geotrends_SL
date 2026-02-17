import * as echarts from "https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.esm.min.js";
// 🔄 Helper para reiniciar el gráfico de un contenedor dado
function reiniciarGrafico(contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;
  const chartExistente = echarts.getInstanceByDom(contenedor);
  if (chartExistente) {
    chartExistente.dispose();
  }
}
let fuenteIdSeleccionado = null; // 🛡️ Variable global para controlar selección
import { crearGraficoLineas } from "./utils/charts.js";
import { crearGraficoBarras, crearGraficoScatter } from "./utils/charts.js";
import { crearWordCloud } from "./utils/wordClouds.js";


// 🔥 Helper to normalize names consistently
function normalizarNombrePerfil(p) {
  return (p.full_name || p.fullname || p.username || "").trim();
}

// Map seed profile names to English for charts (axis and legend)
const NOMBRES_PERFIL_INGLES = {
  "idiomas eafit": "EAFIT Languages",
  "arquitectura usb medellín": "USB Architecture Medellín",
  "orquesta sinfónica eafit": "EAFIT Symphony Orchestra",
  "urbam eafit": "urbam EAFIT",
  "nodo": "Node",
  "nodo eafit": "EAFIT Node",
  "ranchera oficial": "Ranchera Official",
  "ranchera": "Ranchera",
};
function nombrePerfilEnIngles(nombre) {
  if (!nombre || typeof nombre !== "string") return nombre;
  const key = nombre.trim().toLowerCase();
  return NOMBRES_PERFIL_INGLES[key] || NOMBRES_PERFIL_INGLES[key.replace(/\s+/g, " ")] || nombre;
}

console.log("✅ main.js cargado correctamente");

// Reusable function to render resumen-estadisticas as cards with animation
// Actualización de las tarjetas de resumen con los nuevos datos
export function renderizarResumenEstadisticas(data, contenedor) {
  if (!contenedor) return;

  const opcionesFecha = { day: "numeric", month: "long", year: "numeric" };

  const fechaInicioFormateada =
    data.fechaInicio && data.fechaInicio !== "Sin datos"
      ? new Date(data.fechaInicio).toLocaleDateString("en-US", opcionesFecha)
      : "No data";

  const fechaFinFormateada =
    data.fechaFin && data.fechaFin !== "Sin datos"
      ? new Date(data.fechaFin).toLocaleDateString("en-US", opcionesFecha)
      : "No data";

  const resumen = [
    { titulo: "Profiles analyzed", valor: data.total ?? 0, icono: "fa-users" },
    { titulo: "Posts analyzed", valor: data.publicaciones ?? 0, icono: "fa-images" },
    { titulo: "Comments analyzed", valor: data.comentarios ?? 0, icono: "fa-comments" },
    { titulo: "Positive sentiment", valor: data.sentimientoPositivo ?? "0%", icono: "fa-smile" },
    { titulo: "Neutral sentiment", valor: data.sentimientoNeutro ?? "0%", icono: "fa-meh" },
    { titulo: "Negative sentiment", valor: data.sentimientoNegativo ?? "0%", icono: "fa-frown" },
    { titulo: "Posts start date", valor: fechaInicioFormateada, icono: "fa-calendar-alt" },
    { titulo: "Posts end date", valor: fechaFinFormateada, icono: "fa-calendar-check" },
    { titulo: "Days analyzed", valor: data.diasAnalizados ?? "0", icono: "fa-clock" },
  ];

  const tarjetasExistentes = contenedor.querySelectorAll(".tarjeta-resumen");
  
  if (tarjetasExistentes.length !== resumen.length) {
    // Crear las tarjetas si no existen o cantidad cambió
    contenedor.innerHTML = "";
    resumen.forEach((item) => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "tarjeta-resumen";

      const esNumeroOporcentaje =
        typeof item.valor === "number" ||
        (typeof item.valor === "string" && item.valor.includes("%"));

      const esFecha =
        item.titulo.includes("Fecha") || item.titulo.includes("date");

      tarjeta.innerHTML = `
        <h3>
          <span class="contador ${
            (item.valor === "Sin datos" || item.valor === "No data") ? "sin-datos" : ""
          } ${esFecha ? "fecha" : ""}" ${
            esNumeroOporcentaje ? `data-valor="${item.valor}"` : ""
          }>
            ${esNumeroOporcentaje ? "0" : item.valor}
          </span>
        </h3>
        <p><i class="fa ${item.icono}"></i> ${item.titulo}</p>
      `;
      contenedor.appendChild(tarjeta);
    });

    document.querySelectorAll(".contador").forEach((el) => {
      if (el.classList.contains("fecha")) return;
      const rawValor = el.dataset.valor;
      const esPorcentaje = typeof rawValor === "string" && rawValor.includes("%");
      const valorFinal = esPorcentaje
        ? parseFloat(rawValor.replace("%", ""))
        : parseFloat(rawValor);

      if (isNaN(valorFinal)) {
        el.textContent = rawValor;
        return;
      }

      let inicio = 0;
      const duracion = 1200;
      const incremento = valorFinal / (duracion / 16);

      const animar = () => {
        inicio += incremento;
        if (inicio >= valorFinal) {
          el.textContent = esPorcentaje
            ? valorFinal.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"
            : Math.round(valorFinal).toLocaleString("es-CO");
        } else {
          el.textContent = esPorcentaje
            ? inicio.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"
            : Math.floor(inicio).toLocaleString("es-CO");
          requestAnimationFrame(animar);
        }
      };
      animar();
    });
  } else {
    // Solo actualizar el valor en las tarjetas existentes
    tarjetasExistentes.forEach((tarjeta, index) => {
      const contador = tarjeta.querySelector(".contador");
      const item = resumen[index];
      const esPorcentaje = typeof item.valor === "string" && item.valor.includes("%");

      contador.setAttribute("data-valor", item.valor);
      if (contador.classList.contains("fecha")) {
        contador.textContent = item.valor;
      } else {
        const valorFinal = esPorcentaje
          ? parseFloat(item.valor.replace("%", ""))
          : parseFloat(item.valor);

        if (isNaN(valorFinal)) {
          contador.textContent = item.valor;
          return;
        }

        contador.textContent = esPorcentaje
          ? valorFinal.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"
          : Math.round(valorFinal).toLocaleString("es-CO");
      }
    });
  }
}

export async function inicializarDashboardRanchera() {
  const contenedorResumen = document.getElementById("resumen-estadisticas");
  if (!contenedorResumen) {
    console.warn("⚠️ No se encontró el contenedor #resumen-estadisticas");
    return;
  }

  try {
    const res = await fetch("/api/ranchera/resumen");
    const data = await res.json();
    console.table(data);

    // Usar función reutilizable para renderizar resumen
    const datosNormalizados = {
      total: parseInt(data.perfiles ?? 0),
      publicaciones: parseInt(data.publicaciones ?? 0),
      comentarios: parseInt(data.comentarios ?? 0),
      sentimientoPositivo: data.sentimientoPositivo ?? "0%",
      sentimientoNeutro: data.sentimientoNeutro ?? "0%",
      sentimientoNegativo: data.sentimientoNegativo ?? "0%",
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      diasAnalizados: data.diasAnalizados ?? 0,
    };
    
    renderizarResumenEstadisticas(datosNormalizados, contenedorResumen);
    renderizarGraficoPublicacionesNodos();
    cargarIndicadoresSemilla();

    renderizarGraficosDescriptivos();
    renderizarGraficosComparativos();
    renderizarGraficoLineaTiempo();

    // inicializarWordCloud(); // removed as the function is no longer defined
    inicializarWordCloudBiografias();
  } catch (error) {
    console.error("❌ Error cargando resumen:", error);
  }
}

function renderizarGraficoPublicacionesNodos() {
  crearGraficoBarras({
    contenedorId: "grafico-publicaciones-nodos",
    titulo: "Posts by seed node",
    categorias: ["Node A", "Node B", "Node C", "Node D"],
    datos: [120, 200, 150, 80],
  });
}
async function cargarIndicadoresSemilla() {
  const contenedorTop = document.getElementById("top-perfiles-semilla");

  try {
    const res = await fetch("/api/ranchera/indicadores-semilla");
    const data = await res.json();

    console.log("🔍 Datos de la respuesta del servidor:", data);

    if (!data.top3 || !Array.isArray(data.top3) || data.top3.length === 0) {
      contenedorTop.innerHTML = `
        <h3>Top 6 profiles with most followers:</h3>
        <p>No profiles available.</p>
      `;
      return;
    }

    contenedorTop.innerHTML = `
      <h3>Top 6 profiles with most followers:</h3>
      <div class="top-perfiles">
        ${data.top3.map(p => `
          <a href="https://www.instagram.com/${p.username}/" target="_blank" class="perfil-tarjeta-link">
            <div class="perfil-tarjeta">
              <div class="perfil-info">
                <p class="nombre-completo"><strong>${p.full_name ?? "No full name"}</strong></p>
                <p class="info">@${p.username} ${p.verified ? '<i class="fa fa-check-circle" style="color:#1da1f2;" title="Verified account"></i>' : ""}</p>
                
              </div>
            </div>
          </a>
        `).join("")}
      </div>
    `;

    //<img src="/api/ranchera/proxy-img?url=${encodeURIComponent(p.profile_pic_url)}" alt="${p.username}" class="perfil-img">

    // <p class="info">${Number(p.followersCount).toLocaleString("es-CO")} seguidores</p>
    //             <p class="info">${Number(p.follows_count).toLocaleString("es-CO")} seguidos</p>

    console.log("✅ Indicadores semilla cargados correctamente:", data);
  } catch (error) {
    if (contenedorTop) {
      contenedorTop.innerHTML = `
        <h3>Top 6 profiles with most followers:</h3>
        <p>Error loading profiles.</p>
      `;
    }
    console.error("❌ Error al cargar indicadores semilla:", error);
  }
}

async function renderizarGraficosDescriptivos() {
  try {
    const res = await fetch("/api/ranchera/graficos-descriptivos");
    const data = await res.json();

    crearGraficoBarras({
      contenedorId: "grafico-categorias",
      titulo: "Distribution by business category",
      categorias: data.categorias.map(
        (c) =>
          (c.business_category_name || "")
            .split(",")
            .map((cat) => cat.trim())
            .find((cat) => cat.toLowerCase() !== "none") || "Uncategorized"
      ),
      datos: data.categorias.map((c) => c.count),
    });

    crearGraficoBarras({
      contenedorId: "grafico-tipo-perfil",
      titulo: "Public vs private profiles",
      categorias: ["Public", "Private"],
      datos: [data.publicos, data.privados],
      color: "#1565C0",
    });
  } catch (error) {
    console.error("❌ Error al cargar gráficos descriptivos:", error);
  }
}

async function renderizarGraficosComparativos() {
  try {
    const res = await fetch("/api/ranchera/stats-semilla");
    const perfiles = await res.json();

    window.perfilesSemillaGlobal = perfiles;
    window.traducirNombrePerfil = nombrePerfilEnIngles;

    const nombresCompletos = perfiles.map((p) => nombrePerfilEnIngles(p.full_name ?? p.username));
    const seguidores = perfiles.map((p) => p.followers_count);
    const seguidos = perfiles.map((p) => p.follows_count);
    const publicaciones = perfiles.map((p) => p.posts_count);

    crearGraficoBarras({
      contenedorId: "grafico-comparativo-seguidores",
      titulo: "IGTV video count per profile",
      categorias: nombresCompletos,
      datos: perfiles.map((p) => p.igtv_video_count),
      color: "#2E7D32",
      nombreEjeX: "Profile",
      nombreEjeY: "IGTV videos",
    });

    crearGraficoBarras({
      contenedorId: "grafico-comparativo-publicaciones",
      titulo: "Post count per profile",
      categorias: nombresCompletos,
      datos: publicaciones,
      color: "#6A1B9A",
      nombreEjeX: "Profile",
      nombreEjeY: "Posts",
    });

    crearGraficoScatter({
      contenedorId: "grafico-scatter-seguidores",
      titulo: "Followers vs following",
      datos: perfiles,
    });

    renderizarGraficoSeguidoresSemillas(perfiles);
    renderizarGraficoSeguidosSemillas(perfiles);
  } catch (error) {
    console.error("❌ Error al cargar gráficos comparativos:", error);
  }
}
async function renderizarGraficoLineaTiempo() {
  try {
    const res = await fetch("/api/ranchera/linea-tiempo");
    const { fechas, series } = await res.json();

    crearGraficoLineas({
      contenedorId: "grafico-linea-tiempo",
      titulo: "Timeline of posts per seed profile",
      categorias: fechas,
      series: series,
    });
  } catch (error) {
    console.error("❌ Error al renderizar gráfico de línea de tiempo:", error);
  }
}

async function inicializarWordCloudBiografias() {
  const selector = document.getElementById("selectorPerfiles");
  const sliderBio = document.getElementById("frecuenciaSliderBiografias");
  const valorBio = document.getElementById("frecuenciaValorBiografias");
  let palabrasBiografias = [];

  // Optional: If you decide to remove the button from the HTML, eliminate its usage.
  if (!selector) return;

  try {
    const res = await fetch("/api/ranchera/stats-semilla");
    const perfiles = await res.json();

    selector.innerHTML = "";
    perfiles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.username;
      opt.textContent = p.full_name || p.username;
      opt.selected = true;
      selector.appendChild(opt);
    });

    async function actualizarWordCloudBiografias() {
      const seleccionados = Array.from(selector.selectedOptions).map(
        (o) => o.value
      );
      const resp = await fetch("/api/ranchera/biografias-wordcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: seleccionados }),
      });

      const { biografias } = await resp.json();
      palabrasBiografias = procesarTextoABiogramas(biografias);
      renderizarWordCloudBiografias(parseInt(sliderBio.value));
    }

    selector.addEventListener("change", actualizarWordCloudBiografias);
    sliderBio.addEventListener("input", () => {
      renderizarWordCloudBiografias(parseInt(sliderBio.value));
    });

    // Ejecutar una vez al inicio
    actualizarWordCloudBiografias();
  } catch (error) {
    console.error("❌ Error inicializando wordcloud biografías:", error);
  }

  function renderizarWordCloudBiografias(minFreq) {
    valorBio.textContent = minFreq;
    const filtradas = palabrasBiografias.filter((p) => p.weight >= minFreq);
    crearWordCloud({
      contenedorId: "grafico-wordcloud-biografias",
      palabras: filtradas,
    });
  }
}

function procesarTextoABiogramas(texto) {
  const frecuencia = {};
  const palabras = texto
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/);
  for (const palabra of palabras) {
    if (palabra.length < 4) continue;
    frecuencia[palabra] = (frecuencia[palabra] || 0) + 1;
  }
  return Object.entries(frecuencia).map(([text, weight]) => ({ text, weight }));
}
let usernameToFuenteId = {};

function renderizarGraficoSeguidoresSemillas(perfiles) {
  usernameToFuenteId = {};
  perfiles.forEach(p => {
    const nombreDisplay = nombrePerfilEnIngles(normalizarNombrePerfil(p));
    if (nombreDisplay) {
      usernameToFuenteId[nombreDisplay] = p.fuente_id;
    }
  });

  // 🔄 Reiniciar gráfico antes de crear uno nuevo
  reiniciarGrafico("grafico-seguidores-semillas");

  crearGraficoBarras({
    contenedorId: "grafico-seguidores-semillas",
    titulo: "Followers per seed profile",
    categorias: perfiles.map((p) => nombrePerfilEnIngles(normalizarNombrePerfil(p))),
    datos: perfiles.map((p) => p.followers_count),
    color: "#5caac8",
    nombreEjeX: "Profile",
    nombreEjeY: "Followers",
  });

  // 🛠️ Luego sí, agregar eventos
  const chart = echarts.getInstanceByDom(document.getElementById("grafico-seguidores-semillas"));
  if (chart) {
    chart.on("click", async function (params) {
      const nombreSeleccionado = params.name.trim();
      const fuenteId = usernameToFuenteId[nombreSeleccionado];

      console.log("🎯 Clic sobre:", nombreSeleccionado, "Fuente ID:", fuenteId);
      if (fuenteIdSeleccionado === fuenteId) {
        console.log("🔄 Clic repetido en el mismo perfil. Restaurando datos generales...");
        fuenteIdSeleccionado = null;

        const contenedorResumen = document.getElementById("resumen-estadisticas");
        const contenedorTop = document.getElementById("top-perfiles-semilla");

        if (contenedorResumen) contenedorResumen.innerHTML = "";
        if (contenedorTop) contenedorTop.innerHTML = "";

        inicializarDashboardRanchera();
      } else {
        console.log("🔎 Cargando datos filtrados para fuente_id:", fuenteId);
        fuenteIdSeleccionado = fuenteId;
        // Reemplazo de filtrarIndicadoresPorFuenteId
        const contenedorResumen = document.getElementById("resumen-estadisticas");
        if (contenedorResumen) contenedorResumen.innerHTML = "";

        try {
          const res = await fetch(`/api/ranchera/indicadores-semilla-filtrado?fuente_id=${fuenteId}`);
          const data = await res.json();

          const datosNormalizados = {
            total: parseInt(data.totalPerfiles ?? 0),
            publicaciones: parseInt(data.totalPublicaciones ?? 0),
            comentarios: parseInt(data.totalComentarios ?? 0),
            sentimientoPositivo: data.sentimientoPositivo ?? "0%",
            sentimientoNeutro: data.sentimientoNeutro ?? "0%",
            sentimientoNegativo: data.sentimientoNegativo ?? "0%",
            fechaInicio: data.fechaInicio,
            fechaFin: data.fechaFin,
            diasAnalizados: data.diasAnalizados ?? 0,
          };

          renderizarResumenEstadisticas(datosNormalizados, contenedorResumen);
        } catch (error) {
          console.error("❌ Error al cargar datos filtrados:", error);
        }
      }
    });
  }
}
function renderizarGraficoSeguidosSemillas(perfiles) {
  // 🔄 Reiniciar gráfico antes de crear uno nuevo
  reiniciarGrafico("grafico-seguidos-semillas");
  crearGraficoBarras({
    contenedorId: "grafico-seguidos-semillas",
    titulo: "Following per seed profile",
    categorias: perfiles.map((p) => nombrePerfilEnIngles(normalizarNombrePerfil(p))),
    datos: perfiles.map((p) => p.follows_count),
    color: "#cccccc",
    nombreEjeX: "Profile",
    nombreEjeY: "Following",
  });

  const chart = echarts.getInstanceByDom(document.getElementById("grafico-seguidos-semillas"));
  if (chart) {
    chart.on("click", function (params) {
      const nombreSeleccionado = params.name.trim();
      const fuenteId = usernameToFuenteId[nombreSeleccionado];

      console.log("🎯 Clic sobre:", nombreSeleccionado, "Fuente ID:", fuenteId);

      if (fuenteIdSeleccionado === fuenteId) {
        console.log("🔄 Clic repetido en el mismo perfil. Restaurando datos generales...");
        fuenteIdSeleccionado = null;

        const contenedorResumen = document.getElementById("resumen-estadisticas");
        const contenedorTop = document.getElementById("top-perfiles-semilla");

        if (contenedorResumen) contenedorResumen.innerHTML = "";
        if (contenedorTop) contenedorTop.innerHTML = "";

        inicializarDashboardRanchera();
      } else {
        console.log("🔎 Cargando datos filtrados para fuente_id:", fuenteId);
        fuenteIdSeleccionado = fuenteId;
        filtrarIndicadoresPorFuenteId(fuenteId);
      }
    });
  }
}

async function filtrarIndicadoresPorFuenteId(fuenteId) {
  if (fuenteId === -99 || fuenteId == null) {
    console.log("🔄 Reset general solicitado, cargando resumen...");
    cargarIndicadoresSemilla();
    return;
  }

  try {
    const contenedorTop = document.getElementById("top-perfiles-semilla");
    if (!contenedorTop) return;

    contenedorTop.innerHTML = `
      <div class="spinner-contenedor">
        <div class="spinner"></div>
      </div>
    `;

    const res = await fetch(`/api/ranchera/indicadores-semilla-filtrado?fuente_id=${fuenteId}`);
    const data = await res.json();
    
    console.log("🔍 Datos de la respuesta del servidor:", data);

    if (!data || Object.keys(data).length === 0) {
      console.warn("⚠️ No se recibieron datos, restaurando indicadores generales...");
      cargarIndicadoresSemilla();
      return;
    }

    contenedorTop.innerHTML = `
      <h3>Top profiles with most followers:</h3>
      <div class="top-perfiles">
        ${
          Array.isArray(data.top3)
            ? data.top3.map((p) => `
              <a href="https://www.instagram.com/${p.username}/" target="_blank" class="perfil-tarjeta-link">
                <div class="perfil-tarjeta">
                  <img src="/api/ranchera/proxy-img?url=${encodeURIComponent(p.profile_pic_url)}" alt="${p.username}" class="perfil-img">
                  <div class="perfil-info">
                    <p class="nombre-completo"><strong>${p.full_name ?? "No full name"}</strong></p>
                    <p class="info">@${p.username} ${
                      p.verified ? '<i class="fa fa-check-circle" style="color:#1da1f2;" title="Verified account"></i>' : ""
                    }</p>
                    <p class="info">${Number(p.followersCount).toLocaleString("es-CO")} followers</p>
                    <p class="info">${Number(p.follows_count).toLocaleString("es-CO")} following</p>
                  </div>
                </div>
              </a>
            `).join("")
            : `<p>No featured profile data for this filter.</p>`
        }
      </div>
    `;
  } catch (error) {
    console.error("❌ Error filtrando indicadores por fuente_id:", error);
    const contenedorTop = document.getElementById("top-perfiles-semilla");
    if (contenedorTop) {
      contenedorTop.innerHTML = `
        <h3>Top 6 profiles with most followers:</h3>
        <p>Error loading profiles.</p>
      `;
    }
  }
}
// inicializarWordCloudBiografias();  // Removed duplicate call outside the main function
