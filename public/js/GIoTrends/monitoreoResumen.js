export function inicializarResumen() {
  console.log("📊 Inicializando vista de Resumen de Monitoreo...");

  fetch("/api/giotrends/monitoreo/datos-recientes")
    .then((res) => res.json())
    .then((datos) => {
      console.log("✅ Datos recibidos:", datos);

      const contenedor = document.createElement("div");
      contenedor.className = "tarjetas-grid";
      document.body.appendChild(contenedor);

      datos.forEach((sensor) => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta-sensor";

        const laeqNum = parseFloat(sensor.laeq_slow);
        let colorClase = "nivel-bajo";
        if (!isNaN(laeqNum)) {
          if (laeqNum >= 75) colorClase = "nivel-excesivo";
          else if (laeqNum >= 65) colorClase = "nivel-alto";
          else if (laeqNum >= 55) colorClase = "nivel-moderado";
          else if (laeqNum >= 45) colorClase = "nivel-normal";
        }
        tarjeta.classList.add(colorClase);

        const referencia = document.createElement("p");
        referencia.textContent = `${sensor.referencia}`;

        // const titulo = document.createElement("h4");
        // titulo.textContent = `Sensor: ${sensor.sensor_id}`;

        const laeq = document.createElement("p");
        const laeqValue = !isNaN(laeqNum)
          ? laeqNum.toFixed(1)
          : "No disponible";
        laeq.innerHTML = `${laeqValue} <span style="font-size: 0.6em;">dBA</span>`;

        // const ubicacion = document.createElement("p");
        // ubicacion.textContent = `Municipio: ${sensor.municipio}, Barrio: ${sensor.barrio}`;

        // const usoSuelo = document.createElement("p");
        // usoSuelo.textContent = `Uso del suelo: ${sensor.uso_suelo}`;

        const fecha = document.createElement("p");
        const fechaObj = new Date(sensor.timestamp);
        const opcionesFecha = { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "numeric", hour12: true };
        const fechaTexto = fechaObj.toLocaleDateString("es-ES", opcionesFecha);
        fecha.textContent = `Actualización: ${fechaTexto}`;



        // tarjeta.appendChild(titulo);
        tarjeta.appendChild(referencia);
        // tarjeta.appendChild(ubicacion);
        // tarjeta.appendChild(usoSuelo);
        tarjeta.appendChild(laeq);
        tarjeta.appendChild(fecha);


        contenedor.appendChild(tarjeta);
      });
    })
    .catch((err) => {
      console.error("❌ Error al obtener los datos:", err);
    });
}

inicializarResumen();