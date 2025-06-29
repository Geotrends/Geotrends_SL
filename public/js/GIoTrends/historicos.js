/**
@file public/js/historicos.js
@version 1.0.0

@description
Lógica JS del proyecto.
Este archivo forma parte del proyecto "Plataforma de Monitoreo Ambiental IoT",
desarrollado por Geotrends - Geographic and Data Analytics, en colaboración con el Área Metropolitana
del Valle de Aburrá y la Universidad de San Buenaventura en el marco del Convenio 273 de 2024.

⚖️ Propiedad Intelectual:
Este software es propiedad intelectual compartida según el Convenio 273 de 2024.

📌 Entidades involucradas:
- Geotrends - Geographic and Data Analytics
- Área Metropolitana del Valle de Aburrá
- Universidad de San Buenaventura

👨‍💻 Equipo de desarrollo:
- Jonathan Ochoa Villegas (Geotrends)
- Diego Murillo Gómez (USB)
- Camilo Herrera Arcila (Geotrends)

📅 Creación: Noviembre 2024
📅 Actualización: 30-03-2025

📜 Licencia: MIT License

© 2025 Geotrends. Todos los derechos reservados.
 */

document.addEventListener("DOMContentLoaded", function () {
  let datosGlobales = [];
  // Elementos del DOM
  const sensorSelect = document.getElementById("sensorSelect");
  const rangoFechasInput = document.getElementById("rangoFechas");
  const iconCalendar = document.querySelector(".input-with-icon .icon");
  const botonConsultar = document.querySelector("button[type='submit']");
  const indicadoresBody = document.getElementById("indicadores-body");

  if (!sensorSelect || !rangoFechasInput || !botonConsultar) {
    console.error("❌ Error: No se encontraron elementos en el DOM.");
    return;
  }

  let fechaInicio = null;
  let fechaFin = null;




  const picker = new Litepicker({
    element: rangoFechasInput,
    singleMode: false, // Permite seleccionar un rango de fechas
    numberOfMonths: 2, // Muestra dos meses
    numberOfColumns: 2, // Organiza los meses en dos columnas
    format: "YYYY-MM-DD", // Formato interno de la fecha
    lang: "es-ES", // Español
    autoApply: true, // Aplica los cambios automáticamente
    setup: (pickerInstance) => {
      pickerInstance.on("selected", (startDate, endDate) => {
        if (startDate && endDate) {
          // Opciones de formato para mostrar los meses abreviados
          const opcionesFormato = { day: "numeric", month: "short", year: "numeric" };

          // Convertimos las fechas a texto legible en español
          const fechaInicioLegible = new Date(startDate.dateInstance).toLocaleDateString("es-ES", opcionesFormato);
          const fechaFinLegible = new Date(endDate.dateInstance).toLocaleDateString("es-ES", opcionesFormato);

          // Forzar que el valor del input se actualice con el formato deseado
          setTimeout(() => {
            rangoFechasInput.value = `Del ${fechaInicioLegible} al ${fechaFinLegible}`;
          }, 50); // Pequeño retraso para asegurarnos de que Litepicker no sobrescriba el valor

          // Guardar las fechas en formato YYYY-MM-DD si lo necesitas en otro lugar
          fechaInicio = startDate.format("YYYY-MM-DD");
          fechaFin = endDate.format("YYYY-MM-DD");
          // ✅ Añadir:
window.fechaInicioGlobal = fechaInicio;
window.fechaFinGlobal = fechaFin;
        }
      });
    },
  });;

  
  // ✅ Mostrar calendario al hacer clic en el icono
  iconCalendar?.addEventListener("click", function () {
    picker.show();
  });
  // 🔹 Inicializar gráfico
  const chartIndicador = echarts.init(document.getElementById("grafico1"));

  const chartDiurno = echarts.init(document.getElementById("grafico2"));
  const chartNocturno = echarts.init(document.getElementById("grafico3"));

  // Bandas de tercio de octava (Hz)
  const bandasTercios = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
    800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
    12500, 16000, 20000,
  ];
  const aWeighting = [
    -50.5, -44.7, -39.4, -34.6, -30.2, -26.2, -22.5, -19.1, -16.1, -13.4, -10.9,
    -8.6, -6.6, -4.8, -3.2, -1.9, -0.8, 0, 0.6, 1, 1.2, 1.3, 1.2, 1, 0.5, -0.1,
    -1.1, -2.5, -4.3, -6.6, -9.3,
  ];

  const cWeighting = [
    -6.2, -4.4, -3, -2, -1.3, -0.8, -0.5, -0.3, -0.2, -0.1, 0, 0, 0, 0, 0, 0, 0,
    0, 0, -0.1, -0.2, -0.3, -0.5, -0.8, -1.3, -2, -3, -4.4, -6.2, -8.5, -11.2,
  ];

  // 🔹 Cargar sensores desde el backend
  async function cargarSensores() {
    try {
      const response = await fetch("/historicos/sensores");
      if (!response.ok)
        throw new Error(`Error al obtener sensores: ${response.status}`);

      const sensores = await response.json();
      window.sensoresData = sensores;
      // console.log("Sensores cargados:", sensores); // Para depuración
      sensorSelect.innerHTML =
        '<option value="" disabled selected>Seleccione un sensor</option>';
      sensores.forEach((sensor) => {
        const option = document.createElement("option");
        option.value = sensor.sensor_id;
        // // console.log(sensor)
        option.textContent = sensor.referencia + ": " + sensor.barrio || sensor.sensor_id;
        sensorSelect.appendChild(option);
      });
    } catch (error) {
      console.error("❌ Error al cargar sensores:", error);
    }
  }

  // 🔹 Cargar indicadores desde JSON
  async function cargarIndicadores() {
    try {
      const response = await fetch("/json/indicadores.json");
      if (!response.ok)
        throw new Error(`Error al obtener indicadores: ${response.status}`);

      const indicadores = await response.json();
      indicadorSelect.innerHTML =
        '<option value="" disabled selected>Seleccione un indicador</option>';
      indicadores.forEach((indicador) => {
        const option = document.createElement("option");
        option.value = indicador.campo;
        option.textContent = indicador.nombre;
        indicadorSelect.appendChild(option);
      });
    } catch (error) {
      console.error("❌ Error al cargar indicadores:", error);
    }
  }

  // 🔹 Consultar datos del sensor (sin selector de indicador)
  async function consultarDatos(event) {
    event.preventDefault();

    const sensor = sensorSelect.value;
    if (!sensor || !fechaInicio || !fechaFin) {
      alert("Selecciona un sensor y un rango de fechas.");
      return;
    }

    // 🔄 Mostrar spinner global
    const spinnerGlobal = document.getElementById("spinner-global");
    spinnerGlobal?.classList.remove("oculto");

    // ✅ Construcción correcta de la URL con parámetros de consulta
    const url = `/historicos/sensor/${sensor}/laeq_slow?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    // console.log("Consultando:", url); // Verificar en la consola del navegador

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error en la consulta.");

      const datos = await response.json();
      // Validación robusta de los datos recibidos
      if (!datos || !Array.isArray(datos) || datos.length === 0) {
        throw new Error("❌ Datos inválidos o vacíos recibidos del servidor.");
      }
      datosGlobales = datos; // ✅ Guardar los datos obtenidos en la variable global
      console.log('✅ Datos globales actualizados:', datosGlobales); // ✅ Confirmar visualmente en consola
      // console.log("Datos obtenidos:", datos); // Para depuración
      procesarDatos(datos);
      // Actualizar los gráficos dependientes de los datos globales
      actualizarPromedioEnergeticoBandas(chartDiurno, datosGlobales, chartIndicador);
    } catch (error) {
      console.error("❌ Error al obtener datos:", error);
    } finally {
      // ✅ Ocultar spinner global incluso si falla
      spinnerGlobal?.classList.add("oculto");
    }
  }
  

  botonConsultar.addEventListener("click", consultarDatos);
  cargarSensores();

  window.addEventListener("resize", function () {
    chartIndicador.resize();
    chartDiurno.resize();
  });

  // 🔹 Función para procesar los datos y graficarlos
  function procesarDatos(datos) {
    if (!datos || datos.length === 0) {
      console.warn("⚠️ No hay datos disponibles.");
      return;
    }

    // 📅 Extraer timestamps
    const timestamps = datos.map((d) =>
      new Date(d.timestamp).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
      })
    );

    /////////////
    datosGlobales = datos; // Guardamos los datos en la variable global
    // ✅ Guardar las fechas de inicio y fin del dataset completo
if (datos && datos.length > 0) {
  window.zoomInicioGlobal = datos[0].timestamp;
  window.zoomFinGlobal = datos[datos.length - 1].timestamp;
}

    // ✅ Esperar a que el gráfico tenga configuración antes de actualizar
    setTimeout(() => {
      actualizarPromedioEnergeticoBandas(chartDiurno, datosGlobales, chartIndicador);
    }, 200);
    /////////////

    // ✅ Nombres de las series disponibles (sin `tercios_z_slow`)
    const seriesDisponibles = {
      laeq_slow: "LAeq Slow",
      laeq_impulse: "LAeq Impulse",
      laeq_fast: "LAeq Fast",
      lzeq_impulse: "LZeq Impulse",
      lzeq_fast: "LZeq Fast",
      lzeq_slow: "LZeq Slow",
      lceq_impulse: "LCeq Impulse",
      lceq_fast: "LCeq Fast",
      lceq_slow: "LCeq Slow",
      lpeak: "L Peak",
    };

    // ✅ Definir colores personalizados (verde para la serie activa)
    const coloresSeries = {
      // 🎯 A-weighting (verde)
      "laeq_slow": "#82cc19",     // Verde principal
      "laeq_fast": "#a2e045",     // Verde claro
      "laeq_impulse": "#5e9913",  // Verde oscuro
    
      // 🎯 C-weighting (amarillo)
      "lceq_slow": "#FAC858",     // Amarillo principal
      "lceq_fast": "#ffe28a",     // Amarillo claro
      "lceq_impulse": "#d6a237",  // Amarillo oscuro
    
      // 🎯 Z-weighting (azul grisáceo)
      "lzeq_slow": "#7e93ba",     // Azul grisáceo base
      "lzeq_fast": "#9fb1cc",     // Más claro
      "lzeq_impulse": "#5d6e8e",  // Más oscuro
    
      // 🎯 Pico
      "lpeak": "#FF4500"          // Naranja fuerte
    };
    

    // ✅ Series activas al inicio (modifica según lo que quieres mostrar)
    const seriesActivas = ["laeq_slow"];

    // 🔹 Generar las series filtrando `tercios_z_slow`
    const series = Object.keys(seriesDisponibles).map((indicador) => ({
      name: seriesDisponibles[indicador] || indicador,
      type: "line",
      data: datos.map((d) => d && d[indicador] != null ? parseFloat(d[indicador]) : 0),
      showSymbol: false,
      lineStyle: { width: 1 },
      color: coloresSeries[indicador] || "#888" // 🔥 Usa verde solo para `laeq_slow`
    }));

    // ✅ Configurar `ECharts`
    chartIndicador.setOption({
      title: {
        text: "Evolución de Indicadores",
        left: "center",
        top: "0%",
      },
      responsive: true, // ECharts ajusta los elementos internos
      // ✅ Leyenda ubicada entre el título y el gráfico
      legend: {
        left: "center",
        top: "8%",
        orient: "horizontal",
        itemGap: 5,
        selected: Object.keys(seriesDisponibles).reduce((acc, indicador) => {
          acc[seriesDisponibles[indicador] || indicador] =
            seriesActivas.includes(indicador);
          return acc;
        }, {}),
      },

      // ✅ Ajuste del área del gráfico para evitar cortes
      grid: {
        left: "10%",
        right: "5%",
        top: "25%",
        bottom: "20%",
        containLabel: true, // Evita que los textos de los ejes se salgan del gráfico

      },

      // ✅ Configuración del eje X (Menos fechas)
      xAxis: {
        type: "category",
        data: timestamps,
        name: "Fecha y Hora",
        nameLocation: "middle",
        nameGap: 25,
        axisLabel: {
          rotate: 0,
          fontSize: 8,
        },
      },

      // ✅ Configuración del eje Y
      yAxis: {
        type: "value",
        name: "Nivel de Ruido (dB)",
        nameLocation: "middle",
        nameGap: 45,
        min: "30",
        max: "dataMax",
        axisLabel: { fontSize: 12 },
      },

      // ✅ Tooltip Mejorado
      tooltip: {
        trigger: "axis",
        formatter: function (params) {
          let tooltipHTML = `<strong>${params[0].axisValue}fasdfa</strong><br>`;
          params.forEach((p) => {
            tooltipHTML += `${p.marker} ${p.seriesName
              }: <strong>${p.data.toFixed(2)}</strong> dB<br>`;
          });
          return tooltipHTML;
        },
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        borderColor: "#fff",
        borderWidth: 1,
        textStyle: { color: "#fff" }
      },

      // ✅ Configuración del `dataZoom`
      dataZoom: [
        {
          type: "slider",
          show: true,
          xAxisIndex: 0,
          start: 0,
          end: 100,
          backgroundColor: "rgba(255, 255, 255, 0.2)", // Fondo verde claro
          dataBackground: {
            lineStyle: {
              color: "rgb(130, 204, 25)", // Línea de fondo en verde oscuro
            },
            areaStyle: {
              color: "rgba(130, 204, 25, 0.3)", // Área sombreada en tono verde
            },
          },
          fillerColor: "rgba(130, 204, 25, 0.5)", // Color del área seleccionada en verde con opacidad
          borderColor: "rgb(106, 166, 21)", // Color del borde del slider en verde más oscuro
          handleStyle: {
            color: "rgb(130, 204, 25)", // Color del botón deslizante
            borderColor: "rgba(130, 204, 25, 0.5)", // Borde del botón más oscuro para contraste
          },
          textStyle: {
            color: "rgb(0, 0, 0)", // Color del texto de las fechas en verde oscuro
            fontSize: 12,
            fontWeight: "lighter",
          },

        },
        {
          type: "inside",
          xAxisIndex: 0,
          start: 0,
          end: 100,
        },
      ],


      // ✅ Series de datos (sin `tercios_z_slow`)
      series: series,
    });

    // ✅ Evitar que el gráfico desaparezca en pantallas pequeñas
    window.addEventListener("resize", function () {
      chartIndicador.resize();
      const container = document.getElementById("grafico1");
      if (container.clientWidth < 300) {
        container.style.minWidth = "300px"; // 📌 Mantener un tamaño mínimo
      }
    });

    // ✅ Escuchar eventos de zoom y actualizar promedios
    chartIndicador.on("dataZoom", function () {
      actualizarPromediosDesdeZoom(chartIndicador, datos);
      actualizarGraficoBandasPonderado(chartBandasOctava, datosGlobales, chartIndicador);
      actualizarGraficoEscalonado(chartEscalonado, datosGlobales, chartIndicador);
      actualizarGraficoPromedioDiario(chartPromedioDiario, datosGlobales, chartIndicador); // 🔥 NUEVO GRÁFICO

      actualizarGraficoBarrasDias(chartBarrasDias, datosGlobales, chartIndicador);

    });

    actualizarPromediosDesdeZoom(chartIndicador, datos);
    actualizarGraficoBandasPonderado(chartBandasOctava, datosGlobales, chartIndicador, true);
    actualizarGraficoEscalonado(chartEscalonado, datosGlobales, chartIndicador);
    actualizarGraficoPromedioDiario(chartPromedioDiario, datos, chartIndicador); // 🔥 NUEVO GRÁFICO
    actualizarGraficoBarrasDias(chartBarrasDias, datosGlobales, chartIndicador);



  }


  function actualizarPromedioEnergeticoBandas(chartBandasOctava, datos, chartIndicador, primeraCarga = false) {
    if (!datos || datos.length === 0) {
      console.warn("⚠️ No hay datos disponibles para calcular el promedio energético.");
      return;
    }

    // Protección robusta del acceso a chartIndicador
    let startIndex = 0;
    let endIndex = datos.length;
    if (!chartIndicador || typeof chartIndicador.getOption !== "function") {
      console.warn("⚠️ Advertencia: chartIndicador no disponible, usando todos los datos.");
      startIndex = 0;
      endIndex = datos.length;
    } else {
      const opciones = chartIndicador.getOption();
      if (!primeraCarga && opciones.dataZoom && opciones.dataZoom.length > 0) {
        startIndex = Math.round((opciones.dataZoom[0].start / 100) * datos.length);
        endIndex = Math.round((opciones.dataZoom[0].end / 100) * datos.length);
      }
    }

    const datosFiltrados = datos.slice(startIndex, endIndex);
    if (datosFiltrados.length === 0) return;

    // 📌 Frecuencias de bandas de tercio de octava
    const frecuencias = [
      20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500,
      630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300,
      8000, 10000, 12500, 16000, 20000
    ];

    // 📌 Cálculo del promedio energético por banda
    const promediosEnergeticos = frecuencias.map((_, i) => {
      const valores = datosFiltrados.map(d => d && d.tercios_z_slow ? (d.tercios_z_slow[i] ?? 0) : 0);
      const sumaCuadrados = valores.reduce((acc, val) => acc + Math.pow(10, val / 10), 0);
      return 10 * Math.log10(sumaCuadrados / valores.length);
    });

    // 📊 Actualizar gráfico de bandas de tercio de octava
    chartBandasOctava.setOption({
      series: [{ data: promediosEnergeticos }]
    });
    // console.log("📊 Promedio energético de bandas actualizado con `dataZoom` o primera carga.");
  }






  // 📌 Obtener el contenedor del gráfico 2
  var grafico2 = document.getElementById("grafico2");

  // 📌 Verificar si existe el contenedor
  if (!grafico2) {
    console.error("🚨 No se encontró el contenedor de 'grafico2'.");
    return;
  }

  // 📌 Inicializar el gráfico con ECharts
  var chartBandasOctava = echarts.init(grafico2);



  // 📌 Frecuencias de bandas de tercio de octava
  const frecuencias = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500,
    630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300,
    8000, 10000, 12500, 16000, 20000
  ];

  // 📌 Datos iniciales vacíos
  var opcionesGrafico2 = {
    title: {
      text: "Análisis en Frecuencia (1/3 Octava)",
      left: "center",
      top: "0%"
    },
    responsive: true, // ECharts ajusta los elementos internos
    tooltip: {

      trigger: "axis",
      formatter: function (params) {
        let band = frecuencias[params[0].dataIndex];
        let values = params.map(
          (p) => `${p.marker} <strong>${p.seriesName}</strong>: <strong>${p.data.toFixed(1)} dB</strong>`
        );
        return `Frecuencia: <strong>${band} Hz</strong><br>${values.join("<br>")}`;
      },
      backgroundColor: "rgba(50, 50, 50, 0.8)",
      borderColor: "#fff",
      borderWidth: 1,
      textStyle: { color: "#fff" }
    },
    grid: {
      left: "10%",
      right: "5%",
      top: "20%",
      bottom: "15%",
      containLabel: true
    },
    legend: {
      top: "10%",
      data: ["Z Slow", "A Slow", "C Slow"],
      selected: {
        "Z Slow": false,
        "A Slow": true,
        "C Slow": false
      }
    },
    xAxis: {
      type: "category",
      data: frecuencias.map(f => f + " Hz"),
      name: "Frecuencia (Hz)",
      nameLocation: "center",
      nameGap: 20,
      axisLabel: {
        rotate: 0,
        fontSize: 12,
        formatter: (value) => `${value}` // 📌 Mantiene el formato de Hz
      },
      axisLine: { lineStyle: { color: "#666" } }
    },
    yAxis: {
      type: "value",
      name: "Nivel (dB)",
      nameLocation: "middle",
      nameGap: 45,
      min: 0,
      max: 90,
      axisLabel: { fontSize: 12 },
      axisLine: { lineStyle: { color: "#666" } },
      splitLine: { show: true, lineStyle: { type: "dashed", color: "#ccc" } }
    },
    series: [
      {
        name: "Z Slow",
        type: "bar",
        data: [], // Se actualizará dinámicamente
        itemStyle: { color: "#7e93ba", borderRadius: [3, 3, 0, 0] },

      },
      {
        name: "A Slow",
        type: "bar",
        data: [],
        itemStyle: { color: "#82cc19", borderRadius: [3, 3, 0, 0] },

      },
      {
        name: "C Slow",
        type: "bar",
        data: [],
        itemStyle: { color: "#FAC858", borderRadius: [3, 3, 0, 0] },

      }
    ]
  };

  // 📌 Aplicar opciones al gráfico
  chartBandasOctava.setOption(opcionesGrafico2);


  // console.log("✅ Gráfico 2 inicializado correctamente.");

  // 📌 Función para actualizar el gráfico con datos ponderados
  function actualizarGraficoBandasPonderado(chartBandasOctava, datos, chartIndicador, primeraCarga = false) {
    if (!datos || datos.length === 0) return;

    if (!chartIndicador || typeof chartIndicador.getOption !== "function") {
      console.error("❌ Error: `chartIndicador` no está inicializado correctamente.");
      return;
    }

    const opciones = chartIndicador.getOption();
    let startIndex = 0;
    let endIndex = datos.length;

    if (!primeraCarga) {
      if (!opciones || !opciones.dataZoom || opciones.dataZoom.length === 0) {
        console.warn("⚠️ No hay dataZoom disponible en el gráfico.");
        return;
      }

      startIndex = Math.round((opciones.dataZoom[0].start / 100) * datos.length);
      endIndex = Math.round((opciones.dataZoom[0].end / 100) * datos.length);

      if (startIndex >= endIndex || startIndex < 0 || endIndex > datos.length) {
        console.warn("⚠️ Rango de dataZoom inválido.");
        return;
      }
    }

    const datosFiltrados = datos.slice(startIndex, endIndex);
    if (datosFiltrados.length === 0) return;

    // 📌 Cálculo del promedio energético por banda con ponderaciones
    const calcularPromedioEnergetico = (ponderacion) => {
      return frecuencias.map((_, i) => {
        const valores = datosFiltrados.map(d => (d && d.tercios_z_slow ? (d.tercios_z_slow[i] ?? 0) : 0) + ponderacion[i]);
        const sumaCuadrados = valores.reduce((acc, val) => acc + Math.pow(10, val / 10), 0);
        return 10 * Math.log10(sumaCuadrados / valores.length);
      });
    };

    // 📌 Aplicar ponderaciones
    const promediosZ = calcularPromedioEnergetico(new Array(frecuencias.length).fill(0));  // Sin ponderación
    const promediosA = calcularPromedioEnergetico(aWeighting);
    const promediosC = calcularPromedioEnergetico(cWeighting);

    // 📊 Actualizar gráfico con las tres series
    chartBandasOctava.setOption({
      series: [
        { data: promediosZ },
        { data: promediosA },
        { data: promediosC }
      ]
    });

    // console.log("📊 Gráfico de bandas de tercio de octava actualizado con ponderaciones.");
  }




  // 🔹 Función para calcular promedios en función del zoom aplicado
  function actualizarPromediosDesdeZoom(chart, datos) {
    const zoom = chart.getOption().dataZoom[0];
    const startIdx = Math.floor((zoom.start / 100) * datos.length);
    const endIdx = Math.ceil((zoom.end / 100) * datos.length);
    const datosFiltrados = datos.slice(startIdx, endIdx);

    if (datosFiltrados.length > 0) {
      const indicadores = [
        "laeq_slow",
        "laeq_impulse",
        "laeq_fast",
        "lzeq_impulse",
        "lzeq_fast",
        "lzeq_slow",
        "lceq_impulse",
        "lceq_fast",
        "lceq_slow",
        "lpeak",
      ];

      let promedios = calcularPromedios(datosFiltrados, indicadores);

      actualizarIndicadores(promedios);
    }
  }

  function calcularPromedios(datos, indicadores) {
    let promediosGenerales = {};
    let promediosDiurno = {};
    let promediosNocturno = {};

    let valoresGenerales = {};
    let valoresDiurno = {};
    let valoresNocturno = {};

    // Inicializar listas de valores para cada indicador
    indicadores.forEach((indicador) => {
      valoresGenerales[indicador] = [];
      valoresDiurno[indicador] = [];
      valoresNocturno[indicador] = [];
    });

    // Recorrer los datos y separar en diurno y nocturno
    datos.forEach((dato) => {
      const hora = new Date(dato.timestamp).getHours();
      const esDiurno = hora >= 7 && hora <= 20;

      indicadores.forEach((indicador) => {
        if (dato[indicador] !== undefined) {
          const valor = parseFloat(dato[indicador]);
          if (!isNaN(valor)) {
            valoresGenerales[indicador].push(valor);
            if (esDiurno) valoresDiurno[indicador].push(valor);
            else valoresNocturno[indicador].push(valor);
          }
        }
      });
    });

    // Calcular promedios energéticos
    indicadores.forEach((indicador) => {
      promediosGenerales[indicador] = calcularPromedioEnergetico(
        valoresGenerales[indicador]
      );
      promediosDiurno[indicador] = calcularPromedioEnergetico(
        valoresDiurno[indicador]
      );
      promediosNocturno[indicador] = calcularPromedioEnergetico(
        valoresNocturno[indicador]
      );
    });

    return { promediosGenerales, promediosDiurno, promediosNocturno };
  }

  function calcularPromedioEnergetico(valores) {
    if (valores.length === 0) return "--"; // Evita división por cero
    const sumaEnergetica = valores.reduce(
      (acc, val) => acc + Math.pow(10, val / 10),
      0
    );
    return (10 * Math.log10(sumaEnergetica / valores.length)).toFixed(2);
  }

  // 🔹 Actualizar la sección de indicadores con los promedios calculados
  // 🔹 Personalizar nombres de los indicadores para la tabla
  const nombresIndicadores = {
    laeq_slow: "LAeq Slow",
    laeq_fast: "LAeq Fast",
    laeq_impulse: "LAeq Impulse",
    lzeq_slow: "LZeq Slow",
    lzeq_fast: "LZeq Fast",
    lzeq_impulse: "LZeq Impulse",
    lceq_slow: "LCeq Slow",
    lceq_fast: "LCeq Fast",
    lceq_impulse: "LCeq Impulse",
    lpeak: "L Peak",
  };

  function actualizarIndicadores({
    promediosGenerales,
    promediosDiurno,
    promediosNocturno,
  }) {
    const indicadoresBody = document.getElementById("indicadores-body");
    if (!indicadoresBody) {
      console.error(
        "❌ Error: No se encontró el cuerpo de la tabla de indicadores."
      );
      return;
    }

    // Limpiar la tabla antes de actualizarla
    indicadoresBody.innerHTML = "";

    // Insertar cada indicador en la tabla con sus promedios
    Object.keys(nombresIndicadores).forEach((indicador) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
            <td>${nombresIndicadores[indicador] || indicador}</td>
            <td>${promediosGenerales[indicador]} dB</td>
            <td>${promediosDiurno[indicador]} dB</td>
            <td>${promediosNocturno[indicador]} dB</td>
        `;
      indicadoresBody.appendChild(fila);
    });
  }


  // 📌 Inicializar el gráfico escalonado en `grafico3`
  const chartEscalonado = echarts.init(document.getElementById("grafico3"));

  // 🔹 Función mejorada para calcular el promedio por hora para múltiples indicadores
  function calcularPromedioPorHora(datos, indicadores) {
    let horas = {}; // Almacena los valores agrupados por hora

    datos.forEach((d) => {
      let fecha = new Date(d.timestamp);
      let hora = fecha.getHours(); // Extrae solo la hora

      if (!horas[hora]) {
        horas[hora] = {};
        indicadores.forEach(indicador => horas[hora][indicador] = []);
      }

      indicadores.forEach((indicador) => {
        if (d[indicador] !== undefined) {
          horas[hora][indicador].push(parseFloat(d[indicador]));
        }
      });
    });

    // 📊 Calcular el promedio energético por hora para cada indicador
    let promediosHoras = Object.keys(horas).map((hora) => {
      let promedios = { hora: parseInt(hora) };

      indicadores.forEach((indicador) => {
        let valores = horas[hora][indicador];
        if (valores.length > 0) {
          let suma = valores.reduce((acc, val) => acc + Math.pow(10, val / 10), 0);
          promedios[indicador] = (10 * Math.log10(suma / valores.length)).toFixed(2);
        } else {
          promedios[indicador] = null; // Si no hay datos, asignar null
        }
      });

      return promedios;
    });

    // 📌 Ordenar por hora
    promediosHoras.sort((a, b) => a.hora - b.hora);

    return promediosHoras;
  }

  // 🔹 Función para actualizar el gráfico escalonado dinámicamente
  function actualizarGraficoEscalonado(chartEscalonado, datos, chartIndicador) {
    if (!datos || datos.length === 0) {
      console.warn("⚠️ No hay datos disponibles para el gráfico escalonado.");
      return;
    }

    // 📌 Obtener el rango visible en el gráfico de indicadores (dataZoom)
    const opciones = chartIndicador.getOption();
    let startIndex = 0;
    let endIndex = datos.length;

    if (opciones && opciones.dataZoom && opciones.dataZoom.length > 0) {
      startIndex = Math.round((opciones.dataZoom[0].start / 100) * datos.length);
      endIndex = Math.round((opciones.dataZoom[0].end / 100) * datos.length);
    }

    // 📌 Filtrar los datos dentro del rango visible
    const datosFiltrados = datos.slice(startIndex, endIndex);
    if (datosFiltrados.length === 0) {
      console.warn("⚠️ No hay datos visibles dentro del rango seleccionado.");
      return;
    }

    // 📊 Obtener los promedios por hora para los indicadores seleccionados
    const indicadores = ["laeq_slow", "lceq_slow", "lzeq_slow"];
    let promediosHoras = calcularPromedioPorHora(datosFiltrados, indicadores);

    // 📌 Configurar opciones del gráfico escalonado
    let opcionesGraficoEscalonado = {
      title: {
        text: "Promedio Horario de Nivel de Ruido\nLAeq, LCEQ y LZEQ Slow",
        left: "center",
        top: "0%"
      },
      tooltip: {
        trigger: "axis",
        formatter: function (params) {
          let tooltipHTML = `Hora: <strong>${params[0].axisValue}:00</strong><br>`;
          params.forEach((p) => {
            tooltipHTML += `${p.marker} ${p.seriesName
              }: <strong>${p.data} dB</strong><br>`;
          });
          return tooltipHTML;
        },
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        borderColor: "#fff",
        borderWidth: 1,
        textStyle: { color: "#fff" }
      },
      grid: { left: "10%", right: "5%", top: "20%", bottom: "15%", containLabel: true },
      legend: {
        top: "10%",
        data: ["LAeq Slow", "LCEQ Slow", "LZEQ Slow"],
        selected: { "LAeq Slow": true, "LCEQ Slow": false, "LZEQ Slow": false } // 🔹 Permitir encender y apagar las series
      },
      xAxis: {
        type: "category",
        data: promediosHoras.map((d) => `${d.hora}`),
        name: "Hora",
        nameLocation: "middle",
        nameGap: 25,
        axisLabel: { fontSize: 12 },
        axisLine: { lineStyle: { color: "#666" } }
      },
      yAxis: {
        type: "value",
        name: "Nivel (dB)",
        nameLocation: "middle",
        nameGap: 45,
        min: "35",
        max: "95",
        axisLabel: { fontSize: 12 },
        axisLine: { lineStyle: { color: "#666" } },
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#ccc" } }
      },
      series: [
        {
          name: "LAeq Slow",
          type: "line",
          data: promediosHoras.map((d) => d.laeq_slow),
          step: "end",
          smooth: false,
          lineStyle: { width: 2, color: "#82cc19" }, // Verde
          itemStyle: { color: "#82cc19" },
          showSymbol: false
        },
        {
          name: "LCEQ Slow",
          type: "line",
          data: promediosHoras.map((d) => d.lceq_slow),
          step: "end",
          smooth: false,
          lineStyle: { width: 2, color: "#fac858" }, // Naranja
          itemStyle: { color: "#fac858" },
          showSymbol: false
        },
        {
          name: "LZEQ Slow",
          type: "line",
          data: promediosHoras.map((d) => d.lzeq_slow),
          step: "end",
          smooth: false,
          lineStyle: { width: 2, color: "#7e93ba" }, // Azul
          itemStyle: { color: "#7e93ba" },
          showSymbol: false
        }
      ]
    };

    // 📊 Aplicar opciones al gráfico
    chartEscalonado.setOption(opcionesGraficoEscalonado);
  }
  ///////////

  // 📌 Inicializar el gráfico de promedios diarios en `grafico4`
  const chartPromedioDiario = echarts.init(document.getElementById("grafico4"));

  // 📌 Función para calcular los promedios diarios por período
  function calcularPromedioDiario(datos) {
    let dias = {}; // Almacena los valores agrupados por día

    datos.forEach((d) => {
      let fecha = new Date(d.timestamp);
      let dia = fecha.toISOString().split("T")[0]; // Extrae solo la fecha (YYYY-MM-DD)
      let hora = fecha.getHours();
      let periodo = (hora >= 7 && hora <= 20) ? "diurno" : "nocturno";

      if (!dias[dia]) {
        dias[dia] = { diurno: [], nocturno: [], total: [] };
      }

      let laeq = parseFloat(d.laeq_slow);
      let lzeq = parseFloat(d.lzeq_slow);
      let lceq = parseFloat(d.lceq_slow);

      if (!isNaN(laeq)) {
        dias[dia][periodo].push(laeq);
        dias[dia]["total"].push(laeq);
      }
      if (!isNaN(lzeq)) {
        dias[dia][periodo].push(lzeq);
        dias[dia]["total"].push(lzeq);
      }
      if (!isNaN(lceq)) {
        dias[dia][periodo].push(lceq);
        dias[dia]["total"].push(lceq);
      }
    });

    let resultado = Object.keys(dias).map((dia) => {
      return {
        dia: new Date(dia), // 🔹 Convertir la fecha a objeto `Date`
        promedioDiurno: calcularPromedioEnergetico(dias[dia].diurno),
        promedioNocturno: calcularPromedioEnergetico(dias[dia].nocturno),
        promedioTotal: calcularPromedioEnergetico(dias[dia].total),
      };
    });

    return resultado;
  }

  // 📌 Función para actualizar el gráfico de promedio diario dinámicamente
  function actualizarGraficoPromedioDiario(chartPromedioDiario, datos, chartIndicador) {
    if (!datos || datos.length === 0) {
      console.warn("⚠️ No hay datos disponibles para el gráfico de promedios diarios.");
      return;
    }

    // 📌 Obtener el rango visible en `chartIndicador` (dataZoom)
    const opciones = chartIndicador.getOption();
    let startIndex = 0;
    let endIndex = datos.length;

    if (opciones && opciones.dataZoom && opciones.dataZoom.length > 0) {
      startIndex = Math.round((opciones.dataZoom[0].start / 100) * datos.length);
      endIndex = Math.round((opciones.dataZoom[0].end / 100) * datos.length);
    }

    // 📌 Filtrar los datos dentro del rango visible
    const datosFiltrados = datos.slice(startIndex, endIndex);
    if (datosFiltrados.length === 0) {
      console.warn("⚠️ No hay datos visibles dentro del rango seleccionado.");
      return;
    }

    // 📊 Obtener los promedios diarios con los datos filtrados
    let promediosDiarios = calcularPromedioDiario(datosFiltrados);

    // 📌 Configurar opciones del gráfico
    let opcionesGraficoPromedioDiario = {
      title: { text: "LAeq Slow Diario para la muestra", left: "center", top: "0%" },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        formatter: function (params) {
          // Formatear la fecha con el nombre del día de la semana
          let fecha = new Date(params[0].axisValue);
          let opcionesFormato = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
          let fechaFormateada = fecha.toLocaleDateString("es-ES", opcionesFormato);

          // Construir el tooltip con colores de las series
          let tooltipHTML = `Fecha: <strong>${fechaFormateada}</strong><br>`;
          params.forEach((p) => {
            tooltipHTML += `${p.marker} <strong>${p.seriesName}:</strong> <strong>${p.data[1]} dB</strong><br>`;
          });

          return tooltipHTML;
        },
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        borderColor: "#fff",
        borderWidth: 1,
        textStyle: { color: "#fff" }
      }
      ,
      grid: { left: "10%", right: "5%", top: "20%", bottom: "15%", containLabel: true },
      legend: {
        top: "8%",
        data: ["Diurno", "Nocturno", "24 Horas"],
        selected: { "Diurno": false, "Nocturno": false, "24 Horas": true }
      },
      xAxis: {
        type: "time",
        name: "Fecha",
        nameLocation: "middle",   // 🔥 VOLVER a middle
        nameGap: 35,              // 🔥 Un poco más de espacio
        nameTextStyle: {
            padding: [30, 0, 0, 0], // 🔥 Empuja el nombre hacia abajo (prueba 30px)
            fontSize: 12,
            fontWeight: "lighter",
            color: "#333"
        },
        axisLabel: {
            formatter: function (value) {
                let fecha = new Date(value);
                return fecha.toLocaleDateString("es-ES", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short"
                });
            },
            fontSize: 12,
            rotate: 45
        },
        axisLine: { lineStyle: { color: "#666" } },
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#ccc" } },
        splitNumber: 7,
        minInterval: 3600 * 24 * 1000
    },
    
      yAxis: {
        type: "value",
        name: "Nivel (dB)",
        nameLocation: "middle",
        nameGap: 45,
        min: "40",
        max: "90",
        axisLabel: { fontSize: 12 },
        axisLine: { lineStyle: { color: "#666" } },
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#ccc" } }
      },
      // ✅ Configuración del `dataZoom`
      dataZoom: [
        {
          type: "slider",
          show: true,
          xAxisIndex: 0,
          start: 0,
          end: 100,
          backgroundColor: "rgba(255, 255, 255, 0.2)", // Fondo verde claro
          dataBackground: {
            lineStyle: {
              color: "rgb(130, 204, 25)", // Línea de fondo en verde oscuro
            },
            areaStyle: {
              color: "rgba(130, 204, 25, 0.3)", // Área sombreada en tono verde
            },
          },
          fillerColor: "rgba(130, 204, 25, 0.5)", // Color del área seleccionada en verde con opacidad
          borderColor: "rgb(106, 166, 21)", // Color del borde del slider en verde más oscuro
          handleStyle: {
            color: "rgb(130, 204, 25)", // Color del botón deslizante
            borderColor: "rgba(130, 204, 25, 0.5)", // Borde del botón más oscuro para contraste
          },
          textStyle: {
            color: "rgb(0, 0, 0)", // Color del texto de las fechas en verde oscuro
            fontSize: 12,
            fontWeight: "lighter",
          },

        },
        {
          type: "inside",
          xAxisIndex: 0,
          start: 0,
          end: 100,
        },
      ],
      series: [
        {
          name: "Diurno",
          type: "line",
          step: "end",  // 📌 Esto hace que la línea sea escalonada
          data: promediosDiarios.map((d) => [d.dia, d.promedioDiurno]), // 🔹 Ahora usa formato `[fecha, valor]`
          smooth: false,
          lineStyle: { width: 2, color: "#FFD700" }, // Amarillo
          itemStyle: { color: "#FFD700" },
          showSymbol: false
        },
        {
          name: "Nocturno",
          type: "line",
          step: "end",  // 📌 Esto hace que la línea sea escalonada
          data: promediosDiarios.map((d) => [d.dia, d.promedioNocturno]),
          smooth: false,
          lineStyle: { width: 2, color: "#00BFFF" }, // Azul
          itemStyle: { color: "#00BFFF" },
          showSymbol: false
        },
        {
          name: "24 Horas",
          type: "line",
          step: "end",  // 📌 Esto hace que la línea sea escalonada
          data: promediosDiarios.map((d) => [d.dia, d.promedioTotal]),
          smooth: false,
          lineStyle: { width: 2, color: "#91CC75" }, // Rojo
          itemStyle: { color: "#91CC75" },
          showSymbol: false
        }
      ]
    };

    // 📊 Aplicar opciones al gráfico
    chartPromedioDiario.setOption(opcionesGraficoPromedioDiario);
  }


