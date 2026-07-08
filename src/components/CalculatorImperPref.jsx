import { useState, useEffect, useRef } from 'react';
import { calculateImperPref } from '../utils/calculationsAdvanced';
import ResultsSimple from './ResultsSimple';
import { fetchCatalog } from '../api';
import {
  CheckCircle, ArrowRight, ArrowLeft,
  PaintBucket, Loader2, AlertCircle, Shield, Zap,
  FileDown, Share2, Ruler
} from 'lucide-react';
import jsPDF from 'jspdf';

/* ====================== SONIDOS SUTILES ====================== */
function useSound() {
  const audioCtxRef = useRef(null);
  const getCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };
  const playBeep = (freq = 800, duration = 80, type = 'sine') => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) { /* silencioso */ }
  };
  return { playBeep };
}

/* ====================== ESTILOS DE ANIMACIÓN ====================== */
const styleSheet = `
  @keyframes slideInRight {
    from { transform: translateX(30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideInLeft {
    from { transform: translateX(-30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-slide-in-right {
    animation: slideInRight 0.35s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  .animate-slide-in-left {
    animation: slideInLeft 0.35s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  @keyframes fillProgress {
    from { width: 0%; }
    to { width: 100%; }
  }
  .progress-bar-fill {
    animation: fillProgress 0.4s linear forwards;
    background: #0092FF;
  }
  @keyframes laserSweep {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .laser-sweep {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(0,146,255,0.3) 50%, transparent 100%);
    animation: laserSweep 0.3s ease-out forwards;
    pointer-events: none;
  }
  @keyframes pulse-glow {
    0% { box-shadow: 0 0 0 0 rgba(0,146,255,0.4); }
    70% { box-shadow: 0 0 0 8px rgba(0,146,255,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,146,255,0); }
  }
  .pulse-ready {
    animation: pulse-glow 2s infinite;
  }
  @keyframes shutterReveal {
    0% { transform: scaleY(0); opacity: 0; }
    100% { transform: scaleY(1); opacity: 1; }
  }
  .shutter-reveal {
    animation: shutterReveal 0.4s cubic-bezier(0.22,0.61,0.36,1) forwards;
    transform-origin: top;
  }
  @keyframes ripple {
    to { transform: scale(2.5); opacity: 0; }
  }
  .btn-ripple {
    position: relative;
    overflow: hidden;
  }
  .btn-ripple::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(255,255,255,0.4) 10%, transparent 10%);
    transform: scale(0);
    opacity: 1;
    transition: none;
  }
  .btn-ripple:active::after {
    transform: scale(2.5);
    opacity: 0;
    transition: transform 0.5s, opacity 1s;
  }
  .card-depth {
    box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
  }
  input[type=number] {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
  .mono {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
`;

/* ====================== SUBCOMPONENTES ====================== */
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gradient-to-r from-[#031D5F]/5 via-[#0092FF]/10 to-[#031D5F]/5 rounded-2xl ${className}`} />;
}

function getProductImage(product) {
  if (!product) return null;
  return product.imagen || product.foto || product.url || product.image || null;
}

