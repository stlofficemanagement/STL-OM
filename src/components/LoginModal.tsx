import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    // Check credentials as specified by user
    if (
      trimmedUser === 'Officemanagement' && trimmedPass === 'OMSTL622'
    ) {
      onLoginSuccess(trimmedUser);
      setUsername('');
      setPassword('');
      onClose();
    } else if (
      (trimmedUser === 'Officemanagement1' && trimmedPass === 'OMSTL1234') ||
      (trimmedUser === 'Officemanagement2' && trimmedPass === 'OMSTL9999')
    ) {
      onLoginSuccess(trimmedUser);
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="login-modal">
      <div className="bg-white border border-outline-variant rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col gap-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            <h3 className="text-base font-display font-bold text-on-surface">เข้าสู่ระบบผู้ดูแลระบบ (Admin Login)</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-secondary hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-secondary leading-relaxed">
            กรอกข้อมูลชื่อบัญชีผู้ใช้และรหัสผ่านเพื่อเปลี่ยนสิทธิ์เป็น <strong>ผู้ดูแลระบบ (Admin)</strong> หรือ <strong>ผู้ดูแลระบบระดับสูง (Super Admin)</strong>
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-sm">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">ชื่อผู้ใช้งาน (Username)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg">person</span>
              <input
                type="text"
                required
                placeholder="เช่น Officemanagement หรือ Officemanagement1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-sans"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">รหัสผ่าน (Password)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg">lock</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-highest text-secondary hover:text-on-surface text-xs font-semibold rounded transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded shadow-sm transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">login</span>
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