// 📌 Inicializar el gráfico de barras horizontales en `grafico5`
const chartBarrasDias = echarts.init(document.getElementById("grafico5"));

// 🔹 Función para calcular el promedio por día de la semana para 3 periodos
function calcularPromedioPorDiaSemana(datos) {
    let dias = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    let diasDiurno = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    let diasNocturno = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    datos.forEach((d) => {
        let fecha = new Date(d.timestamp);
        let diaSemana = fecha.getDay(); // 🔹 0 = Domingo, ..., 6 = Sábado
        let hora = fecha.getHours();
        let nivel = parseFloat(d.laeq_slow);

        dias[diaSemana].push(nivel); // Todos los datos
        if (hora >= 7 && hora <= 20) diasDiurno[diaSemana].push(nivel); // Diurno
        else diasNocturno[diaSemana].push(nivel); // Nocturno
    });

    // 📊 Calcular el promedio para cada periodo
    function calcularPromedio(valores) {
        if (valores.length === 0) return null;
        let suma = valores.reduce((acc, val) => acc + Math.pow(10, val / 10), 0);
        return (10 * Math.log10(suma / valores.length)).toFixed(1); // 🔹 Solo un decimal
    }

    let promediosDias = Object.keys(dias).map((dia) => ({
        dia: parseInt(dia),
        diurno: calcularPromedio(diasDiurno[dia]),
        nocturno: calcularPromedio(diasNocturno[dia]),
        total: calcularPromedio(dias[dia])
    }));

    return promediosDias;
}

