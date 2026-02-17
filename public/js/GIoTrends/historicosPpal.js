console.log("Cargando script de monitoreo en tiempo real...");

export function inicializarTabsMonitoreo() {
  const tabButtons = document.querySelectorAll('.tab');
  const iframe = document.getElementById('iframe-content');

  const tabRoutes = {
    resumen: "/html/GIoTrends/historicos.html",
    mapa: "/html/GIoTrends/consolidados.html",
    eventos: "/html/GIoTrends/monitoreoEventos.html"
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.getAttribute("data-tab");
      if (tabRoutes[tab]) {
        iframe.src = tabRoutes[tab];
      } else {
        console.warn(`Ruta no definida para la pestaña: ${tab}`);
      }
    });
  });
}
inicializarTabsMonitoreo();