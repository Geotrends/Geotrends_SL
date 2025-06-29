/**
@file controllers/historicosController.js
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

/**
 * Obtener lista de sensores desde la base de datos.
 */
const getSensores = async (req, res) => {
    try {
        const query = "SELECT * FROM sensores ORDER BY sensor_id ASC";
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No hay sensores registrados." });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error al obtener sensores:", error);
        res.status(500).json({ message: "Error al obtener sensores." });
    }
};

/**
 * Obtener datos del indicador seleccionado para un sensor en un rango de fechas.
 */
const getLaeqByTableAndDateRange = async (req, res) => {
    
        const { tabla, indicador } = req.params; // Nombre de la tabla e indicador
        const { fechaInicio, fechaFin } = req.query; // Fechas opcionales
    
        try {
            // Verificar si la tabla existe en la lista de sensores
            const sensorCheckQuery = 'SELECT 1 FROM sensores WHERE sensor_id = $1 LIMIT 1';
            const sensorResult = await pool.query(sensorCheckQuery, [tabla]);
    
            if (sensorResult.rows.length === 0) {
                return res.status(400).json({ message: 'El sensor solicitado no existe o no está registrado.' });
            }
    
            // Construir consulta para obtener los datos con el indicador dinámico
            let query = `SELECT timestamp, ${indicador}, tercios_z_slow, lpeak, lzeq_impulse, lzeq_fast, lzeq_slow, laeq_impulse, laeq_fast, laeq_slow, lceq_impulse, lceq_fast, lceq_slow FROM ${tabla} WHERE 1=1`;
            const values = [];
    
            // Aplicar el ajuste de la zona horaria (-5 horas para UTC-5)
            if (fechaInicio) {
                query += ' AND timestamp >= $1::timestamp AT TIME ZONE \'America/Bogota\' AT TIME ZONE \'UTC\'';
                values.push(fechaInicio);
            }
            if (fechaFin) {
                query += `AND timestamp < ($${values.length + 1}::timestamp + INTERVAL '1 day') AT TIME ZONE 'America/Bogota' AT TIME ZONE 'UTC'
`;
                values.push(fechaFin);
            }
    
            query += ' ORDER BY timestamp ASC';
    
            // Ejecutar la consulta
            const result = await pool.query(query, values);
    
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'No se encontraron datos para el rango de fechas especificado.' });
            }
    
            // Devolver los datos en UTC con el indicador seleccionado
            res.status(200).json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener los datos del indicador seleccionado.' });
        }
    };
    




module.exports = { getSensores, getLaeqByTableAndDateRange  };

