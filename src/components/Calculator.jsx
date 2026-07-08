import { useState } from 'react';
import { Calculator as CalcIcon } from 'lucide-react';
import { calculateMaterials, getStoredYields } from '../utils/calculations';
import ResultCard from './ResultCard';

/**
 * Sección principal de la calculadora pública.
 * Contiene el campo de metros cuadrados, el botón de cálculo
 * y la cuadrícula de resultados.
 */
export default function Calculator() {
  const [area, setArea] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    const m2 = parseFloat(area);
    if (isNaN(m2) || m2 <= 0) {
      setError('Ingresa un área válida mayor a 0 m²');
      setResults(null);
      return;
    }
    setError('');

    // Usamos los rendimientos almacenados (o los por defecto)
    const yields = getStoredYields();
    const materials = calculateMaterials(m2, yields);
    setResults(materials);
  };

  // Manejar Enter en el input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCalculate();
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Título y descripción */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-secondary mb-2">
          Calculadora de Drywall
        </h1>
        <p className="text-secondary/60 text-sm">
          Calculá los materiales necesarios para tu proyecto de construcción en seco.
        </p>
      </div>

      {/* Entrada de metros cuadrados */}
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
        <label
          htmlFor="area-input"
          className="block text-sm font-medium text-secondary mb-2"
        >
          Metros cuadrados (m²)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="area-input"
            type="number"
            min="0"
            step="0.01"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: 25"
            className="flex-1 rounded-xl border border-secondary/20 px-4 py-3 text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow shadow-sm"
          />
          <button
            onClick={handleCalculate}
            className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <CalcIcon className="w-5 h-5" />
            Calcular materiales
          </button>
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Resultados */}
      {results && (
        <div className="animate-fadeIn">
          <h2 className="text-xl font-semibold text-secondary mb-4 text-center">
            Materiales necesarios
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <ResultCard
              label="Placas"
              value={results.placas}
              unit="unidades"
              materialKey="placas"
            />
            <ResultCard
              label="Perfiles"
              value={results.perfiles}
              unit="unidades"
              materialKey="perfiles"
            />
            <ResultCard
              label="Tornillos"
              value={results.tornillos}
              unit="unidades"
              materialKey="tornillos"
            />
            <ResultCard
              label="Cinta"
              value={results.cinta}
              unit="metros"
              materialKey="cinta"
            />
            <ResultCard
              label="Masilla"
              value={results.masilla}
              unit="kg"
              materialKey="masilla"
            />
          </div>
        </div>
      )}
    </div>
  );
}