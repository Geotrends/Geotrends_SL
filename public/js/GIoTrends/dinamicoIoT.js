function filtrarYRecalcularEnergia(geometria, factores, offset = 0) {
  const puntosFiltrados = datosOriginales.filter(p =>
    p.geometry && p.geometry.type === "Point" && turf.booleanPointInPolygon(p, geometria)
  );

  return {
    type: "FeatureCollection",
    features: puntosFiltrados
      .map(f => {
        const energiaAjustada =
          f.originalPrincipal * factores.principal +
          f.originalAutopista * factores.autopista +
          f.originalServicio * factores.servicio +
          f.originalMenor * factores.menor +
          f.originalColectora * factores.colectora;

        // Si energiaAjustada no es válida (<=0 o NaN), sumTotal será null
        const sumTotal = energiaAjustada > 0 && !isNaN(energiaAjustada)
          ? 10 * Math.log10(energiaAjustada) + offset
          : null;

        return {
          ...f,
          properties: {
            ...f.properties,
            energiaAjustada,
            sumTotal
          }
        };
      })
      // Excluir puntos con sumTotal null o NaN
      .filter(f => f.properties.sumTotal !== null && !isNaN(f.properties.sumTotal))
  };
}

let ultimaGeometriaMunicipio = null;

const mapStyles = {
  streets: "https://api.maptiler.com/maps/streets/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  basic: "https://api.maptiler.com/maps/basic-v2/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  bright: "https://api.maptiler.com/maps/bright-v2/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  hybrid: "https://api.maptiler.com/maps/hybrid/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  satellite: "https://api.maptiler.com/maps/satellite/style.json?key=h7IIJ3zZQqwvoK5gk5z9"
};

const colorRamp = [
  [-99, 'rgba(255,255,255,0)'],  // transparente para valores muy bajos
  [35, '#a1d99b'],
  [40, '#31a354'],
  [45, '#006d2c'],
  [50, '#fee391'],
  [55, '#fec44f'],
  [60, '#fe9929'],
  [65, '#ef3b2c'],
  [70, '#f768a1'],
  [75, '#74c476'],
  [80, '#0570b0']
];

//const center = [-75.577, 6.244]; // Medellín
const center = [-75.5906, 6.1706]; // Envigado
const map = new maplibregl.Map({
  container: 'map',
  zoom: 12.5,
  center,
  pitch: 0,
  style: mapStyles.streets,
});

// Agregar sliders para componentes antes de map.on('load', ...)

function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

