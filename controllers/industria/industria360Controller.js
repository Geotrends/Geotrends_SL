const { geo360Pool: pool } = require("../../db/conexion"); // Importar la conexión a la base de datos


exports.getTourPlan = async (req, res) => {
  const slug = req.query.tour || 'pepsico-techo';

  try {
    const tourRes = await pool.query(`
      SELECT id, nombre, slug, descripcion, descripcion_html, imagen_portada
      FROM geo360.tours
      WHERE slug = $1
    `, [slug]);

    if (tourRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tour no encontrado' });
    }

    const tour = tourRes.rows[0];

    const nodosRes = await pool.query(`
      SELECT id, nombre, caption, panorama, thumbnail,
             ST_X(posicion_geografica::geometry) AS lon,
             ST_Y(posicion_geografica::geometry) AS lat,
             altura_metros, sphere_correction
      FROM geo360.nodos
      WHERE id_tour = $1
      ORDER BY id
    `, [tour.id]);

    const nodes = nodosRes.rows.map(n => ({
      id: String(n.id),
      name: n.nombre,
      caption: n.caption,
      panorama: n.panorama,
      thumbnail: n.thumbnail,
      gps: [n.lon, n.lat, n.altura_metros || 0],
      sphereCorrection: n.sphere_correction
    }));

    const center = nodes.length > 0 ? nodes[0].gps.slice(0, 2) : [-75.3758, 6.13325];

    const hotspots = nodes.map(n => ({
      id: n.id,
      coordinates: [n.gps[0], n.gps[1]],
      image: 'https://photo-sphere-viewer-data.netlify.app/assets/pictos/pin-blue.png',
      tooltip: n.name || n.caption || ''
    }));

    res.json({
      tour,
      nodes,
      plan: {
        center,
        hotspots
      }
    });

  } catch (err) {
    console.error('Error al obtener tour-plan:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
