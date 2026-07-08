import { Package, Columns, Circle, Link2, PaintBucket } from 'lucide-react';

const ICON_MAP = {
  placas: Package,
  perfiles: Columns,
  tornillos: Circle,
  cinta: Link2,
  masilla: PaintBucket,
};

export default function ResultCard({ label, value, unit, materialKey }) {
  const IconComponent = ICON_MAP[materialKey] || Package;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
        <IconComponent className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-sm font-medium text-secondary/80 uppercase tracking-wide mb-1">
        {label}
      </h3>
      <p className="text-3xl font-bold text-secondary">
        {value}
      </p>
      <span className="text-xs text-secondary/50 mt-1">{unit}</span>
    </div>
  );
}