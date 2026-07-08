import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { fetchRecipes, saveRecipe, updateRecipe, deleteRecipe, fetchCatalog } from '../api';

export default function AdminRecipes() {
  const [catalog, setCatalog] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [activeRecipe, setActiveRecipe] = useState({
    id: null,
    name: '',
    tipo: 'muro',
    descripcion: '',
    humedad: false,
    permitir_secado_rapido: false,
    permitir_aislamiento: false,
    permitir_refuerzos: false,
    permitir_pintura: false,
    permitir_resistente: false,
    imagen: '',
    productos: [],
  });
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCatalog().then(setCatalog);
    fetchRecipes().then(data => {
      const parsed = data.map(r => ({
        ...r,
        tipo: r.tipo || 'muro',
        descripcion: r.descripcion || '',
        productos: (typeof r.productos === 'string' ? JSON.parse(r.productos) : (r.productos || [])).map(p => ({
          ...p,
          factor: p.factor || 1,
        })),
      }));
      setRecipes(parsed);
    });
  }, []);

  const filteredCatalog = catalog.filter(cat =>
    (cat.descripcion || cat.desc || '').toLowerCase().includes(search.toLowerCase()) ||
    cat.clave.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = (clave) => {
    if (!activeRecipe.productos.find(p => p.clave === clave)) {
      setActiveRecipe({ ...activeRecipe, productos: [...activeRecipe.productos, { clave, factor: 1 }] });
    }
  };
  const removeProduct = (clave) => setActiveRecipe({ ...activeRecipe, productos: activeRecipe.productos.filter(p => p.clave !== clave) });
  const updateFactor = (clave, factor) => setActiveRecipe({ ...activeRecipe, productos: activeRecipe.productos.map(p => p.clave === clave ? { ...p, factor: parseFloat(factor) || 1 } : p) });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('https://drywall-api.adrian-valle-a.workers.dev/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setActiveRecipe({ ...activeRecipe, imagen: data.url });
        setPreview(data.url);
      } else {
        alert('Error al subir la imagen: ' + (data.error || ''));
      }
    } catch (err) {
      alert('Error al conectar con el servidor.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!activeRecipe.name.trim()) return;
    if (editingId) {
      await updateRecipe(editingId, activeRecipe);
    } else {
      await saveRecipe(activeRecipe);
    }
    const data = await fetchRecipes();
    const parsed = data.map(r => ({
      ...r,
      tipo: r.tipo || 'muro',
      descripcion: r.descripcion || '',
      productos: (typeof r.productos === 'string' ? JSON.parse(r.productos) : (r.productos || [])).map(p => ({
        ...p,
        factor: p.factor || 1,
      })),
    }));
    setRecipes(parsed);
    setActiveRecipe({ id: null, name: '', tipo: 'muro', descripcion: '', humedad: false, permitir_secado_rapido: false, permitir_aislamiento: false, permitir_refuerzos: false, permitir_pintura: false, permitir_resistente: false, imagen: '', productos: [] });
    setEditingId(null);
    setPreview('');
  };

  const handleEdit = (r) => {
    const productos = (Array.isArray(r.productos) ? r.productos : []).map(p => ({ ...p, factor: p.factor || 1 }));
    setActiveRecipe({ ...r, tipo: r.tipo || 'muro', descripcion: r.descripcion || '', productos });
    setEditingId(r.id);
    setPreview(r.imagen || '');
  };

  const handleDelete = async (id) => {
    await deleteRecipe(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
    if (editingId === id) {
      setActiveRecipe({ id: null, name: '', tipo: 'muro', descripcion: '', humedad: false, permitir_secado_rapido: false, permitir_aislamiento: false, permitir_refuerzos: false, permitir_pintura: false, permitir_resistente: false, imagen: '', productos: [] });
      setEditingId(null);
      setPreview('');
    }
  };

  const cancelEdit = () => {
    setActiveRecipe({ id: null, name: '', tipo: 'muro', descripcion: '', humedad: false, permitir_secado_rapido: false, permitir_aislamiento: false, permitir_refuerzos: false, permitir_pintura: false, permitir_resistente: false, imagen: '', productos: [] });
    setEditingId(null);
    setSearch('');
    setPreview('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-secondary">Recetas</h3>
          <button onClick={() => { setActiveRecipe({ id: null, name: '', tipo: 'muro', descripcion: '', humedad: false, permitir_secado_rapido: false, permitir_aislamiento: false, permitir_refuerzos: false, permitir_pintura: false, permitir_resistente: false, imagen: '', productos: [] }); setEditingId(null); setPreview(''); }} className="flex items-center gap-1 text-primary text-sm"><Plus size={16} /> Nueva</button>
        </div>
        <ul className="space-y-2">
          {recipes.length === 0 && <li className="text-secondary/50 text-sm">No hay recetas.</li>}
          {recipes.map(r => (
            <li key={r.id} onClick={() => handleEdit(r)} className={`p-2 rounded-lg border cursor-pointer ${editingId === r.id ? 'border-primary bg-primary/5' : 'border-secondary/10'}`}>
              <div className="flex justify-between">
                <span className="font-medium text-sm">{r.name} <span className="text-xs text-secondary/50">({r.tipo || 'muro'})</span></span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="text-red-500"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h4 className="font-medium text-secondary">{editingId ? 'Editar receta' : 'Nueva receta'}</h4>
          <input type="text" placeholder="Nombre de la receta" value={activeRecipe.name} onChange={e => setActiveRecipe({ ...activeRecipe, name: e.target.value })} className="w-full rounded-xl border px-4 py-2" />
          
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de proyecto</label>
            <select
              value={activeRecipe.tipo || 'muro'}
              onChange={e => setActiveRecipe({ ...activeRecipe, tipo: e.target.value })}
              className="w-full rounded-xl border px-4 py-2"
            >
              <option value="muro">Muro Interior</option>
              <option value="plafon">Plafón</option>
              <option value="muro_exterior">Muro Exterior</option>
              <option value="pintura">Solo Pintura</option>
              <option value="imper">Impermeabilizante</option>
              <option value="imper_pref">Impermeabilizante Prefabricado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción breve</label>
            <textarea
              placeholder="Describe el proyecto (ej. Elemento arquitectónico vertical...)"
              value={activeRecipe.descripcion || ''}
              onChange={e => setActiveRecipe({ ...activeRecipe, descripcion: e.target.value })}
              className="w-full rounded-xl border px-4 py-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm text-secondary/70">Imagen del proyecto</label>
            <div className="flex items-center gap-3 mt-1">
              {preview && <img src={preview} alt="Vista previa" className="w-16 h-16 rounded-lg object-cover border" />}
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                className="text-sm"
                disabled={uploading}
              />
              {uploading && <span className="text-xs text-secondary/50">Subiendo...</span>}
            </div>
            <p className="text-xs text-secondary/50 mt-1">También podés pegar la URL directamente.</p>
            <input
              type="text"
              placeholder="O pegá la URL de la imagen"
              value={activeRecipe.imagen || ''}
              onChange={e => { setActiveRecipe({ ...activeRecipe, imagen: e.target.value }); setPreview(e.target.value); }}
              className="w-full rounded-xl border px-4 py-2 text-sm mt-2"
            />
          </div>

          <div className="flex items-center gap-2"><input type="checkbox" checked={activeRecipe.humedad || false} onChange={e => setActiveRecipe({ ...activeRecipe, humedad: e.target.checked })} /> Zona húmeda / exterior</div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={activeRecipe.permitir_secado_rapido || false} onChange={e => setActiveRecipe({ ...activeRecipe, permitir_secado_rapido: e.target.checked })} /> Permitir secado rápido</div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={activeRecipe.permitir_aislamiento || false} onChange={e => setActiveRecipe({ ...activeRecipe, permitir_aislamiento: e.target.checked })} /> Permitir aislamiento</div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={activeRecipe.permitir_refuerzos || false} onChange={e => setActiveRecipe({ ...activeRecipe, permitir_refuerzos: e.target.checked })} /> Permitir refuerzos horizontales</div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={activeRecipe.permitir_pintura || false} onChange={e => setActiveRecipe({ ...activeRecipe, permitir_pintura: e.target.checked })} /> Permitir pintura</div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={activeRecipe.permitir_resistente || false} onChange={e => setActiveRecipe({ ...activeRecipe, permitir_resistente: e.target.checked })} /> Permitir muro más resistente</div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Productos</label>
            {activeRecipe.productos.map(prod => {
              const cat = catalog.find(c => c.clave === prod.clave);
              return (
                <div key={prod.clave} className="flex items-center gap-2 bg-secondary/5 rounded-lg p-2">
                  <span className="flex-1 text-sm">{cat ? `${cat.clave} – ${cat.descripcion || cat.desc}` : prod.clave}</span>
                  <input type="number" value={prod.factor} onChange={e => updateFactor(prod.clave, e.target.value)} className="w-16 text-sm border rounded px-2 py-1" min="0.5" step="0.1" />
                  <button onClick={() => removeProduct(prod.clave)} className="text-red-500"><X size={14} /></button>
                </div>
              );
            })}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Agregar producto</label>
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border px-4 py-2 text-sm mb-2" />
            <div className="max-h-40 overflow-y-auto border rounded-xl p-2">
              {filteredCatalog.map(cat => (
                <button key={cat.clave} onClick={() => addProduct(cat.clave)} className="block w-full text-left px-2 py-1 rounded hover:bg-primary/10 text-sm">{cat.clave} - {cat.descripcion || cat.desc}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={cancelEdit} className="px-4 py-2 border rounded-xl">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-xl flex items-center gap-2"><Save size={16} /> Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}