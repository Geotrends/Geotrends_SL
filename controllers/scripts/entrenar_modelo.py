# === Importación de librerías ===
import os
import sys
import psycopg2             # Para conexión a PostgreSQL
import numpy as np          # Para manipulación de arrays
import pandas as pd         # Para manejo de DataFrames
import pickle               # Para guardar el modelo entrenado
import pytz                 # Para convertir zona horaria
from xgboost import XGBRegressor  # Modelo de regresión
from dotenv import load_dotenv   # Para leer variables de entorno

# === Cargar configuración desde el archivo .env ===
load_dotenv()

# === Leer parámetros de entrada desde línea de comandos ===
sensor_id = sys.argv[1]                          # nombre de la tabla del sensor
horas_historia = int(sys.argv[2]) if len(sys.argv) > 2 else 168  # horas a consultar (por defecto 1 semana)

# === Variables que sí existen en la base de datos ===
raw_vars = ['timestamp', 'laeq_slow', 'temperature', 'humidity']

# === Conexión a la base de datos PostgreSQL ===
conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', 5432),
    database=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD']
)
cursor = conn.cursor()

# === Consulta SQL: extraer registros recientes del sensor ===
query = f"""
    SELECT {', '.join(raw_vars)}
    FROM "{sensor_id}"
    WHERE timestamp >= NOW() - INTERVAL '{horas_historia} hours'
    ORDER BY timestamp ASC;
"""
cursor.execute(query)
filas = cursor.fetchall()
cursor.close()
conn.close()

# === Convertir resultados a DataFrame ===
df = pd.DataFrame(filas, columns=raw_vars)

# === Validación: mínimo de datos necesarios ===
if len(df) < 24:
    print("❌ No hay suficientes datos para entrenar.")
    exit(1)

# === Convertir timestamp UTC a hora local de Colombia ===
df['timestamp'] = df['timestamp'].dt.tz_convert('America/Bogota')

# === Calcular variables temporales derivadas ===
df['hora'] = df['timestamp'].dt.hour
df['hora_decimal'] = df['hora'] + df['timestamp'].dt.minute / 60
df['es_diurno'] = df['hora'].between(7, 20)              # entre 07:00 y 20:59
df['es_nocturno'] = ~df['es_diurno']
df['es_fin_semana'] = df['timestamp'].dt.weekday >= 5    # sábado o domingo
df['dia_semana'] = df['timestamp'].dt.weekday            # 0=lunes, ..., 6=domingo
df['mes'] = df['timestamp'].dt.month

# === Definir las variables finales para entrenamiento ===
final_vars = [
    'laeq_slow',         # Variable objetivo e histórica
    'temperature',       # Variable ambiental
    'humidity',          # Variable ambiental
    'hora',              # Hora entera (para patrones por franja horaria)
    'hora_decimal',      # Hora continua con minutos
    'es_diurno',         # Bandera: ¿es horario diurno?
    'es_nocturno',       # Bandera: ¿es horario nocturno?
    'es_fin_semana',     # Bandera: ¿es fin de semana?
    'dia_semana',        # Día de la semana
    'mes'                # Mes del año
]

# === Construir ventanas móviles para entrenamiento ===
ventana = 12  # número de registros anteriores (1 hora de datos si cada 5 minutos)
X = []
y = []

# Por cada punto, construir una entrada con los 12 pasos anteriores y su valor futuro
for i in range(ventana, len(df)):
    datos_pasados = df.iloc[i-ventana:i][final_vars].values.flatten()
    valor_futuro = df.iloc[i]['laeq_slow']  # objetivo: laeq_slow siguiente
    X.append(datos_pasados)
    y.append(valor_futuro)

# Convertir a arrays de numpy
X = np.array(X)
y = np.array(y)

# === Entrenar modelo de regresión con XGBoost ===
modelo = XGBRegressor()
modelo.fit(X, y)

# === Guardar modelo entrenado en archivo .pkl ===
os.makedirs('models', exist_ok=True)
with open(f'models/modelo_{sensor_id}.pkl', 'wb') as f:
    pickle.dump(modelo, f)

# === Mensaje de éxito ===
print(f"✅ Modelo entrenado y guardado: models/modelo_{sensor_id}.pkl")