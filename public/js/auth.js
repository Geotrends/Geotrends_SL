function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`;
  }).join(''));
  return JSON.parse(jsonPayload);
}

function verificarLogin(rolesPermitidos = []) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/html/login.html';
    return;
  }

  try {
    const payload = parseJwt(token);
    const rolUsuario = payload.rol;
    const empresaUsuario = payload.organizacion;

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(rolUsuario)) {
      window.location.href = '/html/inicio.html';
      return;
    }

    const headerUser = document.getElementById('usuarioActivo');
    if (headerUser) {
      headerUser.textContent = `${payload.usuario} (${rolUsuario}) - ${empresaUsuario}`;
    }
  } catch (e) {
    localStorage.clear();
    window.location.href = '/html/login.html';
  }
}

const token = localStorage.getItem('token');
if (token) {
  const payload = parseJwt(token);
  const usuario = payload.usuario;

  fetch(`/api/usuarios/perfil/${usuario}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      const img = document.getElementById('headerFotoPerfil');
      if (img && data.foto) {
        img.src = `data:image/jpeg;base64,${data.foto}`;
      }
    })
    .catch(err => {
      console.error('No se pudo cargar la foto del header:', err);
    });
}