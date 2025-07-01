import os
import pickle
import psycopg2
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor

# === Cargar entorno y sensor ===
load_dotenv()
sensor_id = 'GTR_IoT_002'

# === Conexión a base de datos ===
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

# === Convertir a DataFrame ===
df = pd.DataFrame(rows, columns=['timestamp', 'laeq_slow', 'temperature', 'humidity'])
df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize('UTC').dt.tz_convert('America/Bogota')

# === Variables contextuales ===
df['hora'] = df['timestamp'].dt.hour
df['hora_decimal'] = df['hora'] + df['timestamp'].dt.minute / 60
df['es_diurno'] = df['hora'].between(7, 20)
df['es_nocturno'] = ~df['es_diurno']
df['es_fin_semana'] = df['timestamp'].dt.weekday >= 5
df['dia_semana'] = df['timestamp'].dt.weekday
df['mes'] = df['timestamp'].dt.month
df['dia'] = df['timestamp'].dt.day

# === Convertir a numérico
df['temperature'] = pd.to_numeric(df['temperature'], errors='coerce')
df['humidity'] = pd.to_numeric(df['humidity'], errors='coerce')

# === Feriados de Colombia (simulados)
feriados = pd.to_datetime([
    "2025-01-01", "2025-01-06", "2025-03-24", "2025-04-17", "2025-04-18", "2025-05-01",
    "2025-05-12", "2025-06-02", "2025-06-23", "2025-06-30", "2025-07-20", "2025-08-07",
    "2025-08-18", "2025-10-13", "2025-11-03", "2025-11-17", "2025-12-08", "2025-12-25"
])
df['es_festivo'] = df['timestamp'].dt.normalize().isin(feriados)

# === Eventos típicos (simulados)
eventos = pd.to_datetime(["2025-08-05", "2025-12-01"])  # Ej: Feria de flores, alumbrado
df['hay_evento'] = df['timestamp'].dt.normalize().isin(eventos)

# === Variables optimizadas (basadas en importancia)
columnas = [
    'temperature', 'humidity',
    'hora',
    'es_diurno',
    'es_fin_semana',
    'dia_semana',
    'mes'
]

 # Convertir booleanos explícitamente a enteros y forzar a tipo float para estabilidad numérica
for col in columnas:
    if df[col].dtype == bool:
        df[col] = df[col].astype(int)
    elif df[col].dtype == int:
        df[col] = df[col].astype(float)

df = df.dropna()
X = df[columnas]
y = df['laeq_slow']

# === División entrenamiento / validación (usando todo el dataset para entrenamiento y validación)
X_train, y_train = X, y
X_val, y_val = X, y

# === Modelos a evaluar
modelos = {
    'XGBoost': XGBRegressor(),
    'RandomForest': RandomForestRegressor(),
    'GradientBoosting': GradientBoostingRegressor(),
    'LinearRegression': LinearRegression()
}

# === Evaluación
print(f"\n📊 Evaluación de modelos para sensor: {sensor_id}\n{'-'*50}")
for nombre, modelo in modelos.items():
    modelo.fit(X_train, y_train)
    y_pred = modelo.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    rmse = mean_squared_error(y_val, y_pred) ** 0.5
    r2 = r2_score(y_val, y_pred)
    print(f"🔎 Modelo: {nombre}")
    print(f"  MAE : {mae:.2f}")
    print(f"  RMSE: {rmse:.2f}")
    print(f"  R²  : {r2:.3f}")
    print("-" * 50)


# Gráfico comparativo de predicciones (versión interactiva con Plotly)
import plotly.express as px
import plotly.graph_objects as go

fig = go.Figure()
fig.add_trace(go.Scatter(
    y=y_val.reset_index(drop=True),
    mode='lines',
    name='Real',
    line=dict(color='black', width=2)
))

for nombre, modelo in modelos.items():
    modelo.fit(X_train, y_train)
    y_pred = modelo.predict(X_val)
    fig.add_trace(go.Scatter(
        y=y_pred,
        mode='lines',
        name=nombre,
        line=dict(dash='dash')
    ))

fig.update_layout(
    title=f"Comparación de predicción - Última semana - {sensor_id}",
    xaxis_title="Índice temporal de validación",
    yaxis_title="LAeq [dB]",
    hovermode="x unified",
    template="plotly_white"
)

fig.show()

# === Ranking de modelos por RMSE
resultados = []

for nombre, modelo in modelos.items():
    modelo.fit(X_train, y_train)
    y_pred = modelo.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    rmse = mean_squared_error(y_val, y_pred) ** 0.5
    r2 = r2_score(y_val, y_pred)
    resultados.append({
        "Modelo": nombre,
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2
    })

# Mostrar tabla ordenada
df_resultados = pd.DataFrame(resultados).sort_values(by='RMSE')
print("\n🏁 Ranking de modelos por menor RMSE:")
print(df_resultados.to_string(index=False))

# === Visualización de importancia de variables (XGBoost)
import matplotlib.pyplot as plt

modelo_xgb = XGBRegressor()
modelo_xgb.fit(X, y)
importancias = modelo_xgb.feature_importances_

df_importancia = pd.DataFrame({
    'Variable': X.columns,
    'Importancia': importancias
}).sort_values(by='Importancia', ascending=True)

plt.figure(figsize=(10, 6))
plt.barh(df_importancia['Variable'], df_importancia['Importancia'], color='teal')
plt.title(f"Importancia de variables - XGBoost - {sensor_id}")
plt.xlabel("Importancia")
plt.tight_layout()
plt.show()