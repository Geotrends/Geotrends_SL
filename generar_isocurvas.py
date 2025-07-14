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
    ST_X(geom) as lon,
    ST_Y(geom) as lat,
    sum_total as valor,
    geom
FROM mapa_dinamico.amva_puntos
WHERE municipio = 'LA ESTRELLA' AND sum_total IS NOT NULL;
"""
df = gpd.read_postgis(sql, conn, geom_col='geom')
conn.close()

# 2. Interpolación
lon = df['lon'].values
lat = df['lat'].values
val = df['valor'].values

import time

for resolution in range(100, 1100, 100):
    print(f"\n⏳ Resolución: {resolution}x{resolution}")
    start_time = time.time()

    grid_lon, grid_lat = np.mgrid[
        min(lon):max(lon):complex(resolution),
        min(lat):max(lat):complex(resolution)
    ]
    grid_val = griddata((lon, lat), val, (grid_lon, grid_lat), method='linear')

    if np.isnan(grid_val).all():
        print("⚠️ Interpolación fallida: todos los valores son NaN.")
        continue

    # Crear figura y contornos
    plt.figure(figsize=(10, 8))
    contornos = plt.contourf(grid_lon, grid_lat, grid_val, levels=color_values[1:], cmap=cmap, norm=norm)
    plt.colorbar(contornos, spacing='proportional', ticks=color_values[1:], label='LAeq (dB)')
    plt.title(f"Isocurvas de ruido - ENVIGADO ({resolution}x{resolution})")

    # Extraer contornos como GeoJSON
    features = []
    niveles = color_values[1:]
    for i, collection in enumerate(contornos.collections):
        for path in collection.get_paths():
            coords = path.vertices
            if len(coords) > 2:
                poly = Polygon(coords)
                if poly.is_valid:
                    features.append({
                        "type": "Feature",
                        "properties": {"valor": niveles[i]},
                        "geometry": mapping(poly)
                    })

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    # Guardar imagen y geojson
    img_path = f"isocurvas_envigado_{resolution}.png"
    geojson_path = f"isocurvas_envigado_{resolution}.geojson"

    plt.savefig(img_path)
    with open(geojson_path, "w") as f:
        json.dump(geojson, f)

    elapsed = time.time() - start_time
    print(f"✅ Resolución {resolution} completada en {elapsed:.2f} segundos. Contornos: {len(features)}. Imagen: {img_path}")