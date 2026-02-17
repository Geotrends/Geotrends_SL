/**
@file public/js/analitica/boxplot.js
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

// Función para obtener los datos del endpoint
async function fetchDataBoxPlot(endpoint) {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

// Función para preprocesar los datos para el boxplot y ordenarlos
function calculateBoxplotData(rawData) {
    const boxplotData = [];
    const categories = [];

    let processedData = rawData.map(sensor => {
        const values = sensor.data
            .map(item => parseFloat(item.promedio_total))
            .filter(value => !isNaN(value));

        if (values.length > 0) {
            const sorted = values.sort((a, b) => a - b);
            return {
                referencia: sensor.referencia,
                min: sorted[0],
                q1: sorted[Math.floor(sorted.length * 0.25)],
                median: sorted[Math.floor(sorted.length * 0.5)],
                q3: sorted[Math.floor(sorted.length * 0.75)],
                max: sorted[sorted.length - 1],
                avg: sorted.reduce((sum, v) => sum + v, 0) / sorted.length
            };
        }
        return null;
    }).filter(item => item !== null);

    // Ordenar los sensores de mayor a menor según el promedio total
    processedData.sort((a, b) => b.avg - a.avg);

    processedData.forEach(sensor => {
        boxplotData.push([sensor.min, sensor.q1, sensor.median, sensor.q3, sensor.max]);
        categories.push(sensor.referencia);
    });

    return { boxplotData, categories };
}

// Inicializar el gráfico vacío y ajustarlo al contenedor
function initEmptyBoxplotChart() {
    const chartContainer = document.getElementById('boxplot');
    chartContainer.style.width = '100%';
    chartContainer.style.height = '360px';

    var myChartBoxPlot = echarts.init(chartContainer);

    window.addEventListener('resize', () => myChartBoxPlot.resize());

    // Configuración inicial con datos vacíos
    myChartBoxPlot.setOption({
        title: { text: '', left: 'center' },
        tooltip: {
            trigger: 'item',
            formatter: function (param) {
                const statNames = ['Mínimo', 'Q1', 'Mediana', 'Q3', 'Máximo'];
                return `${param.name}<br>${statNames.map((name, i) => `${name}: ${param.data[i].toFixed(2)}`).join('<br>')}`;
            }
        },
        grid: { left: '5%', right: '5%', bottom: '8%', top: '15%', containLabel: true }, // Ajuste dinámico del espacio
        xAxis: {
            type: 'category',
            data: [],
            boundaryGap: true,
            name: 'Sensores',
            splitLine: { show: false },
            axisLabel: {
                interval: 0,
                rotate: 45,
                margin: 8
            }
        },
        yAxis: {
            type: 'value',
            name: 'Nivel de ruido (dB)',
            splitArea: { show: true }
        },
        series: [
            {
                name: 'Boxplot',
                type: 'boxplot',
                data: []
            }
        ]
    });

    return myChartBoxPlot;
}

// Función para actualizar el gráfico con los datos reales
async function updateBoxplotChart(myChartBoxPlot) {
    const endpoint = '/analitica/niveles';
    const rawData = await fetchDataBoxPlot(endpoint);

    // Procesar los datos para el boxplot y ordenarlos
    const { boxplotData, categories } = calculateBoxplotData(rawData);

    // Actualizar el gráfico con los datos reales
    myChartBoxPlot.setOption({
        xAxis: { data: categories },
        series: [{ name: 'Boxplot', data: boxplotData }]
    });

    // Ajustar tamaño dinámicamente
    myChartBoxPlot.resize();
}

// Inicializar el gráfico y luego actualizar con datos
const myChartBoxPlot = initEmptyBoxplotChart();
updateBoxplotChart(myChartBoxPlot);
