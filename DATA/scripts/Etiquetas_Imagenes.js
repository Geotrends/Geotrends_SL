const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function guardarEtiquetasImagenes() {
  const rawData = fs.readFileSync('DATA/Zenu_Ranchera/resultados_analisis_total_ranchera.json', 'utf8');
  const data = JSON.parse(rawData);

  let insertados = 0;
  let errores = 0;

  for (const [path, info] of Object.entries(data)) {
    const query = `
      INSERT INTO zenu_social_listening.etiquetas_imagenes_instagram (
        path, imagen, etiquetas, animales, comida, turismo, sonrisa,
        grupo_personas, perro, gato, niños, adultos, jovenes, deportes, moda
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (path) DO NOTHING;
    `;

    const values = [
      path,
      info.imagen,
      info.etiquetas || [],
      info.Animales || 0,
      info.Comida || 0,
      info.Turismo || 0,
      info.Sonrisa || 0,
      info["Grupo de Personas"] || 0,
      info.Perro || 0,
      info.Gato || 0,
      info.Niños || 0,
      info.Adultos || 0,
      info["Jóvenes"] || 0,
      info.Deportes || 0,
      info.Moda || 0
    ];

    try {
      await pool.query(query, values);
      insertados++;
    } catch (error) {
      console.error(`❌ Error insertando ${path}:`, error.message);
      errores++;
    }
  }

  console.log(`✅ Imágenes insertadas: ${insertados}`);
  console.log(`❌ Errores: ${errores}`);
  pool.end();
}

guardarEtiquetasImagenes();