# Diseño: SUV (elegante)

Un comercial de autos de lujo: sobrio, aireado y pulido. La elegancia viene del espacio vacío, la tipografía y la luz.

## Paleta

- Champán `#CDAE72` (acento), bronce `#7A5C2E`, marfil `#EAD9B0`.
- Blanco y negro profundos.
- Nada de rojo salvo el logo.

## Tipografía

Es exclusiva de los SUV: no uses Russo One, Anton ni Bebas Neue. Elige UNA por Reel y no repitas las recientes:

| Estilo | 2D | 3D (`font`) | Carácter |
|---|---|---|---|
| lujo | Cinzel | `cinzel` | romana con serifas, de marca de lujo |
| editorial | Playfair Display | `playfair` | serif de alto contraste, de revista |
| premium | Michroma | `michroma` | extendida y aireada |
| refinada | Josefin Sans | `josefin` | geométrica fina |

- **Etiquetas:** Montserrat 800, muy espaciadas (0.4–0.6em).
- **Subtítulos:** en minúsculas, Montserrat 800 blanco. La palabra clave va en Playfair Display itálica color champán, un poco más grande.

## Piezas

- **Apertura:** franjas negras de cine (unos 140 px) que se abren como un telón. El gancho en la tipografía elegida, palabra por palabra de borroso a nítido, con una línea champán fina debajo.
- **Presentación:** el modelo en 3D con `finish: 'champagne'` y `entrance: 'rise'`, letras que suben despacio y se enderezan (stagger 0.05, dur 0.7). La marca espaciada encima y el año entre dos líneas champán. Una luz recorre el cromo.
- **Cifras:**
  - `counter3D` champán con entrada `rise`, la etiqueta pequeña encima y la palabra debajo.
  - Para potencia o torque, un medidor fino con aguja.
- **Características:** esquinas finas champán sobre el objeto y una tarjeta de vidrio oscuro (`rgba(15,16,22,.78)` con `backdrop-filter: blur(22px)`, borde de 1 px champán) que se inclina en 3D al entrar.
- **Brillo:** una o dos veces, una banda de luz cálida diagonal que cruza la carrocería.
- **Transiciones:** fundido corto, destello de luz cálida o acercamiento suave. Nada de llantas.
- **Cierre:** placa negra con partículas doradas lentas. "Comenta" pequeño y espaciado, la palabra clave en 3D champán, la promesa en Montserrat y el logo en blanco.

## Movimiento

- Llegadas largas y suaves (`expo.out`, `power4.out`); salidas más cortas.
- Cámara que deriva despacio (1.0 → 1.05).
- Nada de golpes fuertes ni sacudidas.
