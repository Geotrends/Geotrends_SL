import json
import psycopg2
from psycopg2.extras import execute_values

# Conexión a la base de datos
conn = psycopg2.connect(
    dbname="SL_Geotrends",
    user="dbmasteruser",
    password="3wW0n]om^<jY{A9[e7M^MLL_U_G&Kp8G",
    host="ls-801a010ba211ba2e70a772ea9be742cc63bc77c8.c3igyeqqodiz.us-east-1.rds.amazonaws.com",
    port="5432"
)

# Leer el archivo GeoJSON
with open("public/data/AMVA.json", "r", encoding="utf-8") as f:
    geojson = json.load(f)

features = geojson["features"]

# Convertir en tuplas para insertar
def transformar_features(features):
    datos = []
    for f in features:
        # Verificar que la geometría y coordenadas existan
        if not f.get("geometry") or not f["geometry"].get("coordinates"):
            print(f"⚠️ Registro omitido por geometría nula: {json.dumps(f, ensure_ascii=False)}")
            continue

        props = f["properties"]
        coords = f["geometry"]["coordinates"]
        geom = f"SRID=4326;POINT({coords[0]} {coords[1]})"
        datos.append((
            int(props["id_rec"]),
            props["principal"],
            props["autopista"],
            props["servicio"],
            props["menor"],
            props["colectora"],
            props["sumTotal"],
            geom
        ))
    return datos

# Insertar por segmentos
def insertar_segmentado(data, batch_size=300):
    cursor = conn.cursor()
    for i in range(0, len(data), batch_size):
        segmento = data[i:i+batch_size]
        print(f"🔄 Insertando puntos {i+1} a {i+len(segmento)} de {len(data)}")
        try:
            execute_values(
                cursor,
                """
                INSERT INTO mapa_dinamico.amva_puntos
                (id_rec, principal, autopista, servicio, menor, colectora, sum_total, geom)
                VALUES %s
                """,
                segmento,
                template="(%s, %s, %s, %s, %s, %s, %s, ST_GeomFromText(%s))"
            )
            conn.commit()
            print(f"✅ Segmento {i}-{i+len(segmento)} insertado.")
            print(f"✅ Segmento completado: insertados {len(segmento)} registros.")
        except Exception as e:
            print(f"❌ Error en segmento {i}: {e}")
            conn.rollback()
    cursor.close()

# Ejecutar
datos = transformar_features(features)

# Vaciar la tabla antes de insertar nuevos registros
cursor = conn.cursor()
cursor.execute("TRUNCATE TABLE mapa_dinamico.amva_puntos RESTART IDENTITY CASCADE;")
conn.commit()
cursor.close()

insertar_segmentado(datos, batch_size=300)

conn.close()