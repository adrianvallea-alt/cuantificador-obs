import { Settings } from 'lucide-react';

export default function SettingsIcon({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="opacity-40 hover:opacity-80 transition-opacity duration-300"
      title="Configuración (administrador)"
      aria-label="Abrir configuración"
    >
      <Settings className="w-5 h-5 text-secondary" />
    </button>
  );
}