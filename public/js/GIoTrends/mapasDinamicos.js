console.log("Cargando mapasDinamicos.js");

const map = L.map('map').setView([6.25, -75.57], 13); // Medellín como ejemplo

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);