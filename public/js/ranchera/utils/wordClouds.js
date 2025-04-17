import 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
import 'https://cdn.jsdelivr.net/npm/echarts-wordcloud@2.1.0/dist/echarts-wordcloud.min.js';

export function crearWordCloud({ contenedorId, palabras }) {
  const chart = echarts.init(document.getElementById(contenedorId));
  // Filtrar palabras por frecuencia mínima
  const frecuenciaMinima = 0;
  const palabrasFiltradas = palabras.filter(p => p.weight >= frecuenciaMinima);

  const data = palabrasFiltradas.map(p => ({
    name: p.text,
    value: p.weight
  }));

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
  
  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());
  // TODO: Agregar slider para ajustar `frecuenciaMinima` dinámicamente desde la interfaz.
}