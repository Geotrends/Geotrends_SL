/**
@file controllers/informesController.js
@version 1.0.0

@description
Lógica JS del proyecto.
Este archivo forma parte del proyecto "Plataforma de Monitoreo Ambiental IoT",
desarrollado por Geotrends - Geographic and Data Analytics, en colaboración con el Área Metropolitana
del Valle de Aburrá y la Universidad de San Buenaventura en el marco del Convenio 273 de 2024.

⚖️ Propiedad Intelectual:
Este software es propiedad intelectual compartida según el Convenio 273 de 2024.

📌 Entidades involucradas:
- Geotrends - Geographic and Data Analytics
- Área Metropolitana del Valle de Aburrá
- Universidad de San Buenaventura

👨‍💻 Equipo de desarrollo:
- Jonathan Ochoa Villegas (Geotrends)
- Diego Murillo Gómez (USB)
- Camilo Herrera Arcila (Geotrends)

📅 Creación: Noviembre 2024
📅 Actualización: 30-03-2025

📜 Licencia: MIT License

© 2025 Geotrends. Todos los derechos reservados.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const baseUrl = process.env.BASE_URL || "http://localhost:3030";

exports.generarInformeMapa = async (req, res) => {
  try {
    const { imageBase64, reglaBase64, filtros = {}, tablaSensoresHtml = "", sensores = [] } = req.body;


    if (!imageBase64 || !imageBase64.startsWith("data:image")) {
      console.error("❌ imageBase64 inválido o no recibido.");
      return res.status(400).send("Imagen no válida o vacía.");
    }

    // Crear carpeta si no existe
    const imageDir = path.join(__dirname, "..", "public", "imgs");
    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

    // Guardar imagen del mapa
    const mapFileName = `map_temp_${Date.now()}.png`;
    const mapFilePath = path.join(imageDir, mapFileName);
    fs.writeFileSync(mapFilePath, Buffer.from(imageBase64.split(",")[1], "base64"));

    // Guardar imagen de la regla (opcional)
    let reglaFileName = "";
    if (reglaBase64 && reglaBase64.startsWith("data:image")) {
      reglaFileName = `regla_temp_${Date.now()}.png`;
      const reglaFilePath = path.join(imageDir, reglaFileName);
      fs.writeFileSync(reglaFilePath, Buffer.from(reglaBase64.split(",")[1], "base64"));
    }

    // Cargar plantilla HTML base
    const plantillaPath = path.join(__dirname, "..", "public", "pdf_templates", "informe_map.html");
    let htmlContent = fs.readFileSync(plantillaPath, "utf8");

    // Reemplazar valores en la plantilla
    htmlContent = htmlContent
      .replace("{{MUNICIPIO}}", filtros.municipio || "Todos")
      .replace("{{BARRIO}}", filtros.barrio || "Todos")
      .replace("{{REFERENCIA}}", filtros.referencia || "Ninguna")
      .replace("{{USO_SUELO}}", filtros.usoSuelo || "Todos")
      .replace("{{NIVEL}}", filtros.nivel || "Todos")
      .replace("{{FECHA}}", new Date().toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }))
      .replace("{{TABLA_SENSORES}}", tablaSensoresHtml)
      .replace("{{IMAGEN_MAPA}}", `/imgs/${mapFileName}`)
      .replace("{{IMAGEN_REGLA}}", reglaFileName ? `/imgs/${reglaFileName}` : "");

    // Guardar HTML temporal para Playwright
    const tempHtmlPath = path.join(__dirname, "..", "public", "pdf_templates", "temp_informe_map.html");
    fs.writeFileSync(tempHtmlPath, htmlContent);

    // Cargar imágenes del encabezado y pie de página
    const headerImagePath = path.join(__dirname, "..", "public", "images", "menu-header-image.png");
    const headerImageBase64 = fs.readFileSync(headerImagePath, { encoding: "base64" });
    const headerImageSrc = `data:image/png;base64,${headerImageBase64}`;

    const footerImagePath = path.join(__dirname, "..", "public", "images", "menu-footer-image.png");
    const footerImageBase64 = fs.readFileSync(footerImagePath, { encoding: "base64" });
    const footerImageSrc = `data:image/png;base64,${footerImageBase64}`;

    // Crear PDF con Playwright
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/pdf_templates/temp_informe_map.html`, {
      waitUntil: "networkidle",
    });

    const fechaHoraGeneracion = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "25mm",
        bottom: "25mm",
        left: "20mm",
        right: "20mm",
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; padding: 10px 40px;">
          <img src="${headerImageSrc}" style="height: 40px;" />
          <div style="font-size:10px; color:#888;">Informe de Monitoreo - Creado el ${fechaHoraGeneracion}</div>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size:10px; color: gray; padding: 0 40px; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="text-align: left; vertical-align: middle;">
                <div style="display: flex; align-items: center;">
                  <span style="font-family: Arial, sans-serif; font-size: 8px; color: #4CAF50; font-weight: bold;">Powered by:</span>
                  <img src="${footerImageSrc}" style="height: 35px; margin-left: 10px;" />
                </div>
              </td>
              <td style="text-align: right;">
                Página <span class="pageNumber"></span> de <span class="totalPages"></span>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    await browser.close();

    // Eliminar archivos temporales
    fs.unlinkSync(tempHtmlPath);
    fs.unlinkSync(mapFilePath);
    if (reglaFileName) fs.unlinkSync(path.join(imageDir, reglaFileName));

    // Enviar el PDF generado
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=informe_mapa.pdf",
    });
    res.send(pdf);
  } catch (error) {
    console.error("❌ Error generando el informe:", error);
    res.status(500).send("Error generando el informe PDF.");
  }
};
/////////////////////////////////////////////
exports.generarInformeHistorico = async (req, res) => {
  try {
    const {
      sensorNombre = "",
      fechaInicio = "",
      fechaFin = "",
      zoomInicio = "",
      zoomFin = "",
      htmlGrafico1 = "",
      htmlGrafico2 = "",
      htmlGrafico3 = "",
      htmlGrafico4 = "",
      htmlGrafico5 = "",
      tablaIndicadores = "",
      detallesSensor = {}, // ← ✅ Campo adicional recibido
    } = req.body;

    // Verificación básica
    if (!htmlGrafico1 || !tablaIndicadores) {
      console.warn("⚠️ Faltan datos obligatorios en el payload.");
      return res.status(400).send("Faltan datos para generar el informe.");
    }

    //console.log("📦 Recibido informe de:", sensorNombre, fechaInicio, fechaFin);

    // Cargar plantilla base
    const plantillaPath = path.join(
      __dirname,
      "..",
      "public",
      "pdf_templates",
      "informe_historico.html"
    );
    let htmlContent = fs.readFileSync(plantillaPath, "utf8");

    const fechaGeneracion = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Reemplazos de contenido principal
    htmlContent = htmlContent
      .replace(/{{SENSOR}}/g, sensorNombre)
      .replace(/{{FECHA_INICIO}}/g, fechaInicio)
      .replace(/{{FECHA_FIN}}/g, fechaFin)
      .replace(/{{FECHA_GENERACION}}/g, fechaGeneracion)
      .replace(/{{ZOOM_INICIO}}/g, zoomInicio)
      .replace(/{{ZOOM_FIN}}/g, zoomFin)
      .replace(/{{TABLA_INDICADORES}}/g, tablaIndicadores)
      .replace(/{{HTML_GRAFICO_1}}/g, htmlGrafico1)
      .replace(/{{HTML_GRAFICO_2}}/g, htmlGrafico2)
      .replace(/{{HTML_GRAFICO_3}}/g, htmlGrafico3)
      .replace(/{{HTML_GRAFICO_4}}/g, htmlGrafico4)
      .replace(/{{HTML_GRAFICO_5}}/g, htmlGrafico5);

    // ✅ Reemplazos para detalles del sensor
    htmlContent = htmlContent
      .replace(/{{DIRECCION}}/g, detallesSensor.direccion || "")
      .replace(/{{BARRIO}}/g, detallesSensor.barrio || "")
      .replace(/{{MUNICIPIO}}/g, detallesSensor.municipio || "")
      .replace(/{{DEPARTAMENTO}}/g, detallesSensor.departamento || "")
      .replace(/{{USO_SUELO}}/g, detallesSensor.uso_suelo || "")
      .replace(/{{TIPO}}/g, detallesSensor.tipo || "")
      .replace(/{{CLASIFICACION}}/g, detallesSensor.clasificacion || "")
      .replace(/{{REFERENCIA}}/g, detallesSensor.referencia || "")
      .replace(/{{INSTALACION}}/g, detallesSensor.instalacion || "")
      .replace(/{{LINEA}}/g, detallesSensor.linea || "")
      .replace(/{{OPERADOR}}/g, detallesSensor.operador || "")
      .replace(/{{SECTOR}}/g, detallesSensor.sector || "")
      .replace(/{{SUBSECTOR}}/g, detallesSensor.subsector || "")
      .replace(/{{ESTADO}}/g, detallesSensor.estado || "")
      .replace(/{{PROVEEDOR}}/g, detallesSensor.proveedor || "")
      .replace(/{{FECHA_INSTALACION}}/g, detallesSensor.fecha_ins || "")
      .replace(/{{ULT_MANT}}/g, detallesSensor.ult_mant || "")
      .replace(/{{FREQ_MONITOREO}}/g, detallesSensor.freq_monitoreo || "")
      .replace(/{{FIN_MONITOREO}}/g, detallesSensor.fin_monitoreo || "—");

    // Guardar HTML temporal
    const tempHtmlPath = path.join(
      __dirname,
      "..",
      "public",
      "pdf_templates",
      "temp_informe_historico.html"
    );
    fs.writeFileSync(tempHtmlPath, htmlContent);

    // Encabezado y pie
    const headerImage = fs.readFileSync(
      path.join(__dirname, "..", "public", "images", "menu-header-image.png"),
      "base64"
    );
    const footerImage = fs.readFileSync(
      path.join(__dirname, "..", "public", "images", "menu-footer-image.png"),
      "base64"
    );

    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/pdf_templates/temp_informe_historico.html`, {
      waitUntil: "networkidle",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "25mm", bottom: "25mm", left: "20mm", right: "20mm" },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; padding: 10px 40px;">
          <img src="data:image/png;base64,${headerImage}" style="height: 40px;" />
          <div style="font-size:10px; color:#888;">Informe de Históricos - Creado el ${fechaGeneracion}</div>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size:10px; color: gray; padding: 0 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="text-align: left;">
                <span style="font-size: 8px; color: #4CAF50; font-weight: bold;">Powered by:</span>
                <img src="data:image/png;base64,${footerImage}" style="height: 35px; margin-left: 10px;" />
              </td>
              <td style="text-align: right;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></td>
            </tr>
          </table>
        </div>
      `,
    });

    //console.log("📄 Tamaño del PDF:", pdf.length);

    await browser.close();
    fs.unlinkSync(tempHtmlPath); // Limpiar HTML temporal

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=informe_historico.pdf",
    });
    res.send(pdf);
  } catch (err) {
    console.error("❌ Error generando PDF histórico:", err);
    res.status(500).send("Error generando informe histórico.");
  }
};

// --------------------------- INFORME ANALITICA --------------------------- // 
// --------------------------- INFORME ANALITICA --------------------------- // 
// 🔹 NUEVAS FUNCIONES PARA ANALÍTICA
exports.generarInformeAnaliticaHora = async (req, res) => {
  await generarPDFAnalitica("hora", req, res);
};

exports.generarInformeAnaliticaSemana = async (req, res) => {
  await generarPDFAnalitica("semana", req, res);
};

exports.generarInformeAnaliticaMes = async (req, res) => {
  await generarPDFAnalitica("mes", req, res);
};

exports.generarInformeAnaliticaResumen = async (req, res) => {
  await generarPDFAnalitica("resumen", req, res);
};

// 🔸 Función reutilizable
async function generarPDFAnalitica(tipo, req, res) {
  try {
    const datos = req.body;
    const plantillaPath = path.join(
      __dirname, "..", "public", "pdf_templates", `analitica_${tipo}.html`
    );

    if (!fs.existsSync(plantillaPath)) {
      return res.status(500).send("Plantilla no encontrada.");
    }

    let htmlContent = fs.readFileSync(plantillaPath, "utf8");
    const fechaGeneracion = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 🧩 Reemplazos generales
    htmlContent = htmlContent
      .replace(/{{FECHA_GENERACION}}/g, fechaGeneracion)
      .replace(/{{FILTROS_APLICADOS}}/g, datos.filtrosHtml || "")
      .replace(/{{TABLA_SENSORES}}/g, datos.tablaSensoresHtml || "");

    // 🎯 Reemplazos específicos por tipo
    if (tipo === "hora") {
      htmlContent = htmlContent
        .replace(/{{GRAFICO_HEATMAP}}/g, datos.graficoBase64 ? `<img src="${datos.graficoBase64}" style="width: 100%; max-height: 500px;" />` : "")
        .replace(/{{DESCRIPCION_HTML}}/g, datos.descripcionHtml || "");
    }

    if (tipo === "semana") {
      htmlContent = htmlContent
        .replace(/{{GRAFICO_HEATMAP_SEMANA_GENERAL}}/g, datos.graficoSemanaGeneral ? `<img src="${datos.graficoSemanaGeneral}" style="width: 100%; max-height: 500px;" />` : "")
        .replace(/{{DESCRIPCION_GENERAL}}/g, datos.descripcionGeneral || "")
        .replace(/{{GRAFICO_HEATMAP_SEMANA_DIA}}/g, datos.graficoSemanaDia ? `<img src="${datos.graficoSemanaDia}" style="width: 100%; max-height: 500px;" />` : "")
        .replace(/{{DESCRIPCION_DIA}}/g, datos.descripcionDia || "")
        .replace(/{{GRAFICO_HEATMAP_SEMANA_NOCHE}}/g, datos.graficoSemanaNoche ? `<img src="${datos.graficoSemanaNoche}" style="width: 100%; max-height: 500px;" />` : "")
        .replace(/{{DESCRIPCION_NOCHE}}/g, datos.descripcionNoche || "");
    }

    if (tipo === "mes") {
      htmlContent = htmlContent
        .replace(/{{GRAFICO_HEATMAP_MES_24H}}/g, datos.graficoMes24h ? `<img src="${datos.graficoMes24h}" style="width: 100%; max-height: 500px;" />` : "")
        .replace(/{{DESCRIPCION_MES_24H}}/g, datos.descripcion24h || "")
        .replace(/{{GRAFICO_HEATMAP_MES_DIA}}/g, datos.graficoMesDia ? `<img src="${datos.graficoMesDia}" style="width: 100%; max-height: 500px;" />` : "")
        .replace(/{{DESCRIPCION_MES_DIA}}/g, datos.descripcionDia || "")
        .replace(/{{GRAFICO_HEATMAP_MES_NOCHE}}/g, datos.graficoMesNoche ? `<img src="${datos.graficoMesNoche}" style="width: 100%; max-height: 500px;" />` : "")
        .replace(/{{DESCRIPCION_MES_NOCHE}}/g, datos.descripcionNoche || "");
    }
    
    

    // 🔐 Guardar HTML temporal
    const tempPath = path.join(__dirname, "..", "public", "pdf_templates", `temp_informe_analitica_${tipo}.html`);
    fs.writeFileSync(tempPath, htmlContent);

    // 🖼️ Header/footer
    const headerImagePath = path.join(__dirname, "..", "public", "images", "menu-header-image.png");
    const footerImagePath = path.join(__dirname, "..", "public", "images", "menu-footer-image.png");

    const headerBase64 = fs.readFileSync(headerImagePath, "base64");
    const footerBase64 = fs.readFileSync(footerImagePath, "base64");

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/pdf_templates/temp_informe_analitica_${tipo}.html`, {
      waitUntil: "networkidle",
    });

    const fechaHoraGeneracion = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const pdf = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
      margin: { top: "25mm", bottom: "25mm", left: "20mm", right: "20mm" },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; padding: 10px 40px;">
          <img src="data:image/png;base64,${headerBase64}" style="height: 40px;" />
          <div style="font-size:10px; color:#888;">Informe de Analítica - Creado el ${fechaHoraGeneracion}</div>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size:10px; color: gray; padding: 0 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="text-align: left;">
                <span style="font-size: 8px; color: #4CAF50; font-weight: bold;">Powered by:</span>
                <img src="data:image/png;base64,${footerBase64}" style="height: 35px; margin-left: 10px;" />
              </td>
              <td style="text-align: right;">
                Página <span class="pageNumber"></span> de <span class="totalPages"></span>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    await browser.close();
    fs.unlinkSync(tempPath);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=informe_analitica_${tipo}.pdf`,
    });
    res.send(pdf);
  } catch (err) {
    console.error(`❌ Error generando PDF analítica ${tipo}:`, err);
    res.status(500).send(`Error generando informe analítica ${tipo}`);
  }
}




exports.generarPDFModalSemanal = async (req, res) => {
  try {
    const {
      sensorInfo,
      indicadores,
      imagenLinea,
      imagenBarras,
      fechaInicio,
      fechaFin,
    } = req.body;

    // Cargar plantilla base
    const plantillaPath = path.join(__dirname, "..", "public", "pdf_templates", "informe_modal_semanal.html");
    let htmlContent = fs.readFileSync(plantillaPath, "utf8");

    // Reemplazos básicos
    htmlContent = htmlContent
      .replace(/{{REFERENCIA}}/g, sensorInfo.referencia || "")
      .replace(/{{BARRIO}}/g, sensorInfo.barrio || "")
      .replace(/{{DIRECCION}}/g, sensorInfo.direccion || "")
      .replace(/{{MUNICIPIO}}/g, sensorInfo.municipio || "")
      .replace(/{{DEPARTAMENTO}}/g, sensorInfo.departamento || "")
      .replace(/{{CLASIFICACION}}/g, sensorInfo.clasificacion || "")
      .replace(/{{USO_SUELO}}/g, sensorInfo.uso_suelo || "")
      .replace(/{{ESTADO}}/g, sensorInfo.estado || "")
      .replace(/{{TIPO}}/g, sensorInfo.tipo || "")
      .replace(/{{PROVEEDOR}}/g, sensorInfo.proveedor || "")
      .replace(/{{FREQ_MONITOREO}}/g, sensorInfo.freq_monitoreo || "")
      .replace(/{{FECHA_INICIO}}/g, fechaInicio || "")
      .replace(/{{FECHA_FIN}}/g, fechaFin || "")
      .replace(/{{LAEQ_DIA}}/g, indicadores.laeqDay?.toFixed(1) || "Sin datos")
      .replace(/{{LAEQ_NOCHE}}/g, indicadores.laeqNight?.toFixed(1) || "Sin datos")
      .replace(/{{LAEQ_24H}}/g, indicadores.laeq24?.toFixed(1) || "Sin datos")
      .replace(/{{LAEQ_HORA}}/g, indicadores.laeqLastHour !== null ? indicadores.laeqLastHour.toFixed(1) : "Sin datos")
      .replace(/{{IMG_LINEA}}/g, imagenLinea || "")
      .replace(/{{IMG_BARRAS}}/g, imagenBarras || "");

    const tempHtmlPath = path.join(__dirname, "..", "public", "pdf_templates", `temp_informe_modal_semanal.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent);

    const headerImage = fs.readFileSync(path.join(__dirname, "..", "public", "images", "menu-header-image.png"), "base64");
    const footerImage = fs.readFileSync(path.join(__dirname, "..", "public", "images", "menu-footer-image.png"), "base64");

    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/pdf_templates/temp_informe_modal_semanal.html`, {
      waitUntil: "networkidle",
    });

    const fechaGeneracion = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "25mm",
        bottom: "25mm",
        left: "20mm",
        right: "20mm",
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; padding: 10px 40px;">
          <img src="data:image/png;base64,${headerImage}" style="height: 40px;" />
          <div style="font-size:10px; color:#888;">Informe Modal Semanal - Generado el ${fechaGeneracion}</div>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size:10px; color: gray; padding: 0 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="text-align: left;">
                <span style="font-size: 8px; color: #4CAF50; font-weight: bold;">Powered by:</span>
                <img src="data:image/png;base64,${footerImage}" style="height: 35px; margin-left: 10px;" />
              </td>
              <td style="text-align: right;">
                Página <span class="pageNumber"></span> de <span class="totalPages"></span>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    await browser.close();
    fs.unlinkSync(tempHtmlPath);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=informe_modal_${sensorInfo.referencia}.pdf`,
    });
    res.send(pdf);
  } catch (err) {
    console.error("Error generando informe modal semanal:", err);
    res.status(500).send("Error generando PDF");
  }
};