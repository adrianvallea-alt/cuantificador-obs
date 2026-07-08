function formatUnit(quantity, unit) {
  if (unit === 'pieza' || unit === 'pza(s)') {
    return quantity === 1 ? 'pieza' : 'piezas';
  }
  return unit;
}

export default function ResultsSimple({ materials }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-secondary mb-4">Materiales calculados</h2>
      <ul className="space-y-3">
        {materials.map((item, idx) => (
          <li key={idx} className="flex justify-between items-center border-b border-secondary/10 pb-2">
            <div>
              <span className="font-medium text-secondary">
                {item.product.desc || item.product.descripcion || item.product.clave}
              </span>
              <div className="text-xs text-secondary/50 font-mono">{item.product.clave}</div>
            </div>
            <span className="text-secondary font-semibold">
              {item.quantity} {formatUnit(item.quantity, item.unit)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}