/**
 * Función recursiva para obtener todas las llaves de un JSON, incluyendo objetos anidados.
 * @param {Object} obj - El objeto JSON del cual se extraerán las llaves.
 * @param {string} prefijo - (Opcional) prefijo para representar la jerarquía de las llaves.
 * @returns {string[]} Lista de llaves completas.
 */
function obtenerLlaves(obj, prefijo = '') {
  let llaves = [];

  for (const clave in obj) {
    const valor = obj[clave];
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;

    llaves.push(ruta);

    if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
      llaves = llaves.concat(obtenerLlaves(valor, ruta));
    }
  }

  return llaves;
}

const fs = require('fs');
const path = require('path');

// Ruta al archivo JSON
const archivoJson = path.join(__dirname, '..', 'semillas', 'biografia_arquitecturausb_semilla.json');

// Leer el archivo y extraer llaves
fs.readFile(archivoJson, 'utf8', (err, data) => {
  if (err) {
    console.error('Error leyendo el archivo:', err);
    return;
  }

  try {
    const jsonData = JSON.parse(data);
    const llaves = obtenerLlaves(jsonData);
    console.log('Llaves encontradas:\n', llaves.join('\n'));
  } catch (parseError) {
    console.error('Error parseando el JSON:', parseError);
  }
});
