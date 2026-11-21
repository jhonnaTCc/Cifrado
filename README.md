# Cifrados de Alabanza

Sitio web para compartir cifrados y partituras de canciones cristianas, pensado para pianistas que están empezando: carpetas por cantante o grupo, buscador, ficha de cada canción (tono, acordes, tempo, compás…), descarga del PDF y video guía de YouTube.

Es un sitio estático (HTML, CSS y JavaScript): no necesita servidor y se publica gratis con **GitHub Pages**.

## Ver el sitio en línea (GitHub Pages)

1. En el repositorio, entra a **Settings → Pages**.
2. En **Build and deployment → Source** elige **Deploy from a branch**.
3. En **Branch** elige `main` y la carpeta `/ (root)`, y pulsa **Save**.
4. Espera 1–2 minutos. La web queda en: `https://<tu-usuario>.github.io/<nombre-del-repo>/`

## Estructura

```
index.html            Página principal
css/estilos.css       Diseño (colores, modo oscuro, tipografía)
js/app.js             Funcionamiento (carpetas, buscador, fichas, panel)
data/config.js        Tu canal de YouTube, iglesia y correo
data/canciones.js     Lista de canciones
pdf/                  Los PDF de los cifrados
```

## Configurar tu canal

Edita `data/config.js` y cambia `@tucanal` y el enlace por los de tu canal de YouTube.
Deja `?sub_confirmation=1` al final del enlace: así YouTube muestra directamente la ventana para suscribirse.

## Agregar o editar canciones

**Opción A — con el panel (más fácil)**

1. Abre la web y entra a **Administrar** (al pie de la página, o `#/admin`).
2. Agrega o edita canciones. Al elegir el PDF, el panel te dice con qué nombre subirlo.
3. Pulsa **Descargar canciones.js**.
4. En GitHub: **Add file → Upload files**, sube `canciones.js` dentro de la carpeta `data/` y tus PDF dentro de `pdf/`. Confirma con **Commit changes**.

> El panel guarda los cambios solo en tu navegador hasta que subes `canciones.js` a GitHub. Los visitantes no pueden cambiar nada de tu repositorio.

**Opción B — editando el archivo**

Abre `data/canciones.js` en GitHub (ícono del lápiz), copia un bloque `{ ... }`, cambia los datos y guarda.

Campos de cada canción:

| Campo | Ejemplo | Para qué sirve |
|---|---|---|
| `id` | `"renuevame"` | Dirección de la ficha (sin tildes ni espacios) |
| `titulo` | `"Renuévame"` | Nombre de la canción |
| `artista` | `"Marcos Witt"` | Define la carpeta del cantante o grupo |
| `tono` | `"G"` | Tonalidad |
| `bpm` | `70` | Tempo |
| `compas` | `"4/4"` | Compás |
| `acordes` | `"G · C · D · Em"` | Acordes que se usan en la canción |
| `formato` | `"Cifrado"` o `"Partitura"` | Tipo de hoja |
| `nivel` | `"Básico"` | Dificultad |
| `paginas` | `1` | Páginas del PDF |
| `instrumentos` | `"Piano"` | Instrumentos |
| `video` | `"https://youtu.be/XXXXXXXXXXX"` | Video guía (se reproduce dentro de la ficha) |
| `pdf` | `"pdf/renuevame.pdf"` | Ruta del PDF dentro de la carpeta `pdf/` |

> Las canciones que vienen de ejemplo tienen tonos y tempos de muestra y aún no tienen PDF ni video: reemplázalas por las tuyas.

## Imagen de portada

Guarda la imagen como `img/portada.jpg` (horizontal 4:3, mínimo 1600 × 1200 px). Mientras no exista, la portada muestra un recuadro gris.
