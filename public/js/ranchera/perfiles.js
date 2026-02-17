// === Bloque utilitario para descripciones de gráficos ===
function agregarDescripcionGrafico(id, texto) {
  const grafico = document.getElementById(id);
  if (!grafico) return;
  const parent = grafico.parentNode;
  const desc = document.createElement("div");
  desc.className = "grafico-descripcion";
  desc.textContent = texto;
  // Nubes de palabras: texto en fila debajo de las gráficas, fuera de las tarjetas
  const filaDesc = document.getElementById("filaDescWordclouds");
  if (filaDesc && (id === "contenedorWordCloud" || id === "contenedorWordCloudNombres")) {
    if (filaDesc.querySelectorAll(".grafico-descripcion").length >= 2) return;
    filaDesc.appendChild(desc);
    return;
  }
  const yaTieneDesc = parent.nextElementSibling?.classList?.contains("grafico-descripcion") || grafico.nextElementSibling?.classList?.contains("grafico-descripcion");
  if (yaTieneDesc) return;
  // Si el gráfico está dentro de .cuadro-grafico-blanco, poner la descripción fuera del cuadro
  if (parent.classList && parent.classList.contains("cuadro-grafico-blanco")) {
    parent.parentNode.insertBefore(desc, parent.nextSibling);
  } else {
    parent.insertBefore(desc, grafico.nextSibling);
  }
}
import { procesarYActualizarWordCloudBiografias, crearWordCloud } from "./utils/wordClouds.js";
import { generarRedPerfiles } from "./utils/redes.js";
import { crearGraficoScatter, crearGraficoPie, crearGraficoBarras } from "./utils/charts.js";
import { generarRedSegmentacionSentimiento } from "./utils/redes.js";

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
if (typeof window !== "undefined") window.traducirNombrePerfil = nombrePerfilEnIngles;

let perfilesSemillaGlobal = []; // Declarar al inicio del archivo para usar globalmente

