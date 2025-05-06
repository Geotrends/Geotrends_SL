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

async function cargarComentarios() {
  const data = JSON.parse(fs.readFileSync('DATA/Zenu_Ranchera/Post_And_Comms_Perfiles_Publicos_Ranchera_Total.json', 'utf8'));
  let insertados = 0;
  let errores = 0;
  let duplicados = 0;

  console.log(`Cargando ${data.length} bloques de publicaciones...`);

  for (const grupoDePosts of data) {
    for (const post of grupoDePosts) {
      const postId = post.id;
      const comentarios = post.latestComments || [];

      // Inserta todos los comentarios del arreglo latestComments
      for (const comentario of comentarios) {
        const values = [
          comentario.id,
          postId,
          comentario.text,
          comentario.ownerUsername,
          comentario.ownerProfilePicUrl,
          comentario.timestamp,
          comentario.repliesCount || 0,
          comentario.likesCount || 0,
        ];

        const query = `
          INSERT INTO zenu_social_listening.comentarios_instagram (
            id, post_id, text, owner_username,
            owner_profile_pic_url, timestamp,
            replies_count, likes_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `;

        try {
          const res = await pool.query(query, values);
          if (res.rowCount > 0) insertados++;
          else duplicados++;
        } catch (error) {
          console.error(`❌ Error insertando comentario ${comentario.id}:`, error.message);
          errores++;
        }
      }

      // Insertar el firstComment si no está en latestComments
      const textoPrimero = post.firstComment?.trim();
      if (textoPrimero && !comentarios.some(c => c.text.trim() === textoPrimero)) {
        const fakeId = `${postId}_fc`;
        const values = [
          fakeId,
          postId,
          textoPrimero,
          post.ownerUsername || null,
          null, // No hay foto para firstComment si no está estructurado
          post.timestamp || null,
          0,
          0,
        ];

        const query = `
          INSERT INTO zenu_social_listening.comentarios_instagram (
            id, post_id, text, owner_username,
            owner_profile_pic_url, timestamp,
            replies_count, likes_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `;

        try {
          const res = await pool.query(query, values);
          if (res.rowCount > 0) insertados++;
          else duplicados++;
        } catch (error) {
          console.error(`❌ Error insertando firstComment ${fakeId}:`, error.message);
          errores++;
        }
      }
    }
  }

  console.log(`✅ Comentarios insertados: ${insertados}`);
  console.log(`⚠️ Comentarios duplicados (ya estaban): ${duplicados}`);
  console.log(`❌ Comentarios con error: ${errores}`);
  pool.end();
}

cargarComentarios();