// 🔹 Función para actualizar el gráfico de barras dinámicamente
function actualizarGraficoBarrasDias(chartBarrasDias, datos, chartIndicador) {
    if (!datos || datos.length === 0) {
        console.warn("⚠️ No hay datos disponibles para el gráfico de barras por día.");
        return;
    }

    // 📌 Obtener el rango visible en el gráfico de indicadores (dataZoom)
    const opciones = chartIndicador.getOption();
    let startIndex = 0;
    let endIndex = datos.length;

    if (opciones && opciones.dataZoom && opciones.dataZoom.length > 0) {
        startIndex = Math.round((opciones.dataZoom[0].start / 100) * datos.length);
        endIndex = Math.round((opciones.dataZoom[0].end / 100) * datos.length);
    }

    // 📌 Filtrar los datos dentro del rango visible
    const datosFiltrados = datos.slice(startIndex, endIndex);
    if (datosFiltrados.length === 0) {
        console.warn("⚠️ No hay datos visibles dentro del rango seleccionado.");
        return;
    }

    // 📊 Obtener los promedios por día de la semana
    let promediosDias = calcularPromedioPorDiaSemana(datosFiltrados);

    // 📌 Etiquetas de los días en español
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // 📌 Configurar opciones del gráfico de barras horizontales
    let opcionesGraficoBarrasDias = {
      title: { text: "Nivel Promedio por Día de la Semana", left: "center", top: "0%" },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: function (params) {
          return `Día: <strong>${params[0].axisValue}</strong><br>
                  ${params.map((p) => `${p.marker} <strong>${p.seriesName}:</strong> ${p.data} dB`).join("<br>")}`;
        },
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        borderColor: "#fff",
        borderWidth: 1,
        textStyle: { color: "#fff" }
      },
      legend: {
        top: "10%",
        data: ["Diurno", "Nocturno", "24 Horas"],
        selected: {
          "Diurno": false,
          "Nocturno": false,
          "24 Horas": true
        }
      },
      grid: { left: "5%", right: "5%", top: "20%", bottom: "10%", containLabel: true },
      
      // 🔵 Ahora bien separados
      xAxis: {
        type: "value",
        name: "Nivel (dB)",
        nameLocation: "middle",
        nameGap: 45,
        min: 40,
        max: function (value) {
          return value.max <= 90 ? 90 : Math.ceil(value.max / 5) * 5;
        },
        axisLabel: { fontSize: 12 },
        axisLine: { lineStyle: { color: "#666" } },
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#ccc" } }
      },
      
      yAxis: {
        type: "category",
        data: diasSemana.reverse(), // 🔹 Domingo arriba
        name: "Día de la Semana",
        nameLocation: "middle",
        nameGap: 70,
        axisLabel: { fontSize: 12 },
        axisLine: { lineStyle: { color: "#666" } }
      },
    
      series: [
        {
          name: "Diurno",
          type: "bar",
          data: promediosDias.map((d) => d.diurno).reverse(),
          itemStyle: { color: "#FFD700", borderRadius: [0, 3, 3, 0] }
        },
        {
          name: "Nocturno",
          type: "bar",
          data: promediosDias.map((d) => d.nocturno).reverse(),
          itemStyle: { color: "#00BFFF", borderRadius: [0, 3, 3, 0] }
        },
        {
          name: "24 Horas",
          type: "bar",
          data: promediosDias.map((d) => d.total).reverse(),
          itemStyle: { color: "#91CC75", borderRadius: [0, 3, 3, 0] }
        }
      ]
    };
    
    // 📊 Aplicar opciones al gráfico
    chartBarrasDias.setOption(opcionesGraficoBarrasDias);
}
window.chartIndicador = chartIndicador;
window.datosGlobales = datosGlobales;
// Después de sensores.forEach(...) o al final de cargarSensores


