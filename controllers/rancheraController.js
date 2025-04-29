// Segmenta perfiles según reglas por palabras clave en campos de perfil
exports.segmentarAudienciaPerfiles = async (req, res) => {
  try {
    const { fuentes, reglas } = req.body;

    if (!Array.isArray(fuentes) || fuentes.length === 0) {
      return res
        .status(400)
        .json({ error: "Debe proporcionar un arreglo de fuente_id" });
    }
    if (!reglas || typeof reglas !== "object") {
      return res
        .status(400)
        .json({ error: "Debe proporcionar un diccionario de reglas" });
    }

    const params = fuentes.map((_, idx) => `$${idx + 1}`).join(",");
    const query = `
      SELECT p.username, p.biography, p.business_category_name, a.keywords
      FROM zenu_social_listening.perfiles_instagram p
      LEFT JOIN zenu_social_listening.analisis_perfiles_instagram a 
      ON p.username = a.username
      WHERE p.fuente_id IN (${params})
    `;

    const result = await pool.query(query, fuentes);
    const perfilesSegmentados = result.rows.map((p) => {
      // Concatenar campos relevantes y convertir a minúsculas
      const texto = [
        p.biography || "",
        p.business_category_name || "",
        ...(Array.isArray(p.keywords) ? p.keywords : []),
      ]
        .join(" ")
        .toLowerCase();

      // Buscar la primera categoría que haga match con alguna palabra clave
      const categoria_detectada =
        Object.entries(reglas).find(([categoria, palabras]) =>
          palabras.some((palabra) => texto.includes(palabra.toLowerCase()))
        )?.[0] || "Sin categoría";

      return {
        username: p.username,
        categoria_detectada,
      };
    });

    res.json(perfilesSegmentados);
  } catch (error) {
    console.error("Error al segmentar audiencia:", error);
    res.status(500).json({ error: "Error interno al segmentar audiencia" });
  }
};
const pool = require("../db/conexion");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const https = require("https");

exports.obtenerResumenDashboard = async (req, res) => {
  try {
    const [semillas, perfiles, posts, comentarios, sentimientos, fechas] =
      await Promise.all([
        pool.query(
          "SELECT COUNT(*) FROM zenu_social_listening.perfiles_semilla"
        ),
        pool.query(
          "SELECT COUNT(*) FROM zenu_social_listening.perfiles_instagram"
        ),
        pool.query(
          "SELECT COUNT(*) FROM zenu_social_listening.instagram_posts"
        ),
        pool.query(
          "SELECT COUNT(*) FROM zenu_social_listening.comentarios_instagram"
        ),
        pool.query(`
        SELECT 
          SUM(CASE WHEN sentiment = 'POSITIVO' THEN 1 ELSE 0 END) AS positivos,
          SUM(CASE WHEN sentiment = 'NEUTRO' THEN 1 ELSE 0 END) AS neutros,
          SUM(CASE WHEN sentiment = 'NEGATIVO' THEN 1 ELSE 0 END) AS negativos
        FROM zenu_social_listening.analisis_instagram_posts
      `),
        pool.query(`
          SELECT
           MIN(timestamp) AS fecha_inicio,
  MAX(timestamp) AS fecha_fin,
  (MAX(timestamp)::date - MIN(timestamp)::date) + 1 AS dias_analizados
          FROM zenu_social_listening.instagram_posts
      `),
      ]);

    const totalPosts = parseInt(posts.rows[0].count);
    const positivos = parseInt(sentimientos.rows[0].positivos) || 0;
    const neutros = parseInt(sentimientos.rows[0].neutros) || 0;
    const negativos = parseInt(sentimientos.rows[0].negativos) || 0;

    const totalAnalizados = positivos + neutros + negativos;

    const sentimientoPositivo =
      totalAnalizados > 0
        ? `${((positivos / totalAnalizados) * 100).toFixed(1)}%`
        : "0.0%";
    const sentimientoNeutro =
      totalAnalizados > 0
        ? `${((neutros / totalAnalizados) * 100).toFixed(1)}%`
        : "0.0%";
    const sentimientoNegativo =
      totalAnalizados > 0
        ? `${((negativos / totalAnalizados) * 100).toFixed(1)}%`
        : "0.0%";

    res.json({
      semillas: parseInt(semillas.rows[0].count),
      perfiles: parseInt(perfiles.rows[0].count),
      publicaciones: totalPosts,
      comentarios: parseInt(comentarios.rows[0].count),
      sentimientoPositivo,
      sentimientoNeutro,
      sentimientoNegativo,
      fechaInicio: fechas.rows[0].fecha_inicio
        ? new Date(fechas.rows[0].fecha_inicio).toISOString().split("T")[0]
        : "Sin datos",
      fechaFin: fechas.rows[0].fecha_fin
        ? new Date(fechas.rows[0].fecha_fin).toISOString().split("T")[0]
        : "Sin datos",
      diasAnalizados: fechas.rows[0].dias_analizados
        ? parseInt(fechas.rows[0].dias_analizados)
        : 0,
    });
  } catch (error) {
    console.error("Error al obtener el resumen:", error);
    res
      .status(500)
      .json({ error: "Error al obtener el resumen del dashboard" });
  }
};


