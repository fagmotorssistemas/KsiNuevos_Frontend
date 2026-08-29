import type { Metadata } from "next";
import { slugifyVehicleText } from "@/lib/inventario/vehicle-public-slug";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

function absoluteTitle(title: string): Metadata {
  return {
    title: { absolute: title },
    robots: { index: true, follow: true },
  };
}

function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = `${SITE_URL}${opts.path}`;
  return {
    ...absoluteTitle(opts.title),
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "es_EC",
      url,
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      images: [{ url: `${SITE_URL}/logo.png`, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}

export const CATALOG_SEO = {
  path: "/usados/cuenca",
  title: "Autos usados en Cuenca | Carros y seminuevos | K-si Nuevos",
  description:
    "Catálogo de autos usados, carros y vehículos seminuevos en Cuenca. Stock en sala, parte de pago y crédito en K-si Nuevos.",
  h1: "Autos usados en Cuenca",
  intro:
    "Carros, vehículos y seminuevos en patio. Filtra por marca, precio y año. Atención en sala en Azuay, con parte de pago y crédito.",
};

export const VENDER_SEO = {
  path: "/vender/cuenca",
  title: "Vender auto usado en Cuenca | Parte de pago | K-si Nuevos",
  description:
    "Vende o deja tu auto usado como parte de pago en Cuenca. Tasación en sala, consignación y trámite en K-si Nuevos.",
  h1Lead: "Vende tu auto usado",
  h1Accent: "en Cuenca, sin complicaciones.",
  intro:
    "Sin citas con extraños: tasamos en sala, recibimos parte de pago o consignación, y el trámite queda en orden.",
};

export const CREDITOS_SEO = {
  path: "/creditos/cuenca",
  title: "Crédito para autos usados en Cuenca | K-si Nuevos",
  description:
    "Financia tu auto usado o seminuevo en Cuenca. Crédito directo y banca, con simulación en minutos y asesoría en sala.",
  h1Lead: "Crédito para tu auto usado",
  h1Accent: "en Cuenca, a tu medida",
  intro:
    "Simula con tu identificación. Crédito directo con nosotros o con bancos, para carros y seminuevos en sala.",
};

export const NOSOTROS_SEO = {
  path: "/nosotros/cuenca",
  title: "Patio de autos usados en Cuenca | K-si Nuevos",
  description:
    "K-si Nuevos es un patio de seminuevos en Cuenca, Azuay. Compra, venta, parte de pago y crédito con atención en sala.",
};

export function catalogMetadata(): Metadata {
  return pageMeta(CATALOG_SEO);
}

export function brandCatalogMetadata(brandLabel: string): Metadata {
  const brand = brandLabel.trim();
  return pageMeta({
    path: `/usados/cuenca/${slugifyVehicleText(brand)}`,
    title: `${brand} usados en Cuenca | Seminuevos ${brand} | K-si Nuevos`,
    description: `Autos usados y seminuevos ${brand} en Cuenca. Stock físico en K-si Nuevos, con parte de pago y crédito.`,
  });
}

export function brandHeading(brandLabel: string) {
  return {
    h1: `${brandLabel} usados en Cuenca`,
    intro: `Carros y seminuevos ${brandLabel} en sala. Parte de pago, crédito y entrega en Cuenca, Azuay.`,
  };
}

export function vehicleMetadata(opts: {
  brand: string;
  model: string;
  year: number | string | null;
  price?: number | null;
  path: string;
}): Metadata {
  const year = opts.year ? String(opts.year) : "";
  const name = `${opts.brand} ${opts.model} ${year}`.replace(/\s+/g, " ").trim();
  const priceBit =
    opts.price && opts.price > 0
      ? ` Precio ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(opts.price)}.`
      : "";
  return pageMeta({
    path: opts.path,
    title: `${name} usado en Cuenca | K-si Nuevos`,
    description: `${name} usado / seminuevo en Cuenca.${priceBit} Verlo en sala, parte de pago y crédito en K-si Nuevos.`,
  });
}

export function venderMetadata(): Metadata {
  return pageMeta(VENDER_SEO);
}

export function creditosMetadata(): Metadata {
  return pageMeta(CREDITOS_SEO);
}

export function nosotrosMetadata(): Metadata {
  return pageMeta(NOSOTROS_SEO);
}
