/**
 * Rendimientos de materiales para construcción en seco (drywall).
 * Valores por defecto basados en prácticas estándar de la industria.
 * Posteriormente serán editables desde el panel de administración.
 */
const DEFAULT_YIELDS = {
  placaM2: 2.88,          // 1 placa cubre 2.88 m² (1.20 m x 2.40 m)
  perfilesPorM2: 2.2,     // perfiles (soleras + montantes) estimados por m²
  tornillosPorPlaca: 12,  // tornillos necesarios por cada placa
  cintaMetrosPorM2: 1.5,  // metros de cinta de papel por m²
  masillaKgPorM2: 0.3,    // kilogramos de masilla por m²
};

/**
 * Calcula la cantidad de materiales necesarios para un área dada.
 * @param {number} area - Metros cuadrados a cubrir.
 * @param {object} [yields=DEFAULT_YIELDS] - Rendimientos personalizados.
 * @returns {object} Objeto con las cantidades calculadas.
 */
export function calculateMaterials(area, yields = DEFAULT_YIELDS) {
  if (!area || area <= 0) return null;

  const placas = Math.ceil(area / yields.placaM2);
  const perfiles = Math.ceil(area * yields.perfilesPorM2);
  const tornillos = Math.ceil(placas * yields.tornillosPorPlaca);
  const cinta = Math.ceil(area * yields.cintaMetrosPorM2);
  const masilla = Math.ceil(area * yields.masillaKgPorM2 * 10) / 10; // un decimal

  return {
    placas,
    perfiles,
    tornillos,
    cinta,
    masilla,
  };
}

/**
 * Obtiene los rendimientos almacenados en localStorage o los por defecto.
 */
export function getStoredYields() {
  try {
    const stored = localStorage.getItem('drywall_yields');
    return stored ? JSON.parse(stored) : { ...DEFAULT_YIELDS };
  } catch {
    return { ...DEFAULT_YIELDS };
  }
}