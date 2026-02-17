document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('formLogin');
  const inputUsuario = document.getElementById('usuario');
  const inputContraseña = document.getElementById('contraseña');
  const mensajeError = document.getElementById('mensajeError');

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario = inputUsuario.value.trim();
    const contraseña = inputContraseña.value.trim();

    try {
      const res = await fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contraseña })
      });

      const data = await res.json();

      if (!res.ok) {
        mensajeError.textContent = data.error || 'Credenciales inválidas';
        mensajeError.classList.remove('d-none');
        return;
      }

      // ✅ Guardamos el token en localStorage
      localStorage.setItem('token', data.token);

// Decodificar el token para guardar el rol (opcional pero útil)
const payload = JSON.parse(atob(data.token.split('.')[1]));
localStorage.setItem('rol', payload.rol);
localStorage.setItem('usuario', payload.usuario);


      // Redirigimos a la página inicial
      // Luego de login exitoso
window.location.href = '/html/inicio.html';

    } catch (err) {
      mensajeError.textContent = 'Error de conexión con el servidor';
      mensajeError.classList.remove('d-none');
    }
  });
});
