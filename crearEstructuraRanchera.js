const fs = require('fs');
const path = require('path');

const estructura = {
  'public/css/ranchera': [
    'dashboard.css',
    'perfiles.css',
    'publicaciones.css',
    'comentarios.css',
    'segmentos.css',
    'insights.css'
  ],
  'public/js/ranchera': [
    'main.js',
    'dashboard.js',
    'perfiles.js',
    'publicaciones.js',
    'comentarios.js',
    'segmentos.js',
    'insights.js'
  ],
  'public/js/ranchera/utils': [
    'charts.js',
    'tables.js',
    'helpers.js'
  ],
  'public/html/ranchera': [
    'index.html',
    'perfiles.html',
    'publicaciones.html',
    'comentarios.html',
    'segmentos.html',
    'insights.html'
  ],
  'public/assets/ranchera/logos': [],
  'public/assets/ranchera/iconos': [],
  'public/assets/ranchera/imagenes campaña': []
};

for (const carpeta in estructura) {
  const ruta = path.join(__dirname, carpeta);
  fs.mkdirSync(ruta, { recursive: true });
  estructura[carpeta].forEach(archivo => {
    const rutaArchivo = path.join(ruta, archivo);
    fs.writeFileSync(rutaArchivo, '');
    console.log('✅ Creado:', rutaArchivo);
  });
}