/**
@file public/js/sensors.js
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

const chartDom = document.getElementById("chart");
const chart = echarts.init(chartDom);

document.addEventListener("DOMContentLoaded", function () {
  // Inicializar el selector de rango de fechas
  const dateRangePicker = flatpickr("#date-range", {
    mode: "range", // Permite seleccionar un rango de fechas
    dateFormat: "Y-m-d", // Formato de fecha (YYYY-MM-DD)
    defaultDate: [
      new Date(new Date().setDate(new Date().getDate() - 30)), // 30 días antes
      new Date(), // Fecha actual
    ],
    locale: {
      firstDayOfWeek: 1, // Semana empieza en lunes
    },
  });

  // Función para ajustar las fechas locales al horario UTC
  function adjustLocalToUTC(date) {
    // Convertir fecha local al equivalente UTC
    const localTime = new Date(date);
    return new Date(
      localTime.getTime() - localTime.getTimezoneOffset() * 60000
    ); // Ajuste UTC
  }

  // Evento al hacer clic en el botón de filtrar
  document
    .getElementById("filter-button")
    .addEventListener("click", async () => {
      const selectedDates = dateRangePicker.selectedDates;

      // Validar que se hayan seleccionado dos fechas
      if (selectedDates.length !== 2) {
        alert("Por favor selecciona un rango de fechas válido.");
        return;
      }

      // Ajustar las fechas seleccionadas al horario UTC
      // Ajustar las fechas locales al horario UTC antes de enviar al backend
      const startDateUTC = adjustLocalToUTC(selectedDates[0])
        .toISOString()
        .split("T")[0];
      const endDateUTC = adjustLocalToUTC(selectedDates[1])
        .toISOString()
        .split("T")[0];

      // console.log(
      //   "Consultando datos entre UTC:",
      //   startDateUTC,
      //   "y",
      //   endDateUTC
      // );

      // Cargar datos con el rango de fechas ajustado a UTC
      await loadSensorData(startDateUTC, endDateUTC);
    });
});

// Función para formatear la fecha en el formato deseado
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const day = days[date.getDay()];
  const dayOfMonth = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const time = date.toLocaleTimeString();

  return {
    fullDate: `${day}, ${dayOfMonth} de ${month} de ${year}`,
    time: time,
  };
}

// Configuración inicial del gráfico
const chartOptions = {
  title: {
    text: "LAeq,slow",
    left: "center",
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "cross",
      label: {
        show: true,
        backgroundColor: "#6a7985",
      },
    },
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    textStyle: {
      color: "#333",
    },

    formatter: function (params) {
      const timestamp = params[0].data[0];
      const { fullDate, time } = formatDateTime(timestamp);

      const labels = ["LAeq,slow", "Mínimo", "Máximo"];
      const lines = params.map((p, index) => {
        const label = labels[index] || "Dato desconocido";
        return `<div>${label}: ${p.data[1]} dBA</div>`;
      });

      return `
                <div style="border-left: 4px solid ${
                  params[0].color
                }; padding: 10px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">${fullDate}</div>
                    <div style="margin-bottom: 10px;">Hora: ${time}</div>
                    ${lines.join("")}
                </div>
            `;
    },
  },
  grid: {
    left: "10%",
    right: "30%",
    top: "15%",
    bottom: "10%",
  },
  legend: {
    type: "scroll",
    orient: "vertical",
    right: "5%",
    top: "20%",
    itemWidth: 14,
    itemHeight: 14,
    selected: {}, // Se configurará más adelante
  },
  xAxis: {
    type: "time",
    name: "Fecha",
  },
  yAxis: {
    type: "value",
    name: "LAeq,slow (dB)",
    min: 0,
    max: 100,
  },
  dataZoom: [
    {
      type: "inside",
      xAxisIndex: 0,
      filterMode: "filter",
    },
    {
      type: "slider",
      xAxisIndex: 0,
      filterMode: "filter",
    },
  ],
  series: [],
};

chart.setOption(chartOptions);

// Cargar datos de los sensores con bandas de confianza
async function loadSensorData(startDate, endDate) {
  try {
    // Mostrar un mensaje de carga mientras se obtienen los datos
    chart.showLoading();

    // Si no se pasan fechas, usar valores predeterminados
    const defaultStartDate = new Date(
      new Date().setDate(new Date().getDate() - 30)
    )
      .toISOString()
      .split("T")[0];
    const defaultEndDate = new Date().toISOString().split("T")[0];

    startDate = startDate || defaultStartDate;
    endDate = endDate || defaultEndDate;

    // Enviar las fechas al backend
    const sensorDataResponse = await fetch(
      `/sensors/api/sensor-data?start_date=${startDate}&end_date=${endDate}`
    );

    // Validar respuesta
    if (!sensorDataResponse.ok) {
      throw new Error(
        `Error ${sensorDataResponse.status}: ${sensorDataResponse.statusText}`
      );
    }

    const data = await sensorDataResponse.json();

    // Validar si los datos son un array
    if (!Array.isArray(data) || data.length === 0) {
      throw new TypeError("No se recibieron datos válidos del servidor.");
    }

    // Agrupar datos por sensor con mínimo y máximo
    const groupedData = data.reduce((acc, row) => {
      if (!acc[row.sensor_id])
        acc[row.sensor_id] = {
          main: [],
          bandMin: [],
          bandMax: [],
          name: row.sensor_name,
        };

      const min = row.laeq_slow_min_max
        ? row.laeq_slow_min_max[0]
        : row.laeq_slow;
      const max = row.laeq_slow_min_max
        ? row.laeq_slow_min_max[1]
        : row.laeq_slow;

      acc[row.sensor_id].main.push([row.timestamp, row.laeq_slow]);
      acc[row.sensor_id].bandMin.push([row.timestamp, min]);
      acc[row.sensor_id].bandMax.push([row.timestamp, max]);

      return acc;
    }, {});

    const colors = [
      "#5470C6",
      "#91CC75",
      "#FAC858",
      "#EE6666",
      "#73C0DE",
      "#3BA272",
      "#FC8452",
      "#9A60B4",
      "#EA7CCC",
      "#FFC000",
      "#F4A7B9",
      "#B5E61D",
      "#00A6ED",
      "#FF7F50",
      "#32CD32",
      "#9370DB",
      "#4682B4",
      "#FF6347",
      "#1E90FF",
      "#FF1493",
    ];

    const series = Object.entries(groupedData).flatMap(
      ([sensorId, data], index) => {
        const lineColor = colors[index % colors.length];
        const customName = data.name;

        return [
          {
            name: customName, // Mismo nombre para la serie principal y la banda
            type: "line",
            data: data.main, // Valores de la serie principal
            color: lineColor,
            showSymbol: false, // No mostrar puntos
            emphasis: {
              focus: "series",
              lineStyle: {
                width: 3,
              },
            },
          },
          {
            name: customName, // Mismo nombre que la serie principal
            type: "line",
            data: data.bandMin.concat(data.bandMax.reverse()), // Crear área combinando min y max
            color: lineColor,
            showSymbol: false, // No mostrar puntos
            lineStyle: { opacity: 0 }, // Sin línea visible
            areaStyle: {
              opacity: 0.2, // Transparencia en la banda
            },
          },
        ];
      }
    );

    // Configurar qué serie está habilitada por defecto (solo sensor 001)
    const legendSelected = Object.fromEntries(
      series.map((s) => [
        s.name,
        groupedData["GTR_IoT_001"] &&
          groupedData["GTR_IoT_001"].name === s.name,
      ])
    );
    // Reiniciar el gráfico antes de aplicar los nuevos datos
    //chart.clear();

    chart.setOption({
      legend: {
        selected: legendSelected,
      },
      series,
    });
    // Ocultar el mensaje de carga
    chart.hideLoading();
  } catch (error) {
    console.error("Error loading sensor data:", error.message);
    chart.hideLoading();
  }
}

// Inicializar
loadSensorData();