const componentes = ['principal', 'autopista', 'servicio', 'menor', 'colectora'];
const container = document.getElementById('slidersComponentes');
const slidersComponente = [];
if (!container) {
  console.error("❌ No se encontró el contenedor #slidersComponentes");
} else {
  componentes.forEach(componente => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <label>${componente} (<span id="label-${componente}">100</span>%)</label>
      <input type="range" id="slider-${componente}" min="0" max="300" step="5" value="100">
    `;
    container.appendChild(wrapper);

    const debouncedActualizar = debounce(actualizarEnergiaAjustada, 300);
    const slider = document.getElementById(`slider-${componente}`);
    slidersComponente.push(slider);

    slider.addEventListener('input', () => {
      document.getElementById(`label-${componente}`).textContent = slider.value;
    });

    slider.addEventListener('change', () => {
      const selectMunicipio = document.getElementById('selectMunicipio');
      if (selectMunicipio) {
        debouncedActualizar();
      }
    });
  });
}

function toggleSidebar(id) {
  const elem = document.getElementById(id); 
  const classes = elem.className.split(' ');
  const collapsed = classes.indexOf('collapsed') !== -1;

  const padding = {};
  if (collapsed) {
    classes.splice(classes.indexOf('collapsed'), 1);
    padding[id] = 300;
    map.easeTo({ padding, duration: 1000 });
  } else {
    padding[id] = 0;
    classes.push('collapsed');
    map.easeTo({ padding, duration: 1000 });
  }

  elem.className = classes.join(' ');
}


async function cargarMunicipios() {
  try {
    const response = await fetch('/api/giotrends/dinamico/municipios');
    const municipios = await response.json();

    const select = document.getElementById('selectMunicipio');
    municipios.forEach(({ nombre }) => {
      const option = document.createElement('option');
      option.value = nombre;
      option.textContent = nombre;
      select.appendChild(option);
    });

    // Seleccionar "Envigado" por defecto, solo si el elemento existe
    if (select && document.getElementById('selectMunicipio')) {
      select.value = "ENVIGADO";
      // Obtener geometría y hacer fitBounds
      await actualizarMunicipio("ENVIGADO");
    }

    await new Promise(resolve => setTimeout(resolve, 300));

  } catch (error) {
    console.error("❌ Error al cargar municipios:", error);
  }
}

async function obtenerGeometriaMunicipio(nombre) {
  try {
    const response = await fetch(`/api/giotrends/dinamico/municipios/${encodeURIComponent(nombre)}`);
    const data = await response.json();
    return data.geometry;
  } catch (error) {
    console.error("❌ Error al obtener la geometría del municipio:", error);
    return null;
  }
}

async function actualizarMunicipio(nombreMunicipio) {
  if (!nombreMunicipio) return;

  const geometria = await obtenerGeometriaMunicipio(nombreMunicipio);
  if (!geometria) return;
  ultimaGeometriaMunicipio = geometria;

  const envelope = turf.envelope(geometria);
  const bbox = turf.bbox(envelope);
  map.fitBounds(bbox, { padding: 40, duration: 1000 });

  // Cargar datos desde el endpoint por municipio
  try {
    const response = await fetch(`/api/giotrends/dinamico/puntos/${encodeURIComponent(nombreMunicipio)}`);
    const data = await response.json();

    datosOriginales = data.features
      .filter(f => f.geometry && f.geometry.type === "Point")
      .map(f => ({
        ...f,
        originalSumTotal: parseFloat(f.properties.sumTotal),
        originalPrincipal: parseFloat(f.properties.principal),
        originalAutopista: parseFloat(f.properties.autopista),
        originalServicio: parseFloat(f.properties.servicio),
        originalMenor: parseFloat(f.properties.menor),
        originalColectora: parseFloat(f.properties.colectora)
      }));

    console.log("📉 Total puntos cargados desde API:", datosOriginales.length);
  } catch (error) {
    console.error('❌ Error al cargar puntos desde API:', error);
    return;
  }

  const factores = {
    principal: parseFloat(document.getElementById('slider-principal').value) / 100,
    autopista: parseFloat(document.getElementById('slider-autopista').value) / 100,
    servicio: parseFloat(document.getElementById('slider-servicio').value) / 100,
    menor: parseFloat(document.getElementById('slider-menor').value) / 100,
    colectora: parseFloat(document.getElementById('slider-colectora').value) / 100
  };

  const datosFiltrados = filtrarYRecalcularEnergia(geometria, factores);

  if (map.getSource('ruido')) {
    map.getSource('ruido').setData(datosFiltrados);
  } else {
    map.addSource('ruido', {
      type: 'geojson',
      data: datosFiltrados
    });

    map.addLayer({
      id: 'puntos-ruido',
      type: 'circle',
      source: 'ruido',
      paint: {
        'circle-radius': 4,
        'circle-color': [
          'step', ['get', 'sumTotal'],
          colorRamp[0][1],  // -99 hasta <35 transparente
          35, colorRamp[1][1],
          40, colorRamp[2][1],
          45, colorRamp[3][1],
          50, colorRamp[4][1],
          55, colorRamp[5][1],
          60, colorRamp[6][1],
          65, colorRamp[7][1],
          70, colorRamp[8][1],
          75, colorRamp[9][1],
          80, colorRamp[10][1]
        ],
        'circle-opacity': 0.7
      }
    });
  }

  // Restablecer sliders a 100% cada vez que se cambia de municipio
  const aplicarAjustes = document.getElementById('activarSliders')?.checked;

  componentes.forEach(componente => {
    const slider = document.getElementById(`slider-${componente}`);
    const label = document.getElementById(`label-${componente}`);
    if (slider && label) {
      slider.value = 100;
      label.textContent = '100';
    }
  });

  slidersComponente.forEach(slider => {
    slider.disabled = !aplicarAjustes;
  });
  const resetBtn = document.getElementById('resetSliders');
  if (resetBtn) resetBtn.disabled = !aplicarAjustes;

  // --- Añadir capa de puntos de sensores monitoreo con icono ---
  // Eliminado: carga de imágenes externas y capas de icono para sensores de monitoreo.
}

map.on('load', () => {
  toggleSidebar('left');
  cargarMunicipios();
  // Llamar a la función para cargar y mostrar las isocurvas generadas desde el backend
  //cargarIsocurvasGeneradas();

  const activarCheckbox = document.getElementById('activarSliders');
  if (activarCheckbox && !activarCheckbox.checked) {
    slidersComponente.forEach(slider => {
      slider.disabled = true;
    });
    document.getElementById('resetSliders').disabled = true;
  }

  document.getElementById('selectMunicipio').addEventListener('change', (e) => {
    actualizarMunicipio(e.target.value);
     // cargarIsocurvasGeneradas();
  });

  document.getElementById('resetSliders').addEventListener('click', () => {
    componentes.forEach(componente => {
      const slider = document.getElementById(`slider-${componente}`);
      const label = document.getElementById(`label-${componente}`);
      slider.value = 100;
      label.textContent = '100';
    });
    if (document.getElementById('activarSliders')?.checked) {
      actualizarEnergiaAjustada();
    }
  });

  document.getElementById('activarSliders')?.addEventListener('change', (e) => {
    const activar = e.target.checked;
    slidersComponente.forEach(slider => {
      slider.disabled = !activar;
    });
    const resetBtn = document.getElementById('resetSliders');
    if (resetBtn) resetBtn.disabled = !activar;

    if (activar) {
      actualizarEnergiaAjustada();
    } else {
      restaurarDatosOriginales();
    }
  });

  agregarEdificios3D();

  // 🔧 Verificar y asignar evento al checkbox de puntos históricos
  setTimeout(() => {
    const toggleHistoricos = document.getElementById('toggleHistoricos');
    if (toggleHistoricos) {
      console.log("✅ Checkbox 'toggleHistoricos' encontrado");
      toggleHistoricos.addEventListener('change', (e) => {
        if (e.target.checked) {
          console.log("🟩 Checkbox activado: cargando puntos históricos...");
          cargarPuntosHistoricos();
        } else {
          console.log("🟥 Checkbox desactivado: removiendo puntos históricos...");
          if (typeof marcadoresHistoricos !== 'undefined') {
            marcadoresHistoricos.forEach(m => m.remove());
          } else {
            console.warn("⚠️ marcadoresHistoricos no está definido.");
          }
        }
      });
    } else {
      console.error("❌ No se encontró el checkbox con id 'toggleHistoricos'");
    }
  }, 500); // Esperar medio segundo para asegurar que el DOM esté listo
});

document.getElementById('mapStyleSelector').addEventListener('change', (e) => {
  const selected = e.target.value;
  map.setStyle(mapStyles[selected]);
  map.once('style.load', () => {
    agregarEdificios3D();
  });
});

function agregarEdificios3D() {
  const MAPTILER_KEY = 'h7IIJ3zZQqwvoK5gk5z9';

  map.addSource('openmaptiles', {
    url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`,
    type: 'vector',
  });

  const layers = map.getStyle().layers;
  let labelLayerId = null;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === 'symbol' && layers[i].layout?.['text-field']) {
      labelLayerId = layers[i].id;
      break;
    }
  }

  map.addLayer({
    id: '3d-buildings',
    source: 'openmaptiles',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 15,
    filter: ['!=', ['get', 'hide_3d'], true],
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        ['get', 'render_height'],
        0, 'lightgray',
        200, 'royalblue',
        400, 'lightblue'
      ],
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15, 0,
        16, ['get', 'render_height']
      ],
      'fill-extrusion-base': [
        'case',
        ['>=', ['get', 'zoom'], 16],
        ['get', 'render_min_height'],
        0
      ]
    }
  }, labelLayerId);
}

