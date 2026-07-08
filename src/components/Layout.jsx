import { Settings, Download } from 'lucide-react';

export default function Layout({ children, onSettingsClick, showInstallBtn, onInstallClick }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center font-sans">
      
      {/* 💥 BANNER INTERACTIVO DE INSTALACIÓN ESTILO PHOTOPEA */}
      {showInstallBtn && (
        <div className="w-full bg-[#031d56] text-white text-xs py-2.5 px-4 md:px-6 flex justify-between items-center animate-fadeIn border-b border-[#0092ff]/30 shadow-md">
          <div className="flex items-center gap-2 pr-2">
            <span className="w-2 h-2 rounded-full bg-[#0092ff] animate-pulse shrink-0" />
            <p className="font-medium tracking-wide text-[11px] sm:text-xs">
              Usa el cuantificador sin internet instalando la aplicación móvil.
            </p>
          </div>
          <button
            onClick={onInstallClick}
            className="bg-[#0092ff] hover:bg-[#007edc] text-white font-black px-3 py-1 sm:py-1.5 rounded transition-all text-[10px] sm:text-xs shadow-[0_2px_8px_rgba(0,146,255,0.3)] active:scale-95 flex items-center gap-1.5 uppercase tracking-wider shrink-0 cursor-pointer"
          >
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Instalar
          </button>
        </div>
      )}

      {/* Header solo con el icono de configuración a la derecha */}
      <header className="w-full flex justify-end p-4 md:p-6">
        <button 
          onClick={onSettingsClick} 
          className="opacity-50 hover:opacity-100 transition-opacity text-[#031d56]" 
          title="Configuración"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>
      
      <main className="w-full max-w-3xl px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center pt-8">
        {children}
      </main>
      
      {/* Footer con logo y nombre de la empresa */}
      <footer className="w-full text-center py-4">
        <img 
          src={`${import.meta.env.BASE_URL}logo.png`} 
          alt="OBS Soluciones" 
          className="h-6 w-auto mx-auto mb-2 opacity-80" 
        />
        <p className="text-xs font-bold tracking-[0.2em] text-[#031d56]/40">
          OBS SOLUCIONES
        </p>
      </footer>
    </div>
  );
}