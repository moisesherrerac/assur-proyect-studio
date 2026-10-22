# Assur Proyect Studio 📐

> Estudio profesional de diseño técnico y convertidor de planos de seguridad electrónica, telecomunicaciones y videovigilancia estilo AutoCAD. Código abierto, con biblioteca privada de planos en GitHub.

---

## 🌟 Características Principales

- **Lienzo Técnico Interactivo (CAD 2D):**
  - Espacio de trabajo de alta precisión con rejilla configurable y sistema *Snap to Grid*.
  - Modos de tema visual: **CAD Oscuro**, **Papel Blueprint** y **Lámina Blanca**.
  - Orientación y ajuste libre de rotación para la **Flecha de Norte** magnético/geográfico.
  - Reglas milimétricas dinámicas en ejes X e Y, encuadre automático y zoom fluido.

- **Ingeniería de Seguridad & Telecomunicaciones:**
  - **Cámaras de Seguridad:** Tipos Domo, Bullet, PTZ, Térmica, 360°/Ojo de Pez con conos de visualización interactivos (FOV angular, distancia de identificación/reconocimiento, detección DORI).
  - **Enlaces de Radio & WiFi:** Antenas sectoriales, omnidireccionales, enlaces punto a punto (PTP) y directivas con cálculo de cobertura.
  - **Detección Perimetral:** Sensores infrarrojos fotoeléctricos, barreras de microondas y cercos electrificados.
  - **Cableado Estructurado:** Trazado de canalizaciones para fibra óptica, cable UTP/STP, tubería conduit y bandejas porta-cables.

- **Herramientas de Edición Profesional:**
  - **Historial Completo de Deshacer / Rehacer (Undo / Redo):** Acceso rápido con botones en la barra de herramientas y atajos estándar de teclado (`Ctrl + Z` / `Ctrl + Y`).
  - **Distribución Ergonómica:** Barra lateral izquierda para selección rápida de elementos y panel de ingeniería flotante/plegable para propiedades de dispositivos.
  - **Cálculo Automático de Almacenamiento & Red:** Estimación en tiempo real de ancho de banda (Mbps) y capacidad de almacenamiento en disco (TB) según resolución, FPS, códec (H.264/H.265) y días de retención.
  - **Exportación en Alta Definición:** Generación de planos en PDF vectorial con membrete profesional (Title Block), fecha, escala y especificaciones técnicas.
  - **Mis planos:** Biblioteca privada en GitHub con carpetas, búsqueda, guardado manual y archivo reversible; copias editables `.cadmap`.

---

## Acceso y biblioteca privada

La app publicada requiere una clave de acceso detallada de GitHub (fine-grained personal access token). El código de GitHub Pages sigue siendo público; la autorización real para leer o escribir planos la aplica GitHub sobre el repositorio **privado** `moisesherrerac/assur-planos-privados`. La pantalla de acceso no convierte el código público en privado.

