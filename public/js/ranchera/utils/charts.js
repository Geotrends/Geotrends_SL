import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.esm.min.js';
const colores = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

export function crearGraficoBarras({ contenedorId, titulo, categorias, datos, color = '#C62828', nombreEjeX = 'Perfiles', nombreEjeY = 'Cantidad' }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  if (contenedor.offsetWidth === 0 || contenedor.offsetHeight === 0) {
    setTimeout(() => crearGraficoBarras({ contenedorId, titulo, categorias, datos, color }), 300);
    return;
  }

  const chart = echarts.init(contenedor);
  const maxPosts = Math.max(...datos.map(p => p.posts_count));
  const colores = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
  const opciones = {
    title: {
      text: titulo,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
  legend: {
    data: [titulo],
    bottom: 0,
    itemGap: 10
  },
  xAxis: {
    type: 'category',
    name: nombreEjeX,
    nameLocation: 'middle',
    nameGap: 60,
    data: categorias,
    axisLabel: {
      rotate: 45,
      fontSize: 10,
      lineHeight: 12,
      interval: 0,
      overflow: 'truncate', // también puedes usar 'break' si quieres salto de línea
      width: 80,            // ajusta este valor según el espacio deseado
    },
  },
    yAxis: {
      type: 'value',
      name: nombreEjeY,
      nameLocation: 'middle',
      nameGap: 40
    },
    series: [{
      name: titulo,
      type: 'bar',
      data: datos,
      itemStyle: {
        color: color
      }
    }],
    grid: {
      containLabel: true
    }
  };

  chart.setOption(opciones);
  window.addEventListener('resize', () => chart.resize());
}

export function crearGraficoLineas({ contenedorId, titulo, categorias, series }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  if (contenedor.offsetWidth === 0 || contenedor.offsetHeight === 0) {
    setTimeout(() => crearGraficoLineas({ contenedorId, titulo, categorias, series }), 300);
    return;
  }

  const chart = echarts.init(contenedor);

  const opciones = {
    title: { text: titulo, left: 'center' },
    tooltip: { trigger: 'axis' },
  legend: {
    data: series.map(s => s.name),
    type: 'scroll',
    bottom: 0,
    itemGap: 10
  },
    xAxis: {
      type: 'category',
      name: 'Fecha',
      nameLocation: 'middle',
      nameGap: 35,
      data: categorias,
      axisLabel: { rotate: 25 }
    },
    yAxis: {
      type: 'value',
      name: 'Cantidad de publicaciones',
      nameLocation: 'middle',
      nameGap: 50
    },
    series: series,
    grid: { containLabel: true }
  };

  chart.setOption(opciones);
  window.addEventListener('resize', () => chart.resize());
}

export function crearGraficoScatter({ contenedorId, titulo, datos }) {
  const contenedor = document.getElementById(contenedorId);
  console.log("📊 Datos para scatter:", datos);
  if (!contenedor) return;

  if (contenedor.offsetWidth === 0 || contenedor.offsetHeight === 0) {
    setTimeout(() => crearGraficoScatter({ contenedorId, titulo, datos }), 300);
    return;
  }

  const chart = echarts.init(contenedor);
  // NUEVO BLOQUE: calcular seguidores filtrando solo > 0, minSeg, maxSeg
  const seguidores = datos.map(p => p.followers ?? p.followers_count ?? 0).filter(v => v > 0);
  const minSeg = seguidores.length ? Math.min(...seguidores) : 1;
  const maxSeg = seguidores.length ? Math.max(...seguidores) : 10;
  const seguidos = datos.map(p => p.follows_count ?? p.following_count ?? 0);
  const publicaciones = datos.map(p => p.posts_count ?? p.media_count ?? 0);
  const maxPosts = Math.max(...publicaciones);
  const minPosts = Math.min(...publicaciones);
  const rango = maxPosts - minPosts || 1;

  const perfilesSemillaGlobal = window.perfilesSemillaGlobal || [];
  const nombresSemillas = {};
  perfilesSemillaGlobal.forEach(p => {
    if (p.fuente_id != null) {
      nombresSemillas[p.fuente_id] = p.full_name || p.username || `Semilla ${p.fuente_id}`;
    }
  });

  const seriesPorFuente = {};
  datos.forEach(p => {
    const fuente = p.fuente_id ?? 'sin_categoria';
    if (!seriesPorFuente[fuente]) seriesPorFuente[fuente] = [];

    seriesPorFuente[fuente].push({
      value: [
        p.follows_count ?? p.following_count ?? 0,
        p.followers ?? p.followers_count ?? 0
      ],
      username: p.username,
      fuente_id: fuente,
      posts_count: p.posts_count ?? p.media_count ?? 0
    });
  });

  const colores = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

  const series = Object.entries(seriesPorFuente).map(([fuente, puntos], i) => ({
    name: `@${nombresSemillas[fuente] || 'semilla_' + fuente}`,
    type: 'scatter',
    data: puntos,
    itemStyle: {
      color: colores[i % colores.length],
      opacity: 0.8
    },
    symbolSize: function (val, params) {
      const publicaciones = params.data?.posts_count || 1;
      return 10 + ((publicaciones - minPosts) / rango) * 34;
    },
    label: { show: false }
  }));

  const opciones = {
    title: { text: titulo, left: 'center' },
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        return `<strong>@${params.data.username}</strong><br/>
              Seguidos: ${params.data.value[0].toLocaleString('es-CO')}<br/>
              Seguidores: ${params.data.value[1].toLocaleString('es-CO')}<br/>
              Publicaciones: ${params.data.posts_count}<br/>
              Fuente ID: ${params.data.fuente_id}`;
      }
    },
    legend: {
      data: series.map(s => s.name),
      bottom: 0,
      gap: 10,
      type: 'scroll'
    },
    xAxis: {
      type: 'log',
      name: 'Seguidos (log)',
      logBase: 10,
      min: Math.max(1, Math.min(...seguidos)),
      max: Math.max(...seguidos),
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    yAxis: {
      type: 'log',
      name: 'Seguidores (log)',
      logBase: 10,
      min: minSeg,
      max: maxSeg,
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    dataZoom: [
      { type: 'slider', show: true, xAxisIndex: 0, height: 20, bottom: 20 },
      { type: 'inside', xAxisIndex: 0, filterMode: 'weakFilter' },
      { type: 'slider', show: true, yAxisIndex: 0, width: 20, right: 20 },
      { type: 'inside', yAxisIndex: 0, filterMode: 'weakFilter' }
    ],
    series: series,
    grid: { containLabel: true }
  };

  chart.setOption(opciones);
  window.addEventListener('resize', () => chart.resize());
}

export function crearGraficoPie({ contenedorId, titulo, datos }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const chart = echarts.init(contenedor);
  const opciones = {
    title: { text: titulo, left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: 'Sentimiento',
      type: 'pie',
      radius: '50%',
      data: datos,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  chart.setOption(opciones);
  window.addEventListener('resize', () => chart.resize());
}

export function crearWordCloud({ contenedorId, palabras }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor || palabras.length === 0) return;

  const chart = echarts.init(contenedor);
  const opciones = {
    tooltip: {},
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      keepAspect: false,
      left: 'center',
      top: 'center',
      width: '100%',
      height: '100%',
      sizeRange: [12, 48],
      rotationRange: [-90, 90],
      gridSize: 2,
      drawOutOfBound: true,
      textStyle: {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: () => `hsl(${Math.random() * 360}, 100%, 50%)`
      },
      data: palabras
    }]
  };

  chart.setOption(opciones);
  window.addEventListener('resize', () => chart.resize());
}
