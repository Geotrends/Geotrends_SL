import sys

municipio_filtrado = sys.argv[1] if len(sys.argv) > 1 else None
if not municipio_filtrado:
    print("❌ Debes especificar el nombre del municipio como argumento.")
    sys.exit(1)

import psycopg2
import geopandas as gpd
import numpy as np
from scipy.interpolate import griddata
from shapely.geometry import Polygon, mapping
import json
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Evita error en servidores sin GUI

import matplotlib.colors as mcolors

# Definir la escala de colores equivalente al frontend
color_values = [-99, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90]
color_hex = [
    '#ffffff00',  # transparente
    '#a1d99b',
    '#31a354',
    '#006d2c',
    '#fee391',
    '#fec44f',
    '#fe9929',
    '#ef3b2c',
    '#f768a1',
    '#74c476',
    '#0570b0',
    '#0570b0',
    '#0570b0'
]

# Personalizar la escala de colores y normalización
cmap = mcolors.ListedColormap(color_hex[1:])
norm = mcolors.BoundaryNorm(color_values[1:], cmap.N)

# 1. Conexión a PostgreSQL
conn = psycopg2.connect(
     dbname="SL_Geotrends",
    user="dbmasteruser",
    password="3wW0n]om^<jY{A9[e7M^MLL_U_G&Kp8G",
    host="ls-801a010ba211ba2e70a772ea9be742cc63bc77c8.c3igyeqqodiz.us-east-1.rds.amazonaws.com",
    port="5432"
)
sql = """
    SELECT
        ST_X(geom) AS lon,
        ST_Y(geom) AS lat,
        sum_total AS valor
    FROM mapa_dinamico.amva_puntos
    WHERE municipio = %s AND geom IS NOT NULL AND sum_total IS NOT NULL;
"""
cursor = conn.cursor()
cursor.execute(sql, (municipio_filtrado,))
rows = cursor.fetchall()
cursor.close()
conn.close()

if not rows:
    print("❌ No se encontraron datos para el municipio proporcionado.")
    sys.exit(1)

import pandas as pd
df = pd.DataFrame(rows, columns=["lon", "lat", "valor"])
lon = df['lon'].values
lat = df['lat'].values
val = df['valor'].values

import time

resolution = 600
print(f"\n⏳ Generando isocurvas con resolución: {resolution}x{resolution}")
start_time = time.time()

grid_lon, grid_lat = np.mgrid[
    min(lon):max(lon):complex(resolution),
    min(lat):max(lat):complex(resolution)
]
grid_val = griddata((lon, lat), val, (grid_lon, grid_lat), method='linear')

# 🧪 Verificar datos válidos en la malla interpolada
print(f"🧪 Grid interpolado contiene {np.count_nonzero(~np.isnan(grid_val))} valores válidos")
if np.count_nonzero(~np.isnan(grid_val)) == 0:
    print("⚠️ No hay datos válidos en la malla interpolada. Verifica los puntos de entrada.")
    exit()

if np.isnan(grid_val).all():
    print("⚠️ Interpolación fallida: todos los valores son NaN.")
    exit()

contornos = plt.contourf(grid_lon, grid_lat, grid_val, levels=color_values[1:], cmap=cmap, norm=norm)

# Verificar si se generaron contornos
if len(contornos.collections) == 0:
    print("⚠️ No se generaron contornos. Revisa los niveles o los datos interpolados.")
else:
    print(f"✅ Se generaron {len(contornos.collections)} contornos.")

# Extraer contornos como GeoJSON
features = []
for i, collection in reversed(list(enumerate(contornos.collections))):
    for path in collection.get_paths():
        try:
            poly = path.to_polygons()
            for seg in poly:
                if len(seg) >= 3:
                    polygon = Polygon(seg)
                    if polygon.is_valid:
                        feature = {
                            "type": "Feature",
                            "geometry": mapping(polygon),
                            "properties": {"valor": color_values[i]}
                        }
                        features.append(feature)
        except Exception:
            continue
print(f"🟢 Polígonos válidos extraídos: {len(features)}")

geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Imprimir el número de features generadas
print(f"📦 Total features generadas: {len(geojson['features'])}")

# Guardar solo el archivo GeoJSON
geojson_path = f"scripts/isocurvas_{municipio_filtrado}.geojson"
with open(geojson_path, "w") as f:
    json.dump(geojson, f)

elapsed = time.time() - start_time
print(f"✅ GeoJSON generado en {elapsed:.2f} segundos. Contornos: {len(features)}.")    