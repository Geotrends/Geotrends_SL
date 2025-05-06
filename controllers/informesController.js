const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

exports.generarInforme = async (req, res) => {
  const { tipo, data } = req.body;
  const basePath = path.join(__dirname, "../templates/informes/base.html");

  // Intentar primero tipo.html
  let templatePath = path.join(__dirname, `../templates/informes/${tipo}.html`);
  console.log("🔍 Buscando plantilla en:", templatePath);

  if (!fs.existsSync(templatePath)) {
    const endsWithInformes = tipo.toLowerCase().endsWith("informes");
    if (!endsWithInformes) {
      const alternativa = path.join(
        __dirname,
        `../templates/informes/${tipo}Informes.html`
      );
      console.log("🔁 Plantilla no encontrada, intentando con:", alternativa);
      if (fs.existsSync(alternativa)) {
        console.log("✅ Plantilla alternativa encontrada:", alternativa);
        templatePath = alternativa;
      } else {
        console.error("❌ Ninguna plantilla encontrada para el tipo:", tipo);
        return res.status(404).json({ error: "Plantilla no encontrada" });
      }
    } else {
      console.error("❌ Plantilla no encontrada:", templatePath);
      return res.status(404).json({ error: "Plantilla no encontrada" });
    }
  } else {
    console.log("✅ Plantilla principal encontrada:", templatePath);
  }

  if (!fs.existsSync(basePath)) {
    return res.status(404).json({ error: "Plantilla base no encontrada" });
  }
  const headerImagePath = path.join(__dirname, "../public/images/menu-footer-image.png");
const footerImagePath = path.join(__dirname, "../public/images/menu-footer-image.png");

  const baseHtml = fs.readFileSync(basePath, "utf8");
  const cssGeneralPath = path.join(__dirname, "../public/css/general.css");
  const cssVariablesPath = path.join(__dirname, "../public/css/variables.css");

  const estilosGeneral = fs.existsSync(cssGeneralPath)
    ? fs.readFileSync(cssGeneralPath, "utf8")
    : "/* estilos generales no encontrados */";

  const estilosVariables = fs.existsSync(cssVariablesPath)
    ? fs.readFileSync(cssVariablesPath, "utf8")
    : "/* estilos de variables no encontrados */";

  const estilos = estilosVariables + "\n" + estilosGeneral;
  const contenido = fs.readFileSync(templatePath, "utf8");

  htmlContenido = contenido;

  const imagenTransparente =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

  if (data && typeof data === "object") {
    const keysPresentes = Object.keys(data);
    htmlContenido = htmlContenido.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, key, content) => {
      if (!data[key] || (typeof data[key] === 'string' && data[key].trim() === '')) {
        return '';
      }
      return content;
    });

    Object.entries(data).forEach(([key, valor]) => {
      if (typeof valor !== "string") valor = String(valor || "").trim();

      if (
        key.startsWith("grafico") ||
        key.startsWith("nube") ||
        key === "redUsuarios"
      ) {
        // Solo aceptar imágenes si ya vienen en base64, si no, usar imagen transparente
        if (!valor.startsWith("data:image/png;base64,")) {
          console.error(`❌ ${key} no comienza con 'data:image/png;base64,'`);
          valor = imagenTransparente;
          data[key] = valor;
        } else if (valor.length < 300) {
          console.warn(`⚠️ ${key} parece demasiado corto (${valor.length} caracteres)`);
        } else {
          console.log(`✅ ${key} parece válido (base64 bien formado)`);
        }
      }

      htmlContenido = htmlContenido.replaceAll(`{{${key}}}`, valor);
    });
    // Añadido: reemplazo para resumenFiltrosHTML si existe
    htmlContenido = htmlContenido.replaceAll(`{{resumenFiltrosHTML}}`, data.resumenFiltrosHTML || "");

    if (data.filtrosSeleccionados) {
      const filtros = data.filtrosSeleccionados;
      htmlContenido = htmlContenido
        .replaceAll('{{filtrosSeleccionados.seguidoresMin}}', filtros.seguidoresMin)
        .replaceAll('{{filtrosSeleccionados.seguidoresMax}}', filtros.seguidoresMax)
        .replaceAll('{{filtrosSeleccionados.categoria}}', filtros.categoria)
        .replaceAll('{{filtrosSeleccionados.negocio}}', filtros.negocio || "Todas")
        .replaceAll('{{filtrosSeleccionados.privada}}', filtros.privada || "Todas")
        .replaceAll('{{filtrosSeleccionados.verificada}}', filtros.verificada || "Todas");
    }
  }

  // Validar que los campos base64 esenciales no estén vacíos ni corruptos
  if (tipo === "perfiles") {
    const camposCriticos = [
      "graficoSeguidores",
      "nubeBiografias",
      "nubeNombres",
      "graficoEmojis",
      "graficoSentimiento",
      "graficoSegmentacionPerfiles",
      "tablaResumen"
    ];

    const camposInvalidos = camposCriticos.filter((k) => {
      const v = data[k];
      return (
        !v ||
        typeof v !== "string" ||
        (!v.startsWith("data:image/png;base64,") && k !== "tablaResumen") ||
        v.length < 100
      );
    });

    camposInvalidos.forEach((key) => {
      console.warn(`⚠️ Campo ${key} inválido, se usará imagen transparente`);
      if (key !== "tablaResumen") {
        data[key] = imagenTransparente;
      } else {
        data[key] = "<p style='font-style:italic; color:gray;'>No hay datos disponibles</p>";
      }
    });
  } else if (tipo === "demografia") {
    const camposCriticos = [
      "graficoDistribucionGeneral",
      "graficoSegmentacion",
      "graficoSentimiento",
      "nubePalabrasSegmentoPositivo",
      "nubePalabrasSegmentoNeutro",
      "graficoEmojis",
      "tablaTopPerfiles",
    ];

    const camposInvalidos = camposCriticos.filter((k) => {
      const v = data[k];
      return (
        !v ||
        typeof v !== "string" ||
        (!v.startsWith("data:image/png;base64,") && k !== "tablaTopPerfiles") ||
        v.length < 100
      );
    });

    camposInvalidos.forEach((key) => {
      console.warn(`⚠️ Campo ${key} inválido, se usará imagen transparente`);
      if (key !== "tablaTopPerfiles") {
        data[key] = imagenTransparente;
      } else {
        data[key] = "<p style='font-style:italic; color:gray;'>No hay datos disponibles</p>";
      }
    });
  }

  // Guardar imágenes base64 como archivos para verificación manual
