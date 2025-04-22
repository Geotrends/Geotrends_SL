import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.esm.min.js';
import { crearGraficoLineas } from './utils/charts.js';
import { crearGraficoBarras, crearGraficoScatter } from './utils/charts.js';
import { crearWordCloud } from './utils/wordClouds.js';

console.log("✅ main.js cargado correctamente");

export async function inicializarDashboardRanchera() {
  const contenedor = document.getElementById("resumen-estadisticas");
  if (!contenedor) {
    console.warn("⚠️ No se encontró el contenedor #resumen-estadisticas");
    return;
  }

  try {
    const res = await fetch('/api/ranchera/resumen');
    const data = await res.json();

    const resumen = [
      { titulo: "Perfiles semilla", valor: data.semillas, icono: "fa-seedling" },
      { titulo: "Perfiles analizados", valor: data.perfiles, icono: "fa-users" },
      { titulo: "Publicaciones detectadas", valor: data.publicaciones, icono: "fa-images" },
      { titulo: "Comentarios analizados", valor: data.comentarios, icono: "fa-comments" },
      { titulo: "Sentimiento positivo", valor: data.sentimientoPositivo, icono: "fa-smile" }
    ];

    contenedor.innerHTML = "";
    resumen.forEach(item => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "tarjeta-resumen";
      tarjeta.innerHTML = `
        <h3><span class="contador" data-valor="${item.valor}">0</span></h3>
        <p><i class="fa ${item.icono}"></i> ${item.titulo}</p>
      `;
      contenedor.appendChild(tarjeta);
    });

    document.querySelectorAll('.contador').forEach(el => {
      const rawValor = el.dataset.valor;

      const esPorcentaje = typeof rawValor === "string" && rawValor.includes('%');
      const valorFinal = esPorcentaje
        ? parseFloat(rawValor.replace('%', ''))
        : parseFloat(rawValor);

      if (isNaN(valorFinal)) {
        el.textContent = rawValor;
        return;
      }

      let inicio = 0;
      const duracion = 1200;
      const incremento = valorFinal / (duracion / 16);

      const animar = () => {
        inicio += incremento;
        if (inicio >= valorFinal) {
          el.textContent = esPorcentaje
            ? valorFinal.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
            : Math.round(valorFinal).toLocaleString('es-CO');
        } else {
          el.textContent = esPorcentaje
            ? inicio.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
            : Math.floor(inicio).toLocaleString('es-CO');
          requestAnimationFrame(animar);
        }
      };
      animar();
    });

    renderizarGraficoPublicacionesNodos();
    cargarIndicadoresSemilla();
    renderizarGraficosDescriptivos();
    renderizarGraficosComparativos();
    renderizarGraficoLineaTiempo();
    // inicializarWordCloud(); // removed as the function is no longer defined
    inicializarWordCloudBiografias();
  } catch (error) {
    console.error("❌ Error cargando resumen:", error);
  }
}

function renderizarGraficoPublicacionesNodos() {
  crearGraficoBarras({
    contenedorId: 'grafico-publicaciones-nodos',
    titulo: 'Publicaciones por Nodo Semilla',
    categorias: ['Nodo A', 'Nodo B', 'Nodo C', 'Nodo D'],
    datos: [120, 200, 150, 80]
  });
}

async function cargarIndicadoresSemilla() {
  const contenedor = document.getElementById("indicadores-semilla");
  if (!contenedor) return;

  try {
    const res = await fetch('/api/ranchera/indicadores-semilla');
    const data = await res.json();

    contenedor.innerHTML = `
      <div class="indicadores-layout">
        <div class="indicadores-columna">
        <h3>Indicadores de perfiles semilla</h3>
          <div class="indicador"><i class="fa fa-users"></i> Total perfiles semilla: <strong>${data.total}</strong></div>
          <div class="indicador"><i class="fa fa-user-plus"></i> Promedio seguidores: <strong>${data.promedio.followers_count}</strong></div>
          <div class="indicador"><i class="fa fa-user-friends"></i> Promedio seguidos: <strong>${data.promedio.follows_count}</strong></div>
          <div class="indicador"><i class="fa fa-link"></i> Con enlace externo: <strong>${data.enlacesExternos}</strong></div>
          <div class="indicador"><i class="fa fa-lock"></i> Perfiles privados: <strong>${data.privados}</strong></div>
          <div class="indicador"><i class="fa fa-check-circle"></i> Perfiles verificados: <strong>${data.verificados}</strong></div>
          <div class="indicador"><i class="fa fa-briefcase"></i> Categoría más frecuente: <strong>${data.categorias[0]?.business_category_name ?? 'Sin categoría'}</strong> (${data.categorias[0]?.count ?? 0})</div>
        </div>
        <div class="top-perfiles-columna">
          <h3>Top 6 perfiles con más seguidores:</h3>
          <div class="top-perfiles">
            ${data.top3.map(p => `
    <a href="https://www.instagram.com/${p.username}/" target="_blank" class="perfil-tarjeta-link">
      <div class="perfil-tarjeta">
        <img src="/api/ranchera/proxy-img?url=${encodeURIComponent(p.profile_pic_url)}" alt="${p.username}" class="perfil-img">
        <div class="perfil-info">
          <p class="nombre-completo"><strong>${p.full_name ?? 'Sin nombre completo'}</strong></p>
          <p class="info">@${p.username} ${p.verified ? '<i class="fa fa-check-circle" style="color:#1da1f2;" title="Cuenta verificada"></i>' : ''}</p>
          <p class="info">${Number(p.followersCount).toLocaleString('es-CO')} seguidores</p>
          <p class="info">${Number(p.follows_count).toLocaleString('es-CO')} seguidos</p>
        </div>
      </div>
    </a>
  `).join('')}
          </div>
        </div>
      </div>
    `;
    console.log("✅ Indicadores semilla cargados correctamente:", data);
  } catch (error) {
    contenedor.innerHTML = "<p>Error al cargar indicadores.</p>";
    console.error("❌ Error al cargar indicadores semilla:", error);
  }
}

