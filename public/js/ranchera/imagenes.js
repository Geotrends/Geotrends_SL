import * as echarts from "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js";

export function inicializarVistaImagenes() {
    console.log("JS activo");
   // const estado = document.getElementById("estadoConexion");
    if (estado) {
     // estado.textContent = "✅ Conexión JS establecida correctamente";
    } else {
      console.warn("No se encontró el elemento con ID estadoConexion");
    }
  }

  fetch("/api/ranchera/imagenes-etiquetas")
  .then((res) => {
    if (!res.ok) throw new Error("Error al obtener etiquetas");
    return res.json();
  })
  .then((data) => {

    const etiquetasUnicas = [
      "animales", "comida", "turismo", "sonrisa", "grupo_personas",
      "perro", "gato", "niños", "adultos", "jovenes", "deportes", "moda"
    ];

    const enlaces = [];
    const coocurrencias = {};

    data.forEach(row => {
      const activas = etiquetasUnicas.filter(et => row[et] && row[et] > 0);
      for (let i = 0; i < activas.length; i++) {
        for (let j = i + 1; j < activas.length; j++) {
          const key = [activas[i], activas[j]].sort().join("|");
          coocurrencias[key] = (coocurrencias[key] || 0) + 1;
        }
      }
    });

    Object.entries(coocurrencias).forEach(([key, value]) => {
      const [source, target] = key.split("|");
      enlaces.push({
        source,
        target,
        value
      });
    });

    // Crear contenedor visual para gráfico + descripción
    const contenedor = document.createElement("div");
    contenedor.className = "bloque-contenedor";
    contenedor.style.padding = "1.5rem";
    // Insertar en el contenedor oculto de imágenes
    const imagenesContenido = document.querySelector(".imagenes-contenido");
    const destinoGraficos = imagenesContenido || document.querySelector(".imagenes");
    destinoGraficos.appendChild(contenedor);

    // Div para el gráfico
    const graficoRelaciones = document.createElement("div");
    graficoRelaciones.id = "graficoRelacionesEtiquetas";
    graficoRelaciones.style.height = "600px";
    contenedor.appendChild(graficoRelaciones);

    const categorias = {
      edad: ["niños", "adultos", "jovenes"],
      animales: ["animales", "gato", "perro"],
      hobbies: ["deportes", "comida", "moda", "turismo"],
      emociones: ["grupo_personas", "sonrisa"]
    };

    const categoryNames = Object.keys(categorias);
    const categoryMap = {};
    categoryNames.forEach((nombre, i) => {
      categorias[nombre].forEach(e => categoryMap[e] = i);
    });

    const frecuencias = {};
    data.forEach(row => {
      etiquetasUnicas.forEach(et => {
        if (row[et] && row[et] > 0) {
          frecuencias[et] = (frecuencias[et] || 0) + 1;
        }
      });
    });

    const maxFreq = Math.max(...etiquetasUnicas.map(et => frecuencias[et] || 0));
    const minSize = 20;
    const maxSize = 60;

    const nodes = etiquetasUnicas.map(name => {
      const freq = frecuencias[name] || 0;
      const normSize = maxFreq > 0
        ? minSize + ((freq / maxFreq) * (maxSize - minSize))
        : minSize;
      return {
        name,
        symbolSize: normSize,
        value: freq,
        category: categoryMap[name] || 0
      };
    });

    const chart = echarts.init(graficoRelaciones);
    chart.setOption({
      title: {
        text: "Relaciones entre etiquetas de imagen",
        top: "top",
        left: "center"
      },
      tooltip: {},
      legend: {
        data: categoryNames,
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        type: "graph",
        layout: "circular",
        symbolSize: 30,
        roam: true,
        label: {
          show: true,
          position: "right"
        },
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: [4, 8],
        edgeLabel: {
          fontSize: 12
        },
        categories: categoryNames.map((name, i) => ({ name })),
        data: nodes,
        links: enlaces,
        lineStyle: {
          color: "source",
          curveness: 0.3
        },
        emphasis: {
          focus: 'adjacency',
          blurScope: 'global'
        },
        blur: {
          itemStyle: {
            opacity: 0.2
          },
          lineStyle: {
            opacity: 0.1
          }
        }
      }]
    });

    // Descripción para graficoRelacionesEtiquetas
    const desc1 = document.createElement("p");
    desc1.className = "descripcion-grafico";
    desc1.textContent = "Este gráfico muestra cómo se relacionan las etiquetas más frecuentes presentes en las imágenes, agrupadas por categorías temáticas.";
    contenedor.appendChild(desc1);

    // === NUBE DE PALABRAS DE ETIQUETAS (con slider de frecuencia mínima) ===
    import('/js/ranchera/utils/wordClouds.js').then(({ crearWordCloud }) => {
      // Crear contenedor visual
      const wrapper = document.createElement("div");
      wrapper.className = "bloque-contenedor";

      const titulo = document.createElement("h3");
      titulo.textContent = "Nube de palabras de etiquetas";

      const sliderLabel = document.createElement("label");
      sliderLabel.innerHTML = `
        <span style="margin-right: 10px;">Frecuencia mínima:</span>
        <input type="range" id="sliderEtiquetas" min="1" max="20" step="1" value="3" style="vertical-align: middle;">
        <span id="valorSliderEtiquetas">3</span>
      `;

      const divNube = document.createElement("div");
      divNube.id = "nubeEtiquetasTotales";
      divNube.style.height = "500px";
      divNube.style.width = "100%";

      wrapper.appendChild(titulo);
      wrapper.appendChild(sliderLabel);
      wrapper.appendChild(divNube);

      const frecuenciaPalabrasEtiquetas = {};
      data.forEach(row => {
        if (Array.isArray(row.etiquetas)) {
          row.etiquetas.forEach(et => {
            const palabras = et.split(/[,\s]+/);
            palabras.forEach(palabraCruda => {
              const palabra = palabraCruda.replace(/["{}]/g, "").trim().toLowerCase();
              if (palabra) {
                frecuenciaPalabrasEtiquetas[palabra] = (frecuenciaPalabrasEtiquetas[palabra] || 0) + 1;
              }
            });
          });
        }
      });

      const listaPalabrasEtiquetas = Object.entries(frecuenciaPalabrasEtiquetas)
        .map(([text, weight]) => ({ text, weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 300);

      // El slider y valor deben buscarse después de insertarse en el DOM
      destinoGraficos.appendChild(wrapper);
      const slider = document.getElementById("sliderEtiquetas");
      const valor = document.getElementById("valorSliderEtiquetas");

      function actualizarNube() {
        const minFreq = parseInt(slider.value, 10);
        valor.textContent = minFreq;
        const filtradas = listaPalabrasEtiquetas.filter(p => p.weight >= minFreq);
        crearWordCloud({
          contenedorId: "nubeEtiquetasTotales",
          palabras: filtradas
        });
      }

      slider.addEventListener("input", actualizarNube);
      actualizarNube();

      // Descripción para nube de palabras
      const desc2 = document.createElement("p");
      desc2.className = "descripcion-grafico";
      desc2.textContent = "Nube de palabras que representa la frecuencia de etiquetas utilizadas en todas las imágenes procesadas.";
      wrapper.appendChild(desc2);
    }).then(() => {
      // === HEATMAP CUENTAS vs CATEGORÍAS ===
      const cuentas = Array.from(new Set(data.map(d => d.path.split("_")[0])));
      const categoriasHeatmap = [
        "animales", "comida", "turismo", "sonrisa", "grupo_personas",
        "perro", "gato", "niños", "adultos", "jovenes", "deportes", "moda"
      ];

      // Mapeo para índices
      const cuentaIndex = Object.fromEntries(cuentas.map((c, i) => [c, i]));
      const categoriaIndex = Object.fromEntries(categoriasHeatmap.map((c, i) => [c, i]));

      // Matriz de frecuencia
      const frecuenciaPorCuentaCategoria = {};
      data.forEach(row => {
        const cuenta = row.path.split("_")[0];
        categoriasHeatmap.forEach(cat => {
          if (row[cat] && row[cat] > 0) {
            const key = `${cuenta}|${cat}`;
            frecuenciaPorCuentaCategoria[key] = (frecuenciaPorCuentaCategoria[key] || 0) + row[cat];
          }
        });
      });

      const heatmapData = Object.entries(frecuenciaPorCuentaCategoria).map(([key, value]) => {
        const [cuenta, categoria] = key.split("|");
        return [cuentaIndex[cuenta], categoriaIndex[categoria], value];
      });

      // Crear contenedor visual para heatmap + descripción
      const contenedor4 = document.createElement("div");
      contenedor4.className = "bloque-contenedor";
      destinoGraficos.appendChild(contenedor4);

      const graficoHeatmap = document.createElement("div");
      graficoHeatmap.id = "heatmapCuentasCategorias";
      graficoHeatmap.style.height = "700px";
      contenedor4.appendChild(graficoHeatmap);

      const chart4 = echarts.init(graficoHeatmap);
      chart4.setOption({
        animation: false,
        tooltip: {
          position: 'top',
          formatter: function (params) {
            return `${cuentas[params.value[0]]} / ${categoriasHeatmap[params.value[1]]} : ${params.value[2]}`;
          }
        },
        grid: {
          height: '80%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: cuentas,
          splitArea: { show: true },
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: {
          type: 'category',
          data: categoriasHeatmap,
          splitArea: { show: true }
        },
        visualMap: {
          min: 0,
          max: Math.max(...heatmapData.map(d => d[2])),
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '5%'
        },
        series: [{
          name: 'Frecuencia',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              borderColor: '#000',
              borderWidth: 1
            }
          }
        }]
      });

      // Descripción para heatmapCuentasCategorias
      const desc3 = document.createElement("p");
      desc3.className = "descripcion-grafico";
      desc3.textContent = "Este mapa de calor muestra la frecuencia con que cada cuenta publica imágenes relacionadas con diferentes categorías.";
      contenedor4.appendChild(desc3);

      // === HEATMAP AGRUPADO estilo heatmap-large ===
      /*
      // Bloque comentado: construcción del segundo heatmap (chart5)
      const cuentasTop = cuentas.slice(0, 100); // limitar para legibilidad
      const cuentasTopIndex = Object.fromEntries(cuentasTop.map((c, i) => [c, i]));
      const categoriaIndex2 = Object.fromEntries(categoriasHeatmap.map((c, i) => [c, i]));

      // Nueva matriz de frecuencia agrupada
      const frecuenciaTop = {};
      data.forEach(row => {
        const cuenta = row.path.split("_")[0];
        if (!cuentasTopIndex.hasOwnProperty(cuenta)) return;

        categoriasHeatmap.forEach(cat => {
          if (row[cat] && row[cat] > 0) {
            const key = `${cuenta}|${cat}`;
            frecuenciaTop[key] = (frecuenciaTop[key] || 0) + row[cat];
          }
        });
      });

      const heatmapDataTop = Object.entries(frecuenciaTop).map(([key, value]) => {
        const [cuenta, categoria] = key.split("|");
        return [cuentasTopIndex[cuenta], categoriaIndex2[categoria], value];
      });

      const contenedor5 = document.createElement("div");
      contenedor5.id = "heatmapTopCuentasCategorias";
      contenedor5.style.height = "700px";
      contenedor5.className = "bloque-contenedor";
      document.querySelector(".imagenes").appendChild(contenedor5);

      const chart5 = echarts.init(contenedor5);
      chart5.setOption({
        animation: false,
        tooltip: {
          position: 'top',
          formatter: function (params) {
            return `${cuentasTop[params.value[0]]} / ${categoriasHeatmap[params.value[1]]} : ${params.value[2]}`;
          }
        },
        grid: {
          height: '80%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: cuentasTop,
          splitArea: { show: true },
          axisLabel: { rotate: 45 }
        },
        yAxis: {
          type: 'category',
          data: categoriasHeatmap,
          splitArea: { show: true }
        },
        visualMap: {
          min: 0,
          max: Math.max(...heatmapDataTop.map(d => d[2])),
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '5%'
        },
        series: [{
          name: 'Frecuencia',
          type: 'heatmap',
          data: heatmapDataTop,
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              borderColor: '#000',
              borderWidth: 1
            }
          }
        }]
      });
      */
    }).then(() => {
      // === GRAFO USUARIO ↔ ETIQUETAS ===
      const usuarios = {};
      const etiquetas = {};
      const conexiones = new Set();

      data.forEach(row => {
        const usuario = row.path.split("_")[0];
        usuarios[usuario] = (usuarios[usuario] || 0) + 1;

        if (Array.isArray(row.etiquetas)) {
          row.etiquetas.forEach(et => {
            const palabras = et.split(/[,\s]+/);
            palabras.forEach(palabraCruda => {
              const palabra = palabraCruda.replace(/["{}]/g, "").trim().toLowerCase();
              if (!palabra) return;
              etiquetas[palabra] = (etiquetas[palabra] || 0) + 1;
              // conectar usuario con etiqueta
              conexiones.add(`${usuario}=>${palabra}`);
            });
          });

          // conectar etiquetas entre sí
          for (let i = 0; i < row.etiquetas.length; i++) {
            for (let j = i + 1; j < row.etiquetas.length; j++) {
              const a = row.etiquetas[i].trim().toLowerCase();
              const b = row.etiquetas[j].trim().toLowerCase();
              if (a && b && a !== b) {
                const key = [a, b].sort().join("=>");
                conexiones.add(key);
              }
            }
          }
        }
      });

      const MIN_FREQ_USUARIO = 3;
      const MIN_FREQ_ETIQUETA = 5;

      const usuariosFiltrados = Object.fromEntries(
        Object.entries(usuarios).filter(([_, freq]) => freq >= MIN_FREQ_USUARIO)
      );

      const etiquetasFiltradas = Object.fromEntries(
        Object.entries(etiquetas).filter(([_, freq]) => freq >= MIN_FREQ_ETIQUETA)
      );

      const nodos = [];
      const enlaces2 = [];

      Object.entries(usuariosFiltrados).forEach(([nombre, peso]) => {
        nodos.push({
          name: nombre,
          category: 0,
          value: peso,
          symbolSize: 40 + peso,
        });
      });

      Object.entries(etiquetasFiltradas).forEach(([nombre, peso]) => {
        nodos.push({
          name: nombre,
          category: 1,
          value: peso,
          symbolSize: 10 + peso * 2,
        });
      });

      conexiones.forEach(enlace => {
        const [source, target] = enlace.split("=>");
        if (source && target && source !== target) {
          enlaces2.push({ source, target });
        }
      });

      const nombresNodos = new Set(nodos.map(n => n.name));
      const enlacesValidados = enlaces2.filter(e =>
        typeof e.source === "string" &&
        typeof e.target === "string" &&
        e.source !== "" &&
        e.target !== "" &&
        e.source !== e.target &&
        nombresNodos.has(e.source) &&
        nombresNodos.has(e.target)
      );
      // Crear contenedor visual para grafo + descripción
      const contenedor2 = document.createElement("div");
      contenedor2.className = "bloque-contenedor";
      destinoGraficos.appendChild(contenedor2);

      const divGrafo = document.createElement("div");
      divGrafo.id = "grafoUsuariosEtiquetas";
      divGrafo.style.height = "700px";
      contenedor2.appendChild(divGrafo);

      // Normalize symbolSize of nodes
      const maxValor = Math.max(...nodos.map(n => n.value || 0));
      const minSize2 = 10;
      const maxSize2 = 60;
      nodos.forEach(n => {
        const val = n.value || 0;
        n.symbolSize = maxValor > 0 ? minSize2 + ((val / maxValor) * (maxSize2 - minSize2)) : minSize2;
      });

      const chart2 = echarts.init(divGrafo);
      console.log("🧩 Nodos:", nodos);
      console.log("🔗 Enlaces validados:", enlacesValidados);
      console.log("🧾 Nombres únicos de nodos:", [...nombresNodos]);
      console.log("🎯 Total nodos:", nodos.length, " | Total enlaces:", enlacesValidados.length);

      const nodosUnicos = Array.from(new Map(nodos.map(n => [n.name, n])).values());

      chart2.setOption({
        title: {
          text: "Relación usuarios - etiquetas y coocurrencias",
          top: "top",
          left: "center"
        },
        tooltip: {},
        legend: [{
          data: ["usuarios", "etiquetas"]
        }],
        series: [{
          type: "graph",
          layout: "force",
          categories: [{ name: "usuarios" }, { name: "etiquetas" }],
          roam: true,
          label: {
            show: false
          },
          force: {
            repulsion: 180,
            edgeLength: 60
          },
          data: nodosUnicos,
          links: enlacesValidados,
          lineStyle: {
            opacity: 0.8,
            width: 1,
            curveness: 0.3
          },
          emphasis: {
            focus: 'adjacency',
            blurScope: 'global'
          },
          blur: {
            itemStyle: {
              opacity: 0.2
            },
            lineStyle: {
              opacity: 0.1
            }
          }
        }]
      });

      // Descripción para grafoUsuariosEtiquetas
      const desc4 = document.createElement("p");
      desc4.className = "descripcion-grafico";
      desc4.textContent = "Red que muestra las conexiones entre usuarios y las etiquetas más frecuentes en sus publicaciones.";
      contenedor2.appendChild(desc4);

      // === GRAFO USUARIO ↔ CATEGORÍAS FIJAS ===
      /*
      // BLOQUE COMENTADO: Eliminado para no mostrar ni procesar la red de usuarios ↔ categorías fijas
      const categoriasFijas = [
        "animales", "comida", "turismo", "sonrisa", "grupo_personas",
        "perro", "gato", "niños", "adultos", "jovenes", "deportes", "moda"
      ];

      const aparicionesTotales = {}; // tamaño de nodo
      const conexionesUsuarioCategoria = {}; // enlaces con peso

      data.forEach(row => {
        const usuario = row.path.split("_")[0];
        categoriasFijas.forEach(cat => {
          const valor = row[cat];
          if (valor && valor > 0) {
            aparicionesTotales[cat] = (aparicionesTotales[cat] || 0) + 1;
            const clave = `${usuario}=>${cat}`;
            conexionesUsuarioCategoria[clave] = (conexionesUsuarioCategoria[clave] || 0) + valor;
          }
        });
      });

      // Construcción de nodos
      const nodosUsuarioCat = [];
      const enlacesUsuarioCat = [];

      const usuariosUnicos = new Set(Object.keys(conexionesUsuarioCategoria).map(k => k.split("=>")[0]));
      usuariosUnicos.forEach(u => {
        nodosUsuarioCat.push({
          name: u,
          category: 0,
          value: 1,
          symbolSize: 30
        });
      });

      const maxApariciones = Math.max(...Object.values(aparicionesTotales));
      const minCatSize = 20;
      const maxCatSize = 60;

      Object.entries(aparicionesTotales).forEach(([cat, total]) => {
        const size = maxApariciones > 0
          ? minCatSize + (total / maxApariciones) * (maxCatSize - minCatSize)
          : minCatSize;
        nodosUsuarioCat.push({
          name: cat,
          category: 1,
          value: total,
          symbolSize: size
        });
      });

      // Enlaces
      Object.entries(conexionesUsuarioCategoria).forEach(([clave, peso]) => {
        const [usuario, cat] = clave.split("=>");
        if (usuario && cat) {
          enlacesUsuarioCat.push({
            source: usuario,
            target: cat,
            value: peso,
            lineStyle: {
              width: Math.log2(peso + 1) + 1
            }
          });
        }
      });

      const contenedor3 = document.createElement("div");
      contenedor3.id = "grafoUsuariosCategoriasFijas";
      contenedor3.style.height = "700px";
      contenedor3.className = "bloque-contenedor";
      document.querySelector(".imagenes").appendChild(contenedor3);

      const chart3 = echarts.init(contenedor3);
      chart3.setOption({
        title: {
          text: "Relación usuarios y categorías fijas",
          top: "top",
          left: "center"
        },
        tooltip: {},
        legend: {
          data: ["usuarios", "categorías"]
        },
        series: [{
          type: "graph",
          categories: [{ name: "usuarios" }, { name: "categorías" }],
          layout: "force",
          force: {
            repulsion: 1000,
            edgeLength: [80, 200],
            gravity: 0.1
          },
          roam: true,
          label: { show: false },
          data: nodosUsuarioCat,
          links: enlacesUsuarioCat,
          emphasis: {
            focus: 'adjacency',
            blurScope: 'global'
          },
          blur: {
            itemStyle: {
              opacity: 0.2
            },
            lineStyle: {
              opacity: 0.1
            }
          }
        }]
      });
      */
    });
})
.catch((err) => {
  console.error("❌ Error al consultar etiquetas:", err);
});

// Carrusel por usuario (versión original)
fetch("/api/ranchera/imagenes-etiquetas")
  .then((res) => res.json())
  .then((data) => {
    const contenedorCarrusel = document.getElementById("contenedorCarrusel");
    const selector = document.getElementById("selectorUsuario");
    if (!contenedorCarrusel || !selector) return;

    // Obtener usuarios únicos
    const usuariosUnicos = [...new Set(data.map(d => d.path.split("_")[0]))];
    usuariosUnicos.forEach(usuario => {
      const option = document.createElement("option");
      option.value = usuario;
      option.textContent = usuario;
      selector.appendChild(option);
    });

    selector.addEventListener("change", () => {
      const usuarioSeleccionado = selector.value;
      // Limpia SOLO la galería y la nube de etiquetas/resumen del usuario seleccionado
      const galeria = document.getElementById("galeriaUsuario");
      if (galeria) galeria.innerHTML = "";
      const divNubeUsuario = document.getElementById("nubeEtiquetasUsuario");
      if (divNubeUsuario) divNubeUsuario.innerHTML = "";
      const resumen = document.getElementById("resumenEtiquetasUsuario");
      if (resumen) resumen.innerHTML = "";

      // Siempre asegurar visibilidad y existencia del bloque de nube/síntesis
      const contenedorNube = document.getElementById("nubeEtiquetasUsuario");
      if (contenedorNube) {
        contenedorNube.style.display = "block";
      }
      const bloqueSintesis = document.getElementById("bloqueSintesisUsuario");
      if (bloqueSintesis) {
        bloqueSintesis.style.display = "block";
      }

      // NO remover ni sobrescribir #bloqueSintesisUsuario ni #nubeEtiquetasUsuario
      // (ya no hay ningún .remove() ni innerHTML global aquí)

      // Mostrar transición de galería/nube
      const bloqueGaleria = document.querySelector(".galeria-transicion");
      if (bloqueGaleria) {
        bloqueGaleria.style.opacity = "0";
        setTimeout(() => {
          bloqueGaleria.style.opacity = "1";
        }, 100);
      }

      // No hacer return anticipado: si no hay usuario, solo limpiar, pero mantener nube visible
      if (!usuarioSeleccionado) {
        // La nube y resumen ya están limpios arriba, pero el contenedor sigue visible
        return;
      }

      const imagenes = data.filter(d => d.path.startsWith(`${usuarioSeleccionado}_`));
      if (imagenes.length === 0) {
        if (galeria) galeria.innerHTML = "<p>No hay imágenes para este usuario.</p>";
        // Aún así, permitir que la nube de palabras se genere (estará vacía)
      }

      if (imagenes.length > 0) {
        const carrusel = document.createElement("div");
        carrusel.className = "carrusel-usuario";
        imagenes.forEach((imgData) => {
          const wrapper = document.createElement("div");
          wrapper.className = "slide-imagen";

          const img = document.createElement("img");
          // Nueva lógica para evitar duplicación de carpeta si el path ya tiene subcarpeta
          let srcFinal = "";
          if (imgData.path.includes("/")) {
            srcFinal = `/images/Imagenes_Ranchera/${imgData.path}`;
          } else {
            const usuarioCarpeta = imgData.path.split("_")[0];
            srcFinal = `/images/Imagenes_Ranchera/${usuarioCarpeta}_photos/${imgData.path}`;
          }
          img.src = srcFinal;
          img.alt = imgData.imagen || usuarioSeleccionado;
          // Validar error de carga de imagen: si hay error, eliminar el wrapper
          img.onerror = () => {
            wrapper.remove();
          };

          const pie = document.createElement("p");
          pie.className = "pie-imagen";
          pie.textContent = Array.isArray(imgData.etiquetas)
            ? imgData.etiquetas.join(", ")
            : "Sin etiquetas";

          wrapper.appendChild(img);
          wrapper.appendChild(pie);
          carrusel.appendChild(wrapper);
        });
        if (galeria) galeria.appendChild(carrusel);
      }

      // === NUBE DE PALABRAS DEL USUARIO SELECCIONADO (siempre ejecutada) ===
      const etiquetasUsuario = {};
      imagenes.forEach(img => {
        if (Array.isArray(img.etiquetas)) {
          img.etiquetas.forEach(et => {
            const palabras = et.split(/[,\s]+/);
            palabras.forEach(palabraCruda => {
              const palabra = palabraCruda.replace(/["{}]/g, "").trim().toLowerCase();
              if (palabra) {
                etiquetasUsuario[palabra] = (etiquetasUsuario[palabra] || 0) + 1;
              }
            });
          });
        }
      });

      const lista = Object.entries(etiquetasUsuario)
        .map(([text, weight]) => ({ text, weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 120);

      import('/js/ranchera/utils/wordClouds.js').then(({ crearWordCloud }) => {
        // Forzar visibilidad y existencia del contenedor de la nube ANTES de crear la nube
        const contenedorNube = document.getElementById("nubeEtiquetasUsuario");
        if (contenedorNube) {
          contenedorNube.style.display = "block";
        }
        if (contenedorNube) {
          const contenedor = document.getElementById("nubeEtiquetasUsuario");
          if (contenedor) {
            contenedor.innerHTML = "";
            const chart = echarts.init(contenedor);
            chart.clear();
            chart.dispose(); // 🔄 fuerza recreación del gráfico
            crearWordCloud({
              contenedorId: "nubeEtiquetasUsuario",
              palabras: lista
            });
          }
        }

        const resumen = document.getElementById("resumenEtiquetasUsuario");
        if (resumen) {
          const top3 = lista.slice(0, 3).map(p => p.text);
          if (top3.length > 0) {
            resumen.innerHTML = `🔍 Este usuario se asocia principalmente con las etiquetas: <strong>${top3.join(", ")}</strong>.`;
          } else {
            resumen.innerHTML = "";
          }
        }
      });
    });
    });
    // Mostrar suavemente el contenedor de gráficos una vez que todo está cargado
    const contenido = document.querySelector(".imagenes-contenido");
    if (contenido) {
      setTimeout(() => {
        contenido.style.opacity = "1";
      }, 300);
    }