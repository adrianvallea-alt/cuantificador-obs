import { useState } from 'react';
import { Home, Shield, Sun, ArrowRight, Info } from 'lucide-react';

const icons = { 'MURO INTERIOR': Home, 'MURO EXTERIOR': Shield, 'PLAFÓN': Sun };

export default function RecipeSelector({ recipes, onSelect }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const toggleTooltip = (e, id) => {
    e.stopPropagation();
    setActiveTooltip(activeTooltip === id ? null : id);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 pt-2" onClick={() => setActiveTooltip(null)}>
      {/* HEADER */}
      <div className="text-center my-14">
        <h1 className="text-4xl sm:text-5xl font-black text-[#031d56] tracking-tight uppercase">
          CUANTIFICADOR <span style={{ color: '#0092ff' }}>OBS</span>
        </h1>
        <p className="text-slate-400 mt-2 text-xs font-bold tracking-[0.3em] uppercase">
          Sistemas Constructivos de Vanguardia
        </p>
        {/* 👇 Nueva pregunta motivacional */}
        <p className="text-[#031d56] font-bold text-lg sm:text-xl mt-5">
          ¿Qué vas a hacer hoy?
        </p>
      </div>

      <div className="space-y-4">
        {recipes.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Home size={44} className="mx-auto text-slate-300 mb-3" />
            <p className="text-[#031d56] font-medium text-sm">No hay módulos configurados</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {recipes.map(r => (
            <div
              key={r.id}
              onClick={() => onSelect(r)}
              className="group cursor-pointer rounded-3xl p-4 sm:p-5 border border-slate-100/80 bg-white shadow-[0_4px_20px_rgba(3,29,86,0.015)] hover:shadow-[0_24px_48px_rgba(3,29,86,0.06)] hover:-translate-y-1.5 active:scale-[0.99] transition-all duration-300 flex flex-col items-center text-center h-full relative"
            >
              {/* Botón info */}
              {r.descripcion && (
                <div className="absolute top-4 right-4 z-20">
                  <button
                    onClick={(e) => toggleTooltip(e, r.id)}
                    className="p-2 rounded-xl text-slate-300 hover:text-[#0092ff] hover:bg-slate-50 transition-all duration-200 relative"
                  >
                    <Info size={16} />
                    {(activeTooltip === r.id || (activeTooltip === null && "group-hover:opacity-100 group-hover:pointer-events-auto")) && (
                      <div className={`absolute z-30 top-full right-0 mt-2 w-60 p-3.5 bg-[#031d56] text-white text-xs rounded-xl shadow-xl transition-all duration-200 pointer-events-none origin-top-right ${
                        activeTooltip === r.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 md:block hidden'
                      }`}>
                        <p className="font-medium leading-relaxed text-slate-200 text-left">{r.descripcion}</p>
                        <div className="absolute bottom-full right-4 border-4 border-transparent border-b-[#031d56]" />
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* CONTENEDOR DE IMAGEN */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:text-[#0092ff] group-hover:bg-[#0092ff]/5 transition-all duration-500 shrink-0 overflow-hidden border border-slate-100/60 shadow-sm mb-4">
                {r.imagen ? (
                  <img
                    src={r.imagen}
                    alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                ) : (
                  (() => {
                    const Icon = icons[r.name?.toUpperCase()] || Home;
                    return <Icon size={48} className="transition-transform duration-500 group-hover:scale-110" />;
                  })()
                )}
              </div>

              {/* TÍTULO */}
              <div className="flex-1 flex items-center justify-center max-w-sm mt-3">
                <h3 className="font-black text-[#031d56] text-lg sm:text-xl tracking-tight leading-snug group-hover:text-[#0092ff] transition-colors break-words">
                  {r.name}
                </h3>
              </div>

              {/* INDICADOR DE ACCIÓN */}
              <div className="mt-4 pt-1 flex justify-center w-full">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-[#0092FF] group-hover:text-white transition-all duration-300 border border-slate-100/50 shadow-2xs">
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}