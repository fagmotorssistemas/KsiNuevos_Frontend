import type { Metadata } from "next";
import type { InventoryCar } from "@/hooks/Homeksi/useInventoryData";
import { getVehiclePublicPath } from "@/lib/inventario/vehicle-public-slug";

export const CUENCA_LANDING_PATH = "/cuenca-azuay";
export const CUENCA_SITE_URL = "https://www.ksinuevos.com";
export const CUENCA_CANONICAL = `${CUENCA_SITE_URL}${CUENCA_LANDING_PATH}`;

export const CUENCA_SEO = {
  title: "Autos usados en Cuenca | Seminuevos K-si Nuevos",
  description:
    "Autos usados y seminuevos en Cuenca. Compra, parte de pago y crédito en sala. Stock físico en K-si Nuevos, Azuay, listo para entrega.",
  h1: "Autos usados en Cuenca: seminuevos en sala, listos para entrega",
  intro:
    "Si buscas autos usados en Cuenca, K-si Nuevos atiende en sala en Azuay con stock físico: seminuevos para compra, parte de pago, consignación y crédito. El auto se muestra en patio antes de firmar.",
  faqs: [
    {
      pregunta: "¿Dónde comprar autos usados en Cuenca?",
      respuesta:
        "K-si Nuevos es un patio de autos usados y seminuevos en Cuenca, Azuay. El catálogo está en ksinuevos.com y las unidades se entregan en sala.",
    },
    {
      pregunta: "¿Reciben el auto como parte de pago?",
      respuesta:
        "Sí. Tasamos tu usado en sala y lo descontamos del seminuevo que elijas. También hacemos consignación: tu auto queda en vitrina a tu nombre.",
    },
    {
      pregunta: "¿Hay crédito para carros usados en Cuenca?",
      respuesta:
        "Sí. Armamos crédito a medida, con simulación en la web y asesoría en patio. La entrega se resuelve cuando el auto ya está en sala.",
    },
    {
      pregunta: "¿Los seminuevos tienen papeles en orden?",
      respuesta:
        "Cada unidad se entrega con garantía en documentos. No es venta a ciegas: revisas el auto en Cuenca antes de firmar.",
    },
  ],
} as const;

export function buildCuencaMetadata(): Metadata {
  return {
    title: { absolute: CUENCA_SEO.title },
    description: CUENCA_SEO.description,
    alternates: { canonical: CUENCA_CANONICAL },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "es_EC",
      url: CUENCA_CANONICAL,
      siteName: "K-si Nuevos",
      title: CUENCA_SEO.title,
      description: CUENCA_SEO.description,
      images: [{ url: `${CUENCA_SITE_URL}/logo.png`, alt: "K-si Nuevos" }],
    },
    twitter: {
      card: "summary_large_image",
      title: CUENCA_SEO.title,
      description: CUENCA_SEO.description,
    },
  };
}

export function buildCuencaJsonLd(cars: InventoryCar[], stockCount: number) {
  const dealer = {
    "@type": "AutoDealer",
    "@id": `${CUENCA_CANONICAL}#dealer`,
    name: "K-si Nuevos",
    url: CUENCA_CANONICAL,
    telephone: "+593983335555",
    image: `${CUENCA_SITE_URL}/logo.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cuenca",
      addressRegion: "Azuay",
      addressCountry: "EC",
    },
    areaServed: ["Cuenca", "Azuay", "Ecuador"],
    priceRange: "$$",
    description: CUENCA_SEO.description,
    sameAs: [
      "https://www.facebook.com/ksinuevosfagmotors",
      "https://www.instagram.com/ksinuevosfag/",
      "https://maps.app.goo.gl/sS2J8rB1NiwZGbVj9",
    ],
  };

  const faq = {
    "@type": "FAQPage",
    "@id": `${CUENCA_CANONICAL}#faq`,
    mainEntity: CUENCA_SEO.faqs.map((item) => ({
      "@type": "Question",
      name: item.pregunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.respuesta,
      },
    })),
  };

  const itemList = {
    "@type": "ItemList",
    "@id": `${CUENCA_CANONICAL}#inventario`,
    name: "Autos usados disponibles en Cuenca",
    numberOfItems: stockCount,
    itemListElement: cars.map((car, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${CUENCA_SITE_URL}${getVehiclePublicPath(car)}`,
      name: `${car.brand} ${car.model} ${car.year ?? ""}`.trim(),
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [dealer, faq, itemList],
  };
}
