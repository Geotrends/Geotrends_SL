import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js';
import { crearWordCloud, procesarYActualizarWordCloudBiografias } from './utils/wordClouds.js';
export async function inicializarVistaComentarios() {
  console.log("🟢 Módulo comentarios.js cargado correctamente");

  const contenedor = document.getElementById("graficoScatterComentarios");
  if (!contenedor) return;

  const boton = document.getElementById("btnAplicarFiltros");

  // Obtener referencias a elementos de filtros y sliders
  const filtroKeyword = document.getElementById("filtroKeyword");
  const filtroTipo = document.getElementById("filtroTipo");
  const filtroSentimiento = document.getElementById("filtroSentimiento");
  const filtroFechaDesde = document.getElementById("filtroFechaDesde");
  const filtroFechaHasta = document.getElementById("filtroFechaHasta");
  const filtroLikesMinimos = document.getElementById("filtroLikesMinimos");

  const sliderFrecuenciaHashtags = document.getElementById("sliderFrecuenciaHashtags");
  const valorSliderHashtags = document.getElementById("valorSliderHashtags");

  const sliderFrecuenciaCaption = document.getElementById("sliderFrecuenciaCaption");
  const valorSliderCaption = document.getElementById("valorSliderCaption");

  const sliderFrecuenciaKeywords = document.getElementById("sliderFrecuenciaKeywords");
  const valorSliderKeywords = document.getElementById("valorSliderKeywords");

  const contenedorUsuarios = document.getElementById("graficoScatterUsuarios");
  const contenedorTopEmojis = document.getElementById("graficoTopEmojis");

  const chart = echarts.init(contenedor);
  const chartUsuarios = contenedorUsuarios ? echarts.init(contenedorUsuarios) : null;
  const chartEmojis = contenedorTopEmojis ? echarts.init(contenedorTopEmojis) : null;

  // Variables para guardar datos originales y procesados
  let dataOriginal = [];

  async function cargarDatos() {
    const tipo = filtroTipo.value;
    const sentimiento = filtroSentimiento.value;

    const query = new URLSearchParams();
    if (tipo) query.append("tipo", tipo);
    if (sentimiento) query.append("sentimiento", sentimiento);

    const fechaDesde = filtroFechaDesde.value;
    const fechaHasta = filtroFechaHasta.value;
    const likesMinimos = filtroLikesMinimos.value;

    if (fechaDesde) query.append("fechaDesde", fechaDesde);
    if (fechaHasta) query.append("fechaHasta", fechaHasta);
    if (likesMinimos) query.append("likesMinimos", likesMinimos);

    try {
      const res = await fetch(`/api/ranchera/comentarios-scatter?${query.toString()}`);
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Respuesta inesperada del servidor");
      }
      dataOriginal = data;
      actualizarGraficosYNubes();
    } catch (error) {
      console.error("❌ Error al cargar scatter de comentarios:", error);
    }
  }

  function actualizarGraficosYNubes() {
    if (!dataOriginal.length) return;

    // Procesar scatter comentarios
    const filtroKeywordValue = filtroKeyword ? filtroKeyword.value.trim().toLowerCase() : "";
    const scatterData = dataOriginal.map(post => {
      if (filtroKeywordValue && !(
        (post.caption || "").toLowerCase().includes(filtroKeywordValue) ||
        (Array.isArray(post.hashtags) && post.hashtags.some(h => h.toLowerCase().includes(filtroKeywordValue))) ||
        (Array.isArray(post.top_keywords) && post.top_keywords.some(k => k.toLowerCase().includes(filtroKeywordValue)))
      )) {
        return null;
      }
      const fechaISO = new Date(post.timestamp);
      const fechaStr = fechaISO.toISOString().split("T")[0];
      const fechaLocal = new Date(fechaISO.getTime() - (5 * 60 * 60 * 1000));
      const horaStr = fechaLocal.toTimeString().substring(0, 5);
      return {
        value: [fechaStr, horaStr],
        name: post.owner_username,
        post_id: post.id,
        sentiment: post.sentiment,
        url: post.url || '#',
        caption: post.caption,
        hashtags: post.hashtags,
        summary: post.summary,
        likes: post.likes_count || 1,
        display_url: post.display_url || '#'
      };
    }).filter(Boolean);

    chart.setOption({
      title: { text: 'Publicaciones por fecha y hora', left: 'center' },
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (p) => `
          <div style="max-width: 300px; white-space: normal;">
            <strong>@${p.data.name}</strong><br/>
            Fecha: ${p.data.value[0]}<br/>
            Hora: ${p.data.value[1]}<br/>
            Sentimiento: ${p.data.sentiment}<br/>
            <strong>Caption:</strong> ${p.data.caption || '---'}<br/>
            <strong>Hashtags:</strong> ${Array.isArray(p.data.hashtags) ? p.data.hashtags.join(", ") : '---'}<br/>
            <strong>Resumen:</strong> ${p.data.summary || '---'}<br/>
            <a href="${p.data.url}" target="_blank">Ver en Instagram</a><br/>
            <a href="${p.data.display_url}" target="_blank">Ver imagen</a>
          </div>
        `
      },
      xAxis: { 
        type: 'category', 
        name: 'Fecha', 
        axisLabel: { rotate: 45, interval: 'auto' },
        data: [...new Set(scatterData.map(d => d.value[0]))].sort()
      },
      yAxis: { 
        type: 'category', 
        name: 'Hora',
        axisLabel: { interval: 'auto' },
        data: [...new Set(scatterData.map(d => d.value[1]))].sort()
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          gap:40,
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          start: 0,
          end: 100
        }
      ],
      series: [{
        type: 'scatter',
        data: scatterData.map(d => ({
          ...d,
          url: dataOriginal.find(p => p.id === d.post_id)?.url || '#'
        })),
        itemStyle: {
          color: function (params) {
            const sentimiento = params.data.sentiment;
            switch (sentimiento) {
              case 'POSITIVO': return '#267365'; // verde
              case 'NEGATIVO': return '#F23030'; // rojo
              case 'NEUTRO': return '#F2CB05';   // naranja
              default: return '#9e9e9e';         // gris
            }
          }
        },
        symbolSize: function (val, params) {
          const likes = params.data.likes || 1;
          const minSize = 8;
          const maxSize = 100;

          const likesArray = scatterData.map(p => p.likes || 1);
          const minLikes = Math.min(...likesArray);
          const maxLikes = Math.max(...likesArray);
          const scale = (likes - minLikes) / (maxLikes - minLikes || 1);

          return minSize + scale * (maxSize - minSize);
        },
        emphasis: {
          itemStyle: {
            borderColor: '#024959',
            borderWidth: 2
          }
        }
      }]
    });

    // Añadir clic para abrir publicación
    chart.off('click');
    chart.on('click', (params) => {
      const url = params?.data?.url;
      if (url && url !== '#') {
        window.open(url, '_blank');
      }
    });

    // Procesar scatter usuarios si existe contenedor
    if (chartUsuarios && contenedorUsuarios) {
      const agregadosPorUsuario = {};
      dataOriginal.forEach(post => {
        if (filtroKeywordValue && !(
          (post.caption || "").toLowerCase().includes(filtroKeywordValue) ||
          (Array.isArray(post.hashtags) && post.hashtags.some(h => h.toLowerCase().includes(filtroKeywordValue))) ||
          (Array.isArray(post.top_keywords) && post.top_keywords.some(k => k.toLowerCase().includes(filtroKeywordValue)))
        )) {
          return;
        }
        const usuario = post.owner_username;
        if (!agregadosPorUsuario[usuario]) {
          agregadosPorUsuario[usuario] = { 
            likes: 0, 
            comments: 0,
            sentimientos: {},
            posts: 0
          };
        }
        agregadosPorUsuario[usuario].likes += post.likes_count || 0;
        agregadosPorUsuario[usuario].comments += post.comments_count || 0;
        agregadosPorUsuario[usuario].posts += 1;
        agregadosPorUsuario[usuario].engagement_total = (agregadosPorUsuario[usuario].engagement_total || 0) + (post.engagement_score || 0);
        const s = post.sentiment;
        agregadosPorUsuario[usuario].sentimientos[s] = (agregadosPorUsuario[usuario].sentimientos[s] || 0) + 1;
      });

      Object.values(agregadosPorUsuario).forEach(u => {
        u.engagement = u.posts > 0 ? u.engagement_total / u.posts : 0;
      });

      const scatterUsuarioData = Object.entries(agregadosPorUsuario).map(([usuario, datos]) => {
        const sentimiento = Object.entries(datos.sentimientos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NEUTRO';
        return {
          name: usuario,
          value: [datos.likes, datos.comments],
          sentiment: sentimiento,
          posts: datos.posts,
          engagement: datos.engagement
        };
      });

      chartUsuarios.setOption({
        title: { text: 'Likes vs Comentarios por Usuario', left: 'center' },
        tooltip: {
          trigger: 'item',
          formatter: p => `
            <strong>@${p.data.name}</strong><br/>
            Likes: ${p.data.value[0]}<br/>
            Comentarios: ${p.data.value[1]}<br/>
            Publicaciones: ${p.data.posts || 0}<br/>
            Engagement promedio: ${p.data.engagement.toFixed(2)}
          `
        },
        xAxis: { 
          name: 'Likes', 
          type: 'log',
          minorSplitLine: { show: true },
          min: 1
        },
        yAxis: { 
          name: 'Comentarios', 
          type: 'log',
          minorSplitLine: { show: true },
          min: 1
        },
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0
          },
          {
            type: 'inside',
            yAxisIndex: 0
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            bottom: 10
          },
          {
            type: 'slider',
            yAxisIndex: 0,
            right: 10
          }
        ],
        series: [{
          type: 'scatter',
          data: scatterUsuarioData,
          symbolSize: function (val, params) {
            const total = (val[0] || 0) + (val[1] || 0);
            const minSize = 10;
            const maxSize = 100;

            const valores = scatterUsuarioData.map(p => (p.value[0] || 0) + (p.value[1] || 0));
            const min = Math.min(...valores);
            const max = Math.max(...valores);
            const scale = (total - min) / ((max - min) || 1);

            return minSize + scale * (maxSize - minSize);
          },
          itemStyle: {
            color: function (params) {
              const sentimiento = params.data.sentiment;
              switch (sentimiento) {
                case 'POSITIVO': return '#267365';
                case 'NEGATIVO': return '#F23030';
                case 'NEUTRO': return '#F2CB05';
                default: return '#9e9e9e';
              }
            }
          },
          emphasis: {
            itemStyle: {
              borderColor: '#024959',
              borderWidth: 2
            }
          }
        }]
      });
    }

    // Filtrar data para nubes y emojis según palabra clave
    const dataFiltrada = dataOriginal.filter(post => {
      return !filtroKeywordValue || (
        (post.caption || "").toLowerCase().includes(filtroKeywordValue) ||
        (Array.isArray(post.hashtags) && post.hashtags.some(h => h.toLowerCase().includes(filtroKeywordValue))) ||
        (Array.isArray(post.top_keywords) && post.top_keywords.some(k => k.toLowerCase().includes(filtroKeywordValue)))
      );
    });

    // Nube de palabras de hashtags con sliderFrecuenciaHashtags
    const hashtagsTodos = dataFiltrada.flatMap(post => Array.isArray(post.hashtags) ? post.hashtags : []);
    const frecuenciaHashtags = hashtagsTodos.reduce((acc, tag) => {
      const limpio = tag.trim().toLowerCase();
      acc[limpio] = (acc[limpio] || 0) + 1;
      return acc;
    }, {});
    const arregloHashtags = Object.entries(frecuenciaHashtags).map(([text, weight]) => ({ text, weight }));

    if (sliderFrecuenciaHashtags && valorSliderHashtags) {
      const minFrecuencia = parseInt(sliderFrecuenciaHashtags.value, 10) || 1;
      valorSliderHashtags.textContent = minFrecuencia;
      const filtradas = arregloHashtags.filter(p => p.weight >= minFrecuencia);
      crearWordCloud({
        contenedorId: 'nubeHashtags',
        palabras: filtradas
      });
    }

    // Nube de palabras captions
    if (sliderFrecuenciaCaption && valorSliderCaption) {
      const textoCaptions = dataFiltrada.map(p => p.caption || "").join(" ");
      procesarYActualizarWordCloudBiografias({
        texto: textoCaptions,
        sliderId: "sliderFrecuenciaCaption",
        valorSliderId: "valorSliderCaption",
        contenedorId: "nubeCaption"
      });
    }

    // Nube de palabras keywords
    if (sliderFrecuenciaKeywords && valorSliderKeywords) {
      const textoKeywords = dataFiltrada.flatMap(p => Array.isArray(p.top_keywords) ? p.top_keywords : []).join(" ");
      procesarYActualizarWordCloudBiografias({
        texto: textoKeywords,
        sliderId: "sliderFrecuenciaKeywords",
        valorSliderId: "valorSliderKeywords",
        contenedorId: "nubeKeywords"
      });
    }

    // Gráfico emojis más usados
    if (chartEmojis && contenedorTopEmojis) {
      const conteoEmojis = {};
      dataFiltrada.forEach(p => {
        (Array.isArray(p.top_emojis) ? p.top_emojis : []).forEach(e => {
          conteoEmojis[e] = (conteoEmojis[e] || 0) + 1;
        });
      });

      const arregloEmojis = Object.entries(conteoEmojis)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([emoji, count]) => ({ emoji, count }));

      chartEmojis.setOption({
        title: { text: 'Emojis más usados', left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: arregloEmojis.map(e => e.emoji),
          axisLabel: { fontSize: 24 }
        },
        yAxis: { type: 'value', name: '' },
        series: [{
          type: 'bar',
          data: arregloEmojis.map(e => e.count),
          itemStyle: {
            color: '#5caac8'
          }
        }]
      });
    }
  }

  // Añadir eventos para actualizar datos y gráficos al cambiar filtros o sliders
  boton.addEventListener("click", cargarDatos);

  if (sliderFrecuenciaHashtags) {
    sliderFrecuenciaHashtags.addEventListener('input', () => {
      if (dataOriginal.length) actualizarGraficosYNubes();
    });
  }
  if (sliderFrecuenciaCaption) {
    sliderFrecuenciaCaption.addEventListener('input', () => {
      if (dataOriginal.length) actualizarGraficosYNubes();
    });
  }
  if (sliderFrecuenciaKeywords) {
    sliderFrecuenciaKeywords.addEventListener('input', () => {
      if (dataOriginal.length) actualizarGraficosYNubes();
    });
  }

  // También se puede actualizar al cambiar filtros (opcional)
  [filtroKeyword, filtroTipo, filtroSentimiento, filtroFechaDesde, filtroFechaHasta, filtroLikesMinimos].forEach(elem => {
    if (elem) {
      elem.addEventListener('change', () => {
        cargarDatos();
      });
    }
  });

  // Inicializar carga de datos y gráficos
  cargarDatos();

  // Ajustar tamaño charts al redimensionar ventana
  window.addEventListener("resize", () => {
    chart.resize();
    if (chartUsuarios) chartUsuarios.resize();
    if (chartEmojis) chartEmojis.resize();
  });
}