exports.obtenerIndicadoresSemillaFiltrado = async (req, res) => {
  try {
    const fuenteId = parseInt(req.query.fuente_id);

    if (!fuenteId && fuenteId !== 0) {
      return res.status(400).json({ error: "fuente_id inválido" });
    }

    const filtroFuente = fuenteId !== 0 ? `WHERE fuente_id = $1` : ``;
    const filtroOwner = fuenteId !== 0 ? `WHERE owner_username IN (SELECT username FROM zenu_social_listening.perfiles_instagram WHERE fuente_id = $1)` : ``;
    const valores = fuenteId !== 0 ? [fuenteId] : [];

    const perfilesQuery = `
      SELECT COUNT(*) 
      FROM zenu_social_listening.perfiles_instagram
      ${filtroFuente};
    `;
    const perfilesResult = await pool.query(perfilesQuery, valores);

    const publicacionesQuery = `
      SELECT COUNT(*) 
      FROM zenu_social_listening.instagram_posts
      ${filtroOwner};
    `;
    const publicacionesResult = await pool.query(publicacionesQuery, valores);

    const comentariosQuery = `
      SELECT COUNT(*) 
      FROM zenu_social_listening.comentarios_instagram
      WHERE post_id IN (
        SELECT id 
        FROM zenu_social_listening.instagram_posts
        ${filtroOwner}
      );
    `;
    const comentariosResult = await pool.query(comentariosQuery, valores);

    const sentimientoQuery = `
      SELECT 
        SUM(CASE WHEN sentiment = 'POSITIVO' THEN 1 ELSE 0 END) AS positivos,
        SUM(CASE WHEN sentiment = 'NEUTRO' THEN 1 ELSE 0 END) AS neutros,
        SUM(CASE WHEN sentiment = 'NEGATIVO' THEN 1 ELSE 0 END) AS negativos
      FROM 
        zenu_social_listening.analisis_instagram_posts a
      WHERE 
        a.post_id IN (
          SELECT id 
          FROM zenu_social_listening.instagram_posts
          ${filtroOwner}
        )
    `;
    const sentimientoResult = await pool.query(sentimientoQuery, valores);

    const fechasQuery = `
    SELECT 
      MIN(timestamp) AS fecha_inicio, 
      MAX(timestamp) AS fecha_fin, 
      (MAX(timestamp)::date - MIN(timestamp)::date) + 1 AS dias_analizados
    FROM 
      zenu_social_listening.instagram_posts
    ${filtroOwner};
  `;
    const fechasResult = await pool.query(fechasQuery, valores);

    console.log("🔍 Perfiles:", perfilesResult.rows);
    console.log("🔍 Publicaciones:", publicacionesResult.rows);
    console.log("🔍 Comentarios:", comentariosResult.rows);
    console.log("🔍 Sentimientos:", sentimientoResult.rows);
    console.log("🔍 Fechas:", fechasResult.rows);

    const totalPosts = parseInt(publicacionesResult.rows[0].count);
    const positivos = parseInt(sentimientoResult.rows[0].positivos) || 0;
    const neutros = parseInt(sentimientoResult.rows[0].neutros) || 0;
    const negativos = parseInt(sentimientoResult.rows[0].negativos) || 0;
    const totalAnalizados = positivos + neutros + negativos;

    const sentimientoPositivo = totalAnalizados > 0 ? `${((positivos / totalAnalizados) * 100).toFixed(1)}%` : "0.0%";
    const sentimientoNeutro = totalAnalizados > 0 ? `${((neutros / totalAnalizados) * 100).toFixed(1)}%` : "0.0%";
    const sentimientoNegativo = totalAnalizados > 0 ? `${((negativos / totalAnalizados) * 100).toFixed(1)}%` : "0.0%";

    const fechaInicio = fechasResult.rows[0].fecha_inicio
      ? new Date(fechasResult.rows[0].fecha_inicio).toISOString().split("T")[0]
      : "Sin datos";
    const fechaFin = fechasResult.rows[0].fecha_fin
      ? new Date(fechasResult.rows[0].fecha_fin).toISOString().split("T")[0]
      : "Sin datos";
    const diasAnalizados = fechasResult.rows[0].dias_analizados
      ? parseInt(fechasResult.rows[0].dias_analizados)
      : 0;

    res.json({
      totalPerfiles: parseInt(perfilesResult.rows[0].count),
      totalPublicaciones: totalPosts,
      totalComentarios: parseInt(comentariosResult.rows[0].count),
      sentimientoPositivo,
      sentimientoNeutro,
      sentimientoNegativo,
      fechaInicio,
      fechaFin,
      diasAnalizados,
    });
  } catch (error) {
    console.error("Error al obtener indicadores semilla filtrados:", error);
    res.status(500).json({ error: "Error al obtener indicadores semilla filtrados" });
  }
};



