export type Proyecto = {
  id: string;
  nombre: string;
  areaInterna: number;
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
  { id: "ager", nombre: "Áger V", areaInterna: 59.73, precio: 119000, terraza: false, amenidades: ["parqueadero"], zona: "Puertas del Sol", imagen: "/AGER.png", ubicacionUrl: "https://maps.app.goo.gl/eGQyKLt9Z3Zr4gqu7", direccion: "Edificio Ager, Rafael Fajardo y Pje. Miguel Cordero Crespo &, Cuenca", fuenteUrl: "https://arqia.com.ec/?page_id=495" },
  { id: "kira", nombre: "Kira II", areaInterna: 67, precio: 147400, terraza: true, amenidades: [], zona: "Puertas del Sol", imagen: "/KIRA.png", ubicacionUrl: "https://maps.app.goo.gl/U6suQsyEzeKSKeX28", direccion: "4X4C+GX4, Ramona Cordero y León, Cuenca", fuenteUrl: "https://expatsecuador.com/property/modern-living-in-puertas-del-sol-kira-ii-apartments-for-sale" },
  { id: "samani", nombre: "Samaní", areaInterna: 47.8, precio: 96800, terraza: false, amenidades: ["rooftop", "área comercial", "amenidades"], zona: "Puertas del Sol", imagen: "/Captura de pantalla 2026-08-04 152555.png", ubicacionUrl: "https://maps.app.goo.gl/WCTk6ZSF4LdYvxweA", direccion: "Los Cedros y Pa. 3 de Noviembre &, Cuenca", fuenteUrl: "https://www.instagram.com/reels/DOexCyyj5pD/" },
  { id: "lamaison", nombre: "La Maison", areaInterna: 78, precio: 216000, terraza: false, amenidades: ["piscina", "gimnasio", "parqueadero"], zona: "Puertas del Sol", imagen: "/LA MAISON.webp", ubicacionUrl: "https://maps.app.goo.gl/TyzZwLgRhyGLrAcq6", direccion: "Av Ordóñez Lasso, Cuenca", fuenteUrl: "/maison proforma.jpg" },
  { id: "lavilet", nombre: "Lavilet", areaInterna: 90, precio: 235000, terraza: true, amenidades: ["piscina", "gimnasio", "seguridad 24h"], zona: "Puertas del Sol", destacado: true, imagen: "/Captura de pantalla 2026-08-04 152147.png" },
];
