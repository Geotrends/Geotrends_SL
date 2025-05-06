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
      const canvas = await html2canvas(elem);
      return canvas.toDataURL("image/png");
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

    const fuentesSeleccionadas = window.perfilesSemillaGlobal?.map(p => p.fuente_id) || [];
    const perfiles = window.perfilesCargadosGlobal || [];

    if (fuentesSeleccionadas.length === 0 || perfiles.length === 0) {
      alert("No hay perfiles cargados o seleccionados para generar el informe.");
      generandoInforme = false;
      return;
    }

    const data = {
      graficoSeguidores: await capturarImagen("scatterFollowersPosts"),
      graficoEmojis: await capturarImagen("grafico-emojis"),
      graficoSentimiento: await capturarImagen("grafico-sentimiento-perfiles"),
      graficoSegmentacionPerfiles: await capturarImagen("grafico-segmentacion-perfiles"),
      nubeBiografias: await capturarImagen("contenedorWordCloud"),
      nubeNombres: await capturarImagen("contenedorWordCloudNombres"),
      tablaResumen: document.querySelector(".resumen-quantitativo-perfiles")?.outerHTML || "<p><em>No hay datos</em></p>"
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
      generandoInforme = false;
    }
  });
}