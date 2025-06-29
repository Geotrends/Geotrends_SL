/**
@file controllers/dataController.js
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

// 🔹 Obtener lista de sensores desde la tabla `sensores`
exports.getSensors = async (req, res) => {
    try {
        const query = 'SELECT DISTINCT sensor_id FROM sensores';
        const result = await pool.query(query);
        res.status(200).json(result.rows.map(row => row.sensor_id));
    } catch (error) {
        console.error('Error al obtener sensores:', error.message);
        res.status(500).json({ message: 'Error al obtener sensores', error: error.message });
    }
};

// 🔹 Obtener los datos recientes de todos los sensores desde `latest_sensor_data`
exports.getSensorsData = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        // Rango de fechas predeterminado: últimos 30 días
        const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0];
        const endDate = end_date || new Date().toISOString().split("T")[0];

        // Validar formato de las fechas
        const isValidDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return res.status(400).json({ message: "Las fechas deben estar en formato YYYY-MM-DD" });
        }

        // 🔹 Consultar `latest_sensor_data` para los sensores en el rango de fechas
        const query = `
            SELECT sensor_id, timestamp, laeq_slow, la_eq_slow_min_max
            FROM latest_sensor_data
            WHERE timestamp BETWEEN $1 AND $2
            ORDER BY timestamp ASC;
        `;
        const result = await pool.query(query, [startDate, endDate]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error al obtener datos de los sensores:", error.message);
        res.status(500).json({ message: "Error al obtener datos", error: error.message });
    }
};

// 🔹 Obtener todos los sensores registrados con su referencia
exports.getAllSensors = async (req, res) => {
    try {
        const result = await pool.query('SELECT sensor_id, referencia FROM sensores');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener sensores:', error.message);
        res.status(500).json({ message: 'Error al obtener sensores' });
    }
};

// 🔹 Obtener el último nivel de ruido y datos de la última hora para un sensor
exports.getSensorData = async (req, res) => {
    const { sensor_id } = req.params;

    try {
        // 🔹 Consulta el último nivel registrado en `latest_sensor_data`
        const latestDataQuery = `
            SELECT timestamp, laeq_slow
            FROM latest_sensor_data
            WHERE sensor_id = $1
            ORDER BY timestamp DESC
            LIMIT 1;
        `;
        const latestData = await pool.query(latestDataQuery, [sensor_id]);

        // 🔹 Consulta los datos de la última hora en `latest_sensor_data`
        const hourlyDataQuery = `
            SELECT timestamp, laeq_slow
            FROM latest_sensor_data
            WHERE sensor_id = $1 AND timestamp >= NOW() - INTERVAL '1 hour'
            ORDER BY timestamp ASC;
        `;
        const hourlyData = await pool.query(hourlyDataQuery, [sensor_id]);

        res.json({
            latest: latestData.rows[0] || null,
            hourly: hourlyData.rows || [],
        });
    } catch (error) {
        console.error(`Error al obtener datos para el sensor ${sensor_id}:`, error.message);
        res.status(500).json({ message: `Error al obtener datos para el sensor ${sensor_id}` });
    }
};


// 🔹 Obtener todos los datos recientes de los sensores desde `latest_sensor_data`

exports.getLatestSensorsData = async (req, res) => {
    try {
        const query = `
            WITH latest_data AS (
                SELECT DISTINCT ON (ls.sensor_id) 
                    ls.sensor_id, 
                    s.referencia,
                    s.municipio,
                    s.barrio,
                    s.uso_suelo,
                    ls.timestamp, 
                    ls.laeq_slow
                FROM latest_sensor_data ls
                LEFT JOIN sensores s ON ls.sensor_id = s.sensor_id
                ORDER BY ls.sensor_id, ls.timestamp DESC
            ),
            hourly_data AS (
                SELECT 
                    h.sensor_id, 
                    json_agg(
                        json_build_object(
                            'timestamp', h.timestamp,
                            'laeq_slow', h.laeq_slow
                        ) ORDER BY h.timestamp DESC
                    ) AS hourly
                FROM latest_sensor_data h
                WHERE h.timestamp >= NOW() - INTERVAL '1 hour'
                GROUP BY h.sensor_id
            )
            SELECT 
                ld.sensor_id, 
                ld.referencia,
                ld.municipio,
                ld.barrio,
                ld.uso_suelo, 
                ld.timestamp, 
                ld.laeq_slow, 
                COALESCE(hd.hourly, '[]'::json) AS hourly_data
            FROM latest_data ld
            LEFT JOIN hourly_data hd ON ld.sensor_id = hd.sensor_id;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener datos recientes de sensores:', error.message);
        res.status(500).json({ message: 'Error al obtener datos', error: error.message });
    }
};


