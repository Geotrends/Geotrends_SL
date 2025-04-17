const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middlewares
app.use(cors()); // Puedes configurar orígenes si es necesario
app.use(express.json());
app.use(cookieParser());

// ✅ Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// Redirigir a login.html si acceden a "/"
app.get('/', (req, res) => {
  res.redirect('/html/login.html');
});


// ✅ Rutas de la API
const usuariosRoutes = require('./routes/usuariosRoutes');
app.use('/api/usuarios', usuariosRoutes);

const rancheraRoutes = require('./routes/rancheraRoutes');
app.use('/api/ranchera', rancheraRoutes);

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
