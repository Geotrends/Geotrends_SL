/**
@file public/js/informeHistorico.js
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

document.addEventListener("DOMContentLoaded", function () {
  const btnGenerarPDF = document.getElementById("btnGenerarPDF");

  if (!btnGenerarPDF) return;

  btnGenerarPDF.addEventListener("click", async (e) => {
    e.preventDefault();
    mostrarSpinnerInforme(); // ⏳ Mostrar spinner al iniciar

    try {
      const sensorSelect = document.getElementById("sensorSelect");
      const sensorID = sensorSelect.value;
      const sensorNombre =
        sensorSelect.options[sensorSelect.selectedIndex].text;
        const fechaInicio = window.fechaInicioGlobal || "—";
        const fechaFin = window.fechaFinGlobal || "—";
        const formatoLegibleFechaSoloTexto = (isoDate) => {
          if (!isoDate || isoDate === "—") return "—";
          const fecha = new Date(isoDate);
          return fecha.toLocaleDateString("es-CO", {
            timeZone: "America/Bogota",
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
        };
        
        const fechaInicioTexto = formatoLegibleFechaSoloTexto(fechaInicio);
        const fechaFinTexto = formatoLegibleFechaSoloTexto(fechaFin);
      // ✅ Validación fuerte
      if (!window.fechaInicioGlobal || !window.fechaFinGlobal) {
        alert("Debes seleccionar un rango de fechas antes de generar el informe.");
        ocultarSpinnerInforme();
        return;
      }
      
      const detallesSensor = window.sensoresData?.find(
        (s) => s.sensor_id === sensorID || s.ID === sensorID
      );

      const htmlGrafico1 = generarImgHTML("grafico1");
      const htmlGrafico2 = generarImgHTML("grafico2");
      const htmlGrafico3 = generarImgHTML("grafico3");
      const htmlGrafico4 = generarImgHTML("grafico4");
      const htmlGrafico5 = generarImgHTML("grafico5");

      const tablaIndicadores =
        document.querySelector(".indicadores-tabla")?.outerHTML || "";

        let zoomInicio = window.zoomInicioGlobal || "—";
        let zoomFin = window.zoomFinGlobal || "—";

      const formatoLegible = (isoDate) => {
        if (!isoDate) return "—";
        const fecha = new Date(isoDate);
        return fecha.toLocaleString("es-CO", {
          timeZone: "America/Bogota",
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      // 🔥 Nueva protección para fechas válidas
      if (zoomInicio && zoomInicio !== "—") {
        zoomInicio = formatoLegible(zoomInicio);
      } else {
        zoomInicio = "—";
      }

      if (zoomFin && zoomFin !== "—") {
        zoomFin = formatoLegible(zoomFin);
      } else {
        zoomFin = "—";
      }

      if (!window.sensoresData || !Array.isArray(window.sensoresData)) {
        alert(
          "Los datos de los sensores no están disponibles. Recarga la página."
        );
        ocultarSpinnerInforme();
        return;
      }

      const formatoLegibleFechaConHora = (isoDate) => {
        if (!isoDate || isoDate === "—") return "—";
        const fecha = new Date(isoDate);
        const fechaTexto = fecha.toLocaleDateString("es-CO", {
          timeZone: "America/Bogota",
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const horaTexto = fecha.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Bogota",
        });
        return `${fechaTexto} a las ${horaTexto} horas`;
      };

      const payload = {
        sensorNombre,
        fechaInicio: fechaInicioTexto,
        fechaFin: fechaFinTexto,
        zoomInicio,
        zoomFin,
        htmlGrafico1,
        htmlGrafico2,
        htmlGrafico3,
        htmlGrafico4,
        htmlGrafico5,
        tablaIndicadores,
        detallesSensor,
      };
      console.log("📦 Payload para el informe:", payload);

      fetch("/informe/descargar-informe-historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Error en la generación del PDF");
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank"); // ✅ Abrir el informe
          ocultarSpinnerInforme(); // ✅ Ocultar al terminar
        })
        .catch((err) => {
          console.error("❌ Error generando informe:", err);
          alert("Hubo un problema al generar el informe.");
          ocultarSpinnerInforme();
        });
    } catch (err) {
      //console.log("📦 Payload para el informe:", payload);
      console.error("❌ Error general:", err);
      alert("Ocurrió un error inesperado.");
      ocultarSpinnerInforme();
    }
  });

  // 📸 Convertir gráfico ECharts a <img src="base64">
  function generarImgHTML(id) {
    const dom = document.getElementById(id);
    if (!dom || dom.offsetWidth === 0 || dom.offsetHeight === 0) {
      console.warn(`⚠️ El gráfico ${id} no tiene tamaño visible.`);
      return "";
    }

    const chart = echarts.getInstanceByDom(dom);
    if (!chart) {
      console.warn(`⚠️ No se encontró instancia de ECharts para: ${id}`);
      return "";
    }

    try {
      const base64 = chart.getDataURL({ type: "png", pixelRatio: 2 });
      return `<img src="${base64}" alt="Gráfico ${id}" style="width:100%; margin-bottom: 20px;" />`;
    } catch (err) {
      console.warn(`⚠️ Error al generar imagen base64 del gráfico ${id}:`, err);
      return "";
    }
  }

  function extraerFechas(rangoTexto) {
    const partes = rangoTexto.match(/\d{1,2} \w+ \d{4}/g);
    if (!partes || partes.length < 2) return ["", ""];

    const meses = {
      enero: "01",
      febrero: "02",
      marzo: "03",
      abril: "04",
      mayo: "05",
      junio: "06",
      julio: "07",
      agosto: "08",
      septiembre: "09",
      octubre: "10",
      noviembre: "11",
      diciembre: "12",
    };

    const parsear = (str) => {
      const [dia, mesNombre, año] = str.split(" ");
      const mes = meses[mesNombre.toLowerCase()];
      if (!mes) return "";
      return `${año}-${mes}-${dia.padStart(2, "0")}`;
    };

    return [parsear(partes[0]), parsear(partes[1])];
  }

  function obtenerRangoDataZoom(chart, datos) {
    try {
      if (!chart || !datos || datos.length === 0) return ["—", "—"];
  
      const opciones = chart.getOption();
      const zoom = opciones?.dataZoom?.[0];
      if (!zoom) return [datos[0]?.timestamp || "—", datos[datos.length - 1]?.timestamp || "—"];
  
      const startPercent = zoom.start ?? 0;
      const endPercent = zoom.end ?? 100;
  
      const startIdx = Math.floor((startPercent / 100) * datos.length);
      const endIdx = Math.ceil((endPercent / 100) * datos.length) - 1;
  
      const inicio = datos[startIdx]?.timestamp || datos[0]?.timestamp || "—";
      const fin = datos[endIdx]?.timestamp || datos[datos.length - 1]?.timestamp || "—";
  
      return [inicio, fin];
    } catch (e) {
      console.warn("⚠️ No se pudo obtener rango de dataZoom:", e);
      return ["—", "—"];
    }
  }

  // 🎯 Spinner exclusivo para informes
  function mostrarSpinnerInforme() {
    const overlay = document.getElementById("spinnerInformeOverlay");
    if (overlay) overlay.style.display = "flex";
  }

  function ocultarSpinnerInforme() {
    const overlay = document.getElementById("spinnerInformeOverlay");
    if (overlay) overlay.style.display = "none";
  }
});
