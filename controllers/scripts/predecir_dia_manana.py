import os
import sys
import pickle
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime, timedelta

# === Cargar variables de entorno ===
load_dotenv()

# === Leer sensor desde argumento ===
if len(sys.argv) < 2:
    print("Uso: python predecir_dia_manana.py <sensor_id>")
    sys.exit(1)

sensor_id = sys.argv[1]

# === Cargar modelo ===
modelo_path = f'models/modelo_contextual_{sensor_id}.pkl'
if not os.path.exists(modelo_path):
    print(f"❌ No se encontró el modelo: {modelo_path}")
    sys.exit(1)

with open(modelo_path, 'rb') as f:
    modelo = pickle.load(f)

columnas = [
    'temperature', 'humidity',
    'hora', 'hora_decimal',
    'es_diurno', 'es_nocturno',
    'es_fin_semana', 'dia_semana', 'mes'
]

# === Generar variables de entrada para cada hora de los próximos 7 días ===
dias_prediccion = 7
temp_prom = 25.0
hum_prom = 60.0

fechas_pred = []
datos_pred = []

for dia_offset in range(dias_prediccion):
    fecha_base = datetime.now() + timedelta(days=dia_offset)
    dia_semana = fecha_base.weekday()
    es_fin_semana = dia_semana >= 5
    mes = fecha_base.month

    for hora in range(24):
        fecha_hora = datetime.combine(fecha_base.date(), datetime.min.time()) + timedelta(hours=hora)
        hora_decimal = hora
        es_diurno = 7 <= hora <= 20
        es_nocturno = not es_diurno

        fechas_pred.append(fecha_hora)
        datos_pred.append([
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

df_pred = pd.DataFrame(datos_pred, columns=columnas)
predicciones = modelo.predict(df_pred)

# Mostrar resultados
print(f"\n📅 Predicciones horarias para los próximos {dias_prediccion} días - Sensor: {sensor_id}")
print("-" * 60)
for i, pred in enumerate(predicciones):
    fecha = fechas_pred[i]
    print(f"{fecha.strftime('%Y-%m-%d %H:%M')} → LAeq estimado: {pred:.2f} dB")

# Preparar DataFrame de predicción
df_predicciones = pd.DataFrame({
    'timestamp': pd.to_datetime(fechas_pred).tz_localize('America/Bogota'),
    'laeq_slow': predicciones
})

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

# === Consultar datos de hoy y graficar junto a las predicciones ===
import psycopg2
import matplotlib.pyplot as plt
import pytz

# Conexión a la base de datos para obtener datos de hoy
conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', 5432),
    database=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD']
)
cursor = conn.cursor()

query = """
    SELECT fecha AS timestamp, laeq_slow
    FROM resumen_iot.resumen_horario
    WHERE sensor_id = %s
      AND fecha >= NOW() - INTERVAL '7 days'
    ORDER BY fecha;
"""
cursor.execute(query, (sensor_id,))
rows = cursor.fetchall()
cursor.close()
conn.close()

# Convertir resultados a DataFrame
df_historico = pd.DataFrame(rows, columns=['timestamp', 'laeq_slow'])
df_historico['timestamp'] = pd.to_datetime(df_historico['timestamp'])
df_historico['timestamp'] = df_historico['timestamp'].dt.tz_localize('UTC').dt.tz_convert('America/Bogota')

# === Obtener semana siguiente real si ya existe en base de datos ===
conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', 5432),
    database=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD']
)
cursor = conn.cursor()

query_futuro = """
    SELECT fecha AS timestamp, laeq_slow
    FROM resumen_iot.resumen_horario
    WHERE sensor_id = %s
      AND fecha >= CURRENT_DATE
      AND fecha < CURRENT_DATE + INTERVAL '7 days'
    ORDER BY fecha;
"""
cursor.execute(query_futuro, (sensor_id,))
rows_futuro = cursor.fetchall()
cursor.close()
conn.close()

# Convertir a DataFrame
df_futuro = pd.DataFrame(rows_futuro, columns=['timestamp', 'laeq_slow'])
if not df_futuro.empty:
    df_futuro['timestamp'] = pd.to_datetime(df_futuro['timestamp'])
    df_futuro['timestamp'] = df_futuro['timestamp'].dt.tz_localize('UTC').dt.tz_convert('America/Bogota')

# Graficar con predicción retrospectiva y futura
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