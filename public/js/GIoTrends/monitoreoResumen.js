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

        const titulo = document.createElement("h4");
        titulo.textContent = `Sensor: ${sensor.sensor_id}`;

        const referencia = document.createElement("p");
        referencia.textContent = `Referencia: ${sensor.referencia}`;

        const ubicacion = document.createElement("p");
        ubicacion.textContent = `Municipio: ${sensor.municipio}, Barrio: ${sensor.barrio}`;

        const usoSuelo = document.createElement("p");
        usoSuelo.textContent = `Uso del suelo: ${sensor.uso_suelo}`;

        const fecha = document.createElement("p");
        const fechaObj = new Date(sensor.timestamp);
        const opcionesFecha = { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "numeric", hour12: true };
        const fechaTexto = fechaObj.toLocaleDateString("es-ES", opcionesFecha);
        fecha.textContent = `Fecha: ${fechaTexto}`;

        const laeq = document.createElement("p");
        laeq.textContent = `LAeq_slow: ${sensor.laeq_slow ?? "No disponible"}`;

        tarjeta.appendChild(titulo);
        tarjeta.appendChild(referencia);
        tarjeta.appendChild(ubicacion);
        tarjeta.appendChild(usoSuelo);
        tarjeta.appendChild(fecha);
        tarjeta.appendChild(laeq);

        contenedor.appendChild(tarjeta);
      });
    })
    .catch((err) => {
      console.error("❌ Error al obtener los datos:", err);
    });
}

inicializarResumen();