function agregarDescripcionGrafico(idContenedor, textoDescripcion) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) {
    console.warn(`⚠️ No se encontró el contenedor: ${idContenedor}`);
    return;
  }

  // Verificar si ya existe una descripción para evitar duplicados
  if (contenedor.nextElementSibling?.classList.contains("descripcion-grafico")) return;

  const descripcion = document.createElement("div");
  descripcion.className = "descripcion-grafico";
  descripcion.textContent = textoDescripcion;

  // Insertar después del contenedor del gráfico
  contenedor.parentNode.insertBefore(descripcion, contenedor.nextSibling);
}



});


// Utilidad para reemplazo de variables en el backend (por ejemplo, para generar informes PDF)
/**
 * Reemplaza dinámicamente todas las variables {{NOMBRE}} en un HTML por valores del payload.
 * @param {string} html - El HTML base con variables {{NOMBRE}}.
 * @param {object} payload - Objeto con los valores a reemplazar.
 * @returns {string} - HTML con variables reemplazadas.
 */
function reemplazarVariables(html, payload) {
  return html
    .replace(/{{SENSOR}}/g, payload.sensorNombre || "—")
    .replace(/{{FECHA_INICIO}}/g, payload.fechaInicio || "—")
    .replace(/{{FECHA_FIN}}/g, payload.fechaFin || "—")
    .replace(/{{zoomInicio}}/g, payload.zoomInicio || "—")  // 🔥 AÑADIDO
    .replace(/{{zoomFin}}/g, payload.zoomFin || "—")         // 🔥 AÑADIDO
    .replace(/{{HTML_GRAFICO_1}}/g, payload.htmlGrafico1 || "")
    .replace(/{{HTML_GRAFICO_2}}/g, payload.htmlGrafico2 || "")
    .replace(/{{HTML_GRAFICO_3}}/g, payload.htmlGrafico3 || "")
    .replace(/{{HTML_GRAFICO_4}}/g, payload.htmlGrafico4 || "")
    .replace(/{{HTML_GRAFICO_5}}/g, payload.htmlGrafico5 || "")
    .replace(/{{TABLA_INDICADORES}}/g, payload.tablaIndicadores || "")
    .replace(/{{DIRECCION}}/g, payload.detallesSensor?.direccion || "—")
    .replace(/{{BARRIO}}/g, payload.detallesSensor?.barrio || "—")
    .replace(/{{MUNICIPIO}}/g, payload.detallesSensor?.municipio || "—")
    .replace(/{{CLASIFICACION}}/g, payload.detallesSensor?.clasificacion || "—")
    .replace(/{{USO_SUELO}}/g, payload.detallesSensor?.uso_suelo || "—")
    .replace(/{{SECTOR}}/g, payload.detallesSensor?.sector || "—")
    .replace(/{{SUBSECTOR}}/g, payload.detallesSensor?.subsector || "—")
    .replace(/{{ESTADO}}/g, payload.detallesSensor?.estado || "—")
    .replace(/{{FECHA_INSTALACION}}/g, payload.detallesSensor?.fecha_instalacion || "—")
    .replace(/{{ULT_MANT}}/g, payload.detallesSensor?.fecha_mantenimiento || "—")
    .replace(/{{FREQ_MONITOREO}}/g, payload.detallesSensor?.frecuencia_monitoreo || "—")
    .replace(/{{REFERENCIA}}/g, payload.detallesSensor?.referencia || "—");
}