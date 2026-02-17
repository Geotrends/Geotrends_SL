/**
@file public/js/analytics-charts.js
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

// Definir los niveles
const levels = {
    "bajo": { "low": 0, "high": 55, "color": "#0074BD" },
    "moderado": { "low": 55, "high": 65, "color": "#82cc19" },
    "alto": { "low": 65, "high": 75, "color": "#ef7d00" },
    "excesivo": { "low": 75, "high": 100, "color": "red" }
};

// Función para obtener los datos del endpoint
async function fetchData(endpoint) {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

// Función para inicializar el gráfico
async function initChart() {
    const endpoint = '/analitica/niveles30avg';
    const rawData = await fetchData(endpoint);

    // Preprocesar los datos
    const data = {
        sensors: rawData.map(item => item.sensor_id),
        Ld: rawData.map(item => item.la_d ? parseFloat(item.la_d) : null),
        Ln: rawData.map(item => item.la_n ? parseFloat(item.la_n) : null),
        Ldn: rawData.map(item => item.la_dn ? parseFloat(item.la_dn) : null)
    };

    // Inicializar el gráfico
    var myChart = echarts.init(document.getElementById('main'));
    window.addEventListener('resize', () => myChart.resize());

    // Convertir los niveles en áreas sombreadas
    const markAreas = Object.keys(levels).map(level => ([
        {
            yAxis: levels[level]["low"], // Punto inicial en el eje Y
            itemStyle: {
                color: levels[level]["color"],
                opacity: 0.15 // Transparencia de la sombra
            }
        },
        {
            yAxis: levels[level]["high"], // Punto final en el eje Y
            itemStyle: {
                color: levels[level]["color"],
                opacity: 0.15
            }
        }
    ]));

    // Dibujar el gráfico
    myChart.setOption({
        title: {
            text: 'LAdn [dB]'
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ["LAd - Slow", "LAn - Slow", "LAdn - Slow"]
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        toolbox: {
            feature: {
                saveAsImage: {}
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.sensors,
            axisLabel: {
                rotate: 90,
                interval: 0,
                align: 'right',
                verticalAlign: 'middle'
            }
        },
        yAxis: {
            type: 'value',
            min: 40,
            max: 100
        },
        series: [
            {
                name: "LAd - Slow",
                type: 'line',
                data: data.Ld,
                markArea: {
                    data: markAreas
                }
            },
            {
                name: "LAn - Slow",
                type: 'line',
                data: data.Ln
            },
            {
                name: "LAdn - Slow",
                type: 'line',
                data: data.Ldn
            }
        ]
    });
}

// Inicializar el gráfico al cargar la página
initChart();


var map = L.map('map').setView([6.16996, -75.58764], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


// Preprocesar los datos para el boxplot
function calculateBoxplotData(rawData) {
    const boxplotData = [];
    const categories = [];

    rawData.forEach(sensor => {
        const sorted = sensor.data.slice().sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const median = sorted[Math.floor(sorted.length * 0.5)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        boxplotData.push([min, q1, median, q3, max]);
        categories.push(sensor.sensors);
    });

    return { boxplotData, categories };
}

const { boxplotData, categories } = calculateBoxplotData(data2.data);

// Inicializar el gráfico
var myChart1 = echarts.init(document.getElementById('boxplot'));

window.addEventListener('resize', function () {
    myChart1.resize();
});

// Configuración del boxplot
myChart1.setOption({
    title: {
        text: 'Boxplot por Sensor',
        left: 'center'
    },
    tooltip: {
        trigger: 'item',
        formatter: function (param) {
            const statNames = ['Mínimo', 'Q1', 'Mediana', 'Q3', 'Máximo'];
            const stats = param.data.map((val, index) => `${statNames[index]}: ${val.toFixed(2)}`);
            return `${param.name}<br>${stats.join('<br>')}`;
        }
    },
    xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: true,
        name: 'Sensores',
        splitLine: {
            show: false
        }
    },
    yAxis: {
        type: 'value',
        name: 'Valores',
        splitArea: {
            show: true
        }
    },
    series: [
        {
            name: 'Boxplot',
            type: 'boxplot',
            data: boxplotData,
            tooltip: {
                formatter: function (param) {
                    return [
                        'Sensor: ' + param.name,
                        'Min: ' + param.data[0],
                        'Q1: ' + param.data[1],
                        'Median: ' + param.data[2],
                        'Q3: ' + param.data[3],
                        'Max: ' + param.data[4]
                    ].join('<br/>');
                }
            }
        }
    ]
});









const endpoint = '/analitica/superan?umbral_diurno=65&umbral_nocturno=65&umbral_total=65';

// Función asíncrona para obtener y procesar los datos
async function fetchAndRenderCharts() {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        // Ordenar los datos de mayor a menor
        const sortedDiurno = data.slice().sort((a, b) => b.porcentaje_diurno - a.porcentaje_diurno);
        const sortedNocturno = data.slice().sort((a, b) => b.porcentaje_nocturno - a.porcentaje_nocturno);

        // Extraer IDs de sensores y conteos
        const sensorIdsDiurno = sortedDiurno.map(d => d.sensor_id);
        const conteoDiurno = sortedDiurno.map(d => parseInt(d.porcentaje_diurno, 10));

        const sensorIdsNocturno = sortedNocturno.map(d => d.sensor_id);
        const conteoNocturno = sortedNocturno.map(d => parseInt(d.porcentaje_nocturno, 10));

        // Encontrar el máximo para destacar
        const maxDiurno = Math.max(...conteoDiurno);
        const maxNocturno = Math.max(...conteoNocturno);

        const barColorsDiurno = conteoDiurno.map(value => value === maxDiurno ? '#609712' : '#82cc19');
        const barColorsNocturno = conteoNocturno.map(value => value === maxNocturno ? '#609712' : '#82cc19');

        // Renderizar gráficos
        renderBarChart('criticoDiurno', 'Criticidad Diurno por Sensor > 65dBA', sensorIdsDiurno, conteoDiurno, barColorsDiurno);
        renderBarChart('criticoNocturno', 'Criticidad Nocturno por Sensor > 55dBA', sensorIdsNocturno, conteoNocturno, barColorsNocturno);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Función para renderizar un gráfico de barras
function renderBarChart(containerId, title, categories, dataValues, barColors) {
    const chart = echarts.init(document.getElementById(containerId));
    window.addEventListener('resize', function () {
        chart.resize();
    });
    chart.setOption({
        title: {
            text: title,
            left: 'center'
        },
        xAxis: {
            type: 'category',
            data: categories,
            axisLabel: {
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            name: title.includes("Diurno") ? "% Diurno" : "% Nocturno"
        },
        tooltip: {
            trigger: 'axis'
        },
        series: [{
            data: dataValues.map((value, index) => ({
                value: value,
                itemStyle: { color: barColors[index] }
            })),
            type: 'bar'
        }]
    });
}

// Llamar a la función para obtener y renderizar los datos
fetchAndRenderCharts();