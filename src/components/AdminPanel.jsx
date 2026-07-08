import { useState } from 'react';
import AdminProjects from './AdminProjects';
import AdminRecipes from './AdminRecipes';
import AdminCatalog from './AdminCatalog';
import AdminConfig from './AdminConfig';
import { LogOut } from 'lucide-react';

const tabs = ['Proyectos', 'Recetas', 'Catálogo', 'Configuración'];

export default function AdminPanel({ onLogout }) {
  const [active, setActive] = useState(0);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-secondary">Panel de administración</h1>
        <button onClick={onLogout} className="flex items-center gap-2 text-secondary/70 hover:text-secondary">
          <LogOut size={18} /> Salir
        </button>
      </div>
      <div className="flex gap-2 mb-6 border-b border-secondary/10 pb-2">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm ${active === i ? 'bg-primary text-white' : 'text-secondary/70 hover:bg-secondary/5'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {active === 0 && <AdminProjects />}
        {active === 1 && <AdminRecipes />}
        {active === 2 && <AdminCatalog />}
        {active === 3 && <AdminConfig />}
      </div>
    </div>
  );
}