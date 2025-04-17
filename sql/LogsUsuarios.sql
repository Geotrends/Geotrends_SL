CREATE TABLE usuarios.log_accesos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios.usuarios(id) ON DELETE CASCADE,
    fecha_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    direccion_ip VARCHAR(45)
);
