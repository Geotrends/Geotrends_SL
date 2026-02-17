document.addEventListener('DOMContentLoaded', () => {
  const API_URL = '/api/usuarios';
  const tabla = document.querySelector('#tablaUsuarios tbody');
  const form = document.getElementById('formUsuario');
  const inputUsuario = document.getElementById('usuario');
  const inputContraseña = document.getElementById('contraseña');
  const selectRol = document.getElementById('rol');
  const botonLogout = document.getElementById('logout');

  const token = localStorage.getItem('token');
  console.log('🟡 Token leído en dashboard:', token);

  if (!token) {
    console.warn('🔴 Token no encontrado, redirigiendo al login...');
    window.location.href = '/login.html';
    return;
  }

  let usuarios = [];

  const cargarUsuarios = async () => {
    try {
      const res = await fetch(API_URL, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      const contentType = res.headers.get('Content-Type');

      if (!res.ok) {
        const texto = await res.text();
        console.warn('Error al cargar usuarios:', texto);

        if (texto.includes('<!DOCTYPE')) {
          localStorage.removeItem('token');
          window.location.href = '/login.html';
        }

        return;
      }

      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        usuarios = data;
        renderizarTabla();
      } else {
        console.warn('⚠️ Respuesta inesperada:', await res.text());
        localStorage.removeItem('token');
        window.location.href = '/login.html';
      }
    } catch (error) {
      console.error('Error de red o servidor:', error);
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    }
  };

  const renderizarTabla = () => {
    tabla.innerHTML = '';
    usuarios.forEach(usuario => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${usuario.id}</td>
        <td>${usuario.usuario}</td>
        <td>${usuario.rol}</td>
        <td>${new Date(usuario.creado).toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-primary me-1" onclick="editarUsuario(${usuario.id})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
        </td>
      `;
      tabla.appendChild(fila);
    });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoUsuario = {
      usuario: inputUsuario.value,
      contraseña: inputContraseña.value,
      rol: selectRol.value
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(nuevoUsuario)
      });

      if (!res.ok) {
        const texto = await res.text();
        console.error('Error al crear usuario:', texto);
        return;
      }

      form.reset();
      await cargarUsuarios();
    } catch (err) {
      console.error('Error al crear usuario:', err);
    }
  });

  async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      await cargarUsuarios();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
    }
  }
  window.eliminarUsuario = eliminarUsuario;

  async function editarUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;

    document.getElementById('editarIdUsuario').value = usuario.id;
    document.getElementById('editarUsuario').value = usuario.usuario;
    document.getElementById('editarRol').value = usuario.rol;
    document.getElementById('editarContraseña').value = '';
    document.getElementById('editarCorreo').value = usuario.correo || '';

    const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
    modal.show();
  }
  window.editarUsuario = editarUsuario;

  // Manejador del formulario modal
  document.getElementById('formEditarUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editarIdUsuario').value;
    const usuario = document.getElementById('editarUsuario').value;
    const contraseña = document.getElementById('editarContraseña').value;
    const rol = document.getElementById('editarRol').value;
    const correo = document.getElementById('editarCorreo').value;

    try {
      await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ usuario, contraseña, rol, correo })
      });

      const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
      modal.hide();

      await cargarUsuarios();
    } catch (err) {
      console.error('Error al editar usuario:', err);
    }
  });

  // ✅ Botón de cerrar sesión
  if (botonLogout) {
    botonLogout.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = '/login';
    });
  }

  // ✅ Carga inicial de usuarios
  cargarUsuarios();
});
const scriptUsuarios = document.createElement('script');
scriptUsuarios.src = '/js/usuarios.js';
document.body.appendChild(scriptUsuarios);