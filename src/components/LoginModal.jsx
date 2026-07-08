import { useState } from 'react';
import { X } from 'lucide-react';
import { login } from '../api';

export default function LoginModal({ onLogin, onClose }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(user, pass);
    if (result.success) {
      onLogin();
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary">Acceso administrador</h2>
          <button onClick={onClose} className="text-secondary/50 hover:text-secondary"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Usuario" value={user} onChange={e => setUser(e.target.value)} className="w-full rounded-xl border-secondary/20 px-4 py-2 text-secondary" />
          <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} className="w-full rounded-xl border-secondary/20 px-4 py-2 text-secondary" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-xl font-semibold hover:bg-primary/90">Ingresar</button>
        </form>
      </div>
    </div>
  );
}