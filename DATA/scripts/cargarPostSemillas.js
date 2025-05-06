import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg'; const { Pool } = pkg;

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Ruta al archivo JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rutaJson = path.join(__dirname, '../semillas/ranchera_coms_semilla.json');

const datos = JSON.parse(fs.readFileSync(rutaJson, 'utf8'));

let total = datos.length;
let insertados = 0;
let duplicados = 0;
let errores = 0;

async function cargarPosts() {
  for (const post of datos) {
    try {
      const resultado = await pool.query(`
        INSERT INTO zenu_social_listening.instagram_posts (
          id, owner_username, type, shortcode, caption, url,
          display_url, alt, likes_count, comments_count,
          dimensions_width, dimensions_height, "timestamp",
          hashtags, mentions, fuente_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16
        ) ON CONFLICT DO NOTHING
        RETURNING id;
      `, [
        post.id,
        post.ownerUsername,
        post.type,
        post.shortCode,
        post.caption,
        post.url,
        post.displayUrl,
        post.alt,
        post.likesCount ?? 0,
        post.commentsCount ?? 0,
        post.dimensionsWidth ?? null,
        post.dimensionsHeight ?? null,
        post.timestamp,
        post.hashtags ?? [],
        post.mentions ?? [],
        9999 // ID de la fuente "Ranchera" o cambia según corresponda
      ]);

      if (resultado.rowCount > 0) {
        insertados++;
      } else {
        duplicados++;
      }
    } catch (error) {
      console.error(`❌ Error con post ${post.id}: ${error.message}`);
      errores++;
    }
  }

  console.log('✅ ¡Carga finalizada!');
  console.log('\n📊 Resumen de carga:');
  console.log(`📄 Total en JSON: ${total}`);
  console.log(`✔️ Insertados: ${insertados}`);
  console.log(`⚠️ Duplicados (ya existían): ${duplicados}`);
  console.log(`❌ Errores: ${errores}`);
  await pool.end();
}

cargarPosts();