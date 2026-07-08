export default function ResultsAdvanced({ results }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mt-6">
      <h2 className="text-xl font-semibold text-secondary mb-4">Resumen de materiales</h2>
      <div className="grid gap-3">
        <ResultRow label="Área neta" value={`${results.areaNeta.toFixed(2)} m²`} />
        <ResultRow label="Postes" value={results.postes} product={results.posteProducto} />
        <ResultRow label="Canales (soleras)" value={results.canales} product={results.canalProducto} />
        <ResultRow label="Cabezales (puertas/ventanas)" value={results.cabezales} product={results.cabezalProducto} />
        <ResultRow label="Paneles" value={results.paneles} product={results.panelProducto} />
        <ResultRow label="Tornillos" value={results.tornillos} product={results.tornilloProducto} />
        <ResultRow label="Compuesto" value={`${results.compuesto} kg`} product={results.compuestoProducto} />
        <ResultRow label="Cinta" value={`${results.cinta} m`} product={results.cintaProducto} />
      </div>
    </div>
  );
}

function ResultRow({ label, value, product }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-secondary/10 last:border-0">
      <div>
        <span className="font-medium text-secondary">{label}</span>
        {product && (
          <div className="text-xs text-secondary/50">
            <span className="font-mono mr-1">({product.clave})</span>
            {product.desc}
          </div>
        )}
      </div>
      <span className="text-secondary font-semibold">{value}</span>
    </div>
  );
}