1. Para generar o renovar el acceso, abre [las claves detalladas de GitHub](https://github.com/settings/personal-access-tokens). La pantalla de inicio de la app solo solicita la clave existente.
2. Selecciona **Only select repositories**, únicamente **assur-planos-privados**.
3. En **Repository permissions**, deja **Contents: Read and write**, y establece una fecha de vencimiento. GitHub añade Metadata de lectura automáticamente.
4. Genera la clave tú mismo, consérvala en tu gestor de contraseñas y pégala solo en la pantalla de la app. No la envíes por chat ni la agregues al repositorio.
5. En **Mis planos**, indica un nombre y una carpeta y pulsa **Guardar nuevo plano** o **Guardar cambios**. Desde otro computador, entra con la clave y abre el plano desde esa biblioteca.

La clave se mantiene solo en memoria de la pestaña, nunca en `localStorage`, `sessionStorage`, archivos o registros. Recargar requiere iniciar sesión otra vez. Tras 30 minutos sin interacción la sesión se bloquea. **Vista y opciones → Cerrar sesión** elimina la clave y el borrador temporal de esta pestaña. Puedes revocar o renovar la clave desde GitHub.

Los cambios se suben únicamente al pulsar Guardar en Mis planos. El borrador de trabajo usa `sessionStorage`, es temporal, queda en ese navegador y puede estar incompleto si las imágenes exceden su cuota. Guarda en GitHub antes de cerrar y conserva una copia `.cadmap` cuando sea necesario. El respaldo local anterior se mantiene intacto y puede recuperarse desde Mis planos, sin subirlo automáticamente.

La biblioteca admite planos de hasta **20 MB**. Archivar conserva el archivo y el historial; se recupera con **Ver archivados → Restaurar**. Al detectar cambios desde otro equipo, la app impide sobrescribir y permite abrir la versión actual o guardar una copia. El índice y el plano se publican juntos en un solo commit, sin forzar cambios de rama. No hay servidor adicional ni clave de Gemini para esta función.

## Publicación y uso

La versión de GitHub Pages ejecuta el editor CAD, el guardado de proyectos y la exportación PDF en el navegador. No necesita una clave de Gemini. Sin clave, el botón de auditoría produce un cálculo local orientativo, no una respuesta de IA.

El uso de una API de IA es opcional y depende de las condiciones y cuotas del proveedor. No publiques claves en el código ni en variables VITE_: se incluyen en los archivos visibles del navegador. Para una integración pública con IA se requiere un servicio intermedio que proteja las credenciales.

## 🚀 Cómo publicar este proyecto en GitHub (Paso a Paso)

Si deseas subir este proyecto a tu propia cuenta de GitHub, sigue estos sencillos pasos desde tu terminal o consola:

### 1. Crear el repositorio en GitHub
1. Inicia sesión en [GitHub](https://github.com).
2. Haz clic en el botón verde **"New"** o entra a [github.com/new](https://github.com/new).
3. Escribe como nombre del repositorio: `assur-proyect-studio`.
4. Elige si deseas que sea **Público** (recomendado para uso gratuito y GitHub Pages) o Privado.
5. Haz clic en **"Create repository"** (sin marcar "Add README" para no generar conflictos).

### 2. Conectar y subir el código
En la terminal de tu máquina, dentro de la carpeta del proyecto, ejecuta:

```bash
# 1. Inicializar git (si aún no está)
git init

# 2. Agregar todos los archivos
git add .

# 3. Crear el primer commit
git commit -m "feat: Lanzamiento inicial de Assur Proyect Studio"

# 4. Establecer la rama principal como 'main'
git branch -M main

# 5. Vincular con tu repositorio de GitHub (reemplaza TU_USUARIO por tu nombre de usuario)
git remote add origin https://github.com/TU_USUARIO/assur-proyect-studio.git

# 6. Subir el código a GitHub
git push -u origin main
```

---

## 🌐 Cómo activar el sitio web gratis en GitHub Pages

Para que cualquier persona pueda usar **Assur Proyect Studio** en internet gratis desde su navegador mediante GitHub Pages:

### Opción A: Despliegue automático con GitHub Actions (Recomendado)
1. En tu repositorio de GitHub, ve a la pestaña **Settings** > **Pages**.
2. En **Build and deployment** > **Source**, selecciona **GitHub Actions**.
3. Elige la plantilla de **Static HTML / Vite** o crea el archivo `.github/workflows/deploy.yml` incluido en este proyecto.
4. ¡Listo! Tu aplicación estará publicada cuando el flujo de despliegue termine correctamente en:
   `https://moisesherrerac.github.io/assur-proyect-studio/`

### Opción B: Despliegue en Vercel (1 Clic)
1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Selecciona **"Add New Project"** e importa tu repositorio `assur-proyect-studio`.
3. Vercel detectará Vite automáticamente. Haz clic en **Deploy**.
4. En 30 segundos tendrás una URL pública gratuita con SSL (ej: `assur-proyect-studio.vercel.app`).

---

## 💻 Desarrollo Local

Para correr y modificar la aplicación en tu computadora localmente:

### Requisitos previos
- [Node.js](https://nodejs.org/) (versión 22.12 o superior).
- Gestor de paquetes `npm`, `pnpm` o `bun`.

### Instalación y ejecución
```bash
# Instalar dependencias
npm ci

# Iniciar servidor de desarrollo local
npm run dev

# Compilar para producción (carpeta dist/)
npm run build

# Previsualizar la versión de producción
npm run preview
```

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT** - eres libre de usarlo, modificarlo, distribuirlo y utilizarlo de forma comercial o personal de manera 100% gratuita. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## Mejoras prácticas e informe complementario (v2)

- **Informe de equipos:** abre el botón de la cabecera. Cada elemento conserva el código del plano y una glosa editable. Puedes descargar un PDF A4 con resumen y detalle, o un CSV compatible con Excel. La glosa queda guardada en el .cadmap y en el respaldo local.
- **Cantidades:** los equipos se cuentan en unidades; cercos y canalizaciones se listan como tramos hasta calibrar el plano. Después se muestra la longitud de la ruta dibujada en metros, sin reservas, holguras ni subidas. Se incluyen todas las capas, incluso ocultas. Corrige los códigos vacíos o repetidos antes de exportar.
- **Calibración:** elige Medir o Calibrar, marca dos puntos de distancia conocida e ingresa los metros reales. El factor se conserva con el proyecto. La escala de impresión permanece S/E y debe verificarse por separado.
- **Imágenes:** ajustar filtros conserva los equipos. Cambiar la imagen solicita confirmación por posible desalineación y quita la calibración anterior. Cancelar no aplica los cambios. La detección opcional de construcciones no agrega figuras genéricas si no encuentra contornos.
- **Guardado:** Guardar copia descarga el editable .cadmap. El respaldo automático corresponde solo al navegador actual y avisa si es parcial o si no pudo guardarse. Abrir otro archivo valida sus datos y reemplaza el proyecto completo.
- **Entrega:** Plano PDF permite A3/A4. El informe de equipos es un PDF separado. Completa proyecto, cliente, revisión y responsable en Viñeta antes de entregar documentos.
- **Resumen técnico:** cálculo local con supuestos editables de tasa de bits, retención, horas y consumo PoE; no verifica cobertura ni sustituye las fichas de los equipos.

Validación del proyecto: `npm run lint`, `npm test` y `npm run build`. GitHub Actions ejecuta las tres comprobaciones antes de publicar.


## Simbología y cercos

La simbología de la lámina se construye solo con elementos incorporados: no muestra categorías con cantidad cero. Se actualiza al añadir, eliminar o cambiar equipos y trazados.

La barra ofrece tres cercos: **C. madera** (café, trazo discontinuo con círculos), **C. metálico** (azul, trazo de punto y raya con cuadrados) y **C. muro** (violeta, trazo continuo con marcas de ladrillo). Marca los puntos y pulsa Enter para terminar. Selecciona un cerco y cambia **Tipo de soporte** en Propiedades para reclasificarlo. El tipo se conserva en GitHub y en las copias `.cadmap`, y aparece diferenciado en el informe. Los cercos de versiones anteriores conservan sus datos y quedan con soporte sin especificar hasta clasificarlos.


Al seleccionar un cerco, **Propiedades** permite cambiar el grosor de línea (1 a 10), el código y un texto adicional de hasta 160 caracteres. La etiqueta admite tamaño ajustable, puede mostrarse u ocultarse y se arrastra con **Puntero** sin mover el cerco. **Restablecer posición del texto** devuelve su ubicación inicial. Los avisos eléctricos también pueden mostrarse u ocultarse. Estos ajustes se conservan en el proyecto y en la lámina exportada.


## Ubicación precisa de elementos

El editor inicia en **Posición libre**: cercos, equipos, textos y vértices se colocan en la posición elegida, sin saltar entre cuadros. El botón inferior alterna entre posición libre y ajuste a cuadrícula; también se cambia con **S**. Si activas el ajuste, el selector contiguo permite pasos de **1, 2, 5, 10, 20, 35 o 70 unidades**. La cuadrícula visible se adapta al zoom para mantener legibilidad y no limita la precisión de colocación. El cambio no desplaza elementos ya guardados.

### Notas del cajetín

El editor de notas permite negrita, cursiva y subrayado mediante selección de texto o al escribir. Conserva los saltos de línea y el formato en las copias editables y en Mis planos. Los proyectos anteriores con notas de texto simple siguen siendo compatibles.

El cajetín distribuye todos los párrafos y ajusta la tipografía hasta un mínimo legible. Si el texto excede el espacio disponible, muestra «CONTINÚA EN ANEXO DE NOTAS» y la exportación añade las hojas necesarias al mismo PDF A3 o A4. El anexo conserva el formato y la referencia de lámina y revisión. No se elimina texto ni se limita el número de párrafos.
