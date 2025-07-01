import pickle
import matplotlib.pyplot as plt
import numpy as np

# Ruta del modelo entrenado
modelo_path = 'models/modelo_gtr_iot_002.pkl'

with open(modelo_path, 'rb') as f:
    modelo = pickle.load(f)

importancias = modelo.feature_importances_

# Etiquetas simuladas para 12 pasos y 5 variables por paso
base_vars = ['laeq_slow', 'temperature', 'humidity', 'hora_decimal', 'es_fin_semana']
labels = [f'{var}_{i+1}' for i in range(12) for var in base_vars]

# Ordenar por importancia
sorted_idx = np.argsort(importancias)[::-1]
labels_sorted = [labels[i] for i in sorted_idx]
importancias_sorted = importancias[sorted_idx]

# Graficar
plt.figure(figsize=(12, 6))
plt.bar(labels_sorted[:20], importancias_sorted[:20])
plt.xticks(rotation=90)
plt.title('Importancia de Variables - Modelo gtr_iot_002')
plt.ylabel('Importancia relativa')
plt.tight_layout()
plt.show()