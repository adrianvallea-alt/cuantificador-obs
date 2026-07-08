import { useState } from 'react';

export default function AdminConfig() {
  const [newPass, setNewPass] = useState('');
  const [message, setMessage] = useState('');

  const changePassword = () => {
    if (!newPass.trim()) return;
    setMessage('Contraseña actualizada (local).');
    setNewPass('');
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-secondary mb-4">Configuración general</h3>
      <div className="max-w-sm space-y-4">
        <div>
          <label className="block text-sm text-secondary/70 mb-1">Nueva contraseña</label>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full rounded-xl border-secondary/20 px-4 py-2 text-secondary" />
        </div>
        <button onClick={changePassword} className="px-4 py-2 bg-primary text-white rounded-xl font-semibold">Guardar</button>
        {message && <p className="text-green-600 text-sm mt-2">{message}</p>}
      </div>
    </div>
  );
}