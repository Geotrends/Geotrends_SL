const fs = require('fs');
const path = require('path');

const estructura = {
  'public/css/GIoTrends': [
    'inicio.css',
    'monitoreo.css',
    'historicos.css',
    'analitica.css',
    'prediccion.css',
    'notificaciones.css',
    'configuracion.css',
    'soporte.css'
  ],
  'public/js/GIoTrends': [
    'inicio.js',
    'monitoreo.js',
    'historicos.js',
    'analitica.js',
    'prediccion.js',
    'notificaciones.js',
    'configuracion.js',
    'soporte.js'
  ],
  'public/html/GIoTrends': [
    'inicio.html',
    'monitoreo.html',
    'historicos.html',
    'analitica.html',
    'prediccion.html',
    'notificaciones.html',
    'configuracion.html',
    'soporte.html'
  ],
  'public/assets/GIoTrends/iconos': [],  // para íconos personalizados
  'public/assets/GIoTrends/imagenes': [] // si quieres usar imágenes asociadas a cada vista
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