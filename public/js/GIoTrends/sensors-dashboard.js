/**
@file public/js/sensors-dashboard.js
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

import { openModal } from './modal.js';

let sensorsData = []; // 🔹 Datos globales de sensores
let filteredSensors = []; // 🔹 Sensores filtrados

// 🔹 Obtener datos del servidor cada 10 segundos
async function fetchLatestSensorData() {
    try {
        const response = await fetch('/sensors/latest');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // console.log("🔄 Datos recibidos del backend:", data);
        sensorsData = data; // 🔹 Guardamos los datos más recientes
        applyFilters(); // 🔹 Aplicar filtros y actualizar tarjetas
    } catch (error) {
        console.error('❌ Error obteniendo datos:', error);
    }
}

// 🔹 Obtener el dato más reciente de un sensor
function getLatestEntry(sensor) {
    if (!sensor.hourly_data || sensor.hourly_data.length === 0) {
        return {
            timestamp: sensor.timestamp,
            laeq_slow: parseFloat(sensor.laeq_slow)
        };
    }

    return sensor.hourly_data.reduce((latest, current) => 
        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest, 
        sensor.hourly_data[0]
    );
}

// 🔹 Actualizar solo los valores sin recrear tarjetas
function updateSensorValues() {
    filteredSensors.forEach(sensor => {
        const card = document.getElementById(`sensor-card-${sensor.sensor_id}`);
        if (card) {
            updateSensorCard(card, sensor);
        }
    });
}

// 🔹 Asignar color según nivel de ruido
function getBorderColor(level) {
    if (level > 75) return 'red';
    if (level > 65) return '#ef7d00';
    if (level > 55) return '#82cc19';
    return '#0074BD';
}

// 🔹 CREAR O ACTUALIZAR TARJETA
function updateOrCreateCard(container, sensor) {
    const { sensor_id, referencia, hourly_data, barrio } = sensor;

    if (!hourly_data || hourly_data.length === 0) {
        console.warn(`⚠️ No hay datos recientes para ${sensor_id}`);
        return;
    }

    // 🔹 Ordenar por timestamp DESCENDENTE y obtener el último dato
    const sortedHourlyData = [...hourly_data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const latestEntry = sortedHourlyData[0];

    // console.log(`🔹 Último dato actualizado para ${sensor_id}:`, latestEntry);

    let card = document.getElementById(`sensor-card-${sensor_id}`);

    if (!card) {
        // Crear tarjeta si no existe
        card = document.createElement('div');
        card.className = 'sensor-card';
        card.id = `sensor-card-${sensor_id}`;

        const rect = document.createElement('div');
        rect.className = 'sensor-rect';
        rect.style.transition = 'background-color 0.5s ease-in-out';

        const name = document.createElement('div');
        name.className = 'sensor-name';
        name.innerHTML = referencia + "<br>" + barrio; // Usa <br> para el salto de línea en HTML
        
      
        const levelWrapper = document.createElement('div');
        levelWrapper.className = 'sensor-level-wrapper';

        const level = document.createElement('span');
        level.className = 'sensor-level';
        level.setAttribute('data-tooltip', 'LAeq, 5min \n(Ultimo dato registrado)');

        const dba = document.createElement('span');
        dba.className = 'sensor-dba';
        dba.textContent = ' dBA';
        dba.setAttribute('data-tooltip', 'Unidad de medida');

        levelWrapper.appendChild(level);
        levelWrapper.appendChild(dba);

        const graph = document.createElement('div');
        graph.className = 'sensor-graph';
        graph.setAttribute('data-tooltip', 'Tendencia LAeq \n(última hora)');

        const update = document.createElement('div');
        update.className = 'sensor-update';

        card.appendChild(rect);
        card.appendChild(name);
        card.appendChild(levelWrapper);
        card.appendChild(graph);
        card.appendChild(update);

        card.addEventListener('click', () => openModal(sensor_id));

        container.appendChild(card);
    }

    // 🔹 Obtener referencias a los elementos de la tarjeta
    const rect = card.querySelector('.sensor-rect');
    const level = card.querySelector('.sensor-level');
    const update = card.querySelector('.sensor-update');
    const graph = card.querySelector('.sensor-graph');

    const parsedLevel = parseFloat(latestEntry.laeq_slow);
    
    if (isNaN(parsedLevel)) {
        console.warn(`⚠️ Valor inválido para laeq_slow en ${sensor_id}:`, latestEntry.laeq_slow);
        return;
    }

    // 🔹 Solo actualizar si hay cambios reales
    if (level.textContent !== parsedLevel.toFixed(1)) {
        rect.style.backgroundColor = getBorderColor(parsedLevel);
        level.textContent = parsedLevel.toFixed(1);
        update.textContent = `Actualizado: ${new Date(latestEntry.timestamp).toLocaleString()}`;
        // console.log(`✅ Se actualizó la tarjeta de ${sensor_id} con:`, latestEntry);
    }

    // 🔹 Construcción del gráfico (pero sin borrar la instancia anterior)
    if (sortedHourlyData.length > 0) {
        const levels = sortedHourlyData.map(row => parseFloat(row.laeq_slow));
        const maxLevel = Math.max(...levels);
        const minLevel = Math.min(...levels);

        const normalizedData = sortedHourlyData.map(row => [
            new Date(row.timestamp).getTime(),
            ((parseFloat(row.laeq_slow) - minLevel) / (maxLevel - minLevel)) * 100,
        ]);

        let chart = echarts.getInstanceByDom(graph);
        if (!chart) {
            chart = echarts.init(graph);
        }

        chart.setOption({
            grid: { left: 0, right: 0, top: 0, bottom: 0 },
            xAxis: { show: false, type: 'time' },
            yAxis: { show: false },
            series: [
                {
                    data: normalizedData,
                    showSymbol: false,
                    type: 'line',
                    smooth: false,
                    lineStyle: { color: 'grey' },
                    areaStyle: { opacity: 0 },
                },
            ],
        });

        setTimeout(() => chart.resize(), 100);
    }
 // 🔹 Actualizar tarjeta existente
 updateSensorCard(card, sensor);
}

// 🔹 ACTUALIZAR TARJETA EXISTENTE
function updateSensorCard(card, sensor) {
    const rect = card.querySelector('.sensor-rect');
    const level = card.querySelector('.sensor-level');
    const update = card.querySelector('.sensor-update');

    const parsedLevel = parseFloat(sensor.laeq_slow);

    if (!isNaN(parsedLevel)) {
        level.textContent = parsedLevel.toFixed(1);
        update.textContent = `Actualizado: ${new Date(sensor.timestamp).toLocaleString()}`;
        rect.style.backgroundColor = getBorderColor(parsedLevel);
    }
}

// 🔹 FILTROS Y VISUALIZACIÓN INICIAL
async function initializeFilters() {
    await fetchLatestSensorData(); // 🔹 Obtener datos antes de inicializar filtros

    const municipioSelect = document.getElementById('filter-municipio');
    const barrioSelect = document.getElementById('filter-barrio');

    // 🔹 Agrupar barrios por municipio
    const barriosPorMunicipio = {};
    sensorsData.forEach(sensor => {
        if (!barriosPorMunicipio[sensor.municipio]) {
            barriosPorMunicipio[sensor.municipio] = new Set();
        }
        barriosPorMunicipio[sensor.municipio].add(sensor.barrio);
    });

    // 🔹 Llenar municipios únicos
    Object.keys(barriosPorMunicipio).sort().forEach(municipio => {
        const option = document.createElement('option');
        option.value = municipio;
        option.textContent = municipio;
        municipioSelect.appendChild(option);
    });

    // 🔹 Evento para actualizar barrios según municipio seleccionado
    municipioSelect.addEventListener('change', () => {
        barrioSelect.innerHTML = '<option value="">Todos los barrios</option>';
        const selectedMunicipio = municipioSelect.value;

        if (selectedMunicipio && barriosPorMunicipio[selectedMunicipio]) {
            Array.from(barriosPorMunicipio[selectedMunicipio])
                .sort()
                .forEach(barrio => {
                    const option = document.createElement('option');
                    option.value = barrio;
                    option.textContent = barrio;
                    barrioSelect.appendChild(option);
                });
        }
        applyFilters(); // 🔹 Filtrar sin borrar datos
    });

    // 🔹 Filtros dinámicos en tiempo real
    document.getElementById('filter-barrio').addEventListener('change', applyFilters);
    document.getElementById('filter-referencia').addEventListener('input', applyFilters);
    document.getElementById('filter-uso-suelo').addEventListener('change', applyFilters);
}

// 🔹 FILTRAR Y MOSTRAR SENSORES AGRUPADOS POR MUNICIPIO
function applyFilters() {
    // console.log("🔄 Aplicando filtros en tiempo real...");

    const municipioFilter = document.getElementById('filter-municipio').value;
    const barrioFilter = document.getElementById('filter-barrio').value;
    const referenciaFilter = document.getElementById('filter-referencia').value.toLowerCase();
    const usoSueloFilter = document.getElementById('filter-uso-suelo').value;
    const nivelFilter = document.getElementById('filter-nivel').value;

    filteredSensors = sensorsData.filter(sensor => {
        const nivelRuido = parseFloat(sensor.laeq_slow);

        if (isNaN(nivelRuido)) {
            console.warn(`⚠️ Nivel de ruido inválido para sensor ${sensor.sensor_id}:`, sensor.laeq_slow);
            return false;
        }

        let nivelValido = true;
        if (nivelFilter === "bajo") nivelValido = nivelRuido <= 55;
        if (nivelFilter === "medio") nivelValido = nivelRuido > 55 && nivelRuido <= 65;
        if (nivelFilter === "alto") nivelValido = nivelRuido > 65 && nivelRuido <= 75;
        if (nivelFilter === "critico") nivelValido = nivelRuido > 75;

        return (
            (municipioFilter === "" || sensor.municipio === municipioFilter) &&
            (barrioFilter === "" || sensor.barrio === barrioFilter) &&
            (referenciaFilter === "" || sensor.referencia.toLowerCase().includes(referenciaFilter)) &&
            (usoSueloFilter === "" || sensor.uso_suelo === usoSueloFilter) &&
            nivelValido
        );
    });

    const container = document.getElementById('sensors-container');

    // 🔹 Mantenemos un Set con los sensores que deben estar visibles
    const filteredSensorIds = new Set(filteredSensors.map(sensor => `sensor-card-${sensor.sensor_id}`));

    // 🔹 Eliminamos las tarjetas que ya no cumplen con los filtros
    document.querySelectorAll('.sensor-card').forEach(card => {
        if (!filteredSensorIds.has(card.id)) {
            card.remove();
        }
    });

    // 🔹 Eliminamos los títulos de municipios que quedaron vacíos
    document.querySelectorAll('.municipio-title').forEach(title => {
        const municipioId = title.getAttribute('data-municipio');
        const municipioSection = document.getElementById(`municipio-section-${municipioId}`);

        if (municipioSection && municipioSection.children.length === 0) {
            title.remove();
            municipioSection.remove();
        }
    });

    const groupedByMunicipio = {};
    filteredSensors.forEach(sensor => {
        if (!groupedByMunicipio[sensor.municipio]) {
            groupedByMunicipio[sensor.municipio] = [];
        }
        groupedByMunicipio[sensor.municipio].push(sensor);
    });

    Object.keys(groupedByMunicipio).forEach(municipio => {
        let municipioSection = document.getElementById(`municipio-section-${municipio}`);

        // 🔹 Solo agregar el título si hay sensores en ese municipio
        if (!municipioSection) {
            const municipioTitle = document.createElement('h2');
            municipioTitle.className = 'municipio-title';
            municipioTitle.textContent = municipio;
            municipioTitle.setAttribute('data-municipio', municipio);

            municipioSection = document.createElement('div');
            municipioSection.className = 'municipio-container';
            municipioSection.id = `municipio-section-${municipio}`;

            container.appendChild(municipioTitle);
            container.appendChild(municipioSection);
        }

        groupedByMunicipio[municipio].forEach(sensor => {
            let existingCard = document.getElementById(`sensor-card-${sensor.sensor_id}`);

            if (!existingCard) {
                updateOrCreateCard(municipioSection, sensor);
            } else {
                updateSensorCard(existingCard, sensor);
            }
        });
    });

    // console.log("✅ Filtros aplicados y municipios vacíos eliminados.");
}


// 🔹 Escuchar cambios en el filtro de nivel de ruido
document.getElementById('filter-nivel').addEventListener('change', applyFilters);



// 🔹 INICIALIZACIÓN Y ACTUALIZACIÓN CADA 10 SEGUNDOS
document.addEventListener('DOMContentLoaded', async () => {
    await initializeFilters();
    applyFilters(); 
    setInterval(fetchLatestSensorData, 10000);
});
