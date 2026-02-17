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

  const chart = echarts.init(contenedor, null, { renderer: 'canvas', useDirtyRect: true });
  const chartUsuarios = contenedorUsuarios ? echarts.init(contenedorUsuarios, null, { renderer: 'canvas', useDirtyRect: true }) : null;
  const chartEmojis = contenedorTopEmojis ? echarts.init(contenedorTopEmojis, null, { renderer: 'canvas', useDirtyRect: true }) : null;
  const MAX_PUNTOS_SCATTER = 3000;

  // Variables para guardar datos originales y procesados
  let dataOriginal = [];
  let dataFiltradaActual = [];
  let listaHashtagsActual = [];
  let textoCaptionsActual = "";
  let textoKeywordsActual = "";
  let topEmojisActual = [];
  let fetchController = null;

  const toArray = (value) => (Array.isArray(value) ? value : []);
  const obtenerFechaHoraLocal = (timestamp) => {
    const fechaISO = new Date(timestamp);
    if (Number.isNaN(fechaISO.getTime())) return null;
    const fechaStr = fechaISO.toISOString().split("T")[0];
    const fechaLocal = new Date(fechaISO.getTime() - (5 * 60 * 60 * 1000));
    const horaStr = fechaLocal.toTimeString().substring(0, 5);
    return { fechaStr, horaStr };
  };

  const normalizarPost = (post) => {
    const hashtags = toArray(post.hashtags);
    const topKeywords = toArray(post.top_keywords);
    const topEmojis = toArray(post.top_emojis);
    const caption = post.caption || "";
    const fechaHora = obtenerFechaHoraLocal(post.timestamp);
    if (!fechaHora) return null;
    const { fechaStr, horaStr } = fechaHora;

    return {
      ...post,
      hashtags,
      top_keywords: topKeywords,
      top_emojis: topEmojis,
      caption,
      likes_count: Number(post.likes_count || 0),
      comments_count: Number(post.comments_count || 0),
      engagement_score: Number(post.engagement_score || 0),
      __fechaStr: fechaStr,
      __horaStr: horaStr,
      __searchText: `${caption} ${hashtags.join(" ")} ${topKeywords.join(" ")}`.toLowerCase()
    };
  };

  const crearDebounce = (fn, ms = 250) => {
    let timeoutId = null;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  };

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
      if (fetchController) fetchController.abort();
      fetchController = new AbortController();
      chart.showLoading('default', { text: 'Loading posts...' });

      const res = await fetch(`/api/ranchera/comentarios-scatter?${query.toString()}`, {
        signal: fetchController.signal
      });
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Respuesta inesperada del servidor");
      }
      dataOriginal = data.map(normalizarPost).filter(Boolean);
      actualizarGraficosYNubes();
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("❌ Error al cargar scatter de comentarios:", error);
    } finally {
      chart.hideLoading();
    }
  }

  function actualizarGraficosYNubes() {
    if (!dataOriginal.length) return;

    const filtroKeywordValue = filtroKeyword ? filtroKeyword.value.trim().toLowerCase() : "";
    dataFiltradaActual = filtroKeywordValue
      ? dataOriginal.filter((post) => post.__searchText.includes(filtroKeywordValue))
      : dataOriginal;

    const hashtagsTodos = dataFiltradaActual.flatMap(post => post.hashtags);
    const frecuenciaHashtags = hashtagsTodos.reduce((acc, tag) => {
      const limpio = tag.trim().toLowerCase();
      acc[limpio] = (acc[limpio] || 0) + 1;
      return acc;
    }, {});
    listaHashtagsActual = Object.entries(frecuenciaHashtags).map(([text, weight]) => ({ text, weight }));

    textoCaptionsActual = dataFiltradaActual.map(p => p.caption || "").join(" ");
    textoKeywordsActual = dataFiltradaActual.flatMap(p => p.top_keywords).join(" ");

    const conteoEmojis = {};
    dataFiltradaActual.forEach(p => {
      p.top_emojis.forEach(e => {
        conteoEmojis[e] = (conteoEmojis[e] || 0) + 1;
      });
    });
    topEmojisActual = Object.entries(conteoEmojis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([emoji, count]) => ({ emoji, count }));

    let scatterData = dataFiltradaActual.map(post => {
      return {
        value: [post.__fechaStr, post.__horaStr],
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
    });
    if (scatterData.length > MAX_PUNTOS_SCATTER) {
      scatterData = scatterData.slice(0, MAX_PUNTOS_SCATTER);
    }

    if (!scatterData.length) {
      chart.clear();
      chart.setOption({
        title: { text: 'Posts by date and time', left: 'center' },
        graphic: {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: { text: 'No data to display with current filters', fill: '#666', fontSize: 14 }
        }
      }, { notMerge: true, lazyUpdate: true });
      return;
    }

    const likesArray = scatterData.map((p) => p.likes || 1);
    const minLikes = likesArray.length ? Math.min(...likesArray) : 1;
    const maxLikes = likesArray.length ? Math.max(...likesArray) : 1;

    chart.setOption({
      title: { text: 'Posts by date and time', left: 'center' },
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (p) => `
          <div style="max-width: 300px; white-space: normal;">
            <strong>@${p.data.name}</strong><br/>
            Date: ${p.data.value[0]}<br/>
            Time: ${p.data.value[1]}<br/>
            Sentiment: ${p.data.sentiment}<br/>
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
        name: 'Date', 
        axisLabel: { rotate: 45, interval: 'auto' },
        data: [...new Set(scatterData.map(d => d.value[0]))].sort()
      },
      yAxis: { 
        type: 'category', 
        name: 'Time',
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
        data: scatterData,
        animation: false,
        progressive: 3000,
        progressiveThreshold: 1500,
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
    }, { notMerge: true, lazyUpdate: true });

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
      dataFiltradaActual.forEach(post => {
        const usuario = post.owner_username;
        if (!agregadosPorUsuario[usuario]) {
          agregadosPorUsuario[usuario] = { 
            likes: 0, 
            comments: 0,
            sentimientos: {},
            posts: 0
          };
        }
        agregadosPorUsuario[usuario].likes += post.likes_count;
        agregadosPorUsuario[usuario].comments += post.comments_count;
        agregadosPorUsuario[usuario].posts += 1;
        agregadosPorUsuario[usuario].engagement_total = (agregadosPorUsuario[usuario].engagement_total || 0) + post.engagement_score;
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
      const totalesUsuario = scatterUsuarioData.map(p => (p.value[0] || 0) + (p.value[1] || 0));
      const minTotalUsuario = totalesUsuario.length ? Math.min(...totalesUsuario) : 0;
      const maxTotalUsuario = totalesUsuario.length ? Math.max(...totalesUsuario) : 1;

      chartUsuarios.setOption({
        title: { text: 'Likes vs Comments by user', left: 'center' },
        tooltip: {
          trigger: 'item',
          formatter: p => `
            <strong>@${p.data.name}</strong><br/>
            Likes: ${p.data.value[0]}<br/>
            Comentarios: ${p.data.value[1]}<br/>
            Posts: ${p.data.posts || 0}<br/>
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
          name: 'Comments', 
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
          animation: false,
          progressive: 2000,
          progressiveThreshold: 1000,
          symbolSize: function (val, params) {
            const total = (val[0] || 0) + (val[1] || 0);
            const minSize = 10;
            const maxSize = 100;
            const scale = (total - minTotalUsuario) / ((maxTotalUsuario - minTotalUsuario) || 1);

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
      }, { notMerge: true, lazyUpdate: true });
    }

    // Nube de palabras de hashtags
    if (sliderFrecuenciaHashtags && valorSliderHashtags) {
      const minFrecuencia = parseInt(sliderFrecuenciaHashtags.value, 10) || 1;
      valorSliderHashtags.textContent = minFrecuencia;
      const filtradas = listaHashtagsActual.filter(p => p.weight >= minFrecuencia);
      crearWordCloud({
        contenedorId: 'nubeHashtags',
        palabras: filtradas
      });
    }

    // Nube de palabras captions
    if (sliderFrecuenciaCaption && valorSliderCaption) {
      procesarYActualizarWordCloudBiografias({
        texto: textoCaptionsActual,
        sliderId: "sliderFrecuenciaCaption",
        valorSliderId: "valorSliderCaption",
        contenedorId: "nubeCaption"
      });
    }

    // Nube de palabras keywords
    if (sliderFrecuenciaKeywords && valorSliderKeywords) {
      procesarYActualizarWordCloudBiografias({
        texto: textoKeywordsActual,
        sliderId: "sliderFrecuenciaKeywords",
        valorSliderId: "valorSliderKeywords",
        contenedorId: "nubeKeywords"
      });
    }

    // Gráfico emojis más usados
    if (chartEmojis && contenedorTopEmojis) {
      chartEmojis.setOption({
        title: { text: 'Most used emojis', left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: topEmojisActual.map(e => e.emoji),
          axisLabel: { fontSize: 24 }
        },
        yAxis: { type: 'value', name: '' },
        series: [{
          type: 'bar',
          data: topEmojisActual.map(e => e.count),
          itemStyle: {
            color: '#5caac8'
          }
        }]
      }, { notMerge: true, lazyUpdate: true });
    }
  }

  // Añadir eventos para actualizar datos y gráficos al cambiar filtros o sliders
  boton.addEventListener("click", cargarDatos);

  if (sliderFrecuenciaHashtags) {
    sliderFrecuenciaHashtags.addEventListener('input', () => {
      if (!dataOriginal.length) return;
      const minFrecuencia = parseInt(sliderFrecuenciaHashtags.value, 10) || 1;
      if (valorSliderHashtags) valorSliderHashtags.textContent = minFrecuencia;
      crearWordCloud({
        contenedorId: 'nubeHashtags',
        palabras: listaHashtagsActual.filter(p => p.weight >= minFrecuencia)
      });
    });
  }
  if (sliderFrecuenciaCaption) {
    sliderFrecuenciaCaption.addEventListener('input', () => {
      if (!dataOriginal.length) return;
      procesarYActualizarWordCloudBiografias({
        texto: textoCaptionsActual,
        sliderId: "sliderFrecuenciaCaption",
        valorSliderId: "valorSliderCaption",
        contenedorId: "nubeCaption"
      });
    });
  }
  if (sliderFrecuenciaKeywords) {
    sliderFrecuenciaKeywords.addEventListener('input', () => {
      if (!dataOriginal.length) return;
      procesarYActualizarWordCloudBiografias({
        texto: textoKeywordsActual,
        sliderId: "sliderFrecuenciaKeywords",
        valorSliderId: "valorSliderKeywords",
        contenedorId: "nubeKeywords"
      });
    });
  }

  // También se puede actualizar al cambiar filtros (opcional)
  const actualizarConDebounce = crearDebounce(actualizarGraficosYNubes, 220);
  if (filtroKeyword) {
    filtroKeyword.addEventListener('input', () => {
      if (dataOriginal.length) actualizarConDebounce();
    });
  }
  [filtroTipo, filtroSentimiento, filtroFechaDesde, filtroFechaHasta, filtroLikesMinimos].forEach(elem => {
    if (elem) elem.addEventListener('change', cargarDatos);
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
