/**
@file public/js/menu-bar.js
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

// Seleccionar todos los botones del menú
const menuButtons = document.querySelectorAll('.menu .menu-item');

// Agregar evento de clic a cada botón
menuButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Si el botón ya está seleccionado, no hace nada
        if (button.classList.contains('menu-item-selected')) return;

        // Remover la clase 'menu-item-selected' de todos los botones
        menuButtons.forEach(btn => btn.classList.remove('menu-item-selected'));
        menuButtons.forEach(btn => btn.classList.remove('menu-item-selected'));

        // Agregar la clase 'menu-item-selected' solo al botón clicado
        button.classList.add('menu-item-selected');
    });
});

document.getElementById("menu-toggle").addEventListener("click", function () {
    const menu = document.getElementById("menu");
    menu.classList.toggle("menu-collapsed");
});
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('mouseover', (e) => {
        const rect = item.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;
        item.style.setProperty('--tooltip-top', `${middle}px`);
    });
});
