import { procesarYActualizarWordCloudBiografias, crearWordCloud } from "./utils/wordClouds.js";
import { generarRedPerfiles } from "./utils/redes.js";
import { crearGraficoScatter, crearGraficoPie, crearGraficoBarras } from "./utils/charts.js";
import { generarRedSegmentacionSentimiento } from "./utils/redes.js";


let perfilesSemillaGlobal = []; // Declarar al inicio del archivo para usar globalmente

export function inicializarVistaPerfiles() {
  console.log("✅ Vista de perfiles inicializada");

  const selector = document.getElementById("selectorPerfil");
  const resumenContainer = document.getElementById("resumenPerfil");

  if (!selector || !resumenContainer) {
    console.error("❌ Elementos no encontrados en el DOM.");
    return;
  }

  // Obtener perfiles semilla desde el backend
  fetch("/api/ranchera/indicadores-semilla")
    .then((response) => response.json())

    .then((data) => {
      if (!Array.isArray(data.top3)) {
        console.error("❌ Estructura inesperada en la respuesta:", data);
        return;
      }
      // console.log("Perfiles semillaffff:", data.top3);
      document.getElementById("totalSeguidores").textContent =
        data.total.toLocaleString("es-CO");
      document.getElementById("promedioSeguidores").textContent = Number(
        data.promedio.followers_count
      ).toLocaleString("es-CO");
      document.getElementById("seguidoresCompartidos").textContent = "--";
      document.getElementById("porcentajeBots").textContent = "--";

      const perfiles = data.top3;
      perfilesSemillaGlobal = perfiles;
      window.perfilesSemillaGlobal = perfilesSemillaGlobal;
      selector.innerHTML = "";
      perfiles.forEach((p) => {
        if (p.fuente_id !== undefined && p.fuente_id !== null) {
          const option = document.createElement("option");
          option.value = p.fuente_id;
          option.setAttribute("data-username", p.username);
          option.textContent = `${p.full_name || "Sin nombre"} (@${
            p.username
          })`;
          option.selected = true;
          selector.appendChild(option);
        }
      });

      const selectorTipoCuenta = document.createElement("select");
      selectorTipoCuenta.id = "selectorTipoCuenta";
      selectorTipoCuenta.innerHTML = `
          <option value="">-- ¿Es cuenta de negocio? --</option>
          <option value="true">Cuenta de negocio</option>
          <option value="false">Cuenta personal</option>
        `;
      document.querySelector(".controls-nube").appendChild(selectorTipoCuenta);

      selectorTipoCuenta.addEventListener("change", () => {
        const categoriasSeleccionadas = Array.from(
          selectorCategorias.selectedOptions
        ).map((opt) => opt.value);
        const privacidadSeleccionada =
          document.getElementById("selectorPrivacidad").value;
        const tipoCuentaSeleccionada = selectorTipoCuenta.value;

        const perfilesUsar = document
          .getElementById("resumenPerfil")
          .querySelector(".indicadores-perfiles")
          ? window.ultimoPerfilesAnalizados || []
          : perfilesSemillaGlobal;

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
        const categoria = (p.business_category_name || "")
          .split(",")
          .map((c) => c.trim())
          .find((c) => c && c.toLowerCase() !== "none");
        if (categoria) categoriasSet.add(categoria);
      });

      const selectorCategorias = document.getElementById("selectorCategoria");
      selectorCategorias.innerHTML =
        "<option value=''>-- Seleccione categoría --</option>";
      [...categoriasSet].sort().forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        selectorCategorias.appendChild(opt);
      });

      const contenedorControles = document.querySelector(".controls-nube");

      const selectorPrivacidad = document.createElement("select");
      selectorPrivacidad.id = "selectorPrivacidad";
      selectorPrivacidad.innerHTML = `
          <option value="">-- Cuenta privada o no --</option>
          <option value="true">Privado</option>
          <option value="false">Público</option>
        `;
      contenedorControles.appendChild(selectorPrivacidad);

      const selectorVerificado = document.createElement("select");
      selectorVerificado.id = "selectorVerificado";
      selectorVerificado.innerHTML = `
          <option value="">-- Cuenta verificada o no --</option>
          <option value="true">Verificada</option>
          <option value="false">No verificada</option>
        `;
      contenedorControles.appendChild(selectorVerificado);

      // === Agregar botón de reinicio de filtros ===
      const botonReset = document.createElement("button");
      botonReset.id = "botonResetFiltros";
      botonReset.textContent = "Reiniciar filtros";
      contenedorControles.appendChild(botonReset);

      // === Evento click para reiniciar filtros ===
      botonReset.addEventListener("click", () => {
        selectorCategorias.selectedIndex = -1;
        selectorPrivacidad.value = "";
        selectorVerificado.value = "";
        selectorTipoCuenta.value = "";

        const slider = document.getElementById("frecuenciaSlider");
        const valorSlider = document.getElementById("frecuenciaValor");
        slider.value = 2;
        valorSlider.textContent = "2";

        // Usar window.ultimoPerfilesAnalizados si existe y tiene elementos, si no, usar perfilesSemillaGlobal
        const perfilesUsar = window.ultimoPerfilesAnalizados?.length
          ? window.ultimoPerfilesAnalizados
          : perfilesSemillaGlobal;

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

      const aplicarFiltrosNube = () => {
        const categoriasSeleccionadas = Array.from(
          selectorCategorias.selectedOptions
        ).map((opt) => opt.value);
        const privacidadSeleccionada =
          document.getElementById("selectorPrivacidad").value;
        const verificadoSeleccionado =
          document.getElementById("selectorVerificado").value;

        const perfilesUsar = document
          .getElementById("resumenPerfil")
          .querySelector(".indicadores-perfiles")
          ? window.ultimoPerfilesAnalizados || []
          : perfilesSemillaGlobal;

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

        if (verificadoSeleccionado !== "") {
          const isVerificado = verificadoSeleccionado === "true";
          perfilesFiltrados = perfilesFiltrados.filter(
            (p) => Boolean(p.verified) === isVerificado
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
          .map((p) => p.fullname || p.full_name || "")
          .filter((nombre) => nombre.trim().length > 0)
          .join(" ");

        procesarYActualizarWordCloudBiografias({
          texto: textoNombres,
          sliderId: "frecuenciaSlider",
          valorSliderId: "frecuenciaValor",
          contenedorId: "contenedorWordCloudNombres",
        });
      };

      selectorCategorias.addEventListener("change", aplicarFiltrosNube);
      selectorPrivacidad.addEventListener("change", aplicarFiltrosNube);
      selectorVerificado.addEventListener("change", aplicarFiltrosNube);

      // Generar nube inicial con todas las biografías
      const biografiasTextoGeneral = perfiles
        .map((p) => p.biography || "")
        .join(" ");
      procesarYActualizarWordCloudBiografias({
        texto: biografiasTextoGeneral,
        sliderId: "frecuenciaSlider",
        valorSliderId: "frecuenciaValor",
        contenedorId: "contenedorWordCloud",
      });

      // Generar nube inicial con todos los nombres completos
      const nombresTextoGeneral = perfiles
        .map((p) => p.full_name || "")
        .join(" ");
      procesarYActualizarWordCloudBiografias({
        texto: nombresTextoGeneral,
        sliderId: "frecuenciaSlider",
        valorSliderId: "frecuenciaValor",
        contenedorId: "contenedorWordCloudNombres",
      });
    })
    .catch((err) => {
      console.error("❌ Error al cargar perfiles semilla:", err);
    });

  document
    .getElementById("generarAnalisisBtn")
    .addEventListener("click", () => {
      const seleccionados = Array.from(selector.selectedOptions).map(
        (opt) => opt.value
      );
      console.log("🎯 Fuente ID seleccionados:", seleccionados);
      let data;

      fetch("/api/ranchera/perfiles-por-fuente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fuentes: seleccionados }),
      })
        .then((res) => res.json())
        .then((perfiles) => {
          window.ultimoPerfilesAnalizados = perfiles;
          return perfiles;
        })
        .then((json) => {
          const semillasSeleccionadas = Array.from(
            selector.selectedOptions
          ).map((opt) => {
            const fuenteId = opt.value;
            return (
              perfilesSemillaGlobal.find((p) => p.fuente_id == fuenteId) || {}
            );
          });
          data = { top3: semillasSeleccionadas };
          return json;
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
            "<option value=''>-- Seleccione categoría --</option>";
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

          const contenedorRed = document.getElementById("contenedorRed");
          contenedorRed.innerHTML = "";
          console.log("🔍 Datos enviados a la red:", {
            semillas: data.top3,
            perfiles,
          });
          generarRedPerfiles(
            { semillas: data.top3, perfiles },
            "contenedorRed"
          );

          crearGraficoScatter({
            contenedorId: "scatterFollowersPosts",
            titulo: "Seguidores vs. Publicaciones",
            datos: perfiles,
          });
          // Llamar a los gráficos de sentimiento tras el análisis
          cargarGraficosSentimiento();

          const tarjetasHTML = Array.from(selector.selectedOptions)
            .map((option) => {
              const username = option.getAttribute("data-username");
              const fuenteId = option.value;
              const perfilSemilla = data.top3.find(
                (p) => p.fuente_id == fuenteId
              );
              // console.log("Perfil semilla:", perfilSemilla);
              return `
              <a href="https://instagram.com/${username}" target="_blank" style="text-decoration: none; color: inherit;">
                <div class="tarjeta-indicador">
                  <img src="/api/ranchera/proxy-img?url=${encodeURIComponent(
                    perfilSemilla.profile_pic_url ||
                      perfilSemilla.profile_pic_url_hd ||
                      ""
                  )}" alt="${username}" style="width: 48px; height: 48px; border-radius: 50%;">
                  <div>
                    <strong>${
                      perfilSemilla.full_name || "Sin nombre completo"
                    }</strong>
                    <span>@${username} ${
                perfilSemilla.verified
                  ? '<i class="fa fa-check-circle" style="color:#1da1f2;" title="Verificado"></i>'
                  : ""
              }</span><br>
                    <span>${perfiles
                      .filter((p) => p.fuente_id == fuenteId)
                      .length.toLocaleString(
                        "es-CO"
                      )} perfiles analizados</span>
                  </div>
                </div>
              </a>
            `;
            })
            .join("");

          const resumenContenedor = document.getElementById("resumenPerfil");
          let contenedorTarjetas = resumenContenedor.querySelector(
            ".indicadores-perfiles"
          );

          if (!contenedorTarjetas) {
            const titulo = document.createElement("h3");
            titulo.textContent = "Perfiles disponibles por semilla";
            contenedorTarjetas = document.createElement("div");
            contenedorTarjetas.className = "indicadores-perfiles";
            resumenContenedor.appendChild(titulo);
            resumenContenedor.appendChild(contenedorTarjetas);
          }

          contenedorTarjetas.innerHTML = tarjetasHTML;
        })
        .catch((err) => {
          console.error("❌ Error cargando biografías por fuente_id:", err);
        });
    });

    let reglasSegmentacionUsuario = {
      "Estudiantes": ["universidad", "eafit", "estudiante"],
      "Músicos": ["música", "banda", "instrumento"],
      "Gastronomía": ["comida", "chef", "asado"]
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
        <input type="text" placeholder="Nueva categoría" id="nuevaCategoria" style="width:20%;" />
        <input type="text" placeholder="Palabras clave separadas por coma" id="nuevasPalabras" style="width:60%;" />
        <button id="agregarCategoria">➕ Añadir</button>
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
      btnSegmentar.textContent = "Segmentar audiencia";
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
      titulo: 'Distribución de sentimiento',
      datos: Object.entries(conteoSentimiento).map(([name, value]) => ({ name, value }))
    });

    crearGraficoBarras({
      contenedorId: 'grafico-emojis',
      titulo: 'Emojis más usados',
      categorias: topEmojis.map(e => e[0]),
      datos: topEmojis.map(e => e[1]),
      color: '#FF9800'
    });

    const mapeoContenedores = {
      POSITIVO: "contenedorWordCloudPositivo",
      NEUTRO: "contenedorWordCloudNeutro",
      NEGATIVO: "contenedorWordCloudNegativo"
    };

    ['POSITIVO', 'NEGATIVO', 'NEUTRO'].forEach(sent => {
      const cloud = Object.entries(palabras[sent] || {}).map(([text, weight]) => ({ text, weight: parseInt(weight) }));
      console.log(`🔠 Nube ${sent}:`, cloud);
      console.log(`🚀 Llamando crearWordCloud para ${sent} con ${cloud.length} palabras`);
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
    console.log("📊 Segmentación de audiencia:", data);

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
    titulo: 'Perfiles por categoría',
    categorias,
    datos: valores
  });

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
      <option value="followers_count">Más seguidores</option>
      <option value="emoji_density">Mayor densidad de emojis</option>
      <option value="positive">Mayor puntuación positiva</option>
      <option value="negative">Mayor puntuación negativa</option>
      <option value="cantidad_keywords">Más palabras clave</option>
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
          Seguidores: ${p.followers?.toLocaleString("es-CO") || '--'}<br/>
          Sentimiento: ${p.sentiment || 'NEUTRO'}<br/>
          <div style="font-size: 0.8rem; margin-top: 0.3rem;">
            <strong>Bio:</strong> ${p.biography || 'Sin biografía'}<br/>
            <strong>Palabras clave:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
            <strong>Análisis:</strong> ${p.interpretation || '--'}
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
            Seguidores: ${p.followers?.toLocaleString("es-CO") || '--'}<br/>
            Sentimiento: ${p.sentiment || 'NEUTRO'}<br/>
            <div style="font-size: 0.8rem; margin-top: 0.3rem;">
              <strong>Bio:</strong> ${p.biography || 'Sin biografía'}<br/>
              <strong>Palabras clave:</strong> ${(typeof p.keywords === 'string' ? JSON.parse(p.keywords).join(", ") : p.keywords?.join(", ")) || '--'}<br/>
              <strong>Análisis:</strong> ${p.interpretation || '--'}
            </div>
          </div>
        </div>
      `).join("");

      bloque.innerHTML += tarjetas;
      contenedorTopPerfiles.appendChild(bloque);
    });
  });
}

