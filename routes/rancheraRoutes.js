const express = require('express');
const router = express.Router();
const rancheraController = require('../controllers/rancheraController');

router.get('/resumen', rancheraController.obtenerResumenDashboard);
router.get('/indicadores-semilla', rancheraController.obtenerIndicadoresSemilla);
router.get('/proxy-img', rancheraController.proxyImagenInstagram);
router.get('/graficos-descriptivos', rancheraController.obtenerGraficosDescriptivos);
router.get('/stats-semilla', rancheraController.obtenerEstadisticasSemilla);
router.get('/linea-tiempo', rancheraController.obtenerLineaTiempoSemillas);
router.post('/biografias-wordcloud', rancheraController.obtenerBiografiasWordCloud);

// perfiles
// routes/rancheraRoutes.js
router.post('/perfiles-por-fuente', rancheraController.obtenerPerfilesPorFuente);
//router.get('/perfil/:id/seguidores', rancheraController.obtenerSeguidoresPorFuente);
module.exports = router;