// ---------- VISTA PREVIA DE LA SUPERFICIE ----------
function SurfaceSchematic({ largo, ancho }) {
  if (!largo || !ancho || largo <= 0 || ancho <= 0) return null;

  const scale = 260 / Math.max(largo, ancho);
  const w = largo * scale;
  const h = ancho * scale;
  const padding = 30;
  const viewW = w + padding * 2;
  const viewH = h + padding * 2;
  const offsetX = padding;
  const offsetY = padding;

  return (
    <div className="mt-6 mb-4 bg-[#031D5F]/[0.02] rounded-2xl p-3 border border-[#031D5F]/10">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-[#0092FF]" />
        <span className="text-[10px] font-semibold text-[#031D5F]/60 uppercase tracking-wider">
          Vista previa de la superficie
        </span>
      </div>
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full min-h-[180px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x={offsetX} y={offsetY}
          width={w} height={h}
          fill="#E6F3FF"
          stroke="#0092FF"
          strokeWidth="2"
          rx="4"
        />
        <text x={offsetX + w / 2} y={offsetY - 12} textAnchor="middle" className="text-[13px] font-semibold fill-[#031D5F]">
          {largo} m
        </text>
        <text x={offsetX - 18} y={offsetY + h / 2} textAnchor="middle" transform={`rotate(-90, ${offsetX - 18}, ${offsetY + h / 2})`} className="text-[13px] font-semibold fill-[#031D5F]">
          {ancho} m
        </text>
      </svg>
    </div>
  );
}

/* ====================== COMPONENTE PRINCIPAL ====================== */
export default function CalculatorImperPref({ onBack }) {
  const [catalog, setCatalog] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState(null);

  const { playBeep } = useSound();

  const [params, setParams] = useState({
    largo: '', ancho: '',
  });

  useEffect(() => {
    fetchCatalog()
      .then(data => setCatalog(data))
      .catch(() => setErrorMsg('No se pudieron cargar los datos.'))
      .finally(() => setLoadingData(false));
  }, []);

  const handleCalculate = () => {
    const numParams = {
      largo: parseFloat(params.largo),
      ancho: parseFloat(params.ancho),
    };
    if (!numParams.largo || !numParams.ancho) {
      setErrorMsg('Ingresa largo y ancho válidos.');
      return;
    }
    playBeep(600, 60);
    navigator.vibrate?.(10);
    setErrorMsg('');
    setIsCalculating(true);
    setTimeout(() => {
      const materials = calculateImperPref(numParams, catalog);
      setResults(materials);
      setIsCalculating(false);
      playBeep(1000, 100, 'triangle');
      navigator.vibrate?.(15);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 400);
  };

  // ---------- GENERAR PDF ----------
  const generatePDFBlob = async () => {
    if (!results || results.length === 0) return null;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 15;
    try {
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      await new Promise((resolve, reject) => { logoImg.onload = resolve; logoImg.onerror = reject; });
      const maxLogoWidth = 30;
      const logoHeight = (logoImg.height / logoImg.width) * maxLogoWidth;
      pdf.addImage(logoImg, 'PNG', 10, y, maxLogoWidth, logoHeight);
    } catch (e) {}
    y += 18;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor('#031d56');
    pdf.text('CUANTIFICADOR OBS', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.setFontSize(10); pdf.setTextColor('#64748b');
    pdf.text('Sistemas Constructivos de Vanguardia', pageWidth / 2, y, { align: 'center' });
    y += 10;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    const margin = 10;
    const col1 = margin; const col2 = margin + 80; const col3 = margin + 120; const col4 = margin + 150;
    pdf.setFillColor('#0092FF'); pdf.setTextColor('#ffffff');
    pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
    pdf.text('Producto', col1 + 1, y + 5); pdf.text('Cantidad', col2, y + 5); pdf.text('Unidad', col3, y + 5); pdf.text('Clave', col4, y + 5);
    y += 8;
    pdf.setTextColor('#031d56');
    results.forEach((item, index) => {
      if (y > 270) { pdf.addPage(); y = 15; }
      if (index % 2 === 0) { pdf.setFillColor('#f8fafc'); pdf.rect(margin, y - 1, pageWidth - 2 * margin, 7, 'F'); }
      const descripcion = item.product?.desc || item.product?.descripcion || item.product?.clave || '';
      const cantidad = item.quantity != null ? String(item.quantity) : '';
      const unidad = item.unit ? (item.quantity === 1 ? 'pieza' : 'piezas') : '';
      const clave = item.product?.clave || '';
      pdf.text(descripcion, col1 + 1, y + 4); pdf.text(cantidad, col2, y + 4); pdf.text(unidad, col3, y + 4); pdf.text(clave, col4, y + 4);
      y += 7;
    });
    pdf.setFontSize(8); pdf.setTextColor('#64748b');
    pdf.text('OBS SOLUCIONES', pageWidth / 2, 285, { align: 'center' });
    return pdf.output('blob');
  };

  const downloadPDF = async () => {
    const blob = await generatePDFBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cotizacion-impermeabilizante.pdf'; a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- WHATSAPP ----------
  const shareText = () => {
    if (!results || results.length === 0) return;
    const lines = results.map(item => {
      const desc = item.product?.desc || item.product?.descripcion || item.product?.clave || '';
      const cantidad = item.quantity != null ? item.quantity : '';
      const unidad = item.unit ? (item.quantity === 1 ? 'pieza' : 'piezas') : '';
      return `- ${desc}: ${cantidad} ${unidad}`;
    });
    const message = `CUANTIFICADOR OBS\nMateriales calculados (Impermeabilizante):\n\n${lines.join('\n')}\n\nSolicito cotización de estos productos. Gracias.`;
    const url = `https://wa.me/5214434719644?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  // Pantalla de resultados
  if (results) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-24 pt-2">
        <div className="text-center my-14">
          <h1 className="text-4xl sm:text-5xl font-black text-[#031d56] tracking-tight uppercase">
            CUANTIFICADOR <span style={{ color: '#0092ff' }}>OBS</span>
          </h1>
          <p className="text-[#64748b] mt-2 text-xs font-bold tracking-[0.3em] uppercase">
            Sistemas Constructivos de Vanguardia
          </p>
        </div>
        <button onClick={() => { playBeep(400,50); navigator.vibrate?.(10); setResults(null); }} className="mb-4 flex items-center gap-1 text-[#0092FF] text-sm font-semibold">← Ajustar opciones</button>
        <div className="mt-6 animate-fadeIn shutter-reveal">
          <div className="mb-8">
            <ResultsSimple materials={results} />
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={downloadPDF} className="flex-1 flex items-center justify-center gap-2 bg-[#031D5F] text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-[#031D5F]/90 transition active:scale-95">
              <FileDown size={16} /> Descargar PDF
            </button>
            <button onClick={shareText} className="flex-1 flex items-center justify-center gap-2 bg-[#0092FF] text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-[#0092FF]/90 transition active:scale-95">
              <Share2 size={16} /> Solicitar Cotización
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulario principal
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2">
      <style>{styleSheet}</style>

      <div className="text-center my-14">
        <h1 className="text-4xl sm:text-5xl font-black text-[#031d56] tracking-tight uppercase">
          CUANTIFICADOR <span style={{ color: '#0092ff' }}>OBS</span>
        </h1>
        <p className="text-[#64748b] mt-2 text-xs font-bold tracking-[0.3em] uppercase">
          Sistemas Constructivos de Vanguardia
        </p>
      </div>

      <button onClick={onBack} className="group mb-4 text-sm text-[#031D5F]/70 hover:text-[#0092FF] flex items-center gap-1.5 transition-all hover:bg-[#0092FF]/5 px-3 py-1.5 rounded-xl">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> Elegir otro proyecto
      </button>

      <div className="bg-white rounded-3xl card-depth p-6 border border-[#031D5F]/5 animate-slide-in-right">
        <h3 className="text-lg font-bold text-[#031D5F] mb-1">
          <span className="border-b-2 border-[#D4AF37]/30 pb-0.5">🛡️ IMPERMEABILIZANTE PREFABRICADO</span>
        </h3>
        <p className="text-sm text-[#031D5F]/50 mb-6">Dimensiones de la losa para manto y primer.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Largo (m)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={params.largo}
              onChange={e => setParams({...params, largo: e.target.value})}
              placeholder="10.00"
              className="w-full rounded-xl border-[#031D5F]/20 px-3 py-3 text-sm text-[#031D5F] focus:ring-2 focus:ring-[#0092FF]/40 transition-all mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Ancho (m)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={params.ancho}
              onChange={e => setParams({...params, ancho: e.target.value})}
              placeholder="5.00"
              className="w-full rounded-xl border-[#031D5F]/20 px-3 py-3 text-sm text-[#031D5F] focus:ring-2 focus:ring-[#0092FF]/40 transition-all mono"
            />
          </div>
        </div>

        {/* Productos incluidos */}
        <div className="bg-[#031D5F]/5 rounded-2xl p-4 border border-[#031D5F]/10 mb-6">
          <p className="text-sm font-semibold text-[#031D5F] mb-3">Productos incluidos:</p>
          {(() => {
            const manto = catalog.find(p => p.clave === 'S740012RO');
            const primer = catalog.find(p => p.clave === 'S598672CU');
            const imgManto = getProductImage(manto);
            const imgPrimer = getProductImage(primer);
            return (
              <>
                <div className="flex items-center gap-3 mb-3">
                  {imgManto ? (
                    <img src={imgManto} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-[#0092FF]/10 rounded-lg flex items-center justify-center">
                      <PaintBucket size={20} className="text-[#0092FF]" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-[#031D5F]">{manto?.descripcion || manto?.desc || 'SIKASHIELD P42 MG MX 3.5MM ROJO'}</p>
                    <p className="text-[10px] text-[#031D5F]/50">Rollo · 9 m²</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {imgPrimer ? (
                    <img src={imgPrimer} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-[#0092FF]/10 rounded-lg flex items-center justify-center">
                      <PaintBucket size={20} className="text-[#0092FF]" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-[#031D5F]">{primer?.descripcion || primer?.desc || 'EMULSIKA + PRIMER MX 19L'}</p>
                    <p className="text-[10px] text-[#031D5F]/50">Cubeta 19 L · Rinde 4 m²/L</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Vista previa de la superficie (ahora después de productos incluidos) */}
        <SurfaceSchematic
          largo={parseFloat(params.largo)}
          ancho={parseFloat(params.ancho)}
        />

        <div className="flex justify-end mt-8">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm btn-ripple bg-[#0092FF] text-white shadow-lg shadow-[#0092FF]/20 pulse-ready disabled:opacity-70"
          >
            {isCalculating ? (
              <><Loader2 size={18} className="animate-spin" /> Procesando…</>
            ) : (
              <>Calcular materiales <ArrowRight size={18} /></>
            )}
          </button>
        </div>
        {isCalculating && (
          <div className="mt-4 w-full bg-[#031D5F]/10 rounded-full h-2 overflow-hidden">
            <div className="progress-bar-fill h-full rounded-full" />
          </div>
        )}
      </div>

      {/* Toast de error */}
      {errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-50 border border-red-300 rounded-xl px-4 py-3 shadow-lg animate-fadeIn">
          <AlertCircle size={18} className="text-red-600" />
          <span className="text-sm text-red-800 font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Toast de éxito */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-white border border-green-200 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 animate-fadeIn z-50">
          <CheckCircle size={20} className="text-[#D4AF37]" />
          <div>
            <span className="text-sm font-bold text-[#031D5F]">Cálculo Exitoso</span>
            <span className="text-xs text-[#031D5F]/50">Materiales generados.</span>
          </div>
        </div>
      )}
    </div>
  );
}