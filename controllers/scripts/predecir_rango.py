import sys
import os
import json
import psycopg2
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

def registrar_log(mensaje):
    os.makedirs("logs", exist_ok=True)
    with open("logs/prediccion.log", "a") as log:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log.write(f"[{timestamp}] {mensaje}\n")

# === Entradas desde argumentos ===
sensor_id, fecha_desde_str, fecha_hasta_str = sys.argv[1:4]
fecha_desde = datetime.strptime(fecha_desde_str, '%Y-%m-%d')
fecha_hasta = datetime.strptime(fecha_hasta_str, '%Y-%m-%d')

# === Cargar entorno ===
load_dotenv()

# === Conexión a la base de datos ===
conn = psycopg2.connect(
    host=os.environ['DB2_HOST'],
    port=os.environ.get('DB2_PORT', 5432),
    database=os.environ['DB2_DATABASE'],
    user=os.environ['DB2_USER'],
    password=os.environ['DB2_PASSWORD']
)
cursor = conn.cursor()
cursor.execute("""
    SELECT fecha AS timestamp, laeq_slow
    FROM resumen_iot.resumen_horario
    WHERE sensor_id = %s
    ORDER BY fecha;
""", (sensor_id,))
rows = cursor.fetchall()
cursor.close()
conn.close()

# === Preparar DataFrame
df = pd.DataFrame(rows, columns=['timestamp', 'laeq_slow'])
df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize('UTC').dt.tz_convert('America/Bogota')
df['hora'] = df['timestamp'].dt.hour
df['es_diurno'] = df['hora'].between(7, 20).astype(int)
df['es_fin_semana'] = (df['timestamp'].dt.weekday >= 5).astype(int)
df['dia_semana'] = df['timestamp'].dt.weekday
df['mes'] = df['timestamp'].dt.month

columnas = ['hora', 'es_diurno', 'es_fin_semana', 'dia_semana', 'mes']
df = df.dropna()
for col in columnas:
    df[col] = pd.to_numeric(df[col], errors='coerce')

X = df[columnas]
y = df['laeq_slow']

# === Cargar o entrenar modelo
modelo_path = f"models/modelo_{sensor_id}.pkl"

reentrenar = False
if os.path.exists(modelo_path):
    fecha_modificacion = datetime.fromtimestamp(os.path.getmtime(modelo_path))
    if datetime.now() - fecha_modificacion > timedelta(days=7):
        reentrenar = True

if os.path.exists(modelo_path) and not reentrenar:
    modelo = joblib.load(modelo_path)
    print(f"📦 Modelo cargado desde {modelo_path}", file=sys.stderr)
    registrar_log(f"Modelo cargado: {modelo_path}")
else:
    modelo = XGBRegressor()
    modelo.fit(X, y)
    os.makedirs("models", exist_ok=True)
    joblib.dump(modelo, modelo_path)
    print(f"✅ Modelo entrenado y guardado en {modelo_path}", file=sys.stderr)
    registrar_log(f"Modelo reentrenado y guardado: {modelo_path}")

# === Evaluar rendimiento
y_pred_hist = modelo.predict(X)
rmse = mean_squared_error(y, y_pred_hist) ** 0.5
mae = mean_absolute_error(y, y_pred_hist)
r2 = r2_score(y, y_pred_hist)


# === Generar datos por hora entre fechas
fechas = pd.date_range(start=fecha_desde, end=fecha_hasta + timedelta(days=1), freq='H')[:-1]
datos = []

for f in fechas:
    hora = f.hour
    dia_semana = f.weekday()
    es_diurno = 7 <= hora <= 20
    es_fin_semana = dia_semana >= 5
    mes = f.month

    datos.append([
        hora,
        int(es_diurno), int(es_fin_semana),
        dia_semana, mes
    ])

df_pred_input = pd.DataFrame(datos, columns=columnas)
for col in columnas:
    df_pred_input[col] = pd.to_numeric(df_pred_input[col], errors='coerce')

predicciones = modelo.predict(df_pred_input)

resultado = {
    "sensor_id": sensor_id,
    "modelo": "XGBoost",
    "metrica": {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": round(r2, 3)
    },
    "predicciones": [
        {"timestamp": f.isoformat(), "laeq_slow": round(float(p), 2)}
        for f, p in zip(fechas, predicciones)
    ]
}

print(json.dumps(resultado, ensure_ascii=False))