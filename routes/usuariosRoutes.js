const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarTokenAPI, permitirRoles } = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer(); // memoria

// Ruta pública
router.post('/login', usuariosController.loginUsuario);

// Middleware de protección con token
router.use(verificarTokenAPI);

// Rutas protegidas con control de roles
router.get('/', permitirRoles('admin', 'gestor'), usuariosController.obtenerUsuarios);
router.post('/', permitirRoles('admin'), usuariosController.crearUsuario);
router.get('/:id', permitirRoles('admin', 'gestor'), usuariosController.obtenerUsuarioPorId);
router.put('/:id', permitirRoles('admin'), usuariosController.actualizarUsuario);
router.delete('/:id', permitirRoles('admin'), usuariosController.eliminarUsuario);
router.post('/cambiar-password', usuariosController.cambiarPassword);
router.put('/perfil/:usuario', verificarTokenAPI, usuariosController.actualizarPerfil);
router.put('/foto/:usuario', verificarTokenAPI, upload.single('foto'), usuariosController.actualizarFoto);
router.get('/perfil/:usuario', usuariosController.obtenerPerfilPorUsuario);
router.get('/bitacora/:usuario', usuariosController.obtenerBitacoraPorUsuario);

module.exports = router;