export function inicializarVistaPerfiles() {
  console.log("✅ Vista de perfiles inicializada");

  const selector = document.getElementById("selectorPerfil");
  // const resumenContainer = document.getElementById("resumenPerfil");

  // if (!selector || !resumenContainer) {
  //   console.error("❌ Elementos no encontrados en el DOM.");
  //   return;
  // }

  // Obtener perfiles semilla desde el backend
  fetch("/api/ranchera/indicadores-semilla")
    .then((response) => response.json())
    .then((data) => {
      if (!Array.isArray(data.top3)) {
        console.error("❌ Estructura inesperada en la respuesta:", data);
        return;
      }
      const perfiles = data.top3;
      perfilesSemillaGlobal = perfiles;
      window.perfilesSemillaGlobal = perfilesSemillaGlobal;
      selector.innerHTML = "";
      perfiles.forEach((p) => {
        if (p.fuente_id !== undefined && p.fuente_id !== null) {
          const option = document.createElement("option");
          option.value = p.fuente_id;
          option.setAttribute("data-username", p.username);
          option.textContent = `${nombrePerfilEnIngles(p.full_name) || p.full_name || "No name"} (@${p.username})`;
          option.selected = true;
          selector.appendChild(option);
        }
      });

      // Inicializar select2 solo en el selector de perfiles
      if (window.jQuery && $.fn.select2) {
        $('#selectorPerfil').select2({
          width: 'resolve',
          placeholder: 'Select seed profiles',
          allowClear: true,
          closeOnSelect: false,
          tags: false
        });
      }

      const selectorTipoCuenta = document.createElement("select");
      selectorTipoCuenta.id = "selectorTipoCuenta";
      selectorTipoCuenta.innerHTML = `
          <option value="">-- Business account? --</option>
          <option value="true">Business account</option>
          <option value="false">Personal account</option>
        `;
      document.querySelector(".controls-nube").appendChild(selectorTipoCuenta);

      selectorTipoCuenta.addEventListener("change", () => {
        const categoriasSeleccionadas = Array.from(
          selectorCategorias.selectedOptions
        ).map((opt) => opt.value);
        const privacidadSeleccionada =
          document.getElementById("selectorPrivacidad").value;
        const tipoCuentaSeleccionada = selectorTipoCuenta.value;

        // Usar window.perfilesCargadosGlobal si existe, si no, window.ultimoPerfilesAnalizados, si no, perfilesSemillaGlobal
        const perfilesUsar = window.perfilesCargadosGlobal?.length
          ? window.perfilesCargadosGlobal
          : (window.ultimoPerfilesAnalizados?.length
            ? window.ultimoPerfilesAnalizados
            : perfilesSemillaGlobal);

        let perfilesFiltrados = perfilesUsar;

        if (categoriasSeleccionadas.length > 0) {
          perfilesFiltrados = perfilesFiltrados.filter((p) =>
            categoriasSeleccionadas.some((cat) =>
              (p.business_category_name || "")
                .toLowerCase()
                .includes(cat.toLowerCase())
            )
          );
        }

        if (privacidadSeleccionada !== "") {
          const isPrivado = privacidadSeleccionada === "true";
          perfilesFiltrados = perfilesFiltrados.filter(
            (p) => p.private === isPrivado
          );
        }

        if (tipoCuentaSeleccionada !== "") {
          const isBusiness = tipoCuentaSeleccionada === "true";
          perfilesFiltrados = perfilesFiltrados.filter(
            (p) => Boolean(p.is_business) === isBusiness
          );
        }

        const textoFiltrado = perfilesFiltrados
          .map((p) => p.biography || "")
          .join(" ");

        procesarYActualizarWordCloudBiografias({
          texto: textoFiltrado,
          sliderId: "frecuenciaSlider",
          valorSliderId: "frecuenciaValor",
          contenedorId: "contenedorWordCloud",
        });
        const textoNombres = perfilesFiltrados
          .map((p) => p.fullname || "")
          .join(" ");
        procesarYActualizarWordCloudBiografias({
          texto: textoNombres,
          sliderId: "frecuenciaSlider",
          valorSliderId: "frecuenciaValor",
          contenedorId: "contenedorWordCloudNombres",
        });
      });

      // Agregar bloque para identificar categorías únicas y poblar el selector de categorías
      const categoriasSet = new Set();
      perfiles.forEach((p) => {
        const categorias = (p.business_category_name || "")
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c && c.toLowerCase() !== "none");
        categorias.forEach((cat) => categoriasSet.add(cat));
      });

      const selectorCategorias = document.getElementById("selectorCategoria");
      selectorCategorias.innerHTML =
        "<option value=''>-- Select category --</option>";
      [...categoriasSet].sort().forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        selectorCategorias.appendChild(opt);
      });

      // Inicializar select2 en el selector de categorías si está disponible
      if (window.jQuery && $.fn.select2) {
        $('#selectorCategoria').select2({
          width: 'resolve',
          placeholder: 'Filtrar por categoría',
          allowClear: true,
          closeOnSelect: false,
          tags: false
        });
      }

      const contenedorControles = document.querySelector(".controls-nube");

      const selectorPrivacidad = document.createElement("select");
      selectorPrivacidad.id = "selectorPrivacidad";
      selectorPrivacidad.innerHTML = `
          <option value="">-- Private account? --</option>
          <option value="true">Private</option>
          <option value="false">Public</option>
        `;
      contenedorControles.appendChild(selectorPrivacidad);

      const selectorVerificado = document.createElement("select");
      selectorVerificado.id = "selectorVerificado";
      selectorVerificado.innerHTML = `
          <option value="">-- Verified account? --</option>
          <option value="true">Verified</option>
          <option value="false">Not verified</option>
        `;
      contenedorControles.appendChild(selectorVerificado);

      // === Agregar botón de reinicio de filtros ===
      const botonReset = document.createElement("button");
      botonReset.id = "botonResetFiltros";
      botonReset.className = "btn-reset-filtros";
      botonReset.textContent = "Reset filters";
      contenedorControles.appendChild(botonReset);

      // === Evento click para reiniciar filtros ===
      botonReset.addEventListener("click", () => {
        // Deseleccionar todas las opciones del selectorCategorias
        Array.from(selectorCategorias.options).forEach(option => option.selected = false);
        selectorPrivacidad.value = "";
        selectorVerificado.value = "";
        selectorTipoCuenta.value = "";
        document.getElementById("selectorSentimiento").value = "";

        const slider = document.getElementById("frecuenciaSlider");
        const valorSlider = document.getElementById("frecuenciaValor");
        slider.value = 2;
        valorSlider.textContent = "2";

        // Usar window.perfilesCargadosGlobal si existe y tiene elementos, si no, window.ultimoPerfilesAnalizados, si no, perfilesSemillaGlobal
        const perfilesUsar = window.perfilesCargadosGlobal?.length
          ? window.perfilesCargadosGlobal
          : (window.ultimoPerfilesAnalizados?.length
            ? window.ultimoPerfilesAnalizados
            : perfilesSemillaGlobal);

        const textoBiografias = perfilesUsar
          .map((p) => p.biography || "")
          .join(" ");
        const textoNombres = perfilesUsar
          .map((p) => p.fullname || p.full_name || "")
          .filter((nombre) => nombre.trim().length > 0)
          .join(" ");

        procesarYActualizarWordCloudBiografias({
          texto: textoBiografias,
          sliderId: "frecuenciaSlider",
          valorSliderId: "frecuenciaValor",
          contenedorId: "contenedorWordCloud",
        });

        procesarYActualizarWordCloudBiografias({
          texto: textoNombres,
          sliderId: "frecuenciaSlider",
          valorSliderId: "frecuenciaValor",
          contenedorId: "contenedorWordCloudNombres",
        });
      });

      // Versión completamente nueva de aplicarFiltrosNube para actualizar las wordclouds según los perfiles filtrados
      const aplicarFiltrosNube = () => {
        const selectorCategorias = document.getElementById("selectorCategoria");
        const selectorPrivacidad = document.getElementById("selectorPrivacidad");
        const selectorVerificado = document.getElementById("selectorVerificado");
        const selectorTipoCuenta = document.getElementById("selectorTipoCuenta");
        const selectorSentimiento = document.getElementById("selectorSentimiento");

        const categoriasSeleccionadas = Array.from(selectorCategorias.selectedOptions).map((opt) => opt.value);
        const privacidadSeleccionada = selectorPrivacidad.value;
        const verificadoSeleccionado = selectorVerificado.value;
        const tipoCuentaSeleccionada = selectorTipoCuenta.value;
        const sentimientoSeleccionado = selectorSentimiento.value;

        const perfilesUsar = window.perfilesCargadosGlobal?.length
          ? window.perfilesCargadosGlobal
          : (window.ultimoPerfilesAnalizados?.length
            ? window.ultimoPerfilesAnalizados
            : perfilesSemillaGlobal);

        let perfilesFiltrados = perfilesUsar;

        // Filtrado por categorías
        if (categoriasSeleccionadas.length > 0) {
          perfilesFiltrados = perfilesFiltrados.filter((p) => {
            const categoriasPerfil = (p.business_category_name || "")
              .split(",")
              .map((c) => c.trim().toLowerCase())
              .filter(c => c !== "");
            return categoriasSeleccionadas.some(cat => categoriasPerfil.includes(cat.toLowerCase()));
          });
        }

        // Filtrado por privacidad
        if (privacidadSeleccionada !== "") {
          const isPrivado = privacidadSeleccionada === "true";
          perfilesFiltrados = perfilesFiltrados.filter((p) => p.private === isPrivado);
        }

        // Filtrado por verificación
        if (verificadoSeleccionado !== "") {
          const isVerificado = verificadoSeleccionado === "true";
          perfilesFiltrados = perfilesFiltrados.filter((p) => Boolean(p.verified) === isVerificado);
        }

        // Filtrado por tipo de cuenta (negocio/personal)
        if (tipoCuentaSeleccionada !== "") {
          const isBusiness = tipoCuentaSeleccionada === "true";
          perfilesFiltrados = perfilesFiltrados.filter((p) => Boolean(p.is_business) === isBusiness);
        }

        // Filtrado por sentimiento
        if (sentimientoSeleccionado !== "") {
          perfilesFiltrados = perfilesFiltrados.filter((p) => (p.sentiment || "").toUpperCase() === sentimientoSeleccionado);
        }

        // === ACTUALIZACIÓN WORDCLOUDS: Usar solo los perfiles filtrados ===
        // Actualizar WordClouds basado en perfiles filtrados
        const textoBiografias = perfilesFiltrados
          .map((p) => p.biography || "")
          .join(" ");

        const textoNombres = perfilesFiltrados
          .map((p) => p.fullname || p.full_name || "")
          .filter(nombre => nombre.trim().length > 0)
          .join(" ");

        // Regenerar WordCloud de biografías
        procesarYActualizarWordCloudBiografias({
          texto: textoBiografias,
          sliderId: "sliderBiografias",
          valorSliderId: "valorBiografias",
          contenedorId: "contenedorWordCloud",
        });

        // Regenerar WordCloud de nombres
        procesarYActualizarWordCloudBiografias({
          texto: textoNombres,
          sliderId: "sliderNombres",
          valorSliderId: "valorNombres",
          contenedorId: "contenedorWordCloudNombres",
        });

        // === FIN actualización wordclouds ===

        // === ACTUALIZACIÓN DE EMOJIS ===
        const frecuenciaEmojis = {};

        perfilesFiltrados.forEach(p => {
          let emojis = {};
          console.log("🔍 Procesando emojis para:", p.emoji_mas_comun);
          try {
            if (typeof p.emoji_mas_comun === 'string') {
              emojis = JSON.parse(p.emoji_mas_comun);
            } else if (typeof p.emoji_mas_comun === 'object' && p.emoji_mas_comun !== null) {
              emojis = p.emoji_mas_comun;
            }
          } catch (_) {}

          Object.entries(emojis).forEach(([emoji, count]) => {
            frecuenciaEmojis[emoji] = (frecuenciaEmojis[emoji] || 0) + count;
          });
        });

        console.log("📊 Datos emojis filtrados:", frecuenciaEmojis);

        const topEmojis = Object.entries(frecuenciaEmojis)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);
        
        // Si no hay emojis, poner uno neutro
        const datosEmojis = topEmojis.length > 0 ? topEmojis : [['🙂', 0]];
        
        if (datosEmojis.length === 0) {
          datosEmojis.push(['No emojis', 1]);
        }

        // Añadir log antes de crear el gráfico de barras de emojis
        console.log("📊 Datos para gráfico de emojis:", datosEmojis);

        crearGraficoBarras({
          contenedorId: 'grafico-emojis',
          titulo: 'Most used emojis',
          categorias: datosEmojis.map(e => e[0]),
          datos: datosEmojis.map(e => e[1]),
          color: '#3693b6',
          opcionesEjeX: {
            axisLabel: {
              fontSize: 12,
              rotate: 45,
              margin: 10
            }}
        });
        agregarDescripcionGrafico('grafico-emojis', 'This chart shows the most used emojis by the selected profiles, which can reflect emotional styles or frequent communication patterns.');

        // === ACTUALIZAR TARJETAS CUANTITATIVAS ===
        const totalPerfiles = perfilesFiltrados.length;
        const privados = perfilesFiltrados.filter(p => p.private).length;
        const verificados = perfilesFiltrados.filter(p => p.is_verified).length;
        const negocios = perfilesFiltrados.filter(p => p.is_business).length;

        const sentimientoPositivo = perfilesFiltrados.filter(p => (p.sentiment || "").toUpperCase() === "POSITIVO").length;
        const sentimientoNeutro = perfilesFiltrados.filter(p => (p.sentiment || "").toUpperCase() === "NEUTRO").length;
        const sentimientoNegativo = perfilesFiltrados.filter(p => (p.sentiment || "").toUpperCase() === "NEGATIVO").length;

        if (document.getElementById("tarjetaTotalPerfiles"))
          document.getElementById("tarjetaTotalPerfiles").innerHTML = `
            <strong>Total profiles:</strong> ${totalPerfiles.toLocaleString()}
          `;

        if (document.getElementById("tarjetaPrivacidad"))
          document.getElementById("tarjetaPrivacidad").innerHTML = `
            <strong>Privacy:</strong><br>
            Private: ${privados}<br>
            Public: ${totalPerfiles - privados}
          `;

        if (document.getElementById("tarjetaVerificacion"))
          document.getElementById("tarjetaVerificacion").innerHTML = `
            <strong>Verification:</strong><br>
            Verified: ${verificados}<br>
            Not verified: ${totalPerfiles - verificados}
          `;

        if (document.getElementById("tarjetaTipoCuenta"))
          document.getElementById("tarjetaTipoCuenta").innerHTML = `
            <strong>Account type:</strong><br>
            Business: ${negocios}<br>
            Personal: ${totalPerfiles - negocios}
          `;

        if (document.getElementById("tarjetaSentimiento"))
          document.getElementById("tarjetaSentimiento").innerHTML = `
            <strong>Sentiment:</strong><br>
            Positive: ${sentimientoPositivo}<br>
            Neutral: ${sentimientoNeutro}<br>
            Negative: ${sentimientoNegativo}
          `;

        // (Bloque de actualización dinámica de emojis eliminado para evitar duplicidad)

        // Luego actualizar el scatter plot con los perfiles filtrados
        crearGraficoScatter({
          contenedorId: "scatterFollowersPosts",
          titulo: "Followers",
          datos: perfilesFiltrados
        });
        agregarDescripcionGrafico('scatterFollowersPosts', 'Scatter plot relating follower count to number of posts per analyzed profile.');
      };

      selectorCategorias.addEventListener("change", aplicarFiltrosNube);
      // Añadir eventos select2:select y select2:unselect si select2 está disponible
      if (window.jQuery && $.fn.select2) {
        $('#selectorCategoria').on('select2:select select2:unselect', aplicarFiltrosNube);
      }
      selectorPrivacidad.addEventListener("change", aplicarFiltrosNube);
      selectorVerificado.addEventListener("change", aplicarFiltrosNube);
      document.getElementById("selectorTipoCuenta").addEventListener("change", aplicarFiltrosNube);
      document.getElementById("selectorSentimiento").addEventListener("change", aplicarFiltrosNube);

      // Generar nube inicial con todas las biografías
      const perfilesScatter = window.perfilesCargadosGlobal || [];

      const textoBiografias = perfilesScatter.map((p) => p.biography || "").join(" ");
      const textoNombres = perfilesScatter.map((p) => p.fullname || p.full_name || "").join(" ");
      
      procesarYActualizarWordCloudBiografias({
        texto: textoBiografias,
        sliderId: "sliderBiografias",
        valorSliderId: "valorBiografias",
        contenedorId: "contenedorWordCloud"
      });
      
      procesarYActualizarWordCloudBiografias({
        texto: textoNombres,
        sliderId: "sliderNombres",
        valorSliderId: "valorNombres",
        contenedorId: "contenedorWordCloudNombres"
      });

      // Ejecutar el análisis automáticamente después de poblar los perfiles y select2
      generarAnalisisInicial().then(() => {
        aplicarFiltrosNube();
      });
    })
    .catch((err) => {
      console.error("❌ Error al cargar perfiles semilla:", err);
    });

    let reglasSegmentacionUsuario = {
      "Students": ["university", "eafit", "student"],
      "Musicians": ["music", "band", "instrument"],
      "Gastronomy": ["food", "chef", "grill"]
    };
    
    function renderizarEditorReglas() {
      const editor = document.getElementById("editorReglasSegmentacion");
      editor.innerHTML = "";
    
      Object.entries(reglasSegmentacionUsuario).forEach(([categoria, palabras]) => {
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
          delete reglasSegmentacionUsuario[cat];
          renderizarEditorReglas();
        };
      });
    
      document.getElementById("agregarCategoria").onclick = () => {
        const nueva = document.getElementById("nuevaCategoria").value.trim();
        const palabras = document.getElementById("nuevasPalabras").value.split(",").map(p => p.trim()).filter(p => p);
        if (nueva && palabras.length > 0) {
          reglasSegmentacionUsuario[nueva] = palabras;
          renderizarEditorReglas();
          document.getElementById("nuevaCategoria").value = "";
          document.getElementById("nuevasPalabras").value = "";
        }
      };
    
      editor.querySelectorAll("input[data-categoria]").forEach(input => {
        input.onchange = () => {
          const cat = input.getAttribute("data-categoria");
          const palabras = input.value.split(",").map(p => p.trim()).filter(p => p);
          reglasSegmentacionUsuario[cat] = palabras;
        };
      });
    }
    
    const seccionGraficoSegmentacion = document.querySelector(".grafico-segmentacion");
    if (seccionGraficoSegmentacion) {
      const btnSegmentar = document.createElement("button");
      btnSegmentar.textContent = "Segment audience";
      btnSegmentar.style.marginBottom = "1rem";
      btnSegmentar.style.padding = "0.5rem 1rem";
      btnSegmentar.style.backgroundColor = "#388e3c";
      btnSegmentar.style.color = "white";
      btnSegmentar.style.border = "none";
      btnSegmentar.style.borderRadius = "5px";
      btnSegmentar.style.cursor = "pointer";
      btnSegmentar.onclick = () => realizarSegmentacionAudiencia(reglasSegmentacionUsuario);
      seccionGraficoSegmentacion.insertBefore(btnSegmentar, seccionGraficoSegmentacion.querySelector("div"));
    
      const editor = document.createElement("div");
      editor.id = "editorReglasSegmentacion";
      editor.style.marginTop = "1rem";
      seccionGraficoSegmentacion.insertBefore(editor, seccionGraficoSegmentacion.querySelector("div"));
      renderizarEditorReglas();
    }
}

