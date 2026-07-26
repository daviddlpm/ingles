# El Reino de Inglés: Aventura Medieval 🛡️👑

Un juego interactivo y educativo (Aventura Gráfica 3D) diseñado para que niños de 6 a 7 años aprendan vocabulario y pronunciación en inglés de forma divertida.

## 🌟 Características Principales

- **Entorno 3D Interactivo**: Motor gráfico basado en Three.js con iluminación y sombras en tiempo real.
- **Motor de Voz y Pronunciación**: 
  - Utiliza `webkitSpeechRecognition` para evaluar la pronunciación del niño a través del micrófono.
  - Utiliza `SpeechSynthesis` para guiar al niño con la pronunciación nativa.
- **20 Misiones Narrativas**: Más de 200 ejercicios organizados por temáticas (colores, números, animales, casa, colegio, etc.).
- **Progresión y Recompensas**: 
  - Selección de Héroe (Caballero, Princesa, Mago, Dragón).
  - Cofre de recompensa diario.
  - Colección de insignias (Stickers) mágicas desbloqueables.
- **PWA Ready**: Funciona offline en dispositivos móviles y puede instalarse como una aplicación nativa.
- **Optimizado para Móviles**: Ajustes de renderizado dinámico para garantizar 60 FPS y cuidar la batería en Android e iOS.

## 🚀 Cómo Jugar (Despliegue en GitHub Pages)

Este juego está diseñado para ejecutarse sin necesidad de un servidor backend, directamente desde **GitHub Pages**.

1. Haz un fork o sube estos archivos a un repositorio de GitHub.
2. Ve a la pestaña **Settings** > **Pages**.
3. Selecciona la rama `main` y guarda.
4. Entra a tu enlace (ej. `https://tu-usuario.github.io/reino-ingles/`) desde un móvil Android o PC.
5. **¡Disfruta del juego!**

> **Nota de compatibilidad**: El micrófono requiere que la página se cargue bajo un entorno seguro (`https://`), lo cual GitHub Pages provee por defecto.

## 🛠️ Tecnologías Utilizadas

- **HTML5 / CSS3 / Vanilla JavaScript**
- **Three.js** (Renderizado WebGL 3D)
- **Web Speech API** (Micrófono y Síntesis de voz)
- **Service Workers** (PWA y modo Offline)

## 📄 Licencia

Este proyecto educativo es de código abierto bajo la Licencia MIT.
