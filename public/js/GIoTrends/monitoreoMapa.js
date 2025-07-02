const mapStyles = {
  streets: "https://api.maptiler.com/maps/streets/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  basic: "https://api.maptiler.com/maps/basic-v2/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  bright: "https://api.maptiler.com/maps/bright-v2/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  hybrid: "https://api.maptiler.com/maps/hybrid/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  satellite: "https://api.maptiler.com/maps/satellite/style.json?key=h7IIJ3zZQqwvoK5gk5z9"
};

//const center = [-75.577, 6.244]; // Medellín
const center = [-75.5906, 6.1706]; // Envigado
const map = new maplibregl.Map({
  container: 'map',
  zoom: 12.5,
  center,
  pitch: 0,
  style: mapStyles.streets,
});


function toggleSidebar(id) {
  const elem = document.getElementById(id); 
  const classes = elem.className.split(' ');
  const collapsed = classes.indexOf('collapsed') !== -1;

  const padding = {};
  if (collapsed) {
    classes.splice(classes.indexOf('collapsed'), 1);
    padding[id] = 300;
    map.easeTo({ padding, duration: 1000 });
  } else {
    padding[id] = 0;
    classes.push('collapsed');
    map.easeTo({ padding, duration: 1000 });
  }

  elem.className = classes.join(' ');
}


map.on('load', () => {
  // toggleSidebar('left');

  // Cargar puntos desde el endpoint y agregarlos al mapa
  fetch('/api/giotrends/mapa/data')
    .then(response => response.json())
    .then(data => {
      data.forEach(sensor => {
        const { longitude, latitude, sensor_name, municipio, barrio, laeq_slow, timestamp, id } = sensor;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <strong>${sensor_name}</strong><br>
          <em>${barrio}, ${municipio}</em><br>
          LAeq: ${laeq_slow} dB<br>
          <small>${new Date(timestamp).toLocaleString('es-CO', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</small>
        `);

        const el = document.createElement('div');
        el.className = 'custom-marker';

        const spanMain = document.createElement('span');
        spanMain.className = 'marker-value';
        spanMain.textContent = parseFloat(laeq_slow).toFixed(1);

        const spanUnit = document.createElement('span');
        spanUnit.className = 'marker-unit';
        spanUnit.textContent = 'dBA';

        el.appendChild(spanMain);
        el.appendChild(spanUnit);

        // Color del marcador según el nivel LAeq
        const dB = parseFloat(laeq_slow);
        let color = '#025159';
        if (dB < 55) {
          color = '#2b9348';
        } else if (dB < 65) {
          color = '#ffdd57';
        } else if (dB < 75) {
          color = '#f8961e';
        } else {
          color = '#ef233c';
        }

        el.style.setProperty('--marker-color', color);

        // Reemplazar evento de clic para mostrar datos históricos en panel lateral
        el.addEventListener('click', (evt) => {
          evt.stopPropagation();
          showWeeklyHistoryPanel(sensor.id || sensor.sensor_id); // Usa id o sensor_id según corresponda
          // Abre el panel lateral derecho si está colapsado
          const rightSidebar = document.getElementById('right');
          if (rightSidebar.classList.contains('collapsed')) {
            toggleSidebar('right');
          }
          // document.getElementById("leftPanel").style.display = "block";
        });

        new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);
      });
    })
    .catch(error => {
      console.error('Error al cargar puntos del mapa:', error);
    });

  agregarEdificios3D();
});

document.getElementById('mapStyleSelector').addEventListener('change', (e) => {
  const selected = e.target.value;
  map.setStyle(mapStyles[selected]);
  map.once('style.load', () => {
    agregarEdificios3D();
  });
});

function agregarEdificios3D() {
  const MAPTILER_KEY = 'h7IIJ3zZQqwvoK5gk5z9';

  map.addSource('openmaptiles', {
    url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`,
    type: 'vector',
  });

  const layers = map.getStyle().layers;
  let labelLayerId = null;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === 'symbol' && layers[i].layout?.['text-field']) {
      labelLayerId = layers[i].id;
      break;
    }
  }

  map.addLayer({
    id: '3d-buildings',
    source: 'openmaptiles',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 15,
    filter: ['!=', ['get', 'hide_3d'], true],
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        ['get', 'render_height'],
        0, 'lightgray',
        200, 'royalblue',
        400, 'lightblue'
      ],
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15, 0,
        16, ['get', 'render_height']
      ],
      'fill-extrusion-base': [
        'case',
        ['>=', ['get', 'zoom'], 16],
        ['get', 'render_min_height'],
        0
      ]
    }
  }, labelLayerId);
}

