export type Proyecto = {
  id: string;
  nombre: string;
  areaInterna: number;
  areaTotal?: number;
  precio: number;
  dormitorios?: number;
  parqueaderos?: number;
  terraza: boolean;
  amenidades: string[];
  zona: string;
  destacado?: boolean;
  imagen?: string;
  ubicacionUrl?: string;
  direccion?: string;
  fuenteUrl?: string;
};

export const proyectos: Proyecto[] = [
  { id: "ager", nombre: "Áger II", areaInterna: 135, areaTotal: 230, precio: 330000, terraza: true, amenidades: ["parqueadero"], zona: "Puertas del Sol", imagen: "/AGER.png", ubicacionUrl: "https://maps.app.goo.gl/eGQyKLt9Z3Zr4gqu7", direccion: "Edificio Ager, Rafael Fajardo y Pje. Miguel Cordero Crespo &, Cuenca", fuenteUrl: "https://arqia.com.ec/?page_id=495" },
  { id: "kira", nombre: "Kira II", areaInterna: 58.87, precio: 159200, terraza: true, amenidades: [], zona: "Puertas del Sol", imagen: "/KIRA.png", ubicacionUrl: "https://maps.app.goo.gl/U6suQsyEzeKSKeX28", direccion: "4X4C+GX4, Ramona Cordero y León, Cuenca", fuenteUrl: "https://expatsecuador.com/property/modern-living-in-puertas-del-sol-kira-ii-apartments-for-sale" },
  { id: "samani", nombre: "Samaní", areaInterna: 48.08, precio: 97054, terraza: false, amenidades: ["rooftop", "área comercial", "sauna", "hidromasaje", "gimnasio", "área BBQ", "lobby"], zona: "Puertas del Sol", imagen: "/Captura de pantalla 2026-08-04 152555.png", ubicacionUrl: "https://maps.app.goo.gl/WCTk6ZSF4LdYvxweA", direccion: "Los Cedros y Pa. 3 de Noviembre &, Cuenca", fuenteUrl: "https://www.instagram.com/reels/DOexCyyj5pD/" },
  { id: "lamaison", nombre: "La Maison", areaInterna: 78, precio: 216000, terraza: false, amenidades: ["piscina", "gimnasio", "parqueadero"], zona: "Puertas del Sol", imagen: "/LA MAISON.webp", ubicacionUrl: "https://maps.app.goo.gl/TyzZwLgRhyGLrAcq6", direccion: "Av Ordóñez Lasso, Cuenca", fuenteUrl: "/maison proforma.jpg" },
  { id: "noa", nombre: "NOA", areaInterna: 46.36, areaTotal: 78.52, precio: 142000, dormitorios: 2, terraza: true, amenidades: ["cine", "sauna", "gym", "parqueadero", "zona BBQ", "3 baños", "lavandería"], zona: "Puertas del Sol", imagen: "/NOA.jpg", ubicacionUrl: "https://maps.app.goo.gl/H2fjSKJzkmz9GXUw8", direccion: "Av Ordóñez Lazo, Cuenca" },
  { id: "vento", nombre: "Vento", areaInterna: 56.25, areaTotal: 113.44, precio: 132000, terraza: false, amenidades: [], zona: "Puertas del Sol", imagen: "/VENTO.jpg", ubicacionUrl: "https://maps.app.goo.gl/aj38UCyCHaXfwpi57", direccion: "Los Molles y Av 3 de Noviembre, Cuenca" },
  { id: "gales", nombre: "Gales", areaInterna: 56.22, precio: 122081, dormitorios: 1, terraza: true, amenidades: ["lavandería", "2 baños", "parqueadero", "bodega"], zona: "Puertas del Sol", imagen: "/Captura de pantalla 2026-08-05 162149.png", direccion: "Av. Paseo 3 de Noviembre y calle Los Pinos" },
  { id: "lavilet", nombre: "Lavilet", areaInterna: 90, precio: 235000, terraza: true, amenidades: ["piscina", "gimnasio", "seguridad 24h"], zona: "Puertas del Sol", destacado: true, imagen: "/Captura de pantalla 2026-08-04 152147.png" },
];
