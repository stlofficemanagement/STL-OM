import React from 'react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onCreateLease: () => void;
  userRole?: 'admin' | 'visitor' | 'super_admin';
}

export default function Sidebar({ currentView, onViewChange, onCreateLease, userRole }: SidebarProps) {
  const allMenuItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: 'dashboard' },
    { id: 'leases', label: 'สัญญาเช่า', icon: 'description' },
    { id: 'renew-lease', label: 'ต่อสัญญาเช่า', icon: 'history_edu' },
    { id: 'renewal-consideration', label: 'รายงานพิจารณาต่อสัญญา', icon: 'rate_review' },
    { id: 'branches', label: 'สาขา', icon: 'account_tree', fillIcon: true },
    { id: 'reports', label: 'รายงาน', icon: 'analytics' },
    { id: 'admin', label: 'ผู้ดูแลระบบ', icon: 'admin_panel_settings' },
    { id: 'settings', label: 'การตั้งค่า', icon: 'settings' },
  ];

  const isVisitor = userRole === 'visitor';
  const menuItems = isVisitor
    ? allMenuItems.filter((item) => item.id !== 'renew-lease')
    : allMenuItems;

  return (
    <aside id="side-navigation" className="bg-white dark:bg-inverse-surface border-r border-outline-variant dark:border-outline w-64 h-screen fixed left-0 top-0 flex flex-col h-full py-4 z-40">
      {/* SINGER / STL Logo Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-display text-lg font-bold shadow-sm">
          S
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-primary dark:text-inverse-primary leading-none">STL</h1>
          <span className="text-[11px] font-sans text-secondary dark:text-secondary-fixed-dim uppercase tracking-wider font-semibold">
            ระบบจัดการสัญญาเช่า
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      {!isVisitor && (
        <div className="px-4 mb-6">
          <button
            onClick={onCreateLease}
            id="btn-create-lease-sidebar"
            className="w-full bg-primary-container hover:bg-primary text-white text-sm font-semibold py-3 px-4 rounded transition-all duration-200 flex justify-center items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            สร้างสัญญาใหม่
          </button>
        </div>
      )}

      {/* Navigation Menu Links */}
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              id={`nav-item-${item.id}`}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150 rounded cursor-pointer ${
                isActive
                  ? 'text-primary dark:text-inverse-primary bg-primary-fixed dark:bg-primary-fixed-dim border-l-4 border-primary font-semibold scale-[0.99]'
                  : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-variant font-medium'
              }`}
            >
              <span 
                className="material-symbols-outlined text-xl"
                style={isActive && item.fillIcon ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Support & Signout Links */}
      <div className="mt-auto px-4 border-t border-outline-variant pt-4 flex flex-col gap-1">
        <button
          onClick={() => onViewChange('support')}
          id="nav-item-support"
          className="w-full text-left px-4 py-2 flex items-center gap-3 text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-variant rounded text-sm transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">help</span>
          <span>ช่วยเหลือ</span>
        </button>
        <button
          onClick={() => {
            if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
              alert('จำลองการออกจากระบบสำเร็จ');
            }
          }}
          id="nav-item-logout"
          className="w-full text-left px-4 py-2 flex items-center gap-3 text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high dark:hover:bg-surface-variant rounded text-sm transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
