/**
@file public/js/routes-views.js
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

document.addEventListener('DOMContentLoaded', async () => {
    const menuItems = document.querySelectorAll('.menu-item'); // Selecciona los elementos del menú
    const mainContent = document.getElementById('main-content'); // Selecciona el contenedor de contenido

    // Mapea los nombres de los menús a las rutas de tus vistas
    const routes = {
        'inicio': '/views/inicio.html',
        'monitoreo': '/views/monitoreo.html',
        'históricos': '/views/historicos.html',
        'analítica': '/views/analitica.html',
        'calendario': '/views/calendario.html',
        'predicción': '/views/prediccion.html',
        'notificaciones': '/views/notificaciones.html',
        'configuración': '/views/settings.html',
        'soporte': '/views/soporte.html'
    };

    // Función para cargar la vista como iframe
    const loadIframeContent = (route, target) => {
        // Limpia el contenido anterior
        mainContent.innerHTML = '';

        // Crea un iframe y lo agrega al contenedor
        const iframe = document.createElement('iframe');
        iframe.src = route; // Establece la URL de la vista
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.style.border = 'none'; // Sin bordes para que sea limpio
        iframe.style.borderRadius='10px';
        iframe.style.minHeight = '600px'; // Ajusta una altura mínima si es necesario
        mainContent.appendChild(iframe);

        // Actualiza la selección del menú
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('menu-item-selected'));
        if (target) target.classList.add('menu-item-selected');
    };

    // Cargar por defecto la página de inicio
    loadIframeContent(routes['inicio'], document.querySelector('.menu-item-selected'));

    // Asignar eventos de clic a los elementos del menú
    menuItems.forEach(item => {
        item.addEventListener('click', (event) => {
            const target = event.currentTarget;
            const menuText = target.querySelector('span').textContent.trim().toLowerCase();

            if (routes[menuText]) {
                loadIframeContent(routes[menuText], target);
            } else {
                mainContent.innerHTML = `<p>Ruta no encontrada.</p>`;
            }
        });
    });
});