async function cargarGraficosSentimiento() {
  try {
    const selector = document.getElementById("selectorPerfil");
    const fuentesSeleccionadas = Array.from(selector.selectedOptions).map(opt => opt.value);

    if (fuentesSeleccionadas.length === 0) return;

    const res = await fetch('/api/ranchera/analisis-sentimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fuentes: fuentesSeleccionadas })
    });

    const data = await res.json();

    const conteoSentimiento = { POSITIVO: 0, NEGATIVO: 0, NEUTRO: 0 };
    const frecuenciaEmojis = {};
    const palabras = {};

    data.forEach(p => {
      conteoSentimiento[p.sentiment] = (conteoSentimiento[p.sentiment] || 0) + 1;

      // --- BLOQUE CORREGIDO PARA EMOJIS ---
      let emojis = {};
      try {
        if (typeof p.emoji_mas_comun === 'string') {
          emojis = JSON.parse(p.emoji_mas_comun);
        } else if (typeof p.emoji_mas_comun === 'object' && p.emoji_mas_comun !== null) {
          emojis = p.emoji_mas_comun;
        }
      } catch (_) {}

      Object.entries(emojis).forEach(([emoji, count]) => {
        frecuenciaEmojis[emoji] = (frecuenciaEmojis[emoji] || 0) + count;
      });
      // --- FIN BLOQUE CORREGIDO ---

      // === BLOQUE PARA PALABRAS POR SENTIMIENTO (más robusto) ===
      try {
        let keys = [];
        if (typeof p.keywords === 'string') {
          keys = JSON.parse(p.keywords);
        } else if (Array.isArray(p.keywords)) {
          keys = p.keywords;
        }

        const etiqueta = p.sentiment;
        if (!palabras[etiqueta]) palabras[etiqueta] = {};

        keys.forEach(k => {
          palabras[etiqueta][k] = (palabras[etiqueta][k] || 0) + 1;
        });
      } catch (error) {
        console.warn("⚠️ No se pudieron procesar keywords para:", p.username, error);
      }
      // === FIN BLOQUE ===
    });

    const topEmojis = Object.entries(frecuenciaEmojis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    crearGraficoPie({
      contenedorId: 'grafico-pie-sentimiento',
      titulo: 'Sentiment distribution',
      datos: Object.entries(conteoSentimiento).map(([name, value]) => ({ name, value }))
    });
    agregarDescripcionGrafico('grafico-pie-sentimiento', 'Distribución del sentimiento predominante detectado en los comentarios asociados a los perfiles seleccionados.');

    // Si no hay emojis encontrados, crear uno genérico para evitar que el gráfico quede vacío
    const datosEmojis = topEmojis.length > 0 ? topEmojis : [['🙂', 0]];

    crearGraficoBarras({
      contenedorId: 'grafico-emojis',
      titulo: 'Most used emojis',
      categorias: datosEmojis.map(e => e[0]),
      datos: datosEmojis.map(e => e[1]),
      color: '#3693b6',
      opcionesEjeX: {
        axisLabel: {
          fontSize: 12,
          rotate: 45,
          margin: 10
        }}
    });
    agregarDescripcionGrafico('grafico-emojis', 'This chart shows the most used emojis by the selected profiles, which can reflect emotional styles or frequent communication patterns.');

    const mapeoContenedores = {
      POSITIVO: "contenedorWordCloudPositivo",
      NEUTRO: "contenedorWordCloudNeutro",
      NEGATIVO: "contenedorWordCloudNegativo"
    };

    ['POSITIVO', 'NEGATIVO', 'NEUTRO'].forEach(sent => {
      const cloud = Object.entries(palabras[sent] || {}).map(([text, weight]) => ({ text, weight: parseInt(weight) }));
      // console.log(`🔠 Nube ${sent}:`, cloud);
      // console.log(`🚀 Llamando crearWordCloud para ${sent} con ${cloud.length} palabras`);
      const sliderId = `slider${sent.charAt(0) + sent.slice(1).toLowerCase()}`;
      const valorId = `valor${sent.charAt(0) + sent.slice(1).toLowerCase()}`;
      
      const actualizar = () => {
        const min = parseInt(document.getElementById(sliderId).value);
        document.getElementById(valorId).textContent = min;
        const filtradas = cloud.filter(p => p.weight >= min);
        crearWordCloud({
          contenedorId: mapeoContenedores[sent],
          palabras: filtradas
        });
        // Descripción para nubes de palabras por sentimiento
        let txt = '';
        if (sent === 'POSITIVO') txt = 'Nube de palabras positivas extraídas de los comentarios. Las palabras más grandes son las más frecuentes en el sentimiento positivo.';
        if (sent === 'NEUTRO') txt = 'Nube de palabras neutras extraídas de los comentarios. Las palabras más grandes son las más frecuentes en el sentimiento neutro.';
        if (sent === 'NEGATIVO') txt = 'Nube de palabras negativas extraídas de los comentarios. Las palabras más grandes son las más frecuentes en el sentimiento negativo.';
        agregarDescripcionGrafico(mapeoContenedores[sent], txt);
      };
      
      document.getElementById(sliderId).removeEventListener('input', actualizar);
      document.getElementById(sliderId).addEventListener('input', actualizar);
      actualizar();
    });

  } catch (error) {
    console.error("❌ Error al renderizar gráficos de sentimiento:", error);
  }
}

