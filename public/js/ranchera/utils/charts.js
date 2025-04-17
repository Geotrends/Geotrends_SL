import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.esm.min.js';

export function crearGraficoBarras({ contenedorId, titulo, categorias, datos, color = '#C62828', nombreEjeX = 'Perfiles', nombreEjeY = 'Cantidad' }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  if (contenedor.offsetWidth === 0 || contenedor.offsetHeight === 0) {
    setTimeout(() => crearGraficoBarras({ contenedorId, titulo, categorias, datos, color }), 300);
    return;
  }

  const chart = echarts.init(contenedor);
  const maxPosts = Math.max(...datos.map(p => p.posts_count));
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
      data: categorias,
      axisLabel: { rotate: 25 }
    },
    yAxis: { type: 'value' },
    series: series,
    grid: { containLabel: true }
  };

  chart.setOption(opciones);
  window.addEventListener('resize', () => chart.resize());
}

export function crearGraficoScatter({ contenedorId, titulo, datos }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  if (contenedor.offsetWidth === 0 || contenedor.offsetHeight === 0) {
    setTimeout(() => crearGraficoScatter({ contenedorId, titulo, datos }), 300);
    return;
  }

  const chart = echarts.init(contenedor);
  const maxPosts = Math.max(...datos.map(p => p.posts_count));
  const opciones = {
    title: { text: titulo, left: 'center' },
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        return `<strong>@${params.data.username}</strong><br/>Seguidores: ${params.data.value[0].toLocaleString('es-CO')}<br/>Seguidos: ${params.data.value[1].toLocaleString('es-CO')}<br/>Publicaciones: ${params.data.posts_count}`;
      }
    },
  legend: {
    data: ['Público', 'Privado'],
    bottom: 0,
    itemGap: 10
  },
    xAxis: {
      type: 'value',
      name: 'Seguidores',
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    yAxis: {
      type: 'value',
      name: 'Seguidos',
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    series: [{
      name: 'Perfiles',
      symbolSize: function (val, params) {
        const normalizado = params.data.posts_count / maxPosts;
        return 6 + normalizado * 50; // tamaño entre 6 y 30
      },
      data: datos.map(p => ({
        value: [p.followers_count, p.follows_count],
        username: p.username,
        posts_count: p.posts_count,
        itemStyle: { color: p.private ? '#C62828' : '#0288D1' },
        label: { show: false }
      })),
      type: 'scatter'
    }],
    grid: { containLabel: true }
  };

  chart.setOption(opciones);
  window.addEventListener('resize', () => chart.resize());
}
