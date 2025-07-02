
// Paleta de colores para rampas de color de ruido (para leyenda y mapa)

// Variable global para el mapa principal
let map;
const colorRamp = [
  [35, '#a1d99b'],
  [40, '#31a354'],
  [45, '#006d2c'],
  [50, '#fee391'],
  [55, '#fec44f'],
  [60, '#fe9929'],
  [65, '#ef3b2c'],
  [70, '#f768a1'],
  [75, '#74c476'],
  [80, '#0570b0'],
  [85, '#08306b']
];

// Generar expresión de estilo para 'fill-color' usando colorRamp
const colorSteps = ['step', ['get', 'ISOVALUE'],
  colorRamp[0][1], // <= 35
  35, colorRamp[1][1],
  40, colorRamp[2][1],
  45, colorRamp[3][1],
  50, colorRamp[4][1],
  55, colorRamp[5][1],
  60, colorRamp[6][1],
  65, colorRamp[7][1],
  70, colorRamp[8][1],
  75, colorRamp[9][1],
  80, colorRamp[10][1],
  999, colorRamp[10][1] // Asegura cobertura para ISOVALUE >= 80
];

// Puedes controlar el nivel de zoom mínimo en que se muestran los edificios 3D aquí:
const ZOOM_MIN_EDIFICIOS = 10;
// mapas.js
// export function inicializarVistaMapas() {
//   console.log("🔧 Inicializando vista: mapas");
//   // Aquí va la lógica específica de la vista
// }

console.log("Cargando mapasDinamicos.js");


