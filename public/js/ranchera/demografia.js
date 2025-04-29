import { crearGraficoBarras } from "./utils/charts.js";
import { crearWordCloud } from "./utils/wordClouds.js";
import { generarRedSegmentacionSentimiento } from "./utils/redes.js";
(function() {
  console.log("✅ demografia.js ejecutándose");

  // Asegurarse que realizarSegmentacionAudiencia y generarAnalisisInicial estén accesibles globalmente
  // (si ya están en el global, esto no hace daño)
  if (typeof window.realizarSegmentacionAudiencia === "undefined" && typeof realizarSegmentacionAudiencia !== "undefined") {
    window.realizarSegmentacionAudiencia = realizarSegmentacionAudiencia;
  }
  if (typeof window.generarAnalisisInicial === "undefined" && typeof generarAnalisisInicial !== "undefined") {
    window.generarAnalisisInicial = generarAnalisisInicial;
  }

  const ejecutar = () => {
    console.log("🚀 DOM listo, ejecutando lógica de demografía");

    const boton = document.getElementById("botonSegmentarAudiencia");
    if (boton) {
      boton.addEventListener("click", () => {
        realizarSegmentacionAudiencia(window.reglasSegmentacionUsuario);
      });
    } else {
      console.warn("⚠️ No se encontró el botón 'botonSegmentarAudiencia'");
    }

    // Asegúrate de definir reglas si no existen
    if (!window.reglasSegmentacionUsuario) {
      window.reglasSegmentacionUsuario = {
        "Estudiantes": ["universidad", "estudiante", "u", "campus"],
        "Música": ["música", "cantante", "banda"],
        "Fitness": ["fitness", "gimnasio", "crossfit"]
      };
    }

    // Ejecutar automáticamente la segmentación de audiencia al cargar la página
    if (typeof realizarSegmentacionAudiencia === "function") {
      realizarSegmentacionAudiencia(window.reglasSegmentacionUsuario);
    }
  };

  if (document.getElementById("editorReglasSegmentacion")) {
    renderizarEditorReglas();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ejecutar);
  } else {
    ejecutar(); // Ya cargado
  }
})();