const tmpDir = path.join(__dirname, "../tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

Object.entries(data).forEach(([key, valor]) => {
  if (typeof valor === "string" && valor.startsWith("data:image/png;base64,")) {
    const base64Data = valor.replace(/^data:image\/png;base64,/, "");
    const filePath = path.join(tmpDir, `${key}.png`);
    fs.writeFileSync(filePath, base64Data, "base64");
    console.log(`🖼️ Imagen guardada: ${filePath}`);
  }
});

  let htmlRenderizado = baseHtml
    .replace("<!-- {{DATA}} -->", htmlContenido)
    .replace("{{estilos}}", estilos);
  // Insertar marca de agua visual antes de renderizar en el navegador
  const marcaAguaLogoBase64 = fs.existsSync(headerImagePath)
  ? `data:image/png;base64,${fs.readFileSync(headerImagePath, "base64")}`
  : "";

  htmlRenderizado = htmlRenderizado.replace(
    '</body>',
    `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(0deg);
      z-index: -1;
      opacity: 0.1;
      width: 100%;
      height: 100%;
      background-image: url('${marcaAguaLogoBase64}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: 90%;
      pointer-events: none;
    "></div>
    </body>
    `
  );
  // Guardar el HTML generado para depuración
  fs.writeFileSync(
    path.join(__dirname, "../tmp/debug_render.html"),
    htmlRenderizado
  );

  // Lanzar navegador y cargar contenido
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(htmlRenderizado, { waitUntil: "domcontentloaded" });
  // Esperar a que todas las imágenes estén completamente cargadas
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            })
      )
    );
  });
  // await page.waitForTimeout(1000); // Esperar 1 segundo para asegurar carga de imágenes

  const fechaHoraGeneracion = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  });


const headerImageSrc = fs.existsSync(headerImagePath)
  ? `data:image/png;base64,${fs.readFileSync(headerImagePath, "base64")}`
  : "";

const footerImageSrc = fs.existsSync(footerImagePath)
  ? `data:image/png;base64,${fs.readFileSync(footerImagePath, "base64")}`
  : "";
  
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "30mm",
      bottom: "25mm",
      left: "20mm",
      right: "20mm",
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width: 100%; padding: 10px 40px; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 25%; text-align: left; vertical-align: middle;">
              <a href="https://geotrends.co" target="_blank" style="display: inline-block;">
                <img src="${headerImageSrc}" style="height: 60px;" />
              </a>
            </td>
            <td style="width: 90%; text-align: center; vertical-align: middle;">
              <div style="font-size: 20px; color: #314b77; font-weight: bold; font-family: 'Helvetica', 'Arial', sans-serif;">Informe de Segmentación Demográfica</div>
            </td>
            <td style="width: 25%; text-align: right; vertical-align: middle;">
              <div style="font-size:10px; color:#888; font-family: 'Helvetica', 'Arial', sans-serif;">${fechaHoraGeneracion}</div>
            </td>
          </tr>
        </table>
        <div style="border-top: 2px solid #024959; margin-top: 8px;"></div>
      </div>
    `,
    footerTemplate: `
      <div style="width: 100%; font-size:10px; color: gray; padding: 0 40px; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="text-align: left; vertical-align: middle;">
              <div style="display: flex; align-items: center;">
                <span style="font-family: 'Helvetica', 'Arial', sans-serif; font-size: 8px; color: #4CAF50; font-weight: bold;">Powered by:</span>
                <img src="${footerImageSrc}" style="height: 35px; margin-left: 10px;" />
              </div>
            </td>
            <td style="text-align: right;">
              <span style="font-family: 'Helvetica', 'Arial', sans-serif;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
  await browser.close();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="informe_${tipo}.pdf"`
  );
  res.send(pdfBuffer);
};
