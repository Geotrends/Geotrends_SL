import 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
import 'https://cdn.jsdelivr.net/npm/echarts-wordcloud@2.1.0/dist/echarts-wordcloud.min.js';

const stopwords = [
  // English stopwords
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
  "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd",
  "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more",
  "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should",
  "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
  "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't",
  "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's",
  "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
  // Spanish stopwords
  "un", "una", "unas", "unos", "uno", "sobre", "todo", "también", "tras", "otro", "algún", "alguno", "alguna", "algunos", "algunas","de","en",
  "ser", "es", "soy", "eres", "somos", "sois", "estoy", "esta", "estamos", "estais", "estan", "como", "en", "para", "atras", "porque",
  "por qué", "estado", "estaba", "ante", "antes", "siendo", "ambos", "pero", "por", "poder", "puede", "puedo", "podemos", "podeis",
  "pueden", "fui", "fue", "fuimos", "fueron", "hacer", "hago", "hace", "hacemos", "haceis", "hacen", "cada", "fin", "incluso", "primero",
  "desde", "conseguir", "consigo", "consigue", "consigues", "conseguimos", "consiguen", "ir", "voy", "va", "vamos", "vais", "van", "vaya",
  "tener", "tengo", "tiene", "tenemos", "teneis", "tienen", "el", "la", "lo", "las", "los", "su", "aqui", "mio", "tuyo", "ellos", "ellas",
  "nos", "nosotros", "vosotros", "vosotras", "si", "dentro", "solo", "solamente", "saber", "sabes", "sabe", "sabemos", "sabeis", "saben",
  "ultimo", "largo", "bastante", "haces", "muchos", "aquellos", "aquellas", "sus", "entonces", "tiempo", "verdad", "verdadero", "verdadera",
  "cierto", "ciertos", "cierta", "ciertas", "intentar", "intento", "intenta", "intentas", "intentamos", "intentais", "intentan", "dos",
  "bajo", "arriba", "encima", "usar", "uso", "usas", "usa", "usamos", "usais", "usan", "emplear", "empleo", "empleas", "emplean", "ampleamos",
  "empleais", "valor", "muy", "era", "eras", "eramos", "eran", "modo", "bien", "cual", "cuando", "donde", "mientras", "quien", "con", "entre",
  "sin", "trabajo", "trabajar", "trabajas", "trabaja", "trabajamos", "trabajais", "trabajan", "podria", "podrias", "podriamos", "podrian", "podriais",
  "yo", "aquel"
];

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
    .map((word) =>
      word
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '') // elimina tildes
        .replace(/[.,:;!?¡¿()"'`´[\]{}<>]/g, '')
    )
    .filter((word) => !stopwords.includes(word))
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