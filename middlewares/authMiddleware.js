const jwt = require('jsonwebtoken');

// Verificar token desde cookie
const verificarToken = (req, res, next) => {
  const token = req.cookies.token;
  console.log("Token recibido en la cookie:", token);
  if (!token) return res.redirect('/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    console.error("Error al verificar el token:", err);
    return res.redirect('/login');
  }
};

// Verificar token desde headers
const verificarTokenAPI = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado, token no proporcionado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Verificar roles permitidos
const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Acceso prohibido: no tienes permisos' });
    }
    next();
  };
};

module.exports = {
  verificarToken,
  verificarTokenAPI,
  permitirRoles
};
