# Diseño: camioneta (offroad)

Para pickups, doble cabina y cabina simple. Robusto, rudo, de taller y de campo, como la referencia de la Ford Ranger. Todo se siente pesado y mecánico.

## Paleta

- Naranja `#FF8A1F` (acento), óxido `#9C3E08`, ámbar `#FFB34A`.
- Negro carbón `#121212` en placas: `rgba(16,13,10,.84)` con borde naranja de 3 px.

## Tipografía

- **Títulos y cifras:** Russo One. En 3D va con `font: 'russo'` y `finish: 'rust'`.
- **Frases del gancho y subtítulos:** Anton, en mayúsculas y blanco, con la palabra clave en naranja.
- **Etiquetas pequeñas:** Montserrat 900, muy espaciada (letter-spacing 0.3–0.5em).

## Piezas que la hacen camioneta

- **Gancho:** la pregunta al nicho en Anton y, encima, UNA palabra en metal oxidado 3D que cae letra por letra ("IMPONENTE", "RUDA", "BESTIA").
- **Presentación:**
  - Una llanta 3D cruza rodando por delante del modelo y cada letra 3D se levanta a su paso (entrada `flip` con `letterStart` según `tire.centerAt`).
  - La marca va arriba en blanco espaciado.
  - Después cae la versión o el año.
- **Cifras héroe:**
  - `counter3D` en oxidado (cilindrada, velocidades, ocupantes, kg de carga).
  - Si el dato es de 4x4, tracción o aros, entra rodando una llanta 3D al lado y se queda girando.
  - Para ocupantes, una fila de siluetas naranjas.
- **K-SI SCAN:** cada cosa que el asesor nombra o señala (volante, pantalla, palanca, cámara, balde) se marca.
  - Objetos chicos: `scanRing3D`.
  - Objetos grandes: esquinas naranjas en L alrededor, con una línea de escaneo que baja una vez.
  - Además una etiqueta oscura con borde naranja, con "01 K-SI SCAN" chiquito encima y el nombre en Russo One.
  - La etiqueta cae girando sobre su borde superior (rotationX con perspectiva).
- **Fichas:** etiquetas apiladas que caen escalonadas, con franja de peligro naranja y negra debajo.
- **Transiciones:**
  - Casi siempre corte seco con un golpe de cámara en `#cam-N`.
  - Una o dos veces por Reel, en un cambio de bloque grande, la llanta gigante (`K3.tireWipe`) justo en el corte, con un `whoosh`.
- **Cierre:**
  - "COMENTA" en metal oxidado 3D y una caja de comentario blanca que se escribe sola con la palabra clave.
  - Al final, una placa negra con huellas de llanta y una llanta 3D que entra rodando y se queda girando.
  - Debajo, "K-SI NUEVOS" en 3D, franja de peligro, "CUENCA · ECUADOR" y el logo sobre una placa clara.

## Movimiento

Seco y con peso: las cosas caen y se asientan, sin rebotes de caricatura. Cámara con golpes cortos en las palabras fuertes y deriva lenta (1.0 → 1.06) en cada toma.
