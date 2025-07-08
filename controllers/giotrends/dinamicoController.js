// 📌 Endpoint para obtener todos los puntos del esquema mapa_dinamico.AMVA en formato GeoJSON
const { pool: pool } = require('../../db/conexion'); 
exports.getMapaDinamico = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        ST_AsGeoJSON(geom) AS geometry,
        id_rec,
        principal,
        autopista,
        servicio,
        menor,
        colectora,
        sumTotal
      FROM mapa_dinamico."AMVA"
      WHERE geom IS NOT NULL
      LIMIT 5000;
    `;

    const { rows } = await pool.query(query);

    const geojson = {
      type: "FeatureCollection",
      features: rows.map(row => {
        const { geometry, geom, ...props } = row;
        return {
          type: "Feature",
          geometry: JSON.parse(geometry),
          properties: props
        };
      })
    };

    res.status(200).json(geojson);
  } catch (error) {
    console.error("❌ Error al obtener datos de mapa dinámico:", error.message);
    res.status(500).json({ message: "Error al obtener datos", error: error.message });
  }
};

exports.getMunicipios = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT mpio_nombr AS nombre
      FROM mapa_dinamico.municipios
      ORDER BY nombre;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error al obtener municipios:", err.message);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.getGeometriaMunicipio = async (req, res) => {
  const nombre = req.params.nombre;
  try {
    const query = `
      SELECT ST_AsGeoJSON(geom) AS geometry
      FROM mapa_dinamico.municipios
      WHERE mpio_nombr = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [nombre]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Municipio no encontrado" });
    }

    res.json({ geometry: JSON.parse(rows[0].geometry) });
  } catch (err) {
    console.error("❌ Error al obtener la geometría del municipio:", err.message);
    res.status(500).json({ error: "Error interno" });
  }
};