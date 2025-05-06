const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

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

const data = JSON.parse(fs.readFileSync('DATA/Zenu_Ranchera/Perfiles_Publicos_Ranchera_General.json', 'utf-8'));
const FUENTE_ID = 3;

let insertados = 0;
let errores = 0;

(async () => {
  for (const perfil of data) {
    const posts = perfil.latestPosts || [];

    for (const post of posts) {
      try {
        await pool.query(`
          INSERT INTO zenu_social_listening.instagram_posts (
            id, owner_username, type, shortcode, caption,
            url, display_url, alt, likes_count, comments_count,
            dimensions_width, dimensions_height, timestamp,
            hashtags, mentions, fuente_id
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16
          )
          ON CONFLICT (id) DO NOTHING
        `, [
          post.id,
          post.ownerUsername,
          post.type,
          post.shortCode,
          post.caption,
          post.url,
          post.displayUrl,
          post.alt,
          post.likesCount,
          post.commentsCount,
          post.dimensionsWidth,
          post.dimensionsHeight,
          post.timestamp,
          post.hashtags || [],
          post.mentions || [],
          FUENTE_ID
        ]);

        insertados++;
      } catch (err) {
        errores++;
        console.error(`❌ Error en post ${post.id}:`, err.message);
      }
    }
  }

  console.log(`✅ Proceso completado`);
  console.log(`✔️ Posts insertados: ${insertados}`);
  console.log(`❌ Errores: ${errores}`);
  await pool.end();
})();