/**
@file public/js/analitica/resumen.js
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

// Inicializar el gráfico vacío
function initEmptyChart() {
    var myChart = echarts.init(document.getElementById('main'));
    window.addEventListener('resize', () => myChart.resize());

    const markAreas = Object.keys(levels).map(level => ([{
        yAxis: levels[level]["low"],
        itemStyle: { color: levels[level]["color"], opacity: 0.15 }
    },
    {
        yAxis: levels[level]["high"],
        itemStyle: { color: levels[level]["color"], opacity: 0.15 }
    }]));

    myChart.setOption({
        title: { text: 'LAdn [dB]' },
        tooltip: { trigger: 'axis' },
        legend: { data: ["LAd - Slow", "LAn - Slow", "LAdn - Slow"] },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true }, // Se ajusta el bottom
        toolbox: { feature: { saveAsImage: {} } },
        xAxis: { 
            type: 'category', 
            boundaryGap: false, 
            data: [],
            axisLabel: {
                interval: 0, // Mostrar todos los labels
                rotate: 45,  // Rotar para evitar superposición
                margin: 8,   // Separar los labels del eje
                align: 'right',
                verticalAlign: 'middle'
            }
        },
        yAxis: { type: 'value', min: 40, max: 100 },
        series: [
            { name: "LAd - Slow", type: 'line', data: [], markArea: { data: markAreas } },
            { name: "LAn - Slow", type: 'line', data: [] },
            { name: "LAdn - Slow", type: 'line', data: [] }
        ]
    });

    return myChart; // Retorna el gráfico para actualizarlo luego
}

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

// Función para actualizar el gráfico con datos reales
async function updateChartWithData(myChart) {
    const endpoint = '/analitica/niveles30avg';
    const rawData = await fetchData(endpoint);

    // Preprocesar los datos
    let data = rawData.map(item => ({
        sensor: item.referencia,
        Ld: item.la_d ? parseFloat(item.la_d) : null,
        Ln: item.la_n ? parseFloat(item.la_n) : null,
        Ldn: item.la_dn ? parseFloat(item.la_dn) : null
    }));

    // Ordenar los datos en función de Ldn de mayor a menor
    data.sort((a, b) => b.Ldn - a.Ldn);

    // Extraer los valores ordenados
    const sortedData = {
        sensors: data.map(item => item.sensor),
        Ld: data.map(item => item.Ld),
        Ln: data.map(item => item.Ln),
        Ldn: data.map(item => item.Ldn)
    };

    // Actualizar el gráfico con los datos
    myChart.setOption({
        xAxis: { data: sortedData.sensors },
        series: [
            { name: "LAd - Slow", data: sortedData.Ld },
            { name: "LAn - Slow", data: sortedData.Ln },
            { name: "LAdn - Slow", data: sortedData.Ldn }
        ]
    });
}

// Inicializar el gráfico y luego actualizarlo con datos
const myChartSummarize = initEmptyChart();
updateChartWithData(myChartSummarize);
