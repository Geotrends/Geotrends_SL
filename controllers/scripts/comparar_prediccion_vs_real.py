# === Predicción de la semana anterior (retrospectiva) ===
fechas_retro = []
datos_retro = []

for dia_offset in range(7, 0, -1):
    fecha_base = datetime.now() - timedelta(days=dia_offset)
    dia_semana = fecha_base.weekday()
    es_fin_semana = dia_semana >= 5
    mes = fecha_base.month

    for hora in range(24):
        fecha_hora = datetime.combine(fecha_base.date(), datetime.min.time()) + timedelta(hours=hora)
        hora_decimal = hora
        es_diurno = 7 <= hora <= 20
        es_nocturno = not es_diurno

        fechas_retro.append(fecha_hora)
        datos_retro.append([
            temp_prom,
            hum_prom,
            hora,
            hora_decimal,
            es_diurno,
            es_nocturno,
            es_fin_semana,
            dia_semana,
            mes
        ])

df_retro = pd.DataFrame(datos_retro, columns=columnas)
pred_retro = modelo.predict(df_retro)

df_pred_retro = pd.DataFrame({
    'timestamp': pd.to_datetime(fechas_retro).tz_localize('America/Bogota'),
    'laeq_slow': pred_retro
})

plt.figure(figsize=(14, 6))
plt.plot(df_historico['timestamp'], df_historico['laeq_slow'], label='LAeq Histórico (semana pasada)', color='blue')
plt.plot(df_pred_retro['timestamp'], df_pred_retro['laeq_slow'], label='Predicción Retroactiva (modelo)', color='red', linestyle='--')
plt.plot(df_predicciones['timestamp'], df_predicciones['laeq_slow'], label='Predicción Futura (modelo)', color='green', linestyle=':')
plt.xlabel("Fecha y hora")
plt.ylabel("Nivel Sonoro LAeq [dB]")
plt.title(f"Evaluación modelo - comparación semana pasada y futura - {sensor_id}")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()