const pool = require('../db/conexion');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

exports.obtenerResumenDashboard = async (req, res) => {
  try {
    const [semillas, perfiles, posts, comentarios, positivos] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM zenu_social_listening.perfiles_semilla'),
      pool.query('SELECT COUNT(*) FROM zenu_social_listening.perfiles_instagram'),
      pool.query('SELECT COUNT(*) FROM zenu_social_listening.instagram_posts'),
      pool.query('SELECT COUNT(*) FROM zenu_social_listening.comentarios_instagram'),
      pool.query("SELECT COUNT(*) FROM zenu_social_listening.analisis_instagram_posts WHERE sentiment = 'POSITIVO'")
    ]);

    const totalPosts = parseInt(posts.rows[0].count);
    const totalPositivos = parseInt(positivos.rows[0].count);
    const sentimientoPositivo = totalPosts > 0 ? `${Math.round((totalPositivos / totalPosts) * 100)}%` : "0%";

    res.json({
      semillas: parseInt(semillas.rows[0].count),
      perfiles: parseInt(perfiles.rows[0].count),
      publicaciones: totalPosts,
      comentarios: parseInt(comentarios.rows[0].count),
      sentimientoPositivo
    });
  } catch (error) {
    console.error('Error al obtener el resumen:', error);
    res.status(500).json({ error: 'Error al obtener el resumen del dashboard' });
  }
};

exports.obtenerEstadisticasSemilla = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT username,full_name, followers_count, follows_count, igtv_video_count, posts_count
      FROM zenu_social_listening.perfiles_semilla
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener estadísticas semilla:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas semilla' });
  }
};

exports.obtenerIndicadoresSemilla = async (req, res) => {
  try {
    const [top3, categorias, promedio, enlaces, privados, verificados] = await Promise.all([
      pool.query(`
        SELECT username, followers_count AS "followersCount", profile_pic_url, full_name, follows_count 
        FROM zenu_social_listening.perfiles_semilla 
        ORDER BY followers_count DESC 
        LIMIT 6
      `),
      pool.query(`
        SELECT TRIM(unnested) AS business_category_name, COUNT(*) 
        FROM (
          SELECT UNNEST(string_to_array(business_category_name, ',')) AS unnested
          FROM zenu_social_listening.perfiles_semilla
          WHERE business_category_name IS NOT NULL
        ) AS sub
        GROUP BY TRIM(unnested)
        ORDER BY COUNT(*) DESC
      `),
      pool.query(`
        SELECT 
          ROUND(AVG(followers_count)) AS promedio_followers_count,
          ROUND(AVG(follows_count)) AS promedio_follows_count
        FROM zenu_social_listening.perfiles_semilla
      `),
      pool.query(`
        SELECT COUNT(*) 
        FROM zenu_social_listening.perfiles_semilla 
        WHERE external_url IS NOT NULL AND TRIM(external_url) <> ''
      `),
      pool.query(`
        SELECT COUNT(*) 
        FROM zenu_social_listening.perfiles_semilla 
        WHERE private = true
      `),
      pool.query(`
        SELECT COUNT(*) 
        FROM zenu_social_listening.perfiles_semilla 
        WHERE verified = true
      `)
    ]);

    const total = await pool.query(`SELECT COUNT(*) FROM zenu_social_listening.perfiles_semilla`);
    const totalSemillas = parseInt(total.rows[0].count);

    res.json({
      top3: top3.rows,
      categorias: categorias.rows.map(c => ({ business_category_name: c.business_category_name, count: parseInt(c.count) })),
      promedio: {
        followers_count: promedio.rows[0].promedio_followers_count,
        follows_count: promedio.rows[0].promedio_follows_count
      },
      enlacesExternos: parseInt(enlaces.rows[0].count),
      privados: parseInt(privados.rows[0].count),
      verificados: parseInt(verificados.rows[0].count),
      total: totalSemillas
    });
  } catch (error) {
    console.error('Error al obtener indicadores semilla:', error);
    res.status(500).json({ error: 'Error al obtener indicadores semilla' });
  }
};

