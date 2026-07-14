import React from 'react';

interface RoleWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName: string;
  onOpenLogin?: () => void;
}

export default function RoleWarningModal({ isOpen, onClose, actionName, onOpenLogin }: RoleWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="role-warning-modal">
      <div className="bg-white border border-outline-variant rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col gap-4 animate-scale-up">
        <div className="flex items-center gap-3 text-amber-600">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
          <div>
            <h3 className="text-lg font-display font-bold text-on-surface">สิทธิ์การเข้าถึงจำกัด</h3>
            <p className="text-xs text-secondary font-sans">Access Restricted (Read-Only Mode)</p>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
          ขออภัย! คุณกำลังเข้าใช้งานระบบด้วยสิทธิ์ <strong className="text-amber-700">ผู้เยี่ยมชม (Visitor / Read-Only)</strong> จึงไม่สามารถทำการ <strong className="text-red-700">{actionName}</strong> ได้ในขณะนี้
        </p>

        <div className="p-3 bg-surface-container-low border border-outline-variant rounded-lg flex items-start gap-2.5">
          <span className="material-symbols-outlined text-primary text-xl">info</span>
          <p className="text-[11px] text-secondary font-semibold leading-relaxed">
            เปลี่ยนบทบาทเป็น <strong className="text-primary">Admin (ผู้ดูแลระบบ)</strong> เพื่อเปิดสิทธิ์ใช้งานระบบแบบจัดเต็ม (สร้าง แก้ไข ลบข้อมูลสาขาและสัญญาเช่าได้ทันที)
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-container hover:bg-surface-container-highest text-secondary hover:text-on-surface text-xs font-semibold rounded transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          {onOpenLogin && (
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="px-5 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded shadow-sm transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">login</span>
              เข้าสู่ระบบ Admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
