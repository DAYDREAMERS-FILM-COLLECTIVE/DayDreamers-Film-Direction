import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';

export function AdminAuthModal({ isOpen, onClose, onSuccess }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode.trim() === 'fps2026') {
      sessionStorage.setItem('fps_admin_auth', 'true');
      setError(false);
      setPasscode('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#171513] border border-[#2a2622] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2a2622] pb-3">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-[#d83128]" />
            <h3 className="text-sm font-serif font-bold uppercase text-[#eee9df]">
              Admin Verification
            </h3>
          </div>
          <button onClick={onClose} className="text-[#9f9b94] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-sans text-[#9f9b94]">
          Authorized access required to enter the FPS Campus Cinema CMS.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#9f9b94] uppercase block">
              Society Passcode
            </label>
            <input
              type="password"
              autoFocus
              required
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              placeholder="••••••••"
              className="w-full bg-[#0e0d0c] border border-[#2a2622] px-3 py-2 text-sm font-mono text-[#eee9df] tracking-widest focus:outline-none focus:border-[#d83128]"
            />
            {error && (
              <p className="text-[11px] font-mono text-[#d83128] mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Invalid credentials. Passcode rejected.</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#0e0d0c] text-[#9f9b94] hover:text-white text-xs font-mono uppercase border border-[#2a2622]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-mono uppercase font-bold transition-colors cursor-pointer"
            >
              AUTHENTICATE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
