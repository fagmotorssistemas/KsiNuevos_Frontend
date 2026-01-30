"use client"; // Necesario para el hook useState

import React, { useState } from 'react';

const ChevronDown = () => (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
);

export const FaqAccordion = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: "¿Qué documentos necesito para vender mi auto?", a: "Necesitas la matrícula original, cédula de identidad, estar al día con las multas y revisión técnica." },
    { q: "¿Compran autos chocados o con averías?", a: "Por el momento solo compramos autos en buenas condiciones mecánicas y estéticas para garantizar la calidad a nuestros futuros compradores." },
    { q: "¿Cuánto tarda el proceso de pago?", a: "Una vez terminado el proceso de verificación de documentos, el pago se hace en un plazo máximo de 2 días." },
    { q: "¿El avalúo tiene algún costo?", a: "No, el avalúo es 100% gratuito y no te compromete a vender el auto con nosotros." }
  ];

  return (
    <section className="py-24 bg-white" id='faq-section'>
         <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
            
            <div className="space-y-4">
                {faqs.map((item, i) => (
                    <div key={i} className="border border-neutral-200 rounded-2xl overflow-hidden">
                        <button 
                            onClick={() => toggleFaq(i)}
                            className="w-full flex items-center justify-between p-5 bg-white hover:bg-neutral-50 transition-colors text-left"
                        >
                            <span className="font-bold text-neutral-900">{item.q}</span>
                            <span className={`transform transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}>
                                <ChevronDown />
                            </span>
                        </button>
                        {openFaq === i && (
                            <div className="p-5 pt-0 bg-neutral-50 text-neutral-600 text-sm leading-relaxed border-t border-neutral-100">
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
         </div>
    </section>
  );
};