const fs = require('fs');
const csv = require('csv-parser');
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

const FUENTE_ID = 0;

let fila = 0;
let exitosos = 0;
let duplicados = 0;
let errores = 0;
const tareas = []; // ← Lista de promesas

fs.createReadStream('DATA/Zenu_Ranchera/Seguidores_Ranchera_1500.csv')
  .pipe(csv())
  .on('data', (row) => {
    fila++;

    if (!row.Username || !row['Profile URL']) {
      console.warn(`Fila ${fila} omitida: falta Username o Profile URL.`);
      return;
    }

    const values = [
      row.Username,
      row.Fullname,
      row['Follower Count'] === '' ? null : parseInt(row['Follower Count']),
      row['Following Count'] === '' ? null : parseInt(row['Following Count']),
      row['Media Count'] === '' ? null : parseInt(row['Media Count']),
      row['Public Email'],
      row['Phone Number'],
      row['City Name'],
      row.Biography,
      row['External Url'],
      row['Is Verified'] === 'true',
      row['Is Business'] === 'true',
      row['Followed By Viewer'] === 'true',
      row['Profile URL'],
      row.Avatar,
      FUENTE_ID
    ];

    const query = `
      INSERT INTO zenu_social_listening.perfiles_instagram (
        username, fullname, follower_count, following_count, media_count,
        public_email, phone_number, city_name, biography,
        external_url, is_verified, is_business, followed_by_viewer,
        profile_url, avatar, fuente_id
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT (profile_url) DO UPDATE SET
        username = EXCLUDED.username,
        fullname = EXCLUDED.fullname,
        follower_count = EXCLUDED.follower_count,
        following_count = EXCLUDED.following_count,
        media_count = EXCLUDED.media_count,
        public_email = EXCLUDED.public_email,
        phone_number = EXCLUDED.phone_number,
        city_name = EXCLUDED.city_name,
        biography = EXCLUDED.biography,
        external_url = EXCLUDED.external_url,
        is_verified = EXCLUDED.is_verified,
        is_business = EXCLUDED.is_business,
        followed_by_viewer = EXCLUDED.followed_by_viewer,
        avatar = EXCLUDED.avatar,
        fuente_id = EXCLUDED.fuente_id
    `;

    // Guardamos la promesa
    const tarea = pool.query(query, values)
      .then(res => {
        if (res.rowCount === 1) exitosos++;
        else duplicados++;
      })
      .catch(err => {
        errores++;
        console.error(`❌ Error en fila ${fila}:`, err.message);
      });

    tareas.push(tarea);
  })
  .on('end', async () => {
    await Promise.all(tareas); // Esperar a que todas terminen
    console.log(`✅ CSV cargado exitosamente`);
    console.log(`✔️ Filas insertadas o actualizadas: ${exitosos}`);
    console.log(`🔁 Filas omitidas por datos iguales: ${duplicados}`);
    console.log(`⚠️ Filas con errores: ${errores}`);
    await pool.end();
  });