console.log('🔧 usuarios.js cargado dinámicamente');

// Esperar jQuery antes de ejecutar
function esperarJQuery(callback) {
  if (window.jQuery && typeof $ === 'function') {
    callback();
  } else {
    console.warn('⌛ Esperando jQuery...');
    setTimeout(() => esperarJQuery(callback), 100);
  }
}

esperarJQuery(() => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarUsuarios);
  } else {
    iniciarUsuarios();
  }
});

function iniciarUsuarios() {
  const token = localStorage.getItem('token');
  if (!token) return window.location.href = '/login.html';

  let tabla;

  // Inicializar DataTable
  tabla = $('#tablaUsuarios').DataTable({
    responsive: true,
    language: {
      url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/en.json'
    },
    columns: [
      { data: 'id' },
      { data: 'usuario' },
      { data: 'rol' },
      {
        data: 'creado',
        render: data => new Date(data).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })
      },
      {
        data: null,
        render: (data, type, row) => `
          <button class="btn-editar btn btn-outline-secondary btn-sm" data-id="${row.id}">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-eliminar btn btn-outline-danger btn-sm" data-id="${row.id}">
            <i class="fas fa-trash"></i>
          </button>
        `
      }
    ]
  });

  // Cargar usuarios desde backend
  fetch('/api/usuarios', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (!res.ok) throw new Error('Unauthorized or server error');
      return res.json();
    })
    .then(data => {
      console.log('✅ Usuarios cargados:', data);
      tabla.clear().rows.add(data).draw();
    })
    .catch(err => console.error('❌ Error al cargar usuarios:', err));

  // Mostrar formulario de nuevo usuario
  const btnNuevo = document.getElementById('btnNuevoUsuario');
  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => {
      fetch('/html/secciones/form_usuario.html')
        .then(res => res.text())
        .then(html => {
          const contenedor = document.getElementById('formularioUsuario');
          contenedor.innerHTML = html;
          contenedor.classList.remove('d-none');
          inicializarFormularioNuevoUsuario();
        });
    });
  }

  // Eliminar usuario
  $('#tablaUsuarios tbody').on('click', '.btn-eliminar', function () {
    const id = this.dataset.id;
    if (confirm('¿Eliminar usuario?')) {
      fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(() => {
          tabla.row($(this).parents('tr')).remove().draw();
        })
        .catch(err => console.error('❌ Error al eliminar:', err));
    }
  });
}

function inicializarFormularioNuevoUsuario() {
  const form = document.getElementById('formNuevoUsuario');
  const token = localStorage.getItem('token');
  const mensaje = document.getElementById('mensajeForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const datos = {
      usuario: form.usuario.value.trim(),
      contraseña: form.contraseña.value,
      rol: form.rol.value,
      correo: form.correo.value.trim() // Agregado el campo correo
    };

    fetch('/api/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(datos)
    })
      .then(res => res.json())
      .then(data => {
        mensaje.textContent = '✅ User created successfully';
        mensaje.classList.remove('d-none');
        setTimeout(() => window.location.reload(), 1000);
      })
      .catch(() => {
        mensaje.textContent = '❌ Error creating user';
        mensaje.classList.remove('d-none');
      });
  });

  document.getElementById('btnCancelar').addEventListener('click', () => {
    document.getElementById('formularioUsuario').innerHTML = '';
    document.getElementById('formularioUsuario').classList.add('d-none');
  });
}
