import { useState, useEffect, useCallback, useRef } from 'react';
import { calculatePlafon } from '../utils/calculationsAdvanced';
import ResultsSimple from './ResultsSimple';
import { fetchCatalog } from '../api';
import {
  CheckCircle, ArrowRight, ArrowLeft, Shield,
  HelpCircle, Ruler, PaintBucket, Loader2, AlertCircle, Sparkles,
  Palette, Zap, FileDown, Share2
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

/* ====================== SUBCOMPONENTES PREMIUM ====================== */

function InteractiveTooltip({ content, children, className = "w-56" }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-0.5">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="focus:outline-none cursor-help inline-flex items-center text-[#031D5F]/40 hover:text-[#0092FF] transition-colors"
      >
        {children}
      </button>
      {isOpen && (
        <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#031D5F] text-white text-[11px] rounded-2xl p-3 shadow-xl z-50 leading-relaxed animate-fadeIn ${className}`}>
          {content}
          <span className="block text-[9px] text-white/40 mt-1.5 pt-1 border-t border-white/10 md:hidden text-center">
            Toca de nuevo para cerrar
          </span>
        </span>
      )}
    </span>
  );
}

function NivelTooltip({ nivel }) {
  const descripciones = {
    '0.2': 'N1 · Solo encintado\n• Cinta + capa delgada.\n• Uso: base azulejo, zonas ocultas.',
    '0.45': 'N2 · Encintado + 1 capa\n• Cinta y compuesto en juntas.\n• Uso: garajes, almacenes.',
    '0.75': 'N3 · Dos capas\n• Dos capas en juntas.\n• Uso: pre‑texturizado.',
    '1.0': 'N4 · Estándar (3 capas)\n• Acabado liso uniforme.\n• Uso: pintura mate residencial.',
    '1.4': 'N5 · Skim coat\n• Capa fina total.\n• Uso: pintura brillante, luz rasante.',
  };
  return (
    <InteractiveTooltip content={descripciones[nivel] || 'Selecciona un nivel'} className="w-64 whitespace-pre-line">
      <HelpCircle size={13} />
    </InteractiveTooltip>
  );
}

function StepIndicator({ steps, current }) {
  const icons = [Ruler, Palette];
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {steps.map((label, idx) => {
        const Icon = icons[idx];
        const isCompleted = idx < current;
        const isActive = idx === current;
        return (
          <div key={label} className="flex flex-col items-center gap-1 relative flex-1">
            <div className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${
              isCompleted ? 'bg-[#0092FF] text-white' :
              isActive ? 'bg-[#0092FF] text-white shadow-lg shadow-[#0092FF]/30 scale-110' :
              'bg-[#031D5F]/10 text-[#031D5F]/40'
            }`}>
              <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
              {isCompleted && <CheckCircle size={14} className="absolute -top-1 -right-1 text-[#D4AF37] bg-white rounded-full" />}
            </div>
            <span className={`text-[10px] font-semibold mt-1 text-center ${isActive ? 'text-[#0092FF]' : 'text-[#031D5F]/40'}`}>{label}</span>
            {idx < steps.length - 1 && (
              <div className="absolute top-5 left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] h-0.5 -z-10">
                <div className={`h-full transition-all duration-700 ${isCompleted ? 'bg-[#0092FF]' : 'bg-[#031D5F]/10'}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label, tooltip }) {
  const { playBeep } = useSound();
  const handleChange = (e) => {
    playBeep(700, 50);
    navigator.vibrate?.(10);
    onChange(e);
  };
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-[#031D5F]/5 rounded-2xl">
      <div className="flex items-center gap-1">
        <span className="text-sm text-[#031D5F]/80 font-medium">{label}</span>
        {tooltip && <InteractiveTooltip content={tooltip}><HelpCircle size={13} /></InteractiveTooltip>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={handleChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-[#031D5F]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0092FF] shadow-sm" />
      </label>
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gradient-to-r from-[#031D5F]/5 via-[#0092FF]/10 to-[#031D5F]/5 rounded-2xl ${className}`} />;
}

function getProductImage(product) {
  if (!product) return null;
  return product.imagen || product.foto || product.url || product.image || null;
}

function SegmentedGauge({ options, value, onChange }) {
  const { playBeep } = useSound();
  const [animatingIdx, setAnimatingIdx] = useState(null);
  const cols = options.length === 1 ? 'grid-cols-1' : options.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  const handleClick = (opt, idx) => {
    if (opt.v !== value) {
      playBeep(600, 60);
      navigator.vibrate?.(10);
      setAnimatingIdx(idx);
      onChange(opt.v);
      setTimeout(() => setAnimatingIdx(null), 300);
    }
  };

  return (
    <div className={`grid ${cols} gap-0.5 bg-[#031D5F]/5 p-0.5 rounded-xl border border-[#031D5F]/10`}>
      {options.map((opt, idx) => {
        const isSelected = value === opt.v;
        const isAnimating = animatingIdx === idx;
        return (
          <button
            key={opt.v}
            onClick={() => handleClick(opt, idx)}
            className={`relative py-2 text-[10px] font-medium rounded-lg transition-all overflow-hidden ${
              isSelected
                ? 'bg-white text-[#0092FF] shadow-sm font-bold'
                : 'text-[#031D5F]/60 hover:text-[#031D5F]'
            }`}
          >
            {opt.label}
            {isAnimating && <span className="laser-sweep" />}
          </button>
        );
      })}
    </div>
  );
}

// ---------- VISTA PREVIA DE LA SUPERFICIE (añadida) ----------
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
          Vista previa del plafón
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

export default function CalculatorPlafon({ recipe, onBack }) {
  const [catalog, setCatalog] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(recipe || null);
  const [step, setStep] = useState(0);
  const [previousStep, setPreviousStep] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resistenteMsg, setResistenteMsg] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState(null);

  const { playBeep } = useSound();

  const [params, setParams] = useState({
    largo: '', ancho: '', alturaPleno: '',
    separacionListones: '0.61',
    nivelCompuestoKg: '0.75',
    secadoRapido: false,
    selectedPanel: '',
    aislamiento: false,
    incluirResistente: false,
    adherencia: false,
    incluirPintura: false,
    pinturaSeleccionada: '',
    superficie: 'lisa',
    selladorSeleccionado: '',
    incluirSellado: false,
  });

  useEffect(() => {
    fetchCatalog()
      .then(data => {
        setCatalog(data);
        if (recipe) handleRecipeSelect(recipe, data);
      })
      .catch(() => setErrorMsg('No se pudieron cargar los datos.'))
      .finally(() => setLoadingData(false));
  }, [recipe]);

  const availablePanels = useCallback(() => {
    if (!selectedRecipe) return [];
    const recipePanels = selectedRecipe.productos
      .map(item => catalog.find(p => p.clave === item.clave))
      .filter(p => p && p.tipo === 'panel');
    if (recipePanels.length > 0) return recipePanels;
    return catalog.filter(p => p.tipo === 'panel');
  }, [selectedRecipe, catalog]);

  const allowedSeparations = useCallback(() => {
    if (!params.selectedPanel) return [];
    switch (params.selectedPanel) {
      case 'R804171': return ['0.61'];
      case 'R807609': return ['0.406'];
      case 'R500077': case 'R803499': case 'R800495': return ['0.406', '0.305'];
      default: return ['0.406', '0.61', '0.305'];
    }
  }, [params.selectedPanel]);

  const handleRecipeSelect = (rec, catalogData) => {
    const cat = catalogData || catalog;
    setSelectedRecipe(rec);
    setStep(0);
    const panels = rec.productos
      .map(item => cat.find(p => p.clave === item.clave))
      .filter(p => p && p.tipo === 'panel');
    if (panels.length > 0) {
      const firstPanel = panels[0].clave;
      setParams(prev => ({
        ...prev,
        selectedPanel: firstPanel,
        separacionListones: firstPanel === 'R804171' ? '0.61' : firstPanel === 'R807609' ? '0.406' : '0.406'
      }));
    }
  };

  const handleBackToSelection = () => {
    if (onBack) onBack();
    else { setSelectedRecipe(null); setResults(null); setStep(0); }
  };

  const handleToggleResistente = (checked) => {
    playBeep(700, 50);
    navigator.vibrate?.(10);
    setParams(prev => {
      const nuevosParams = { ...prev, incluirResistente: checked };
      if (checked) {
        nuevosParams.nivelCompuestoKg = '0.2';
        setResistenteMsg('✅ Nivel de acabado ajustado a 1 (solo encintado). La estuka SikaWall refuerza y sella.');
        setTimeout(() => setResistenteMsg(''), 5000);
      } else {
        nuevosParams.adherencia = false;
      }
      return nuevosParams;
    });
  };

  const handleCalculate = () => {
    const numParams = {
      largo: parseFloat(params.largo),
      ancho: parseFloat(params.ancho),
      alturaPleno: parseFloat(params.alturaPleno),
      separacionListones: parseFloat(params.separacionListones),
      nivelCompuestoKg: parseFloat(params.nivelCompuestoKg),
      secadoRapido: params.secadoRapido,
      selectedPanel: params.selectedPanel,
      aislamiento: params.aislamiento,
      incluirResistente: params.incluirResistente,
      adherencia: params.adherencia,
      incluirPintura: params.incluirPintura,
      pinturaSeleccionada: params.pinturaSeleccionada,
      superficie: params.superficie,
      selladorSeleccionado: params.selladorSeleccionado,
      permitirAislamiento: selectedRecipe.permitir_aislamiento,
      permitirResistente: selectedRecipe.permitir_resistente,
      permitirPintura: selectedRecipe.permitir_pintura,
      humedad: selectedRecipe.humedad,
      incluirSellado: params.incluirSellado,
    };
    if (!numParams.largo || !numParams.ancho || !numParams.alturaPleno) {
      setErrorMsg('Completá todas las dimensiones.');
      return;
    }
    if (!numParams.selectedPanel) {
      setErrorMsg('Seleccioná un tipo de panel.');
      return;
    }
    setErrorMsg('');
    setIsCalculating(true);
    setTimeout(() => {
      const materials = calculatePlafon(numParams, catalog);
      setResults(materials);
      setIsCalculating(false);
      playBeep(1000, 100, 'triangle');
      navigator.vibrate?.(15);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 400);
  };

  const handleBackToForm = () => { setResults(null); setStep(1); };

  // ---------- GENERAR PDF ----------
  const generatePDFBlob = async () => {
    if (!results || results.length === 0) return null;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 15;

    try {
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      const maxLogoWidth = 30;
      const logoWidth = maxLogoWidth;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      pdf.addImage(logoImg, 'PNG', 10, y, logoWidth, logoHeight);
    } catch (e) {}

    y += 18;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor('#031d56');
    pdf.text('CUANTIFICADOR OBS', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.setFontSize(10);
    pdf.setTextColor('#64748b');
    pdf.text('Sistemas Constructivos de Vanguardia', pageWidth / 2, y, { align: 'center' });
    y += 10;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const margin = 10;
    const col1 = margin;
    const col2 = margin + 80;
    const col3 = margin + 120;
    const col4 = margin + 150;

    pdf.setFillColor('#0092FF');
    pdf.setTextColor('#ffffff');
    pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
    pdf.text('Producto', col1 + 1, y + 5);
    pdf.text('Cantidad', col2, y + 5);
    pdf.text('Unidad', col3, y + 5);
    pdf.text('Clave', col4, y + 5);
    y += 8;

    pdf.setTextColor('#031d56');
    results.forEach((item, index) => {
      if (y > 270) { pdf.addPage(); y = 15; }
      if (index % 2 === 0) { pdf.setFillColor('#f8fafc'); pdf.rect(margin, y - 1, pageWidth - 2 * margin, 7, 'F'); }

      const descripcion = item.product?.desc || item.product?.descripcion || item.product?.clave || '';
      const cantidad = item.quantity != null ? String(item.quantity) : '';
      const unidad = item.unit ? (item.quantity === 1 ? 'pieza' : 'piezas') : '';
      const clave = item.product?.clave || '';

      pdf.text(descripcion, col1 + 1, y + 4);
      pdf.text(cantidad, col2, y + 4);
      pdf.text(unidad, col3, y + 4);
      pdf.text(clave, col4, y + 4);
      y += 7;
    });

    pdf.setFontSize(8);
    pdf.setTextColor('#64748b');
    pdf.text('OBS SOLUCIONES', pageWidth / 2, 285, { align: 'center' });

    return pdf.output('blob');
  };

  const downloadPDF = async () => {
    const blob = await generatePDFBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cotizacion-obs-plafon.pdf';
    a.click();
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

    const message = `CUANTIFICADOR OBS\nMateriales calculados (Plafón):\n\n${lines.join('\n')}\n\nSolicito cotización de estos productos. Gracias.`;
    const url = `https://wa.me/5214434719644?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const steps = ['Medidas', 'Acabado'];

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  if (!selectedRecipe) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 text-center">
        <div className="text-center my-14">
          <h1 className="text-4xl sm:text-5xl font-black text-[#031d56] tracking-tight uppercase">
            CUANTIFICADOR <span style={{ color: '#0092ff' }}>OBS</span>
          </h1>
          <p className="text-[#64748b] mt-2 text-xs font-bold tracking-[0.3em] uppercase">
            Sistemas Constructivos de Vanguardia
          </p>
        </div>
        <p className="text-[#031D5F]/50 mt-6">Selecciona un proyecto de plafón para empezar.</p>
      </div>
    );
  }

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

      <button onClick={handleBackToSelection} className="group mb-4 text-sm text-[#031D5F]/70 hover:text-[#0092FF] flex items-center gap-1.5 transition-all hover:bg-[#0092FF]/5 px-3 py-1.5 rounded-xl">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> Elegir otro proyecto
      </button>

      {!results && (
        <>
          <StepIndicator steps={steps} current={step} />

          {/* PASO 0: Medidas */}
{step === 0 && (
  <div className="bg-white rounded-3xl card-depth p-6 border border-[#031D5F]/5 animate-fadeIn">
    <h3 className="text-lg font-bold text-[#031D5F] mb-1"><span className="border-b-2 border-[#D4AF37]/30 pb-0.5">📏 MEDIDAS DEL PLAFÓN</span></h3>
    <p className="text-sm text-[#031D5F]/50 mb-6">Ingresá las medias y la altura entre la losa y plafón.</p>
    
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Largo (m)</label>
        <input type="number" step="0.01" inputMode="decimal" value={params.largo} onChange={e => setParams({...params, largo: e.target.value})} placeholder="5.00" className="w-full rounded-xl border-[#031D5F]/20 px-3 py-3 text-sm text-[#031D5F] focus:ring-2 focus:ring-[#0092FF]/40 transition-all" />
      </div>
      <div>
        <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Ancho (m)</label>
        <input type="number" step="0.01" inputMode="decimal" value={params.ancho} onChange={e => setParams({...params, ancho: e.target.value})} placeholder="4.00" className="w-full rounded-xl border-[#031D5F]/20 px-3 py-3 text-sm text-[#031D5F] focus:ring-2 focus:ring-[#0092FF]/40 transition-all" />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Altura entre la losa y plafón (m)</label>
        <input type="number" step="0.01" inputMode="decimal" value={params.alturaPleno} onChange={e => setParams({...params, alturaPleno: e.target.value})} placeholder="0.80" className="w-full rounded-xl border-[#031D5F]/20 px-3 py-3 text-sm text-[#031D5F] focus:ring-2 focus:ring-[#0092FF]/40 transition-all" />
      </div>
    </div>

    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Tipo de panel</label>
        <select value={params.selectedPanel} onChange={e => { playBeep(600,60); const newPanel=e.target.value; let newSep=params.separacionListones; if(newPanel==='R804171') newSep='0.61'; else if(newPanel==='R807609') newSep='0.406'; else newSep='0.406'; setParams({...params, selectedPanel:newPanel, separacionListones:newSep}); }} className="w-full rounded-xl border-[#031D5F]/20 px-3 py-3 text-sm text-[#031D5F] focus:ring-2 focus:ring-[#0092FF]/40 transition-all bg-white">
          {availablePanels().map(p => <option key={p.clave} value={p.clave}>{p.desc || p.descripcion || p.clave}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Separación entre listones</label>
        <SegmentedGauge
          options={allowedSeparations().map(sep => ({
            v: sep,
            label: sep === '0.61' ? '61cm' : sep === '0.406' ? '40.6cm' : '30.5cm'
          }))}
          value={params.separacionListones}
          onChange={v => setParams({...params, separacionListones: v})}
        />
      </div>
    </div>

    {/* Vista previa del plafón (ahora aquí abajo) */}
    <SurfaceSchematic largo={parseFloat(params.largo)} ancho={parseFloat(params.ancho)} />

    <div className="flex justify-end mt-8">
      <button onClick={() => { playBeep(400,50); navigator.vibrate?.(10); setStep(1); }} className="flex items-center gap-2 bg-[#0092FF] text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-[#0092FF]/90 active:scale-95 transition-all shadow-lg shadow-[#0092FF]/20 btn-ripple">
        Siguiente: Acabado <ArrowRight size={18} />
      </button>
    </div>
  </div>
)}

          {/* PASO 1: Acabado */}
          {step === 1 && (
            <div className="bg-white rounded-3xl card-depth p-6 border border-[#031D5F]/5 animate-fadeIn">
              <h3 className="text-lg font-bold text-[#031D5F] mb-2"><span className="border-b-2 border-[#D4AF37]/30 pb-0.5">🎨 ACABADO DEL PLAFÓN</span></h3>
              <p className="text-sm text-[#031D5F]/50 mb-6">Elegí el nivel de detalle y opciones extra.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 inline-flex items-center gap-1">
                    Nivel de acabado
                    <NivelTooltip nivel={params.nivelCompuestoKg} />
                  </label>
                  <SegmentedGauge
                    options={[{v:"0.2",label:"N1"},{v:"0.45",label:"N2"},{v:"0.75",label:"N3"},{v:"1.0",label:"N4"},{v:"1.4",label:"N5"}]}
                    value={params.nivelCompuestoKg}
                    onChange={(v) => {
                      const newLevel = v;
                      if (params.incluirResistente && newLevel !== '0.2') {
                        setParams(prev => ({
                          ...prev,
                          nivelCompuestoKg: newLevel,
                          incluirResistente: false,
                          adherencia: false
                        }));
                        setResistenteMsg('');
                      } else {
                        setParams(prev => ({ ...prev, nivelCompuestoKg: newLevel }));
                      }
                    }}
                  />
                  {params.incluirResistente && parseFloat(params.nivelCompuestoKg) <= 0.2 && (
                    <p className="text-xs text-[#0092FF]/80 mt-1 animate-fadeIn">⚡ Optimizado por SikaWall (nivel 1)</p>
                  )}
                </div>

                {params.selectedPanel === 'R804171' && (
                  <ToggleSwitch checked={params.secadoRapido} onChange={e => setParams({...params, secadoRapido: e.target.checked})} label="Compuesto de secado rápido" tooltip="El compuesto Easy set de secado rápido cuenta fraguado en minutos, recomendado en obras que requieren entregarse rapido." />
                )}

                {selectedRecipe.permitir_aislamiento && (
                  <ToggleSwitch checked={params.aislamiento} onChange={e => setParams({...params, aislamiento: e.target.checked})} label="Aislamiento térmico/acústico" tooltip="Reduce ruido y temperatura al interior, recomendado para salas y dormitorios." />
                )}

                {selectedRecipe.permitir_resistente && (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-[#0092FF]/5 to-[#031D5F]/5 rounded-2xl p-4 border border-[#0092FF]/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield size={24} className="text-[#0092FF]" />
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-[#031D5F]">TECNOLOGÍA SIKAWALL</p>
                            <InteractiveTooltip content="La tecnologia Estuka Sikawall le brinda a tu muro una alta resistencia a impacto y humedad.">
                              <HelpCircle size={13} />
                            </InteractiveTooltip>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={params.incluirResistente}
                          onChange={e => handleToggleResistente(e.target.checked)}
                          label=""
                        />
                      </div>
                    </div>
                    {resistenteMsg && (
                      <div className="mt-3 bg-[#0092FF]/5 border border-[#0092FF]/30 rounded-xl p-3 text-xs text-[#0092FF]/80 animate-fadeIn">{resistenteMsg}</div>
                    )}
                    {params.incluirResistente && (
                      <>
                        <div className="p-4 bg-white rounded-2xl border border-[#0092FF]/20 shadow-sm animate-fadeIn">
                          {(() => {
                            const claveSika = params.selectedPanel === 'R804171' ? 'S804720SC' : 'S804601SC';
                            const sikaProduct = catalog.find(p => p.clave === claveSika);
                            const descripcion = selectedRecipe.humedad
                              ? 'SikaWall®-151 Plus: Blindaje hidrófugo y acabado perfecto.'
                              : 'SikaWall®-131 Base: Muros más resistentes y sin grietas.';
                            return (
                              <div className="flex items-center gap-4">
                                {sikaProduct?.imagen ? (
                                  <img src={sikaProduct.imagen} alt={sikaProduct.descripcion || sikaProduct.clave} className="w-14 h-14 rounded-xl object-cover" />
                                ) : (
                                  <div className="w-14 h-14 bg-[#0092FF]/10 rounded-xl flex items-center justify-center">
                                    <Shield size={24} className="text-[#0092FF]" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-[#031D5F]">{sikaProduct?.descripcion || sikaProduct?.desc || 'SikaWall'}</p>
                                  <p className="text-xs text-[#031D5F]/70 mt-0.5 leading-relaxed">{descripcion}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <ToggleSwitch
                          checked={params.adherencia}
                          onChange={e => setParams({...params, adherencia: e.target.checked})}
                          label="Mejorar adherencia (Sikalatex N)"
                          tooltip="Mezcla 200 ml por bulto de SikaWall + lechada superficial (diluir 3:1 con agua, 1 L rinde 20 m²)."
                        />

                        {params.adherencia && (
                          <div className="p-4 bg-white rounded-2xl border border-[#0092FF]/20 shadow-sm animate-fadeIn">
                            {(() => {
                              const sikalatex = catalog.find(p => p.clave === 'S96657CU');
                              const imagenSikalatex = getProductImage(sikalatex);
                              return (
                                <div className="flex items-center gap-4">
                                  {imagenSikalatex ? (
                                    <img src={imagenSikalatex} alt={sikalatex?.descripcion || sikalatex?.clave} className="w-14 h-14 rounded-xl object-cover" />
                                  ) : (
                                    <div className="w-14 h-14 bg-[#0092FF]/10 rounded-xl flex items-center justify-center">
                                      <Sparkles size={24} className="text-[#0092FF]" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#031D5F]">SIKALATEX N</p>
                                    <p className="text-xs text-[#031D5F]/70 mt-0.5 leading-relaxed">
                                      Mezcla 200 ml por bulto de SikaWall. Como lechada se diluye 3:1 con agua (1 L rinde 20 m²).
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedRecipe.permitir_pintura && (
                  <div className="space-y-3 border-t border-[#031D5F]/10 pt-4">
                    <ToggleSwitch checked={params.incluirPintura} onChange={e => setParams({...params, incluirPintura: e.target.checked})} label="Pintar el plafón" tooltip="Elige el tipo de pintura y superficie." />
                    {params.incluirPintura && (
                      <div className="mt-4 space-y-3 animate-fadeIn">
                        <div>
                          <label className="text-xs font-semibold text-[#031D5F]/60 mb-2 block">Tipo de pintura</label>
                          <div className="grid grid-cols-2 gap-2">
                            {catalog.filter(p => p.tipo === 'pintura').map(p => (
                              <button
                                key={p.clave}
                                onClick={() => setParams({...params, pinturaSeleccionada: p.clave})}
                                className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                                  params.pinturaSeleccionada === p.clave ? 'border-[#0092FF] bg-white shadow-md' : 'border-[#031D5F]/10 hover:border-[#0092FF]/30 bg-white/50'
                                }`}
                              >
                                {p.imagen ? (
                                  <img src={p.imagen} alt={p.desc || p.clave} className="w-12 h-12 object-cover rounded-lg mb-1" />
                                ) : (
                                  <div className="w-12 h-12 bg-[#031D5F]/5 rounded-lg flex items-center justify-center mb-1">
                                    <PaintBucket size={24} className="text-[#031D5F]/30" />
                                  </div>
                                )}
                                <span className="text-xs font-bold text-[#031D5F] text-center leading-tight">{p.descripcion || p.desc || p.clave}</span>
                                {params.pinturaSeleccionada === p.clave && (
                                  <CheckCircle size={16} className="absolute top-2 right-2 text-[#0092FF]" />
                                )}
                              </button>
                            ))}
                          </div>
                          {params.pinturaSeleccionada && (
                            <div className="mt-2 bg-white rounded-lg p-2 text-xs text-[#031D5F]/70">
                              {catalog.find(p => p.clave === params.pinturaSeleccionada)?.marca || ''}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#031D5F]/60 mb-1 inline-flex items-center gap-1">Superficie <InteractiveTooltip content="Sin sellar, el rendimiento de la pintura baja drásticamente porque el muro la absorbe en exceso. Úsalo para ahorrar litros y asegurar un color uniforme."><HelpCircle size={12} /></InteractiveTooltip></label>
                          <SegmentedGauge
                            options={[{v:"lisa",label:"Sellada"},{v:"rugosa",label:"Directa"}]}
                            value={params.superficie}
                            onChange={v => setParams({...params, superficie: v})}
                          />
                        </div>
                        {params.superficie === 'lisa' && (
                          <div className="animate-fadeIn">
                            <label className="text-xs font-semibold text-[#031D5F]/60 mb-2 block">Sellador</label>
                            <div className="grid grid-cols-2 gap-2">
                              {catalog.filter(p => p.tipo === 'sellador').map(p => (
                                <button
                                  key={p.clave}
                                  onClick={() => setParams({...params, selladorSeleccionado: p.clave})}
                                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                                    params.selladorSeleccionado === p.clave ? 'border-[#0092FF] bg-white shadow-md' : 'border-[#031D5F]/10 hover:border-[#0092FF]/30 bg-white/50'
                                  }`}
                                >
                                  {p.imagen ? (
                                    <img src={p.imagen} alt={p.desc || p.clave} className="w-12 h-12 object-cover rounded-lg mb-1" />
                                  ) : (
                                    <div className="w-12 h-12 bg-[#031D5F]/5 rounded-lg flex items-center justify-center mb-1">
                                      <PaintBucket size={24} className="text-[#031D5F]/30" />
                                    </div>
                                  )}
                                  <span className="text-xs font-bold text-[#031D5F] text-center leading-tight">{p.descripcion || p.desc || p.clave}</span>
                                  {params.selladorSeleccionado === p.clave && (
                                    <CheckCircle size={16} className="absolute top-2 right-2 text-[#0092FF]" />
                                  )}
                                </button>
                              ))}
                            </div>
                            {params.selladorSeleccionado && (
                              <div className="mt-2 bg-white rounded-lg p-2 text-xs text-[#031D5F]/70">
                                {catalog.find(p => p.clave === params.selladorSeleccionado)?.marca || ''}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-[#031D5F]/5 rounded-2xl p-3">
                  <ToggleSwitch
                    checked={params.incluirSellado}
                    onChange={e => setParams({...params, incluirSellado: e.target.checked})}
                    label="Sellado perimetral (SikaCryl)"
                    tooltip="Sella uniones y esquinas de tablaroca evitando grietas por vibración. Seca rápido, es lijable y garantiza un pintado impecable y sin marcas."
                  />
                  {params.incluirSellado && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-[#0092FF]/20 flex items-center gap-3">
                      {(() => {
                        const panelEspecial = ['R803499','R500077','R800495'].includes(params.selectedPanel);
                        const clave = (selectedRecipe.humedad || panelEspecial) ? 'S496564CA' : 'S451874CA';
                        const prod = catalog.find(p => p.clave === clave);
                        return (
                          <>
                            {prod?.imagen ? (
                              <img src={prod.imagen} alt={prod.descripcion || 'SikaCryl'} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-[#0092FF]/10 rounded-lg flex items-center justify-center">
                                <PaintBucket size={18} className="text-[#0092FF]" />
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-[#031D5F]">
                                {(selectedRecipe.humedad || panelEspecial)
                                  ? 'SIKACRYL 150 (Exterior/Panel especial)'
                                  : 'SIKACRYL 100 (Interior)'}
                              </p>
                              <p className="text-[10px] text-[#031D5F]/50">Cartucho 300 ml · 12 m lineales</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => { playBeep(400,50); navigator.vibrate?.(10); setStep(0); }} className="border border-[#031D5F]/20 text-[#031D5F] px-5 py-3 rounded-xl font-semibold hover:bg-[#031D5F]/5 active:scale-95 transition-all">
                  <ArrowLeft size={18} /> Volver
                </button>
                <button onClick={handleCalculate} disabled={isCalculating} className="flex items-center gap-2 bg-[#0092FF] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#0092FF]/90 active:scale-95 transition-all shadow-lg shadow-[#0092FF]/20 disabled:opacity-70 btn-ripple">
                  {isCalculating ? (
                    <><Loader2 size={18} className="animate-spin" /> Calculando…</>
                  ) : (
                    <>Calcular materiales <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-50 border border-red-300 rounded-xl px-4 py-3 shadow-lg animate-fadeIn">
          <AlertCircle size={18} className="text-red-600" />
          <span className="text-sm text-red-800 font-medium">{errorMsg}</span>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-white border border-green-200 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 animate-fadeIn z-50">
          <CheckCircle size={20} className="text-[#D4AF37]" />
          <div>
            <span className="text-sm font-bold text-[#031D5F]">Cálculo Exitoso</span>
            <span className="text-xs text-[#031D5F]/50">Materiales generados.</span>
          </div>
        </div>
      )}

      {results && (
        <div className="mt-8 animate-fadeIn shutter-reveal">
          <button onClick={handleBackToForm} className="mb-6 flex items-center gap-2 text-[#0092FF] hover:underline text-sm font-semibold">
            ← Ajustar opciones
          </button>
          <ResultsSimple materials={results} />
          <div className="flex gap-3 mt-8">
            <button onClick={downloadPDF} className="flex-1 flex items-center justify-center gap-2 bg-[#031D5F] text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-[#031D5F]/90 transition active:scale-95">
              <FileDown size={16} /> Descargar PDF
            </button>
            <button onClick={shareText} className="flex-1 flex items-center justify-center gap-2 bg-[#0092FF] text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-[#0092FF]/90 transition active:scale-95">
              <Share2 size={16} /> Solicitar Cotización
            </button>
          </div>
        </div>
      )}
    </div>
  );
}