// === Segmentación de audiencia ===
async function realizarSegmentacionAudiencia(reglas = window.reglasSegmentacionUsuario) {
  const selector = document.getElementById("selectorPerfil");
  // Si no existe selectorPerfil (demografía), usar todas las fuentes por defecto
  let fuentesSeleccionadas = [];
  if (selector) {
    // Asegurarse de que sea un array de enteros (IDs)
    fuentesSeleccionadas = Array.from(selector.selectedOptions).map(opt => parseInt(opt.value, 10));
  } else {
    // Por defecto, usar IDs de fuentes conocidas (ajustar si necesario)
    fuentesSeleccionadas = [999, 1, 2, 3, 4, 5, 6];
  }

  if (fuentesSeleccionadas.length === 0) {
    alert("Por favor, selecciona al menos un perfil semilla antes de segmentar.");
    return;
  }

  // Logs antes del fetch
  console.log("📤 Enviando fuentes:", fuentesSeleccionadas);
  console.log("📤 Enviando reglas:", reglas);

  let data = [];
  try {
    const res = await fetch("/api/ranchera/segmentacion-audiencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fuentes: fuentesSeleccionadas, reglas })
    });
    const resultado = await res.json();
    if (!Array.isArray(resultado)) {
      console.error("❌ Segmentación de audiencia fallida: no es un array", resultado);
      return;
    }
    data = resultado;
  } catch (error) {
    console.error("❌ Error en segmentación de audiencia:", error);
    return;
  }

  // === Conteo por categoría (filtrar "Sin categoría")
  const conteoPorCategoria = {};
  data.forEach(p => {
    if (p.categoria_detectada === "Sin categoría") {
      console.warn("⚠️ Perfil ignorado sin categoría:", p.username);
      return;
    }
    conteoPorCategoria[p.categoria_detectada] = (conteoPorCategoria[p.categoria_detectada] || 0) + 1;
  });

  const categorias = Object.keys(conteoPorCategoria);
  const valores = categorias.map(c => conteoPorCategoria[c]);

  crearGraficoBarras({
    contenedorId: 'grafico-segmentacion-audiencia',
    titulo: 'Perfiles por categoría',
    categorias,
    datos: valores
  });

  // === Gráfico de sentimiento por categoría ===
  let analisis = [];
  try {
    const responseAnalisis = await fetch('/api/ranchera/analisis-sentimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fuentes: fuentesSeleccionadas })
    });
    analisis = await responseAnalisis.json();
  } catch (error) {
    console.error("❌ Error obteniendo análisis de sentimiento:", error);
    return;
  }
  const sentimientosPorCategoria = {};
  data.forEach(perfil => {
    if (perfil.categoria_detectada === "Sin categoría") {
      // No sumes a "Sin categoría"
      return;
    }
    const sentimiento = analisis.find(a => a.username === perfil.username)?.sentiment || "NEUTRO";
    const categoria = perfil.categoria_detectada;
    if (!sentimientosPorCategoria[categoria]) {
      sentimientosPorCategoria[categoria] = { POSITIVO: 0, NEUTRO: 0, NEGATIVO: 0 };
    }
    sentimientosPorCategoria[categoria][sentimiento]++;
  });
  const categoriasStack = Object.keys(sentimientosPorCategoria);
  const datosStack = {
    POSITIVO: categoriasStack.map(cat => sentimientosPorCategoria[cat]?.POSITIVO || 0),
    NEUTRO: categoriasStack.map(cat => sentimientosPorCategoria[cat]?.NEUTRO || 0),
    NEGATIVO: categoriasStack.map(cat => sentimientosPorCategoria[cat]?.NEGATIVO || 0),
  };
  const contenedorStack = document.getElementById('grafico-sentimiento-por-categoria');
  if (contenedorStack) {
    const chart = echarts.init(contenedorStack);
    chart.setOption({
      title: { text: 'Sentimiento por categoría detectada', left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['POSITIVO', 'NEUTRO', 'NEGATIVO'] },
      xAxis: { type: 'category', data: categoriasStack },
      yAxis: { type: 'value' },
      series: ['POSITIVO', 'NEUTRO', 'NEGATIVO'].map((clave) => ({
        name: clave,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: datosStack[clave]
      }))
    });
    window.addEventListener('resize', () => chart.resize());
  }

  // === Red de segmentación por sentimiento ===
  // Filtrar perfiles sin categoría antes de red
  const perfilesRed = data.filter(p => p.categoria_detectada !== "Sin categoría");
  generarRedSegmentacionSentimiento({
    perfiles: perfilesRed,
    analisis: analisis
  }, 'contenedorRedSegmentacion');

  // === WordCloud por sentimiento y categoría ===
  const palabrasSegmentadas = {};
  analisis.forEach(p => {
    const categoria = data.find(d => d.username === p.username)?.categoria_detectada || 'Sin categoría';
    if (categoria === "Sin categoría") {
      console.warn("⚠️ Perfil ignorado sin categoría:", p.username);
      return;
    }
    const sent = p.sentiment || 'NEUTRO';
    if (!palabrasSegmentadas[categoria]) palabrasSegmentadas[categoria] = {};
    if (!palabrasSegmentadas[categoria][sent]) palabrasSegmentadas[categoria][sent] = {};
    try {
      let keys = [];
      if (typeof p.keywords === 'string') {
        keys = JSON.parse(p.keywords);
      } else if (Array.isArray(p.keywords)) {
        keys = p.keywords;
      }
      keys.forEach(k => {
        palabrasSegmentadas[categoria][sent][k] = (palabrasSegmentadas[categoria][sent][k] || 0) + 1;
      });
    } catch (e) {
      console.warn("⚠️ No se pudieron procesar keywords para:", p.username);
    }
  });

  // === Selector de categoría para nubes de palabras ===
  let selectCategoriaSegmentada = document.getElementById("selectorCategoriaSegmentada");
  if (!selectCategoriaSegmentada) {
    selectCategoriaSegmentada = document.createElement("select");
    selectCategoriaSegmentada.id = "selectorCategoriaSegmentada";
    selectCategoriaSegmentada.style.marginBottom = "1rem";
    const seccionNubesSegmentadas = document.querySelector(".nube-palabras-por-segmento");
    seccionNubesSegmentadas.insertBefore(selectCategoriaSegmentada, seccionNubesSegmentadas.querySelector(".sliders-sentimiento"));
  }
  selectCategoriaSegmentada.innerHTML = Object.keys(palabrasSegmentadas)
    .filter(cat => cat !== "Sin categoría")
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join("");

  const sentimMap = {
    POSITIVO: 'contenedorWordCloudSegmentoPositivo',
    NEUTRO: 'contenedorWordCloudSegmentoNeutro',
    NEGATIVO: 'contenedorWordCloudSegmentoNegativo'
  };

  // Nueva lógica: función para actualizar SOLO la nube de palabras de un sentimiento
  const actualizarWordCloudPorSentimiento = (sent) => {
    const categoriaSeleccionada = selectCategoriaSegmentada.value;
    const contenedor = sentimMap[sent];
    const slider = document.getElementById(`sliderSegmento${sent.charAt(0) + sent.slice(1).toLowerCase()}`);
    const min = parseInt(slider?.value || 1);
    const palabrasCrudas = palabrasSegmentadas[categoriaSeleccionada]?.[sent] || {};
    const filtradas = Object.entries(palabrasCrudas)
      .filter(([, count]) => count >= min)
      .map(([text, weight]) => ({ text, weight }));
    crearWordCloud({ contenedorId: contenedor, palabras: filtradas });
  };

  // Actualiza todas las nubes a la vez (por ejemplo al cambiar la categoría)
  const actualizarTodasLasWordClouds = () => {
    ["POSITIVO", "NEUTRO", "NEGATIVO"].forEach(actualizarWordCloudPorSentimiento);
  };

  selectCategoriaSegmentada.addEventListener("change", actualizarTodasLasWordClouds);

  // Aplicar cambio cuando se mueva cada slider individualmente (solo su nube)
  ["POSITIVO", "NEUTRO", "NEGATIVO"].forEach(sent => {
    const slider = document.getElementById(`sliderSegmento${sent.charAt(0) + sent.slice(1).toLowerCase()}`);
    if (slider) {
      slider.addEventListener("input", () => {
        document.getElementById(`valorSegmento${sent.charAt(0) + sent.slice(1).toLowerCase()}`).textContent = slider.value;
        actualizarWordCloudPorSentimiento(sent);
      });
    }
  });

  // Inicializar nubes con la primera categoría
  actualizarTodasLasWordClouds();

  // === Top perfiles por segmento/categoría ===
  let contenedorTopPerfiles = document.getElementById("topPerfilesPorSegmento");
  if (!contenedorTopPerfiles) {
    contenedorTopPerfiles = document.createElement("section");
    contenedorTopPerfiles.id = "topPerfilesPorSegmento";
    document.body.appendChild(contenedorTopPerfiles);
  }

  contenedorTopPerfiles.innerHTML = `
    <div class="">
      <select id="selectorCriterioTop">
        <option value="followers_count">Más seguidores</option>
        <option value="emoji_density">Mayor densidad de emojis</option>
        <option value="positive">Mayor puntuación positiva</option>
        <option value="negative">Mayor puntuación negativa</option>
        <option value="cantidad_keywords">Más palabras clave</option>
      </select>
    </div>
    <h2>Top 5 por categoría</h2>
    <div class="fila-tarjetas-top" id="contenedorTarjetasSegmento"></div>
  `;
  const selectorCriterio = document.getElementById("selectorCriterioTop");
  let contenedorTarjetas = document.getElementById("contenedorTarjetasSegmento");
  // Agrupar perfiles por categoría detectada, evitando "Sin categoría"
  const perfilesPorCategoria = {};
  analisis.forEach(p => {
    const cat = data.find(d => d.username === p.username)?.categoria_detectada;
    if (!cat) return;
    if (cat === "Sin categoría") {
      console.warn("⚠️ Perfil ignorado sin categoría:", p.username);
      return;
    }
    if (!perfilesPorCategoria[cat]) perfilesPorCategoria[cat] = [];
    perfilesPorCategoria[cat].push(p);
  });
  // Calcular cantidad_keywords y followers_count
  Object.values(perfilesPorCategoria).forEach(perfiles => {
    perfiles.forEach(p => {
      if (typeof p.keywords === 'string') {
        try {
          const arr = JSON.parse(p.keywords);
          p.cantidad_keywords = Array.isArray(arr) ? arr.length : 0;
        } catch {
          p.cantidad_keywords = 0;
        }
      } else if (Array.isArray(p.keywords)) {
        p.cantidad_keywords = p.keywords.length;
      } else {
        p.cantidad_keywords = 0;
      }
      p.followers_count = p.followers ?? p.followers_count ?? 0;
    });
  });
  // Criterio de orden
  let criterio = selectorCriterio.value;
  // Limpiar tarjetas
  contenedorTarjetas.innerHTML = "";
  Object.entries(perfilesPorCategoria).forEach(([categoria, perfiles]) => {
    const top5 = perfiles
      .sort((a, b) => (b[criterio] || 0) - (a[criterio] || 0))
      .slice(0, 5);
    const bloque = document.createElement("div");
    bloque.innerHTML = `<h4>${categoria}</h4>`;
    bloque.className = "bloque-categoria";
    bloque.style.marginBottom = "1rem";
    const tarjetas = top5.map(p => `
      <a href="https://www.instagram.com/${p.username}" target="_blank" class="tarjeta-indicador" style="margin-bottom: 0.75rem; text-decoration: none; color: inherit;">
        <div>
          <strong>@${p.username}</strong><br/>
          Seguidores: ${p.followers?.toLocaleString("es-CO") || '--'}<br/>
          Sentimiento: ${p.sentiment || 'NEUTRO'}<br/>
          <div style="font-size: 0.8rem; margin-top: 0.3rem;">
            <strong>Bio:</strong> ${p.biography || 'Sin biografía'}<br/>
            <strong>Palabras clave:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
            <strong>Análisis:</strong> ${p.interpretation || '--'}
          </div>
        </div>
      </a>
    `).join("");
    bloque.innerHTML += tarjetas;
    contenedorTarjetas.appendChild(bloque);
  });
  // Listener para actualizar el bloque al cambiar el selector
  selectorCriterio.addEventListener("change", () => {
    contenedorTarjetas.innerHTML = "";
    criterio = selectorCriterio.value;
    Object.entries(perfilesPorCategoria).forEach(([categoria, perfiles]) => {
      const top5 = perfiles
        .sort((a, b) => (b[criterio] || 0) - (a[criterio] || 0))
        .slice(0, 5);
      const bloque = document.createElement("div");
      bloque.innerHTML = `<h4>${categoria}</h4>`;
      bloque.className = "bloque-categoria";
      bloque.style.marginBottom = "1rem";
      const tarjetas = top5.map(p => `
        <a href="https://www.instagram.com/${p.username}" target="_blank" class="tarjeta-indicador" style="margin-bottom: 0.75rem; text-decoration: none; color: inherit;">
          <div>
            <strong>@${p.username}</strong><br/>
            Seguidores: ${p.followers?.toLocaleString("es-CO") || '--'}<br/>
            Sentimiento: ${p.sentiment || 'NEUTRO'}<br/>
            <div style="font-size: 0.8rem; margin-top: 0.3rem;">
              <strong>Bio:</strong> ${p.biography || 'Sin biografía'}<br/>
              <strong>Palabras clave:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
              <strong>Análisis:</strong> ${p.interpretation || '--'}
            </div>
          </div>
        </a>
      `).join("");
      bloque.innerHTML += tarjetas;
      contenedorTarjetas.appendChild(bloque);
    });
  });
}

