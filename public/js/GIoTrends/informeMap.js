/**
@file public/js/informeMap.js
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

function obtenerSensoresFiltrados() {
  const municipio = document.getElementById("filter-municipio").value;
  const barrio = document.getElementById("filter-barrio").value;
  const referencia = document.getElementById("filter-referencia").value.toLowerCase();
  const usoSuelo = document.getElementById("filter-uso-suelo").value;
  const nivel = document.getElementById("filter-nivel").value;

  return sensorsData.filter((sensor) => {
    if (!sensor.laeq_slow || isNaN(parseFloat(sensor.laeq_slow))) return false;
    const laeq = parseFloat(sensor.laeq_slow);

    if (nivel) {
      if (nivel === "bajo" && !(laeq >= 0 && laeq <= 55)) return false;
      if (nivel === "medio" && !(laeq > 55 && laeq <= 65)) return false;
      if (nivel === "alto" && !(laeq > 65 && laeq <= 75)) return false;
      if (nivel === "critico" && !(laeq > 75)) return false;
    }

    return (
      (!municipio || sensor.municipio === municipio) &&
      (!barrio || sensor.barrio === barrio) &&
      (!referencia || sensor.sensor_name.toLowerCase().includes(referencia)) &&
      (!usoSuelo || sensor.uso_suelo === usoSuelo)
    );
  });
}

function generarTablaSensoresHTML(sensores) {
  if (!sensores || sensores.length === 0) {
    return "<tr><td colspan='6'>No hay sensores para mostrar</td></tr>";
  }

  return sensores.map((s) => {
    const laeq = s.laeq_slow !== null ? parseFloat(s.laeq_slow) : null;
    const nivel = laeq !== null ? laeq.toFixed(1) : "--";
    const hora = s.timestamp
      ? new Date(s.timestamp).toLocaleTimeString("es-CO", { timeZone: "America/Bogota" })
      : "Sin datos";

    const ubicacion = (s.latitude && s.longitude)
      ? `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`
      : "--";

    let etiquetaNivel = "--";
    if (laeq !== null) {
      if (laeq <= 55) etiquetaNivel = `<span style="color: blue;">${nivel} (Bajo)</span>`;
      else if (laeq <= 65) etiquetaNivel = `<span style="color: green;">${nivel} (Moderado)</span>`;
      else if (laeq <= 75) etiquetaNivel = `<span style="color: orange;">${nivel} (Alto)</span>`;
      else etiquetaNivel = `<span style="color: red;">${nivel} (Excesivo)</span>`;
    }

    return `
      <tr>
        <td>${s.sensor_name || "--"}</td>
        <td>${ubicacion}</td>
        <td>${s.municipio || "--"} / ${s.barrio || "--"}</td>
        <td>${s.uso_suelo || "--"}</td>
        <td>${etiquetaNivel}</td>
        <td>${hora}</td>
      </tr>
    `;
  }).join("");
}


document.getElementById("btnGenerarInforme").addEventListener("click", async () => {
  mostrarSpinnerInforme(); // ⏳ Mostrar spinner al iniciar

  const mapa = document.getElementById("map");
  const regla = document.getElementById("regla");

  if (!mapa || !regla) {
    alert("No se encontró el mapa o la regla.");
    ocultarSpinnerInforme();
    return;
  }

  try {
    const [canvasMapa, canvasRegla] = await Promise.all([
      html2canvas(mapa, { useCORS: true }),
      html2canvas(regla, { useCORS: true })
    ]);

    const imageBase64 = canvasMapa.toDataURL("image/png");
    const reglaBase64 = canvasRegla.toDataURL("image/png");

    const sensoresFiltrados = obtenerSensoresFiltrados();
    // console.log("Sensores filtrados:", sensoresFiltrados);
    
    const tablaSensoresHtml = generarTablaSensoresHTML(sensoresFiltrados);
    // console.log("Tabla:", tablaSensoresHtml);

    const municipio = document.getElementById("filter-municipio").value;
    const barrio = document.getElementById("filter-barrio").value;
    const referencia = document.getElementById("filter-referencia").value;
    const usoSuelo = document.getElementById("filter-uso-suelo").value;
    const nivel = document.getElementById("filter-nivel").value;

    fetch("/informe/descargar-informe-mapa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64,
        reglaBase64,
        filtros: {
          municipio,
          barrio,
          referencia,
          usoSuelo,
          nivel
        },
        tablaSensoresHtml
      })
    })
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      ocultarSpinnerInforme(); // ✅ Ocultar spinner al abrir el PDF
    })
    .catch((err) => {
      console.error("❌ Error generando informe:", err);
      alert("Hubo un problema al generar el informe.");
      ocultarSpinnerInforme(); // ❌ Ocultar spinner si hay error
    });

  } catch (error) {
    console.error("❌ Error general:", error);
    alert("Ocurrió un error inesperado.");
    ocultarSpinnerInforme();
  }
});


function mostrarSpinnerInforme() {
  const overlay = document.getElementById("spinnerInformeOverlay");
  if (overlay) overlay.style.display = "flex";
}

function ocultarSpinnerInforme() {
  const overlay = document.getElementById("spinnerInformeOverlay");
  if (overlay) overlay.style.display = "none";
}
