import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Upload, Search, X } from 'lucide-react';
import { fetchCatalog, saveCatalogProduct, updateCatalogProduct, deleteCatalogProduct } from '../api';

export default function AdminCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClave, setEditingClave] = useState(null);
  const [form, setForm] = useState({
    clave: '',
    descripcion: '',
    tipo: '',
    unidad: 'pieza',
    marca: '',
    formula: '',
    imagen: '',
  });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCatalog()
      .then(data => { setCatalog(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredCatalog = catalog.filter(p =>
    (p.descripcion || '').toLowerCase().includes(search.toLowerCase()) ||
    p.clave.toLowerCase().includes(search.toLowerCase()) ||
    (p.marca && p.marca.toLowerCase().includes(search.toLowerCase()))
  );

  const openNewModal = () => {
    setForm({ clave: '', descripcion: '', tipo: '', unidad: 'pieza', marca: '', formula: '', imagen: '' });
    setEditingClave(null);
    setPreview('');
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setForm({
      clave: p.clave || '',
      descripcion: p.descripcion || p.desc || '',
      tipo: p.tipo || '',
      unidad: p.unidad || 'pieza',
      marca: p.marca || '',
      formula: p.formula || '',
      imagen: p.imagen || '',
    });
    setEditingClave(p.clave);
    setPreview(p.imagen || '');
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // Subida de imagen a R2
  const handleFileUpload = async (e) => {
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
        setForm({ ...form, imagen: data.url });
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

  const saveProduct = async () => {
    const clave = form.clave?.trim() || '';
    const descripcion = form.descripcion?.trim() || '';
    if (!clave || !descripcion) {
      alert('La clave y la descripción son obligatorias.');
      return;
    }

    const productToSave = {
      clave,
      descripcion,
      tipo: form.tipo?.trim() || '',
      unidad: form.unidad?.trim() || 'pieza',
      marca: form.marca?.trim() || '',
      formula: form.formula?.trim() || '',
      imagen: form.imagen?.trim() || '',
    };

    try {
      if (editingClave) {
        await updateCatalogProduct(editingClave, productToSave);
      } else {
        await saveCatalogProduct(productToSave);
      }
      const data = await fetchCatalog();
      setCatalog(data);
      closeModal();
    } catch (err) {
      alert('Error al guardar el producto.');
    }
  };

  const deleteProduct = async (clave) => {
    try {
      await deleteCatalogProduct(clave);
      setCatalog(prev => prev.filter(p => p.clave !== clave));
    } catch (err) {
      alert('Error al eliminar el producto.');
    }
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      let imported = [];
      try {
        imported = JSON.parse(content);
      } catch {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) return;
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim());
          if (cols.length < 2) continue;
          const item = {};
          headers.forEach((h, idx) => { if (cols[idx]) item[h] = cols[idx]; });
          imported.push(item);
        }
      }
      for (const item of imported) {
        await saveCatalogProduct(item);
      }
      const data = await fetchCatalog();
      setCatalog(data);
      alert(`${imported.length} productos importados.`);
    };
    reader.readAsText(file);
  };

  if (loading) return <p className="text-secondary/50">Cargando catálogo...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-secondary">Catálogo de productos</h3>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 text-primary text-sm"><Upload size={16} /> Importar</button>
          <input ref={fileInputRef} type="file" accept=".csv,.json,.txt" onChange={handleFileImport} className="hidden" />
          <button onClick={openNewModal} className="flex items-center gap-2 text-primary text-sm"><Plus size={16} /> Nuevo</button>
        </div>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/40" />
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-secondary/20 text-sm" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-secondary/70 border-b"><th className="text-left py-2">Clave</th><th className="text-left py-2">Descripción</th><th className="text-left py-2">Tipo</th><th className="text-left py-2">Unidad</th><th></th></tr></thead>
          <tbody>
            {filteredCatalog.map(p => (
              <tr key={p.clave} className="border-b border-secondary/10">
                <td className="py-2 font-mono">{p.clave}</td>
                <td className="py-2">{p.desc || p.descripcion || '-'}</td>
                <td className="py-2">{p.tipo}</td>
                <td className="py-2">{p.unidad}</td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => openEditModal(p)} className="text-primary"><Edit3 size={14} /></button>
                  <button onClick={() => deleteProduct(p.clave)} className="text-red-500"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4"><h4 className="font-medium">{editingClave ? 'Editar' : 'Nuevo'}</h4><button onClick={closeModal}><X size={20} /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Clave" value={form.clave || ''} onChange={e => setForm({...form, clave: e.target.value})} className="rounded-xl border px-3 py-1" />
                <input placeholder="Descripción" value={form.descripcion || ''} onChange={e => setForm({...form, descripcion: e.target.value})} className="rounded-xl border px-3 py-1" />
                <input placeholder="Tipo" value={form.tipo || ''} onChange={e => setForm({...form, tipo: e.target.value})} className="rounded-xl border px-3 py-1" />
                <input placeholder="Unidad" value={form.unidad || ''} onChange={e => setForm({...form, unidad: e.target.value})} className="rounded-xl border px-3 py-1" />
              </div>
              {/* Campo de imagen con vista previa */}
              <div>
                <label className="text-sm text-secondary/70">Imagen</label>
                <div className="flex items-center gap-3 mt-1">
                  {preview && <img src={preview} alt="Vista previa" className="w-16 h-16 rounded-lg object-cover border" />}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileUpload}
                    className="text-sm"
                    disabled={uploading}
                  />
                  {uploading && <span className="text-xs text-secondary/50">Subiendo...</span>}
                </div>
                <p className="text-xs text-secondary/50 mt-1">O pega la URL directamente si ya está alojada.</p>
              </div>
              <div>
                <label className="text-sm text-secondary/70">Fórmula</label>
                <textarea value={form.formula || ''} onChange={e => setForm({...form, formula: e.target.value})} className="w-full rounded-xl border px-3 py-2 text-sm" rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={closeModal} className="px-4 py-2 border rounded-xl">Cancelar</button>
                <button onClick={saveProduct} className="px-4 py-2 bg-primary text-white rounded-xl">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}