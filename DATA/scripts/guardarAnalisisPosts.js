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

async function guardarAnalisis() {
  const rawData = fs.readFileSync('DATA/Zenu_Ranchera/Resultados_Analisis_Completo_Combinado_comentarios.json', 'utf8');
  const analisisArray = JSON.parse(rawData); // ✅ esto es un array plano

  let insertados = 0;
  let errores = 0;

  for (const item of analisisArray) {
    const { post_info, analysis } = item;

    if (!post_info?.post_id) {
      console.warn('⚠️ post_id no definido, se omite registro:', post_info);
      errores++;
      continue;
    }

    const query = `
      INSERT INTO zenu_social_listening.analisis_instagram_posts (
        post_id, caption, likes, comments_count, hashtags, timestamp,
        sentiment, top_keywords, top_emojis, engagement_score, summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (post_id) DO NOTHING;
    `;

    const values = [
      post_info.post_id,
      post_info.caption,
      post_info.likes,
      post_info.comments_count,
      post_info.hashtags || [],
      post_info.timestamp,
      analysis?.sentiment || null,
      analysis?.top_keywords || [],
      analysis?.top_emojis || [],
      analysis?.engagement_score || 0,
      analysis?.summary || null
    ];

    try {
      await pool.query(query, values);
      insertados++;
    } catch (error) {
      console.error(`❌ Error insertando post_id ${post_info.post_id}:`, error.message);
      errores++;
    }
  }

  console.log(`✅ Análisis insertados: ${insertados}`);
  console.log(`❌ Errores al insertar: ${errores}`);
  pool.end();
}

guardarAnalisis();