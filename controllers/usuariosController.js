const pool = require('../db/conexion');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Crear usuario
exports.crearUsuario = async (req, res) => {
  const { usuario, contraseña, rol } = req.body;

  const rolesPermitidos = ['admin', 'gestor', 'usuario'];
  const rolAsignado = rolesPermitidos.includes(rol) ? rol : 'usuario';

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    const result = await pool.query(
      `INSERT INTO usuarios.usuarios (usuario, contraseña, rol) 
       VALUES ($1, $2, $3) RETURNING id, usuario, rol, creado`,
      [usuario, hashedPassword, rolAsignado]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los usuarios
exports.obtenerUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, usuario, rol, creado, organizacion FROM usuarios.usuarios ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Obtener usuario por ID
exports.obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT id, usuario, creado, organizacion FROM usuarios.usuarios WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar usuario
exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { usuario, contraseña } = req.body;

  try {
    let query = 'UPDATE usuarios.usuarios SET usuario = $1';
    const params = [usuario];

    if (contraseña) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(contraseña, salt);
      query += ', contraseña = $2 WHERE id = $3 RETURNING *';
      params.push(hashedPassword, id);
    } else {
      query += ' WHERE id = $2 RETURNING *';
      params.push(id);
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar usuario
exports.eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM usuarios.usuarios WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login con JWT y registro de acceso
exports.loginUsuario = async (req, res) => {
  const { usuario, contraseña } = req.body;
  const direccion_ip = req.ip || req.connection.remoteAddress;

  try {
    const result = await pool.query(
      'SELECT id, usuario, contraseña, rol, organizacion FROM usuarios.usuarios WHERE usuario = $1 AND estado = TRUE',
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuarioBD = result.rows[0];
    const contraseñaValida = await bcrypt.compare(contraseña, usuarioBD.contraseña);

    if (!contraseñaValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    await pool.query(
      'INSERT INTO usuarios.log_accesos (usuario_id, direccion_ip) VALUES ($1, $2)',
      [usuarioBD.id, direccion_ip]
    );

    console.log('Valor de organizacion para el token:', usuarioBD.organizacion);

    const token = jwt.sign(
      { id: usuarioBD.id, usuario: usuarioBD.usuario, rol: usuarioBD.rol, organizacion: usuarioBD.organizacion.normalize("NFC") },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // ✅ Enviamos el token como JSON, NO como cookie
    res.json({ mensaje: 'Login exitoso', token });

  } catch (error) {
    console.error('Error en loginUsuario:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.cambiarPassword = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1];
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }

  const { actual, nueva } = req.body;

  try {
    // Verificamos la contraseña actual
    const userResult = await pool.query(
      'SELECT contraseña FROM usuarios.usuarios WHERE id = $1',
      [payload.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const contraseñaCorrecta = await bcrypt.compare(actual, userResult.rows[0].contraseña);
    if (!contraseñaCorrecta) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Encriptamos la nueva
    const nuevaHash = await bcrypt.hash(nueva, 10);

    await pool.query(
      'UPDATE usuarios.usuarios SET contraseña = $1, actualizado = NOW() WHERE id = $2',
      [nuevaHash, payload.id]
    );

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en cambiarPassword:', error);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
};

exports.actualizarPerfil = async (req, res) => {
  const { usuario } = req.params;
  const { nombre, apellidos, correo, organizacion, rol_organizacion } = req.body;

  try {
    const result = await pool.query(
      `UPDATE usuarios.usuarios
       SET nombre = $1,
           apellidos = $2,
           correo = $3,
           organizacion = $4,
           rol_organizacion = $5,
           actualizado = NOW()
       WHERE usuario = $6
       RETURNING id, usuario, nombre, apellidos, correo, organizacion, rol_organizacion, actualizado`,
      [nombre, apellidos, correo, organizacion, rol_organizacion, usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({ mensaje: 'Perfil actualizado', usuario: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


exports.obtenerPerfilPorUsuario = async (req, res) => {
  const { usuario } = req.params;

  try {
    const result = await pool.query(`
      SELECT id, usuario, nombre, apellidos, correo, organizacion, rol_organizacion, rol, creado,
        (SELECT MAX(fecha_acceso) FROM usuarios.log_accesos WHERE usuario_id = u.id) AS ultimo_acceso, encode(foto, 'base64') as foto
      FROM usuarios.usuarios u
      WHERE usuario = $1
    `, [usuario]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerBitacoraPorUsuario = async (req, res) => {
  const { usuario } = req.params;

  try {
    const usuarioRes = await pool.query(
      'SELECT id FROM usuarios.usuarios WHERE usuario = $1',
      [usuario]
    );

    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioId = usuarioRes.rows[0].id;

    const bitacora = await pool.query(
      'SELECT fecha_acceso AS fecha, direccion_ip FROM usuarios.log_accesos WHERE usuario_id = $1 ORDER BY fecha_acceso DESC LIMIT 10',
      [usuarioId]
    );

    res.json(bitacora.rows);
  } catch (err) {
    console.error('Error al obtener bitácora:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarFoto = async (req, res) => {
  const { usuario } = req.params;
  const fotoBuffer = req.file?.buffer;

  if (!fotoBuffer) return res.status(400).json({ error: 'No se recibió la imagen' });

  try {
    await pool.query(
      'UPDATE usuarios.usuarios SET foto = $1, actualizado = NOW() WHERE usuario = $2',
      [fotoBuffer, usuario]
    );

    const fotoBase64 = fotoBuffer.toString('base64');
    res.status(200).json({ ok: true, foto: fotoBase64 });
  } catch (err) {
    console.error('Error al actualizar foto:', err);
    res.status(500).json({ error: 'Error interno al guardar la foto' });
  }
};
