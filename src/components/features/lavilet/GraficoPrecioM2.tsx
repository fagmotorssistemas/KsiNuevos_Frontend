"use client";

import { useMemo } from "react";
import { Proyecto } from "@/data/lavilet/proyectos";
import { calcularPrecioM2 } from "@/lib/lavilet/calculos";
import { BarChart3 } from "lucide-react";

interface GraficoPrecioM2Props {
  proyectos: Proyecto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
}

// Funciones matemáticas para dibujar los arcos SVG
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
    "M", startOuter.x, startOuter.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    "Z"
  ].join(" ");

  return d;
}

export function GraficoPrecioM2({ proyectos, selectedId, onSelect, onCompare }: GraficoPrecioM2Props) {
  const data = useMemo(() => {
    return proyectos
      .map(p => ({
        id: p.id,
        name: p.nombre,
        precioM2: Math.round(calcularPrecioM2(p.precio, p.areaInterna)),
        destacado: p.destacado,
      }))
      .sort((a, b) => b.precioM2 - a.precioM2); // Ordenar para que el gráfico tenga sentido visual
  }, [proyectos]);

  const maxPrecio = Math.max(...data.map(d => d.precioM2));
  
  // Configuración del SVG
  const cx = 250;
  const cy = 250;
  const minRadius = 60;
  const maxRadius = 160;
  const anglePadding = 3; // Espacio entre rebanadas

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="mb-8 relative z-10">
        <h3 className="text-2xl font-medium tracking-widest text-slate-900 uppercase">Infografía</h3>
        <div className="w-12 h-0.5 bg-[#c48b5d] mt-2 mb-4" />
        <p className="text-sm text-slate-600 font-medium tracking-wide max-w-sm">
          Distribución del valor por metro cuadrado en el mercado actual. Haz clic en los segmentos para explorar.
        </p>
      </div>

      <div className="flex-1 w-full min-h-[500px] relative z-10 flex items-center justify-center">
        <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible drop-shadow-sm">
          {/* Círculos de fondo (Grid) */}
          <circle cx={cx} cy={cy} r={maxRadius} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={minRadius + (maxRadius - minRadius) * 0.66} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx={cx} cy={cy} r={minRadius + (maxRadius - minRadius) * 0.33} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" strokeDasharray="4 4" />
          
          {/* Círculo central */}
          <circle cx={cx} cy={cy} r={minRadius - 15} fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
          
          {/* Rebanadas de datos */}
          {data.map((d, i) => {
            const angleStep = 360 / data.length;
            const startAngle = i * angleStep + anglePadding;
            const endAngle = (i + 1) * angleStep - anglePadding;
            const radius = minRadius + (d.precioM2 / maxPrecio) * (maxRadius - minRadius);
            
            const isSelected = d.id === selectedId;
            const isDestacado = d.destacado;
            
            // Colores estilo infografía técnica
            let fill = "rgba(0,0,0,0.03)";
            let stroke = "rgba(0,0,0,0.3)"; // Más oscuro para que se vea mejor
            let textFill = "#0f172a"; // slate-900 (casi negro)
            let priceFill = "#334155"; // slate-700
            
            if (isDestacado) {
              fill = "rgba(196, 139, 93, 0.2)"; // copper
              stroke = "rgba(196, 139, 93, 1)";
              textFill = "rgba(196, 139, 93, 1)";
              priceFill = "rgba(196, 139, 93, 1)";
            } else if (isSelected) {
              fill = "rgba(15, 23, 42, 0.1)"; // slate-900
              stroke = "rgba(15, 23, 42, 0.8)";
              textFill = "rgba(15, 23, 42, 1)";
              priceFill = "rgba(15, 23, 42, 1)";
            }

            const pathData = describeArc(cx, cy, minRadius, radius, startAngle, endAngle);
            
            // Cálculos para las líneas y textos apuntando a los segmentos
            const midAngle = (startAngle + endAngle) / 2;
            const outerPoint = polarToCartesian(cx, cy, radius, midAngle);
            const lineMidPoint = polarToCartesian(cx, cy, maxRadius + 20, midAngle);
            
            const isRight = midAngle >= 0 && midAngle < 180;
            const lineEndPoint = {
              x: lineMidPoint.x + (isRight ? 30 : -30),
              y: lineMidPoint.y
            };
            
            const textAnchor = isRight ? "start" : "end";
            const textX = lineEndPoint.x + (isRight ? 10 : -10);

            return (
              <g 
                key={d.id} 
                className="group cursor-pointer" 
                onClick={() => {
                  if (isSelected && !isDestacado) {
                    onCompare(d.id);
                  } else {
                    onSelect(d.id);
                  }
                }}
              >
                {/* Segmento */}
                <path 
                  d={pathData} 
                  fill={fill} 
                  stroke={stroke} 
                  strokeWidth={isSelected || isDestacado ? "2" : "1"} 
                  className="transition-all duration-500 hover:fill-black/5"
                />
                
                {/* Línea conectora (estilo infografía) */}
                <polyline 
                  points={`${outerPoint.x},${outerPoint.y} ${lineMidPoint.x},${lineMidPoint.y} ${lineEndPoint.x},${lineEndPoint.y}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="1"
                  className={`transition-all duration-500 opacity-100`}
                />
                
                {/* Punto en la línea */}
                <circle 
                  cx={outerPoint.x} 
                  cy={outerPoint.y} 
                  r="3" 
                  fill={stroke} 
                  className={`transition-all duration-500 ${isSelected || isDestacado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                />
                <circle 
                  cx={lineEndPoint.x} 
                  cy={lineEndPoint.y} 
                  r="2" 
                  fill={stroke} 
                  className={`transition-all duration-500 opacity-100`}
                />

                {/* Texto */}
                <text 
                  x={textX} 
                  y={lineEndPoint.y - 5} 
                  fill={textFill} 
                  fontSize="12" 
                  fontWeight="600"
                  textAnchor={textAnchor}
                  className={`uppercase tracking-widest transition-all duration-500 opacity-100`}
                >
                  {d.name}
                </text>
                <text 
                  x={textX} 
                  y={lineEndPoint.y + 12} 
                  fill={priceFill} 
                  fontSize="14" 
                  fontWeight="800"
                  textAnchor={textAnchor}
                  className={`transition-all duration-500 opacity-100`}
                >
                  {isDestacado ? "POR VER" : `$${d.precioM2}`}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Icono central HTML superpuesto */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <BarChart3 className="w-8 h-8 opacity-80" strokeWidth={1.5} />
        </div>
      </div>
      
      {/* Leyenda estilo técnico */}
      <div className="mt-8 border-t border-slate-200 pt-6 flex flex-wrap items-center justify-start gap-8 text-xs text-slate-500 font-medium tracking-widest uppercase">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border border-[#c48b5d] bg-[#c48b5d]/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#c48b5d]" />
          </div>
          <span>Lavilet</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border border-slate-300 bg-slate-100 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-slate-300" />
          </div>
          <span>Mercado</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border border-slate-900 bg-slate-900/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-slate-900" />
          </div>
          <span>Seleccionado</span>
        </div>
      </div>
      
      {/* Tip de interacción */}
      <div className="mt-4 text-xs text-slate-400 font-light tracking-wide text-center bg-slate-50 py-2 rounded-md">
        💡 <span className="font-medium">Tip:</span> Haz doble clic en un segmento del mercado para ver el análisis comparativo vs Lavilet.
      </div>
    </div>
  );
}