import os
import psycopg2
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from xgboost import XGBRegressor
import plotly.graph_objects as go

# === Cargar entorno y modelo ===
load_dotenv()
sensor_id = 'GTR_IoT_002'

# === Obtener último dato, temperatura y humedad promedio
conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', 5432),
    database=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD']
)
cursor = conn.cursor()
cursor.execute("""
    SELECT MAX(fecha), AVG(temperature), AVG(humidity)
    FROM resumen_iot.resumen_horario
    WHERE sensor_id = %s
""", (sensor_id,))
ultimo_registro, temp_prom, hum_prom = cursor.fetchone()
cursor.close()
conn.close()

if ultimo_registro is None:
    raise ValueError("No hay datos históricos disponibles.")

# === Generar fechas futuras (14 días por hora)
fechas_futuras = []
datos_futuros = []

for horas_a_sumar in range(1, 14 * 24 + 1):  # 14 días * 24 horas
    fecha_futura = ultimo_registro + timedelta(hours=horas_a_sumar)
    hora = fecha_futura.hour
    dia_semana = fecha_futura.weekday()
    mes = fecha_futura.month

    es_diurno = 7 <= hora <= 20
    es_fin_semana = dia_semana >= 5

    fechas_futuras.append(fecha_futura)
    datos_futuros.append([
        temp_prom,
        hum_prom,
        hora,
        int(es_diurno),
        int(es_fin_semana),
        dia_semana,
        mes
    ])

columnas = [
    'temperature', 'humidity',
    'hora',
    'es_diurno',
    'es_fin_semana',
    'dia_semana',
    'mes'
]

df_futuro = pd.DataFrame(datos_futuros, columns=columnas)

# Convertir columnas a float para evitar errores con XGBoost
for col in columnas:
    df_futuro[col] = pd.to_numeric(df_futuro[col], errors='coerce')

# === Conectar nuevamente para obtener todos los datos históricos
conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', 5432),
    database=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD']
)
cursor = conn.cursor()
cursor.execute("""
    SELECT fecha AS timestamp, laeq_slow, temperature, humidity
    FROM resumen_iot.resumen_horario
    WHERE sensor_id = %s
    ORDER BY fecha;
""", (sensor_id,))
rows = cursor.fetchall()
cursor.close()
conn.close()

# === Preparar histórico
df_hist = pd.DataFrame(rows, columns=['timestamp', 'laeq_slow', 'temperature', 'humidity'])
df_hist['timestamp'] = pd.to_datetime(df_hist['timestamp']).dt.tz_localize('UTC').dt.tz_convert('America/Bogota')
df_hist['hora'] = df_hist['timestamp'].dt.hour
df_hist['es_diurno'] = df_hist['hora'].between(7, 20).astype(int)
df_hist['es_fin_semana'] = (df_hist['timestamp'].dt.weekday >= 5).astype(int)
df_hist['dia_semana'] = df_hist['timestamp'].dt.weekday
df_hist['mes'] = df_hist['timestamp'].dt.month

for col in columnas:
    if df_hist[col].dtype == bool:
        df_hist[col] = df_hist[col].astype(int)
    elif df_hist[col].dtype == int:
        df_hist[col] = df_hist[col].astype(float)

df_hist = df_hist.dropna()
X = df_hist[columnas]
y = df_hist['laeq_slow']

# Convertir columnas object a float para evitar errores con XGBoost
for col in X.columns:
    if X[col].dtype == 'object':
        X[col] = pd.to_numeric(X[col], errors='coerce')

for col in columnas:
    X[col] = pd.to_numeric(X[col], errors='coerce')

# === Entrenar modelo y predecir
modelo = XGBRegressor()
modelo.fit(X, y)
predicciones = modelo.predict(df_futuro)

df_pred = pd.DataFrame({
    'timestamp': fechas_futuras,
    'laeq_slow': predicciones
})

# === Graficar resultado con Plotly (interactivo)
fig = go.Figure()
fig.add_trace(go.Scatter(x=df_hist['timestamp'], y=df_hist['laeq_slow'],
                         mode='lines', name='Histórico', line=dict(color='blue')))
fig.add_trace(go.Scatter(x=df_pred['timestamp'], y=df_pred['laeq_slow'],
                         mode='lines', name='Predicción 2 semanas', line=dict(color='orange', dash='dash')))

fig.update_layout(
    title=f"Predicción de 2 semanas posteriores - {sensor_id}",
    xaxis_title="Fecha y hora",
    yaxis_title="Nivel Sonoro LAeq [dB]",
    hovermode="x unified",
    template="plotly_white"
)

fig.show()