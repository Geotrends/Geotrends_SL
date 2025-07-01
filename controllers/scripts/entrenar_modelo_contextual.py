# === Entrenamiento de modelo contextual por sensor usando resumen horario ===

import os
import sys
import pickle
import psycopg2
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from xgboost import XGBRegressor

# === Cargar configuración desde archivo .env ===
load_dotenv()

# === Leer sensor desde argumentos de línea de comandos ===
sensor_id = sys.argv[1]

# === Conexión a la base de datos PostgreSQL ===
conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', 5432),
    database=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD']
)
cursor = conn.cursor()

# === Consulta del histórico del sensor desde la tabla resumen horario ===
query = f"""
    SELECT fecha AS timestamp, laeq_slow, temperature, humidity
    FROM resumen_iot.resumen_horario
    WHERE sensor_id = %s
    ORDER BY fecha ASC;
"""
cursor.execute(query, (sensor_id,))
rows = cursor.fetchall()
cursor.close()
conn.close()

# === Convertir los resultados a DataFrame ===
df = pd.DataFrame(rows, columns=['timestamp', 'laeq_slow', 'temperature', 'humidity'])
if df.empty or len(df) < 100:
    print("❌ No hay suficientes datos para entrenar el modelo contextual.")
    exit()

# === Convertir timestamp a datetime y zona horaria Colombia ===
df['timestamp'] = pd.to_datetime(df['timestamp'])
if df['timestamp'].dt.tz is None:
    df['timestamp'] = df['timestamp'].dt.tz_localize('UTC').dt.tz_convert('America/Bogota')
else:
    df['timestamp'] = df['timestamp'].dt.tz_convert('America/Bogota')

# === Calcular variables de contexto ===
df['hora'] = df['timestamp'].dt.hour
df['hora_decimal'] = df['hora'] + df['timestamp'].dt.minute / 60
df['es_diurno'] = df['hora'].between(7, 20)
df['es_nocturno'] = ~df['es_diurno']
df['es_fin_semana'] = df['timestamp'].dt.weekday >= 5
df['dia_semana'] = df['timestamp'].dt.weekday
df['mes'] = df['timestamp'].dt.month

# === Definir las variables de entrada y la salida ===
variables_entrada = [
    'temperature', 'humidity',
    'hora', 'hora_decimal',
    'es_diurno', 'es_nocturno',
    'es_fin_semana', 'dia_semana', 'mes'
]
variable_objetivo = 'laeq_slow'

# Asegurar que temperature y humidity sean valores numéricos
df['temperature'] = pd.to_numeric(df['temperature'], errors='coerce')
df['humidity'] = pd.to_numeric(df['humidity'], errors='coerce')

X = df[variables_entrada]
y = df[variable_objetivo]

# === Entrenar el modelo de regresión ===
modelo = XGBRegressor()
modelo.fit(X, y)

# === Guardar el modelo entrenado en archivo .pkl ===
os.makedirs('models', exist_ok=True)
modelo_path = f'models/modelo_contextual_{sensor_id}.pkl'
with open(modelo_path, 'wb') as f:
    pickle.dump(modelo, f)

print(f"✅ Modelo contextual entrenado y guardado en: {modelo_path}")