
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