let datosOriginales = [];

async function cargarDatosDesdeJSON() {
  try {
    const response = await fetch('/data/AMVA.json');
    const data = await response.json();

    console.log("📉 Total puntos cargados desde JSON:", data.features.length);

    datosOriginales = data.features
      .filter(f => f.geometry && f.geometry.type === "Point")
      .map(f => ({
        ...f,
        originalSumTotal: parseFloat(f.properties.sumTotal),
        originalPrincipal: parseFloat(f.properties.principal),
        originalAutopista: parseFloat(f.properties.autopista),
        originalServicio: parseFloat(f.properties.servicio),
        originalMenor: parseFloat(f.properties.menor),
        originalColectora: parseFloat(f.properties.colectora)
      }));

    // Esperar selección de municipio para activar renderizado
    console.log("ℹ️ Datos JSON cargados, esperando selección de municipio.");

  } catch (error) {
    console.error('❌ Error al cargar el archivo JSON de ruido:', error);
  }
}

function actualizarCapaConOffset(offset) {
  const datosAjustados = {
    type: "FeatureCollection",
    features: datosOriginales.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        sumTotal: f.originalSumTotal
      }
    }))
  };

  if (map.getSource('ruido')) {
    map.getSource('ruido').setData(datosAjustados);
  } else {
    map.addSource('ruido', {
      type: 'geojson',
      data: datosAjustados
    });

    map.addLayer({
      id: 'puntos-ruido',
      type: 'circle',
      source: 'ruido',
      paint: {
        'circle-radius': 4,
        'circle-color': [
          'step', ['get', 'sumTotal'],
          colorRamp[0][1],
          35, colorRamp[1][1],
          40, colorRamp[2][1],
          45, colorRamp[3][1],
          50, colorRamp[4][1],
          55, colorRamp[5][1],
          60, colorRamp[6][1],
          65, colorRamp[7][1],
          70, colorRamp[8][1],
          75, colorRamp[9][1],
          80, colorRamp[10][1]
        ],
        'circle-opacity': 0.7
      }
    });
    console.log("✅ capa de puntos añadida");
  }
}

