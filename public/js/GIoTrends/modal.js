/**
@file public/js/modal.js
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

export function openModal(sensorId) {
  const popup = document.getElementById("frameContainer");
  const popupDetails = document.getElementById("popup-details");

  popup.style.display = "flex";

  // 📌 Eliminar el `popup-header` si existe
  const existingHeader = document.querySelector(".popup-header");
  if (existingHeader) {
    existingHeader.remove();
  }

  document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "close-modal") {
      document.getElementById("frameContainer").style.display = "none";
    }
  });

  // 📌 Contenido inicial mientras carga los datos
  popupDetails.innerHTML = `

        <button id="close-modal" class="close-button">&times;</button>

        <div id="sensor-info-container">
            <div class="sensor-summary">
                <h3 id="sensor-title">Cargando información...</h3>
                <button id="toggle-sensor-info" class="toggle-button">Ocultar detalles</button>
                <div id="export-pdf-container" class="export-section ">
  <button id="export-pdf-button" class="export-button c-button">
   PDF
  </button>
</div>
            </div>
            <div id="sensor-details"></div>
        </div>


        <!-- 📌 Sección de gráficos y análisis -->
        <div id="chart-container">
            <div id="indicators-container" class="chart-section">
            
            
            </div>
                <div id="charts-wrapper">
        <div id="line-chart-container" class="chart-section"></div>
        <div id="bar-chart-container" class="chart-section"></div>
    </div>
        </div>
        <!-- Tooltip explicativo -->

  <span class="tooltip-text">
    Este módulo muestra los niveles de ruido ambiental registrados por el sensor durante los últimos 7 días, con mediciones cada 5 minutos. El gráfico de línea representa la evolución temporal del nivel de presión sonora equivalente (LAeq Slow), mientras que el gráfico de barras muestra el promedio del espectro de frecuencias captadas en ese periodo. Se evidencian variaciones diarias y una mayor concentración de energía en frecuencias medias, asociadas a fuentes como el tránsito, la actividad humana y otros sonidos urbanos característicos del entorno.
  </span>

   `;

  fetch(`/modals/weekly-data/${sensorId}`)
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const { weekly, sensorInfo } = data;
        // 🧠 Agrega estas dos líneas:
  sessionStorage.setItem("weeklyData", JSON.stringify(weekly));
  sessionStorage.setItem("sensorInfo", JSON.stringify(sensorInfo));

      if (!sensorInfo) {
        document.getElementById(
          "sensor-title"
        ).innerHTML = `<strong>No se encontraron datos para el sensor ${sensorId}</strong>`;
        return;
      }

      // 📌 Actualizar el título con la referencia y barrio
      document.getElementById(
        "sensor-title"
      ).innerHTML = `${sensorInfo.referencia}: ${sensorInfo.barrio}`;

      // 📌 Insertar la información detallada del sensor en 4 columnas (siempre visible al inicio)
      document.getElementById("sensor-details").innerHTML = `

        <div class="sensor-column">
            <div class="sensor-detail"><strong>Dirección:</strong> ${
              sensorInfo.direccion || "No disponible"
            }</div>
            <div class="sensor-detail"><strong>Municipio:</strong> ${
              sensorInfo.municipio
            } (${sensorInfo.departamento})</div>
            <div class="sensor-detail"><strong>Clasificación:</strong> ${
              sensorInfo.clasificacion || "No disponible"
            }</div>
        </div>
        <div class="sensor-column">
            <div class="sensor-detail"><strong>Uso del suelo:</strong> ${
              sensorInfo.uso_suelo || "No disponible"
            }</div>
            <div class="sensor-detail"><strong>Estado:</strong> ${
              sensorInfo.estado
            }</div>
            <div class="sensor-detail"><strong>Proveedor:</strong> ${
              sensorInfo.proveedor || "No disponible"
            }</div>
        </div>
        <div class="sensor-column">
            <div class="sensor-detail"><strong>Fecha instalación:</strong> ${
              sensorInfo.fecha_ins || "No disponible"
            }</div>

            <div class="sensor-detail"><strong>Frecuencia monitoreo:</strong> ${
              sensorInfo.freq_monitoreo
            } min</div>
        </div>
        <div class="sensor-column">
            <div class="sensor-detail"><strong>Tipo:</strong> ${
              sensorInfo.tipo
            }</div>
            <div class="sensor-detail"><strong>Sector:</strong> ${
              sensorInfo.sector || "No disponible"
            }</div>
            <div class="sensor-detail"><strong>Subsector:</strong> ${
              sensorInfo.subsector || "No disponible"
            }</div>
    
    </div>
`;

      if (!weekly || weekly.length === 0) {
        document.getElementById(
          "indicators-container"
        ).innerHTML = `<div class="no-data">🚨 Sin datos recientes</div>`;
        return;
      }
      document.getElementById("chart-container").style.display = "flex";

      // Inicializar gráficos
      const lineChart = renderWeeklyLineChart(weekly);
      const barChart = renderDynamicTercioBarChart(weekly, lineChart);

      // Hacer gráficos responsivos
      window.addEventListener("resize", () => {
        lineChart.resize();
        barChart.resize();
      });

      renderIndicators(weekly);
      updateIndicatorsWithZoom(weekly, lineChart, barChart);

      const initialIndicators = calculateDayNightLevels(weekly);
      addDynamicDayNightLines(lineChart, initialIndicators);
    })
    .catch((error) => {
      console.error("Error fetching modal data:", error);
      document.getElementById(
        "sensor-title"
      ).innerHTML = `<strong>Error al cargar la información.</strong>`;
    });
}

document.addEventListener("click", function (event) {
  if (event.target && event.target.id === "toggle-sensor-info") {
    const detailsContainer = document.getElementById("sensor-details");

    // Verificar si la clase `hidden` está presente y alternarla
    if (detailsContainer.classList.contains("hidden")) {
      detailsContainer.classList.remove("hidden");
      event.target.textContent = "Ocultar detalles";
    } else {
      detailsContainer.classList.add("hidden");
      event.target.textContent = "Mostrar detalles";
    }
  }
});

// Ponderaciones estándar para A y C
const frequencyBands = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500,
  16000, 20000,
];

const aWeighting = [
  -50.5, -44.7, -39.4, -34.6, -30.2, -26.2, -22.5, -19.1, -16.1, -13.4, -10.9,
  -8.6, -6.6, -4.8, -3.2, -1.9, -0.8, 0, 0.6, 1, 1.2, 1.3, 1.2, 1, 0.5, -0.1,
  -1.1, -2.5, -4.3, -6.6, -9.3,
];

const cWeighting = [
  -6.2, -4.4, -3, -2, -1.3, -0.8, -0.5, -0.3, -0.2, -0.1, 0, 0, 0, 0, 0, 0, 0,
  0, 0, -0.1, -0.2, -0.3, -0.5, -0.8, -1.3, -2, -3, -4.4, -6.2, -8.5, -11.2,
];

// Función para convertir timestamp a hora local
function toLocalDate(timestamp) {
  //// console.log(timestamp);
  const date = new Date(timestamp);
  //// console.log(date);
  return new Date(date.getTime());
}

// Función para formatear fecha y hora localizadas
function formatDateTimeLocalized(date) {
  return date.toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calcular Media Energética para Ponderaciones
function calculateWeightedEnergeticMean(weeklyData, range, weighting) {
  const selectedData = weeklyData.slice(range[0], range[1] + 1);
  const bandCount = selectedData[0].tercios_z_slow.length;

  const energyTotals = new Array(bandCount).fill(0);
  selectedData.forEach((row) => {
    row.tercios_z_slow.forEach((value, index) => {
      const weightedValue = value + weighting[index];
      energyTotals[index] += Math.pow(10, weightedValue / 10); // Convertir a energía ponderada
    });
  });

  return energyTotals.map(
    (total) => 10 * Math.log10(total / selectedData.length)
  );
}

function formatDateForZoom(date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "short", // Ej: "Lun"
    day: "2-digit", // Ej: "15"
    month: "short", // Ej: "Feb"
  });
}

// Gráfico de Líneas para Niveles Semanales
function renderWeeklyLineChart(weeklyData, sensorId) {
  const chartDom = document.getElementById("line-chart-container");
  const chart = echarts.init(chartDom);

  const timestamps = weeklyData.map((row) =>
    toLocalDate(row.timestamp).toISOString()
  );
  const laeqSlow = weeklyData.map((row) => row.laeq_slow);
  const laeqImpulse = weeklyData.map((row) => row.laeq_impulse);
  chart.on("dataZoom", function (event) {
    const startIndex = Math.floor((event.start / 100) * timestamps.length);
    const endIndex = Math.ceil((event.end / 100) * timestamps.length - 1);

    if (startIndex < 0 || endIndex >= timestamps.length) return;

    const startDate = formatDateForZoom(new Date(timestamps[startIndex]));
    const endDate = formatDateForZoom(new Date(timestamps[endIndex]));
  // console.log(startDate, endDate);
    chart.setOption({
      title: {
        text: `Nivel de Ruido LAeq `,
      },
    });
  });

  const chartOptions = {
    title: {
      text: `Nivel de Ruido LAeq`,
      left: "center",
      top: "0%",
    },
    responsive: true, // ECharts ajusta los elementos internos
    tooltip: {
      backgroundColor: "rgba(50, 50, 50, 0.8)",
      borderColor: "#fff",
      borderWidth: 1,
      textStyle: { color: "#fff" },
      textStyle: {
        color: "#ffff",            // 🎨 Color del texto
        fontSize: 12,
        fontWeight: "normal",
      },
      trigger: "axis",
      formatter: (params) => {
        const localDate = toLocalDate(params[0].axisValue);
        const formattedDate = localDate.toLocaleString("es-ES", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        let tooltipContent = `${formattedDate}<br>`;
        params.forEach((param) => {
          tooltipContent += `${param.marker} ${
            param.seriesName
          }: ${param.data.toFixed(1)} dB<br>`;
        });

        return tooltipContent;
      },
    },
    legend: {
      top: "12%",
      data: ["LAeq Slow"],
    },
    grid: {
      left: "10%",
      right: "10%",
      top: "20%",
      bottom: "20%", // Ajuste para evitar solapamiento de etiquetas en dispositivos pequeños
      containLabel: true, // Evita que los textos de los ejes se salgan del gráfico
    },
    xAxis: {
      type: "category",
      data: timestamps,
      name: "Fecha",
      axisLabel: {
        formatter: (value) => formatDateTimeLocalized(new Date(value)),
      },
    },
    yAxis: {
      type: "value",
      name: "Nivel (dB)",
      min: 35,
      max: 90,
    },
    dataZoom: [
      {
        type: "slider",
        show: true,
        xAxisIndex: 0,
        start: 0,
        end: 100,
        backgroundColor: "rgba(255, 255, 255, 0.2)", // Fondo verde claro
        dataBackground: {
          lineStyle: {
            color: "rgb(130, 204, 25)", // Línea de fondo en verde oscuro
          },
          areaStyle: {
            color: "rgba(130, 204, 25, 0.3)", // Área sombreada en tono verde
          },
        },
        fillerColor: "rgba(130, 204, 25, 0.5)", // Color del área seleccionada en verde con opacidad
        borderColor: "rgb(106, 166, 21)", // Color del borde del slider en verde más oscuro
        handleStyle: {
          color: "rgb(130, 204, 25)", // Color del botón deslizante
          borderColor: "rgba(130, 204, 25, 0.5)", // Borde del botón más oscuro para contraste
        },
        textStyle: {
          color: "rgb(0, 0, 0)", // Color del texto de las fechas en verde oscuro
          fontSize: 12,
          fontWeight: "lighter",
        },
        labelFormatter: function (value, valueStr) {
          return formatDateForZoom(new Date(timestamps[value])); // Usa el índice correcto
        },
      },
      {
        type: "inside",
        xAxisIndex: 0,
        start: 0,
        end: 100,
      },
    ],

    series: [
      {
        name: "LAeq Slow",
        type: "line",
        data: laeqSlow,
        color: "rgb(130, 204, 25)",
        smooth: false,
        width: 1,
        symbol: "none",
      },
    ],
  };

  chart.setOption(chartOptions);

  return chart;
}

function addDynamicDayNightLines(lineChart, indicators) {
  // Verifica si el gráfico está inicializado correctamente
  if (!lineChart || typeof lineChart.getOption !== "function") {
    //console.error('El gráfico no está inicializado correctamente.');
    return;
  }

  const option = lineChart.getOption();

  // Actualizar o añadir las líneas de Día y Noche
  const updateOrAddSeries = (
    name,
    data,
    color,
    lineType = "dashed",
    width = 2
  ) => {
    const seriesIndex = option.series.findIndex((s) => s.name === name);

    const newSeries = {
      name: name,
      type: "line",
      data: data,
      color: color,
      smooth: false, // false: línea con ángulos, true: línea curva
      symbol: "none", // 📌 No muestra puntos en la línea
      lineStyle: {
        type: lineType, // "solid" (continua), "dashed" (discontinua), "dotted" (punteada)
        width: width, // Grosor de la línea en píxeles
        // shadowBlur: 0, // (❌ Eliminado) Efecto de sombra desactivado
        // shadowColor: color, // (❌ Eliminado) Sombra del mismo color de la línea
        // shadowOffsetX: 2, // (❌ Eliminado) Sombra desplazada en X
        // shadowOffsetY: 2, // (❌ Eliminado) Sombra desplazada en Y
      },
      emphasis: {
        focus: "series",
        lineStyle: {
          // width: width + 1, // (❌ Eliminado) No cambia grosor en hover
          // color: "rgba(255,255,255,0.9)", // (❌ Eliminado) No cambia color en hover
        },
      },
      animationDuration: 500, // Duración de animación reducida
      animationEasing: "linear", // Animación más simple
    };

    if (seriesIndex !== -1) {
      // Si la serie existe, actualiza los datos y el estilo
      option.series[seriesIndex] = newSeries;
    } else {
      // Si no existe, añade la serie
      option.series.push(newSeries);
    }
  };

  // 📌 Ahora llamamos la función con parámetros personalizados
  updateOrAddSeries(
    "Promedio Día",
    new Array(option.xAxis[0].data.length).fill(indicators.laeqDay),
    "#ef7d00", // Rojo-naranja para el día
    "solid", // Línea discontinua
    1 // Grosor de la línea
  );

  updateOrAddSeries(
    "Promedio Noche",
    new Array(option.xAxis[0].data.length).fill(indicators.laeqNight),
    "#337DFF", // Azul para la noche
    "solid", // Línea continua
    1 // Grosor de la línea
  );

  // Aplicar las actualizaciones
  lineChart.setOption(option);
}

// Continúa el renderizado del gráfico de barras de tercio de octava
function renderDynamicTercioBarChart(weeklyData, lineChart) {
  const chartDom = document.getElementById("bar-chart-container");

  // Verificar si el contenedor existe
  if (!chartDom) {
    console.error("El contenedor del gráfico de barras no existe.");
    return null;
  }

  const barChart = echarts.init(chartDom);

  // Calcular datos iniciales
  const initialRange = [0, weeklyData.length - 1];
  const terciosMeanZ = calculateWeightedEnergeticMean(
    weeklyData,
    initialRange,
    new Array(frequencyBands.length).fill(0)
  );
  const terciosMeanA = calculateWeightedEnergeticMean(
    weeklyData,
    initialRange,
    aWeighting
  );
  const terciosMeanC = calculateWeightedEnergeticMean(
    weeklyData,
    initialRange,
    cWeighting
  );

  const chartOptions = {
    title: {
      text: "Analísis en Frecuencia (1/3 Octava)",
      left: "center",
      top: "0%",
    },
    tooltip: {
      trigger: "axis",


      backgroundColor: "rgba(50, 50, 50, 0.8)",
      borderColor: "#fff",
      borderWidth: 1,
      textStyle: { color: "#fff" },
      textStyle: {
        color: "#ffff",            // 🎨 Color del texto
        fontSize: 12,
        fontWeight: "normal",
      },
      formatter: (params) => {
        const band = frequencyBands[params[0].dataIndex];
        const values = params.map(
          (p) => `<span style="color:${p.color}">${p.seriesName}:</span> ${p.data.toFixed(1)} dB`
        );
        return `Frecuencia: <strong>${band} Hz</strong><br>${values.join("<br>")}`;
      },
    },
    
    grid: {
      left: "10%",
      right: "10%",
      top: "15%",
      bottom: "20%",
    },
    xAxis: {
      type: "category",
      data: frequencyBands,
      name: "Frecuencia (Hz)",
      nameLocation: "center",
      nameGap: 30,
      axisLabel: {
        fontSize: 8, // 🔽 Más pequeño para evitar sobreposición
        rotate: 45,   // 🔄 Opcional: rota las etiquetas para mejor visualización
        formatter: (value) => `${value} Hz`,
      },
    },
    
    yAxis: {
      type: "value",
      name: "Nivel (dB)",
      min: 0,
      max: 90,
    },
    legend: {
      top: "5%",
      data: ["A Slow", "C Slow", "Z Slow"],
      selected: {
        "A Slow": true, // Encendido por defecto
        "C Slow": false, // Apagado por defecto
        "Z Slow": false, // Apagado por defecto
      },
    },
    series: [
      {
        name: "Z Slow",
        type: "bar",
        data: terciosMeanZ,
        color: "#7ea3ba",
      },
      {
        name: "A Slow",
        type: "bar",
        data: terciosMeanA,
        color: "#82cc19",
      },
      {
        name: "C Slow",
        type: "bar",
        data: terciosMeanC,
        color: "#FAC858",
      },
    ],
  };

  // Aplicar opciones al gráfico
  barChart.setOption(chartOptions);

  // Manejar evento de zoom en el gráfico de líneas
  if (lineChart) {
    lineChart.on("dataZoom", (params) => {
      const totalDataLength = weeklyData.length;

      const startIndex = Math.floor(
        ((params.batch ? params.batch[0].start : params.start) / 100) *
          totalDataLength
      );
      const endIndex = Math.floor(
        ((params.batch ? params.batch[0].end : params.end) / 100) *
          totalDataLength
      );

      const validStartIndex = Math.max(0, startIndex);
      const validEndIndex = Math.min(totalDataLength - 1, endIndex);

      const visibleData = weeklyData.slice(validStartIndex, validEndIndex + 1);

      const updatedMeanZ = calculateWeightedEnergeticMean(
        visibleData,
        [0, visibleData.length - 1],
        new Array(frequencyBands.length).fill(0)
      );
      const updatedMeanA = calculateWeightedEnergeticMean(
        visibleData,
        [0, visibleData.length - 1],
        aWeighting
      );
      const updatedMeanC = calculateWeightedEnergeticMean(
        visibleData,
        [0, visibleData.length - 1],
        cWeighting
      );

      if (barChart) {
        barChart.setOption({
          series: [
            { data: updatedMeanZ },
            { data: updatedMeanA },
            { data: updatedMeanC },
          ],
        });
      }
    });
  }

  return barChart;
}

// Calcular Indicadores Día, Noche y 24 Horas
function calculateDayNightLevels(weeklyData) {
  const dayData = [];
  const nightData = [];

  weeklyData.forEach((row) => {
    // Convertir el timestamp a hora local
    const localDate = toLocalDate(row.timestamp);
    const hour = localDate.getHours(); // Extraer la hora local
    // Clasificar los datos en día (7:00 a 20:00) o noche (resto)
    if (hour >= 7 && hour <= 20) {
      dayData.push(row);
    } else {
      nightData.push(row);
    }
  });

  // Obtener fecha y hora actual
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // hace 1 hora

  // Filtrar datos de la última hora real
  const lastHourData = weeklyData.filter((row) => {
    const localDate = toLocalDate(row.timestamp);
    return localDate >= oneHourAgo && localDate <= now;
  });

  // Calcular promedios energéticos para los periodos diurnos, nocturnos y 24 horas
  const indicators = {
    laeqDay: calculateEnergeticAverage(dayData.map((row) => row.laeq_slow)),
    laeqNight: calculateEnergeticAverage(nightData.map((row) => row.laeq_slow)),
    laimpulseDay: calculateEnergeticAverage(
      dayData.map((row) => row.laeq_impulse)
    ),
    laimpulseNight: calculateEnergeticAverage(
      nightData.map((row) => row.laeq_impulse)
    ),
    laeq24: calculateEnergeticAverage(weeklyData.map((row) => row.laeq_slow)),
    laimpulse24: calculateEnergeticAverage(
      weeklyData.map((row) => row.laeq_impulse)
    ),
    laeqLastHour:
      lastHourData.length > 0
        ? calculateEnergeticAverage(lastHourData.map((row) => row.laeq_slow))
        : null, // o 0, según prefieras
  };

  return indicators;
}

// Calcular Promedio Energético
function calculateEnergeticAverage(values) {
  if (!values || values.length === 0) return 0;
  const energySum = values.reduce(
    (sum, value) => sum + Math.pow(10, value / 10),
    0
  );
  return 10 * Math.log10(energySum / values.length);
}

// Renderizar Indicadores
function renderIndicators(weeklyData, chart) {
  const indicatorsContainer = document.getElementById("indicators-container");
  const indicators = calculateDayNightLevels(weeklyData);
  indicatorsContainer.innerHTML = `
    <div class="indicator-row">
        <div class="indicator-card">🌞 LAeq Día: ${indicators.laeqDay.toFixed(
          1
        )} dB</div>
        <div class="indicator-card">🌙 LAeq Noche: ${indicators.laeqNight.toFixed(
          1
        )} dB</div>
        <div class="indicator-card">🌞🌙 LAeq 24h: ${indicators.laeq24.toFixed(
          1
        )} dB</div>
        <div class="indicator-card">
  🕐 Última hora: ${
    indicators.laeqLastHour !== null
      ? indicators.laeqLastHour.toFixed(1) + " dB"
      : "Sin datos"
  }
</div>

    </div>
`;

  // <div class="indicator-card">🌞 LA Impulse Día: ${indicators.laimpulseDay.toFixed(
  //   1
  // )} dB</div>
  // <div class="indicator-card">🌙 LA Impulse Noche: ${indicators.laimpulseNight.toFixed(
  //   1
  // )} dB</div>

  // Agregar las líneas de día y noche al gráfico
  addDynamicDayNightLines(chart, indicators);
}

// Actualizar Indicadores Dinámicamente
function updateIndicatorsWithZoom(weeklyData, lineChart, barChart) {
  lineChart.on("dataZoom", (params) => {
    const totalDataLength = weeklyData.length;

    // Calcular índices del rango visible
    const startIndex = Math.floor(
      ((params.batch ? params.batch[0].start : params.start) / 100) *
        totalDataLength
    );
    const endIndex = Math.floor(
      ((params.batch ? params.batch[0].end : params.end) / 100) *
        totalDataLength
    );

    // Validar índices y obtener datos visibles
    const validStartIndex = Math.max(0, startIndex);
    const validEndIndex = Math.min(totalDataLength - 1, endIndex);
    const visibleData = weeklyData.slice(validStartIndex, validEndIndex + 1);

    // Recalcular indicadores dinámicos
    const indicators = calculateDayNightLevels(visibleData);

    // Actualizar las líneas de promedios Día y Noche
    addDynamicDayNightLines(lineChart, indicators);

    // Actualizar Gráfico de Barras
    const updatedMeanZ = calculateWeightedEnergeticMean(
      visibleData,
      [0, visibleData.length - 1],
      new Array(frequencyBands.length).fill(0)
    );
    const updatedMeanA = calculateWeightedEnergeticMean(
      visibleData,
      [0, visibleData.length - 1],
      aWeighting
    );
    const updatedMeanC = calculateWeightedEnergeticMean(
      visibleData,
      [0, visibleData.length - 1],
      cWeighting
    );

    barChart.setOption({
      series: [
        { data: updatedMeanZ },
        { data: updatedMeanA },
        { data: updatedMeanC },
      ],
    });

    // Actualizar los indicadores
    renderIndicators(visibleData);
  });
}

// Cerrar modal al hacer clic fuera del contenido
document.getElementById("frameContainer").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.target.style.display = "none";
  }
});

document.addEventListener("click", async function (event) {
  if (event.target && event.target.id === "export-pdf-button") {
    const spinner = document.getElementById("spinnerInformeOverlay");
    spinner.style.display = "flex";

    const weeklyDataStr = sessionStorage.getItem("weeklyData");
    const sensorInfoStr = sessionStorage.getItem("sensorInfo");

    if (!weeklyDataStr || !sensorInfoStr) {
      alert("No se encontraron los datos para generar el informe.");
      spinner.style.display = "none";
      return;
    }

    const weeklyData = JSON.parse(weeklyDataStr);
    const sensorDetalles = JSON.parse(sensorInfoStr);
    const indicadores = calculateDayNightLevels(weeklyData);

    const canvasLinea = document.querySelector("#line-chart-container canvas")?.toDataURL();
    const canvasBarras = document.querySelector("#bar-chart-container canvas")?.toDataURL();

    if (!canvasLinea || !canvasBarras) {
      alert("Los gráficos no están disponibles para exportar.");
      spinner.style.display = "none";
      return;
    }

    const fechaInicio = formatDateForZoom(toLocalDate(weeklyData[0].timestamp));
    const fechaFin = formatDateForZoom(toLocalDate(weeklyData.at(-1).timestamp));

    try {
      const response = await fetch("/informe/modal-semanal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensorInfo: sensorDetalles,
          indicadores,
          imagenLinea: canvasLinea,
          imagenBarras: canvasBarras,
          fechaInicio,
          fechaFin,
        }),
      });

      if (!response.ok) throw new Error("Error generando PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("❌ Error generando informe semanal:", err);
      alert("Error al generar el informe.");
    } finally {
      spinner.style.display = "none";
    }
  }
});
