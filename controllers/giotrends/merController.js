
const { pool: pool } = require('../../db/conexion'); // Importar la conexión a la base de datos

// 📌 Endpoint para obtener datos del esquema paisaje_sonoro.paisaje_sonoro y devolverlos en formato GeoJSON
exports.getPaisajeSonoroData = async (req, res) => {
    try {
        const query = `
            SELECT *, ST_AsGeoJSON(geom) AS geometry
            FROM paisaje_sonoro.paisaje_sonoro;
        `;

        const { rows } = await pool.query(query);

        const geojson = {
            type: "FeatureCollection",
            features: rows.map(row => {
                const { geom, geometry, ...properties } = row;
                return {
                    type: "Feature",
                    properties,
                    geometry: JSON.parse(geometry)
                };
            })
        };

        res.status(200).json(geojson);
    } catch (error) {
        console.error("❌ Error al obtener datos de paisaje_sonoro:", error.message);
        res.status(500).json({ message: "Error al obtener datos de paisaje_sonoro", error: error.message });
    }
};

exports.getCapasJerarquicas = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, pais, municipio, nombre, slug, nombre_tabla
      FROM mapas_ruido.capas_disponibles
      ORDER BY pais, municipio, nombre;
    `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error al obtener capas jerárquicas:", error.message);
    res.status(500).json({ message: "Error al obtener capas", error: error.message });
  }
};

exports.getTablaGeometria = async (req, res) => {
  try {
    const { tabla } = req.params;
    const sanitized = tabla.replace(/[^a-zA-Z0-9_\.]/g, '');

    const query = `
      SELECT *, ST_AsGeoJSON(geom) AS geometry
      FROM mapas_ruido.${sanitized}
      WHERE geom IS NOT NULL;
    `;
    const { rows } = await pool.query(query);

    const geojson = {
      type: "FeatureCollection",
      features: rows
  .filter(row => row.geometry)
  .map(row => {
    const { geom, geometry, ...props } = row;

    // Convertir campos conocidos a número si vienen como string
    ['ISOVALUE', 'valor_db', 'nivel', 'laeq', 'laeq_dia'].forEach(campo => {
      if (props[campo] && typeof props[campo] === 'string') {
        const num = parseFloat(props[campo]);
        if (!isNaN(num)) {
          props[campo] = num;
        }
      }
    });

    return {
      type: "Feature",
      properties: props,
      geometry: JSON.parse(geometry)
    };
  })
    };

    res.status(200).json(geojson);
  } catch (error) {
    console.error("❌ Error al obtener geometría de tabla:", error.message);
    res.status(500).json({ message: "Error al obtener geometría", error: error.message });
  }
};