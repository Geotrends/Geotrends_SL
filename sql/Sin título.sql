CREATE TABLE usuarios.usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL, -- Aquí se guardan contraseñas cifradas (hashes)
    rol VARCHAR(20) NOT NULL DEFAULT 'usuario',
    creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN DEFAULT TRUE,
    CONSTRAINT rol_valido CHECK (rol IN ('admin', 'gestor', 'usuario'))
);
