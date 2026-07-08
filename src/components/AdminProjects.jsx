import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { fetchProjects, deleteProject } from '../api';

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  const handleDelete = async (id) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-secondary mb-4">Proyectos guardados</h3>
      {projects.length === 0 && <p className="text-secondary/50">No hay proyectos.</p>}
      <ul className="space-y-2">
        {projects.map(p => (
          <li key={p.id} className="flex justify-between items-center border-b py-2">
            <div><span className="font-medium">{p.name}</span><span className="text-xs ml-4">{p.fecha}</span></div>
            <button onClick={() => handleDelete(p.id)} className="text-red-500"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}