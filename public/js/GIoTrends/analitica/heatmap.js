/**
@file public/js/analitica/heatmap.js
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



function heatmap(data, div, options) {
  var chartDom = document.getElementById(div);

  // ✅ Eliminar instancia previa si existe para evitar duplicados
  if (echarts.getInstanceByDom(chartDom)) {
    echarts.dispose(chartDom);
  }

  // 🔹 Calcular altura dinámica
  const alturaPorSensor = 25; // 🔹 Altura fija por sensor en píxeles
  const alturaMinima = 200; // 🔹 Altura mínima del gráfico
  const alturaMaxima = 2000; // 🔹 Altura máxima permitida
  const alturaCalculada = Math.min(
    Math.max(
      options.ylabels.length * alturaPorSensor + alturaMinima,
      alturaMinima
    ),
    alturaMaxima
  );

  // ✅ Ajustamos la altura del contenedor antes de inicializar el gráfico
  chartDom.style.height = `${alturaCalculada}px`;

  var heatMapChart = echarts.init(chartDom);

  // ✅ Redimensionar correctamente en cambios de ventana
  window.addEventListener("resize", function () {
    // 🔹 Volvemos a calcular la altura del contenedor cada vez que cambia el tamaño de la ventana
    const nuevaAlturaCalculada = Math.min(
      Math.max(options.ylabels.length * alturaPorSensor, alturaMinima),
      alturaMaxima
    );
    chartDom.style.height = `${nuevaAlturaCalculada}px`;

    // 🔹 Redimensionamos el gráfico
    heatMapChart.resize();
  });

  let dataParsed = data.map(function (item) {
    return [item[1], item[0], item[2] || "-"];
  });
  let option = {
    tooltip: {
      position: "top",
    },
    grid: {
      left: 50, // 🔹 Espacio fijo en píxeles para los nombres de sensores
      right: 50, // 🔹 Espacio fijo a la derecha
      top: 100, // 🔹 Espacio fijo para el título
      bottom: 30, // 🔹 Espacio fijo para el eje X
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: options.xlabels,
      name: options.xAxisName || "Eje X", // ✅ Aquí se automatiza
      splitArea: { show: true },
    },
    yAxis: {
      type: "category",
      data: options.ylabels,
      name: "Sensor",
      splitArea: { show: true },
      axisLabel: {
        interval: 0, // 🔹 Muestra todas las etiquetas de sensores sin saltarlas
      },
    },
    title: [
      {
        text: options.title,
        left: "center",
        top: 10, // 🔹 Posición fija del título
      },
    ],
    series: [
      {
        name: "Heatmap",
        type: "heatmap",
        data: data,
        label: { show: true },
      },
    ],
    visualMap: {
      orient: "horizontal",
      type: "piecewise",
      splitNumber: 4,
      orient: "horizontal",
      right: 50, // 🔹 Posición fija desde la derecha
      top: 50, // 🔹 Posición fija desde arriba
      textStyle: {
        fontSize: 12,
      },
      pieces: [
        { min: 75, color: "red", label: "Ruido Excesivo (> 75 dB)" },
        { min: 65, max: 75, color: "#ef7d00", label: "Ruido Alto" },
        { min: 55, max: 65, color: "#82cc19", label: "Ruido Moderado" },
        { min: 0, max: 55, color: "#0074BD", label: "Ruido Bajo" },
        { value: "-", color: "#d3d3d3", label: "Sin Datos" },
      ],
    },
    series: [
      {
        name: "LAeq slow",
        type: "heatmap",
        data: dataParsed,
        label: {
          show: true,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  heatMapChart.setOption(option);

  // 🔹 Ajusta el tamaño automáticamente después de renderizar
  setTimeout(() => {
    heatMapChart.resize();
  }, 300);
}

// prettier-ignore
const hours = [
    '0a', '1a', '2a', '3a', '4a', '5a', '6a',
    '7a', '8a', '9a', '10a', '11a',
    '12p', '1p', '2p', '3p', '4p', '5p',
    '6p', '7p', '8p', '9p', '10p', '11p'
];
// prettier-ignore
const days = [
    'Saturday', 'Friday', 'Thursday',
    'Wednesday', 'Tuesday', 'Monday', 'Sunday'
];
// prettier-ignore
const data = [[0, 0, 89],
[0, 1, 83],
[0, 2, 79],
[0, 3, 87],
[0, 4, 62],
[0, 5, 40],
[0, 6, 77],
[0, 7, 85],
[0, 8, 52],
[0, 9, 43],
[0, 10, 44],
[0, 11, 51],
[0, 12, 42],
[0, 13, 90],
[0, 14, 89],
[0, 15, 78],
[0, 16, 56],
[0, 17, 83],
[0, 18, 51],
[0, 19, 78],
[0, 20, 51],
[0, 21, 73],
[0, 22, 77],
[0, 23, 77],
[1, 0, 60],
[1, 1, 59],
[1, 2, 77],
[1, 3, 51],
[1, 4, 84],
[1, 5, 52],
[1, 6, 76],
[1, 7, 68],
[1, 8, 53],
[1, 9, 78],
[1, 10, 88],
[1, 11, 65],
[1, 12, 72],
[1, 13, 61],
[1, 14, 87],
[1, 15, 48],
[1, 16, 88],
[1, 17, 63],
[1, 18, 86],
[1, 19, 82],
[1, 20, 86],
[1, 21, 46],
[1, 22, 78],
[1, 23, 83],
[2, 0, 72],
[2, 1, 49],
[2, 2, 42],
[2, 3, 47],
[2, 4, 69],
[2, 5, 70],
[2, 6, 89],
[2, 7, 85],
[2, 8, 59],
[2, 9, 84],
[2, 10, 80],
[2, 11, 44],
[2, 12, 65],
[2, 13, 50],
[2, 14, 85],
[2, 15, 69],
[2, 16, 87],
[2, 17, 58],
[2, 18, 85],
[2, 19, 51],
[2, 20, 58],
[2, 21, 86],
[2, 22, 74],
[2, 23, 67],
[3, 0, 55],
[3, 1, 66],
[3, 2, 63],
[3, 3, 67],
[3, 4, 90],
[3, 5, 43],
[3, 6, 79],
[3, 7, 86],
[3, 8, 62],
[3, 9, 64],
[3, 10, 85],
[3, 11, 54],
[3, 12, 64],
[3, 13, 63],
[3, 14, 81],
[3, 15, 76],
[3, 16, 51],
[3, 17, 77],
[3, 18, 75],
[3, 19, 70],
[3, 20, 58],
[3, 21, 62],
[3, 22, 69],
[3, 23, 85],
[4, 0, 47],
[4, 1, 51],
[4, 2, 82],
[4, 3, 55],
[4, 4, 89],
[4, 5, 53],
[4, 6, 83],
[4, 7, 54],
[4, 8, 45],
[4, 9, 55],
[4, 10, 58],
[4, 11, 62],
[4, 12, 59],
[4, 13, 75],
[4, 14, 81],
[4, 15, 44],
[4, 16, 57],
[4, 17, 44],
[4, 18, 61],
[4, 19, 88],
[4, 20, 62],
[4, 21, 47],
[4, 22, 65],
[4, 23, 83],
[5, 0, 68],
[5, 1, 71],
[5, 2, 50],
[5, 3, 53],
[5, 4, 76],
[5, 5, 74],
[5, 6, 89],
[5, 7, 84],
[5, 8, 85],
[5, 9, 58],
[5, 10, 79],
[5, 11, 41],
[5, 12, 58],
[5, 13, 40],
[5, 14, 65],
[5, 15, 52],
[5, 16, 43],
[5, 17, 75],
[5, 18, 59],
[5, 19, 66],
[5, 20, 46],
[5, 21, 44],
[5, 22, 66],
[5, 23, 60],
[6, 0, 78],
[6, 1, 70],
[6, 2, 58],
[6, 3, 40],
[6, 4, 75],
[6, 5, 52],
[6, 6, 59],
[6, 7, 63],
[6, 8, 78],
[6, 9, 81],
[6, 10, 66],
[6, 11, 44],
[6, 12, 50],
[6, 13, 83],
[6, 14, 50],
[6, 15, 48],
[6, 16, 82],
[6, 17, 75],
[6, 18, 53],
[6, 19, 54],
[6, 20, 85],
[6, 21, 64],
[6, 22, 44],
[6, 23, 68]]




///////////////////////
let sensoresData = [];
let isUpdating = false; // Bandera para evitar llamadas recursivas
let sensoresEndpointData = [];
$(document).ready(function () {
  $("select").select2({ width: "200px", dropdownAutoWidth: true });

  // Obtener datos desde el backend
  fetch("/analitica/sensores")
    .then((response) => response.json())
    .then((data) => {
      sensoresData = data;
      sensoresEndpointData = data;
      llenarOpcionesFiltros(data);
      actualizarOpcionesDinamicas();
    })
    .catch((error) => console.error("Error cargando sensores:", error));

  $("#filter-municipio").on("change", function () {
    $("#filter-barrio").val(""); // Reiniciar barrio al cambiar municipio
    actualizarOpcionesDinamicas();
    $(this).select2("close"); // Cerrar automáticamente
  });

  $("#filter-barrio").on("change", function () {
    actualizarOpcionesDinamicas();
    $(this).select2("close"); // Cerrar automáticamente
  });

  $("#filter-uso-suelo").on("change", function () {
    actualizarOpcionesDinamicas();
    $(this).select2("close"); // Cerrar automáticamente
  });

  $("#filter-sensores").on("change", function () {
    manejarSeleccionSensores();
  });
});

// Llenar las opciones iniciales de Municipio, Barrio y Uso del Suelo
// 🔹 Llenar las opciones iniciales de Municipio, Barrio y Uso del Suelo
function llenarOpcionesFiltros(data) {
  let municipios = new Set(
    data.map((sensor) => sensor.municipio).filter(Boolean)
  );
  let usosSuelo = new Set(
    data.map((sensor) => sensor.uso_suelo).filter(Boolean)
  );

  llenarSelect("#filter-municipio", municipios);
  llenarSelect("#filter-uso-suelo", usosSuelo);
  actualizarOpcionesDinamicas();
}
// Función para llenar un select con valores
// 🔹 Función para llenar un select con valores
function llenarSelect(selector, values) {
  let $select = $(selector);
  let selectedValue = $select.val(); // Mantener selección actual
  $select.empty().append(new Option("Todos", "")); // Opción "Todos"
  values.forEach((value) => {
    if (value) {
      $select.append(new Option(value, value, false, selectedValue === value));
    }
  });
}

// 🔹 Filtrar sensores en base a Municipio, Barrio y Uso del Suelo
function actualizarOpcionesDinamicas() {
  let municipioSeleccionado = $("#filter-municipio").val();
  let barrioSeleccionado = $("#filter-barrio").val();
  let usoSueloSeleccionado = $("#filter-uso-suelo").val();

  // Filtrar sensores según el municipio, barrio y uso del suelo seleccionados
  let sensoresFiltrados = sensoresData.filter(
    (sensor) =>
      (municipioSeleccionado === "" ||
        sensor.municipio === municipioSeleccionado) &&
      (barrioSeleccionado === "" || sensor.barrio === barrioSeleccionado) &&
      (usoSueloSeleccionado === "" || sensor.uso_suelo === usoSueloSeleccionado)
  );

  // Extraer barrios y usos de suelo según los sensores filtrados
  let barrios = new Set(
    sensoresFiltrados.map((sensor) => sensor.barrio).filter(Boolean)
  );
  let usosSuelo = new Set(
    sensoresFiltrados.map((sensor) => sensor.uso_suelo).filter(Boolean)
  );

  llenarSelect("#filter-barrio", barrios);
  llenarSelect("#filter-uso-suelo", usosSuelo);
  actualizarSelectSensores(sensoresFiltrados);
}

// 🔹 Actualizar el select de sensores según los filtros aplicados
function actualizarSelectSensores(sensores) {
  let $selectSensores = $("#filter-sensores");
  let valoresSeleccionados = $selectSensores.val() || [];

  let sensoresDisponibles = sensores.map((sensor) => sensor.sensor_id);
  let seleccionAnterior = valoresSeleccionados.filter((val) =>
    sensoresDisponibles.includes(val)
  );

  isUpdating = true; // Evitar cambios recursivos
  $selectSensores.empty();
  $selectSensores.append(new Option("Todos", "todos")); // Opción "Todos"

  sensores.forEach((sensor) => {
    let textoOpcion = `${sensor.referencia || "Sin referencia"}`; // 🔹 Muestra sensor_id + referencia
    let selected = seleccionAnterior.includes(sensor.sensor_id);
    $selectSensores.append(
      new Option(textoOpcion, sensor.sensor_id, false, selected)
    );
  });

  // Configurar Select2 correctamente
  $selectSensores.select2({
    width: "200px",
    placeholder: "Selecciona sensores",
    allowClear: true,
    closeOnSelect: false, // ✅ Sensores mantienen el menú abierto
  });

  if (seleccionAnterior.length === 0) {
    $selectSensores.val(["todos"]).trigger("change");
  }

  isUpdating = false;
  actualizarListaSensores($selectSensores.val() || []);
}

// 🔹 Mostrar la lista de sensores seleccionados
function actualizarListaSensores(sensoresSeleccionados) {
  let $listaSensores = $("#sensor-list");
  $listaSensores.empty(); // Limpiar lista

  let municipioSeleccionado = $("#filter-municipio").val();
  let barrioSeleccionado = $("#filter-barrio").val();
  let usoSueloSeleccionado = $("#filter-uso-suelo").val();

  // Filtrar sensores según los filtros aplicados
  let sensoresFiltrados = sensoresData.filter(
    (sensor) =>
      (municipioSeleccionado === "" ||
        sensor.municipio === municipioSeleccionado) &&
      (barrioSeleccionado === "" || sensor.barrio === barrioSeleccionado) &&
      (usoSueloSeleccionado === "" || sensor.uso_suelo === usoSueloSeleccionado)
  );

  if (sensoresSeleccionados.includes("todos")) {
    sensoresSeleccionados = sensoresFiltrados.map((sensor) => sensor.sensor_id);
  }

  sensoresSeleccionados.forEach((sensorId) => {
    let sensor = sensoresFiltrados.find((s) => s.sensor_id === sensorId);
    if (sensor) {
      $listaSensores.append(
        `<li>${sensor.sensor_id} - ${sensor.municipio} - ${sensor.barrio} - ${sensor.uso_suelo}</li>`
      );
    }
  });
}

function manejarSeleccionSensores() {
  let $selectSensores = $("#filter-sensores");
  let valoresSeleccionados = $selectSensores.val() || [];

  if (isUpdating) return; // ✅ Evita bucles infinitos
  isUpdating = true; // 🔒 Bloqueamos eventos temporales

  if (valoresSeleccionados.includes("todos")) {
    // ✅ Si selecciono "Todos", eliminar todas las demás selecciones
    $selectSensores.val(["todos"]).trigger("change");
  } else {
    // ✅ Si selecciono cualquier otro sensor cuando "Todos" está activo, eliminar "Todos"
    let indexTodos = valoresSeleccionados.indexOf("todos");
    if (indexTodos !== -1) {
      valoresSeleccionados.splice(indexTodos, 1); // ❌ Eliminar "Todos"
    }

    $selectSensores.val(valoresSeleccionados).trigger("change");
  }

  actualizarListaSensores(valoresSeleccionados);
  actualizarTextoSelector(valoresSeleccionados); // 🔹 Modificamos el texto del selector

  isUpdating = false;
}

// 🔹 Función para cambiar el texto del selector cuando se cierra el menú
function actualizarTextoSelector(seleccionados) {
  let $selectSensores = $("#filter-sensores");

  if (seleccionados.includes("todos")) {
    $selectSensores
      .next(".select2-container")
      .find(".select2-selection__rendered")
      .text("Todos los sensores");
  } else if (seleccionados.length > 0) {
    $selectSensores
      .next(".select2-container")
      .find(".select2-selection__rendered")
      .text("Sensores seleccionados");
  } else {
    $selectSensores
      .next(".select2-container")
      .find(".select2-selection__rendered")
      .text("Seleccione sensores");
  }
}

// 🔹 Escuchar el evento cuando se cierra el selector y actualizar el texto
$("#filter-sensores").on("select2:close", function () {
  let valoresSeleccionados = $(this).val() || [];
  actualizarTextoSelector(valoresSeleccionados);
});

// Mostrar la lista de sensores seleccionados
function obtenerDatosHeatmap() {
  const spinnerOverlay = document.getElementById("spinner-overlay");
  spinnerOverlay.classList.remove("oculto"); // Mostrar overlay
  

  let sensoresSeleccionados = $("#filter-sensores").val();
  let fechaSeleccionada = document
    .getElementById("filter-fecha")
    .getAttribute("data-date");

  // 🔹 Validaciones previas
  if (!sensoresSeleccionados || sensoresSeleccionados.length === 0) {
    console.warn("⚠️ No se han seleccionado sensores.");
    spinner.classList.add("oculto"); // 🔁 Ocultar spinner si no hay sensores
    return;
  }

  // 🔹 Si no se selecciona una fecha, se usa el día anterior
  if (!fechaSeleccionada) {
    let fechaActual = new Date();
    fechaActual.setDate(fechaActual.getDate() - 1);
    fechaSeleccionada = fechaActual.toISOString().split("T")[0];
  }

  // 🔹 Filtrar sensores según los filtros activos
  let municipioSeleccionado = $("#filter-municipio").val();
  let barrioSeleccionado = $("#filter-barrio").val();
  let usoSueloSeleccionado = $("#filter-uso-suelo").val();

  let sensoresFiltrados = sensoresData.filter(
    (sensor) =>
      (municipioSeleccionado === "" ||
        sensor.municipio === municipioSeleccionado) &&
      (barrioSeleccionado === "" || sensor.barrio === barrioSeleccionado) &&
      (usoSueloSeleccionado === "" ||
        sensor.uso_suelo === usoSueloSeleccionado)
  );

  // 🔹 Si el usuario seleccionó "Todos", se obtienen todos los sensores filtrados
  if (sensoresSeleccionados.includes("todos")) {
    sensoresSeleccionados = sensoresFiltrados.map(
      (sensor) => sensor.sensor_id
    );
  }

  // console.log(
  //   "📌 Sensores seleccionados para la consulta:",
  //   sensoresSeleccionados
  // );
  // console.log("📌 Fecha seleccionada:", fechaSeleccionada);

  // 🔹 Hacer la solicitud al backend con sensores y fecha
  fetch("/analitica/laeqhora", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sensores: sensoresSeleccionados,
      fecha: fechaSeleccionada,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Error en la respuesta del servidor: ${response.status}`
        );
      }
      return response.json();
    })
    .then((data) => {
      // console.log("📌 Datos recibidos del backend para el heatmap:", data);
      construirHeatmap(data);
    })
    .catch((error) =>
      console.error("❌ Error obteniendo datos del heatmap:", error)
    )
    .finally(() => {
      spinnerOverlay.classList.add("oculto"); // Ocultar overlay
    });
    
}




/////
function procesarDatosHeatmap(datos) {
  // console.log("📌 Datos recibidos en procesarDatosHeatmap:", datos);

  const horasReferencia = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const dataFormateada = [];
  const nombresSensores = [];

  datos.forEach((sensorObj, indexSensor) => {
    const { sensor: sensorId, datos: registros } = sensorObj;

    // 🔎 Buscar en sensoresData la información del sensor
    const sensorInfo = sensoresData.find((s) => s.sensor_id === sensorId);

    const nombreSensor = sensorInfo
      // ? ` ${sensorInfo.referencia || sensorId}`
      ? `${sensorInfo.barrio || ""} - ${sensorInfo.referencia || sensorId}`
      : 
        sensorId;

    nombresSensores.push(nombreSensor.trim());

    if (!Array.isArray(registros)) {
      console.warn(`⚠️ El sensor ${sensorId} no tiene registros válidos.`);
      return;
    }

    registros.sort((a, b) => new Date(a.hora) - new Date(b.hora));

    registros.forEach((entry) => {
      const hora = new Date(entry.hora).getHours();
      let laeq = parseFloat(entry.laeq_slow);

      if (isNaN(laeq)) {
        laeq = "-";
      } else {
        laeq = parseFloat(laeq.toFixed(1));
      }

      dataFormateada.push([indexSensor, hora, laeq]);
    });
  });

  console.log("📌 Sensores (eje Y):", nombresSensores);
  console.log("📌 Datos formateados:", dataFormateada);

  return {
    data: dataFormateada,
    xlabels: horasReferencia,
    ylabels: nombresSensores,
  };
}

function construirHeatmap(datos) {
  let { data, xlabels, ylabels } = procesarDatosHeatmap(datos);

  let opciones = {
    xlabels: xlabels,
    ylabels: ylabels,
    title: "Nivel de ruido por hora",
    xAxisName: "Hora", // ✅ Aquí defines el nombre del eje X
  };

  heatmap(data, "heatmapLday", opciones);
}

// 🔹 Llamamos la función cuando se presiona el botón
$("#btn-cargar-heatmap").on("click", function () {
  obtenerDatosHeatmap();
});

///// para la fecha dias
document.addEventListener("DOMContentLoaded", function () {
  // 🔹 Obtener referencia al input
  const inputFecha = document.getElementById("filter-fecha");
  if (!inputFecha) return; // Validación de existencia

  // 🔹 Hacer el input de solo lectura para evitar edición manual
  inputFecha.setAttribute("readonly", true);

  // 🔹 Función para formatear fecha en texto amigable
  const opcionesFormato = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const formatearFechaTexto = (fecha) =>
    fecha.toLocaleDateString("es-ES", opcionesFormato);

  // 🔹 Obtener la fecha de hoy
  const fechaAyer = new Date();
  fechaAyer.setDate(fechaAyer.getDate());

  const fechaISO = fechaAyer.toISOString().split("T")[0];
  const fechaTexto = formatearFechaTexto(fechaAyer);


  // 🔹 Inicializar Litepicker
  const picker = new Litepicker({
    element: inputFecha,
    singleMode: true,
    format: "YYYY-MM-DD", // formato usado internamente
    lang: "es-ES",
    autoApply: true,
    dropdowns: {
      minYear: 2020,
      maxYear: new Date().getFullYear(),
    },
    startDate: fechaISO,
    setup: (picker) => {
      picker.on("selected", (date) => {
        // Esperar a que Litepicker actualice internamente antes de sobreescribir
        setTimeout(() => {
          const nuevaFechaTexto = formatearFechaTexto(date.dateInstance);
          inputFecha.value = nuevaFechaTexto;
          inputFecha.setAttribute("data-date", date.format("YYYY-MM-DD"));
        }, 0);
      });
    },
  });

    // 🔹 Establecer el valor inicial del input
    inputFecha.value = fechaTexto;
    inputFecha.setAttribute("data-date", fechaISO);
  

  // 🔹 Mostrar fecha ISO cuando el input está enfocado
  inputFecha.addEventListener("focus", function () {
    inputFecha.value = inputFecha.getAttribute("data-date");
  });

  // 🔹 Restaurar formato textual al salir del input
  inputFecha.addEventListener("blur", function () {
    const fechaGuardada = new Date(inputFecha.getAttribute("data-date"));
    inputFecha.value = formatearFechaTexto(fechaGuardada);
  });
});


/////////////////////// semana
// 🔁 SCRIPT COMPLETO CON AJUSTES FINALES

// ✅ Función para formatear fechas amigables en español
function formatearFechaTexto(fechaStr) {
  const fecha = new Date(new Date(fechaStr).toISOString().split("T")[0] + 'T12:00:00');
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ✅ Función para obtener los 7 días de la semana desde un lunes
function getDiasSemanaDesdeFecha(lunes) {
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    dias.push(dia.toISOString().split("T")[0]);
  }
  return dias;
}

// ✅ Función para obtener fechaInicio, fechaFin y texto amigable
function obtenerRangoDesdeFechaFormateado(fechaISO) {
  const fecha = new Date(fechaISO);
  const fechaFin = new Date(fecha);
  fechaFin.setDate(fecha.getDate() + 6);

  const fechaInicioISO = fecha.toISOString().split("T")[0];
  const fechaFinISO = fechaFin.toISOString().split("T")[0];

  const textoAmigable = `Semana del ${formatearFechaTexto(fechaInicioISO)} al ${formatearFechaTexto(fechaFinISO)}`;

  return {
    fechaInicio: fechaInicioISO,
    fechaFin: fechaFinISO,
    textoAmigable,
  };
}

// ✅ Inicialización DOM

document.addEventListener("DOMContentLoaded", function () {
  const inputFechaSemana = document.getElementById("filter-fecha-semana");

  const pickerSemana = new Litepicker({
    element: inputFechaSemana,
    singleMode: true,
    format: "YYYY-MM-DD",
    lang: "es-ES",
    autoApply: true,
    dropdowns: {
      minYear: 2020,
      maxYear: new Date().getFullYear(),
    },
    lockDaysFilter: (date) => date.getDay() !== 1, // Solo lunes habilitado
    highlightedDays: [],
    setup: (picker) => {
      picker.on("selected", (date) => {
        const fechaISO = date.format("YYYY-MM-DD");
        const { fechaInicio, fechaFin, textoAmigable } = obtenerRangoDesdeFechaFormateado(fechaISO);

        inputFechaSemana.setAttribute("data-fechaInicio", fechaInicio);
        inputFechaSemana.setAttribute("data-fechaFin", fechaFin);

        const diasAResaltar = getDiasSemanaDesdeFecha(new Date(fechaInicio));
        picker.setOptions({ highlightedDays: diasAResaltar });

        setTimeout(() => {
          inputFechaSemana.value = textoAmigable;
        }, 0);
      });
    },
  });

  // Seleccionar lunes de la semana actual al iniciar
  const hoy = new Date();
  const lunesActual = new Date(hoy);
  const diaSemana = hoy.getDay();
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  lunesActual.setDate(lunesActual.getDate() + offsetLunes);

  const { fechaInicio, fechaFin, textoAmigable } = obtenerRangoDesdeFechaFormateado(
    lunesActual.toISOString().split("T")[0]
  );

  inputFechaSemana.setAttribute("data-fechaInicio", fechaInicio);
  inputFechaSemana.setAttribute("data-fechaFin", fechaFin);

  const diasAResaltar = getDiasSemanaDesdeFecha(new Date(fechaInicio));
  pickerSemana.setOptions({ highlightedDays: diasAResaltar });

  setTimeout(() => {
    inputFechaSemana.value = textoAmigable;
  }, 0);

  // Evitar edición manual y restaurar texto amigable
  inputFechaSemana.addEventListener("focus", function () {
    inputFechaSemana.value = inputFechaSemana.getAttribute("data-fechaInicio");
  });

  inputFechaSemana.addEventListener("blur", function () {
    const fechaInicio = inputFechaSemana.getAttribute("data-fechaInicio");
    const fechaFin = inputFechaSemana.getAttribute("data-fechaFin");
    if (fechaInicio && fechaFin) {
      inputFechaSemana.value = `Semana del ${formatearFechaTexto(
        new Date(fechaInicio)
      )} al ${formatearFechaTexto(new Date(fechaFin))}`;
    }
  });

  inputFechaSemana.setAttribute("readonly", true);

  // Disparar consulta automática al iniciar con semana actual
  obtenerDatosHeatmapSemana();
});

function obtenerDatosHeatmapSemana() {
  const spinner = document.getElementById("spinner-semana");
  spinner.classList.remove("oculto"); // Mostrar spinner

  let sensoresSeleccionados = $("#filter-sensores").val();
  let fechaInicio = $("#filter-fecha-semana").attr("data-fechaInicio");
  let fechaFin = $("#filter-fecha-semana").attr("data-fechaFin");

  if (!fechaInicio || !fechaFin) {
    console.warn("⚠️ No se ha seleccionado una semana válida.");
    spinner.classList.add("oculto");
    return;
  }

  let municipioSeleccionado = $("#filter-municipio").val();
  let barrioSeleccionado = $("#filter-barrio").val();
  let usoSueloSeleccionado = $("#filter-uso-suelo").val();

  let sensoresFiltrados = sensoresData.filter(
    (sensor) =>
      (municipioSeleccionado === "" || sensor.municipio === municipioSeleccionado) &&
      (barrioSeleccionado === "" || sensor.barrio === barrioSeleccionado) &&
      (usoSueloSeleccionado === "" || sensor.uso_suelo === usoSueloSeleccionado)
  );

  if (!sensoresSeleccionados || sensoresSeleccionados.includes("todos")) {
    sensoresSeleccionados = sensoresFiltrados.map((sensor) => sensor.sensor_id);
  } else {
    sensoresSeleccionados = sensoresSeleccionados.filter((id) =>
      sensoresFiltrados.some((sensor) => sensor.sensor_id === id)
    );
  }

  if (sensoresSeleccionados.length === 0) {
    console.warn("⚠️ No hay sensores válidos tras el filtro.");
    spinner.classList.add("oculto");
    return;
  }

  // console.log(`📌 Cargando datos semanales del ${fechaInicio} al ${fechaFin}`);
  // console.log("📌 Sensores filtrados:", sensoresSeleccionados);

  Promise.all([
    fetch("/analitica/laeqsemana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensores: sensoresSeleccionados, fechaInicio, fechaFin, tipoResumen: "general" }),
    }).then((res) => res.json()),
    fetch("/analitica/laeqsemana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensores: sensoresSeleccionados, fechaInicio, fechaFin, tipoResumen: "dia" }),
    }).then((res) => res.json()),
    fetch("/analitica/laeqsemana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensores: sensoresSeleccionados, fechaInicio, fechaFin, tipoResumen: "noche" }),
    }).then((res) => res.json()),
  ])
    .then(([dataGeneral, dataDia, dataNoche]) => {
      // console.log("📌 Datos recibidos:");
      // console.log("➡️ General:", dataGeneral);
      // console.log("➡️ Día:", dataDia);
      // console.log("➡️ Noche:", dataNoche);

      construirHeatmapSemana(dataGeneral, "heatmapLweek", "Nivel Ruido 24h", sensoresSeleccionados);
      construirHeatmapSemana(dataDia, "heatmapLweekDia", "Nivel de ruido diurno", sensoresSeleccionados);
      construirHeatmapSemana(dataNoche, "heatmapLweekNoche", "Nivel de ruido nocturno", sensoresSeleccionados);
    })
    .catch((error) => {
      console.error("❌ Error obteniendo datos del heatmap semanal:", error);
    })
    .finally(() => {
      spinner.classList.add("oculto"); // Ocultar spinner siempre al final
    });
}


$("#btn-cargar-heatmap-semana").on("click", function () {
  obtenerDatosHeatmapSemana();
});

function procesarDatosHeatmapSemana(datos, sensoresSeleccionados) {
  const dataFormateada = [];
  const referenciasSensores = [];
  const diasSemana = [];

  let fechaInicio = document.getElementById("filter-fecha-semana").getAttribute("data-fechaInicio");
  if (fechaInicio) {
    let lunes = new Date(fechaInicio);
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const fechaISO = d.toISOString().split("T")[0];
      const fechaLocal = new Date(fechaISO + 'T12:00:00');
      const dia = fechaLocal.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "short"
      });
      diasSemana.push(dia);
    }
  }

  sensoresSeleccionados.forEach((sensorId, indexSensor) => {
    const sensorData = datos.find((d) => d.sensor === sensorId);
    const registros = sensorData ? sensorData.datos : [];

    const sensorInfo = sensoresData.find((s) => s.sensor_id === sensorId);
    const nombre = sensorInfo ? `${sensorInfo.barrio || ""} - ${sensorInfo.referencia || sensorId}` : sensorId;

    referenciasSensores.push(nombre);

    registros.forEach((entry) => {
      const fechaInicioStr = document.getElementById("filter-fecha-semana").getAttribute("data-fechaInicio");
      const fechaInicioDate = new Date(fechaInicioStr + 'T00:00:00-05:00');
      const fechaActual = new Date(new Date(entry.fecha).toISOString().split("T")[0] + 'T12:00:00');

      const diffDias = Math.floor((fechaActual - fechaInicioDate) / (1000 * 60 * 60 * 24));
      const diaIndex = diffDias;

      let laeq = parseFloat(entry.laeq_slow);
      laeq = isNaN(laeq) ? "-" : parseFloat(laeq.toFixed(1));

      dataFormateada.push([indexSensor, diaIndex, laeq]);
    });
  });

  return {
    data: dataFormateada,
    xlabels: diasSemana,
    ylabels: referenciasSensores,
  };
}

function construirHeatmapSemana(datos, divId, titulo, sensoresSeleccionados) {
  let { data, xlabels, ylabels } = procesarDatosHeatmapSemana(datos, sensoresSeleccionados);
  // console.log("📌 Datos formateados para el heatmap semanal:", data);

  let opciones = {
    xlabels: xlabels,
    ylabels: ylabels,
    title: titulo,
    xAxisName: "Día", // ✅ Aquí defines el nombre del eje X
  };

  heatmap(data, divId, opciones);
  document.getElementById("descripcionLweek").classList.remove("oculto");
document.getElementById("descripcionLweekDia").classList.remove("oculto");
document.getElementById("descripcionLweekNoche").classList.remove("oculto");

}

/////////////////////////////// HEATMAP MENSUAL ///////////////////////////////
document.addEventListener("DOMContentLoaded", function () {
  const selectMes = document.getElementById("select-mes");
  const selectAnio = document.getElementById("select-anio");
  const btnCargarMes = document.getElementById("btn-cargar-heatmap-mes");

  const anioActual = new Date().getFullYear();
  for (let i = anioActual; i >= 2020; i--) {
      let option = new Option(i, i);
      selectAnio.appendChild(option);
  }
  selectAnio.value = anioActual;

  function obtenerDiasDelMes(anio, mes) {
      const dias = new Date(anio, mes, 0).getDate(); // mes en 1–12
      let listaDias = [];
      for (let d = 1; d <= dias; d++) {
          listaDias.push(d.toString().padStart(2, "0"));
      }
      return listaDias;
  }

  function obtenerDatosHeatmapMes() {
    const spinner = document.getElementById("spinner-mes");
    spinner.classList.remove("oculto");
  
    let sensoresSeleccionados = $("#filter-sensores").val();
    let mes = parseInt($("#select-mes").val(), 10);
    let anio = parseInt($("#select-anio").val(), 10);
  
    if (!mes || !anio) {
      console.warn("⚠️ No se ha seleccionado un mes o año válido.");
      spinner.classList.add("oculto"); // ✅ ocultar spinner
      return;
    }
  
    let municipioSeleccionado = $("#filter-municipio").val();
    let barrioSeleccionado = $("#filter-barrio").val();
    let usoSueloSeleccionado = $("#filter-uso-suelo").val();
  
    let sensoresFiltrados = sensoresData.filter(sensor =>
      (municipioSeleccionado === "" || sensor.municipio === municipioSeleccionado) &&
      (barrioSeleccionado === "" || sensor.barrio === barrioSeleccionado) &&
      (usoSueloSeleccionado === "" || sensor.uso_suelo === usoSueloSeleccionado)
    );
  
    if (!sensoresSeleccionados || sensoresSeleccionados.includes("todos")) {
      sensoresSeleccionados = sensoresFiltrados.map(sensor => sensor.sensor_id);
    } else {
      sensoresSeleccionados = sensoresSeleccionados.filter(id =>
        sensoresFiltrados.some(sensor => sensor.sensor_id === id)
      );
    }
  
    if (sensoresSeleccionados.length === 0) {
      console.warn("⚠️ No hay sensores válidos tras el filtro.");
      spinner.classList.add("oculto"); // ✅ ocultar spinner
      return;
    }
  
    // console.log(`📌 Consultando datos para el mes ${mes}-${anio}`);
    // console.log("📌 Sensores filtrados:", sensoresSeleccionados);
  
    Promise.all([
      fetch("/analitica/laeqmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensores: sensoresSeleccionados, mes, anio, tipoResumen: "general" }),
      }).then(res => res.json()),
      fetch("/analitica/laeqmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensores: sensoresSeleccionados, mes, anio, tipoResumen: "dia" }),
      }).then(res => res.json()),
      fetch("/analitica/laeqmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensores: sensoresSeleccionados, mes, anio, tipoResumen: "noche" }),
      }).then(res => res.json()),
    ])
      .then(([dataGeneral, dataDia, dataNoche]) => {
        const diasDelMes = obtenerDiasDelMes(anio, mes);
  
        construirHeatmapMes(dataGeneral, "heatmapLmes24h", "Nivel de ruido (24h)", sensoresSeleccionados, diasDelMes);
        construirHeatmapMes(dataDia, "heatmapLmesDia", "Nivel de ruido diurno", sensoresSeleccionados, diasDelMes);
        construirHeatmapMes(dataNoche, "heatmapLmesNoche", "Nivel de ruido nocturno", sensoresSeleccionados, diasDelMes);
      })
      .catch(error => {
        console.error("❌ Error obteniendo datos del heatmap mensual:", error);
      })
      .finally(() => {
        spinner.classList.add("oculto");
      });
  }
  

  $("#btn-cargar-heatmap-mes").on("click", obtenerDatosHeatmapMes);
  selectMes.addEventListener("change", obtenerDatosHeatmapMes);
  selectAnio.addEventListener("change", obtenerDatosHeatmapMes);
  obtenerDatosHeatmapMes(); // carga inicial
});

function procesarDatosHeatmapMes(datos, diasDelMes) {
  let dataFormateada = [];
  let ylabels = [];

  Object.entries(datos).forEach(([sensorId, registros], indexSensor) => {
      const sensorInfo = sensoresData.find(s => s.sensor_id === sensorId);
      const nombre = sensorInfo
          ? `${sensorInfo.barrio || "Sin barrio"} - ${sensorInfo.referencia || sensorId}`
          : sensorId;

      ylabels.push(nombre);

      let datosPorDia = {};
      registros.forEach(entry => {
          const dia = new Date(entry.fecha).getUTCDate().toString().padStart(2, "0"); // ✅ Hora militar
          let laeq = parseFloat(entry.laeq_slow);
          datosPorDia[dia] = isNaN(laeq) ? "-" : laeq.toFixed(1);
      });

      diasDelMes.forEach((dia, indexDia) => {
          let laeq = datosPorDia[dia] || "-";
          dataFormateada.push([indexSensor, indexDia, laeq]);
      });
  });

  return {
      data: dataFormateada,
      xlabels: diasDelMes,  // ✅ Días en formato hora militar: 01-31
      ylabels: ylabels       // ✅ "Barrio - Referencia"
  };
}


function construirHeatmapMes(datos, divId, titulo, sensoresSeleccionados, diasDelMes) {
  let { data, xlabels, ylabels } = procesarDatosHeatmapMes(datos, diasDelMes);
  heatmap(data, divId, {
      xlabels,
      ylabels,
      title: titulo,
      xAxisName: "Día", // ✅ Aquí defines el nombre del eje X
  });
  document.getElementById("descripcionLmes24h").classList.remove("oculto");
document.getElementById("descripcionLmesDia").classList.remove("oculto");
document.getElementById("descripcionLmesNoche").classList.remove("oculto");

}


///////////////

function obtenerSensoresFiltradosDesdeEndpoint() {
  const municipio = document.getElementById("filter-municipio").value;
  const barrio = document.getElementById("filter-barrio").value;
  const usoSuelo = document.getElementById("filter-uso-suelo").value;
  const sensoresSeleccionados = $('#filter-sensores').val(); // select múltiple

  const seleccionaTodos = sensoresSeleccionados.includes("todos");

  return sensoresEndpointData.filter(sensor => {
    const coincideSensor = seleccionaTodos || sensoresSeleccionados.includes(sensor.sensor_id);
    return (
      (!municipio || sensor.municipio === municipio) &&
      (!barrio || sensor.barrio === barrio) &&
      (!usoSuelo || sensor.uso_suelo === usoSuelo) &&
      coincideSensor
    );
  });
}
const sensoresFiltrados = obtenerSensoresFiltradosDesdeEndpoint();
const sensoresNombres = sensoresFiltrados.map(s => s.referencia || s.sensor_id);

const municipio = document.getElementById("filter-municipio").value || "Todos";
const barrio = document.getElementById("filter-barrio").value || "Todos";
const usoSuelo = document.getElementById("filter-uso-suelo").value || "Todos";

const filtrosHtml = `
  <ul style="font-size: 10px; line-height: 1.4; padding-left: 18px;">
    <li><strong>Municipio:</strong> ${municipio}</li>
    <li><strong>Barrio:</strong> ${barrio}</li>
    <li><strong>Uso del Suelo:</strong> ${usoSuelo}</li>
    <li><strong>Sensores:</strong> ${sensoresNombres.join(", ") || "Todos"}</li>
  </ul>
`;
function generarTablaHTMLDescripcionSensores(sensores) {
  if (!sensores || sensores.length === 0) {
    return "<tr><td colspan='13'>No se encontraron sensores para este análisis</td></tr>";
  }

  return sensores.map(s => `
    <tr>
      <td>${s.sensor_id || "--"}</td>
      <td>${s.referencia || "--"}</td>
      <td>${s.municipio || "--"}</td>
      <td>${s.barrio || "--"}</td>
      <td>${s.direccion || "--"}</td>
      <td>${s.tipo || "--"}</td>
      <td>${s.uso_suelo || "--"}</td>
      <td>${s.clasificacion || "--"}</td>
      <td>${s.instalacion || "--"}</td>
      <td>${s.sector || "--"}</td>
      <td>${s.subsector || "--"}</td>
      <td>${s.departamento || "--"}</td>
      <td>${(s.lat && s.lon) ? `${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}` : "--"}</td>
    </tr>
  `).join("");
}

const tablaSensoresHtml = generarTablaHTMLDescripcionSensores(sensoresFiltrados);

