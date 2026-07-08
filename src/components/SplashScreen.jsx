import { useEffect, useState, useRef } from 'react';

export default function SplashScreen({ onFinish }) {
  const [exit, setExit] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {
        console.log("Audio listo para activarse");
      });
    }

    const originalBg = document.body.style.backgroundColor;
    const originalOverflow = document.body.style.overflow;
    
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.overflow = 'hidden';

    const startExitTimer = setTimeout(() => {
      setExit(true); 
    }, 2000);

    const destroyTimer = setTimeout(() => {
      onFinish();
    }, 2800);

    return () => {
      clearTimeout(startExitTimer);
      clearTimeout(destroyTimer);
      document.body.style.backgroundColor = originalBg;
      document.body.style.overflow = originalOverflow;
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff] overflow-hidden transition-all duration-1000 ${
        exit ? 'opacity-0 scale-[1.03] blur-sm pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <audio ref={audioRef} src="/reveal-sound.mp3" preload="auto" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0092ff]/5 rounded-full blur-[140px] pointer-events-none" />

      <div
        className={`transition-all duration-1000 ease-out flex flex-col items-center px-4 ${
          exit ? 'translate-y-[-10px]' : 'translate-y-0'
        }`}
      >
        <div className="relative mb-5 filter drop-shadow-[0_10px_30px_rgba(0,146,255,0.15)] opacity-0 animate-scale-up-fade">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shine pointer-events-none z-10" />
          
          <img
            src="/logo.png"
            alt="Logo OBS"
            className="w-50 h-50 sm:w-72 md:w-84 object-contain transition-transform duration-700 ease-out hover:scale-102"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-[0.2em] sm:tracking-[0.3em] text-[#031d56] uppercase text-center whitespace-nowrap opacity-0 animate-fade-in-delayed">
          CUANTIFICADOR <span style={{ color: '#0092ff' }} className="relative inline-block">OBS</span>
        </h1>
        
        <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.3em] sm:tracking-[0.4em] text-slate-500 uppercase mt-2 text-center opacity-0 animate-fade-in-delayed-more">
          Sistemas de Construcción
        </p>

        <div className="w-28 sm:w-36 h-[3px] bg-slate-100 rounded-full mt-8 overflow-hidden relative opacity-0 animate-fade-in-delayed-more">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-[#0092ff] to-[#00d0ff]"
            style={{ 
              animation: 'premiumProgress 2.0s cubic-bezier(0.22, 1, 0.36, 1) forwards' 
            }}
          />
        </div>
      </div>

      {/* Estilos puros corregidos para evitar errores de React en consola */}
      <style>{`
        @keyframes scaleUpFade {
          0% { opacity: 0; transform: scale(0.92) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        @keyframes fadeIn {
          to { opacity: 1; }
        }

        @keyframes shineEffect {
          0% { transform: translateX(-100%) skewX(-15deg); }
          35% { transform: translateX(100%) skewX(-15deg); }
          100% { transform: translateX(100%) skewX(-15deg); }
        }

        @keyframes premiumProgress {
          0% { width: 0%; }
          25% { width: 40%; }
          65% { width: 75%; }
          100% { width: 100%; }
        }

        .animate-scale-up-fade {
          animation: scaleUpFade 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-fade-in-delayed {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.3s;
          animation-fill-mode: forwards;
        }

        .animate-fade-in-delayed-more {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.5s;
          animation-fill-mode: forwards;
        }

        .animate-shine {
          animation: shineEffect 3.5s ease-in-out infinite;
          animation-delay: 0.8s;
        }
      `}</style>
    </div>
  );
}