/**
@file public/js/chart.js
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

document.addEventListener('DOMContentLoaded', () => {
    const chart = echarts.init(document.getElementById('chart'));

    const option = {
        title: { text: 'Example Chart' },
        tooltip: {},
        xAxis: { data: ['A', 'B', 'C', 'D', 'E'] },
        yAxis: {},
        series: [{ type: 'bar', data: [5, 20, 36, 10, 10] }],
    };

    chart.setOption(option);
});
