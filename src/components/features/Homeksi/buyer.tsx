import Image from 'next/image';

interface BuyerStory {
  id: number;
  year: number;
  imageUrl: string;
}

const successStories: BuyerStory[] = [
  {
    id: 1,
    year: 2022,
    imageUrl: "/Videos_fotos_vendedores/Venta.jpeg", 
  },
  {
    id: 2,
    year: 2020,
    imageUrl: "/Videos_fotos_vendedores/Venta1.jpeg",
  },
  {
    id: 3,
    year: 2018,
    imageUrl: "/Videos_fotos_vendedores/Venta2.jpg",
  },
  {
    id: 4,
    year: 2021,
    imageUrl: "/Videos_fotos_vendedores/Venta3.png",
  }
];

export const BuyerSection = () => {
  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-slate-800">Historias de Éxito</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {successStories.map((story, index) => (
          <div 
            key={story.id} 
            className="group relative w-full aspect-[4/5] md:aspect-auto md:h-[400px] rounded-[2rem] overflow-hidden cursor-default shadow-lg hover:shadow-2xl transition-all duration-500 bg-slate-100"
          >
            {/* OPTIMIZACIÓN DE IMAGEN:
              - fill: ocupa todo el contenedor padre.
              - sizes: define qué tan grande es la imagen según el ancho de pantalla.
              - priority: la primera imagen carga sin lazy-load para mejorar el LCP.
              - quality: 80 es el punto dulce entre peso y fidelidad visual.
            */}
            <Image 
              src={story.imageUrl} 
              alt={``} 
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={index === 0}
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              quality={80}
            />

          </div>
        ))}
      </div>
    </section>
  );
};

export default BuyerSection;