// ---------- PANEL LATERAL: Histórico Semanal ----------
// Lógica tomada y adaptada desde modal.js (visualización de histórico semanal)

// Asegura que ECharts esté disponible globalmente
// Se asume que ECharts se carga en la plantilla base o en el HTML

function showWeeklyHistoryPanel(sensorId) {
  const rightPanel = document.getElementById("rightPanel");
  if (!rightPanel) return;

  // Contenido inicial mientras carga los datos
  rightPanel.innerHTML = `
    <div class="panel-content">
      <button id="close-right-panel" class="close-button" style="float:right;">&times;</button>
      <div id="sensor-info-container">
        <div class="sensor-summary">
          <h3 id="sensor-title">Cargando información...</h3>
          <button id="toggle-sensor-info" class="toggle-button">Ocultar detalles</button>
          <div id="export-pdf-container" class="export-section ">
            <button id="export-pdf-button" class="export-button c-button">PDF</button>
          </div>
        </div>
        <div id="sensor-details"></div>
      </div>
      <div id="indicators-container" class=""></div>
      <div id="chart-container" style="display:none;">
          <div id="charts-wrapper">
          <div id="line-chart-container" class="chart-section"></div>
          <div id="bar-chart-container" class="chart-section"></div>
        </div>
      </div>
     <!-- <span class="tooltip-text">
        Este módulo muestra los niveles de ruido ambiental registrados por el sensor durante los últimos 7 días, con mediciones cada 5 minutos. El gráfico de línea representa la evolución temporal del nivel de presión sonora equivalente (LAeq Slow), mientras que el gráfico de barras muestra el promedio del espectro de frecuencias captadas en ese periodo. Se evidencian variaciones diarias y una mayor concentración de energía en frecuencias medias, asociadas a fuentes como el tránsito, la actividad humana y otros sonidos urbanos característicos del entorno.
      </span> -->
      <div id="spinnerInformeOverlay" style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.5);align-items:center;justify-content:center;z-index:99;">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  // Cerrar panel lateral
  document.getElementById("close-right-panel").onclick = function() {
    const rightSidebar = document.getElementById('right');
    if (!rightSidebar.classList.contains('collapsed')) {
      toggleSidebar('right');
    }
  };

  // Alternar detalles
  document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "toggle-sensor-info") {
      const detailsContainer = document.getElementById("sensor-details");
      if (!detailsContainer) return;
      if (detailsContainer.classList.contains("hidden")) {
        detailsContainer.classList.remove("hidden");
        event.target.textContent = "Ocultar detalles";
      } else {
        detailsContainer.classList.add("hidden");
        event.target.textContent = "Mostrar detalles";
      }
    }
  });

  // Cargar datos históricos
  const url = `/api/giotrends/modals/weekly-data/${sensorId}`;
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      // Validación de datos históricos (labels vacíos o sin datos)
      // Si no hay datos, mostrar mensaje informativo y evitar graficar
      if (!data || !data.weekly || data.weekly.length === 0) {
        document.getElementById('rightPanel').innerHTML = `
          <div class="panel-content">
            <div class="panel-empty">
              <p>No hay datos históricos disponibles para este sensor.</p>
            </div>
          </div>
        `;
        return;
      }
      const { weekly, sensorInfo } = data;
      // Guardar para exportar PDF
      sessionStorage.setItem("weeklyData", JSON.stringify(weekly));
      sessionStorage.setItem("sensorInfo", JSON.stringify(sensorInfo));

      if (!sensorInfo) {
        document.getElementById("sensor-title").innerHTML = `<strong>No se encontraron datos para el sensor ${sensorId}</strong>`;
        return;
      }
      document.getElementById("sensor-title").innerHTML = `${sensorInfo.referencia}: ${sensorInfo.barrio}`;
      document.getElementById("sensor-details").innerHTML = `
        <div class="sensor-column">
          <div class="sensor-detail"><strong>Dirección:</strong> ${sensorInfo.direccion || "No disponible"}</div>
          <div class="sensor-detail"><strong>Municipio:</strong> ${sensorInfo.municipio} (${sensorInfo.departamento})</div>
          <div class="sensor-detail"><strong>Clasificación:</strong> ${sensorInfo.clasificacion || "No disponible"}</div>
        </div>
        <div class="sensor-column">
          <div class="sensor-detail"><strong>Tipo:</strong> ${sensorInfo.tipo}</div>
          <div class="sensor-detail"><strong>Sector:</strong> ${sensorInfo.sector || "No disponible"}</div>
          <div class="sensor-detail"><strong>Subsector:</strong> ${sensorInfo.subsector || "No disponible"}</div>
        </div>
      `;
      if (!weekly || weekly.length === 0) {
        document.getElementById("indicators-container").innerHTML = `<div class="no-data">🚨 Sin datos recientes</div>`;
        return;
      }
      document.getElementById("chart-container").style.display = "flex";
      // Inicializar gráficos
      const lineChart = renderWeeklyLineChart(weekly);
      const barChart = renderDynamicTercioBarChart(weekly, lineChart);
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
      console.error("Error fetching panel data:", error);
      document.getElementById("sensor-title").innerHTML = `<strong>Error al cargar la información.</strong>`;
    });

  // Exportar PDF desde el panel lateral
  document.addEventListener("click", async function (event) {
    if (event.target && event.target.id === "export-pdf-button") {
      const spinner = document.getElementById("spinnerInformeOverlay");
      if (spinner) spinner.style.display = "flex";

      const weeklyDataStr = sessionStorage.getItem("weeklyData");
      const sensorInfoStr = sessionStorage.getItem("sensorInfo");
      if (!weeklyDataStr || !sensorInfoStr) {
        alert("No se encontraron los datos para generar el informe.");
        if (spinner) spinner.style.display = "none";
        return;
      }
      const weeklyData = JSON.parse(weeklyDataStr);
      const sensorDetalles = JSON.parse(sensorInfoStr);
      const indicadores = calculateDayNightLevels(weeklyData);
      const canvasLinea = document.querySelector("#line-chart-container canvas")?.toDataURL();
      const canvasBarras = document.querySelector("#bar-chart-container canvas")?.toDataURL();
      if (!canvasLinea || !canvasBarras) {
        alert("Los gráficos no están disponibles para exportar.");
        if (spinner) spinner.style.display = "none";
        return;
      }
      const fechaInicio = formatDateForZoom(toLocalDate(weeklyData[0].timestamp));
      const fechaFin = formatDateForZoom(toLocalDate(weeklyData.at(-1).timestamp));
      try {
        const response = await fetch("/api/giotrends/informe/modal-semanal", {
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
        if (spinner) spinner.style.display = "none";
      }
    }
  });
}

// ---- Funciones de visualización (copiadas/adaptadas de modal.js) ----

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

function toLocalDate(timestamp) {
  const date = new Date(timestamp);
  return new Date(date.getTime());
}
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
function formatDateForZoom(date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
function calculateWeightedEnergeticMean(weeklyData, range, weighting) {
  const selectedData = weeklyData.slice(range[0], range[1] + 1);
  const bandCount = selectedData[0].tercios_z_slow.length;
  const energyTotals = new Array(bandCount).fill(0);
  selectedData.forEach((row) => {
    row.tercios_z_slow.forEach((value, index) => {
      const weightedValue = value + weighting[index];
      energyTotals[index] += Math.pow(10, weightedValue / 10);
    });
  });
  return energyTotals.map(
    (total) => 10 * Math.log10(total / selectedData.length)
  );
}
function renderWeeklyLineChart(weeklyData) {
  const chartDom = document.getElementById("line-chart-container");
  const chart = echarts.init(chartDom);
  const timestamps = weeklyData.map((row) =>
    toLocalDate(row.timestamp).toISOString()
  );
  const laeqSlow = weeklyData.map((row) => row.laeq_slow);
  chart.on("dataZoom", function (event) {
    const startIndex = Math.floor((event.start / 100) * timestamps.length);
    const endIndex = Math.ceil((event.end / 100) * timestamps.length - 1);
    if (startIndex < 0 || endIndex >= timestamps.length) return;
    const startDate = formatDateForZoom(new Date(timestamps[startIndex]));
    const endDate = formatDateForZoom(new Date(timestamps[endIndex]));
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
      textStyle: {
        color: "#ffffff"
      }
    },
    responsive: true,
    tooltip: {
      trigger: "axis",
      textStyle: {
        color: "#ffffff"
      },
      backgroundColor: "rgba(50, 50, 50, 0.8)",
      borderColor: "#fff",
      borderWidth: 1,
      fontSize: 12,
      fontWeight: "normal",
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
          tooltipContent += `${param.marker} ${param.seriesName}: ${param.data.toFixed(1)} dB<br>`;
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
      bottom: "20%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: timestamps,
      name: "Fecha",
      axisLabel: {
        color: "#ffffff",
        formatter: (value) => formatDateTimeLocalized(new Date(value)),
      },
    },
    yAxis: {
      type: "value",
      name: "Nivel (dB)",
      min: 35,
      max: 90,
      axisLabel: {
        color: "#ffffff"
      }
    },
    dataZoom: [
      {
        type: "slider",
        show: true,
        xAxisIndex: 0,
        start: 0,
        end: 100,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        dataBackground: {
          lineStyle: {
            color: "rgb(130, 204, 25)",
          },
          areaStyle: {
            color: "rgba(130, 204, 25, 0.3)",
          },
        },
        fillerColor: "rgba(130, 204, 25, 0.5)",
        borderColor: "rgb(106, 166, 21)",
        handleStyle: {
          color: "rgb(130, 204, 25)",
          borderColor: "rgba(130, 204, 25, 0.5)",
        },
        textStyle: {
          color: "rgb(0, 0, 0)",
          fontSize: 12,
          fontWeight: "lighter",
        },
        labelFormatter: function (value, valueStr) {
          return formatDateForZoom(new Date(timestamps[value]));
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
  if (!lineChart || typeof lineChart.getOption !== "function") return;
  const option = lineChart.getOption();
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
      smooth: false,
      symbol: "none",
      lineStyle: {
        type: lineType,
        width: width,
      },
      emphasis: {
        focus: "series",
        lineStyle: {},
      },
      animationDuration: 500,
      animationEasing: "linear",
    };
    if (seriesIndex !== -1) {
      option.series[seriesIndex] = newSeries;
    } else {
      option.series.push(newSeries);
    }
  };
  updateOrAddSeries(
    "Promedio Día",
    new Array(option.xAxis[0].data.length).fill(indicators.laeqDay),
    "#ef7d00",
    "solid",
    1
  );
  updateOrAddSeries(
    "Promedio Noche",
    new Array(option.xAxis[0].data.length).fill(indicators.laeqNight),
    "#337DFF",
    "solid",
    1
  );
  lineChart.setOption(option);
}
function renderDynamicTercioBarChart(weeklyData, lineChart) {
  const chartDom = document.getElementById("bar-chart-container");
  if (!chartDom) return null;
  const barChart = echarts.init(chartDom);
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
      textStyle: {
        color: "#ffffff"
      }
    },
    tooltip: {
      trigger: "axis",
      textStyle: {
        color: "#ffffff"
      },
      backgroundColor: "rgba(50, 50, 50, 0.8)",
      borderColor: "#fff",
      borderWidth: 1,
      fontSize: 12,
      fontWeight: "normal",
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
        color: "#ffffff",
        fontSize: 8,
        rotate: 45,
        formatter: (value) => `${value} Hz`,
      },
    },
    yAxis: {
      type: "value",
      name: "Nivel (dB)",
      min: 0,
      max: 90,
      axisLabel: {
        color: "#ffffff"
      }
    },
    legend: {
      top: "5%",
      data: ["A Slow", "C Slow", "Z Slow"],
      selected: {
        "A Slow": true,
        "C Slow": false,
        "Z Slow": false,
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
  barChart.setOption(chartOptions);
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
function calculateDayNightLevels(weeklyData) {
  const dayData = [];
  const nightData = [];
  weeklyData.forEach((row) => {
    const localDate = toLocalDate(row.timestamp);
    const hour = localDate.getHours();
    if (hour >= 7 && hour <= 20) {
      dayData.push(row);
    } else {
      nightData.push(row);
    }
  });
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const lastHourData = weeklyData.filter((row) => {
    const localDate = toLocalDate(row.timestamp);
    return localDate >= oneHourAgo && localDate <= now;
  });
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
        : null,
  };
  return indicators;
}
function calculateEnergeticAverage(values) {
  if (!values || values.length === 0) return 0;
  const energySum = values.reduce(
    (sum, value) => sum + Math.pow(10, value / 10),
    0
  );
  return 10 * Math.log10(energySum / values.length);
}
function renderIndicators(weeklyData) {
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
  // Agregar las líneas de día y noche al gráfico
  // addDynamicDayNightLines(chart, indicators); // Se hace en updateIndicatorsWithZoom
}
function updateIndicatorsWithZoom(weeklyData, lineChart, barChart) {
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
    const indicators = calculateDayNightLevels(visibleData);
    addDynamicDayNightLines(lineChart, indicators);
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
    renderIndicators(visibleData);
  });
}