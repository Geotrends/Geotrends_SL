import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js';


const imagenTransparente = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4z8DwHwAFgwJ/lL6C3wAAAABJRU5ErkJggg==";

async function capturarImagen(idElemento) {
  const elemento = document.getElementById(idElemento);
  if (!elemento) {
    console.warn(`⚠️ Elemento ${idElemento} no encontrado`);
    return imagenTransparente;
  }

  await new Promise((r) => setTimeout(r, 50));

  try {
    const canvas = await html2canvas(elemento, {
      backgroundColor: null,
      useCORS: true,
      scale: 2
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error(`❌ Error capturando ${idElemento}:`, error);
    return imagenTransparente;
  }
}

export function configurarBotonInformeComentarios() {
  const boton = document.getElementById("btnDescargarInformeComentarios");
  if (!boton) {
    console.warn("❌ No se encontró el botón de descarga del informe.");
    return;
  }

  boton.addEventListener("click", async () => {
    try {
      document.getElementById("spinnerInforme").style.display = "flex";

      const filtrosSeleccionados = {
        palabraClave: document.getElementById("filtroKeyword")?.value || "—",
        tipo: document.getElementById("filtroTipo")?.value || "Todos",
        sentimiento: document.getElementById("filtroSentimiento")?.value || "Todos",
        fechaDesde: document.getElementById("filtroFechaDesde")?.value || "—",
        fechaHasta: document.getElementById("filtroFechaHasta")?.value || "—",
        minLikes: document.getElementById("filtroLikesMinimos")?.value || "0",
      };

      const resumenFiltrosHTML = `
        <ul style="list-style:none; padding-left:0;">
          <li><strong>Keyword:</strong> ${filtrosSeleccionados.palabraClave}</li>
          <li><strong>Type:</strong> ${filtrosSeleccionados.tipo}</li>
          <li><strong>Sentiment:</strong> ${filtrosSeleccionados.sentimiento}</li>
          <li><strong>Date from:</strong> ${filtrosSeleccionados.fechaDesde}</li>
          <li><strong>Date to:</strong> ${filtrosSeleccionados.fechaHasta}</li>
          <li><strong>Min. likes:</strong> ${filtrosSeleccionados.minLikes}</li>
        </ul>
      `;

      // Captura secuencial y encadenada de imágenes de gráficos y nubes
      const graficosCapturados = {};
      for (const id of [
        "graficoScatterComentarios",
        "graficoScatterUsuarios",
        "graficoTopEmojis",
        "nubeHashtags",
        "nubeCaption",
        "nubeKeywords"
      ]) {
        await new Promise(r => setTimeout(r, 300));
        graficosCapturados[id] = await capturarImagen(id);
      }

      const {
        graficoScatterComentarios,
        graficoScatterUsuarios,
        graficoTopEmojis,
        nubeHashtags,
        nubeCaption,
        nubeKeywords
      } = graficosCapturados;

      const tablaResumen = document.querySelector(".resumen-quantitativo-comentarios")?.outerHTML || "<p><em>No summary table available</em></p>";

      const data = {
        graficoScatterComentarios,
        graficoScatterUsuarios,
        graficoTopEmojis,
        nubeHashtags,
        nubeCaption,
        nubeKeywords,
        resumenFiltrosHTML,
        tablaResumen
      };

      console.log("📦 Payload para informe de comentarios:", data);

      const response = await fetch("/api/informe-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "comentarios", data })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Error generando informe");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("❌ Error al generar o visualizar el informe de comentarios:", error);
      alert("Error generando el informe. Revisa la consola para más detalles.");
    } finally {
      document.getElementById("spinnerInforme").style.display = "none";
    }
  });
}