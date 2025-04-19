import 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
import 'https://cdn.jsdelivr.net/npm/echarts-wordcloud@2.1.0/dist/echarts-wordcloud.min.js';

export function crearWordCloud({ contenedorId, palabras }) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor || contenedor.offsetWidth === 0 || contenedor.offsetHeight === 0) {
    console.warn("⛔ El contenedor no tiene tamaño visible o no existe. No se puede renderizar el gráfico.");
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
//   console.log("✅ Palabras válidas para wordcloud:", data);

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

export function procesarYActualizarWordCloudBiografias({ texto, sliderId, valorSliderId, contenedorId }) {
  const slider = document.getElementById(sliderId);
  const valorSlider = document.getElementById(valorSliderId);
  // Lista básica de stopwords en español e inglés
  const stopwords = new Set([
    // Español
    "de", "la", "que", "el", "en", "y", "a", "los", "se", "del", "las", "por", "un", "para", "con", "no", "una", "su", "al", "lo", "como", "más", "pero", "sus", "le", "ya", "o", "este", "sí", "porque", "esta", "entre", "cuando", "muy", "sin", "sobre", "también", "me", "hasta", "hay", "donde", "quien", "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mí", "antes", "algunos", "qué", "unos", "yo", "otro", "otras", "otra", "él", "tanto", "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual", "poco", "ella", "estar", "estas", "algunas", "algo", "nosotros",
    // Inglés
    "the", "and", "for", "are", "with", "that", "you", "this", "was", "but", "have", "not", "your", "from", "they", "his", "her", "she", "him", "our", "who", "would", "their", "there", "what", "about", "which", "when", "them", "been", "were", "will", "has", "can", "all", "we", "more", "if", "my", "or", "an", "so", "no", "he", "do", "at", "by", "as", "on", "in", "to", "of", "a", "is", "it", "be", "me"
  ]);

  const palabras = texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 2 && !stopwords.has(p));

  const conteo = {};
  palabras.forEach(p => {
    conteo[p] = (conteo[p] || 0) + 1;
  });

  const palabrasBiografia = Object.entries(conteo).map(([text, weight]) => ({ text, weight }));

  const actualizar = () => {
    const frecuenciaMin = parseInt(slider.value);
    valorSlider.textContent = frecuenciaMin;
    const filtradas = palabrasBiografia.filter(p => p.weight >= frecuenciaMin);
    crearWordCloud({ contenedorId, palabras: filtradas });
  };

  slider.removeEventListener('input', actualizar);
  slider.addEventListener('input', actualizar);
  actualizar();
}