function actualizarEnergiaAjustada() {
  const aplicarAjustes = document.getElementById('activarSliders')?.checked;
  if (!aplicarAjustes) return;

  if (!datosOriginales.length) return;

  if (!ultimaGeometriaMunicipio) return;

  const factores = {
    principal: parseFloat(document.getElementById('slider-principal').value) / 100,
    autopista: parseFloat(document.getElementById('slider-autopista').value) / 100,
    servicio: parseFloat(document.getElementById('slider-servicio').value) / 100,
    menor: parseFloat(document.getElementById('slider-menor').value) / 100,
    colectora: parseFloat(document.getElementById('slider-colectora').value) / 100
  };

  const datosFiltrados = filtrarYRecalcularEnergia(ultimaGeometriaMunicipio, factores);

  if (map.getSource('ruido')) {
    map.getSource('ruido').setData(datosFiltrados);

    map.on('click', 'puntos-ruido', function (e) {
      const props = e.features[0].properties;
      const contenido = `
        <strong>ID:</strong> ${props.id_rec}<br>
        <strong>SumTotal:</strong> ${parseFloat(props.sumTotal).toFixed(2)}<br>
        <strong>Principal:</strong> ${parseFloat(props.principal).toFixed(2)}<br>
        <strong>Servicio:</strong> ${parseFloat(props.servicio).toFixed(2)}
      `;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(contenido)
        .addTo(map);
    });

    map.on('mouseenter', 'puntos-ruido', function () {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'puntos-ruido', function () {
      map.getCanvas().style.cursor = '';
    });
  }
}

function restaurarDatosOriginales() {
  if (!datosOriginales.length) return;

  const datosRestaurados = {
    type: "FeatureCollection",
    features: datosOriginales.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        sumTotal: f.properties.sum_total ? parseFloat(f.properties.sum_total) : parseFloat(f.originalSumTotal)
      }
    }))
  };

  if (map.getSource('ruido')) {
    map.getSource('ruido').setData(datosRestaurados);

    map.on('click', 'puntos-ruido', function (e) {
      const props = e.features[0].properties;
      const contenido = `
        <strong>ID:</strong> ${props.id_rec}<br>
        <strong>SumTotal:</strong> ${parseFloat(props.sumTotal).toFixed(2)}<br>
        <strong>Principal:</strong> ${parseFloat(props.principal).toFixed(2)}<br>
        <strong>Servicio:</strong> ${parseFloat(props.servicio).toFixed(2)}
      `;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(contenido)
        .addTo(map);
    });

    map.on('mouseenter', 'puntos-ruido', function () {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'puntos-ruido', function () {
      map.getCanvas().style.cursor = '';
    });
  }
}
// --- Puntos Históricos (LAeq) ---
let marcadoresHistoricos = [];

