import { crearGraficoBarrasHorizontal, crearGraficoScatter, crearGraficoBarras } from "./utils/charts.js";
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
        "Students": ["university", "student", "campus"],
        "Musicians": ["music", "band", "instrument"],
        "Gastronomy": ["food", "chef", "grill"]
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
    alert("Please select at least one seed profile before segmenting.");
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

  // === Scatter plot de perfiles segmentados ===
  console.log("🧾 Perfiles crudos recibidos:", data.slice(0, 10));
  const datosScatter = data
    .filter(p => p.categoria_detectada && p.categoria_detectada !== "Sin categoría")
    .map(p => ({
      username: p.username,
      fuente_id: p.categoria_detectada,
      followers: p.followers ?? p.followers_count ?? 0,
      follows_count: p.following_count ?? 0,
      posts_count: p.media_count ?? 0
    }));

// Eliminar gráfico anterior si existe
const contenedorScatter = document.getElementById('grafico-scatter-demografia');
if (contenedorScatter) {
  echarts.dispose(contenedorScatter);
}

console.log("📊 Datos enviados al gráfico scatter:", datosScatter);

window.scatterDemografiaChart = crearGraficoScatter({
  contenedorId: 'grafico-scatter-demografia',
  titulo: 'Segmented profiles distribution',
  datos: datosScatter
});

  // === Conteo por categoría (filtrar "Sin categoría")
  const conteoPorCategoria = {};
  data.forEach(p => {
    if (p.categoria_detectada === "Sin categoría") {
      //  console.warn("⚠️ Perfil ignorado sin categoría:", p.username);
      return;
    }
    conteoPorCategoria[p.categoria_detectada] = (conteoPorCategoria[p.categoria_detectada] || 0) + 1;
  });

  // Ordenar categorías por cantidad ascendente
  const categoriasOrdenadas = Object.entries(conteoPorCategoria)
    .sort(([, a], [, b]) => a - b); // orden ascendente

  const categorias = categoriasOrdenadas.map(([c]) => c);
  const valores = categoriasOrdenadas.map(([, v]) => v);
  // === Gráfico de cantidad de perfiles por categoría ===
  crearGraficoBarrasHorizontal({
    contenedorId: 'grafico-cantidad-por-categoria',
    titulo: 'Profile count by category',
    categorias,
    datos: valores,
    color: '#5caac8',
    nombreEjeX: '',
    nombreEjeY: ''
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
  let categoriasStack = Object.keys(sentimientosPorCategoria);
  // Ordenar categoriasStack y datosStack según suma total ascendente
  const categoriasOrdenadasStack = categoriasStack
    .map(cat => ({
      cat,
      total:
        (sentimientosPorCategoria[cat]?.POSITIVO || 0) +
        (sentimientosPorCategoria[cat]?.NEUTRO || 0) +
        (sentimientosPorCategoria[cat]?.NEGATIVO || 0)
    }))
    .sort((a, b) => a.total - b.total) // orden ascendente
    .map(o => o.cat);

  categoriasStack = categoriasOrdenadasStack;
  const datosStackOrdenado = {
    POSITIVO: categoriasStack.map(cat => sentimientosPorCategoria[cat]?.POSITIVO || 0),
    NEUTRO: categoriasStack.map(cat => sentimientosPorCategoria[cat]?.NEUTRO || 0),
    NEGATIVO: categoriasStack.map(cat => sentimientosPorCategoria[cat]?.NEGATIVO || 0),
  };
  const sentimientoLabel = { POSITIVO: 'Positive', NEUTRO: 'Neutral', NEGATIVO: 'Negative' };
  // Crear el gráfico de sentimiento por categoría
  crearGraficoBarrasHorizontal({
    contenedorId: 'grafico-sentimiento-por-categoria',
    titulo: 'Sentiment by detected category',
    categorias: categoriasStack,
    datos: ['POSITIVO', 'NEUTRO', 'NEGATIVO'].map((sent) => ({
      name: sentimientoLabel[sent],
      data: datosStackOrdenado[sent]
    })),
    nombreEjeX: '',
    nombreEjeY: '',
    colores: {
      Positive: '#267365',
      Neutral: '#F2CB05',
      Negative: '#F23030'
    }
  });

  // === Red de segmentación por sentimiento ===
  // Filtrar perfiles sin categoría antes de red
  const perfilesRed = data.filter(p => p.categoria_detectada !== "Sin categoría");
  generarRedSegmentacionSentimiento({
    perfiles: perfilesRed,
    analisis: analisis
  }, 'contenedorRedSegmentacion');

  // === WordCloud por sentimiento y categoría ===
  // Función auxiliar para limpiar palabras clave
  const procesarPalabra = (palabra) =>
    palabra
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,:;!?¡¿()"'`´[\]{}<>]/g, '');

  const palabrasSegmentadas = {};
  analisis.forEach(p => {
    const categoria = data.find(d => d.username === p.username)?.categoria_detectada || 'Sin categoría';
    if (categoria === "Sin categoría") {
    //  console.warn("⚠️ Perfil ignorado sin categoría:", p.username);
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
        const clean = procesarPalabra(k);
        palabrasSegmentadas[categoria][sent][clean] = (palabrasSegmentadas[categoria][sent][clean] || 0) + 1;
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
  const categoriasDisponibles = Object.keys(palabrasSegmentadas).filter(cat => cat !== "Sin categoría");
  selectCategoriaSegmentada.innerHTML = `
      <option value="TODOS">All</option>
      ${categoriasDisponibles.map(cat => `<option value="${cat}">${cat}</option>`).join("")}
    `;

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
    let palabrasCrudas = {};
    if (categoriaSeleccionada === "TODOS") {
      Object.entries(palabrasSegmentadas).forEach(([categoria, sentObj]) => {
        if (sentObj[sent]) {
          Object.entries(sentObj[sent]).forEach(([palabra, conteo]) => {
            palabrasCrudas[palabra] = (palabrasCrudas[palabra] || 0) + conteo;
          });
        }
      });
    } else {
      palabrasCrudas = palabrasSegmentadas[categoriaSeleccionada]?.[sent] || {};
    }
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

  let selectorCriterio = document.getElementById("selectorCriterioTop");
  if (!selectorCriterio) {
    const selectWrapper = document.createElement("div");
    selectWrapper.innerHTML = `
      <select id="selectorCriterioTop">
        <option value="followers_count">Most followers</option>
        <option value="emoji_density">Highest emoji density</option>
        <option value="positive">Highest positive score</option>
        <option value="negative">Highest negative score</option>
        <option value="cantidad_keywords">Most keywords</option>
      </select>
    `;
    contenedorTopPerfiles.appendChild(selectWrapper);
    selectorCriterio = selectWrapper.querySelector("select");
  }

  let contenedorTarjetas = document.getElementById("contenedorTarjetasSegmento");
  if (!contenedorTarjetas) {
    contenedorTarjetas = document.createElement("div");
    contenedorTarjetas.className = "fila-tarjetas-top";
    contenedorTarjetas.id = "contenedorTarjetasSegmento";
    contenedorTopPerfiles.appendChild(contenedorTarjetas);
  } else {
    contenedorTarjetas.innerHTML = "";
  }
  // Agrupar perfiles por categoría detectada, evitando "Sin categoría"
  // Declarar perfilesPorCategoria globalmente para que sea accesible en otros bloques
  window.perfilesPorCategoria = {};
  analisis.forEach(p => {
    const cat = data.find(d => d.username === p.username)?.categoria_detectada;
    if (!cat || cat === "Sin categoría") return;
    if (!window.perfilesPorCategoria[cat]) window.perfilesPorCategoria[cat] = [];
    window.perfilesPorCategoria[cat].push(p);
  });
  // Calcular cantidad_keywords y followers_count
  Object.values(window.perfilesPorCategoria).forEach(perfiles => {
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
  Object.entries(window.perfilesPorCategoria).forEach(([categoria, perfiles]) => {
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
          Followers: ${p.followers?.toLocaleString("en-US") || '--'}<br/>
          Sentiment: ${(p.sentiment === 'POSITIVO' ? 'Positive' : p.sentiment === 'NEGATIVO' ? 'Negative' : p.sentiment === 'NEUTRO' ? 'Neutral' : p.sentiment) || 'Neutral'}<br/>
          <div style="font-size: 0.8rem; margin-top: 0.3rem;">
            <strong>Bio:</strong> ${p.biography || 'No biography'}<br/>
            <strong>Keywords:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
            <strong>Analysis:</strong> ${p.interpretation || '--'}
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
    Object.entries(window.perfilesPorCategoria).forEach(([categoria, perfiles]) => {
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
            Followers: ${p.followers?.toLocaleString("en-US") || '--'}<br/>
            Sentiment: ${(p.sentiment === 'POSITIVO' ? 'Positive' : p.sentiment === 'NEGATIVO' ? 'Negative' : p.sentiment === 'NEUTRO' ? 'Neutral' : p.sentiment) || 'Neutral'}<br/>
            <div style="font-size: 0.8rem; margin-top: 0.3rem;">
              <strong>Bio:</strong> ${p.biography || 'No biography'}<br/>
              <strong>Keywords:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
              <strong>Analysis:</strong> ${p.interpretation || '--'}
            </div>
          </div>
        </a>
      `).join("");
      bloque.innerHTML += tarjetas;
      contenedorTarjetas.appendChild(bloque);
    });
  });

  // === EMOJIS POR CATEGORÍA (integrado con selectorCategoriaSegmentada) ===
  // Utiliza selectCategoriaSegmentada para filtrar el gráfico de emojis.
  function actualizarGraficoEmojisPorCategoria() {
    // Usar window.perfilesPorCategoria y selectCategoriaSegmentada
    const perfilesPorCategoria = window.perfilesPorCategoria || {};
    const selectCategoriaSegmentada = document.getElementById("selectorCategoriaSegmentada");
    if (!selectCategoriaSegmentada) return;
    const categoriaSeleccionada = selectCategoriaSegmentada.value;
    let perfilesFiltrados = [];
    Object.entries(perfilesPorCategoria).forEach(([cat, perfiles]) => {
      if (categoriaSeleccionada === "TODOS" || cat === categoriaSeleccionada) {
        perfilesFiltrados = perfilesFiltrados.concat(perfiles);
      }
    });
    const conteoEmojis = {};
    perfilesFiltrados.forEach(p => {
      let mostCommon = p.most_common || p.emoji_mas_comun;
      if (typeof mostCommon === "string") {
        try {
          mostCommon = JSON.parse(mostCommon);
        } catch (e) {
          console.warn("❌ Error parsing most_common en perfil:", p.username);
          return;
        }
      }
      if (typeof mostCommon === "object" && mostCommon !== null) {
        Object.entries(mostCommon).forEach(([emoji, count]) => {
          conteoEmojis[emoji] = (conteoEmojis[emoji] || 0) + count;
        });
      }
    });
    // Ordenar y tomar top 20
    const emojisOrdenados = Object.entries(conteoEmojis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    const categorias = emojisOrdenados.map(e => e[0]);
    const valores = emojisOrdenados.map(e => e[1]);
    // Crear el gráfico de barras (horizontal)
    crearGraficoBarras({
      contenedorId: 'grafico-emojis-por-categoria',
      titulo: 'Most used emojis by category',
      categorias,
      datos: valores,
      color: '#5caac8',
      nombreEjeX: '',
      nombreEjeY: ''
    });
  }
  // Añadir listener al selector de categoría segmentada
  let selectCategoriaSegmentadaEmojis = document.getElementById("selectorCategoriaSegmentada");
  if (selectCategoriaSegmentadaEmojis) {
    selectCategoriaSegmentadaEmojis.addEventListener("change", actualizarGraficoEmojisPorCategoria);
    // Inicializar
    actualizarGraficoEmojisPorCategoria();
  }

  // Habilitar botón de descarga de PDF solo cuando los gráficos ya estén generados
  document.getElementById("btnDescargarPDF")?.removeAttribute("disabled");
}

function renderizarEditorReglas() {
  // Reglas de ejemplo si no existen
  if (!window.reglasSegmentacionUsuario) {
    window.reglasSegmentacionUsuario = {
      "Students": ["university", "eafit", "student"],
      "Musicians": ["music", "band", "instrument"],
      "Gastronomy": ["food", "chef", "grill"]
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
    <input type="text" placeholder="New category" id="nuevaCategoria" style="width:20%;" />
    <input type="text" placeholder="Keywords separated by comma" id="nuevasPalabras" style="width:60%;" />
    <button id="agregarCategoria">➕ Add</button>
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

  // (Bloque de código de selectorEmojiCategoria eliminado porque ahora el gráfico de emojis se integra con selectorCategoriaSegmentada)