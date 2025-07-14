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

exports.getPuntosPorMunicipio = async (req, res) => {
  const nombre = req.params.nombre;
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
        sum_Total
      FROM mapa_dinamico.amva_puntos
      WHERE municipio = $1 AND geom IS NOT NULL;
    `;
    const { rows } = await pool.query(query, [nombre]);

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
    console.error("❌ Error al obtener puntos por municipio:", error.message);
    res.status(500).json({ message: "Error al obtener datos", error: error.message });
  }
};

// --- Añadir función getIsocurvas ---
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

exports.getIsocurvas = (req, res) => {
  const municipio = req.params.municipio;
  if (!municipio || municipio === 'undefined') {
    return res.status(400).json({ error: "Debe especificar un municipio válido." });
  }

  const scriptPath = path.join(__dirname, '../../scripts/generar_isocurvas.py');
  const geojsonPath = path.join(__dirname, `../../scripts/isocurvas_${municipio.toLowerCase()}.geojson`);
  const pythonPath = path.join(__dirname, '../../.venv/bin/python3');

  exec(`${pythonPath} ${scriptPath} "${municipio}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error al ejecutar el script: ${error.message}`);
      return res.status(500).json({ error: 'Error al generar isocurvas' });
    }

    fs.readFile(geojsonPath, 'utf8', (err, data) => {
      if (err) {
        console.error('❌ Error al leer el archivo GeoJSON generado:', err.message);
        return res.status(500).json({ error: 'Archivo GeoJSON no encontrado' });
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    });
  });
};