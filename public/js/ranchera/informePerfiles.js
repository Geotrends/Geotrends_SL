// Validación para asegurar que html2canvas esté definido
if (typeof html2canvas === "undefined") {
  console.error("❌ html2canvas no está definido. Asegúrate de importar la librería correctamente.");
}

// Función robusta para capturar imágenes de gráficos ECharts o HTML como base64 PNG
export async function capturarImagen(id) {
  const elem = document.getElementById(id);
  if (!elem) {
    console.warn(`⚠️ No se encontró el contenedor con ID: ${id}`);
    return "";
  }

  try {
    // Intenta obtener la instancia de ECharts o el gráfico guardado en window
    const chart = echarts.getInstanceByDom(elem) || window[`grafico_${id}`];
    if (chart) {
      for (let i = 0; i < 10; i++) {
        const option = chart.getOption?.();
        const tieneDatos = option && option.series?.some(s => s.data?.length > 0);
        if (tieneDatos) {
          return chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
        }
        await new Promise(r => setTimeout(r, 300));
      }
      console.warn(`⚠️ El gráfico ${id} no tiene datos visibles aún.`);
      return "";
    } else {
      if (typeof html2canvas !== "undefined") {
        const canvas = await html2canvas(elem);
        return canvas.toDataURL("image/png");
      } else {
        console.warn("⚠️ html2canvas no está disponible para capturar el elemento:", id);
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAusB9Yt6jVsAAAAASUVORK5CYII="; // imagen transparente 1x1
      }
    }
  } catch (err) {
    console.error(`❌ Error al capturar imagen del ID: ${id}`, err);
    return "";
  }
}

async function esperarGraficoRenderizado(id, intentos = 20, intervalo = 300) {
  console.log(`⏳ Esperando renderizado del gráfico: ${id}`);
  for (let i = 0; i < intentos; i++) {
    const contenedor = document.getElementById(id);
    if (contenedor && contenedor.offsetHeight > 0) {
      const chart = echarts.getInstanceByDom(contenedor);
      if (chart && chart.getOption()?.series?.some(s => s.data?.length > 0)) {
        console.log(`✅ Gráfico listo: ${id}`);
        return chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
      }
    }
    await new Promise(r => setTimeout(r, intervalo));
  }
  console.warn(`❌ No se pudo capturar el gráfico: ${id}`);
  return "";
}
  
// Función para configurar el botón de generación de informe de perfiles
export function configurarBotonInformePerfiles() {
  const boton = document.getElementById("botonDescargarInformePerfiles");

  if (!boton) {
    console.warn("❌ No se encontró el botón de descarga del informe.");
    return;
  }

  let generandoInforme = false;

  boton.addEventListener("click", async () => {
    if (generandoInforme) {
      return; // Evitar múltiples ejecuciones simultáneas
    }
    generandoInforme = true;

    document.getElementById("spinnerInforme").style.display = "flex";

    const fuentesSeleccionadas = window.perfilesSemillaGlobal?.map(p => p.fuente_id) || [];
    const perfiles = window.perfilesCargadosGlobal || [];

    if (fuentesSeleccionadas.length === 0 || perfiles.length === 0) {
      alert("No profiles loaded or selected to generate the report.");
      generandoInforme = false;
      return;
    }

    function traducirBooleano(valor) {
      if (valor === "true") return "Yes";
      if (valor === "false") return "No";
      return "All";
    }

    const filtrosSeleccionados = {
      seguidoresMin: document.getElementById("inputSeguidoresMin")?.value || "0",
      seguidoresMax: document.getElementById("inputSeguidoresMax")?.value || "No limit",
      categoria: document.getElementById("selectorCategoria")?.value || "All",
      negocio: traducirBooleano(document.getElementById("selectorTipoCuenta")?.value),
      privada: traducirBooleano(document.getElementById("selectorPrivacidad")?.value),
      verificada: traducirBooleano(document.getElementById("selectorVerificado")?.value),
    };

    // Bloque añadido: resumen HTML de filtros
    const filtrosResumenHTML = `
      <ul style="list-style:none; padding-left:0;">
        <li><strong>Followers:</strong> ${filtrosSeleccionados.seguidoresMin} – ${filtrosSeleccionados.seguidoresMax}</li>
        <li><strong>Category:</strong> ${filtrosSeleccionados.categoria}</li>
        <li><strong>Business account:</strong> ${filtrosSeleccionados.negocio}</li>
        <li><strong>Privacy:</strong> ${filtrosSeleccionados.privada}</li>
        <li><strong>Verified:</strong> ${filtrosSeleccionados.verificada}</li>
      </ul>
    `;

    await new Promise(r => setTimeout(r, 200));
    const graficoSeguidores = await capturarImagen("scatterFollowersPosts");
    await new Promise(r => setTimeout(r, 200));
    const graficoEmojis = await capturarImagen("grafico-emojis");
    await new Promise(r => setTimeout(r, 200));
    const graficoSentimiento = await capturarImagen("grafico-sentimiento-perfiles");
    await new Promise(r => setTimeout(r, 200));
    const graficoSegmentacionPerfiles = await capturarImagen("grafico-segmentacion-perfiles");
    await new Promise(r => setTimeout(r, 200));
    const nubeBiografias = await capturarImagen("contenedorWordCloud");
    await new Promise(r => setTimeout(r, 200));
    const nubeNombres = await capturarImagen("contenedorWordCloudNombres");

    const data = {
      graficoSeguidores,
      graficoEmojis,
      graficoSentimiento,
      graficoSegmentacionPerfiles,
      nubeBiografias,
      nubeNombres,
      filtrosSeleccionados,
      tablaResumen: document.querySelector(".resumen-quantitativo-perfiles")?.outerHTML || "<p><em>No data</em></p>",
      resumenFiltrosHTML: filtrosResumenHTML,
    };

    console.log("📦 Payload para informe:", data);

    try {
      const res = await fetch("/api/informe-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "perfiles", data })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || "Error generando informe");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("❌ Error al generar o visualizar el informe:", error);
      alert("Error generando el informe. Revisa la consola para más detalles.");
    } finally {
      document.getElementById("spinnerInforme").style.display = "none";
      generandoInforme = false;
    }
  });
}