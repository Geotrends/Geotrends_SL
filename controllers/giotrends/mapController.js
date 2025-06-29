/**
@file controllers/mapController.js
@version 1.0.0

@description
Lógica JS del proyecto.
Este archivo forma parte del proyecto "Plataforma de Monitoreo Ambiental IoT",
desarrollado por Geotrends - Geographic and Data Analytics, en colaboración con el Área Metropolitana
del Valle de Aburrá y la Universidad de San Buenaventura en el marco del Convenio 273 de 2024.

⚖️ Propiedad Intelectual:
Este software es propiedad intelectual compartida según el Convenio 273 de 2024.

📌 Entidades involucradas:
- Geotrends - Geographic and Data Analytics
- Área Metropolitana del Valle de Aburrá
- Universidad de San Buenaventura

👨‍💻 Equipo de desarrollo:
- Jonathan Ochoa Villegas (Geotrends)
- Diego Murillo Gómez (USB)
- Camilo Herrera Arcila (Geotrends)

📅 Creación: Noviembre 2024
📅 Actualización: 30-03-2025

📜 Licencia: MIT License

© 2025 Geotrends. Todos los derechos reservados.
 */

const { secondaryPool: pool } = require('../../db/conexion'); // Importar la conexión a la base de datos

exports.getMapData = async (req, res) => {
    try {
        const query = `
            WITH latest_data AS (
                SELECT DISTINCT ON (ls.sensor_id) 
                    ls.sensor_id, 
                    s.referencia AS sensor_name,
                    s.municipio,
                    s.barrio,
                    s.uso_suelo,
                    ST_X(s.geom::geometry) AS longitude,
                    ST_Y(s.geom::geometry) AS latitude,
                    ls.timestamp, 
                    ls.laeq_slow
                FROM latest_sensor_data ls
                LEFT JOIN sensores s ON ls.sensor_id = s.sensor_id
                WHERE s.geom IS NOT NULL
                ORDER BY ls.sensor_id, ls.timestamp DESC
            ),
            last_hour_data AS (
                SELECT 
                    sensor_id, 
                    json_agg(json_build_object(
                        'timestamp', timestamp, 
                        'laeq_slow', laeq_slow
                    ) ORDER BY timestamp DESC) AS historical_data
                FROM latest_sensor_data
                WHERE timestamp >= NOW() - INTERVAL '1 hour'
                GROUP BY sensor_id
            )
            SELECT 
                ld.sensor_id,
                ld.sensor_name,
                ld.municipio,
                ld.barrio,
                ld.uso_suelo,
                ld.longitude,
                ld.latitude,
                ld.timestamp,
                ld.laeq_slow,
                COALESCE(lhd.historical_data, '[]'::json) AS historical_data
            FROM latest_data ld
            LEFT JOIN last_hour_data lhd ON ld.sensor_id = lhd.sensor_id;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener datos para el mapa:', error.message);
        res.status(500).json({ message: 'Error al obtener datos para el mapa', error: error.message });
    }
};


// 📌 1️⃣ Endpoint para obtener las tablas con geometría en el esquema cartobase
exports.getTablesWithGeometry = async (req, res) => {
    try {
        const query = `
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'cartobase'
            AND (udt_name = 'geometry' OR udt_name = 'geography')
            GROUP BY table_name;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("❌ Error al obtener las tablas con geometría:", error.message);
        res.status(500).json({ message: "Error al obtener las tablas con geometría", error: error.message });
    }
};

// 📌 2️⃣ Endpoint para obtener los datos de una tabla específica y prepararlos para Leaflet

    exports.getTableDataForLeaflet = async (req, res) => {
        try {
            const { tableName } = req.params;
    
            // 📌 Validar que la tabla existe en el esquema cartobase
            const validTableQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'cartobase' 
                AND table_name = $1;
            `;
            const validTable = await pool.query(validTableQuery, [tableName]);
    
            if (validTable.rowCount === 0) {
                return res.status(400).json({ message: "Tabla no válida o no encontrada en cartobase" });
            }
    
            // 📌 Obtener TODAS las columnas dinámicamente
            const query = `
                SELECT *, ST_AsGeoJSON(geom) AS geometry
                FROM cartobase.${tableName};
            `;
    
            const { rows } = await pool.query(query);
    
            // 📌 Convertir los datos en formato GeoJSON
            const geojson = {
                type: "FeatureCollection",
                features: rows.map(row => {
                    // 📌 Extraer todas las columnas excepto geom
                    const { geom, geometry, ...properties } = row;
                    return {
                        type: "Feature",
                        properties, // Todas las columnas excepto la geometría
                        geometry: JSON.parse(geometry) // Convertir a objeto GeoJSON
                    };
                })
            };
    
            res.status(200).json(geojson);
        } catch (error) {
            console.error("❌ Error al obtener datos de la tabla:", error.message);
            res.status(500).json({ message: "Error al obtener datos", error: error.message });
        }
    };
    