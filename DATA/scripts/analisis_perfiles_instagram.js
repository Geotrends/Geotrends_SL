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

async function guardarAnalisisPerfiles() {
  const rawData = fs.readFileSync('DATA/Zenu_Ranchera/Resultados_Descripcion_Analisis_API_Seguidores_Publicos_Ranchera.json', 'utf8');
  const perfiles = JSON.parse(rawData);

  let insertados = 0;
  let errores = 0;

  for (const item of perfiles) {
    const { profile_info, ai_analysis } = item;
    const { emoji_analysis, sentiment_analysis, advanced_analysis } = ai_analysis;

    const query = `
      INSERT INTO zenu_social_listening.analisis_perfiles_instagram (
        username, followers, is_business, biography,
        total_emojis, unique_emojis, most_common, emoji_density,
        sentiment, sentiment_score_positive, sentiment_score_negative,
        keywords, interpretation, advanced_analysis
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14)
      ON CONFLICT (username) DO NOTHING;
    `;

    const values = [
      profile_info.username,
      profile_info.followers,
      profile_info.is_business,
      profile_info.biography,
      emoji_analysis.total_emojis,
      emoji_analysis.unique_emojis,
      JSON.stringify(emoji_analysis.most_common),
      emoji_analysis.emoji_density,
      sentiment_analysis.sentiment,
      sentiment_analysis.sentiment_score.positive,
      sentiment_analysis.sentiment_score.negative,
      sentiment_analysis.keywords || [],
      sentiment_analysis.interpretation,
      advanced_analysis
    ];

    try {
      await pool.query(query, values);
      insertados++;
    } catch (error) {
      console.error(`❌ Error insertando username ${profile_info.username}:`, error.message);
      errores++;
    }
  }

  console.log(`✅ Perfiles insertados: ${insertados}`);
  console.log(`❌ Errores al insertar: ${errores}`);
  pool.end();
}

guardarAnalisisPerfiles();