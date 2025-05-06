export function inicializarGeneradorPDF() {
  if (typeof html2canvas === "undefined") {
    console.error("❌ html2canvas no está definido. Asegúrate de importar la librería correctamente.");
  }

  const btnPDF = document.getElementById("btnDescargarPDF");
  if (!btnPDF) return;

  btnPDF.disabled = false;

  btnPDF.addEventListener("click", () => {
    console.log("🟢 Click detectado en 'Generar informe PDF'");

    // Esperar un pequeño tiempo para asegurar render de gráficos
    setTimeout(async () => {
      const chartsIds = [
        "grafico-scatter-demografia",
        "grafico-cantidad-por-categoria",
        "grafico-sentimiento-por-categoria",
        "grafico-emojis-por-categoria"
      ];

      const getBase64FromChart = (id) => {
        const chartDom = document.getElementById(id);
        if (!chartDom) {
          console.warn(`⚠️ No se encontró el gráfico con ID: ${id}`);
          return "";
        }
        try {
          let chart = echarts.getInstanceByDom(chartDom);
          if (!chart) {
            chart = window[`grafico_${id}`];
          }
          if (!chart) {
            console.warn(`⚠️ No se encontró instancia de ECharts para: ${id}`);
            return "";
          }
          const option = chart.getOption?.();
          if (!option || Object.keys(option).length === 0) {
            console.warn(`⚠️ La instancia ECharts de ${id} no tiene datos`);
            return "";
          }
          return chart.getDataURL({ type: "png", pixelRatio: 2 });
        } catch (err) {
          console.error(`❌ Error al obtener imagen base64 de ${id}:`, err);
          return "";
        }
      };

      await new Promise(r => setTimeout(r, 200));

      const data = {
        graficoDistribucionGeneral: getBase64FromChart("grafico-scatter-demografia"),
        graficoSegmentacion: getBase64FromChart("grafico-cantidad-por-categoria"),
        graficoSentimiento: getBase64FromChart("grafico-sentimiento-por-categoria"),
        graficoEmojis: getBase64FromChart("grafico-emojis-por-categoria"),
        tablaTopPerfiles: (() => {
          const contenedor = document.querySelector("#topPerfilesPorSegmento .fila-tarjetas-top");
          if (!contenedor || contenedor.innerHTML.trim() === "") {
            console.warn("⚠️ tablaTopPerfiles está vacía, usando contenedor HTML por defecto");
            return "<div><em>No se encontraron perfiles destacados en esta categoría.</em></div>";
          }
          return contenedor.innerHTML;
        })()
      };

      Promise.all([
        capturarImagen("contenedorWordCloudSegmentoPositivo"),
        capturarImagen("contenedorWordCloudSegmentoNeutro"),
        capturarImagen("contenedorWordCloudSegmentoNegativo"),
        capturarImagen("contenedorRedSegmentacion")
      ]).then(async ([imgPos, imgNeu, imgNeg, redUsuarios]) => {
        // Bloque reemplazado según instrucciones:
        const imagenTransparente = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIUlEQVR42mNgGAWjgP8ZGBgY/h8GEWBg+P///88ACfsMJxTmvCcAAAAASUVORK5CYII=";

        data.nubePalabrasSegmentoPositivo = imgPos && imgPos.startsWith("data:image") ? imgPos : imagenTransparente;
        data.nubePalabrasSegmentoNeutro = imgNeu && imgNeu.startsWith("data:image") ? imgNeu : imagenTransparente;
        data.nubePalabrasSegmentoNegativo = imgNeg && imgNeg.startsWith("data:image") ? imgNeg : imagenTransparente;
        data.redUsuarios = redUsuarios && redUsuarios.startsWith("data:image") ? redUsuarios : imagenTransparente;

        if (!data.tablaTopPerfiles || data.tablaTopPerfiles.trim().length < 50) {
          data.tablaTopPerfiles = "<div><em>No se encontraron perfiles destacados en esta categoría.</em></div>";
        }

        console.log("📦 Datos preparados para PDF:", data);

        fetch("/api/informe-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "demografia", data })
        })
          .then(async (res) => {
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error?.error || "Error generando informe");
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, "_blank");
            console.log("✅ Informe abierto en nueva pestaña.");
          })
          .catch((error) => {
            console.error("❌ Error generando o descargando el informe:", error);
            alert("Error generando el informe. Revisa la consola para más detalles.");
          });
      });
    }, 600); // Espera de 600 ms
  });
}

async function capturarImagen(id) {
  const elem = document.getElementById(id);
  if (!elem) {
    console.warn(`⚠️ No se encontró el contenedor con ID: ${id}`);
    return "";
  }

  try {
    const chart = echarts.getInstanceByDom(elem);
    if (chart) {
      const option = chart.getOption?.();
      const tieneDatos = option && Object.keys(option).length > 0 &&
                         option.series && option.series.some(s => s.data && s.data.length > 0);
      if (!tieneDatos) {
        console.warn(`⚠️ Gráfico sin datos para ID: ${id}`);
        return "";
      }
      return chart.getDataURL({ type: "png", pixelRatio: 2 });
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