window.descargarWordCloud = function(id) {
  const contenedor = document.getElementById(id);
  if (!contenedor) return;
  const chart = echarts.getInstanceByDom(contenedor);
  if (!chart) {
    console.warn("No se encontró instancia ECharts en:", id);
    return;
  }
  const url = chart.getDataURL({ type: 'png' });
  const link = document.createElement("a");
  link.href = url;
  link.download = `${id}.png`;
  link.click();
};

// === Segmentación de audiencia ===
async function realizarSegmentacionAudiencia(reglas = reglasSegmentacionUsuario) {
  const selector = document.getElementById("selectorPerfil");
  const fuentesSeleccionadas = Array.from(selector.selectedOptions).map(opt => opt.value);

  if (fuentesSeleccionadas.length === 0) {
    alert("Por favor, selecciona al menos un perfil semilla antes de segmentar.");
    return;
  }

  let data = [];
  try {
    const res = await fetch("/api/ranchera/segmentacion-audiencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fuentes: fuentesSeleccionadas, reglas })
    });
    data = await res.json();
   // console.log("📊 Segmentación de audiencia:", data);

    data.forEach(p => {
      const tarjeta = document.querySelector(`[data-username="${p.username}"]`)?.closest(".tarjeta-indicador");
      if (tarjeta) {
        const span = document.createElement("span");
        span.textContent = `🔖 ${p.categoria_detectada}`;
        span.style.display = "block";
        span.style.marginTop = "0.5rem";
        tarjeta.querySelector("div").appendChild(span);
      }
    });
  } catch (error) {
    console.error("❌ Error en segmentación de audiencia:", error);
  }

  const conteoPorCategoria = {};
  data.forEach(p => {
    conteoPorCategoria[p.categoria_detectada] = (conteoPorCategoria[p.categoria_detectada] || 0) + 1;
  });

  const categorias = Object.keys(conteoPorCategoria);
  const valores = categorias.map(c => conteoPorCategoria[c]);

  crearGraficoBarras({
    contenedorId: 'grafico-segmentacion-audiencia',
    titulo: 'Profiles by category',
    categorias,
    datos: valores
  });
  agregarDescripcionGrafico('grafico-segmentacion-audiencia', 'Este gráfico muestra la cantidad de perfiles detectados en cada categoría según la segmentación de audiencia.');

  // === NUEVO BLOQUE: Gráfico de sentimiento por categoría ===
  const responseAnalisis = await fetch('/api/ranchera/analisis-sentimiento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fuentes: fuentesSeleccionadas })
  });

  const analisis = await responseAnalisis.json();
  const sentimientosPorCategoria = {};

  data.forEach(perfil => {
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
      title: { text: 'Sentiment by detected category', left: 'center' },
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
    // Descripción para gráfico de sentimiento por categoría
    agregarDescripcionGrafico('grafico-sentimiento-por-categoria', 'Predominant sentiment per category detected in audience segmentation.');
  }

  // === NUEVO BLOQUE: Red de segmentación por sentimiento con ECharts ===
  generarRedSegmentacionSentimiento({
    perfiles: data,
    analisis: analisis
  }, 'contenedorRedSegmentacion');

  // === NUEVO BLOQUE: WordCloud por sentimiento y categoría combinados ===
  const palabrasSegmentadas = {};

  analisis.forEach(p => {
    const categoria = data.find(d => d.username === p.username)?.categoria_detectada || 'Sin categoría';
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

  // === Agregar selector dinámico para elegir categoría (sin duplicados) ===
  let selectCategoriaSegmentada = document.getElementById("selectorCategoriaSegmentada");

  if (!selectCategoriaSegmentada) {
    selectCategoriaSegmentada = document.createElement("select");
    selectCategoriaSegmentada.id = "selectorCategoriaSegmentada";
    selectCategoriaSegmentada.style.marginBottom = "1rem";
    const seccionNubesSegmentadas = document.querySelector(".nube-palabras-por-segmento");
    seccionNubesSegmentadas.insertBefore(selectCategoriaSegmentada, seccionNubesSegmentadas.querySelector(".sliders-sentimiento"));
  }

  selectCategoriaSegmentada.innerHTML = Object.keys(palabrasSegmentadas)
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join("");

  const sentimMap = {
    POSITIVO: 'contenedorWordCloudSegmentoPositivo',
    NEUTRO: 'contenedorWordCloudSegmentoNeutro',
    NEGATIVO: 'contenedorWordCloudSegmentoNegativo'
  };

  selectCategoriaSegmentada.addEventListener("change", () => {
    const categoriaSeleccionada = selectCategoriaSegmentada.value;
    Object.entries(sentimMap).forEach(([sent, contenedor]) => {
      const min = parseInt(document.getElementById(`sliderSegmento${sent.charAt(0) + sent.slice(1).toLowerCase()}`).value);
      const palabrasCrudas = palabrasSegmentadas[categoriaSeleccionada]?.[sent] || {};
      const filtradas = Object.entries(palabrasCrudas)
        .filter(([, count]) => count >= min)
        .map(([text, weight]) => ({ text, weight }));
      crearWordCloud({ contenedorId: contenedor, palabras: filtradas });
      // Descripción para nubes de palabras por sentimiento y categoría
      let txt = '';
      if (sent === 'POSITIVO') txt = 'Nube de palabras positivas extraídas de los perfiles de esta categoría. Las palabras más grandes son las más frecuentes en el sentimiento positivo.';
      if (sent === 'NEUTRO') txt = 'Nube de palabras neutras extraídas de los perfiles de esta categoría. Las palabras más grandes son las más frecuentes en el sentimiento neutro.';
      if (sent === 'NEGATIVO') txt = 'Nube de palabras negativas extraídas de los perfiles de esta categoría. Las palabras más grandes son las más frecuentes en el sentimiento negativo.';
      agregarDescripcionGrafico(contenedor, txt);
    });
  });

  // Inicializar nubes con la primera categoría seleccionada
  document.getElementById("selectorCategoriaSegmentada").dispatchEvent(new Event("change"));
  const contenedorResumenSegmentacion = document.querySelector(".nube-palabras-por-segmento");
  let contenedorTopPerfiles = document.getElementById("topPerfilesPorSegmento");
  if (!contenedorTopPerfiles) {
    contenedorTopPerfiles = document.createElement("div");
    contenedorTopPerfiles.id = "topPerfilesPorSegmento";
    contenedorResumenSegmentacion.appendChild(contenedorTopPerfiles);
  }
  contenedorTopPerfiles.innerHTML = "<h3>Top 5 por categoría</h3>";

  // === Selector de criterio de orden dinámico ===
  let selectorCriterio = document.getElementById("selectorCriterioTop");
  if (!selectorCriterio) {
    selectorCriterio = document.createElement("select");
    selectorCriterio.id = "selectorCriterioTop";
    selectorCriterio.style.margin = "1rem 0";
    selectorCriterio.innerHTML = `
      <option value="followers_count">Most followers</option>
      <option value="emoji_density">Highest emoji density</option>
      <option value="positive">Highest positive score</option>
      <option value="negative">Highest negative score</option>
      <option value="cantidad_keywords">Most keywords</option>
    `;
    contenedorTopPerfiles.insertBefore(selectorCriterio, contenedorTopPerfiles.firstChild);
  }

  // Agrupar perfiles por categoría detectada
  const perfilesPorCategoria = {};
  analisis.forEach(p => {
    const cat = data.find(d => d.username === p.username)?.categoria_detectada || "Sin categoría";
    if (!perfilesPorCategoria[cat]) perfilesPorCategoria[cat] = [];
    perfilesPorCategoria[cat].push(p);
  });

  // === Calcular cantidad_keywords para cada perfil antes de ordenar ===
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
    });
  });

  // === Asegurar followers_count para ordenamiento (puede venir como followers, followers_count, o 0) ===
  Object.values(perfilesPorCategoria).forEach(perfiles => {
    perfiles.forEach(p => {
      p.followers_count = p.followers ?? p.followers_count ?? 0;
    });
  });

  // Criterio de orden
  let criterio = selectorCriterio.value;

  Object.entries(perfilesPorCategoria).forEach(([categoria, perfiles]) => {
    const top5 = perfiles
      .sort((a, b) => (b[criterio] || 0) - (a[criterio] || 0))
      .slice(0, 5);

    const bloque = document.createElement("div");
    bloque.innerHTML = `<h4>${categoria}</h4>`;
    bloque.className = "bloque-categoria";
    bloque.style.marginBottom = "1rem";

    const tarjetas = top5.map(p => `
      <div class="tarjeta-indicador" style="margin-bottom: 0.75rem;">
        <div>
          <strong>@${p.username}</strong><br/>
          Followers: ${p.followers?.toLocaleString("es-CO") || '--'}<br/>
          Sentiment: ${p.sentiment || 'NEUTRAL'}<br/>
          <div style="font-size: 0.8rem; margin-top: 0.3rem;">
            <strong>Bio:</strong> ${p.biography || 'No biography'}<br/>
            <strong>Keywords:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
            <strong>Analysis:</strong> ${p.interpretation || '--'}
          </div>
        </div>
      </div>
    `).join("");

    bloque.innerHTML += tarjetas;
    contenedorTopPerfiles.appendChild(bloque);
  });

  // Listener para actualizar el bloque al cambiar el selector
  selectorCriterio.addEventListener("change", () => {
    contenedorTopPerfiles.innerHTML = "<h3>Top 5 por categoría</h3>";
    contenedorTopPerfiles.insertBefore(selectorCriterio, contenedorTopPerfiles.firstChild);

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
        <div class="tarjeta-indicador" style="margin-bottom: 0.75rem;">
          <div>
            <strong>@${p.username}</strong><br/>
            Followers: ${p.followers?.toLocaleString("es-CO") || '--'}<br/>
            Sentiment: ${p.sentiment || 'NEUTRAL'}<br/>
            <div style="font-size: 0.8rem; margin-top: 0.3rem;">
              <strong>Bio:</strong> ${p.biography || 'No biography'}<br/>
              <strong>Keywords:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
              <strong>Analysis:</strong> ${p.interpretation || '--'}
            </div>
          </div>
        </div>
      `).join("");

      bloque.innerHTML += tarjetas;
      contenedorTopPerfiles.appendChild(bloque);
    });
  });
}
// === Lógica de análisis de perfiles, ejecutada automáticamente ===
function generarAnalisisInicial() {
  const selector = document.getElementById("selectorPerfil");
  // Obtener todos los fuente_id seleccionados, o si no hay selección, todos los fuente_id de perfilesSemillaGlobal
  let seleccionados = Array.from(selector.selectedOptions).map((opt) => opt.value);
  if (seleccionados.length === 0) {
    // Si no hay selección, usar todos los fuente_id de las semillas
    seleccionados = (window.perfilesSemillaGlobal || perfilesSemillaGlobal || []).map(p => p.fuente_id);
  }
  // Si sigue vacío, no continuar
  if (!seleccionados || seleccionados.length === 0) {
    console.warn("⚠️ No profiles selected for analysis.");
    return;
  }
  fetch("/api/ranchera/perfiles-por-fuente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fuentes: seleccionados }),
  })
    .then((res) => res.json())
    .then((perfiles) => {
      window.ultimoPerfilesAnalizados = perfiles;
      window.perfilesCargadosGlobal = perfiles; // Guardar para filtros posteriores
      return perfiles;
    })
    .then((perfiles) => {
      // Extraer y poblar el selector de categorías desde perfiles
      const categoriasSet = new Set();
      perfiles.forEach((p) => {
        const categorias = (p.business_category_name || "")
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c && c.toLowerCase() !== "none");
        categorias.forEach((cat) => categoriasSet.add(cat));
      });

      const selectorCategorias =
        document.getElementById("selectorCategoria");
      selectorCategorias.innerHTML =
        "<option value=''>-- Select category --</option>";
      [...categoriasSet].sort().forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        selectorCategorias.appendChild(opt);
      });

      const biografiasTexto = perfiles
        .map((p) => p.biography || "")
        .join(" ");
      procesarYActualizarWordCloudBiografias({
        texto: biografiasTexto,
        sliderId: "frecuenciaSlider",
        valorSliderId: "frecuenciaValor",
        contenedorId: "contenedorWordCloud",
      });

      const nombresTexto = perfiles.map((p) => p.fullname || "").join(" ");
      procesarYActualizarWordCloudBiografias({
        texto: nombresTexto,
        sliderId: "frecuenciaSlider",
        valorSliderId: "frecuenciaValor",
        contenedorId: "contenedorWordCloudNombres",
      });

      // Obtener las semillas seleccionadas para el resumen
      const semillasSeleccionadas = seleccionados.map((fuenteId) =>
        (window.perfilesSemillaGlobal || perfilesSemillaGlobal || []).find((p) => p.fuente_id == fuenteId) || {}
      );
      const data = { top3: semillasSeleccionadas };

      const contenedorRed = document.getElementById("contenedorRed");
      contenedorRed.innerHTML = "";
    //  console.log("🔍 Datos enviados a la red:", {
     //   semillas: data.top3,
     //   perfiles,
     // });
      generarRedPerfiles(
        { semillas: data.top3, perfiles },
        "contenedorRed"
      );

      crearGraficoScatter({
        contenedorId: "scatterFollowersPosts",
        titulo: "Followers",
        datos: perfiles,
      });
      agregarDescripcionGrafico('scatterFollowersPosts', 'Scatter plot relating follower count to number of posts per analyzed profile.');

      // 🔥 Forzar primer despliegue de Emojis aunque esté vacío
crearGraficoBarras({
  contenedorId: 'grafico-emojis',
  titulo: 'Most used emojis',
  categorias: ['🙂'],
  datos: [0],
  color: '#3693b6',
  opcionesEjeX: {
    axisLabel: {
      fontSize: 30,
      rotate: 0,
      margin: 10
    }}
});
agregarDescripcionGrafico('grafico-emojis', 'This chart shows the most used emojis by the selected profiles, which can reflect emotional styles or frequent communication patterns.');

      // 🚀 Crear WordClouds de inmediato con los datos del scatter
const textoBiografias = perfiles.map((p) => p.biography || "").join(" ");
const textoNombres = perfiles.map((p) => p.fullname || p.full_name || "").join(" ");

// 🚀 Crear tarjetas cuantitativas de inmediato con los datos del scatter
const totalPerfiles = perfiles.length;
const privados = perfiles.filter(p => p.private).length;
const verificados = perfiles.filter(p => p.is_verified).length;
const negocios = perfiles.filter(p => p.is_business).length;

const sentimientoPositivo = perfiles.filter(p => (p.sentiment || "").toUpperCase() === "POSITIVO").length;
const sentimientoNeutro = perfiles.filter(p => (p.sentiment || "").toUpperCase() === "NEUTRO").length;
const sentimientoNegativo = perfiles.filter(p => (p.sentiment || "").toUpperCase() === "NEGATIVO").length;

if (document.getElementById("tarjetaTotalPerfiles"))
  document.getElementById("tarjetaTotalPerfiles").innerHTML = `
    <strong>Total profiles:</strong> ${totalPerfiles.toLocaleString()}
  `;

if (document.getElementById("tarjetaPrivacidad"))
  document.getElementById("tarjetaPrivacidad").innerHTML = `
    <strong>Privacy:</strong><br>
    Private: ${privados}<br>
    Public: ${totalPerfiles - privados}
  `;

if (document.getElementById("tarjetaVerificacion"))
  document.getElementById("tarjetaVerificacion").innerHTML = `
    <strong>Verification:</strong><br>
    Verified: ${verificados}<br>
    Not verified: ${totalPerfiles - verificados}
  `;

if (document.getElementById("tarjetaTipoCuenta"))
  document.getElementById("tarjetaTipoCuenta").innerHTML = `
    <strong>Account type:</strong><br>
    Business: ${negocios}<br>
    Personal: ${totalPerfiles - negocios}
  `;

if (document.getElementById("tarjetaSentimiento"))
  document.getElementById("tarjetaSentimiento").innerHTML = `
    <strong>Sentiment:</strong><br>
    Positive: ${sentimientoPositivo}<br>
    Neutral: ${sentimientoNeutro}<br>
    Negative: ${sentimientoNegativo}
  `;

procesarYActualizarWordCloudBiografias({
  texto: textoBiografias,
  sliderId: "sliderBiografias",
  valorSliderId: "valorBiografias",
  contenedorId: "contenedorWordCloud",
});

agregarDescripcionGrafico('contenedorWordCloud', 'Nube de palabras extraídas de las biografías de los perfiles. Las palabras más grandes son las más frecuentes.');

procesarYActualizarWordCloudBiografias({
  texto: textoNombres,
  sliderId: "sliderNombres",
  valorSliderId: "valorNombres",
  contenedorId: "contenedorWordCloudNombres",
});
agregarDescripcionGrafico('contenedorWordCloudNombres', 'Word cloud from profile names. Larger words are the most frequent names.');
      // Llamar a los gráficos de sentimiento tras el análisis
      cargarGraficosSentimiento();

      // Llamar también a aplicarFiltrosNube() para inicializar todos los gráficos, incluido el de Emojis
      if (typeof aplicarFiltrosNube === "function") {
        aplicarFiltrosNube();
      }


    })
    .catch((err) => {
      console.error("❌ Error cargando biografías por fuente_id:", err);
    });
}