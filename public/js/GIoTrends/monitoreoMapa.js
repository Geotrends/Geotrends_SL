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

  // Cargar puntos desde el endpoint y agregarlos al mapa
  fetch('/api/giotrends/mapa/data')
    .then(response => response.json())
    .then(data => {
      data.forEach(sensor => {
        const { longitude, latitude, sensor_name, municipio, barrio, laeq_slow, timestamp } = sensor;

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

        // Color del marcador según el nivel LAeq
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

        new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);
      });
    })
    .catch(error => {
      console.error('Error al cargar puntos del mapa:', error);
    });

  agregarEdificios3D();
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
