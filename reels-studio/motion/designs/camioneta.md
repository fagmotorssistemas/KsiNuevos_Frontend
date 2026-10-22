# Diseño: camioneta

Para pickups, doble cabina, cabina simple y de trabajo (Hilux, Ranger, D-Max, L200, F-150, RAM, Amarok…). Es robusto, rudo y mecánico: todo se siente pesado.

## Base de todas las direcciones

- **Tipografías permitidas:** Russo One, Anton, Archivo Black y Teko. Las etiquetas pequeñas van en Montserrat 900, muy espaciada. Las letras de los SUV (Cinzel, Playfair, Michroma, Josefin) y las de premium nunca van aquí.
- **K-SI SCAN:** cada cosa que el asesor nombra o señala (volante, pantalla, palanca, cámara, balde) se marca. Los objetos chicos con `scanRing3D`; los grandes con esquinas y una línea de escaneo. Además, una etiqueta con número ("01 K-SI SCAN") y el nombre.
- **Cifras héroe en 3D:** `counter3D` para cilindrada, velocidades, ocupantes y kg de carga. Si el dato es de 4x4, tracción o aros, entra una llanta 3D al lado.
- **Llanta gigante:** `K3.tireWipe` una o dos veces por Reel, justo en un corte de cambio de bloque, con un `whoosh`.
- **Movimiento:** seco y con peso. Las cosas caen y se asientan, sin rebotes de caricatura.
- **Si es blindada:** se destaca con un sello o una etiqueta "BLINDADA".

## Direcciones creativas

Cada Reel usa UNA dirección; el guion dice entre cuáles puedes elegir. Dentro de ella decides el detalle, así no hay dos Reels iguales.

### oxido-ranger · Óxido Ranger
Calcado de la referencia de la Ford Ranger.
- **Color:** naranja `#FF8A1F`, óxido `#9C3E08`, ámbar `#FFB34A` y placas carbón `rgba(16,13,10,.84)` con borde naranja.
- **Títulos:** en 3D `finish: 'rust'` con Russo One.
- **Gancho:** la pregunta en Anton y UNA palabra oxidada en 3D que cae (`drop`).
- **Presentación:** una llanta 3D cruza por delante del modelo y cada letra se levanta a su paso (`flip` con `letterStart`).
- **Fichas:** con franja de peligro naranja y negra.
- **Cierre:** placa negra con huellas de llanta y una llanta 3D girando; debajo, "K-SI NUEVOS" en 3D.

### expedicion-nocturna · Expedición nocturna
La camioneta como un equipo de expedición de noche.
- **Color:** imagen más oscura y fría (degradados azul noche `#0B1A2A`), con acento ámbar de faros `#FFB000` y blanco hielo `#D8F1FF`.
- **Títulos:** 3D `finish: 'carbon'` con cantos ámbar (`edge: '#FFB000'`) y Teko.
- **HUD:** coordenadas GPS de Cuenca (2°54'S 79°00'W) que corren, altitud y rumbo de brújula. Líneas finas de interfaz que se dibujan, y un haz de luz que barre la pantalla como faros.
- **Escáneres:** en ámbar.
- **Transiciones:** destellos de faros y la llanta gigante.

### taller-industrial · Taller industrial
La camioneta en un taller de herramientas pesadas.
- **Color:** acero cepillado y gris grafito, con acento amarillo de seguridad `#FFC400` y negro.
- **Placas:** metálicas con remaches (degradados y puntos), tipografía Archivo Black en mayúsculas, estilo stencil.
- **Títulos:** 3D `finish: 'chrome'` que entran como una prensa hidráulica (`slam`), con chispas cortas en CSS al impacto.
- **Datos:** con regla o cinta métrica que se despliega.
- **Etiquetas:** de inspección ("INSPECCIONADO ✓ K-SI").
- **Transiciones:** golpe de cámara con sacudida corta y `hit`.

### mapa-topografico · Mapa topográfico
La camioneta como herramienta de aventura.
- **Color:** arena `#E8D3A8`, oliva `#6B7A3A` y naranja `#FF7A1A`.
- **Mapa:** curvas de nivel en SVG que se dibujan (stroke-dashoffset) detrás de los títulos. Cada característica es un "punto de ruta" unido al anterior por una línea punteada que avanza.
- **Más piezas:** rosa de los vientos y cifras como cotas de altura.
- **Títulos:** 3D `finish: 'rust'` o `'red'` con Russo One y entrada `flip`.
- **Cierre:** la ruta completa termina en "K-SI NUEVOS · Cuenca".
