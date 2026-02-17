/**
@file public/js/informeAnalitica.js
@version 1.0.0

@description
Lógica JS del proyecto.
Este archivo forma parte del proyecto "Plataforma de Monitoreo Ambiental IoT",
desarrollado por Geotrends - Geographic and Data Analytics, en colaboración con el Área Metropolitana
del Valle de Aburrá y la Universidad de San Buenaventura en el marco del Convenio 273 de 2024.

⚖️ Propiedad Intelectual:
Este software es propiedad intelectual compartida según el Convenio 273 de 2024.

📌 Entidades involucradas:
- Geotrends - Geographic and Data Analytics
- Área Metropolitana del Valle de Aburrá
- Universidad de San Buenaventura

👨‍💻 Equipo de desarrollo:
- Jonathan Ochoa Villegas (Geotrends)
- Diego Murillo Gómez (USB)
- Camilo Herrera Arcila (Geotrends)

📅 Creación: Noviembre 2024
📅 Actualización: 30-03-2025

📜 Licencia: MIT License

© 2025 Geotrends. Todos los derechos reservados.
 */

document.getElementById("btn-informe-hora").addEventListener("click", async () => {
    const spinner = document.getElementById("spinnerInformeOverlay");
    spinner.style.display = "flex";
  
    try {
      const chartHora = echarts.getInstanceByDom(document.getElementById("heatmapLday"));
      const heatmapImg = chartHora ? chartHora.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" }) : "";
  
      const descripcionEl = document.querySelector("#row-hora .chart-description");
      const descripcionHtml = descripcionEl ? descripcionEl.outerHTML : "";
  
      const sensoresFiltrados = obtenerSensoresFiltradosDesdeEndpoint();
      const tablaSensoresHtml = generarTablaHTMLDescripcionSensores(sensoresFiltrados);
  
      const municipio = document.getElementById("filter-municipio").value || "Todos";
      const barrio = document.getElementById("filter-barrio").value || "Todos";
      const usoSuelo = document.getElementById("filter-uso-suelo").value || "Todos";
      const sensoresSeleccionados = $('#filter-sensores').val() || [];
  
      const filtrosHtml = `
        <ul style="font-size: 10px; line-height: 1.4; padding-left: 18px;">
          <li><strong>Municipio:</strong> ${municipio}</li>
          <li><strong>Barrio:</strong> ${barrio}</li>
          <li><strong>Uso del Suelo:</strong> ${usoSuelo}</li>
          <li><strong>Sensores:</strong> ${sensoresSeleccionados.join(", ") || "Todos"}</li>
        </ul>
      `;
  
      const res = await fetch("/informe/descargar-analitica-hora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graficoBase64: heatmapImg,
          descripcionHtml,
          filtrosHtml,
          tablaSensoresHtml,
        }),
      });
  
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("❌ Error generando informe por hora:", err);
      alert("Ocurrió un error al generar el informe.");
    } finally {
      spinner.style.display = "none";
    }
  });
  
