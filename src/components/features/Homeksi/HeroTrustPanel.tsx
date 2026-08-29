import Image from "next/image";
import Link from "next/link";
import { PUBLIC_PATHS } from "@/lib/nav/publicPaths";
import { CUENCA_SEO } from "@/lib/seo/cuenca-landing";

const TRUST_ITEMS = [
  {
    title: "Garantía en documentos",
    href: PUBLIC_PATHS.comprar,
    photo: "/home/garantia-documentos.png",
    photoAlt: "Entrega de certificado de garantía K-si Nuevos",
    photoPosition: "object-cover object-[54%_center]",
  },
  {
    title: "Venta promedio en 24 horas",
    href: PUBLIC_PATHS.comprar,
    photo: "/home/venta-entrega-inmediata.jpg",
    photoAlt: "Entrega inmediata de vehículo en K-si Nuevos",
    photoPosition: "object-contain object-right",
    photoFlush: true as const,
  },
  {
    title: "Crédito a tu medida",
    href: PUBLIC_PATHS.creditos,
    photo: "/home/credito-a-tu-medida.jpg",
    photoAlt: "Crédito K-si Nuevos a tu medida",
    photoPosition: "object-cover object-[74%_center]",
    photoEdge: "straight" as const,
  },
] as const;

const CTA_CLASS =
  "relative z-0 inline-flex h-full min-h-[4.75rem] w-full items-center justify-center bg-white px-4 text-center text-sm font-bold uppercase leading-tight tracking-tight text-neutral-950 shadow-[0_1px_1px_rgba(15,15,15,0.04),0_10px_24px_-14px_rgba(15,15,15,0.28)] transition-[transform,box-shadow] duration-300 [-webkit-text-stroke:0.45px_currentColor] hover:z-10 hover:-translate-y-1 hover:scale-[1.04] hover:shadow-[0_2px_2px_rgba(15,15,15,0.05),0_16px_32px_-14px_rgba(15,15,15,0.32)] sm:px-6 sm:text-base md:text-xl md:leading-none";

export function HeroTrustPanel() {
  return (
    <section className="relative z-10 -mt-10 overflow-x-clip bg-gradient-to-b from-transparent via-white via-[18%] to-white px-6 pb-8 pt-16 md:px-10 lg:px-14 md:pb-10 md:pt-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 grid grid-cols-1 gap-3 px-2 sm:grid-cols-2 sm:gap-5 sm:px-6 md:px-10 lg:px-14">
          <Link href={PUBLIC_PATHS.comprar} className={CTA_CLASS}>
            Comprar auto
          </Link>
          <Link href={PUBLIC_PATHS.vender} className={CTA_CLASS}>
            Vender o cambiar
          </Link>
        </div>

        <header className="mb-14 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-700">
            K-si Nuevos · Cuenca, Azuay
          </p>
          <span className="mt-4 mb-6 block h-px w-8 bg-red-700/50" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 leading-snug md:text-[1.85rem] md:leading-tight">
            {CUENCA_SEO.h1}
          </h1>
          <p className="mt-6 text-sm leading-7 text-neutral-500 md:text-[15px] md:leading-8">
            {CUENCA_SEO.intro}
          </p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 pb-4">
          {TRUST_ITEMS.map((item) => {
            const photoFlush = "photoFlush" in item && item.photoFlush;
            const photoStraight = "photoEdge" in item && item.photoEdge === "straight";
            return (
              <Link
                key={item.title}
                href={item.href}
                className="relative z-0 flex min-h-[188px] items-center overflow-hidden bg-white transition-transform duration-300 hover:z-10 hover:scale-[1.04]"
              >
                <div className="relative z-10 w-[40%] shrink-0 px-5 py-5">
                  <h3 className="text-[13px] md:text-sm font-semibold uppercase tracking-[0.14em] text-neutral-800 leading-snug">
                    {item.title}
                  </h3>
                </div>
                <div className="absolute inset-y-0 right-0 w-[68%]">
                  <div
                    className={`absolute inset-0 ${
                      photoStraight
                        ? ""
                        : "[clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)]"
                    }`}
                  >
                    {photoFlush ? (
                      <Image
                        src={item.photo}
                        alt={item.photoAlt}
                        width={960}
                        height={540}
                        className="absolute right-0 top-0 h-full w-auto max-w-none [mask-image:linear-gradient(to_right,transparent,black_22%)]"
                      />
                    ) : (
                      <Image
                        src={item.photo}
                        alt={item.photoAlt}
                        fill
                        sizes="(max-width: 768px) 80vw, 320px"
                        className={item.photoPosition}
                      />
                    )}
                  </div>
                  <div
                    className={
                      photoFlush
                        ? "absolute inset-y-0 left-0 w-[32%] bg-gradient-to-r from-white via-white/50 to-transparent"
                        : photoStraight
                          ? "absolute inset-y-0 left-0 w-[14%] bg-gradient-to-r from-white via-white/40 to-transparent"
                          : "absolute inset-y-0 left-0 w-[22%] bg-gradient-to-r from-white via-white/55 to-transparent"
                    }
                    aria-hidden
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
