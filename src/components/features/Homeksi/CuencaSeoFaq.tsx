import { PUBLIC_PATHS } from "@/lib/nav/publicPaths";
import { CUENCA_SEO } from "@/lib/seo/cuenca-landing";

export function CuencaSeoFaq() {
  return (
    <section className="bg-white px-6 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-16">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-700">
              Preguntas frecuentes
            </p>
            <span className="mt-4 mb-5 block h-px w-8 bg-red-700/50" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 leading-snug md:text-[1.85rem]">
              Autos usados en Cuenca
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
            {CUENCA_SEO.faqs.map((item) => (
              <details key={item.pregunta} className="group border border-neutral-200 px-5 py-5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold tracking-tight text-neutral-900 marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    {item.pregunta}
                    <span
                      className="mt-0.5 shrink-0 text-neutral-400 transition-transform duration-200 group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-neutral-500">
                  {item.respuesta}{" "}
                  <a
                    href={PUBLIC_PATHS.comprar}
                    className="font-medium text-red-700 hover:underline"
                  >
                    Ver catálogo
                  </a>
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
