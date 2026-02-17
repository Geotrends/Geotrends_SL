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
[...perfiles, ...semillas].forEach(item => {
  const rawCategoria = (item.business_category_name || '')
    .split(',')
    .map(c => c.trim())
    .find(c => c && c.toLowerCase() !== 'none');
    
  const categoria = rawCategoria || 'Sin categoría';

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
      // Nueva lógica para categoría de la semilla (más robusta)
      const categoriaNombre = (semilla.business_category_name || '')
        .split(',')
        .map(c => c.trim())
        .filter(c => c && c.toLowerCase() !== 'none')[0] || 'Sin categoría';
      // 👇👇👇 Agregar el console.log solicitado justo aquí
      console.log(`🌱 Semilla: ${semilla.username || semilla.full_name || semilla.fuente_id} → Categoría detectada: ${categoriaNombre}`);
      const categoriaIndex = Array.from(categoriasMap.keys()).indexOf(categoriaNombre);
      const pos = categoryPositions[categoriaNombre] || { x: 0, y: 0 };
      nodos.set(nodeId, {
        id: nodeId,
        name: semilla.full_name || semilla.username || fuenteId,
        biography: semilla.biography || 'Sin biografía',
        // symbol: `image:/api/ranchera/proxy-img?url=${encodeURIComponent(semilla.profile_pic_url || semilla.profile_pic_url_hd || '')}`,
        avatar: semilla.profile_pic_url || semilla.profile_pic_url_hd || '',
        category: categoriaIndex,
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
      const categoriaNombre = (perfil.business_category_name || '')
        .split(',')
        .map(c => c.trim())
        .find(c => c.toLowerCase() !== 'none') || 'Sin categoría';
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
    legend: {
      type: 'scroll', // 🔄 habilita scroll si hay muchas categorías
      top: 20,
      right: 10,
      orient: 'vertical',
      selectedMode: 'multiple',
      textStyle: {
        fontSize: 11
      },
      itemWidth: 10,
      itemHeight: 10,
      padding: 5,
      pageIconSize: 10,
      pageTextStyle: {
        fontSize: 10
      }
    },
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

  // Agregar botones para seleccionar/desseleccionar todas las categorías
  const categoriasNombres = categorias.map(c => c.name);

  const contenedorRed = document.getElementById(containerId);
  const contenedorBotones = document.createElement("div");
  contenedorBotones.style.textAlign = "right";
  contenedorBotones.style.margin = "0.5rem 0";

  const btnSelectAll = document.createElement("button");
  btnSelectAll.textContent = "Mostrar todas";
  btnSelectAll.style.marginRight = "0.5rem";
  btnSelectAll.onclick = () => {
    categoriasNombres.forEach(name => {
      chart.dispatchAction({ type: 'legendSelect', name });
    });
  };

  const btnUnselectAll = document.createElement("button");
  btnUnselectAll.textContent = "Ocultar todas";
  btnUnselectAll.onclick = () => {
    categoriasNombres.forEach(name => {
      chart.dispatchAction({ type: 'legendUnSelect', name });
    });
  };

  contenedorBotones.appendChild(btnSelectAll);
  contenedorBotones.appendChild(btnUnselectAll);
  contenedorRed.parentElement.insertBefore(contenedorBotones, contenedorRed);
}
export function generarRedSegmentacionSentimiento({ perfiles, analisis }, containerId = 'contenedorRedSegmentacion') {
  const chart = echarts.init(document.getElementById(containerId));
  const nodos = [];
  const enlaces = [];
  const categoriasSet = new Set();
  // Paleta de colores para categorías
  const colorPalette = [
    '#4CAF50', // verde
    '#FFC107', // amarillo
    '#F44336', // rojo
    '#1976D2', // azul
    '#9C27B0', // morado
    '#FF9800', // naranja
    '#009688', // teal
    '#E91E63', // rosa
    '#607D8B', // gris azulado
    '#795548', // marrón
    '#888888'  // gris
  ];

  perfiles.forEach(perfil => {
    categoriasSet.add(perfil.categoria_detectada);
  });

  const categorias = Array.from(categoriasSet).sort();
  // Asignar color a cada categoría
  const categoriaColorMap = {};
  categorias.forEach((cat, i) => {
    categoriaColorMap[cat] = colorPalette[i % colorPalette.length];
  });

  // Nodos de categorías
  const nodosCategorias = categorias.map((cat) => ({
    id: `cat-${cat}`,
    name: cat,
    category: categorias.indexOf(cat),
    symbolSize: 60,
    itemStyle: {
      color: categoriaColorMap[cat]
    },
    label: {
      fontWeight: 'bold',
      color: '#fff'
    }
  }));

  nodos.push(...nodosCategorias);

  // Colores por sentimiento
  const coloresSentimiento = {
    POSITIVO: '#4CAF50',
    NEUTRO: '#FFC107',
    NEGATIVO: '#F44336'
  };

  perfiles.forEach(perfil => {
    const a = analisis.find(p => p.username === perfil.username);
    const sentimiento = a?.sentiment || 'NEUTRO';
    // Usar followers_count de analisis si existe, sino 1
    const seguidores = a?.followers_count || 1;
    const biografia = a?.biography || 'Sin biografía';
    let palabras = '';
    if (Array.isArray(a?.keywords)) {
      palabras = a.keywords.join(', ');
    } else if (typeof a?.keywords === 'string') {
      try {
        const arr = JSON.parse(a.keywords);
        if (Array.isArray(arr)) {
          palabras = arr.join(', ');
        } else {
          palabras = String(a.keywords);
        }
      } catch {
        palabras = String(a.keywords);
      }
    }
    const cat = perfil.categoria_detectada;
    const colorSentimiento = coloresSentimiento[sentimiento] || '#ccc';
    nodos.push({
      id: perfil.username,
      name: perfil.username,
      value: seguidores,
      symbolSize: Math.min(60, 10 + Math.log(seguidores) * 5),
      // Mantener la categoría por categoría detectada para leyenda
      category: categorias.indexOf(cat),
      // El color del nodo de perfil es por sentimiento, pero la categoría sigue siendo la categoría detectada
      itemStyle: {
        color: colorSentimiento
      },
      sentimiento,
      biography: biografia,
      palabras,
      interpretation: a?.interpretation || ''
    });

    enlaces.push({
      source: perfil.username,
      target: `cat-${cat}`,
      lineStyle: {
        color: colorSentimiento,
        width: 1,
        opacity: 0.5
      }
    });
  });

  chart.setOption({
    title: {
      text: 'Red de Segmentación por Sentimiento',
      left: 'center'
    },
    tooltip: {
      formatter: (params) => {
        const data = params.data;
        if (data && !String(data.id).startsWith('cat-')) {
          return `
            <div style="text-align:center; max-width:250px; white-space:normal; word-wrap:break-word;">
              <strong>@${data.name}</strong><br/>
              <div style="font-size: 12px;">
                Seguidores: ${data.value?.toLocaleString() || 'N/A'}<br/>
                Sentimiento: ${data.sentimiento || 'NEUTRO'}<br/>
                <div style="margin-top:0.3em;">
                  <strong>Bio:</strong><br/>${data.biography || 'Sin biografía'}
                </div>
                <div style="margin-top:0.3em;">
                  <strong>Palabras clave:</strong><br/>${data.palabras || '--'}
                </div>
                <div style="margin-top:0.3em;">
                  <strong>Análisis:</strong><br/>${data.interpretation || '--'}
                </div>
              </div>
            </div>
          `;
        }
        return '';
      }
    },
    legend: [{
      data: categorias,
      orient: 'vertical',
      right: 10,
      top: 20,
      textStyle: { fontSize: 12 }
    }],
    series: [{
      name: 'Segmentación',
      type: 'graph',
      layout: 'force',
      data: nodos,
      links: enlaces.map(enlace => {
        const sourceNode = nodos.find(n => n.id === enlace.source);
        return {
          ...enlace,
          lineStyle: {
            color: sourceNode?.itemStyle?.color || '#aaa',
            width: 1,
            opacity: 0.5
          }
        };
      }),
      categories: categorias.map((cat) => ({
        name: cat,
        itemStyle: {
          color: categoriaColorMap[cat]
        }
      })),
      roam: true,
      label: {
        show: (params) => params.data.id.startsWith("cat-"),
        formatter: (params) => params.data.id.startsWith("cat-") ? params.data.name : '',
        position: 'right',
        fontWeight: 'bold'
      },
      force: {
        repulsion: 250,
        edgeLength: 120
      },
      emphasis: {
        focus: 'adjacency',
        label: {
          show: true
        }
      },
      lineStyle: {
        color: 'source',
        curveness: 0.3
      },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 6]
    }]
  });

  window.addEventListener('resize', () => chart.resize());
}