# 🧠 Estrategia de Plataforma Social Listening - Campaña Ranchera

Este documento describe la estructura de módulos, gráficos, y storytelling basado en los datos disponibles en la base de datos del proyecto. Se enfoca en analizar la comunidad joven desde nodos semilla universitarios y compararlos con los seguidores actuales de Ranchera en Instagram.

---

## 🎯 Objetivo principal

Entender quiénes conforman la audiencia joven en Instagram (extraídos desde comunidades universitarias) y cómo construir estrategias para conectar con ellos a través de la marca Ranchera.

---

## 🧱 Estructura de módulos y visualizaciones

### 1. `index.html` - **Dashboard General**
 - ✅ Tarjetas resumen:
   - Total de perfiles analizados
   - Total de publicaciones detectadas
   - Total de comentarios recopilados
   - Sentimiento positivo (temporalmente sin análisis avanzado)
 - ⏳ Próximo paso:
   - Gráfico tipo torta o barras para publicaciones por comunidad semilla
   - Línea de tiempo de publicaciones

---

### 2. `perfiles.html` - **Radiografía de usuarios jóvenes**
 - ✅ Datos ya disponibles:
   - username, followers, is_business, biography, emojis usados
 - 📊 Visualizaciones sugeridas:
   - Tabla interactiva con filtros
   - Nube de palabras en biografías
   - Distribución de seguidores (barras)
   - Cards con resumen de perfil

---

### 3. `comentarios.html` - **Lo que dicen**
 - ✅ Datos disponibles:
   - Comentarios por post
   - Usuario que comenta y foto
 - 📊 Visualizaciones sugeridas:
   - Tabla con filtros por post/perfil
   - Word cloud de términos frecuentes
   - Cards con comentarios destacados

---

### 4. `publicaciones.html` - **Contenido y estética**
 - ✅ Datos disponibles:
   - Tipo de publicación, caption, hashtags, likes, imagen
 - 📊 Visualizaciones sugeridas:
   - Galería visual de ejemplos
   - Distribución de tipos de contenido (foto, video)
   - Engagement por hora o día

---

### 5. `insights.html` - **Descubrimientos generales**
 - 📊 Visualizaciones sugeridas:
   - Comparativa entre nodos semilla y seguidores actuales de Ranchera
   - Radar chart con atributos de perfil por comunidad
   - Evolución temporal del contenido

---

## 🔎 Datos clave en la base de datos

- `perfiles_instagram`: Información del perfil (seguidores, biografía, tipo de cuenta)
- `instagram_posts`: Publicaciones por usuario
- `comentarios_instagram`: Comentarios sobre publicaciones
- `analisis_instagram_posts`: Análisis adicional (e.g. sentimiento, emojis, keywords)

---

## 🗺️ Storytelling sugerido

1. **Introducción**
   - Ranchera busca conectar con nuevas audiencias jóvenes.

2. **Exploración**
   - Perfiles, publicaciones, comentarios de nodos semilla.

3. **Contraste**
   - Comparación entre seguidores actuales vs. comunidad universitaria.

4. **Hallazgos**
   - Patrones, intereses comunes, estilos de comunicación.

5. **Estrategias**
   - Contenidos recomendados, tono de voz, posibles embajadores.

---

## 🧩 Siguientes pasos recomendados

- [ ] Agregar gráfico de pastel o barras al dashboard general
- [ ] Crear `graficos.js` con funciones reutilizables para ECharts
- [ ] Iniciar vista de perfiles con su tabla y tarjetas
- [ ] Agregar nube de palabras (biografías, captions, comentarios)
- [ ] Crear mockup de segmentos o perfiles tipo
- [ ] Definir visual de comparación: nodos semilla vs. seguidores Ranchera

---


Perfecto. Ya teniendo una base sólida con los perfiles semilla y sus indicadores, ahora que se busca expandir el análisis hacia sus seguidores y su contenido, se puede diseñar un módulo de “Ecosistema de Influencia” que permita a Ranchera tomar decisiones estratégicas. Te propongo esta estructura modular, dividida en cuatro bloques clave con funcionalidades específicas:

⸻

🧩 Módulo: Ecosistema de Perfiles Semilla

1. Análisis de Seguidores

Objetivo: Entender quiénes siguen a las cuentas semilla y su potencial para amplificar mensajes.
	•	🔍 Indicadores clave:
	•	Total de seguidores por perfil semilla.
	•	Promedio de seguidores de los seguidores (alcance potencial).
	•	Porcentaje de seguidores que siguen a varias semillas (seguidores compartidos).
	•	Análisis de cuentas falsas o bots (si se desea ampliar).
	•	📊 Visualizaciones sugeridas:
	•	Heatmap de seguidores compartidos entre semillas.
	•	Scatter plot de seguidores (followers vs. posts).
	•	Red de conexiones (semillas → seguidores).

2. Análisis de Biografías de Seguidores

Objetivo: Detectar intereses, profesiones, comunidad estudiantil, etc.
	•	☁️ Wordcloud dinámica de biografías de los seguidores.
	•	📋 Clasificación automática por categorías (ej: “música”, “estudiante”, “fitness”).

3. Análisis de Posts de los Seguidores

Objetivo: Conocer los temas, hábitos y tipos de contenido de la audiencia.
	•	📈 Indicadores:
	•	Frecuencia de publicación.
	•	Uso de hashtags.
	•	Temas comunes (por NLP).
	•	Tipo de contenido (foto, video, carrusel).
	•	📊 Visualizaciones:
	•	Series de tiempo.
	•	Top hashtags.
	•	Clasificación por categorías o emociones.

4. Análisis de Comentarios

Objetivo: Evaluar la interacción real, tono y sentimiento frente a las publicaciones.
	•	💬 Sentimiento general por perfil semilla.
	•	💡 Palabras clave más usadas.
	•	🔥 Comentarios con más likes o engagement.
	•	🎯 Comentarios relacionados con “comida”, “marcas”, “vida estudiantil”, etc.

⸻

🔧 ¿Cómo lo implementamos?

🔍 Backend (API):
	•	/api/ranchera/perfil/:username/seguidores
	•	/api/ranchera/perfil/:username/posts
	•	/api/ranchera/perfil/:username/comentarios
	•	/api/ranchera/perfil/:username/analisis-general

🎛️ Frontend:
	•	Página /html/ranchera/perfiles.html
	•	Vista tipo dashboard para cada perfil semilla, con tabs o secciones:
	•	Resumen del perfil
	•	Seguidores
	•	Posts
	•	Comentarios

⸻

🚀 Valor estratégico para Ranchera

Con esta arquitectura:
	•	Se identifica qué nodos de usuarios tienen mayor influencia.
	•	Se pueden detectar perfiles emergentes o embajadores potenciales.
	•	Se modela la forma en que la comunidad universitaria se comunica.
	•	Se pueden testear mensajes de campaña basados en lenguaje natural de los seguidores.

⸻