exports.obtenerPerfilesPorFuente = async (req, res) => {
  try {
    const { fuentes } = req.body;
    if (!Array.isArray(fuentes) || fuentes.length === 0) {
      return res
        .status(400)
        .json({ error: "Debe proporcionar un arreglo de fuente_id" });
    }

    const params = fuentes.map((_, idx) => `$${idx + 1}`).join(",");
    const query = `
SELECT 
  p.username,
  p.fullname,
  p.biography,
  p.fuente_id,
  p.follower_count AS followers,
  p.following_count AS follows_count,
  p.media_count AS posts_count,
  p.business_category_name,
  p.private,
  p.is_verified AS verified,
  p.is_business,
  a.sentiment,
  a.most_common AS emoji_mas_comun -- 👈 Aquí está la clave
FROM 
  zenu_social_listening.perfiles_instagram p
LEFT JOIN 
  zenu_social_listening.analisis_perfiles_instagram a
ON 
  p.username = a.username
WHERE 
  p.fuente_id IN (${params})
  `;

    const result = await pool.query(query, fuentes);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener perfiles por fuente_id:", error);
    res.status(500).json({ error: "Error al obtener perfiles por fuente_id" });
  }
};

exports.obtenerEstadisticasSemilla = async (req, res) => {
  try {
    const resultado = await pool.query(`
SELECT username, full_name, fuente_id, followers_count, follows_count, igtv_video_count, posts_count
FROM zenu_social_listening.perfiles_semilla
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al obtener estadísticas semilla:", error);
    res.status(500).json({ error: "Error al obtener estadísticas semilla" });
  }
};

exports.obtenerIndicadoresSemilla = async (req, res) => {
  try {
    const [top3, categorias, promedio, enlaces, privados, verificados] =
      await Promise.all([
        pool.query(`
SELECT 
  username,
  fuente_id,
  followers_count AS "followersCount",
  profile_pic_url,
  full_name,
  follows_count,
  business_category_name -- 👈 AÑADIR ESTE CAMPO
FROM zenu_social_listening.perfiles_semilla 
ORDER BY followers_count DESC 
LIMIT 6
      `),
        pool.query(`
        SELECT TRIM(regexp_replace(unnested, '^None,', '')) AS business_category_name, COUNT(*) 
        FROM (
          SELECT UNNEST(string_to_array(business_category_name, ',')) AS unnested
          FROM zenu_social_listening.perfiles_semilla
          WHERE business_category_name IS NOT NULL
        ) AS sub
        GROUP BY TRIM(regexp_replace(unnested, '^None,', ''))
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
      `),
      ]);

    const total = await pool.query(
      `SELECT COUNT(*) FROM zenu_social_listening.perfiles_semilla`
    );
    const totalSemillas = parseInt(total.rows[0].count);

    res.json({
      top3: top3.rows,
      categorias: categorias.rows.map((c) => ({
        business_category_name: c.business_category_name,
        count: parseInt(c.count),
      })),
      promedio: {
        followers_count: promedio.rows[0].promedio_followers_count,
        follows_count: promedio.rows[0].promedio_follows_count,
      },
      enlacesExternos: parseInt(enlaces.rows[0].count),
      privados: parseInt(privados.rows[0].count),
      verificados: parseInt(verificados.rows[0].count),
      total: totalSemillas,
    });
  } catch (error) {
    console.error("Error al obtener indicadores semilla:", error);
    res.status(500).json({ error: "Error al obtener indicadores semilla" });
  }
};

exports.proxyImagenInstagram = async (req, res) => {
  try {
    const imageUrl = decodeURIComponent(req.query.url);
    https
      .get(imageUrl, (instaRes) => {
        res.setHeader("Content-Type", instaRes.headers["content-type"]);
        instaRes.pipe(res);
      })
      .on("error", (err) => {
        console.error("Error en proxy de imagen:", err);
        res.status(500).send("Error al cargar imagen");
      });
  } catch (err) {
    console.error("Error interno en proxy de imagen:", err);
    res.status(500).send("Error interno");
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
      `),
    ]);

    res.json({
      categorias: categorias.rows.map((c) => ({
        business_category_name: c.business_category_name,
        count: parseInt(c.count),
      })),
      publicos: parseInt(totalPublicos.rows[0].count),
      privados: parseInt(totalPrivados.rows[0].count),
    });
  } catch (error) {
    console.error("Error al obtener gráficos descriptivos:", error);
    res.status(500).json({ error: "Error al obtener gráficos descriptivos" });
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

    resultado.rows.forEach((row) => {
      const { username, latest_posts } = row;
      if (!Array.isArray(latest_posts)) return;

      latest_posts.forEach((post) => {
        if (post.timestamp) {
          const fecha = new Date(post.timestamp).toISOString().split("T")[0];
          if (!series[username]) {
            series[username] = {};
          }
          series[username][fecha] = (series[username][fecha] || 0) + 1;
        }
      });
    });

    const fechasSet = new Set();
    Object.values(series).forEach((fechaObj) => {
      Object.keys(fechaObj).forEach((f) => fechasSet.add(f));
    });

    const fechas = Array.from(fechasSet).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    const seriesFinal = Object.entries(series).map(
      ([username, conteoPorFecha]) => ({
        name: username,
        type: "line",
        data: fechas.map((f) => conteoPorFecha[f] || 0),
      })
    );

    res.json({ fechas, series: seriesFinal });
  } catch (error) {
    console.error("Error al obtener línea de tiempo:", error);
    res.status(500).json({ error: "Error al obtener línea de tiempo" });
  }
};

