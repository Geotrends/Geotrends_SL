/**
@file controllers/modalController.js
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

// Controlador para obtener datos semanales y tercios de octava de un sensor
// Controlador para obtener datos semanales y nombre del sensor
const getWeeklyData = async (req, res) => {
    const { sensorId } = req.params;

    try {
        // Consulta para obtener TODOS los datos del sensor
        const sensorQuery = `
            SELECT * FROM sensores WHERE sensor_id = $1
        `;
        const sensorResult = await pool.query(sensorQuery, [sensorId]);

        if (sensorResult.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró el sensor.' });
        }

        // Extraer datos del sensor
        const sensorInfo = sensorResult.rows[0];

        // Consulta para obtener los datos semanales del sensor
        const dataQuery = `
            SELECT 
                sd.timestamp,
                sd.laeq_slow,
                sd.laeq_impulse,
                sd.tercios_z_slow
            FROM sensor_data sd
            WHERE sd.sensor_id = $1
              AND sd.timestamp >= NOW() - INTERVAL '7 days'
            ORDER BY sd.timestamp ASC
        `;

        const dataResult = await pool.query(dataQuery, [sensorId]);

        // Transformar los datos semanales
        const weekly = dataResult.rows.map(row => ({
            timestamp: row.timestamp,
            laeq_slow: parseFloat(row.laeq_slow),
            laeq_impulse: parseFloat(row.laeq_impulse),
            tercios_z_slow: row.tercios_z_slow, // Bandas de tercio de octava
        }));

        // Construcción de la respuesta
        res.json({
            sensorInfo,  // 🔹 Contiene TODOS los datos del sensor
            weekly       // 🔹 Datos semanales del sensor
        });
    } catch (error) {
        console.error('Error al obtener los datos semanales:', error);
        res.status(500).json({ error: 'Ocurrió un error al obtener los datos del sensor.' });
    }
};


module.exports = { getWeeklyData };
