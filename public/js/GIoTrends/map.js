/**
@file public/js/map.js
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

let sensorsData = [];
let markerLayerGroup = L.layerGroup();
let map;
let heatmapLayer; // 🔹 Asegurar que es global
let markers = {};

// 🔹 Función para obtener los datos de los sensores y actualizar filtros
async function fetchSensorMapData() {
  try {
    const response = await fetch("/maps/map-data");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json(); // Solo obtenemos los datos
    return data; // Ya no inicializamos ni aplicamos filtros aquí
  } catch (error) {
    console.error("❌ Error fetching sensor map data:", error);
    return [];
  }
}

// 🔹 Función para actualizar los datos sin reiniciar el mapa
async function refreshMapData() {
  const oldData = JSON.stringify(sensorsData); // 📦 Guarda como texto los sensores actuales
  const newData = await fetchSensorMapData();  // 🔥 Pide los nuevos datos del endpoint

  if (JSON.stringify(newData) !== oldData) {
    console.log("🔄 Datos cambiaron, actualizando mapa...");
    sensorsData = newData;  // 🔥 Actualiza sensorsData
    initializeFilters();    // 🔥 Refresca los filtros
    applyFilters();         // 🔥 Refresca los marcadores y heatmap
  } else {
    console.log("✅ Datos no cambiaron, no se actualiza.");
  }
}

///Para los iconos en el mapa
function getIcon(level) {
  let color = "gray";
  let displayLevel = "--";

  if (level !== null && !isNaN(parseFloat(level))) {
    level = parseFloat(level);
    displayLevel = level.toFixed(1);
    if (level > 75) color = "red";
    else if (level > 65) color = "#ef7d00";
    else if (level > 55) color = "#82cc19";
    else if (level >= 0) color = "#0074BD";
  }

  const iconHtml = `
    <div style="
        background-color: ${color};
        color: white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid #fff;
        line-height: 1.2;
    ">
        <span style="font-size: 14px;">${displayLevel}</span>
        <span style="font-size: 10px; font-weight: normal;">dBA</span>
    </div>
`;

  return L.divIcon({
    html: iconHtml,
    className: "custom-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}
//crear popup

function createPopupContent(sensor) {
  const { sensor_name, laeq_slow, timestamp, sensor_id, historical_data } =
    sensor;

  let color = "gray";
  if (laeq_slow !== null && !isNaN(parseFloat(laeq_slow))) {
    const level = parseFloat(laeq_slow);
    if (level > 75) color = "red";
    else if (level > 65) color = "#ef7d00";
    else if (level > 55) color = "#82cc19";
    else if (level >= 0) color = "#0074BD";
  }

  const displayLevel =
    laeq_slow !== null ? parseFloat(laeq_slow).toFixed(1) : "--";
  const formattedTimestamp =
    timestamp && !isNaN(new Date(timestamp).getTime())
      ? new Date(timestamp).toLocaleString()
      : "Sin datos recientes";

  return `
        <div class="sensor-card" data-sensor-id="${sensor_id}">
            <div class="sensor-rect" style="background-color: ${color};"></div>
            <div class="sensor-name">${sensor_name}</div>
            <div class="sensor-level-wrapper">
                <span class="sensor-level">${displayLevel}</span>
                <span class="sensor-dba"> dBA</span>
            </div>
            <div class="sensor-graph" id="graph-${sensor_id}" style="width: 100%; height: 150px;"></div>
            <div class="sensor-update">Actualizado: ${formattedTimestamp}</div>
        </div>
    `;
}

function reassignModalEvent() {
  document.querySelectorAll(".sensor-card").forEach((card) => {
    card.addEventListener("click", function () {
      const sensorId = this.getAttribute("data-sensor-id"); // 🔹 Obtener correctamente el sensorId
      openModal(sensorId);
    });
  });
}

async function fetchHourlyData(sensorId) {
  try {
    const response = await fetch(`/sensors/data/${sensorId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching hourly data for ${sensorId}:`, error);
    return { latest: null, hourly: [] };
  }
}

let tableStyles = {}; // 📌 Objeto para almacenar estilos

async function fetchTableStyles() {
  try {
    const response = await fetch("/json/cartoStyles.json");
    if (!response.ok) throw new Error(`Error HTTP! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("❌ Error al cargar estilos personalizados:", error);
    return {}; // Devuelve un objeto vacío si falla
  }
}

async function renderMap() {
  // Definir mapas base
  const osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
    }
  );

  const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    }
  );

  const map = L.map("map", {
    layers: [osm], // Mapa base inicial
  });
// 📍 Añadir geocoder de búsqueda al mapa
L.Control.geocoder({
  defaultMarkGeocode: true,
  collapsed: true,
  placeholder: 'Buscar dirección...',
  errorMessage: 'No se encontró la ubicación',
  showResultIcons: true,
  position: 'topleft'
}).addTo(map);

    

  // 🔹 Asegurar que heatmapLayer se asigna a la variable global y no se declara con const
  heatmapLayer = L.heatLayer([], {
    radius: 50,
    blur: 30,
    minOpacity: 0.5,
    gradient: {
      0.0: "#0074BD", // Azul (niveles bajos)
      0.3: "#82cc19", // Verde (niveles medios)
      0.6: "#ef7d00", // Naranja (niveles altos)
      1.0: "red", // Rojo (niveles críticos)
    },
  });


  async function fetchTableNames() {
    try {
      const response = await fetch("/json/cartoMunicipios.json"); // 📌 Cargar desde la carpeta pública
      if (!response.ok)
        throw new Error(`Error HTTP! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("❌ Error al cargar los nombres personalizados:", error);
      return {}; // Devuelve un objeto vacío si falla
    }
  }

  // 🔹 Crear un objeto para almacenar las capas de tablas dinámicamente
  let tableLayers = {};

  // 📌 Función para obtener todas las tablas con geometría
  async function fetchTableList() {
    try {
      const response = await fetch("/maps/cartobase/tables");
      const tables = await response.json();
      return tables.map((t) => t.table_name);
    } catch (error) {
      console.error("❌ Error al obtener las tablas:", error);
      return [];
    }
  }

  tableStyles = await fetchTableStyles();
  // console.log("🎨 Estilos cargados:", tableStyles); // 📌 Verificar que los estilos se cargaron correctamente


  // 📌 Modificar la función para cargar los datos de la tabla con los estilos aplicados
  async function loadTableData(tableName) {
    try {
      const response = await fetch(`/maps/cartobase/data/${tableName}`);
      const geojsonData = await response.json();

      // 📌 Si la capa ya existe, la limpiamos antes de agregar nuevos datos
      if (tableLayers[tableName]) {
        tableLayers[tableName].clearLayers();
      } else {
        tableLayers[tableName] = L.layerGroup().addTo(map);
      }

      // 📌 Obtener el estilo personalizado desde cartoStyles.json o aplicar un estilo por defecto
      const style = tableStyles[tableName] || {
        color: "#3388ff",
        weight: 2,
        opacity: 0.7,
      };

      const newLayer = L.geoJSON(geojsonData, {
        style: style, // 📌 Aplica el estilo a la capa
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
                    <b>${props.nombre}</b><br>
                    <b>Tipo:</b> ${props.tipo}
                `);
        },
      });

      tableLayers[tableName].addLayer(newLayer);

      // console.log(`✅ Datos de ${tableName} cargados en el mapa con estilos.`);
    } catch (error) {
      console.error(
        `❌ Error al cargar datos de la tabla ${tableName}:`,
        error
      );
    }
  }

  // Ajustar automáticamente el tamaño del mapa al contenedor
  map.invalidateSize();
  // Crear grupo de capas para los marcadores
  markerLayerGroup.addTo(map); // 🔹 Se asegura que los marcadores se agreguen al mapa

  heatmapLayer; // 🔹 Asegurar que heatmapLayer se agregue al mapa

  // Añadir control de capas para cambiar entre mapas base
  // Control de capas desplegable
  const baseMaps = {
    OpenStreetMap: osm,
    Satélite: satellite,
    // 'Modo Oscuro': darkMode,
  };

  // 📌 Obtener la lista de tablas y agregarlas a los overlays
  // 📌 4. Obtener nombres personalizados y la lista de tablas
  tableNames = await fetchTableNames();
  const tableList = await fetchTableList();
  const overlays = {
    Heatmap: heatmapLayer,
    Puntos: markerLayerGroup,
  };

  // 📌 Asegurar que las capas de las tablas están definidas antes de agregarlas
  tableList.forEach((tableName) => {
    tableLayers[tableName] = L.layerGroup();
    // 🔹 Usa el nombre personalizado si está en el JSON, sino usa el original
    const displayName = tableNames[tableName] || tableName;
    overlays[displayName] = tableLayers[tableName];
  });

  L.control.layers(baseMaps, overlays, { collapsed: true }).addTo(map);



  // 📌 Escuchar eventos de activación en las capas
  map.on("overlayadd", function (eventLayer) {
    const tableName = Object.keys(tableLayers).find(
      (name) => tableLayers[name] === eventLayer.layer
    );
    if (tableName) {
      loadTableData(tableName); // Cargar datos cuando se active la capa
    }
  });

  // console.log("✅ Map initialized with dynamic overlays.");

  // Objeto para almacenar los marcadores
  const markers = {};

  const normalizeLevel = (level, min = 0, max = 100) => {
    // Escalar el nivel en el rango [0.0, 1.0]
    return Math.min(1.0, Math.max(0.0, (level - min) / (max - min)));
  };

  async function updateMarkers() {
    // 🔹 Guardar filtros actuales antes de actualizar
    const municipio = document.getElementById("filter-municipio").value;
    const barrio = document.getElementById("filter-barrio").value;
    const referencia = document
      .getElementById("filter-referencia")
      .value.toLowerCase();
    const usoSuelo = document.getElementById("filter-uso-suelo").value;
    const nivel = document.getElementById("filter-nivel").value;

    const sensors = await fetchSensorMapData();
    const heatmapPoints = [];

    sensors.forEach((sensor) => {
      const { latitude, longitude, sensor_id, laeq_slow, historical_data } =
        sensor;

      if (latitude && longitude) {
        const normalizedLevel = normalizeLevel(parseFloat(laeq_slow));
        heatmapPoints.push([latitude, longitude, normalizedLevel]);

        if (!markers[sensor_id]) {
          const marker = L.marker([latitude, longitude], {
            icon: getIcon(laeq_slow),
          }).addTo(map);

          marker.bindPopup(
            () => {
              const content = createPopupContent(sensor);
              setTimeout(() => {
                const chartElement = document.getElementById(
                  `graph-${sensor_id}`
                );
                if (chartElement && typeof updateChart === "function") {
                  updateChart(sensor_id, historical_data);
                }
              }, 100);
              return content;
            },
            {
              minWidth: 350,
              maxWidth: 400,
              className: "custom-popup",
              offset: [0, -20],
            }
          );

          marker.on("click", () => openModal(sensor_id));
          marker.on("mouseover", () => marker.openPopup());

          markerLayerGroup.addLayer(marker);
          markers[sensor_id] = marker;
        } else {
          const marker = markers[sensor_id];
          marker.setIcon(getIcon(laeq_slow));

          const popup = marker.getPopup();
          if (popup) {
            const newPopupContent = createPopupContent(sensor);
            popup.setContent(newPopupContent);

            setTimeout(() => {
              const chartElement = document.getElementById(
                `graph-${sensor_id}`
              );
              if (chartElement && typeof updateChart === "function") {
                updateChart(sensor_id, historical_data);
              }
            }, 100);
          }
        }
      }
    });

    if (heatmapLayer && heatmapPoints.length > 0) {
      heatmapLayer.setLatLngs(heatmapPoints);
    } else {
      console.warn("⚠️ No hay datos nuevos para actualizar el heatmap.");
    }

    // 🔹 Restaurar los filtros después de la actualización
    document.getElementById("filter-municipio").value = municipio;
    document.getElementById("filter-barrio").value = barrio;
    document.getElementById("filter-referencia").value = referencia;
    document.getElementById("filter-uso-suelo").value = usoSuelo;
    document.getElementById("filter-nivel").value = nivel;

    applyFilters(); // 🔹 Aplicar los filtros después de actualizar los datos
  }

  window.updateChart = function (sensor_id, hourlyData) {
    const chartElement = document.getElementById(`graph-${sensor_id}`);
    if (chartElement) {
      const chart = echarts.init(chartElement);

      const levels = hourlyData.map((row) => row.laeq_slow);
      if (levels.length > 0) {
        const maxLevel = Math.max(...levels);
        const minLevel = Math.min(...levels);
        const normalizedData = hourlyData.map((row) => [
          new Date(row.timestamp).toLocaleTimeString(),
          ((row.laeq_slow - minLevel) / (maxLevel - minLevel)) * 100,
        ]);

        chart.setOption({
          grid: { left: 0, right: 0, top: 0, bottom: 0 },
          xAxis: { show: false, type: "category" },
          yAxis: { show: false },
          series: [
            {
              data: normalizedData,
              type: "line",
              smooth: false,
              lineStyle: { color: "grey" },
              showSymbol: false,
            },
          ],
        });
      }
    }
  };

  // Ajustar el mapa a los límites de los datos al inicio
// Ajustar el mapa a los límites de los datos al inicio
sensorsData = await fetchSensorMapData(); // 🔥 Ahora sensorsData ya trae los datos
initializeFilters();                      // 🔥 Construimos los filtros de inmediato
applyFilters();                            // 🔥 Pintamos los marcadores y heatmap filtrados

const bounds = L.latLngBounds();
sensorsData.forEach((sensor) => {
  if (sensor.latitude && sensor.longitude) {
    bounds.extend([sensor.latitude, sensor.longitude]);
  }
});

if (bounds.isValid()) {
  map.fitBounds(bounds, { padding: [50, 50] });
}

// Añadir capas al mapa
markerLayerGroup.addTo(map);
heatmapLayer;

// 🔁 Ahora sí, refrescar los datos cada 10 segundos
setInterval(refreshMapData, 10000);
}

///para el modal
function openModal(sensorId) {
  // Llama a la función de modal.js para abrir el modal
  import("./modal.js")
    .then((module) => {
      module.openModal(sensorId);
    })
    .catch((error) => {
      console.error("Error loading modal script:", error);
    });
}

function initializeFilters() {
  // 📌 1. Guardar valores actuales
  const currentMunicipio = document.getElementById("filter-municipio")?.value || "";
  const currentBarrio = document.getElementById("filter-barrio")?.value || "";
  const currentUsoSuelo = document.getElementById("filter-uso-suelo")?.value || "";
  const currentNivel = document.getElementById("filter-nivel")?.value || "";
  const currentReferencia = document.getElementById("filter-referencia")?.value || "";

  const municipioSelect = document.getElementById("filter-municipio");
  const barrioSelect = document.getElementById("filter-barrio");
  const usoSueloSelect = document.getElementById("filter-uso-suelo");
  const nivelSelect = document.getElementById("filter-nivel");
  const referenciaInput = document.getElementById("filter-referencia");

  // 📌 2. Resetear opciones
  municipioSelect.innerHTML = '<option value="">Todos los municipios</option>';
  barrioSelect.innerHTML = '<option value="">Todos los barrios</option>';
  usoSueloSelect.innerHTML = '<option value="">Todos los usos del suelo</option>';
  nivelSelect.innerHTML = `
    <option value="">Todos los niveles</option>
    <option value="bajo">Bajo (0 - 55 dBA)</option>
    <option value="medio">Medio (55 - 65 dBA)</option>
    <option value="alto">Alto (65 - 75 dBA)</option>
    <option value="critico">Excesivo (> 75 dBA)</option>
  `;

  const municipios = new Set();
  const barrios = new Map(); // 🔹 Map para barrios por municipio
  const usosSuelo = new Set();

  sensorsData.forEach((sensor) => {
    if (sensor.municipio) municipios.add(sensor.municipio);
    if (sensor.uso_suelo) usosSuelo.add(sensor.uso_suelo);

    if (sensor.municipio && sensor.barrio) {
      if (!barrios.has(sensor.municipio)) {
        barrios.set(sensor.municipio, new Set());
      }
      barrios.get(sensor.municipio).add(sensor.barrio);
    }
  });

  municipios.forEach((municipio) => {
    municipioSelect.innerHTML += `<option value="${municipio}">${municipio}</option>`;
  });

  usosSuelo.forEach((uso) => {
    usoSueloSelect.innerHTML += `<option value="${uso}">${uso}</option>`;
  });

  // 📌 3. Restaurar los valores antiguos
  municipioSelect.value = currentMunicipio;
  actualizarBarriosSegunMunicipio(currentMunicipio, barrios);
  barrioSelect.value = currentBarrio;
  usoSueloSelect.value = currentUsoSuelo;
  nivelSelect.value = currentNivel;
  referenciaInput.value = currentReferencia;

  // 📌 4. Volver a asignar eventos
  municipioSelect.addEventListener("change", () => {
    const selectedMunicipio = municipioSelect.value;
    actualizarBarriosSegunMunicipio(selectedMunicipio, barrios);
    applyFilters();
  });

  barrioSelect.addEventListener("change", applyFilters);
  referenciaInput.addEventListener("input", applyFilters);
  usoSueloSelect.addEventListener("change", applyFilters);
  nivelSelect.addEventListener("change", applyFilters);
}

// 🔹 Actualizar barrios dinámicamente según municipio seleccionado
function actualizarBarriosSegunMunicipio(municipio, barriosMap) {
  const barrioSelect = document.getElementById("filter-barrio");
  barrioSelect.innerHTML = '<option value="">Todos los barrios</option>';

  if (barriosMap.has(municipio)) {
    barriosMap.get(municipio).forEach((barrio) => {
      barrioSelect.innerHTML += `<option value="${barrio}">${barrio}</option>`;
    });
  }
}

// 🔹 Función para normalizar valores de ruido en un rango de 0 a 1
function normalizeLevel(value, min = 0, max = 100) {
  if (isNaN(value) || value < min) return 0.0; // Asegurar que no sea NaN o menor al mínimo
  if (value > max) return 1.0; // Limitar al valor máximo
  return (value - min) / (max - min);
}

function applyFilters() {
  markerLayerGroup.clearLayers();
  const heatmapPoints = []; // 🔹 Lista de puntos para actualizar el heatmap

  const municipio = document.getElementById("filter-municipio").value;
  const barrio = document.getElementById("filter-barrio").value;
  const referencia = document
    .getElementById("filter-referencia")
    .value.toLowerCase();
  const usoSuelo = document.getElementById("filter-uso-suelo").value;
  const nivel = document.getElementById("filter-nivel").value;

  sensorsData
    .filter((sensor) => {
      // 🔹 Definir laeq ANTES de utilizarlo en los filtros
      if (!sensor.laeq_slow || isNaN(parseFloat(sensor.laeq_slow)))
        return false;
      const laeq = parseFloat(sensor.laeq_slow);

      // 🔹 Filtrado por nivel de ruido
      if (nivel) {
        if (nivel === "bajo" && !(laeq >= 0 && laeq <= 55)) return false;
        if (nivel === "medio" && !(laeq > 55 && laeq <= 65)) return false;
        if (nivel === "alto" && !(laeq > 65 && laeq <= 75)) return false;
        if (nivel === "critico" && !(laeq > 75)) return false;
      }

      return (
        (!municipio || sensor.municipio === municipio) &&
        (!barrio || sensor.barrio === barrio) &&
        (!referencia ||
          sensor.sensor_name.toLowerCase().includes(referencia)) &&
        (!usoSuelo || sensor.uso_suelo === usoSuelo)
      );
    })
    .forEach((sensor) => {
      if (sensor.latitude && sensor.longitude) {
        let marker = markers[sensor.sensor_id];

        if (!marker) {
          marker = L.marker([sensor.latitude, sensor.longitude], {
            icon: getIcon(sensor.laeq_slow),
          });
          marker.on("click", () => openModal(sensor.sensor_id));
          markers[sensor.sensor_id] = marker;
        } else {
          marker.setIcon(getIcon(sensor.laeq_slow));
        }

        marker.bindPopup(() => {
          const content = createPopupContent(sensor);
          setTimeout(() => {
            const chartElement = document.getElementById(
              `graph-${sensor.sensor_id}`
            );
            if (chartElement && typeof updateChart === "function") {
              updateChart(sensor.sensor_id, sensor.historical_data);
            }
          }, 100);
          return content;
        });

        marker.on("mouseover", () => marker.openPopup());
        markerLayerGroup.addLayer(marker);

        // 🔹 Volver a definir laeq antes de normalizarlo
        const laeq = parseFloat(sensor.laeq_slow) || 0;
        const normalizedLevel = normalizeLevel(laeq, 0, 100);
        heatmapPoints.push([
          sensor.latitude,
          sensor.longitude,
          normalizedLevel,
        ]);
      }
    });

  // 🔹 Actualizar el heatmap con los sensores filtrados
  if (heatmapLayer) {
    heatmapLayer.setLatLngs(heatmapPoints);
  } else {
    console.error("❌ heatmapLayer no está definido.");
  }
}



/// **Ejecutar el mapa**
document.addEventListener("DOMContentLoaded", () => {
  renderMap();
});
