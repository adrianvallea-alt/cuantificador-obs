import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { calculateFromRecipe } from '../utils/calculationsAdvanced';
import ResultsSimple from './ResultsSimple';
import { fetchCatalog } from '../api';
import {
  Plus, Trash2, X, DoorOpen, AppWindow, CheckCircle,
  ArrowRight, ArrowLeft, Shield, AlertCircle,
  HelpCircle, Ruler, PaintBucket, Sparkles, Loader2,
  Layers, Palette, Zap, FileDown, Share2
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

function StepIndicator({ steps, current, stepValidation }) {
  const icons = [Ruler, Layers, Palette];
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {steps.map((label, idx) => {
        const Icon = icons[idx];
        const isCompleted = idx < current;
        const isActive = idx === current;
        const hasError = stepValidation && stepValidation[idx] === false;
        return (
          <div key={label} className="flex flex-col items-center gap-1 relative flex-1">
            <div className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${
              isCompleted ? 'bg-[#0092FF] text-white' :
              isActive ? 'bg-[#0092FF] text-white shadow-lg shadow-[#0092FF]/30 scale-110' :
              'bg-[#031D5F]/10 text-[#031D5F]/40'
            }`}>
              <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
              {isCompleted && <CheckCircle size={14} className="absolute -top-1 -right-1 text-[#D4AF37] bg-white rounded-full" />}
              {hasError && !isCompleted && <AlertCircle size={14} className="absolute -top-1 -right-1 text-amber-500 bg-white rounded-full" />}
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

function getProductImage(product) {
  if (!product) return null;
  return product.imagen || product.foto || product.url || product.image || null;
}

function SegmentedGauge({ options, value, onChange }) {
  const { playBeep } = useSound();
  const [animatingIdx, setAnimatingIdx] = useState(null);
  const cols = options.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

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

function DoorIcon({ width, height }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="#EF4444" strokeWidth="1.5" fill="#FEE2E2" />
      <circle cx="17" cy="12" r="1.5" fill="#EF4444" />
      <line x1="4" y1="2" x2="4" y2="22" stroke="#EF4444" strokeWidth="1.5" />
    </svg>
  );
}

function WindowIcon({ width, height }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#3B82F6" strokeWidth="1.5" fill="#DBEAFE" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="#3B82F6" strokeWidth="1.5" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="#3B82F6" strokeWidth="1.5" />
    </svg>
  );
}

function WallSchematic({ largo, alto, puertas, ventanas }) {
  if (!largo || !alto || largo <= 0 || alto <= 0) return null;
  const scale = 260 / Math.max(largo, alto);
  const wallWidth = largo * scale;
  const wallHeight = alto * scale;
  const padding = 30;
  const viewW = wallWidth + padding * 2;
  const viewH = wallHeight + padding * 2;
  const offsetX = padding;
  const offsetY = padding;
  let currentX = offsetX + 6;
  const aberturaSlots = [];
  puertas?.forEach((p) => {
    const pw = p.ancho * scale;
    const ph = p.alto * scale;
    if (currentX + pw > offsetX + wallWidth) return;
    aberturaSlots.push({ x: currentX, y: offsetY + wallHeight - ph, w: pw, h: ph, type: 'puerta' });
    currentX += pw + 8;
  });
  ventanas?.forEach((v) => {
    const vw = v.ancho * scale;
    const vh = v.alto * scale;
    if (currentX + vw > offsetX + wallWidth) return;
    aberturaSlots.push({ x: currentX, y: offsetY + wallHeight * 0.25, w: vw, h: vh, type: 'ventana' });
    currentX += vw + 8;
  });
  return (
    <div className="mt-6 mb-4 bg-[#031D5F]/[0.02] rounded-2xl p-3 border border-[#031D5F]/10">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-[#0092FF]" />
        <span className="text-[10px] font-semibold text-[#031D5F]/60 uppercase tracking-wider">Vista previa del muro</span>
      </div>
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full min-h-[180px]" preserveAspectRatio="xMidYMid meet">
        <rect x={offsetX} y={offsetY} width={wallWidth} height={wallHeight} fill="#ffffff" stroke="#0092FF" strokeWidth="2" rx="4" />
        {aberturaSlots.map((slot, idx) => (
          <g key={idx}>
            <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} fill={slot.type === 'puerta' ? '#FEE2E2' : '#DBEAFE'} stroke={slot.type === 'puerta' ? '#EF4444' : '#3B82F6'} strokeWidth="1.5" rx="3" />
            <foreignObject x={slot.x} y={slot.y} width={slot.w} height={slot.h}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {slot.type === 'puerta' ? <DoorIcon width={slot.w} height={slot.h} /> : <WindowIcon width={slot.w} height={slot.h} />}
              </div>
            </foreignObject>
          </g>
        ))}
        <text x={offsetX + wallWidth / 2} y={offsetY - 12} textAnchor="middle" className="text-[13px] font-semibold fill-[#031D5F]">{largo} m</text>
        <text x={offsetX - 18} y={offsetY + wallHeight / 2} textAnchor="middle" transform={`rotate(-90, ${offsetX - 18}, ${offsetY + wallHeight / 2})`} className="text-[13px] font-semibold fill-[#031D5F]">{alto} m</text>
      </svg>
    </div>
  );
}

function CalculatingBar() {
  return <div className="w-full bg-[#031D5F]/10 rounded-full h-2 overflow-hidden"><div className="progress-bar-fill h-full rounded-full" /></div>;
}

function InlineAbertura({ tipo, onAdd, isOpen, onToggle }) {
  const { playBeep } = useSound();
  const [ancho, setAncho] = useState(tipo === 'puerta' ? '0.90' : '1.20');
  const [alto, setAlto] = useState(tipo === 'puerta' ? '2.10' : '1.00');
  const handleAdd = () => {
    const w = parseFloat(ancho);
    const h = parseFloat(alto);
    if (!w || !h || w <= 0 || h <= 0) return;
    playBeep(500, 40);
    navigator.vibrate?.(10);
    onAdd({ ancho: w, alto: h });
    onToggle();
  };
  if (!isOpen) return null;
  return (
    <div className="mt-2 bg-[#031D5F]/5 rounded-2xl p-3 animate-fadeIn border border-[#0092FF]/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#031D5F]">{tipo === 'puerta' ? 'Puerta' : 'Ventana'}</span>
        <button onClick={onToggle} className="text-[#031D5F]/40 hover:text-[#0092FF]"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] font-medium text-[#031D5F]/60">Ancho (m)</label>
          <input type="number" step="0.01" value={ancho} onChange={e => setAncho(e.target.value)} className="w-full rounded-lg border-[#031D5F]/20 px-2 py-1.5 text-xs mono focus:ring-1 focus:ring-[#0092FF]/40" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#031D5F]/60">Alto (m)</label>
          <input type="number" step="0.01" value={alto} onChange={e => setAlto(e.target.value)} className="w-full rounded-lg border-[#031D5F]/20 px-2 py-1.5 text-xs mono focus:ring-1 focus:ring-[#0092FF]/40" />
        </div>
      </div>
      <button onClick={handleAdd} className="w-full bg-[#0092FF] text-white py-2 rounded-xl text-xs font-bold btn-ripple shadow-md shadow-[#0092FF]/20">Agregar</button>
    </div>
  );
}

/* ====================== COMPONENTE PRINCIPAL ====================== */
export default function CalculatorSimple({ recipe, onBack }) {
  const [catalog, setCatalog] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(recipe || null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [previousStep, setPreviousStep] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resistenteMsg, setResistenteMsg] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeCaraTab, setActiveCaraTab] = useState('A');
  const [results, setResults] = useState(null);
  const [expandedAbertura, setExpandedAbertura] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const { playBeep } = useSound();

  const [params, setParams] = useState({
    largo: '', alto: '', esquinas: '0', puertas: [], ventanas: [],
    separacionPostes: '0.406', factorCaras: '1',
    nivelCompuestoA: '0.75', nivelCompuestoB: '0.75',
    anchoPerfil: '4.10', calibre: '20',
    secadoRapido: false, aislamiento: false, refuerzos: false,
    selectedPanelA: '', selectedPanelB: '',
    incluirPintura: false, pinturaSeleccionada: '', superficie: 'lisa',
    selladorSeleccionado: '',
    incluirResistenteA: false, incluirResistenteB: false,
    adherencia: false, incluirSellado: false,
  });

  // ---------- PANELES EXTERIORES (REBORDE Y ESQUINA ESPECIALES) ----------
  const EXTERIOR_PANELS = ['R803499', 'R500077', 'R807609', 'R800495']; // Glass Rey, Permabase (agrega Guard, Ext Rey cuando tengas las claves)

  // ---------- HANDLERS ----------
  const handleRecipeSelect = useCallback((rec, catalogData) => {
    const cat = Array.isArray(catalogData) ? catalogData : [];
    setSelectedRecipe(rec);
    setStep(0);
    setErrorMsg('');
    if (!rec || !Array.isArray(rec.productos) || rec.productos.length === 0) {
      console.warn('La receta no tiene productos definidos.');
      return;
    }
    const panels = rec.productos.map(item => cat.find(p => p.clave === item.clave)).filter(p => p && p.tipo === 'panel');
    if (panels.length > 0) {
      setParams(prev => ({
        ...prev,
        selectedPanelA: panels[0]?.clave || '',
        selectedPanelB: panels.length > 1 ? panels[1]?.clave : panels[0]?.clave || '',
      }));
    }
  }, []);

  useEffect(() => {
    fetchCatalog()
      .then(data => {
        const validatedData = Array.isArray(data) ? data : [];
        setCatalog(validatedData);
        if (recipe) handleRecipeSelect(recipe, validatedData);
      })
      .catch(() => setErrorMsg('No se pudieron cargar los datos.'))
      .finally(() => setLoadingData(false));
  }, [recipe, handleRecipeSelect]);

  const availablePanels = useCallback(() => {
    if (!selectedRecipe || !Array.isArray(selectedRecipe.productos)) return [];
    const recipePanels = (catalog || []).filter(p =>
      selectedRecipe.productos.some(rp => rp.clave === p.clave) && p.tipo === 'panel'
    );
    const allowedClaves = ['R803499', 'R500077']; // Glass Rey, Permabase
    if (params.factorCaras === '1') {
      return recipePanels.filter(p => allowedClaves.includes(p.clave));
    }
    if (activeCaraTab === 'A') {
      return recipePanels.filter(p => allowedClaves.includes(p.clave));
    }
    return recipePanels;
  }, [selectedRecipe, catalog, params.factorCaras, activeCaraTab]);

  useEffect(() => {
    const panels = availablePanels();
    if (panels.length === 0) return;
    if (activeCaraTab === 'A') {
      if (!panels.some(p => p.clave === params.selectedPanelA)) {
        setParams(prev => ({ ...prev, selectedPanelA: panels[0].clave }));
      }
    } else {
      if (!panels.some(p => p.clave === params.selectedPanelB)) {
        setParams(prev => ({ ...prev, selectedPanelB: panels[0].clave }));
      }
    }
  }, [availablePanels, params.selectedPanelA, params.selectedPanelB, activeCaraTab]);

  const handleBackToSelection = () => {
    if (onBack) onBack();
    else { setSelectedRecipe(null); setResults(null); setStep(0); }
  };

  const getNumericParams = () => ({
    ...params,
    largo: parseFloat(params.largo),
    alto: parseFloat(params.alto),
    esquinas: parseInt(params.esquinas) || 0,
    separacionPostes: parseFloat(params.separacionPostes),
    factorCaras: parseFloat(params.factorCaras),
    nivelCompuestoA: parseFloat(params.nivelCompuestoA),
    nivelCompuestoB: parseFloat(params.nivelCompuestoB),
    anchoPerfil: parseFloat(params.anchoPerfil),
    calibre: 20,
    puertas: (params.puertas || []).map(p => ({ ancho: parseFloat(p.ancho) || 0, alto: parseFloat(p.alto) || 0 })),
    ventanas: (params.ventanas || []).map(v => ({ ancho: parseFloat(v.ancho) || 0, alto: parseFloat(v.alto) || 0 })),
  });

  const addAbertura = (tipo, dim) => {
    playBeep(500, 40);
    navigator.vibrate?.(10);
    if (tipo === 'puerta') setParams(p => ({ ...p, puertas: [...(p.puertas || []), dim] }));
    else setParams(p => ({ ...p, ventanas: [...(p.ventanas || []), dim] }));
  };
  const removeAbertura = (tipo, index) => {
    playBeep(300, 30);
    navigator.vibrate?.(10);
    if (tipo === 'puerta') setParams(p => ({ ...p, puertas: (p.puertas || []).filter((_, i) => i !== index) }));
    else setParams(p => ({ ...p, ventanas: (p.ventanas || []).filter((_, i) => i !== index) }));
  };

  const handleToggleResistenteA = (checked) => {
    playBeep(700, 50);
    navigator.vibrate?.(10);
    setParams(prev => ({ ...prev, incluirResistenteA: checked, nivelCompuestoA: checked ? '0.2' : prev.nivelCompuestoA, adherencia: false }));
    if (checked) setResistenteMsg('Cara Exterior optimizada: SikaWall® sobre Nivel 1.');
    else setResistenteMsg('');
  };
  const handleToggleResistenteB = (checked) => {
    playBeep(700, 50);
    navigator.vibrate?.(10);
    setParams(prev => ({ ...prev, incluirResistenteB: checked, nivelCompuestoB: checked ? '0.2' : prev.nivelCompuestoB, adherencia: false }));
    if (checked) setResistenteMsg('Contrafachada optimizada: SikaWall® sobre Nivel 1.');
    else setResistenteMsg('');
  };

  // ---------- CÁLCULO PRINCIPAL ----------
  const handleCalculate = () => {
    const numParams = getNumericParams();
    if (!numParams.largo || numParams.largo <= 0 || !numParams.alto || numParams.alto <= 0) {
      setErrorMsg('Ingresa largo y alto válidos.');
      return;
    }
    setErrorMsg('');
    setPreviousStep(step);
    setIsCalculating(true);

    // Determinar si se deben reemplazar reborde y esquinero
    const necesitaEspeciales =
      selectedRecipe.humedad === 1 && // Solo si la receta es zona húmeda/exterior
      (EXTERIOR_PANELS.includes(params.selectedPanelA) || EXTERIOR_PANELS.includes(params.selectedPanelB));

    let recetaFinal = selectedRecipe;
    if (necesitaEspeciales) {
      recetaFinal = {
        ...selectedRecipe,
        productos: selectedRecipe.productos.map(prod => {
          if (prod.clave === 'R800474') return { ...prod, clave: 'R801675' }; // Reborde J 1/2" ancho 3.05m
          if (prod.clave === 'R800479') return { ...prod, clave: 'R500129' }; // Esquinero vinílico 90G
          return prod;
        })
      };
    }

    setTimeout(() => {
      const materials = calculateFromRecipe(recetaFinal, {
        ...numParams,
        secadoRapido: params.secadoRapido,
        aislamiento: params.aislamiento,
        refuerzos: params.refuerzos,
        incluirPintura: params.incluirPintura,
        pinturaSeleccionada: params.pinturaSeleccionada,
        superficie: params.superficie,
        selladorSeleccionado: params.selladorSeleccionado,
        incluirResistenteA: params.incluirResistenteA,
        incluirResistenteB: params.incluirResistenteB,
        adherencia: params.adherencia,
        incluirSellado: params.incluirSellado,
        selectedPanelA: params.selectedPanelA,
        selectedPanelB: params.selectedPanelB,
      }, catalog);
      setResults(materials);
      setIsCalculating(false);
      playBeep(1000, 100, 'triangle');
      navigator.vibrate?.(15);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 400);
  };

  const handleBackToForm = () => { setResults(null); setStep(previousStep); };

  // ---------- PDF ----------
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
    const a = document.createElement('a'); a.href = url; a.download = 'cotizacion-obs.pdf'; a.click();
    URL.revokeObjectURL(url);
  };

  const shareText = () => {
    if (!results || results.length === 0) return;
    const lines = results.map(item => {
      const desc = item.product?.desc || item.product?.descripcion || item.product?.clave || '';
      const cantidad = item.quantity != null ? item.quantity : '';
      const unidad = item.unit ? (item.quantity === 1 ? 'pieza' : 'piezas') : '';
      return `- ${desc}: ${cantidad} ${unidad}`;
    });
    const message = `CUANTIFICADOR OBS\nMateriales calculados:\n\n${lines.join('\n')}\n\nSolicito cotización de estos productos. Gracias.`;
    const url = `https://wa.me/5214434719644?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Validaciones y navegación
  const stepValidation = useMemo(() => {
    const v = [true, true, true];
    const l = parseFloat(params.largo);
    const a = parseFloat(params.alto);
    if (step === 0) v[0] = l > 0 && a > 0;
    else if (step === 1) v[1] = !!params.selectedPanelA && (params.factorCaras !== '2' || !!params.selectedPanelB);
    return v;
  }, [step, params.largo, params.alto, params.selectedPanelA, params.selectedPanelB, params.factorCaras]);

  const isStepValid = (idx) => stepValidation[idx] !== false;

  const goToStep = (newStep) => {
    if (newStep === step) return;
    playBeep(400, 50);
    navigator.vibrate?.(10);
    setDirection(newStep > step ? 'forward' : 'backward');
    setStep(newStep);
  };

  const onTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) {
      if (delta < 0 && step < 2) goToStep(step + 1);
      else if (delta > 0 && step > 0) goToStep(step - 1);
    }
    setTouchStartX(null);
  };

  const steps = ['Medidas', 'Características', 'Acabado'];

  const inputErrorClass = (field) => {
    if (step === 0 && field === 'largo' && (!params.largo || parseFloat(params.largo) <= 0)) return 'border-red-400 focus:ring-red-300';
    if (step === 0 && field === 'alto' && (!params.alto || parseFloat(params.alto) <= 0)) return 'border-red-400 focus:ring-red-300';
    return 'border-[#031D5F]/20 focus:ring-[#0092FF]/40';
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
        <p className="text-[#031D5F]/50 mt-6">Selecciona un proyecto.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
          <StepIndicator steps={steps} current={step} stepValidation={stepValidation} />
          <div className="relative">
            {/* STEP 0: MEDIDAS (sin cambios) */}
            {step === 0 && (
              <div key="step0" className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
                <div className="bg-white rounded-3xl card-depth p-6 border border-[#031D5F]/5">
                  <h3 className="text-lg font-bold text-[#031D5F] mb-1"><span className="border-b-2 border-[#D4AF37]/30 pb-0.5">📏 MEDIDAS DEL MURO</span></h3>
                  <p className="text-sm text-[#031D5F]/50 mb-6">Inserta las medidas de tu muro exterior.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Largo (m)</label>
                      <input type="number" step="0.01" inputMode="decimal" value={params.largo} onChange={e => setParams({...params, largo: e.target.value})} placeholder="5.00" className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 transition-all ${inputErrorClass('largo')}`} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Altura (m)</label>
                      <input type="number" step="0.01" inputMode="decimal" value={params.alto} onChange={e => setParams({...params, alto: e.target.value})} placeholder="2.44" className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 transition-all ${inputErrorClass('alto')}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Esquinas</label>
                      <input type="number" inputMode="numeric" value={params.esquinas} onChange={e => setParams({...params, esquinas: e.target.value})} className="w-full rounded-xl border-[#031D5F]/20 px-3 py-3 text-sm focus:ring-2 focus:ring-[#0092FF]/40" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#031D5F]/70 mb-1 block">Separación postes</label>
                      <SegmentedGauge options={[{v:"0.305",label:"30.5cm"},{v:"0.406",label:"40.6cm"}]} value={params.separacionPostes} onChange={v => setParams({...params, separacionPostes: v})} />
                    </div>
                  </div>

                  <div className="border-t border-[#031D5F]/10 pt-5 mb-6">
                    <h4 className="text-sm font-bold text-[#031D5F] mb-3">💪 PERFIL METÁLICO</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[#031D5F]/60 mb-1 block">Ancho perfil</label>
                        <SegmentedGauge options={[{v:"4.10",label:"4.10cm"},{v:"6.35",label:"6.35cm"},{v:"9.20",label:"9.20cm"}]} value={params.anchoPerfil} onChange={v => setParams({...params, anchoPerfil: v})} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#031D5F]/60 mb-1 block">Calibre</label>
                        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#031D5F]/5 text-xs font-semibold text-[#031D5F]">
                          <Shield size={14} className="text-[#0092FF]" /> Calibre 20 (Estructural)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#031D5F]/10 pt-5 mb-6">
                    <h4 className="text-sm font-bold text-[#031D5F] mb-3">⚙️ OPCIONES</h4>
                    {selectedRecipe.permitir_aislamiento && <ToggleSwitch checked={params.aislamiento} onChange={e => setParams({...params, aislamiento: e.target.checked})} label="Aislamiento" tooltip="Reduce ruido y temperatura." />}
                    {selectedRecipe.permitir_refuerzos && <ToggleSwitch checked={params.refuerzos} onChange={e => setParams({...params, refuerzos: e.target.checked})} label="Refuerzos horizontales" tooltip="Añade rigidez estructural." />}
                  </div>

                  <div className="border-t border-[#031D5F]/10 pt-5">
                    <h4 className="text-sm font-bold text-[#031D5F] mb-2">🚪 PUERTAS / VENTANAS</h4>
                    <div className="flex gap-3 mb-3">
                      <button onClick={() => setExpandedAbertura('puerta')} className="flex-1 flex items-center justify-center gap-1 border-2 border-dashed border-[#0092FF]/20 rounded-2xl py-3 hover:border-[#0092FF]/50 active:scale-95"><Plus size={16} className="text-[#0092FF]" /> Puerta</button>
                      <button onClick={() => setExpandedAbertura('ventana')} className="flex-1 flex items-center justify-center gap-1 border-2 border-dashed border-[#0092FF]/20 rounded-2xl py-3 hover:border-[#0092FF]/50 active:scale-95"><Plus size={16} className="text-[#0092FF]" /> Ventana</button>
                    </div>
                    <InlineAbertura tipo="puerta" onAdd={(dim) => addAbertura('puerta', dim)} isOpen={expandedAbertura === 'puerta'} onToggle={() => setExpandedAbertura(null)} />
                    <InlineAbertura tipo="ventana" onAdd={(dim) => addAbertura('ventana', dim)} isOpen={expandedAbertura === 'ventana'} onToggle={() => setExpandedAbertura(null)} />

                    {params.puertas?.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs text-[#031D5F]/50">Puertas añadidas:</span>
                        {params.puertas.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#0092FF]/5 rounded-lg p-2 mt-1">
                            <span className="text-sm text-[#031D5F]">{p.ancho}m × {p.alto}m</span>
                            <button onClick={() => removeAbertura('puerta', i)} className="text-red-500"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {params.ventanas?.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-[#031D5F]/50">Ventanas añadidas:</span>
                        {params.ventanas.map((v, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#0092FF]/5 rounded-lg p-2 mt-1">
                            <span className="text-sm text-[#031D5F]">{v.ancho}m × {v.alto}m</span>
                            <button onClick={() => removeAbertura('ventana', i)} className="text-red-500"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <WallSchematic largo={parseFloat(params.largo)} alto={parseFloat(params.alto)} puertas={params.puertas} ventanas={params.ventanas} />

                  <div className="flex justify-end mt-8">
                    <button onClick={() => goToStep(1)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm btn-ripple ${isStepValid(0) ? 'bg-[#0092FF] text-white shadow-lg shadow-[#0092FF]/20 pulse-ready' : 'bg-[#031D5F]/10 text-[#031D5F]/40 cursor-not-allowed'}`} disabled={!isStepValid(0)}>
                      Siguiente <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: CARACTERÍSTICAS (con etiquetas Cara Exterior/Contrafachada) */}
            {step === 1 && (
              <div key="step1" className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
                <div className="bg-white rounded-3xl card-depth p-6 border border-[#031D5F]/5">
                  <h3 className="text-lg font-bold text-[#031D5F] mb-1"><span className="border-b-2 border-[#D4AF37]/30 pb-0.5">🧱 CARACTERÍSTICAS DEL MURO</span></h3>
                  <p className="text-sm text-[#031D5F]/50 mb-5">Elige la cantidad de capas y sus acabados.</p>

                  {(!selectedRecipe.productos || selectedRecipe.productos.length === 0) && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
                      La receta no tiene productos asignados.
                    </div>
                  )}

                  {resistenteMsg && (
                    <div className="mb-4 bg-[#0092FF]/5 border border-[#0092FF]/20 rounded-2xl p-3 flex items-start gap-2">
                      <Sparkles size={16} className="text-[#0092FF]" />
                      <p className="text-xs text-[#0092FF] font-medium">{resistenteMsg}</p>
                    </div>
                  )}

                  <div className="mb-5">
                    <label className="text-xs font-semibold text-[#031D5F]/70 mb-2 block">Caras a cubrir</label>
                    <SegmentedGauge options={[{v:"1",label:"1 Cara"},{v:"2",label:"2 Caras"}]} value={params.factorCaras} onChange={v => { setParams({...params, factorCaras: v}); if(v==="1") setActiveCaraTab('A'); }} />
                  </div>

                  {params.factorCaras === '2' && (
                    <div className="flex border-b border-[#031D5F]/10 mb-4">
                      <button onClick={() => setActiveCaraTab('A')} className={`flex-1 py-2 text-xs font-bold border-b-2 ${activeCaraTab==='A'?'border-[#0092FF] text-[#0092FF]':'border-transparent text-[#031D5F]/40'}`}><Layers size={14}/> Cara Exterior</button>
                      <button onClick={() => setActiveCaraTab('B')} className={`flex-1 py-2 text-xs font-bold border-b-2 ${activeCaraTab==='B'?'border-[#0092FF] text-[#0092FF]':'border-transparent text-[#031D5F]/40'}`}><Layers size={14}/> Contrafachada</button>
                    </div>
                  )}

                  {availablePanels().length > 0 ? (
                    <div className="bg-[#031D5F]/5 rounded-2xl p-4 border border-[#031D5F]/10 mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-extrabold text-[#031D5F] uppercase">
                          {params.factorCaras === '1' ? 'Panel' : activeCaraTab === 'A' ? 'Panel Exterior' : 'Panel Contrafachada'}
                        </span>
                      </div>
                      <label className="text-xs text-[#031D5F]/50 mb-1 block">Tipo de placa</label>
                      <select value={activeCaraTab==='A'?params.selectedPanelA:params.selectedPanelB} onChange={e => setParams({...params, [activeCaraTab==='A'?'selectedPanelA':'selectedPanelB']: e.target.value})} className="w-full rounded-xl border-[#031D5F]/20 px-3 py-2.5 text-sm text-[#031D5F] focus:ring-2 focus:ring-[#0092FF]/40 mb-3 bg-white">
                        {availablePanels().map(p => <option key={p.clave} value={p.clave}>{p.desc || p.descripcion || p.clave}</option>)}
                      </select>

                      {!(activeCaraTab==='A'?params.incluirResistenteA:params.incluirResistenteB) ? (
                        <div>
                          <label className="text-xs text-[#031D5F]/50 mb-1 inline-flex items-center gap-1">Nivel de acabado <NivelTooltip nivel={activeCaraTab==='A'?params.nivelCompuestoA:params.nivelCompuestoB} /></label>
                          <SegmentedGauge options={[{v:"0.2",label:"N1"},{v:"0.45",label:"N2"},{v:"0.75",label:"N3"},{v:"1.0",label:"N4"},{v:"1.4",label:"N5"}]} value={activeCaraTab==='A'?params.nivelCompuestoA:params.nivelCompuestoB} onChange={v => setParams({...params, [activeCaraTab==='A'?'nivelCompuestoA':'nivelCompuestoB']: v})} />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#0092FF]/30 bg-[#0092FF]/5 px-3 py-2 text-xs text-[#0092FF] font-semibold flex items-center gap-2">
                          <Shield size={14} /> N1 Automático – SikaWall®
                        </div>
                      )}

                      {selectedRecipe.permitir_resistente && (
                        <div className="border-t border-[#031D5F]/10 pt-3 mt-3">
                          <ToggleSwitch checked={activeCaraTab==='A'?params.incluirResistenteA:params.incluirResistenteB} onChange={e => activeCaraTab==='A'?handleToggleResistenteA(e.target.checked):handleToggleResistenteB(e.target.checked)} label="SikaWall®" tooltip="Alta resistencia a impacto y humedad." />
                          {(activeCaraTab==='A'?params.incluirResistenteA:params.incluirResistenteB) && (
                            <div className="mt-2 flex items-center gap-3 bg-white p-2 rounded-xl border border-[#0092FF]/20 animate-fadeIn">
                              {(() => {
                                const currentPanel = activeCaraTab === 'A' ? params.selectedPanelA : params.selectedPanelB;
                                const clave = currentPanel === 'R804171' ? 'S804720SC' : 'S804601SC';
                                const prod = catalog.find(p => p.clave === clave);
                                const img = getProductImage(prod);
                                return (
                                  <>
                                    {img ? <img src={img} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 bg-[#0092FF]/10 rounded-lg flex items-center justify-center"><Shield size={16} className="text-[#0092FF]" /></div>}
                                    <div>
                                      <p className="text-xs font-bold text-[#031D5F] uppercase">{prod?.descripcion || prod?.desc || clave}</p>
                                      <p className="text-[10px] text-[#031D5F]/50">{clave === 'S804720SC' ? 'SikaWall®-131 Base Coat' : 'SikaWall®-151 Plus Multiusos'}</p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#031D5F]/5 rounded-2xl p-4 border border-[#031D5F]/10 mb-4 text-center text-sm text-[#031D5F]/50">
                      No hay paneles disponibles para esta configuración.
                    </div>
                  )}

                  {(params.incluirResistenteA || params.incluirResistenteB) && (
                    <div className="mb-3">
                      <ToggleSwitch checked={params.adherencia} onChange={e => setParams({...params, adherencia: e.target.checked})} label="Sikalatex® N" tooltip="Mejora adherencia." />
                      {params.adherencia && (
                        <div className="mt-2 flex items-center gap-3 bg-white p-2 rounded-xl border border-[#0092FF]/20 animate-fadeIn">
                          {(() => {
                            const prod = catalog.find(p => p.clave === 'S96657CU');
                            const img = getProductImage(prod);
                            return (
                              <>
                                {img ? <img src={img} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 bg-[#0092FF]/10 rounded-lg flex items-center justify-center"><Sparkles size={16} className="text-[#0092FF]" /></div>}
                                <div>
                                  <p className="text-xs font-bold text-[#031D5F]">SIKALATEX® N</p>
                                  <p className="text-[10px] text-[#031D5F]/50">200 ml/saco. Lechada 3:1</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRecipe.permitir_secado_rapido && (params.selectedPanelA==='R804171'||params.selectedPanelB==='R804171') && !(params.incluirResistenteA&&params.incluirResistenteB) && (
                    <ToggleSwitch checked={params.secadoRapido} onChange={e => setParams({...params, secadoRapido: e.target.checked})} label="Secado rápido (45 min)" tooltip="Compuesto de fraguado rápido." />
                  )}

                  <div className="flex justify-between mt-6">
                    <button onClick={() => goToStep(0)} className="border border-[#031D5F]/20 text-[#031D5F] px-5 py-2.5 rounded-xl font-semibold text-sm">← Volver</button>
                    <button onClick={() => goToStep(2)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm btn-ripple ${isStepValid(1) ? 'bg-[#0092FF] text-white shadow-lg shadow-[#0092FF]/20 pulse-ready' : 'bg-[#031D5F]/10 text-[#031D5F]/40 cursor-not-allowed'}`} disabled={!isStepValid(1)}>
                      Siguiente <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ACABADO FINAL (sin cambios relevantes) */}
            {step === 2 && (
  <div key="step2" className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
    <div className="bg-white rounded-3xl card-depth p-6 border border-[#031D5F]/5">
      <h3 className="text-lg font-bold text-[#031D5F] mb-1"><span className="border-b-2 border-[#D4AF37]/30 pb-0.5">✨ ACABADO FINAL</span></h3>
      <p className="text-sm text-[#031D5F]/50 mb-6">Pinta tu muro y dale un acabado premium.</p>

      {selectedRecipe.permitir_pintura && (
        <div className="bg-[#031D5F]/5 rounded-2xl p-4 border border-[#031D5F]/10 mb-4">
          <ToggleSwitch checked={params.incluirPintura} onChange={e => setParams({...params, incluirPintura: e.target.checked})} label="Pintura" />
          {params.incluirPintura && (
            <div className="mt-4 space-y-4 animate-fadeIn">
              <div>
                <label className="text-xs font-semibold text-[#031D5F]/60 mb-2 block">Tipo de pintura</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Array.isArray(catalog)?catalog.filter(p=>p.tipo==='pintura'):[]).map(p => (
                    <button
                      key={p.clave}
                      onClick={() => setParams({...params, pinturaSeleccionada: p.clave})}
                      className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${params.pinturaSeleccionada===p.clave?'border-[#0092FF] bg-white shadow-md':'border-[#031D5F]/10 hover:border-[#0092FF]/30 bg-white/50'}`}
                    >
                      {p.imagen ? <img src={p.imagen} alt="" className="w-12 h-12 object-cover rounded-lg mb-1" /> : <PaintBucket size={24} className="text-[#031D5F]/30" />}
                      <span className="text-xs font-bold text-[#031D5F] text-center leading-tight">{p.descripcion || p.desc || p.clave}</span>
                      {params.pinturaSeleccionada===p.clave && <CheckCircle size={14} className="absolute top-1 right-1 text-[#D4AF37]" />}
                    </button>
                  ))}
                </div>
                {params.pinturaSeleccionada && (
                  <div className="mt-2 bg-white rounded-lg p-2 text-xs text-[#031D5F]/70">
                    {(() => {
                      const selected = catalog.find(p => p.clave === params.pinturaSeleccionada);
                      return selected?.marca || selected?.descripcion || selected?.desc || '';
                    })()}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#031D5F]/60 mb-1 inline-flex items-center gap-1">Superficie <InteractiveTooltip content="Sin sellar, el rendimiento de la pintura baja drásticamente."><HelpCircle size={12} /></InteractiveTooltip></label>
                <SegmentedGauge options={[{v:"lisa",label:"Sellada"},{v:"rugosa",label:"Directa"}]} value={params.superficie} onChange={v => setParams({...params, superficie: v})} />
              </div>
              {params.superficie==='lisa' && (
                <div className="animate-fadeIn">
                  <label className="text-xs font-semibold text-[#031D5F]/60 mb-2 block">Sellador</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Array.isArray(catalog)?catalog.filter(p=>p.tipo==='sellador'):[]).map(p => (
                      <button
                        key={p.clave}
                        onClick={() => setParams({...params, selladorSeleccionado: p.clave})}
                        className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${params.selladorSeleccionado===p.clave?'border-[#0092FF] bg-white shadow-md':'border-[#031D5F]/10 hover:border-[#0092FF]/30 bg-white/50'}`}
                      >
                        {p.imagen ? <img src={p.imagen} alt="" className="w-12 h-12 object-cover rounded-lg mb-1" /> : <PaintBucket size={24} className="text-[#031D5F]/30" />}
                        <span className="text-xs font-bold text-[#031D5F] text-center leading-tight">{p.descripcion||p.desc||p.clave}</span>
                        {params.selladorSeleccionado===p.clave && <CheckCircle size={14} className="absolute top-1 right-1 text-[#D4AF37]" />}
                      </button>
                    ))}
                  </div>
                  {params.selladorSeleccionado && (
                    <div className="mt-2 bg-white rounded-lg p-2 text-xs text-[#031D5F]/70">
                      {(() => {
                        const selected = catalog.find(p => p.clave === params.selladorSeleccionado);
                        return selected?.marca || selected?.descripcion || selected?.desc || '';
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SikaCryl® sin cambios */}
      <div className="bg-[#031D5F]/5 rounded-2xl p-4 border border-[#031D5F]/10">
        <ToggleSwitch checked={params.incluirSellado} onChange={e => setParams({...params, incluirSellado: e.target.checked})} label="Sello perimetral (SikaCryl®)" tooltip="Sella uniones y esquinas." />
        {params.incluirSellado && (
          <div className="mt-3 p-3 bg-white rounded-xl border border-[#0092FF]/20 flex items-center gap-3 animate-fadeIn">
            {(() => {
              const algunPanelEspecial = ['R803499','R500077','R800495'].includes(params.selectedPanelA) || ['R803499','R500077','R800495'].includes(params.selectedPanelB);
              const clave = (selectedRecipe.humedad || algunPanelEspecial) ? 'S496564CA' : 'S451874CA';
              const prod = catalog.find(p => p.clave === clave);
              const img = getProductImage(prod);
              return (
                <>
                  {img ? <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 bg-[#0092FF]/10 rounded-lg flex items-center justify-center"><PaintBucket size={18} className="text-[#0092FF]" /></div>}
                  <div>
                    <p className="text-xs font-bold text-[#031D5F] uppercase">{(selectedRecipe.humedad || algunPanelEspecial) ? 'SIKACRYL®-150' : 'SIKACRYL®-100'}</p>
                    <p className="text-[10px] text-[#031D5F]/50">Cartucho 300 ml · 12 m lineales</p>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => goToStep(1)} className="border border-[#031D5F]/20 text-[#031D5F] px-5 py-2.5 rounded-xl font-semibold text-sm">← Volver</button>
        <button onClick={handleCalculate} disabled={isCalculating} className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm btn-ripple bg-[#0092FF] text-white shadow-lg shadow-[#0092FF]/20 pulse-ready">
          {isCalculating ? <><Loader2 size={16} className="animate-spin" /> Procesando…</> : <>Calcular materiales <ArrowRight size={16} /></>}
        </button>
      </div>
      {isCalculating && <div className="mt-4"><CalculatingBar /></div>}
    </div>
  </div>
)}
          </div>
        </>
      )}

      {/* RESULTADOS */}
      {results && (
        <div className="mt-6 animate-fadeIn shutter-reveal">
          <button onClick={handleBackToForm} className="mb-4 flex items-center gap-1 text-[#0092FF] text-sm font-semibold">← Ajustar opciones</button>
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
      )}

      {/* TOASTS Y ERRORES */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/70 backdrop-blur-lg border-t border-[#0092FF]/20 z-40">
        <div className="max-w-2xl mx-auto"></div>
      </div>
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
    </div>
  );
}