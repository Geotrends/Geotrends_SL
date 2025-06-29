/**
@file controllers/analiticaController.js
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

const { secondaryPool: pool } = require("../../db/conexion"); // Importar la conexión a la base de datos

const getLast30DaysData = async (req, res) => {
  try {
    // Consulta para obtener sensores desde la tabla "sensores"
    const sensorsQuery = "SELECT sensor_id, referencia FROM sensores";
    const sensorsResult = await pool.query(sensorsQuery);

    if (sensorsResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron sensores registrados." });
    }

    const sensores = sensorsResult.rows.map((row) => ({
      sensor_id: row.sensor_id.toLowerCase(),
      referencia: row.referencia
    })); // Convertir a minúsculas y mantener la referencia

    // Rango de fechas: últimos 30 días
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaFin.getDate() - 30);

    const results = [];

    for (const sensor of sensores) {
      try {
        // Consulta para calcular los promedios por día y por intervalo (diurno, nocturno, total)
        const query = `
                    SELECT
                        DATE(timestamp) AS fecha,
                        10 * LOG10(AVG(POWER(10, laeq_slow / 10)) FILTER (WHERE EXTRACT(HOUR FROM timestamp) BETWEEN 7 AND 20)) AS promedio_diurno,
                        10 * LOG10(AVG(POWER(10, laeq_slow / 10)) FILTER (WHERE EXTRACT(HOUR FROM timestamp) >= 21 OR EXTRACT(HOUR FROM timestamp) < 7)) AS promedio_nocturno,
                        10 * LOG10(AVG(POWER(10, laeq_slow / 10))) AS promedio_total
                    FROM ${sensor.sensor_id} -- Usar el nombre de la tabla en minúsculas
                    WHERE timestamp >= $1 AND timestamp <= $2
                    GROUP BY DATE(timestamp)
                    ORDER BY fecha ASC;
                `;

        const result = await pool.query(query, [fechaInicio, fechaFin]);

        results.push({
          sensor_id: sensor.sensor_id,
          referencia: sensor.referencia, // Incluir la referencia
          data: result.rows,
        });
      } catch (error) {
        console.error(
          `Error al consultar la tabla para el sensor ${sensor.sensor_id}:`,
          error.message
        );
        results.push({
          sensor_id: sensor.sensor_id,
          referencia: sensor.referencia, // Incluir la referencia
          error: `Error al consultar los datos del sensor ${sensor.sensor_id}. Verifique si la tabla existe y tiene datos.`,
        });
      }
    }

    // Respuesta con los datos calculados
    res.status(200).json(results);
  } catch (error) {
    console.error("Error al obtener datos de los sensores:", error);
    res.status(500).json({ message: "Error al procesar la solicitud." });
  }
};

const getAveragesForAllSensors = async (req, res) => {
  try {
    // Obtener la lista de sensores desde la tabla "sensores"
    const sensorsQuery = "SELECT sensor_id, referencia FROM sensores";
    const sensorsResult = await pool.query(sensorsQuery);

    if (sensorsResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron sensores registrados." });
    }

    const sensores = sensorsResult.rows.map((row) => ({
      sensor_id: row.sensor_id.toLowerCase(),
      referencia: row.referencia
    })); // Convertir a minúsculas y mantener la referencia

    const results = [];

    for (const sensor of sensores) {
      try {
        // 🛠 **Ajuste de los horarios a UTC para Bogotá (-5 horas)**
        const query = `
                    SELECT
                        ROUND(10 * LOG10(AVG(POWER(10, laeq_slow / 10)) FILTER (WHERE 
                            EXTRACT(HOUR FROM timestamp) BETWEEN 12 AND 23
                        )), 2) AS la_d,
                        
                        ROUND(10 * LOG10(AVG(POWER(10, laeq_slow / 10)) FILTER (WHERE 
                            EXTRACT(HOUR FROM timestamp) >= 0 AND EXTRACT(HOUR FROM timestamp) < 12
                        )), 2) AS la_n,

                        ROUND(10 * LOG10(AVG(POWER(10, laeq_slow / 10))), 2) AS la_dn
                    FROM ${sensor.sensor_id}
                    WHERE timestamp >= NOW() - INTERVAL '30 days';
                `;

        const result = await pool.query(query);

        if (result.rows.length > 0) {
          results.push({
            sensor_id: sensor.sensor_id,
            referencia: sensor.referencia, // Incluir la referencia
            la_d: result.rows[0].la_d || null,
            la_n: result.rows[0].la_n || null,
            la_dn: result.rows[0].la_dn || null,
          });
        } else {
          results.push({
            sensor_id: sensor.sensor_id,
            referencia: sensor.referencia, // Incluir la referencia
            la_d: null,
            la_n: null,
            la_dn: null,
          });
        }
      } catch (error) {
        console.error(
          `Error al calcular promedios para el sensor ${sensor.sensor_id}:`,
          error.message
        );
        results.push({
          sensor_id: sensor.sensor_id,
          referencia: sensor.referencia, // Incluir la referencia
          error: `Error al calcular promedios para el sensor ${sensor.sensor_id}. Verifique si la tabla existe y tiene datos.`,
        });
      }
    }

    // Enviar los resultados
    res.status(200).json(results);
  } catch (error) {
    console.error("Error al obtener promedios de los sensores:", error);
    res.status(500).json({ message: "Error al procesar la solicitud." });
  }
};



const getExceedanceCountsForAllSensors = async (req, res) => {
  try {
    // Obtener la lista de sensores desde la tabla "sensores"
    const sensorsQuery = "SELECT sensor_id, referencia FROM sensores";
    const sensorsResult = await pool.query(sensorsQuery);

    if (sensorsResult.rows.length === 0) {
      return res.status(404).json({ message: "No se encontraron sensores registrados." });
    }

    const sensores = sensorsResult.rows.map(row => ({
      sensor_id: row.sensor_id.toLowerCase(),
      referencia: row.referencia
    })); // Convertir a minúsculas y mantener la referencia

    // Obtener los umbrales desde los parámetros de consulta
    const { umbral_diurno, umbral_nocturno, umbral_total } = req.query;

    // Validación de parámetros
    if (!umbral_diurno || !umbral_nocturno || !umbral_total) {
      return res.status(400).json({
        message: "Se requieren los umbrales diurno, nocturno y total para la consulta."
      });
    }

    const umbralDiurnoNumerico = parseFloat(umbral_diurno);
    const umbralNocturnoNumerico = parseFloat(umbral_nocturno);
    const umbralTotalNumerico = parseFloat(umbral_total);

    if (isNaN(umbralDiurnoNumerico) || isNaN(umbralNocturnoNumerico) || isNaN(umbralTotalNumerico)) {
      return res.status(400).json({ message: "Los umbrales deben ser valores numéricos válidos." });
    }

    const results = [];

    for (const sensor of sensores) {
      try {
        // Consulta SQL para contar los datos que superan cada umbral en cada periodo
        const query = `
                    SELECT
                        -- Conteo total de datos en cada periodo
                        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) BETWEEN 7 AND 20) AS total_diurno,
                        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) >= 21 OR EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) < 7) AS total_nocturno,
                        COUNT(*) AS total_general,

                        -- Conteo de datos que superan el umbral en cada periodo
                        COUNT(*) FILTER (WHERE laeq_slow > $1 AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) BETWEEN 7 AND 20) AS conteo_diurno,
                        COUNT(*) FILTER (WHERE laeq_slow > $2 AND (EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) >= 21 OR EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) < 7)) AS conteo_nocturno,
                        COUNT(*) FILTER (WHERE laeq_slow > $3) AS conteo_total,

                        -- Cálculo de porcentaje considerando el total en cada periodo
                        ROUND((COUNT(*) FILTER (WHERE laeq_slow > $1 AND EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) BETWEEN 7 AND 20) * 100.0) / NULLIF(COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) BETWEEN 7 AND 20), 0), 2) AS porcentaje_diurno,
                        ROUND((COUNT(*) FILTER (WHERE laeq_slow > $2 AND (EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) >= 21 OR EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) < 7)) * 100.0) / NULLIF(COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) >= 21 OR EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Bogota')) < 7), 0), 2) AS porcentaje_nocturno,
                        ROUND((COUNT(*) FILTER (WHERE laeq_slow > $3) * 100.0) / NULLIF(COUNT(*), 0), 2) AS porcentaje_total
                    FROM ${sensor.sensor_id};
                `;

        const result = await pool.query(query, [
          umbralDiurnoNumerico,
          umbralNocturnoNumerico,
          umbralTotalNumerico
        ]);

        if (result.rows.length > 0) {
          results.push({
            sensor_id: sensor.sensor_id,
            referencia: sensor.referencia, // Incluir la referencia
            total_diurno: result.rows[0].total_diurno || 0,
            total_nocturno: result.rows[0].total_nocturno || 0,
            total_general: result.rows[0].total_general || 0,
            conteo_diurno: result.rows[0].conteo_diurno || 0,
            conteo_nocturno: result.rows[0].conteo_nocturno || 0,
            conteo_total: result.rows[0].conteo_total || 0,
            porcentaje_diurno: result.rows[0].porcentaje_diurno || 0,
            porcentaje_nocturno: result.rows[0].porcentaje_nocturno || 0,
            porcentaje_total: result.rows[0].porcentaje_total || 0
          });
        } else {
          results.push({
            sensor_id: sensor.sensor_id,
            referencia: sensor.referencia, // Incluir la referencia
            total_diurno: 0,
            total_nocturno: 0,
            total_general: 0,
            conteo_diurno: 0,
            conteo_nocturno: 0,
            conteo_total: 0,
            porcentaje_diurno: 0,
            porcentaje_nocturno: 0,
            porcentaje_total: 0
          });
        }
      } catch (error) {
        console.error(`Error al contar datos para el sensor ${sensor.sensor_id}:`, error.message);
        results.push({
          sensor_id: sensor.sensor_id,
          referencia: sensor.referencia, // Incluir la referencia
          error: `Error al contar valores que superan los umbrales en el sensor ${sensor.sensor_id}.`
        });
      }
    }

    // Enviar los resultados
    res.status(200).json(results);
  } catch (error) {
    console.error("Error al procesar la consulta de superación de umbral:", error);
    res.status(500).json({ message: "Error al procesar la solicitud." });
  }
};

// Funciiones datos de heatmap
const getSensores = async (req, res) => {
  try {
      const result = await pool.query('SELECT * FROM sensores ORDER BY sensor_id'); // Ajusta según tu esquema
      res.json(result.rows);
  } catch (error) {
      console.error('Error obteniendo sensores:', error);
      res.status(500).json({ error: 'Error obteniendo los sensores' });
  }
};

////

function obtenerFechaBogota() {
  const ahoraUTC = new Date();
  const ahoraBogota = new Date(ahoraUTC.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  return ahoraBogota;
}

const getPromedioLAeqPorHora = async (req, res) => {
  try {
    const { sensores, fecha } = req.body;

    if (!sensores || !Array.isArray(sensores) || sensores.length === 0) {
      return res.status(400).json({ error: "No se han seleccionado sensores válidos" });
    }

    // 📆 Determinar la fecha (usar día anterior si no se proporciona)
    let fechaConsulta;
    if (fecha) {
      fechaConsulta = new Date(`${fecha}T00:00:00-05:00`);
      if (isNaN(fechaConsulta)) {
        return res.status(400).json({ error: "Formato de fecha inválido" });
      }
    } else {
      fechaConsulta = new Date();
      fechaConsulta.setDate(fechaConsulta.getDate() - 1);
    }

    const fechaStr = fechaConsulta.toISOString().split("T")[0]; // yyyy-mm-dd

    // 🔄 Ejecutar consultas en paralelo por sensor
    const consultas = sensores.map(sensorId => {
      if (typeof sensorId !== "string" || !sensorId.trim()) return null;

      const query = `
        SELECT 
          sensor_id,
          DATE_TRUNC('hour', fecha AT TIME ZONE 'UTC') AS hora,
          lpeak,
          lzeq_impulse,
          lzeq_fast,
          lzeq_slow,
          laeq_impulse,
          laeq_fast,
          laeq_slow,
          lceq_impulse,
          lceq_fast,
          lceq_slow
        FROM resumen_iot.resumen_horario
        WHERE sensor_id = $1
        AND fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
    >= $2::date
AND fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
    < ($2::date + interval '1 day')
        ORDER BY hora ASC;
      `;

      return pool.query(query, [sensorId, fechaStr])
        .then(result => {
          const datosAjustados = result.rows.map(row => {
            const fechaUTC = new Date(row.hora);

            const fechaFormateada = new Intl.DateTimeFormat("sv-SE", {
              timeZone: "America/Bogota",
              hour12: false,
              year: "numeric", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit", second: "2-digit"
            }).format(fechaUTC);

            const horaBogotaISO = fechaFormateada.replace(" ", "T") + "-05:00";

            return {
              ...row,
              hora: horaBogotaISO
            };
          });

          return {
            sensor: sensorId,
            datos: datosAjustados
          };
        })
        .catch(err => {
          console.error(`❌ Error en la consulta para el sensor ${sensorId}:`, err);
          return {
            sensor: sensorId,
            error: "Error en la consulta"
          };
        });
    }).filter(Boolean); // Eliminar nulls si hubo sensorId inválidos

    const resultados = await Promise.all(consultas);
    resultados.sort((a, b) => a.sensor.localeCompare(b.sensor));

    res.json(resultados);

  } catch (error) {
    console.error("❌ Error general en getPromedioLAeqPorHora:", error);
    res.status(500).json({ error: "Error obteniendo los datos del promedio horario" });
  }
};






// 📌 Controlador para obtener datos semanales desde `resumen_diario_24h`, `resumen_semanal_dia` y `resumen_semanal_noche`
const getLaeqSemana = async (req, res) => {
  try {
    const { sensores, fechaInicio, fechaFin, tipoResumen } = req.body;

    // 🔎 Validar entrada
    if (!sensores || sensores.length === 0 || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Faltan sensores o rango de fechas en la consulta.",
      });
    }

    // 🔹 Fechas en formato ISO (sin convertir zona horaria porque ya es Colombia procesado en UTC)
    const fechaInicioConsulta = new Date(`${fechaInicio}T00:00:00Z`);
    const fechaFinConsulta = new Date(`${fechaFin}T23:59:59Z`);

    if (isNaN(fechaInicioConsulta) || isNaN(fechaFinConsulta)) {
      return res.status(400).json({ error: "Formato de fecha inválido." });
    }

    // 🔹 Seleccionar la tabla según el tipo de resumen
    const tabla =
      tipoResumen === "dia"
        ? "resumen_iot.resumen_diario_dia"
        : tipoResumen === "noche"
        ? "resumen_iot.resumen_diario_noche"
        : "resumen_iot.resumen_diario_24h";

    // 🔹 Consulta sin convertir fecha (ya está bien en UTC como Colombia procesado)
    const query = `
      SELECT sensor_id, fecha, laeq_slow
      FROM ${tabla}
      WHERE sensor_id = ANY($1) AND fecha BETWEEN $2 AND $3
      ORDER BY sensor_id, fecha;
    `;

    const { rows } = await pool.query(query, [
      sensores,
      fechaInicioConsulta.toISOString(),
      fechaFinConsulta.toISOString(),
    ]);

    // 🔹 Organizar resultados por sensor
    const resultadosMap = new Map();

    rows.forEach((row) => {
      const fechaBogotaISO = row.fecha.toISOString().replace("Z", "-05:00");

      if (!resultadosMap.has(row.sensor_id)) {
        resultadosMap.set(row.sensor_id, []);
      }
      resultadosMap.get(row.sensor_id).push({
        fecha: fechaBogotaISO,
        laeq_slow: row.laeq_slow,
      });
    });

    const resultados = Array.from(resultadosMap.entries()).map(
      ([sensor, datos]) => ({
        sensor,
        datos,
      })
    );

    res.json(resultados);
  } catch (error) {
    console.error("❌ Error en getLaeqSemana:", error);
    res.status(500).json({ error: "Error en el servidor." });
  }
};


// 📌 Controlador para obtener datos mensuales desde resumen_diario_24h, resumen_diario_dia, resumen_diario_noche
// 📌 Controlador para obtener datos mensuales desde `resumen_diario_24h`, `resumen_diario_dia` y `resumen_diario_noche`
const getLaeqMes = async (req, res) => {
  try {
    const { sensores, mes, anio, tipoResumen } = req.body;

    if (!sensores || sensores.length === 0 || !mes || !anio) {
      return res.status(400).json({ error: "Faltan sensores, mes o año en la consulta." });
    }

    // Tabla según tipo
    let tabla = "resumen_iot.resumen_diario_24h";
    if (tipoResumen === "dia") tabla = "resumen_iot.resumen_diario_dia";
    else if (tipoResumen === "noche") tabla = "resumen_iot.resumen_diario_noche";

    ////console.log(`📆 Consultando ${tipoResumen} para ${mes}-${anio} en sensores:`, sensores);

const query = `
SELECT sensor_id,
       fecha::timestamp AS fecha_utc,
       laeq_slow
FROM ${tabla}
WHERE sensor_id = ANY($1)
  AND EXTRACT(MONTH FROM fecha) = $2
  AND EXTRACT(YEAR FROM fecha) = $3
ORDER BY sensor_id, fecha_utc;

`;


    const { rows } = await pool.query(query, [sensores, mes, anio]);

    let resultados = {};
    rows.forEach(row => {
      if (!resultados[row.sensor_id]) {
        resultados[row.sensor_id] = [];
      }
      resultados[row.sensor_id].push({
        fecha: row.fecha_utc, // 👈 ahora sí corresponde al query
        laeq_slow: row.laeq_slow,
      });
      
    });

    //console.log("✅ Datos enviados:", resultados);
    res.json(resultados);

  } catch (error) {
    console.error("❌ Error en getLaeqMes:", error);
    res.status(500).json({ error: "Error en el servidor." });
  }
};




module.exports = { getExceedanceCountsForAllSensors };

module.exports = {
  getPromedioLAeqPorHora,
  getSensores,
  getLast30DaysData,
  getAveragesForAllSensors,
  getExceedanceCountsForAllSensors,
  getLaeqSemana,
  getLaeqMes
};