import { procesarYActualizarWordCloudBiografias } from './utils/wordClouds.js';
import { generarRedPerfiles } from './utils/redes.js';
import { crearGraficoScatter } from './utils/charts.js';
let perfilesSemillaGlobal = []; // Declarar al inicio del archivo para usar globalmente

export function inicializarVistaPerfiles() {
    console.log("✅ Vista de perfiles inicializada");
  
    const selector = document.getElementById("selectorPerfil");
    const resumenContainer = document.getElementById("resumenPerfil");
  
    if (!selector || !resumenContainer) {
      console.error("❌ Elementos no encontrados en el DOM.");
      return;
    }
  
    // Obtener perfiles semilla desde el backend
    fetch('/api/ranchera/indicadores-semilla')
      .then(response => response.json())
      
      .then(data => {
        if (!Array.isArray(data.top3)) {
          console.error("❌ Estructura inesperada en la respuesta:", data);
          return;
        }
    // console.log("Perfiles semillaffff:", data.top3);
        document.getElementById("totalSeguidores").textContent = data.total.toLocaleString("es-CO");
        document.getElementById("promedioSeguidores").textContent = Number(data.promedio.followers_count).toLocaleString("es-CO");
        document.getElementById("seguidoresCompartidos").textContent = "--";
        document.getElementById("porcentajeBots").textContent = "--";
  
        const perfiles = data.top3;
        perfilesSemillaGlobal = perfiles;
        window.perfilesSemillaGlobal = perfilesSemillaGlobal;
        selector.innerHTML = "";
        perfiles.forEach(p => {
          if (p.fuente_id !== undefined && p.fuente_id !== null) {
            const option = document.createElement("option");
            option.value = p.fuente_id;
            option.setAttribute("data-username", p.username);
            option.textContent = `${p.full_name || "Sin nombre"} (@${p.username})`;
            option.selected = true;
            selector.appendChild(option);
          }
        });
        
        const selectorTipoCuenta = document.createElement("select");
        selectorTipoCuenta.id = "selectorTipoCuenta";
        selectorTipoCuenta.innerHTML = `
          <option value="">-- ¿Es cuenta de negocio? --</option>
          <option value="true">Cuenta de negocio</option>
          <option value="false">Cuenta personal</option>
        `;
        document.querySelector(".controls-nube").appendChild(selectorTipoCuenta);
        
        selectorTipoCuenta.addEventListener("change", () => {
          const categoriasSeleccionadas = Array.from(selectorCategorias.selectedOptions).map(opt => opt.value);
          const privacidadSeleccionada = document.getElementById("selectorPrivacidad").value;
          const tipoCuentaSeleccionada = selectorTipoCuenta.value;
        
          const perfilesUsar = document.getElementById("resumenPerfil").querySelector(".indicadores-perfiles")
            ? window.ultimoPerfilesAnalizados || []
            : perfilesSemillaGlobal;
        
          let perfilesFiltrados = perfilesUsar;
        
          if (categoriasSeleccionadas.length > 0) {
            perfilesFiltrados = perfilesFiltrados.filter(p =>
              categoriasSeleccionadas.some(cat =>
                (p.business_category_name || '').toLowerCase().includes(cat.toLowerCase())
              )
            );
          }
        
          if (privacidadSeleccionada !== "") {
            const isPrivado = privacidadSeleccionada === "true";
            perfilesFiltrados = perfilesFiltrados.filter(p => p.private === isPrivado);
          }
        
          if (tipoCuentaSeleccionada !== "") {
            const isBusiness = tipoCuentaSeleccionada === "true";
            perfilesFiltrados = perfilesFiltrados.filter(p => Boolean(p.is_business) === isBusiness);
          }
        
          const textoFiltrado = perfilesFiltrados.map(p => p.biography || '').join(' ');
        
          procesarYActualizarWordCloudBiografias({
            texto: textoFiltrado,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloud"
          });
          const textoNombres = perfilesFiltrados.map(p => p.fullname || '').join(' ');
          procesarYActualizarWordCloudBiografias({
            texto: textoNombres,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloudNombres"
          });
        });
        
        // Agregar bloque para identificar categorías únicas y poblar el selector de categorías
        const categoriasSet = new Set();
        perfiles.forEach(p => {
          const cat = (p.business_category_name || '').split(',').map(c => c.trim());
          cat.forEach(c => {
            if (c && c.toLowerCase() !== 'none') categoriasSet.add(c);
          });
        });
        
        const selectorCategorias = document.getElementById("selectorCategoria");
        selectorCategorias.innerHTML = "<option value=''>-- Seleccione categoría --</option>";
        [...categoriasSet].sort().forEach(cat => {
          const opt = document.createElement("option");
          opt.value = cat;
          opt.textContent = cat;
        selectorCategorias.appendChild(opt);
       });
      
        const contenedorControles = document.querySelector(".controls-nube");
      
        const selectorPrivacidad = document.createElement("select");
        selectorPrivacidad.id = "selectorPrivacidad";
        selectorPrivacidad.innerHTML = `
          <option value="">-- Cuenta privada o no --</option>
          <option value="true">Privado</option>
          <option value="false">Público</option>
        `;
        contenedorControles.appendChild(selectorPrivacidad);
      
        const selectorVerificado = document.createElement("select");
        selectorVerificado.id = "selectorVerificado";
        selectorVerificado.innerHTML = `
          <option value="">-- Cuenta verificada o no --</option>
          <option value="true">Verificada</option>
          <option value="false">No verificada</option>
        `;
        contenedorControles.appendChild(selectorVerificado);
        

        
        const aplicarFiltrosNube = () => {
          const categoriasSeleccionadas = Array.from(selectorCategorias.selectedOptions).map(opt => opt.value);
          const privacidadSeleccionada = document.getElementById("selectorPrivacidad").value;
          const verificadoSeleccionado = document.getElementById("selectorVerificado").value;
      
          const perfilesUsar = document.getElementById("resumenPerfil").querySelector(".indicadores-perfiles")
            ? window.ultimoPerfilesAnalizados || []
            : perfilesSemillaGlobal;
      
          let perfilesFiltrados = perfilesUsar;
      
          if (categoriasSeleccionadas.length > 0) {
            perfilesFiltrados = perfilesFiltrados.filter(p =>
              categoriasSeleccionadas.some(cat =>
                (p.business_category_name || '').toLowerCase().includes(cat.toLowerCase())
              )
            );
          }
      
          if (privacidadSeleccionada !== "") {
            const isPrivado = privacidadSeleccionada === "true";
            perfilesFiltrados = perfilesFiltrados.filter(p => p.private === isPrivado);
          }
      
          if (verificadoSeleccionado !== "") {
            const isVerificado = verificadoSeleccionado === "true";
            perfilesFiltrados = perfilesFiltrados.filter(p => Boolean(p.verified) === isVerificado);
          }
      
          const textoFiltrado = perfilesFiltrados.map(p => p.biography || '').join(' ');
      
          procesarYActualizarWordCloudBiografias({
            texto: textoFiltrado,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloud"
          });
          
          const textoNombres = perfilesFiltrados
            .map(p => p.fullqname || '')
            .filter(nombre => nombre.trim().length > 0)
            .join(' ');
          
          procesarYActualizarWordCloudBiografias({
            texto: textoNombres,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloudNombres"
          });
        };
      
        selectorCategorias.addEventListener("change", aplicarFiltrosNube);
        selectorPrivacidad.addEventListener("change", aplicarFiltrosNube);
        selectorVerificado.addEventListener("change", aplicarFiltrosNube);
  
        // Generar nube inicial con todas las biografías
        const biografiasTextoGeneral = perfiles.map(p => p.biography || '').join(' ');
          procesarYActualizarWordCloudBiografias({
            texto: biografiasTextoGeneral,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloud"
          });
 
        // Generar nube inicial con todos los nombres completos
        const nombresTextoGeneral = perfiles.map(p => p.full_name || '').join(' ');
          procesarYActualizarWordCloudBiografias({
            texto: nombresTextoGeneral,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloudNombres"
          });
 
      })
      .catch(err => {
        console.error("❌ Error al cargar perfiles semilla:", err);
      });
  
    document.getElementById("generarAnalisisBtn").addEventListener("click", () => {
      const seleccionados = Array.from(selector.selectedOptions).map(opt => opt.value);
      console.log("🎯 Fuente ID seleccionados:", seleccionados);
      let data;
  
      fetch('/api/ranchera/perfiles-por-fuente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuentes: seleccionados })
      })
        .then(res => res.json())
        .then(perfiles => { 
          window.ultimoPerfilesAnalizados = perfiles; 
          return perfiles; 
        })
        .then(json => {
          const semillasSeleccionadas = Array.from(selector.selectedOptions).map(opt => {
            const fuenteId = opt.value;
            return perfilesSemillaGlobal.find(p => p.fuente_id == fuenteId) || {};
          });
          data = { top3: semillasSeleccionadas };
          return json;
        })
        .then(perfiles => {
          // Extraer y poblar el selector de categorías desde perfiles
          const categoriasSet = new Set();
          perfiles.forEach(p => {
            const categorias = (p.business_category_name || '').split(',')
              .map(c => c.trim())
              .filter(c => c && c.toLowerCase() !== 'none');
            categorias.forEach(cat => categoriasSet.add(cat));
          });
          
          const selectorCategorias = document.getElementById("selectorCategoria");
          selectorCategorias.innerHTML = "<option value=''>-- Seleccione categoría --</option>";
          [...categoriasSet].sort().forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            selectorCategorias.appendChild(opt);
          });
          
          const biografiasTexto = perfiles.map(p => p.biography || '').join(' ');
          procesarYActualizarWordCloudBiografias({
            texto: biografiasTexto,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloud"
          });
          
          const nombresTexto = perfiles.map(p => p.fullname || '').join(' ');
          procesarYActualizarWordCloudBiografias({
            texto: nombresTexto,
            sliderId: "frecuenciaSlider",
            valorSliderId: "frecuenciaValor",
            contenedorId: "contenedorWordCloudNombres"
          });
          
          const contenedorRed = document.getElementById("contenedorRed");
          contenedorRed.innerHTML = "";
          console.log("🔍 Datos enviados a la red:", {
            semillas: data.top3,
            perfiles
          });
          generarRedPerfiles({ semillas: data.top3, perfiles }, "contenedorRed");
          
          
          crearGraficoScatter({
            contenedorId: 'scatterFollowersPosts',
            titulo: 'Seguidores vs. Publicaciones',
            datos: perfiles
          });
  
          const tarjetasHTML = Array.from(selector.selectedOptions).map(option => {
            const username = option.getAttribute("data-username");
            const fuenteId = option.value;
            const perfilSemilla = data.top3.find(p => p.fuente_id == fuenteId);
            // console.log("Perfil semilla:", perfilSemilla);

      
            return `
              <a href="https://instagram.com/${username}" target="_blank" style="text-decoration: none; color: inherit;">
                <div class="tarjeta-indicador">
                  <img src="/api/ranchera/proxy-img?url=${encodeURIComponent(perfilSemilla.profile_pic_url || perfilSemilla.profile_pic_url_hd || '')}" alt="${username}" style="width: 48px; height: 48px; border-radius: 50%;">
                  <div>
                    <strong>${perfilSemilla.full_name || 'Sin nombre completo'}</strong>
                    <span>@${username}</span><br>
                    <span>${perfiles.filter(p => p.fuente_id == fuenteId).length.toLocaleString('es-CO')} perfiles analizados</span>
                  </div>
                </div>
              </a>
            `;
          }).join("");
  
          const resumenContenedor = document.getElementById("resumenPerfil");
          let contenedorTarjetas = resumenContenedor.querySelector(".indicadores-perfiles");
  
          if (!contenedorTarjetas) {
            const titulo = document.createElement("h3");
            titulo.textContent = "Perfiles disponibles por semilla";
            contenedorTarjetas = document.createElement("div");
            contenedorTarjetas.className = "indicadores-perfiles";
            resumenContenedor.appendChild(titulo);
            resumenContenedor.appendChild(contenedorTarjetas);
          }
  
          contenedorTarjetas.innerHTML = tarjetasHTML;
        })
        .catch(err => {
          console.error("❌ Error cargando biografías por fuente_id:", err);
        });
    });
  }