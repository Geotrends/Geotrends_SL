import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.esm.min.js';

// Función principal que genera la red de conexiones entre semillas y perfiles
export function generarRedPerfiles({ semillas, perfiles }, containerId = 'contenedorRed') {
  const chart = echarts.init(document.getElementById(containerId)); // Inicializa el gráfico en el contenedor especificado

  const nodos = new Map();        // Estructura para guardar los nodos únicos
  const links = [];              // Arreglo para guardar las conexiones entre nodos
const colorPalette = [
  'rgba(31, 119, 180, 0.7)',  // azul
  'rgba(255, 127, 14, 0.7)',  // naranja
  'rgba(44, 160, 44, 0.7)',   // verde
  'rgba(214, 39, 40, 0.7)',   // rojo
  'rgba(148, 103, 189, 0.7)', // púrpura
  'rgba(140, 86, 75, 0.7)'    // marrón
];
const defaultColor = 'rgba(153, 153, 153, 0.5)'; // gris con transparencia para "Sin categoría"
const categoriasMap = new Map();
perfiles.forEach(perfil => {
const categoria = (perfil.business_category_name || 'Sin categoría')
    .split(',')
    .find(cat => cat.trim().toLowerCase() !== 'none')?.trim() || 'Sin categoría';
  if (!categoriasMap.has(categoria)) {
    const color = categoria === 'Sin categoría'
      ? defaultColor
      : colorPalette[categoriasMap.size % colorPalette.length];
    categoriasMap.set(categoria, color);
  }
});
const categorias = Array.from(categoriasMap, ([name, color]) => ({ name, itemStyle: { color } }));
console.log("📊 Categorías generadas:", categorias);
// Agregar posiciones iniciales para cada categoría en un círculo
const categoryPositions = {};
let angleStep = (2 * Math.PI) / categorias.length;
categorias.forEach((cat, index) => {
  categoryPositions[cat.name] = {
    x: Math.cos(angleStep * index) * 300,
    y: Math.sin(angleStep * index) * 300
  };
});

  let idCounter = 0;             // Contador para asignar IDs únicos a los nodos
  const idMap = new Map();       // Mapea cada elemento a su ID correspondiente

  // Crear nodos para las semillas
  semillas.forEach((semilla, index) => {
    const fuenteId = String(semilla.fuente_id);
    const id = `semilla-${fuenteId}`;
    if (!idMap.has(id)) {
      const nodeId = idCounter.toString();
      idMap.set(id, nodeId);
      const pos = categoryPositions[categorias[index]?.name] || { x: 0, y: 0 };
      nodos.set(nodeId, {
        id: nodeId,
        name: semilla.full_name || semilla.username || fuenteId,
        biography: semilla.biography || 'Sin biografía',
        // symbol: `image:/api/ranchera/proxy-img?url=${encodeURIComponent(semilla.profile_pic_url || semilla.profile_pic_url_hd || '')}`,
        avatar: semilla.profile_pic_url || semilla.profile_pic_url_hd || '',
        category: index,  // Agrupa por categoría distinta cada semilla
        symbolSize: semilla.followersCount
          ? Math.min(800, semilla.followersCount / 500)
          : 10,
        value: semilla.followersCount || 1,
        x: pos.x + Math.random() * 30,
        y: pos.y + Math.random() * 30
      });
      idCounter++;
    }
  });
  

  // Crear nodos y enlaces para los perfiles
  perfiles.forEach(perfil => {
    const fuenteId = String(perfil.fuente_id);
    const perfilKey = `perfil-${perfil.username}-${fuenteId}`;
    const semillaKey = `semilla-${fuenteId}`;

    if (!idMap.has(perfilKey)) {
      const nodeId = idCounter.toString();
      idMap.set(perfilKey, nodeId);
      const categoriaNombre = (perfil.business_category_name || 'Sin categoría')
        .split(',')
        .find(cat => cat.trim().toLowerCase() !== 'none')?.trim() || 'Sin categoría';
      const pos = categoryPositions[categoriaNombre] || { x: 0, y: 0 };
      nodos.set(nodeId, {
        id: nodeId,
        name: perfil.username,
        category: Array.from(categoriasMap.keys()).indexOf(categoriaNombre),
        symbolSize: perfil.follower_count
          ? Math.min(80, 10 + Math.log(perfil.follower_count) * 4)
          : 10,
        value: perfil.follower_count || 1,
        biography: perfil.biography || 'Sin biografía',
        x: pos.x + Math.random() * 30,
        y: pos.y + Math.random() * 30
      });
      idCounter++;
    }

    if (idMap.has(semillaKey)) {
      links.push({
        source: idMap.get(perfilKey),
        target: idMap.get(semillaKey),
        lineStyle: {
          color: categorias[semillas.findIndex(s => s.fuente_id == perfil.fuente_id)]?.itemStyle?.color || '#999',
          width: 1,
          opacity: 0.6,
          curveness: 0.2
        }
      });
    }
  });

  // Configuración del gráfico ECharts
  const option = {
    title: {
      text: 'Red de conexiones semilla → perfiles',
      left: 'center'
    },
    tooltip: {}, // Habilita tooltip al pasar el mouse
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
  series: [
    {
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      zoom: 1,
      animation: false,
      symbolSize: 10,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 8],
 
      force: {
        repulsion: 150,
        edgeLength: [200, 450],
        gravity: 0.2,
        friction: 0.3
      },
 
      label: {
        show: false
      },
      
      colorBy: 'category',
      itemStyle: {
        color: function (params) {
          const categoria = categorias[params.data.category];
          return categoria?.itemStyle?.color || '#ccc';
        }
      },
      lineStyle: {
        color: function (params) {
          const sourceNode = nodos.get(params.source);
          const categoria = categorias[sourceNode?.category];
          return categoria?.itemStyle?.color || '#999';
        },
        opacity: 0.6,
        width: 1,
        curveness: 0.2
      },
 
      emphasis: {
        focus: 'adjacency',
        label: {
          show: true,
          fontWeight: 'bold'
        },
        lineStyle: {
          width: 2
        }
      },
 
      categories: categorias,
      data: Array.from(nodos.values()),
      links: links,
 
      tooltip: {
        show: true,
        enterable: true,
        formatter: function (params) {
          const data = params.data || {};
          if (data.name && data.name !== '') {
            const username = data.name.toLowerCase();
            const imgUrl = data.avatar || data.avatar_hd || ''; // necesitas pasar esta propiedad al nodo
            const proxyUrl = imgUrl ? `/api/ranchera/proxy-img?url=${encodeURIComponent(imgUrl)}` : '';
      
            return `
              <div style="text-align:center;">
                ${proxyUrl ? `<img src="${proxyUrl}" style="width:60px; height:60px; border-radius:50%; margin-bottom:8px;" /><br/>` : ''}
                <strong>${data.name}</strong><br/>
                Seguidores: ${data.value?.toLocaleString() || 'N/A'}<br/>
                Categoría: ${params.data.category !== undefined ? categorias[params.data.category]?.name : 'N/A'}<br/>
                <em style="font-size: 0.8em; display: block; margin-top: 6px;">${data.biography || 'Sin biografía'}</em>
                <a href="https://instagram.com/${username}" target="_blank" style="color: #007bff;">Ver perfil</a>
              </div>
            `;
          }
          return '';
        }
      }
    }
  ]
  };

  chart.setOption(option); // Renderiza el gráfico
  window.addEventListener('resize', () => {
    chart.resize();
  });
}