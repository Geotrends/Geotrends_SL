const express = require('express');
const router = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');

function verificarTokenDesdeCookie(req, res, next) {
  const token = req.cookies.token;
  console.log("TOKEN EN RUTA:", token); // Debug
  if (!token) return res.redirect('/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Usuario decodificado:", decoded);
    req.usuario = decoded;
    next();
  } catch (err) {
    console.error("Token inválido:", err);
    return res.redirect('/login');
  }
}

router.get('/', verificarTokenDesdeCookie, (req, res) => {
  if (req.usuario.rol === 'admin') return res.redirect('/dashboard');
  else return res.redirect('/inicio');
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'html', 'login.html'));
});

router.get('/login.html', (req, res) => res.redirect('/login'));

router.get('/inicio', verificarTokenDesdeCookie, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'html', 'inicio.html'));
});

router.get('/dashboard', verificarTokenDesdeCookie, (req, res) => {
  if (req.usuario.rol !== 'admin') return res.redirect('/inicio');
  res.sendFile(path.join(__dirname, '..', 'public', 'html', 'dashboard', 'index.html'));
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