function renderizarEditorReglas() {
  // Reglas de ejemplo si no existen
  if (!window.reglasSegmentacionUsuario) {
    window.reglasSegmentacionUsuario = {
      "Estudiantes": ["universidad", "eafit", "estudiante"],
      "Músicos": ["música", "banda", "instrumento"],
      "Gastronomía": ["comida", "chef", "asado"]
    };
  }
  // Validación para evitar error si window.reglasSegmentacionUsuario es undefined o null
  // if (!window.reglasSegmentacionUsuario || typeof window.reglasSegmentacionUsuario !== 'object') {
  //   console.warn("⚠️ No hay reglas de segmentación definidas o no es un objeto válido.");
  //   window.reglasSegmentacionUsuario = {};
  // }
  const editor = document.getElementById("editorReglasSegmentacion");
  if (!editor) return;
  editor.innerHTML = "";

  Object.entries(window.reglasSegmentacionUsuario).forEach(([categoria, palabras]) => {
    const fila = document.createElement("div");
    fila.style.marginBottom = "0.5rem";
    fila.innerHTML = `
      <strong>${categoria}</strong>: 
      <input type="text" value="${palabras.join(", ")}" data-categoria="${categoria}" style="width:60%; margin-left:0.5rem;" />
      <button data-delete="${categoria}">🗑️</button>
    `;
    editor.appendChild(fila);
  });

  const agregarNueva = document.createElement("div");
  agregarNueva.innerHTML = `
    <input type="text" placeholder="Nueva categoría" id="nuevaCategoria" style="width:20%;" />
    <input type="text" placeholder="Palabras clave separadas por coma" id="nuevasPalabras" style="width:60%;" />
    <button id="agregarCategoria">➕ Añadir</button>
  `;
  editor.appendChild(agregarNueva);

  editor.querySelectorAll("button[data-delete]").forEach(btn => {
    btn.onclick = () => {
      const cat = btn.getAttribute("data-delete");
      delete window.reglasSegmentacionUsuario[cat];
      renderizarEditorReglas();
    };
  });

  document.getElementById("agregarCategoria").onclick = () => {
    const nueva = document.getElementById("nuevaCategoria").value.trim();
    const palabras = document.getElementById("nuevasPalabras").value.split(",").map(p => p.trim()).filter(p => p);
    if (nueva && palabras.length > 0) {
      window.reglasSegmentacionUsuario[nueva] = palabras;
      renderizarEditorReglas();
      document.getElementById("nuevaCategoria").value = "";
      document.getElementById("nuevasPalabras").value = "";
    }
  };

  editor.querySelectorAll("input[data-categoria]").forEach(input => {
    input.onchange = () => {
      const cat = input.getAttribute("data-categoria");
      const palabras = input.value.split(",").map(p => p.trim()).filter(p => p);
      window.reglasSegmentacionUsuario[cat] = palabras;
    };
  });
}
  
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("editorReglasSegmentacion")) {
      renderizarEditorReglas();
    }
  });