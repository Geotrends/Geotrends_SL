import 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
import 'https://cdn.jsdelivr.net/npm/echarts-wordcloud@2.1.0/dist/echarts-wordcloud.min.js';

export function crearWordCloud({ contenedorId, palabras }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor || contenedor.offsetWidth < 100 || contenedor.offsetHeight < 100) {
    console.warn("⛔ El contenedor no tiene tamaño visible o suficiente para renderizar:", contenedorId);
    return;
  }
  
  if (echarts.getInstanceByDom(contenedor)) {
    echarts.dispose(contenedor);
  }
  const chart = echarts.init(contenedor);
  // Filtrar palabras por frecuencia mínima
  const frecuenciaMinima = 0;
  const palabrasFiltradas = palabras.filter(p => p.weight >= frecuenciaMinima);

  const data = palabrasFiltradas
    .filter(p => typeof p.weight === 'number' && p.weight > 0 && typeof p.text === 'string')
    .map(p => ({
      name: p.text,
      value: p.weight
    }));
 // console.log(`✅ Palabras válidas para wordcloud [${contenedorId}]:`, data);

  const option = {
    tooltip: { show: true },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      width: '100%',
      height: '100%',
      sizeRange: [12, 50],
      rotationRange: [-90, 90],
      rotationStep: 45,
      gridSize: 8,
      drawOutOfBound: false,
      textStyle: {
        color: function (params) {
          const value = params.value;
          if (value > 12) return '#D32F2F';      // rojo oscuro
          if (value > 10) return '#F57C00';      // naranja
          if (value > 8) return '#FBC02D';       // amarillo
          if (value > 6) return '#388E3C';       // verde
          return '#1976D2';                      // azul
        },
        fontWeight: 'bold',
        emphasis: {
          shadowBlur: 10,
          shadowColor: '#333',
          color: '#000',
          fontSize: 24
        }
      },
      animationDuration: function (idx) {
        return 300 + idx * 30;
      },
      animationEasing: 'easeOutQuint',
      data
    }]
  };
  
  /**
   * Parámetros configurables del gráfico WordCloud:
   * 
   * - type: tipo de gráfico, siempre 'wordCloud'
   * - shape: forma de la nube ('circle', 'cardioid', 'diamond', 'triangle-forward', etc.)
   * - width / height: dimensiones relativas del gráfico (puede ser '100%' o número)
   * - sizeRange: [min, max] en px del tamaño de fuente de las palabras
   * - rotationRange: ángulo mínimo y máximo para rotar palabras (por defecto [-90, 90])
   * - rotationStep: incremento de rotación (grados)
   * - gridSize: separación entre palabras (entre menor, más juntas)
   * - drawOutOfBound: si se permite dibujar palabras fuera del contenedor
   * - textStyle.color: función o valor que define el color de cada palabra
   * - textStyle.emphasis: estilo al hacer hover (sombra, color, etc.)
   * - data: arreglo de objetos con propiedades { name: 'palabra', value: número }
   */
  if (data.length === 0) {
    contenedor.innerHTML = "<div style='text-align:center; padding: 2rem;'>No hay palabras con la frecuencia mínima seleccionada</div>";
    return;
  }
  
  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());
  // TODO: Agregar slider para ajustar `frecuenciaMinima` dinámicamente desde la interfaz.
}

export function procesarYActualizarWordCloudBiografias({ texto, sliderId, valorSliderId, contenedorId }) {
  if (!texto || !sliderId || !valorSliderId || !contenedorId) {
    console.warn("⚠️ Parámetros incompletos para actualizar WordCloud");
    return;
  }

  const contenedor = document.getElementById(contenedorId);
  const slider = document.getElementById(sliderId);
  const valorSlider = document.getElementById(valorSliderId);

  if (!contenedor || !slider || !valorSlider) {
    console.warn("⚠️ No se encontró algún elemento de WordCloud", { contenedorId, sliderId, valorSliderId });
    return;
  }
 // console.log(`📄 Texto base para WordCloud [${contenedorId}]:`, texto.slice(0, 300));
  const palabras = texto
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .map((word) => word.toLowerCase())
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

  const palabrasArray = Object.entries(palabras).map(([text, weight]) => ({ text, weight }));

  function actualizarWordCloud() {
    const minFrecuencia = parseInt(slider.value, 10) || 1;
    valorSlider.textContent = minFrecuencia;
    const palabrasFiltradas = palabrasArray.filter((p) => p.weight >= minFrecuencia);

    crearWordCloud({
      contenedorId,
      palabras: palabrasFiltradas
    });
  }

  try {
    slider.removeEventListener('input', actualizarWordCloud);
  } catch (error) {
    console.warn("⚠️ No había eventListener anterior en el slider:", sliderId);
  }
  slider.addEventListener('input', actualizarWordCloud);

  actualizarWordCloud();
}