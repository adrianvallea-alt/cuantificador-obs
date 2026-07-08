import { Settings } from 'lucide-react';

export default function Layout({ children, onSettingsClick }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center font-sans">
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
          src="/logo.png" 
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