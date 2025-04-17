// middleware/verificarToken.js
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token inválido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // lo puedes usar después
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token expirado o inválido' });
  }
}

module.exports = verificarToken;
