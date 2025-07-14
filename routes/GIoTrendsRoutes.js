const express = require('express');
const router = express.Router();

// ⚙️ Importar funciones de configuración de sensores
const {
  getSensores: getAllSensores,
  getSensorById,
  updateSensor
} = require('../controllers/giotrends/settingsController');

const {
  getPromedioLAeqPorHora,
  getSensores,
  getLast30DaysData,
  getAveragesForAllSensors,
  getExceedanceCountsForAllSensors,
  getLaeqSemana,
  getLaeqMes
} = require('../controllers/giotrends/analiticaController');

// 📄 Importar funciones de informes PDF
const {
  generarInformeMapa,
  generarInformeHistorico,
  generarInformeAnaliticaHora,
  generarInformeAnaliticaSemana,
  generarInformeAnaliticaMes,
  generarInformeAnaliticaResumen,
  generarPDFModalSemanal
} = require('../controllers/giotrends/informesController');

const { getSensores: getSensoresHistoricos, getLaeqByTableAndDateRange } = require('../controllers/giotrends/historicosController');

// 📌 Controlador de monitoreo IoT
const dataController = require('../controllers/giotrends/dataController');
// 🗺️ Importar funciones del controlador de mapas/cartografía
const {
  getMapData,
  getTablesWithGeometry,
  getTableDataForLeaflet
} = require('../controllers/giotrends/mapController');
const { getPaisajeSonoroData } = require('../controllers/giotrends/merController');

// 🟦 Importar función getWeeklyData para análisis modal semanal
const { getWeeklyData } = require('../controllers/giotrends/modalController');
// 🔮 Importar funciones de predicción de ruido
const {
  realizarPrediccion,
  sensoresDisponibles
} = require('../controllers/giotrends/prediccionController');

// Importar funciones del controlador dinamicoController
const { getMunicipios, getGeometriaMunicipio, getPuntosPorMunicipio, getIsocurvas } = require('../controllers/giotrends/dinamicoController');


// 📌 Rutas de analítica IoT
router.get('/analitica/ultimos-30-dias', getLast30DaysData);
router.get('/analitica/promedios-sensores', getAveragesForAllSensors);
router.get('/analitica/superan-umbrales', getExceedanceCountsForAllSensors);
router.get('/analitica/sensores', getSensores);
router.post('/analitica/laeq-hora', getPromedioLAeqPorHora);
router.post('/analitica/laeq-semana', getLaeqSemana);
router.post('/analitica/laeq-mes', getLaeqMes);


// 📌 Rutas de monitoreo IoT (datos recientes)
router.get('/monitoreo/sensores', dataController.getSensors);
router.get('/monitoreo/sensores/todos', dataController.getAllSensors);
router.get('/monitoreo/datos', dataController.getSensorsData);
router.get('/monitoreo/datos-recientes', dataController.getLatestSensorsData);
router.get('/monitoreo/sensor/:sensor_id', dataController.getSensorData);

// 📊 Rutas de históricos (consulta por sensor y fechas)
router.get('/historicos/sensores', getSensoresHistoricos);
router.get('/historicos/sensor/:tabla/:indicador', getLaeqByTableAndDateRange);



// 📄 Rutas de informes PDF
router.post('/informes/descargar-informe-mapa', generarInformeMapa);
router.post('/informes/descargar-informe-historico', generarInformeHistorico);
router.post('/informes/descargar-analitica-hora', generarInformeAnaliticaHora);
router.post('/informes/descargar-analitica-semana', generarInformeAnaliticaSemana);
router.post('/informes/descargar-analitica-mes', generarInformeAnaliticaMes);
router.post('/informes/descargar-analitica-resumen', generarInformeAnaliticaResumen);
router.post('/informes/modal-semanal', generarPDFModalSemanal);


// 🗺️ Rutas de mapa e información cartográfica
router.get('/mapa/data', getMapData);
router.get('/mapa/cartobase/tables', getTablesWithGeometry);
router.get('/mapa/cartobase/data/:tableName', getTableDataForLeaflet);

router.get('/mapa/paisaje-sonoro', getPaisajeSonoroData);

// 🟦 Ruta para análisis modal semanal
router.get('/modals/weekly-data/:sensorId', getWeeklyData);


//mer
const { getCapasJerarquicas, getTablaGeometria, getPoligonoByCoords } = require('../controllers/giotrends/merController');

router.get('/mapa/mer/capas-jerarquia', getCapasJerarquicas);
router.get('/mapa/mer/tabla/:tabla', getTablaGeometria);

// Consulta polígono de interés por coordenadas (lng, lat)
router.get('/consulta/poligono', getPoligonoByCoords);

// 🔮 Rutas de predicción de ruido
router.get('/prediccion', realizarPrediccion);
router.get('/prediccion/sensores', sensoresDisponibles);

// ⚙️ Rutas de configuración de sensores
router.get('/settings', getAllSensores);
router.get('/settings/:id', getSensorById);
router.put('/settings/:id', updateSensor);

// Nueva ruta para obtener municipios
router.get('/dinamico/municipios', getMunicipios);
router.get('/dinamico/municipios/:nombre', getGeometriaMunicipio);
router.get('/dinamico/puntos/:nombre', getPuntosPorMunicipio);
router.get('/dinamico/isocurvas/:municipio', getIsocurvas);

module.exports = router;