function mostrar3D() {
  const map3dEl = document.getElementById('map3d');
  if (map3dEl) map3dEl.classList.remove('oculto');

  const MAPTILER_KEY = 'h7IIJ3zZQqwvoK5gk5z9';

  const estilos3D = {
    'maptiler-hybrid': `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
    'maptiler-satellite': `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
    'maptiler-streets': `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`,
    'maptiler-outdoor': `https://api.maptiler.com/maps/outdoor/style.json?key=${MAPTILER_KEY}`,
    'maptiler-topo': `https://api.maptiler.com/maps/topo/style.json?key=${MAPTILER_KEY}`,
    'maptiler-openstreetmap': `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_KEY}`
  };

  // Nueva lógica robusta para selección de estilo 3D
  let estiloBase3D = 'maptiler-hybrid'; // valor por defecto
  const selectControlInterno = document.getElementById('cambioEstilo3D');
  const selectControlExterno = document.getElementById('selectEstilo3D');
  if (selectControlInterno && selectControlInterno.value in estilos3D) {
    estiloBase3D = selectControlInterno.value;
  } else if (selectControlExterno && selectControlExterno.value in estilos3D) {
    estiloBase3D = selectControlExterno.value;
  }

  // Elimina el mapa existente si ya había uno, de forma segura
  if (window._mapLibreMap3D) {
    try {
      if (typeof window._mapLibreMap3D.remove === 'function') {
        window._mapLibreMap3D.remove();
      }
    } catch (e) {
      console.warn("Error al eliminar el mapa 3D anterior:", e);
    }
    const el = document.getElementById('map3d');
    if (el) el.innerHTML = '';
  }

  const ubicacion = window._ubicacion3D || { center: [-75.57, 6.25], zoom: 15 };
  map = new maplibregl.Map({
    container: 'map3d',
    zoom: ubicacion.zoom,
    center: ubicacion.center,
    pitch: 70,
    maxPitch: 85
  });

  // Crear contenedor dentro del mapa
  const controlCapas = document.createElement('div');
  controlCapas.id = 'control-capas';
  controlCapas.innerHTML = `
    <button id="toggleCapasBtn" style="width:100%;margin-bottom:5px;font-weight:bold;">Capas</button>
    <div id="contenidoCapas" style="display:none;">
      <label><input type="checkbox" value="3d-buildings" checked> Edificios 3D</label><br>
      <label><input type="checkbox" value="parques" checked> Parques</label><br>
      <label><input type="checkbox" value="agua" checked> Agua</label><br>
      <label><input type="checkbox" value="limites" checked> Límites</label><br>
      <label><input type="checkbox" value="pistas-aereas" checked> Pistas Aéreas</label><br>
      <label><input type="checkbox" value="vias-superior" checked> Vías</label>
    </div>
  `;
  controlCapas.style.position = 'absolute';
  controlCapas.style.top = '10px';
  controlCapas.style.left = '10px';
  controlCapas.style.backgroundColor = 'white';
  controlCapas.style.padding = '10px';
  controlCapas.style.zIndex = '1000';
  controlCapas.style.maxHeight = 'calc(100% - 20px)';
  controlCapas.style.overflowY = 'auto';
  map.getContainer().appendChild(controlCapas);

  // --- Hacer el panel de capas colapsable ---
  const toggleBtn = controlCapas.querySelector('#toggleCapasBtn');
  const contenidoCapas = controlCapas.querySelector('#contenidoCapas');
  toggleBtn.addEventListener('click', () => {
    const visible = contenidoCapas.style.display === 'block';
    contenidoCapas.style.display = visible ? 'none' : 'block';
  });

  // --- Selector múltiple plegable para capas adicionales ---


  function capaSeleccionada(id) {
    const checkbox = document.querySelector(`#control-capas input[value="${id}"]`);
    return checkbox && checkbox.checked;
  }

  map.setZoom(15); // Zoom inicial más alto
  map.on('zoom', () => {
    // console.log('🔍 Nivel de zoom actual:', map.getZoom());
  });

  // --- Control de estilo dentro del mapa ---
  const controlEstilo = {
    onAdd: function(map) {
      const div = document.createElement('div');
      div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      div.innerHTML = `
        <select id="cambioEstilo3D" title="Cambiar estilo">
          <option value="maptiler-hybrid">Híbrido</option>
          <option value="maptiler-satellite">Satélite</option>
          <option value="maptiler-streets">Calles</option>
          <option value="maptiler-outdoor">Outdoor</option>
          <option value="maptiler-topo">Topográfico</option>
          <option value="maptiler-openstreetmap">OpenStreetMap</option>
        </select>
      `;
      // Asignar valor inicial correcto al <select> si coincide con estiloBase3D
      div.querySelector('select').value = estiloBase3D;

      div.querySelector('select').addEventListener('change', (e) => {
        const nuevoEstilo = e.target.value;
        console.log('🔄 Cambiando estilo a:', nuevoEstilo);
        const selectEstiloDOM = document.getElementById('selectEstilo3D');
        if (selectEstiloDOM) {
          selectEstiloDOM.value = nuevoEstilo;
        }
        if (window._mapLibreMap3D && typeof window._mapLibreMap3D.remove === 'function') {
          try {
            window._mapLibreMap3D.remove();
          } catch (error) {
            console.error("Error al eliminar el mapa 3D anterior:", error);
          }
        }
        const el = document.getElementById('map3d');
        if (el) el.innerHTML = '';
        setTimeout(() => {
          const currentCenter = map.getCenter();
          const currentZoom = map.getZoom();
          window._mapLibreMap3D = null; // Forzar reinicialización
          mostrar3DConUbicacion(currentCenter, currentZoom);
        }, 100);
      });

      return div;
    },
    onRemove: function(map) {
      // No es necesario limpieza adicional
    }
  };

  map.addControl(controlEstilo, 'top-right');

  map.on('styleimagemissing', function(e) {
    console.warn(`🖼 Imagen faltante detectada: "${e.id}"`);
  });

  map.setStyle(estilos3D[estiloBase3D], {
    transformStyle: (previousStyle, nextStyle) => {
      nextStyle.projection = { type: 'globe' };
      nextStyle.sources = {
        ...nextStyle.sources,
        terrainSource: {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
          tileSize: 256
        },
        hillshadeSource: {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
          tileSize: 256
        }
      };

      nextStyle.terrain = {
        source: 'terrainSource',
        exaggeration: 1
      };

      nextStyle.sky = {
        'atmosphere-blend': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          2, 0
        ]
      };

      nextStyle.layers.push({
        id: 'hills',
        type: 'hillshade',
        source: 'hillshadeSource',
        layout: { visibility: 'visible' },
        paint: { 'hillshade-shadow-color': '#473B24' }
      });

      return nextStyle;
    }
  });

  map.addControl(new maplibregl.NavigationControl({
    visualizePitch: true,
    showZoom: true,
    showCompass: true
  }));
  map.addControl(
    new maplibregl.TerrainControl({
      source: 'terrainSource',
      exaggeration: 1
    }),
    'top-right'
  );
  // --- Agregar capa GeoJSON de zonas de ruido ---
  map.on('load', () => {
    // Fuente GeoJSON
    map.addSource('zonas-ruido', {
      type: 'geojson',
      data: '/data/vias.geojson'
    });

    // Capa de relleno, solo aplicar si ISOVALUE no es null
    map.addLayer({
      id: 'zonas-ruido-fill',
      type: 'fill',
      source: 'zonas-ruido',
      layout: {},
      paint: {
        'fill-color': colorSteps,
        'fill-opacity': [
          'case',
          ['!=', ['get', 'ISOVALUE'], null], 0.8,
          0
        ]
      },
      filter: ['!=', ['get', 'ISOVALUE'], null]
    });

    // --- Popups y cursor para la capa de polígonos de ruido ---
    // Popup al hacer clic en la capa de polígonos
    map.on('click', 'zonas-ruido-fill', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['zonas-ruido-fill']
      });

      if (!features.length) return;

      const feature = features[0];
      // ISOVALUE puede ser null o undefined en algunos casos
      const isuvalue = feature.properties.ISOVALUE;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>ISU:</strong> ${isuvalue !== null && isuvalue !== undefined ? isuvalue : 'Sin dato'}`)
        .addTo(map);
    });

    // Cambiar el cursor cuando se pasa por encima
    map.on('mouseenter', 'zonas-ruido-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'zonas-ruido-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    // --- Leyenda fija para zonas de ruido ---
    // Crear contenedor de leyenda
    const legendContainer = document.createElement('div');
    legendContainer.id = 'leyendaRuido';
    legendContainer.style.position = 'absolute';
    legendContainer.style.bottom = '50px';
    legendContainer.style.right = '10px';
    legendContainer.style.background = 'white';
    legendContainer.style.padding = '10px';
    legendContainer.style.borderRadius = '4px';
    legendContainer.style.fontSize = '12px';
    legendContainer.style.boxShadow = '0 0 6px rgba(0,0,0,0.2)';
    legendContainer.style.zIndex = '1000';
    legendContainer.style.opacity = '0.7';
    legendContainer.style.transition = 'opacity 0.3s ease';
    legendContainer.style.pointerEvents = 'auto';

    const leyendaValores = colorRamp.map((item, index) => {
      const valorInicio = item[0];
      const valorFin = colorRamp[index + 1]?.[0];
      const rango = index === colorRamp.length - 1
        ? `> ${valorInicio}`
        : `${valorInicio} <= ... < ${valorFin}`;
      return {
        rango,
        color: item[1]
      };
    });

    legendContainer.innerHTML = '<strong> LAeq (dBA)</strong><br>';
    leyendaValores.forEach(({ rango, color }) => {
      const item = document.createElement('div');
      item.innerHTML = `
        <span style="display:inline-block;width:12px;height:12px;background:${color};margin-right:6px;"></span>${rango}
      `;
      legendContainer.appendChild(item);
    });

    legendContainer.addEventListener('mouseenter', () => {
      legendContainer.style.opacity = '1';
    });
    legendContainer.addEventListener('mouseleave', () => {
      legendContainer.style.opacity = '0.7';
    });
    legendContainer.addEventListener('click', () => {
      legendContainer.style.opacity = '1';
    });

    map.getContainer().appendChild(legendContainer);

    // Activar edificios 3D si están disponibles en el estilo
    const edificios3D = map.getStyle().layers.find(layer => layer.id === '3d-buildings');
    if (edificios3D) {
      map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0.9);
      map.setLayerZoomRange('3d-buildings', 0, 24); // Mostrar edificios en todos los niveles de zoom
      console.log('🏙️ Edificios 3D activados');
    } else {
      console.warn('⚠️ Capa de edificios 3D no disponible en este estilo.');
    }

    // Fuente vectorial para edificios desde OpenMapTiles
    try {
      map.addSource('openmaptiles', {
        url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`,
        type: 'vector',
      });

      // Capa de extrusión 3D de edificios, coloreada en gris claro con altura fija
      if (capaSeleccionada('3d-buildings')) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 0,
            filter: ['!=', ['get', 'hide_3d'], true],
            paint: {
              'fill-extrusion-color': '#cccccc',
              'fill-extrusion-height': [
                'case',
                ['all',
                  ['has', 'render_height'],
                  ['!=', ['get', 'render_height'], null]
                ],
                ['get', 'render_height'],
                0
              ],
              'fill-extrusion-base': [
                'case',
                ['all',
                  ['has', 'render_min_height'],
                  ['!=', ['get', 'render_min_height'], null]
                ],
                ['get', 'render_min_height'],
                0
              ],
              'fill-extrusion-opacity': 0.85
            }
          }
        );
      }

      // Agua
      if (capaSeleccionada('agua')) {
        map.addLayer({
          id: 'agua',
          type: 'fill',
          source: 'openmaptiles',
          'source-layer': 'water',
          paint: {
            'fill-color': '#a0c8f0',
            'fill-opacity': 0.9
          }
        });
      }

      // Parques
      if (capaSeleccionada('parques')) {
        map.addLayer({
          id: 'parques',
          type: 'fill',
          source: 'openmaptiles',
          'source-layer': 'park',
          paint: {
            'fill-color': '#b0e298',
            'fill-opacity': 0.6
          }
        });
      }


      // Límites administrativos
      if (capaSeleccionada('limites')) {
        map.addLayer({
          id: 'limites',
          type: 'line',
          source: 'openmaptiles',
          'source-layer': 'boundary',
          paint: {
            'line-color': '#888',
            'line-width': 1,
            'line-dasharray': [2, 2]
          }
        });
      }


      // Pistas aéreas
      if (capaSeleccionada('pistas-aereas')) {
        map.addLayer({
          id: 'pistas-aereas',
          type: 'fill',
          source: 'openmaptiles',
          'source-layer': 'aeroway',
          paint: {
            'fill-color': '#f0e0e0',
            'fill-opacity': 0.5
          }
        });
      }


      // Añadir capa para superponer las vías sobre el mapa
      if (capaSeleccionada('vias-superior')) {
        map.addLayer({
          id: 'vias-superior',
          type: 'line',
          source: 'openmaptiles',
          'source-layer': 'transportation',
          paint: {
            'line-color': '#222',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              10, 0.5,
              16, 2.0
            ]
          }
        }, map.getLayer('3d-buildings') ? '3d-buildings' : undefined);
      }

      console.log('✅ Edificios 3D cargados correctamente.');
    } catch (error) {
      console.warn('⚠️ No se pudo cargar la capa de edificios 3D:', error);
    }

    document.querySelectorAll('#control-capas input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const layerId = e.target.value;
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', e.target.checked ? 'visible' : 'none');
        }
      });
    });
  });

  window._mapLibreMap3D = map;

  // Agregar listener para el selectEstilo3D si existe en el DOM
  // (Al cambiar el select externo, reconstruir el mapa 3D respetando el nuevo valor)
  const selectEstilo3D = document.getElementById('selectEstilo3D');
  if (selectEstilo3D) {
    selectEstilo3D.addEventListener('change', function (e) {
      const estiloSeleccionado = e.target.value;
      if (!estiloSeleccionado || !estilos3D[estiloSeleccionado]) {
        console.warn('Estilo no válido:', estiloSeleccionado);
        return;
      }
      // Al cambiar el select externo, simplemente llamar a mostrar3D() para que la lógica de selección se aplique
      mostrar3D();
    });
  } else {
    console.warn('⚠️ Selector de estilo 3D con id "selectEstilo3D" no encontrado en el DOM.');
  }
}

function mostrar3DConUbicacion(center, zoom) {
  const map3dEl = document.getElementById('map3d');
  if (map3dEl) map3dEl.classList.remove('oculto');
  // Guardar ubicación globalmente para reutilizarla si es necesario
  window._ubicacion3D = { center, zoom };
  // El resto de lógica puede seguir aquí, o puedes invocar mostrar3D si quieres mantener el resto del flujo
  mostrar3D();
  // --- Alternar terreno ---
  // Eliminado toggle-terrain porque el botón ya no existe por defecto
}

window.mostrar3D = mostrar3D;

document.addEventListener('DOMContentLoaded', () => {
  window.mostrar3D();
  const selectEstilo = document.getElementById('estiloSelect');
  if (selectEstilo) {
    selectEstilo.addEventListener('change', () => {
      console.log("🔄 Cambio de estilo de mapa 3D:", selectEstilo.value);
      window.mostrar3D();
    });
  } else {
    // Solo advertir si realmente se espera que exista
    // console.warn("⚠️ Selector de estilo no encontrado en el DOM.");
  }
});