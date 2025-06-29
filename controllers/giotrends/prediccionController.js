const { exec } = require('child_process');
const path = require('path');

const { secondaryPool: pool } = require('../../db/conexion'); // Importar la conexión a la base de datos

exports.realizarPrediccion = (req, res) => {
  const { sensor_id, desde, hasta } = req.query;

  if (!sensor_id || !desde || !hasta) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: sensor_id, desde, hasta' });
  }

  const scriptPath = path.join(__dirname, '..', 'scripts', 'predecir_rango.py');
  const args = [sensor_id, desde, hasta].join(' ');

  exec(`.venv/bin/python3 ${scriptPath} ${args}`, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      return res.status(500).json({ error: 'Error al ejecutar la predicción' });
    }

    try {
      const resultado = JSON.parse(stdout);
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ error: 'Error al parsear salida de la predicción', raw: stdout });
    }
  });
};

exports.sensoresDisponibles = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.sensor_id, 
        s.referencia, 
        s.barrio, 
        MIN(rh.fecha) as inicio, 
        MAX(rh.fecha) as fin, 
        COUNT(*) as cantidad
      FROM resumen_iot.resumen_horario rh
      JOIN sensores s ON rh.sensor_id = s.sensor_id
      GROUP BY s.sensor_id, s.referencia, s.barrio
      HAVING COUNT(*) > 150
      ORDER BY s.sensor_id;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error consultando sensores disponibles:", error);
    res.status(500).json({ error: "No se pudieron consultar sensores disponibles" });
  }
};