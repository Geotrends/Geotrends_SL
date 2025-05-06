const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Configuración PostgreSQL
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

const data = JSON.parse(fs.readFileSync('DATA/Zenu_Ranchera/Usuarios_Ranchera_General.json', 'utf-8'));

let actualizados = 0;
let omitidos = 0;
let errores = 0;

(async () => {
  for (const row of data) {
    try {
      const result = await pool.query(
        `
        UPDATE zenu_social_listening.perfiles_instagram
        SET
          fullname = $1,
          biography = $2,
          external_url = $3,
          is_verified = $4,
          is_business = $5,
          avatar = $6,
          avatar_hd = $7,
          private = $8,
          joined_recently = $9,
          business_category_name = $10,
          highlight_reel_count = $11,
          igtv_video_count = $12,
          follower_count = $13,
          following_count = $14,
          media_count = $15
        WHERE username = $16
        `,
        [
          row.fullName,
          row.biography,
          row.externalUrls?.[0] || null,
          row.verified,
          row.isBusinessAccount,
          row.profilePicUrl,
          row.profilePicUrlHD,
          row.private,
          row.joinedRecently,
          row.businessCategoryName,
          row.highlightReelCount,
          row.igtvVideoCount,
          row.followersCount,
          row.followsCount,
          row.postsCount,
          row.username
        ]
      );

      if (result.rowCount === 1) {
        actualizados++;
      } else {
        omitidos++;
        console.warn(`⚠️ Usuario no encontrado: ${row.username}`);
      }
    } catch (err) {
      errores++;
      console.error(`❌ Error con ${row.username}:`, err.message);
    }
  }

  console.log(`✅ Proceso terminado`);
  console.log(`✔️ Registros actualizados: ${actualizados}`);
  console.log(`🔁 Registros omitidos (no encontrados): ${omitidos}`);
  console.log(`❌ Errores: ${errores}`);

  await pool.end();
})();