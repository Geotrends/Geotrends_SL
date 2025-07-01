document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar Litepicker en modo rango
  const picker = new Litepicker({
    element: document.getElementById("rango-fechas"),
    singleMode: false,
    format: "YYYY-MM-DD",
    setup: (picker) => {
      picker.on("selected", (startDate, endDate) => {
        const desde = startDate.format("YYYY-MM-DD");
        const hasta = endDate.format("YYYY-MM-DD");

        const opciones = { day: 'numeric', month: 'long', year: 'numeric' };
        const fechaInicio = new Date(desde).toLocaleDateString('es-CO', opciones);
        const fechaFin = new Date(hasta).toLocaleDateString('es-CO', opciones);

        const input = document.getElementById("rango-fechas");
        setTimeout(() => {
          input.value = `Del ${fechaInicio} al ${fechaFin}`;
        }, 50);
        input.setAttribute("data-desde", desde);
        input.setAttribute("data-hasta", hasta);
      });
    },
  });

  // Cargar sensores disponibles
  const sensores = await fetch("/api/giotrends/prediccion/sensores").then((r) =>
    r.json()
  );
  const select = document.getElementById("sensor");
  sensores.forEach((s) => {
    const nombreSensor = `${s.referencia} - ${s.barrio}`;
    select.innerHTML += `<option value="${s.sensor_id}">${nombreSensor}</option>`;
  });

  document
    .getElementById("btnConsultar")
    .addEventListener("click", async (e) => {
      e.preventDefault();
      const input = document.getElementById("rango-fechas");
      const desde = input.getAttribute("data-desde");
      const hasta = input.getAttribute("data-hasta");

      const formatearRangoFechas = (desde, hasta) => {
        const opciones = { day: 'numeric', month: 'long', year: 'numeric' };
        const fechaInicio = new Date(desde).toLocaleDateString('es-CO', opciones);
        const fechaFin = new Date(hasta).toLocaleDateString('es-CO', opciones);
        return `Del ${fechaInicio} al ${fechaFin}`;
      };
      //document.getElementById("textoRangoFechas").textContent = formatearRangoFechas(desde, hasta);

      const url = `/api/giotrends/prediccion?sensor_id=${select.value}&desde=${desde}&hasta=${hasta}`;
      try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data.metrica || !data.predicciones) {
          document.getElementById("metricas").innerHTML = `
            <p style="color: red;"><strong>Error:</strong> No se pudo calcular la predicción.</p>
          `;
          return;
        }

        // Mostrar métricas y gráfico
        const option = {
          title: {
            text: "Predicción horaria de ruido",
            left: "center",
            top: "0%",
          },
          tooltip: {
            trigger: "axis",
            formatter: function (params) {
              const fullDate = new Date(params[0].axisValue);
              const formattedDate = fullDate.toLocaleString("es-CO", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              });
              let tooltipHTML = `<strong>${formattedDate}</strong><br>`;
              params.forEach((p) => {
                tooltipHTML += `${p.marker} ${
                  p.seriesName
                }: <strong>${p.data.toFixed(2)}</strong> dB<br>`;
              });
              return tooltipHTML;
            },
            backgroundColor: "rgba(50, 50, 50, 0.8)",
            borderColor: "#fff",
            borderWidth: 1,
            textStyle: { color: "#fff" },
          },
          xAxis: {
            type: "category",
            data: data.predicciones.map((p) => p.timestamp),
            name: "Fecha y Hora",
            nameLocation: "middle",
            nameGap: 25,
            axisLabel: {
              formatter: function (value) {
                const date = new Date(value);
                return date.toLocaleString("es-CO", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit"
                });
              },
              rotate: 0,
              fontSize: 10,
            },
          },
          yAxis: {
            type: "value",
            name: "Nivel de Ruido (dB)",
            nameLocation: "middle",
            nameGap: 45,
            min: 30,
            max: "dataMax",
            axisLabel: { fontSize: 12 },
          },
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
              color: "#2b7a9a", // Línea de fondo un poco más oscura
            },
            areaStyle: {
              color: "rgba(54, 147, 182, 0.15)", // Área sombreada más sutil
            },
          },
          fillerColor: "rgba(54, 147, 182, 0.4)", // Área seleccionada con buena visibilidad
          borderColor: "#1e5f78", // Borde del slider más oscuro
          handleStyle: {
            color: "#3693b6", // Botón deslizante con el color base
            borderColor: "rgba(54, 147, 182, 0.6)", // Borde del botón más definido
          },
              textStyle: {
                color: "rgb(0, 0, 0)",
                fontSize: 12,
                fontWeight: "lighter",
              },
              labelFormatter: function (value, valueStr) {
                const timestamp = data.predicciones[value]?.timestamp;
                if (!timestamp) return '';
                const date = new Date(timestamp);
                return date.toLocaleString("es-CO", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit"
                });
              }
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
              data: data.predicciones.map((p) => p.laeq_slow),
              type: "line",
              name: "Predicción",
              smooth: false,
              lineStyle: { width: 2, color: "#82cc19" },
              itemStyle: { color: "#82cc19" },
              showSymbol: false,
            },
          ],
        };

        const contenedor = document.getElementById("grafico");
        const contenidoGrafico = `
  <div style="width: 100%; display: flex; flex-wrap: wrap; gap: 20px;">
    <div id="indicadoresPrediccion" style="width: 100%; margin-bottom: 10px; background-color: #f9f9f9; border: 1px solid #ccc; border-radius: 8px; padding: 10px; text-align: center;">
      <div id="listaIndicadores" style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
        <div><strong>🌞 LAeq Día:</strong> -</div>
        <div><strong>🌙 LAeq Noche:</strong> -</div>
        <div><strong>🕐 LAeq 24h:</strong> -</div>
      </div>
    </div>
    <div style="flex: 2; min-width: 300px;">
      <div id="graficoEcharts" style="width: 100%; height: 400px;"></div>
    </div>
    <div style="margin-top: 20px; text-align: justify; font-size: 14px; line-height: 1.4; color: #555; width: 100%;">
      <p>
        Esta visualización corresponde a una predicción horaria de los niveles de ruido ambiental (LAeq_slow) para el sensor <strong>${data.sensor_id}</strong>, 
        utilizando el modelo <strong>${data.modelo}</strong> entrenado con datos históricos registrados en esta ubicación.
      </p>
      <p>
        El modelo se actualiza semanalmente y permite estimar el comportamiento esperado del ruido, considerando patrones asociados a la hora del día, 
        el día de la semana y si es fin de semana o no. Esta información es útil para anticipar escenarios de exposición sonora, planificar intervenciones 
        o validar condiciones esperadas en zonas específicas.
      </p>
      <p>
        Para el rango consultado <strong>${formatearRangoFechas(desde, hasta)}</strong>, se presentan los siguientes indicadores de desempeño del modelo:
        <ul style="margin-top: 6px; margin-bottom: 6px;">
          <li><strong title="Error absoluto medio: promedio de las diferencias absolutas entre predicción y valor real.">MAE</strong>: ${data.metrica.mae} dB</li>
          <li><strong title="Raíz del error cuadrático medio: penaliza más los errores grandes.">RMSE</strong>: ${data.metrica.rmse} dB</li>
          <li><strong title="Coeficiente de determinación: mide qué tanto el modelo explica la variabilidad de los datos.">R²</strong>: ${data.metrica.r2}</li>
        </ul>
        Estos valores indican que el modelo tiene un buen nivel de precisión para este sensor y rango, siendo el R² cercano a 1 una señal de que explica adecuadamente 
        la variabilidad de los datos históricos.
      </p>
      <p>
        Ten en cuenta que esta predicción no reemplaza mediciones reales, sino que complementa el análisis acústico ofreciendo proyecciones basadas en tendencias anteriores. 
        Es especialmente útil en días donde aún no se han registrado datos o para anticipar niveles en días futuros.
      </p>
    </div>
  </div>`;
        let infoDiv = document.getElementById("contenidoPrediccion");
        if (!infoDiv) {
          infoDiv = document.createElement("div");
          infoDiv.id = "contenidoPrediccion";
          contenedor.appendChild(infoDiv);
        }
        infoDiv.innerHTML = contenidoGrafico;

        const chartDom = document.getElementById("graficoEcharts");
        const myChart = echarts.init(chartDom);
        myChart.setOption(option);

        // --- Indicadores dinámicos: Día, Noche, 24h para predicción ---
        // Copiamos la lógica de calculateDayNightLevels de modal.js
        function calculateDayNightLevelsPredicciones(predicciones) {
          const dayData = [];
          const nightData = [];
          predicciones.forEach((row) => {
            const localDate = new Date(row.timestamp);
            const hour = localDate.getHours();
            if (hour >= 7 && hour <= 20) {
              dayData.push(row.laeq_slow);
            } else {
              nightData.push(row.laeq_slow);
            }
          });
          // Promedio energético
          function energeticAvg(values) {
            if (!values || values.length === 0) return null;
            const sum = values.reduce((acc, v) => acc + Math.pow(10, v / 10), 0);
            return 10 * Math.log10(sum / values.length);
          }
          return {
            laeqDay: energeticAvg(dayData),
            laeqNight: energeticAvg(nightData),
            laeq24: energeticAvg(predicciones.map((r) => r.laeq_slow)),
          };
        }

        // Inicializar indicadores para todo el rango visible (al inicio)
        function updateIndicadoresLista(prediccionesVisibles) {
          const indicadores = calculateDayNightLevelsPredicciones(prediccionesVisibles);
          const lista = document.getElementById("listaIndicadores");
          if (!lista) return;
          lista.innerHTML = `
    <div><strong>🌞 LAeq Día:</strong> ${indicadores.laeqDay !== null ? indicadores.laeqDay.toFixed(1) + " dB" : "-"}</div>
    <div><strong>🌙 LAeq Noche:</strong> ${indicadores.laeqNight !== null ? indicadores.laeqNight.toFixed(1) + " dB" : "-"}</div>
    <div><strong>🕐 LAeq 24h:</strong> ${indicadores.laeq24 !== null ? indicadores.laeq24.toFixed(1) + " dB" : "-"}</div>
  `;
        }
        // Primer render, todo el rango
        updateIndicadoresLista(data.predicciones);

        // Handler para dataZoom de ECharts
        myChart.on("dataZoom", function (params) {
          // params.start, params.end son porcentajes (0-100)
          const total = data.predicciones.length;
          let start, end;
          if (params.batch && params.batch[0]) {
            start = params.batch[0].start;
            end = params.batch[0].end;
          } else {
            start = params.start;
            end = params.end;
          }
          const iStart = Math.floor((start / 100) * total);
          const iEnd = Math.min(Math.ceil((end / 100) * total), total - 1);
          const visibles = data.predicciones.slice(iStart, iEnd + 1);
          updateIndicadoresLista(visibles);
        });
      } catch (error) {
        document.getElementById("metricas").innerHTML = `
          <p style="color: red;"><strong>Error de red o del servidor:</strong> ${error.message}</p>
        `;
      }
    });
});
