function iniciarPerfil() {
  document.querySelector('.perfil').style.visibility = 'hidden';
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const payload = JSON.parse(atob(token.split('.')[1]));
  const usuario = payload.usuario;

  // Verifica si los elementos existen antes de operar
  const spanUsuario = document.getElementById('perfilUsuario');
  if (!spanUsuario) return;

  fetch(`/api/usuarios/perfil/${usuario}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById('perfilUsuario').textContent = data.usuario;
      document.getElementById('perfilNombre').textContent = data.nombre || '-';
      document.getElementById('perfilApellidos').textContent = data.apellidos || '-';
      document.getElementById('perfilCorreo').textContent = data.correo || '-';
      document.getElementById('perfilOrganizacion').textContent = data.organizacion || '-';
      document.getElementById('perfilRolOrg').textContent = data.rol_organizacion || '-';
      document.getElementById('perfilRol').textContent = data.rol;
      document.getElementById('perfilFecha').textContent = new Date(data.creado).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
      document.getElementById('perfilUltimoAcceso').textContent = new Date(data.ultimo_acceso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

      // ✅ Mostrar la foto actual si existe
      if (data.foto) {
        document.getElementById('fotoPerfil').src = `data:image/jpeg;base64,${data.foto}`;
      }
      document.querySelector('.perfil').style.visibility = 'visible';
    })
    .catch(err => {
      console.error('Error al cargar perfil:', err);
    });

  // Subir nueva foto
  const inputFoto = document.getElementById('inputFoto');
  if (inputFoto) {
    inputFoto.addEventListener('change', async () => {
      const archivo = inputFoto.files[0];
      if (!archivo) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('fotoPerfil').src = e.target.result;
      };
      reader.readAsDataURL(archivo);

      const formData = new FormData();
      formData.append('foto', archivo);

      try {
        const res = await fetch(`/api/usuarios/foto/${usuario}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const resultado = await res.json();
        if (!resultado.ok) {
          alert('No se pudo actualizar la foto');
        }
      } catch (err) {
        console.error('Error al subir foto:', err);
      }
    });
  }

  const btnPass = document.getElementById('btnMostrarCambioPass');
  if (btnPass) {
    btnPass.addEventListener('click', () => {
      const seccion = document.getElementById('seccionCambioPassword');
      if (seccion.classList.contains('d-none')) {
        cargarFormularioCambioPassword();
        seccion.classList.remove('d-none');
      } else {
        seccion.classList.add('d-none');
      }
    });
  }

  const btnEditar = document.getElementById('btnEditarPerfil');
  if (btnEditar) {
    btnEditar.addEventListener('click', () => {
      const seccion = document.getElementById('seccionEditarPerfil');
      if (seccion.classList.contains('d-none')) {
        cargarFormularioEditarPerfil(token, usuario);
        seccion.classList.remove('d-none');
      } else {
        seccion.classList.add('d-none');
      }
    });
  }

  fetch(`/api/usuarios/bitacora/${usuario}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(accesos => {
      const lista = document.getElementById('listaBitacora');
      if (!lista) return;
      lista.innerHTML = '';
      accesos.forEach(acc => {
        const fechaUTC = new Date(acc.fecha);
        if (!isNaN(fechaUTC)) {
          const fechaLocal = fechaUTC.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
          const li = document.createElement('li');
          li.textContent = `${fechaLocal} desde ${acc.direccion_ip}`;
          lista.appendChild(li);
        }
      });
    })
    .catch(err => {
      console.error('Error al cargar bitácora:', err);
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPerfil);
} else {
  iniciarPerfil();
}

function cargarFormularioCambioPassword() {
  fetch('/html/secciones/cambiar_password.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('seccionCambioPassword').innerHTML = html;
    });
}

function cargarFormularioEditarPerfil(token, usuario) {
  fetch('/html/secciones/editar_perfil.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('seccionEditarPerfil').innerHTML = html;

      fetch(`/api/usuarios/perfil/${usuario}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          document.getElementById('nombre').value = data.nombre || '';
          document.getElementById('apellidos').value = data.apellidos || '';
          document.getElementById('correo').value = data.correo || '';
          document.getElementById('organizacion').value = data.organizacion || '';
          document.getElementById('rol_organizacion').value = data.rol_organizacion || '';

          const form = document.getElementById('formEditarPerfil');
          const mensaje = document.getElementById('mensajeEditarPerfil');

          form.addEventListener('submit', (e) => {
            e.preventDefault();

            const datos = {
              nombre: form.nombre.value,
              apellidos: form.apellidos.value,
              correo: form.correo.value,
              organizacion: form.organizacion.value,
              rol_organizacion: form.rol_organizacion.value
            };

            fetch(`/api/usuarios/perfil/${usuario}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(datos)
            })
              .then(res => res.json())
              .then(res => {
                mensaje.textContent = '✅ Perfil actualizado correctamente';
                mensaje.classList.remove('d-none');
              })
              .catch(err => {
                mensaje.textContent = '❌ Error al actualizar perfil';
                mensaje.classList.remove('d-none');
              });
          });
        });
    });
}