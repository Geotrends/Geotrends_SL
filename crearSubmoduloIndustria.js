const fs = require("fs");
const path = require("path");

const vistas = [
  "normativa",
  "holografia",
  "ingenieria",
  "estaciones",
  "registros",
  "mapas"
];

// ✅ Declarar la función antes de usarla
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const baseHTML = (nombre) => `<!-- ${nombre}.html -->
<div class="container">
  <h2>${capitalize(nombre)} - Industria</h2>
  <div id="contenido-${nombre}"></div>
</div>
<script type="module" src="/js/industria/${nombre}.js"></script>
`;

const baseJS = (nombre) => `// ${nombre}.js
export function inicializarVista${capitalize(nombre)}() {
  console.log("🔧 Inicializando vista: ${nombre}");
  // Aquí va la lógica específica de la vista
}
`;

const dirHtml = path.join(__dirname, "../public/html/industria");
const dirJs = path.join(__dirname, "../public/js/industria");

// Crear carpetas si no existen
if (!fs.existsSync(dirHtml)) fs.mkdirSync(dirHtml, { recursive: true });
if (!fs.existsSync(dirJs)) fs.mkdirSync(dirJs, { recursive: true });

vistas.forEach((vista) => {
  const htmlPath = path.join(dirHtml, `${vista}.html`);
  const jsPath = path.join(dirJs, `${vista}.js`);

  if (!fs.existsSync(htmlPath)) {
    fs.writeFileSync(htmlPath, baseHTML(vista));
    console.log(`✅ Archivo HTML creado: ${htmlPath}`);
  } else {
    console.log(`⚠️ Ya existe: ${htmlPath}`);
  }

  if (!fs.existsSync(jsPath)) {
    fs.writeFileSync(jsPath, baseJS(vista));
    console.log(`✅ Archivo JS creado: ${jsPath}`);
  } else {
    console.log(`⚠️ Ya existe: ${jsPath}`);
  }
});