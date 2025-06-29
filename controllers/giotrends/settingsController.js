/**
@file controllers/settingsController.js
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

// Obtener todos los sensores
exports.getSensores = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sensores');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener los sensores:', error);
        res.status(500).json({ error: 'Error al obtener los sensores' });
    }
};



exports.getSensorById = async (req, res) => {
    const { id } = req.params;

    try {
        // Usar ST_AsText para convertir geom a WKT (POINT(lon lat))
        const query = `
            SELECT id, sensor_id, ST_AsText(geom) as geom, freq_monitoreo, fin_monitoreo,
                   clasificacion, referencia, instalacion, linea, operador, altura, barrio,
                   municipio, departamento, tipo, uso_suelo, sector, subsector, estado, proveedor,
                   direccion, fecha_ins, ult_mant
            FROM sensores
            WHERE id = $1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length > 0) {
            res.json(result.rows[0]); // Retornar el sensor con geom como WKT
        } else {
            res.status(404).json({ error: 'Sensor no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el sensor:', error);
        res.status(500).json({ error: 'Error al obtener el sensor' });
    }
};


// Agregar un nuevo sensor
exports.addSensor = async (req, res) => {
    const {
        lat, lon, geom, freq_monitoreo, fin_monitoreo, clasificacion,
        referencia, instalacion, linea, operador, altura, barrio,
        municipio, departamento, tipo, uso_suelo, sector, subsector,
        estado, proveedor, fecha_ins, ult_mant, sensor_id, dirección
    } = req.body;

    try {
        const query = `
            INSERT INTO sensores (lat, lon, geom, freq_monitoreo, fin_monitoreo, clasificacion,
            referencia, instalacion, linea, operador, altura, barrio,
            municipio, departamento, tipo, uso_suelo, sector, subsector,
            estado, proveedor, fecha_ins, ult_mant, sensor_id, dirección)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING *;
        `;
        const values = [
            lat, lon, geom, freq_monitoreo, fin_monitoreo, clasificacion,
            referencia, instalacion, linea, operador, altura, barrio,
            municipio, departamento, tipo, uso_suelo, sector, subsector,
            estado, proveedor, fecha_ins, ult_mant, sensor_id, dirección
        ];
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al agregar el sensor:', error);
        res.status(500).json({ error: 'Error al agregar el sensor' });
    }
};

// Editar un sensor existente
exports.updateSensor = async (req, res) => {
    const { id } = req.params; // Obtener el ID desde la URL
    if (!id) {
        return res.status(400).json({ error: 'ID inválido o no proporcionado' });
    }

    const {
        geom, freq_monitoreo, fin_monitoreo, clasificacion, referencia, instalacion, linea, operador,
        altura, barrio, municipio, departamento, tipo, uso_suelo, sector, subsector, estado, proveedor,
        direccion, fecha_ins, ult_mant
    } = req.body;

    try {
        const query = `
            UPDATE sensores
            SET geom = ST_GeomFromText($1, 4326),
                lat = ST_Y(ST_GeomFromText($1, 4326)),
                lon = ST_X(ST_GeomFromText($1, 4326)),
                freq_monitoreo = $2, fin_monitoreo = $3, clasificacion = $4,
                referencia = $5, instalacion = $6, linea = $7, operador = $8,
                altura = $9, barrio = $10, municipio = $11, departamento = $12,
                tipo = $13, uso_suelo = $14, sector = $15, subsector = $16,
                estado = $17, proveedor = $18, direccion = $19, fecha_ins = $20,
                ult_mant = $21
            WHERE id = $22
            RETURNING *;
        `;
        const values = [geom, freq_monitoreo, fin_monitoreo, clasificacion, referencia, instalacion,
            linea, operador, altura, barrio, municipio, departamento, tipo, uso_suelo,
            sector, subsector, estado, proveedor, direccion, fecha_ins, ult_mant, id];
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar el sensor:', error);
        res.status(500).json({ error: 'Error al actualizar el sensor' });
    }
};