document.getElementById("btn-generar-informe-semana").addEventListener("click", async () => {
    const spinner = document.getElementById("spinnerInformeOverlay");
    spinner.style.display = "flex";
  
    try {
      const chartGeneral = echarts.getInstanceByDom(document.getElementById("heatmapLweek"));
      const chartDia = echarts.getInstanceByDom(document.getElementById("heatmapLweekDia"));
      const chartNoche = echarts.getInstanceByDom(document.getElementById("heatmapLweekNoche"));
  
      const graficoSemanaGeneral = chartGeneral ? chartGeneral.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" }) : "";
      const graficoSemanaDia = chartDia ? chartDia.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" }) : "";
      const graficoSemanaNoche = chartNoche ? chartNoche.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" }) : "";
  
      const sensoresFiltrados = obtenerSensoresFiltradosDesdeEndpoint();
      const tablaSensoresHtml = generarTablaHTMLDescripcionSensores(sensoresFiltrados);
  
      const municipio = document.getElementById("filter-municipio").value || "Todos";
      const barrio = document.getElementById("filter-barrio").value || "Todos";
      const usoSuelo = document.getElementById("filter-uso-suelo").value || "Todos";
      const sensoresSeleccionados = $('#filter-sensores').val() || [];
  
      const filtrosHtml = `
        <ul style="font-size: 10px; line-height: 1.4; padding-left: 18px;">
          <li><strong>Municipio:</strong> ${municipio}</li>
          <li><strong>Barrio:</strong> ${barrio}</li>
          <li><strong>Uso del Suelo:</strong> ${usoSuelo}</li>
          <li><strong>Sensores:</strong> ${sensoresSeleccionados.join(", ") || "Todos"}</li>
        </ul>
      `;
  
      const descripcionGeneral = document.getElementById("descripcionLweek")?.innerHTML || "";
      const descripcionDia = document.getElementById("descripcionLweekDia")?.innerHTML || "";
      const descripcionNoche = document.getElementById("descripcionLweekNoche")?.innerHTML || "";
  
      const res = await fetch("/informe/descargar-analitica-semana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graficoSemanaGeneral,
          graficoSemanaDia,
          graficoSemanaNoche,
          descripcionGeneral,
          descripcionDia,
          descripcionNoche,
          filtrosHtml,
          tablaSensoresHtml,
        }),
      });
  
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("❌ Error generando informe semanal:", err);
      alert("Error al generar el informe.");
    } finally {
      spinner.style.display = "none";
    }
  });
  
  document.getElementById("btn-generar-informe-mes").addEventListener("click", async () => {
  const spinner = document.getElementById("spinnerInformeOverlay");
  spinner.style.display = "flex";

  try {
    const graficoMes24h = echarts.getInstanceByDom(document.getElementById("heatmapLmes24h"))?.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" }) || "";
    const graficoMesDia = echarts.getInstanceByDom(document.getElementById("heatmapLmesDia"))?.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" }) || "";
    const graficoMesNoche = echarts.getInstanceByDom(document.getElementById("heatmapLmesNoche"))?.getDataURL({ pixelRatio: 2, backgroundColor: "#fff" }) || "";

    const descripcion24h = document.getElementById("descripcionLmes24h")?.innerHTML || "";
    const descripcionDia = document.getElementById("descripcionLmesDia")?.innerHTML || "";
    const descripcionNoche = document.getElementById("descripcionLmesNoche")?.innerHTML || "";

    const sensoresFiltrados = obtenerSensoresFiltradosDesdeEndpoint();
    const tablaSensoresHtml = generarTablaHTMLDescripcionSensores(sensoresFiltrados);

    const municipio = document.getElementById("filter-municipio").value || "Todos";
    const barrio = document.getElementById("filter-barrio").value || "Todos";
    const usoSuelo = document.getElementById("filter-uso-suelo").value || "Todos";
    const sensoresSeleccionados = $('#filter-sensores').val() || [];

    const filtrosHtml = `
      <ul style="font-size: 10px; line-height: 1.4; padding-left: 18px;">
        <li><strong>Municipio:</strong> ${municipio}</li>
        <li><strong>Barrio:</strong> ${barrio}</li>
        <li><strong>Uso del Suelo:</strong> ${usoSuelo}</li>
        <li><strong>Sensores:</strong> ${sensoresSeleccionados.join(", ") || "Todos"}</li>
      </ul>
    `;

    const res = await fetch("/informe/descargar-analitica-mes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graficoMes24h,
        graficoMesDia,
        graficoMesNoche,
        descripcion24h,
        descripcionDia,
        descripcionNoche,
        filtrosHtml,
        tablaSensoresHtml,
      }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    console.error("❌ Error generando informe mensual:", err);
    alert("Error al generar el informe mensual.");
  } finally {
    spinner.style.display = "none";
  }
});
