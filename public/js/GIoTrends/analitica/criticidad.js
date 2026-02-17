/**
@file public/js/analitica/criticidad.js
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

const endpoint = '/api/giotrends/analitica/superan?umbral_diurno=65&umbral_nocturno=65&umbral_total=65';

// Función asíncrona para obtener y procesar los datos
async function fetchAndRenderCharts() {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        // Ordenar los datos de mayor a menor
        const sortedDiurno = data.slice().sort((a, b) => b.porcentaje_diurno - a.porcentaje_diurno);
        const sortedNocturno = data.slice().sort((a, b) => b.porcentaje_nocturno - a.porcentaje_nocturno);

        // Extraer IDs de sensores y conteos
        const sensorIdsDiurno = sortedDiurno.map(d => d.referencia);
        const conteoDiurno = sortedDiurno.map(d => parseInt(d.porcentaje_diurno, 10));

        const sensorIdsNocturno = sortedNocturno.map(d => d.referencia);
        const conteoNocturno = sortedNocturno.map(d => parseInt(d.porcentaje_nocturno, 10));

        // Encontrar el máximo para destacar
        const maxDiurno = Math.max(...conteoDiurno);
        const maxNocturno = Math.max(...conteoNocturno);

        const barColorsDiurno = conteoDiurno.map(value => value === maxDiurno ? '#609712' : '#82cc19');
        const barColorsNocturno = conteoNocturno.map(value => value === maxNocturno ? '#609712' : '#82cc19');

        // Renderizar gráficos
        renderBarChart('criticoDiurno', '', sensorIdsDiurno, conteoDiurno, barColorsDiurno);
        renderBarChart('criticoNocturno', '', sensorIdsNocturno, conteoNocturno, barColorsNocturno);

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