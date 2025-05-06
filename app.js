const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middlewares
app.use(cors()); // Puedes configurar orígenes si es necesario
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

app.use("/api", require("./routes/informesRoutes"));

const os = require('os');

const networkInterfaces = os.networkInterfaces();
const localIP = Object.values(networkInterfaces)
  .flat()
  .find((iface) => iface.family === 'IPv4' && !iface.internal)?.address;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en:`);
  console.log(`→ Localhost: http://localhost:${PORT}`);
  if (localIP) console.log(`→ Red local: http://${localIP}:${PORT}`);
});