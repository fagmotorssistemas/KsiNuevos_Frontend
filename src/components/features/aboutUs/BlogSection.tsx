import React from 'react';

const BLOG_POSTS = [
  {
    id: 1,
    title: '5 Consejos antes de comprar un seminuevo',
    excerpt: 'Descubre qué revisar mecánicamente antes de hacer tu inversión. El kilometraje no lo es todo.',
    date: '20 Ene, 2024',
    category: 'Guías',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 2,
    title: 'Mantenimiento preventivo: Lo que debes saber',
    excerpt: 'El cambio de aceite regular es la clave de la longevidad. Aprende a detectar problemas a tiempo.',
    date: '15 Ene, 2024',
    category: 'Mantenimiento',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 3,
    title: 'Tendencias automotrices para 2025',
    excerpt: 'Los híbridos están ganando terreno por su versatilidad en ciudad. ¿Es momento de cambiar?',
    date: '10 Ene, 2024',
    category: 'Noticias',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=1000&auto=format&fit=crop'
  },
];

export const BlogSection = () => {
  return (
    <section className="py-24 bg-zinc-950 text-white" id="blog">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Blog <span className="text-red-600">&</span> Novedades</h2>
            <p className="text-gray-400">Mantente al día con el mundo automotriz.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {BLOG_POSTS.map((post) => (
            <div key={post.id} className="flex flex-col h-full">
              <div className="rounded-2xl overflow-hidden mb-6 relative aspect-[4/3] border border-zinc-800">
                <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full z-10 border border-white/20">
                  {post.category}
                </div>
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover opacity-80" 
                />
              </div>
              <div className="flex items-center text-gray-500 text-xs font-medium uppercase tracking-wider mb-3 space-x-2">
                <span>{post.date}</span>
                <span className="w-1 h-1 rounded-full bg-red-600"></span>
                <span>K-si Nuevos</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white leading-tight">{post.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{post.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};