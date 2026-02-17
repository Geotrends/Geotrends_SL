/**
@file public/js/settings.js
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
    // 🔹 Inicializar DataTables
    const table = $('#sensorsTable').DataTable({
        responsive: true,
        paging: true,
        searching: true,
        ordering: true,
        pageLength: 20,
        language: {
            url: "//cdn.datatables.net/plug-ins/1.13.5/i18n/es-ES.json"
        },
        columnDefs: [
            { width: '10%', targets: 0 },
            { width: '20%', targets: 1 },
            { width: '20%', targets: 2 },
            { width: '15%', targets: 3 },
            { width: '15%', targets: 4 },
            { width: '15%', targets: 5 },
            { width: '10%', targets: 6 },
            { width: '15%', targets: 7 },
            { width: '2%', targets: 8 }
        ],
    });

    // 🔹 Función para cargar sensores en la tabla
    const loadSensors = async () => {
        try {
            const response = await fetch('/api/settings');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const sensors = await response.json();
            table.clear();

            sensors.forEach(sensor => {
                const estadoIcon = sensor.estado === 'Activo'
                    ? '<span class="estado-activo">✔️ Activo</span>'
                    : '<span class="estado-inactivo">❌ No Activo</span>';

                table.row.add([
                    sensor.sensor_id,
                    sensor.referencia,
                    sensor.barrio,
                    sensor.municipio,
                    sensor.departamento,
                    sensor.tipo,
                    estadoIcon,
                    sensor.fecha_ins,
                    `<button class="btn btn-warning btn-small edit-btn" data-id="${sensor.id}">Editar</button>`
                ]);
            });
            table.draw();
        } catch (error) {
            console.error('Error al cargar sensores:', error);
        }
    };

    // 🔹 Función para abrir el modal
    function openModal() {
        const modal = document.getElementById("editSensorModal");
        if (modal) {
            modal.style.display = "flex";
        }
    }

    // 🔹 Función para cerrar el modal
// Hacer que closeModal sea accesible desde el HTML
window.closeModal = function () {
    const modal = document.getElementById("editSensorModal");
    if (modal) {
        modal.style.display = "none";
    }
};


    // 🔹 Vincular el botón de cancelar y la "X" si existen en el DOM
    document.addEventListener("click", function (event) {
        if (event.target.matches("#cancelBtn")) {
            closeModal();
        }
        if (event.target.matches(".close")) {
            closeModal();
        }
    });

    // 🔹 Variables del mapa Leaflet
    let map, marker;

    // 🔹 Evento para abrir el modal y cargar datos del sensor
    $('#sensorsTable').on('click', '.edit-btn', async function () {
        const sensorId = $(this).data('id');
        try {
            const response = await fetch(`/api/settings/${sensorId}`);
            if (!response.ok) throw new Error(`Error al obtener sensor: ${response.statusText}`);
            const sensor = await response.json();

            // Llenar los campos del formulario con los datos del sensor
            $('#sensor_id_hidden').val(sensor.id);
            $('#edit_sensor_id').val(sensor.sensor_id);
            $('#edit_geom').val(sensor.geom);
            $('#edit_freq_monitoreo').val(sensor.freq_monitoreo);
            $('#edit_fin_monitoreo').val(sensor.fin_monitoreo);
            $('#edit_clasificacion').val(sensor.clasificacion);
            $('#edit_referencia').val(sensor.referencia);
            $('#edit_instalacion').val(sensor.instalacion);
            $('#edit_linea').val(sensor.linea);
            $('#edit_operador').val(sensor.operador);
            $('#edit_barrio').val(sensor.barrio);
            $('#edit_municipio').val(sensor.municipio);
            $('#edit_departamento').val(sensor.departamento);
            $('#edit_tipo').val(sensor.tipo);
            $('#edit_uso_suelo').val(sensor.uso_suelo);
            $('#edit_estado').val(sensor.estado);
            $('#edit_sector').val(sensor.sector);
            $('#edit_subsector').val(sensor.subsector);
            $('#edit_proveedor').val(sensor.proveedor);
            $('#edit_direccion').val(sensor.direccion);
            $('#edit_fecha_ins').val(sensor.fecha_ins);
            $('#edit_ult_mant').val(sensor.ult_mant);

            openModal();

            // 🔹 Inicializar o actualizar el mapa
            if (!map) {
                map = L.map('map').setView([6.25184, -75.56359], 13);

                const baseMaps = {
                    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }),
                    "Satelital": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                        attribution: 'Tiles © Esri & contributors'
                    })
                };

                baseMaps["OpenStreetMap"].addTo(map);
                L.control.layers(baseMaps).addTo(map);

                marker = L.marker([6.25184, -75.56359], { draggable: true }).addTo(map);
                marker.on('moveend', function (e) {
                    const { lat, lng } = e.target.getLatLng();
                    $('#edit_geom').val(`POINT(${lng} ${lat})`);
                });
            }

            if (sensor.geom && sensor.geom.startsWith('POINT(')) {
                const [lng, lat] = sensor.geom.replace('POINT(', '').replace(')', '').split(' ').map(Number);
                map.setView([lat, lng], 15);
                marker.setLatLng([lat, lng]);
            }
        } catch (error) {
            console.error('Error al cargar el sensor:', error);
        }
    });

    // 🔹 Evento para actualizar el sensor
    $('#editSensorForm').submit(async function (e) {
        e.preventDefault();

        const updatedSensor = {
            id: $('#sensor_id_hidden').val(),
            geom: $('#edit_geom').val(),
            freq_monitoreo: $('#edit_freq_monitoreo').val(),
            fin_monitoreo: $('#edit_fin_monitoreo').val(),
            clasificacion: $('#edit_clasificacion').val(),
            referencia: $('#edit_referencia').val(),
            instalacion: $('#edit_instalacion').val(),
            linea: $('#edit_linea').val(),
            operador: $('#edit_operador').val(),
            barrio: $('#edit_barrio').val(),
            municipio: $('#edit_municipio').val(),
            departamento: $('#edit_departamento').val(),
            tipo: $('#edit_tipo').val(),
            uso_suelo: $('#edit_uso_suelo').val(),
            estado: $('#edit_estado').val(),
            sector: $('#edit_sector').val(),
            subsector: $('#edit_subsector').val(),
            proveedor: $('#edit_proveedor').val(),
            direccion: $('#edit_direccion').val(),
            fecha_ins: $('#edit_fecha_ins').val(),
            ult_mant: $('#edit_ult_mant').val(),
        };

        try {
            const response = await fetch(`/api/settings/${updatedSensor.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSensor),
            });

            if (!response.ok) throw new Error(`Error al guardar cambios: ${response.statusText}`);
            // console.log('Sensor actualizado correctamente');
            closeModal();
            loadSensors();
        } catch (error) {
            console.error('Error al actualizar el sensor:', error);
        }
    });

    // 🔹 Cargar los sensores al inicio
    loadSensors();
});
