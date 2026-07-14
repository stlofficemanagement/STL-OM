import React from 'react';

interface TopAppBarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  userRole: 'admin' | 'visitor' | 'super_admin';
  onRoleChange: (role: 'admin' | 'visitor') => void;
  adminUsername?: string;
}

export default function TopAppBar({
  currentView,
  onViewChange,
  searchQuery,
  onSearchQueryChange,
  userRole,
  onRoleChange,
  adminUsername,
}: TopAppBarProps) {
  // Translate view IDs into readable header titles
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'STL Lease Management';
      case 'leases':
        return 'STL ระบบจัดการสัญญาเช่า';
      case 'branches':
        return 'STL Lease Management';
      case 'reports':
        return 'รายงานและสถิติ';
      case 'admin':
        return 'ระบบผู้ดูแลระบบ';
      case 'settings':
        return 'การตั้งค่าระบบ';
      default:
        return 'STL ระบบจัดการสัญญาเช่า';
    }
  };

  return (
    <header className="bg-surface-bright dark:bg-surface-dim border-b border-outline-variant dark:border-outline fixed top-0 right-0 left-64 h-16 flex justify-between items-center px-6 w-[calc(100%-16rem)] z-30 shadow-none">
      <div className="flex items-center gap-6 h-full">
        {/* Dynamic Header Brand Text */}
        <h2 className="font-display text-lg font-extrabold text-primary dark:text-inverse-primary hidden lg:block">
          {getHeaderTitle()}
        </h2>
        
        <div className="h-6 w-px bg-outline-variant hidden lg:block"></div>

        {/* Global Dashboard Navigation Sub-tabs */}
        <nav className="flex h-full gap-6">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`font-sans text-sm font-semibold flex items-center h-full transition-colors cursor-pointer border-b-2 ${
              currentView === 'dashboard'
                ? 'text-primary border-primary'
                : 'text-on-surface-variant dark:text-surface-variant border-transparent hover:text-primary'
            }`}
          >
            ภาพรวม
          </button>
          <button
            onClick={() => onViewChange('admin')}
            className={`font-sans text-sm font-semibold flex items-center h-full transition-colors cursor-pointer border-b-2 ${
              currentView === 'admin'
                ? 'text-primary border-primary'
                : 'text-on-surface-variant dark:text-surface-variant border-transparent hover:text-primary'
            }`}
          >
            กิจกรรมล่าสุด
          </button>
        </nav>
      </div>

      {/* Right Side Icons & Profile settings */}
      <div className="flex items-center gap-4">
        {/* Search Bar - only show when relevant */}
        <div className="relative hidden sm:block w-48 lg:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาด่วน..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded py-1.5 pl-9 pr-4 text-xs font-sans focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant"
          />
        </div>

        {/* Utility Buttons */}
        <div className="flex gap-1 text-on-surface-variant">
          <button
            onClick={() => alert('คุณมีการแจ้งเตือนใหม่ 3 รายการ')}
            className="p-2 hover:bg-surface-container-highest rounded-full transition-all flex items-center justify-center focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer relative"
            title="การแจ้งเตือน"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <button
            onClick={() => alert('ต้องการช่วยเหลือ? กรุณาติดต่อ admin@singer.co.th')}
            className="p-2 hover:bg-surface-container-highest rounded-full transition-all flex items-center justify-center focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
            title="ช่วยเหลือ"
          >
            <span className="material-symbols-outlined text-[22px]">help_outline</span>
          </button>
        </div>

        {/* Active Role Selector Switcher Pill */}
        <div className="flex items-center bg-surface-container border border-outline-variant rounded-full p-1 gap-1" id="role-selector-pill">
          <button
            onClick={() => onRoleChange('admin')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all duration-200 cursor-pointer ${
              userRole === 'super_admin'
                ? 'bg-emerald-600 text-white shadow-sm'
                : userRole === 'admin'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-secondary hover:text-on-surface'
            }`}
            title="สลับสิทธิ์เป็นผู้ดูแลระบบ"
          >
            <span className="material-symbols-outlined text-[14px]">
              {userRole === 'super_admin' ? 'verified_user' : 'admin_panel_settings'}
            </span>
            {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
          </button>
          <button
            onClick={() => onRoleChange('visitor')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all duration-200 cursor-pointer ${
              userRole === 'visitor'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
            title="สลับสิทธิ์เป็นผู้เยี่ยมชม (Visitor)"
          >
            <span className="material-symbols-outlined text-[14px]">visibility</span>
            Visitor
          </button>
        </div>

        {/* User Profile Avatar block */}
        <div className="flex items-center gap-3 cursor-pointer group pl-4 border-l border-outline-variant">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors leading-tight">
              {userRole === 'super_admin' 
                ? `คุณ ${adminUsername || 'Officemanagement'} (Super Admin)` 
                : userRole === 'admin' 
                  ? `คุณ ${adminUsername || 'สมชาย'} (Admin)` 
                  : 'คุณใจดี (ผู้เยี่ยมชม)'}
            </p>
            <p className="text-[10px] text-on-surface-variant font-bold leading-none mt-0.5">
              {userRole === 'super_admin' 
                ? 'ผู้ดูแลระบบระดับสูง (Super Admin)' 
                : userRole === 'admin' 
                  ? 'ผู้ดูแลระบบ (Admin)' 
                  : 'ผู้เยี่ยมชม (Visitor)'}
            </p>
          </div>
          {userRole !== 'visitor' ? (
            <img
              alt="User Profile Avatar"
              className={`w-8 h-8 rounded-full object-cover border bg-surface-variant group-hover:border-primary transition-colors ${
                userRole === 'super_admin' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-outline-variant'
              }`}
              src={userRole === 'super_admin' ? '/src/assets/images/butterbear_avatar_1783930182419.jpg' : '/src/assets/images/doraemon_avatar_1783930196056.jpg'}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant text-secondary group-hover:border-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