exports.proxyImagenInstagram = async (req, res) => {
  try {
    const imageUrl = decodeURIComponent(req.query.url);
    https.get(imageUrl, (instaRes) => {
      res.setHeader('Content-Type', instaRes.headers['content-type']);
      instaRes.pipe(res);
    }).on('error', err => {
      console.error('Error en proxy de imagen:', err);
      res.status(500).send('Error al cargar imagen');
    });
  } catch (err) {
    console.error('Error interno en proxy de imagen:', err);
    res.status(500).send('Error interno');
  }
};

exports.obtenerGraficosDescriptivos = async (req, res) => {
  try {
    const [categorias, totalPublicos, totalPrivados] = await Promise.all([
      pool.query(`
        SELECT TRIM(unnested) AS business_category_name, COUNT(*) 
        FROM (
          SELECT UNNEST(string_to_array(business_category_name, ',')) AS unnested
          FROM zenu_social_listening.perfiles_semilla
          WHERE business_category_name IS NOT NULL
        ) AS sub
        GROUP BY TRIM(unnested)
        ORDER BY COUNT(*) DESC
      `),
      pool.query(`
        SELECT COUNT(*) 
        FROM zenu_social_listening.perfiles_semilla 
        WHERE private = false
      `),
      pool.query(`
        SELECT COUNT(*) 
        FROM zenu_social_listening.perfiles_semilla 
        WHERE private = true
      `)
    ]);

    res.json({
      categorias: categorias.rows.map(c => ({
        business_category_name: c.business_category_name,
        count: parseInt(c.count)
      })),
      publicos: parseInt(totalPublicos.rows[0].count),
      privados: parseInt(totalPrivados.rows[0].count)
    });
  } catch (error) {
    console.error('Error al obtener gráficos descriptivos:', error);
    res.status(500).json({ error: 'Error al obtener gráficos descriptivos' });
  }
};

exports.obtenerLineaTiempoSemillas = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT username, latest_posts 
      FROM zenu_social_listening.perfiles_semilla
      WHERE latest_posts IS NOT NULL
    `);
 
    const series = {};
 
    resultado.rows.forEach(row => {
      const { username, latest_posts } = row;
      if (!Array.isArray(latest_posts)) return;
 
      latest_posts.forEach(post => {
        if (post.timestamp) {
          const fecha = new Date(post.timestamp).toISOString().split('T')[0];
          if (!series[username]) {
            series[username] = {};
          }
          series[username][fecha] = (series[username][fecha] || 0) + 1;
        }
      });
    });
 
    const fechasSet = new Set();
    Object.values(series).forEach(fechaObj => {
      Object.keys(fechaObj).forEach(f => fechasSet.add(f));
    });
 
    const fechas = Array.from(fechasSet).sort((a, b) => new Date(a) - new Date(b));
 
    const seriesFinal = Object.entries(series).map(([username, conteoPorFecha]) => ({
      name: username,
      type: 'line',
      data: fechas.map(f => conteoPorFecha[f] || 0)
    }));
 
    res.json({ fechas, series: seriesFinal });
  } catch (error) {
    console.error("Error al obtener línea de tiempo:", error);
    res.status(500).json({ error: 'Error al obtener línea de tiempo' });
  }
};

exports.obtenerBiografiasWordCloud = async (req, res) => {
  try {
    const { usernames } = req.body;

    let query = 'SELECT username, biography FROM zenu_social_listening.perfiles_semilla';
    const values = [];

    if (Array.isArray(usernames) && usernames.length > 0) {
      const params = usernames.map((_, idx) => `$${idx + 1}`);
      query += ` WHERE username IN (${params.join(',')})`;
      values.push(...usernames);
    }

    const result = await pool.query(query, values);
    const textos = result.rows.map(r => r.biography || '').join(' ');
    res.json({ biografias: textos });
  } catch (error) {
    console.error("Error al obtener biografías:", error);
    res.status(500).json({ error: "Error al obtener biografías para wordcloud" });
  }
};