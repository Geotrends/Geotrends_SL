const fs = require('fs');
const path = require('path');
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

const archivoJson = path.join(__dirname, '..', 'semillas', 'biografia_ranchera_semilla.json');

fs.readFile(archivoJson, 'utf8', async (err, data) => {
  if (err) {
    console.error('Error leyendo el archivo JSON:', err);
    return;
  }

  try {
    const perfiles = JSON.parse(data);

    for (const perfil of perfiles) {
      const query = `
        INSERT INTO zenu_social_listening.perfiles_semilla (
          id, input_url, username, url, full_name, biography,
          external_urls, external_url, external_url_shimmed,
          followers_count, follows_count, has_channel,
          highlight_reel_count, is_business_account, joined_recently,
          business_category_name, private, verified,
          profile_pic_url, profile_pic_url_hd,
          igtv_video_count, related_profiles, latest_igtv_videos,
          posts_count, latest_posts
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20,
          $21, $22, $23,
          $24, $25
        )
        ON CONFLICT (id) DO NOTHING;
      `;

      const valores = [
        perfil.id,
        perfil.inputUrl,
        perfil.username,
        perfil.url,
        perfil.fullName,
        perfil.biography,
        JSON.stringify(perfil.externalUrls || []),
        perfil.externalUrl,
        perfil.externalUrlShimmed,
        perfil.followersCount,
        perfil.followsCount,
        perfil.hasChannel,
        perfil.highlightReelCount,
        perfil.isBusinessAccount,
        perfil.joinedRecently,
        perfil.businessCategoryName,
        perfil.private,
        perfil.verified,
        perfil.profilePicUrl,
        perfil.profilePicUrlHD,
        perfil.igtvVideoCount,
        JSON.stringify(perfil.relatedProfiles || []),
        JSON.stringify(perfil.latestIgtvVideos || []),
        perfil.postsCount || null,
        JSON.stringify(perfil.latestPosts || [])
      ];

      try {
        await pool.query(query, valores);
        console.log(`✅ Insertado: ${perfil.username}`);
      } catch (e) {
        console.error(`❌ Error insertando ${perfil.username}:`, e.message);
      }
    }

    console.log('🚀 Todos los perfiles procesados.');
    process.exit(0);
  } catch (parseError) {
    console.error('Error parseando el JSON:', parseError);
  }
});