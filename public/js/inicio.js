document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  function parseJwt(token) {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`;
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  }

  const payload = parseJwt(token);
  const { usuario, rol, organizacion } = payload;
  const empresa = organizacion
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  // console.log("DEBUG - Token payload:", payload);
  // console.log("DEBUG - Usuario:", usuario);
  // console.log("DEBUG - Rol:", rol);
  // console.log("DEBUG - Organización:", organizacion);

  // Mostrar usuario en el header
  const infoUsuario = document.getElementById("infoUsuario");
  if (infoUsuario) {
    infoUsuario.textContent = `${usuario} (${rol})`;
  }

  // Sidebar
  const sidebar = document.getElementById("sidebar");
  let opcionesSidebar = [];

  const empresaId = empresa
    ?.toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/gi, "");
  const rutaMenu = `/JSON/${empresaId}.json`;
  console.log("🌐 Buscando menú JSON para:", empresaId);

  fetch(rutaMenu)
    .then((res) => {
      if (!res.ok) throw new Error("No se pudo cargar el menú");
      return res.json();
    })
    .then((menuJson) => {
      if (menuJson[rol]) {
        opcionesSidebar = menuJson[rol];
        construirSidebar();
      } else {
        mostrarSidebarBasico();
      }
    })
    .catch((err) => {
      console.error("❌ Error al cargar menú de empresa:", err);
      mostrarSidebarBasico();
    });

  function mostrarSidebarBasico() {
    opcionesSidebar = [
      { texto: "Mi perfil", page: "/html/secciones/perfil.html" },
      { texto: "Cerrar sesión", page: "/html/logout.html" },
    ];
    construirSidebar();
  }

  function construirSidebar() {
    const contenedorOpcionesSidebar = document.createDocumentFragment();

    contenedorOpcionesSidebar.appendChild(
      crearEnlaceMenu("Inicio", "/html/secciones/inicio_bienvenida.html")
    );

    opcionesSidebar.forEach((item) => {
      if (item.submenu) {
        contenedorOpcionesSidebar.appendChild(
          crearSubmenu(item.texto, item.submenu)
        );
      } else {
        contenedorOpcionesSidebar.appendChild(
          crearEnlaceMenu(item.texto, item.page)
        );
      }
    });

    sidebar.innerHTML = "";
    sidebar.appendChild(contenedorOpcionesSidebar);

    // Menú de configuración del header
    const configMenu = document.getElementById("configMenu");
    if (configMenu) {
      configMenu.innerHTML = "";
      opcionesSidebar.forEach(({ texto, page }) => {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = texto;
        link.dataset.page = page;
        configMenu.appendChild(link);
      });
    }
  }

  // Evento para mostrar el menú de configuración
  const btnConfig = document.getElementById("btnConfig");
  const configMenu = document.getElementById("configMenu");
  if (btnConfig && configMenu) {
    btnConfig.addEventListener("click", () => {
      configMenu.classList.toggle("d-none");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".settings-dropdown")) {
        configMenu.classList.add("d-none");
      }
    });
  }

  // Sidebar toggle
  const toggleBtn = document.getElementById("toggleSidebar");
  const mainContent = document.getElementById("mainContent");
  if (toggleBtn && sidebar && mainContent) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("closed");
      mainContent.classList.toggle("sidebar-closed");
    });
  }

  // Delegación para cargar páginas dinámicas (sidebar + config menu)
  document.addEventListener("click", async (e) => {
    const link = e.target.closest("[data-page]");
    if (link) {
      e.preventDefault();
      const url = link.dataset.page;
      if (url) {
        try {
          const res = await fetch(url);
          const html = await res.text();
          const container = document.getElementById("contenidoDinamico");
          container.innerHTML = html;

          // Detectar si es una vista de la sección Ranchera
          if (url.includes("/ranchera/")) {
            // Cargar el script asociado según el archivo HTML
            if (url.includes("index.html")) {
              import("/js/ranchera/main.js").then((mod) => {
                mod.inicializarDashboardRanchera();
              });
            } else if (url.includes("comentarios.html")) {
              import("/js/ranchera/comentarios.js")
                .then((mod) => {
                  if (mod.inicializarVistaComentarios) {
                    mod.inicializarVistaComentarios();
                  }
                  import("/js/ranchera/informeCometarios.js")
                    .then((modComentarios) => {
                      if (modComentarios.configurarBotonInformeComentarios) {
                        modComentarios.configurarBotonInformeComentarios();
                      }
                    })
                    .catch((err) => {
                      console.error(
                        "❌ Error al cargar informeCometarios.js como módulo:",
                        err
                      );
                    });
                })
                .catch((err) => {
                  console.error(
                    "❌ Error al cargar módulo de comentarios:",
                    err
                  );
                });
            } else if (url.includes("perfiles.html")) {
              import("/js/ranchera/perfiles.js")
                .then((mod) => {
                  if (mod.inicializarVistaPerfiles) {
                    mod.inicializarVistaPerfiles();
                  }
                  // Importar módulo de informePerfiles.js después de cargar perfiles.js
                  import("/js/ranchera/informePerfiles.js")
                    .then((mod) => {
                      if (mod.configurarBotonInformePerfiles) {
                        mod.configurarBotonInformePerfiles();
                      }
                    })
                    .catch((err) => {
                      console.error(
                        "❌ Error al cargar informePerfiles.js como módulo:",
                        err
                      );
                    });
                })
                .catch((err) => {
                  console.error("❌ Error al cargar módulo de perfiles:", err);
                });
            } else if (url.includes("publicaciones.html")) {
              cargarScriptDinamico("/js/ranchera/publicaciones.js");
            } else if (url.includes("segmentos.html")) {
              cargarScriptDinamico("/js/ranchera/segmentos.js");
            } else if (url.includes("insights.html")) {
              cargarScriptDinamico("/js/ranchera/insights.js");
            } else if (url.includes("demografia.html")) {
              cargarScriptDinamico("/js/ranchera/demografia.js");
              import("/js/ranchera/informeDemografia.js")
                .then((mod) => {
                  if (mod.inicializarGeneradorPDF) {
                    mod.inicializarGeneradorPDF();
                  }
                })
                .catch((err) => {
                  console.error(
                    "❌ Error al cargar informeDemografia.js como módulo:",
                    err
                  );
                });
            } else if (url.includes("imagenes.html")) {
              import("/js/ranchera/imagenes.js")
                .then((mod) => {
                  if (mod.inicializarVistaImagenes) {
                    mod.inicializarVistaImagenes();
                  }
                })
                .catch((err) => {
                  console.error("❌ Error al cargar módulo de imágenes:", err);
                });
            }
          }

          // Detectar si es perfil
          // Cargar el script correspondiente según la página
          if (url.includes("perfil.html")) {
            cargarScriptDinamico("/js/perfil.js");
          } else if (url.includes("usuarios.html")) {
            cargarScriptDinamico("/js/usuarios.js");
          }

          for (const modulo in rutasModulos) {
            if (url.toLowerCase().includes(`/${modulo.toLowerCase()}/`)) {
              const archivo = url.split("/").pop();
              const scripts = rutasModulos[modulo][archivo];
              if (scripts) {
                const scriptsArray = Array.isArray(scripts) ? scripts : [scripts];
                scriptsArray.forEach(src => cargarScriptDinamico(src));
              }
            }
          }

          window.scrollTo(0, 0);
        } catch {
          document.getElementById("contenidoDinamico").innerHTML =
            "<p>Error al cargar el contenido.</p>";
        }
      }

      if (configMenu) configMenu.classList.add("d-none");
    }
  });

  if (window.tippy) {
    tippy("[data-tippy-content]", {
      placement: "right",
      animation: "shift-away",
      theme: "light-border",
      delay: [0, 100], // aparece inmediato, desaparece rápido
      duration: [50, 50], // animación rápida
      arrow: true, // opcional: muestra una flechita
    });
  }
});

// Crear ítem del menú lateral
function crearEnlaceMenu(texto, page) {
  const link = document.createElement("a");
  link.href = "#";
  link.className = "menu-item";
  link.dataset.page = page;
  link.title = texto;

  const icono = document.createElement("i");
  icono.className = obtenerIcono(texto);
  icono.classList.add("icon");
  icono.setAttribute("data-tippy-content", texto);

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = texto;

  link.appendChild(icono);
  link.appendChild(label);

  return link;
}

function crearSubmenu(titulo, submenuItems) {
  const wrapper = document.createElement("div");
  wrapper.className = "menu-item submenu-wrapper";

  const toggle = document.createElement("a");
  toggle.href = "#";
  toggle.className = "menu-item submenu-toggle";
  toggle.dataset.tippyContent = titulo;

  const icono = document.createElement("i");
  icono.className = obtenerIcono(titulo);
  icono.classList.add("icon");

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = titulo;

  const flecha = document.createElement("i");
  flecha.className = "fas fa-chevron-right flecha-submenu";

  toggle.appendChild(icono);
  toggle.appendChild(label);
  toggle.appendChild(flecha);

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    wrapper.classList.toggle("open");
    const submenu = wrapper.querySelector(".submenu");
    submenu.style.display = wrapper.classList.contains("open")
      ? "flex"
      : "none";
  });

  const submenu = document.createElement("div");
  submenu.className = "submenu";
  submenu.style.display = "none";

  submenuItems.forEach(({ texto, page }) => {
    const item = crearEnlaceMenu(texto, page);
    submenu.appendChild(item);
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(submenu);

  return wrapper;
}

// Asociar íconos Font Awesome según texto
let mapaIconos = {};

fetch("/JSON/iconos.json")
  .then((res) => res.json())
  .then((data) => {
    mapaIconos = data;
  })
  .catch((err) => {
    console.warn("⚠️ No se pudo cargar iconos personalizados:", err);
  });

let rutasModulos = {};

fetch("/JSON/rutasModulos.json")
  .then((res) => res.json())
  .then((data) => {
    rutasModulos = data;
  })
  .catch((err) => {
    console.warn("⚠️ No se pudo cargar rutas de módulos:", err);
  });

function obtenerIcono(texto) {
  return mapaIconos[texto] || "fas fa-circle";
}

// Cerrar sesión
function cerrarSesion() {
  localStorage.clear();
  window.location.href = "/html/logout.html";
}

/// Para cargar el perfil

function cargarPerfil() {
  fetch("/html/secciones/perfil.html")
    .then((res) => res.text())
    .then((html) => {
      const container = document.getElementById("contenidoDinamico");
      container.innerHTML = html;

      const script = document.createElement("script");
      script.src = "/js/perfil.js";
      script.defer = true;
      document.body.appendChild(script);
    });
}

function cargarScriptDinamico(url) {
  const script = document.createElement("script");
  script.src = url;
  script.type = "module"; // 🚀 Esto es lo que faltaba
  document.body.appendChild(script);
}

function cargarUsuariosDinamicamente() {
  fetch("/html/secciones/usuarios.html")
    .then((res) => res.text())
    .then((html) => {
      const container = document.getElementById("contenidoDinamico");
      container.innerHTML = html;

      // Cargar jQuery si no existe
      if (!window.jQuery) {
        const jqueryScript = document.createElement("script");
        jqueryScript.src = "https://code.jquery.com/jquery-3.7.0.min.js";
        jqueryScript.onload = () => {
          cargarDataTablesYScriptUsuarios();
        };
        document.body.appendChild(jqueryScript);
      } else {
        cargarDataTablesYScriptUsuarios();
      }
    });
}

function cargarDataTablesYScriptUsuarios() {
  const dtScript1 = document.createElement("script");
  dtScript1.src =
    "https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js";

  const dtScript2 = document.createElement("script");
  dtScript2.src =
    "https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js";

  dtScript2.onload = () => {
    const usuariosScript = document.createElement("script");
    usuariosScript.src = "/js/usuarios.js";
    document.body.appendChild(usuariosScript);
  };

  document.body.appendChild(dtScript1);
  document.body.appendChild(dtScript2);
}