function cargarPuntosHistoricos() {
  console.log('🟡 Cargando puntos históricos...');

  fetch('/api/giotrends/mapa/data')
    .then(response => response.json())
    .then(data => {
      console.log('🟢 Puntos históricos cargados:', data.length);
      marcadoresHistoricos.forEach(m => m.remove());
      marcadoresHistoricos = [];

      data.forEach(sensor => {
        const { longitude, latitude, sensor_name, municipio, barrio, laeq_slow, timestamp, id } = sensor;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <strong>${sensor_name}</strong><br>
          <em>${barrio}, ${municipio}</em><br>
          LAeq: ${laeq_slow} dB<br>
          <small>${new Date(timestamp).toLocaleString('es-CO', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</small>
        `);

        const el = document.createElement('div');
        el.className = 'custom-marker';

        const spanMain = document.createElement('span');
        spanMain.className = 'marker-value';
        spanMain.textContent = parseFloat(laeq_slow).toFixed(1);

        const spanUnit = document.createElement('span');
        spanUnit.className = 'marker-unit';
        spanUnit.textContent = 'dBA';

        el.appendChild(spanMain);
        el.appendChild(spanUnit);

        const dB = parseFloat(laeq_slow);
        let color = '#025159';
        if (dB < 55) {
          color = '#2b9348';
        } else if (dB < 65) {
          color = '#ffdd57';
        } else if (dB < 75) {
          color = '#f8961e';
        } else {
          color = '#ef233c';
        }

        el.style.setProperty('--marker-color', color);

        el.addEventListener('click', (evt) => {
          evt.stopPropagation();
          showWeeklyHistoryPanel(sensor.id || sensor.sensor_id);
          const rightSidebar = document.getElementById('right');
          if (rightSidebar.classList.contains('collapsed')) {
            toggleSidebar('right');
          }
        });

        const marcador = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);

        marcadoresHistoricos.push(marcador);
      });
    })
    .catch(error => {
      console.error('❌ Error al cargar puntos históricos:', error);
    });
}
function cargarIsocurvasGeneradas() {
  const municipio = document.getElementById('selectMunicipio').value;

  if (!municipio || municipio === "Todos") {
    console.warn("⚠️ No se ha seleccionado un municipio válido para generar isocurvas.");
    return;
  }

  fetch(`/api/giotrends/dinamico/isocurvas/${encodeURIComponent(municipio)}`)
  .then(res => res.json())
  .then(data => {
    if (map.getSource('isocurvas')) {
      map.getSource('isocurvas').setData(data);
    } else {
      map.addSource('isocurvas', {
        type: 'geojson',
        data: data
      });

      map.addLayer({
        id: 'isocurvas-fill',
        type: 'fill',
        source: 'isocurvas',
        paint: {
          'fill-color': [
            'step',
            ['get', 'valor'],
            'rgba(255,255,255,0)', 30,
            '#a1d99b', 35,
            '#31a354', 40,
            '#006d2c', 45,
            '#fee391', 50,
            '#fec44f', 55,
            '#fe9929', 60,
            '#ef3b2c', 65,
            '#f768a1', 70,
            '#74c476', 75,
            '#0570b0', 80,
            '#08306b'
          ],
          'fill-opacity': 0.6
        }
      });
    }
  })
  .catch(err => {
    console.error("❌ Error cargando isocurvas:", err.message);
  });
}