async function renderizarGraficosDescriptivos() {
  try {
    const res = await fetch('/api/ranchera/graficos-descriptivos');
    const data = await res.json();

    crearGraficoBarras({
      contenedorId: 'grafico-categorias',
      titulo: 'Distribución por Categoría de Negocio',
      categorias: data.categorias.map(c =>
        (c.business_category_name || '')
          .split(',')
          .map(cat => cat.trim())
          .find(cat => cat.toLowerCase() !== 'none') || 'Sin categoría'
      ),datos: data.categorias.map(c => c.count)
    });

    crearGraficoBarras({
      contenedorId: 'grafico-tipo-perfil',
      titulo: 'Perfiles Públicos vs Privados',
      categorias: ['Públicos', 'Privados'],
      datos: [data.publicos, data.privados],
      color: '#1565C0'
    });

  } catch (error) {
    console.error("❌ Error al cargar gráficos descriptivos:", error);
  }
}

async function renderizarGraficosComparativos() {
  try {
    const res = await fetch('/api/ranchera/stats-semilla');
    const perfiles = await res.json();

    const nombresCompletos = perfiles.map(p => p.full_name ?? p.username);
    const seguidores = perfiles.map(p => p.followers_count);
    const seguidos = perfiles.map(p => p.follows_count);
    const publicaciones = perfiles.map(p => p.posts_count);

    crearGraficoBarras({
      contenedorId: 'grafico-comparativo-seguidores',
      titulo: 'Cantidad de videos IGTV por perfil',
      categorias: nombresCompletos,
      datos: perfiles.map(p => p.igtv_video_count),
      color: '#2E7D32',
      nombreEjeX: 'Perfil',
      nombreEjeY: 'Videos IGTV'
    });

    crearGraficoBarras({
      contenedorId: 'grafico-comparativo-publicaciones',
      titulo: 'Cantidad de publicaciones por perfil',
      categorias: nombresCompletos,
      datos: publicaciones,
      color: '#6A1B9A',
      nombreEjeX: 'Perfil',
      nombreEjeY: 'Publicaciones'
    });

    crearGraficoScatter({
      contenedorId: 'grafico-scatter-seguidores',
      titulo: 'Relación Seguidores vs Seguidos',
      datos: perfiles
    });

  } catch (error) {
    console.error("❌ Error al cargar gráficos comparativos:", error);
  }
}
async function renderizarGraficoLineaTiempo() {
  try {
    const res = await fetch('/api/ranchera/linea-tiempo');
    const { fechas, series } = await res.json();
 
    crearGraficoLineas({
      contenedorId: 'grafico-linea-tiempo',
      titulo: 'Línea de tiempo de publicaciones por perfil semilla',
      categorias: fechas,
      series: series
    });
  } catch (error) {
    console.error("❌ Error al renderizar gráfico de línea de tiempo:", error);
  }
}



async function inicializarWordCloudBiografias() {
  const selector = document.getElementById("selectorPerfiles");
  const sliderBio = document.getElementById('frecuenciaSliderBiografias');
  const valorBio = document.getElementById('frecuenciaValorBiografias');
  let palabrasBiografias = [];
  
  // Optional: If you decide to remove the button from the HTML, eliminate its usage.
  if (!selector) return;

  try {
    const res = await fetch('/api/ranchera/stats-semilla');
    const perfiles = await res.json();

    selector.innerHTML = "";
    perfiles.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.username;
      opt.textContent = p.full_name || p.username;
      opt.selected = true;
      selector.appendChild(opt);
    });

    async function actualizarWordCloudBiografias() {
      const seleccionados = Array.from(selector.selectedOptions).map(o => o.value);
      const resp = await fetch('/api/ranchera/biografias-wordcloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: seleccionados })
      });
 
      const { biografias } = await resp.json();
      palabrasBiografias = procesarTextoABiogramas(biografias);
      renderizarWordCloudBiografias(parseInt(sliderBio.value));
    }
 
    selector.addEventListener("change", actualizarWordCloudBiografias);
    sliderBio.addEventListener("input", () => {
      renderizarWordCloudBiografias(parseInt(sliderBio.value));
    });
 
    // Ejecutar una vez al inicio
    actualizarWordCloudBiografias();

  } catch (error) {
    console.error("❌ Error inicializando wordcloud biografías:", error);
  }
 
  function renderizarWordCloudBiografias(minFreq) {
    valorBio.textContent = minFreq;
    const filtradas = palabrasBiografias.filter(p => p.weight >= minFreq);
    crearWordCloud({ contenedorId: 'grafico-wordcloud-biografias', palabras: filtradas });
  }
}

function procesarTextoABiogramas(texto) {
  const frecuencia = {};
  const palabras = texto.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  for (const palabra of palabras) {
    if (palabra.length < 4) continue;
    frecuencia[palabra] = (frecuencia[palabra] || 0) + 1;
  }
  return Object.entries(frecuencia).map(([text, weight]) => ({ text, weight }));
}

// inicializarWordCloudBiografias();  // Removed duplicate call outside the main function