exports.obtenerBiografiasWordCloud = async (req, res) => {
  try {
    const { usernames } = req.body;

    let query =
      "SELECT username, biography FROM zenu_social_listening.perfiles_semilla";
    const values = [];

    if (Array.isArray(usernames) && usernames.length > 0) {
      const params = usernames.map((_, idx) => `$${idx + 1}`);
      query += ` WHERE username IN (${params.join(",")})`;
      values.push(...usernames);
    }

    const result = await pool.query(query, values);
    const textos = result.rows.map((r) => r.biography || "").join(" ");
    res.json({ biografias: textos });
  } catch (error) {
    console.error("Error al obtener biografías:", error);
    res
      .status(500)
      .json({ error: "Error al obtener biografías para wordcloud" });
  }
};

// Nueva función: obtener análisis de sentimiento de perfiles
exports.obtenerAnalisisSentimientoPerfiles = async (req, res) => {
  try {
    console.log("📥 Recibido en analisis-sentimiento:", req.body);
    const { fuentes } = req.body;

    if (!Array.isArray(fuentes) || fuentes.length === 0) {
      return res
        .status(400)
        .json({ error: "Debe proporcionar un arreglo de fuente_id" });
    }

    const params = fuentes.map((_, idx) => `$${idx + 1}`).join(",");
    const query = `
      SELECT p.username, p.fullname AS full_name, p.biography, p.fuente_id,
             COALESCE(a.followers, p.follower_count) AS followers, a.sentiment,
             a.sentiment_score_positive AS positive, a.sentiment_score_negative AS negative,
             a.most_common AS emoji_mas_comun, a.emoji_density, a.keywords, a.interpretation
      FROM zenu_social_listening.perfiles_instagram p
      LEFT JOIN zenu_social_listening.analisis_perfiles_instagram a 
      ON p.username = a.username
      WHERE p.fuente_id IN (${params})
    `;

    const result = await pool.query(query, fuentes);
    res.json(result.rows);
  } catch (error) {
    console.error(
      "Error al obtener análisis de sentimiento de perfiles:",
      error
    );
    res
      .status(500)
      .json({ error: "Error al obtener análisis de sentimiento de perfiles" });
  }
};
