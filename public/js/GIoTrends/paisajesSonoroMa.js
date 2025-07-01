const mapStyles = {
  streets: "https://api.maptiler.com/maps/streets/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  basic: "https://api.maptiler.com/maps/basic-v2/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  bright: "https://api.maptiler.com/maps/bright-v2/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  hybrid: "https://api.maptiler.com/maps/hybrid/style.json?key=h7IIJ3zZQqwvoK5gk5z9",
  satellite: "https://api.maptiler.com/maps/satellite/style.json?key=h7IIJ3zZQqwvoK5gk5z9"
};

//const center = [-75.577, 6.244]; // Medellín
const center = [-75.5906, 6.1706]; // Envigado
const map = new maplibregl.Map({
  container: 'map',
  zoom: 12.5,
  center,
  pitch: 0,
  style: mapStyles.streets,
});


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


map.on('load', () => {
  toggleSidebar('left');

  // Cargar y desplegar los datos de paisaje sonoro desde el endpoint
  fetch('/api/giotrends/mapa/paisaje-sonoro')
    .then(res => res.json())
    .then(data => {
      map.addSource('paisajeSonoro', {
        type: 'geojson',
        data: data
      });

      map.addLayer({
        id: 'paisajeSonoroLayer',
        type: 'circle',
        source: 'paisajeSonoro',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3693b6',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      });

      map.on('click', 'paisajeSonoroLayer', (e) => {
        const props = e.features[0].properties;

        // ✅ Validar si el atributo contiene una URL de video embebido de YouTube
        const videoURL = props.url && props.url.includes("youtube.com/embed") ? props.url : null;

        // ✅ Construir el HTML del video, sin bordes, al inicio del popup
        const videoHTML = videoURL
          ? `<div style="margin:-10px -10px 10px -10px">
               <iframe width="100%" height="200" src="${videoURL}" frameborder="0" allowfullscreen style="border:none;"></iframe>
             </div>`
          : '';

        // ✅ Campos a mostrar en orden debajo del video
        const camposMostrar = ['municipio', 'nombre', 'tipo', 'descripcion'];
        const infoHTML = camposMostrar.map(key => {
          if (props[key]) {
            return `<strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${props[key]}`;
          }
          return '';
        }).join('<br>');

        // ✅ Estructura completa del popup usando clases CSS para ancho fijo y scroll
        const popupContent = `
          <div class="popup-sonoro">
            ${videoHTML}
            <div class="info-popup">${infoHTML}</div>
          </div>
        `;

        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map);

        // Centrar el mapa hacia el punto clicado para asegurar visibilidad del popup
        map.easeTo({
          center: e.lngLat,
          offset: [0, -100], // desplaza hacia arriba para dejar espacio al popup
          duration: 1000
        });
      });

      map.on('mouseenter', 'paisajeSonoroLayer', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'paisajeSonoroLayer', () => map.getCanvas().style.cursor = '');
    })
    .catch(err => console.error('Error al cargar paisaje sonoro:', err));
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
