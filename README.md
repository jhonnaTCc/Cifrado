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
index.html              Página principal
css/estilos.css         Diseño (colores, modo oscuro, celular)
js/app.js               Funcionamiento (carpetas, buscador, fichas, vista del PDF)
js/pdfjs/               pdf.js de Mozilla, para mostrar el contenido de los PDF
data/canciones.json     Lista de canciones
data/config.json        Canal de YouTube, iglesia y correo
pdf/                    Los PDF de los cifrados
img/portada.jpg         Imagen de la portada
.pages.yml              Configuración del panel de administración (Pages CMS)
```

## Panel de administración (Pages CMS)

El panel **no está dentro de la web**: se usa en [app.pagescms.org](https://app.pagescms.org) y solo puede entrar quien tenga acceso a este repositorio con su cuenta de GitHub.

**Primera vez (una sola vez):**

1. Entra a <https://app.pagescms.org> y pulsa **Sign in with GitHub**.
2. Si te lo pide, instala la app de Pages CMS en tu cuenta y dale acceso al repositorio **Cifrado**.
3. Abre el repositorio **Cifrado**. Verás dos secciones: **Canciones** y **Configuración del sitio**.

**Agregar una canción:**

1. En **Canciones**, pulsa **Add an entry** (agregar).
2. Escribe el título y el cantante o grupo (el cantante define la carpeta en la web).
3. En **Archivo PDF**, sube el PDF del cifrado.
4. Llena tono, acordes, tempo, compás, nivel y el enlace del video de YouTube.
5. Pulsa **Save**. En 1–2 minutos aparece en la web, con la vista del PDF.

Para **editar** una canción, ábrela, cambia lo que necesites y guarda. Para **cambiar el PDF**, sube el nuevo en el mismo campo.

En **Configuración del sitio** cambias el nombre y enlace de tu canal de YouTube, la iglesia y el correo.

> Funciona también desde el celular: entra a app.pagescms.org en el navegador.

## Vista del PDF

La web muestra el contenido real de cada PDF: la primera página en la tarjeta de la canción y todas las páginas (hasta 12) en su ficha. Si una canción todavía no tiene PDF, se ve una hoja de ejemplo con los acordes.

## Campos de cada canción

| Campo | Ejemplo | Para qué sirve |
|---|---|---|
| `titulo` | `"Renuévame"` | Nombre de la canción (también forma la dirección de su ficha) |
| `artista` | `"Marcos Witt"` | Define la carpeta del cantante o grupo |
| `pdf` | `"pdf/renuevame.pdf"` | Archivo del cifrado dentro de la carpeta `pdf/` |
| `tono` | `"G"` | Tonalidad |
| `acordes` | `"G · C · D · Em"` | Acordes que se usan en la canción |
| `bpm` | `70` | Tempo |
| `compas` | `"4/4"` | Compás |
| `formato` | `"Cifrado"` o `"Partitura"` | Tipo de hoja |
| `nivel` | `"Básico"` | Dificultad |
| `paginas` | `1` | Páginas del PDF |
| `instrumentos` | `"Piano"` | Instrumentos |
| `video` | `"https://youtu.be/XXXXXXXXXXX"` | Video guía (se reproduce dentro de la ficha) |

> Las canciones que vienen de ejemplo tienen tonos y tempos de muestra y aún no tienen PDF ni video: reemplázalas por las tuyas desde el panel.

## Imagen de portada

Está en `img/portada.jpg` (horizontal 4:3). Para cambiarla, sube otra imagen con el mismo nombre.
