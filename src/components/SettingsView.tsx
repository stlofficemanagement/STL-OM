import React, { useState } from 'react';

interface SettingsViewProps {
  userRole?: 'admin' | 'visitor' | 'super_admin';
  onVerifyAction?: (actionName: string) => boolean;
  onClearAllData?: () => void;
}

export default function SettingsView({ userRole = 'visitor', onVerifyAction, onClearAllData }: SettingsViewProps) {
  const [warningDays, setWarningDays] = useState(90);
  const [emailAlert, setEmailAlert] = useState(true);
  const [vatRate, setVatRate] = useState(7);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onVerifyAction && !onVerifyAction('บันทึกการตั้งค่าระบบองค์กร')) {
      return;
    }
    alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!');
  };

  const isVisitor = userRole === 'visitor';
  const isSuperAdmin = userRole === 'super_admin';

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="settings-view-panel">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-display font-extrabold text-on-surface">การตั้งค่าระบบ</h2>
        <p className="text-sm font-sans text-secondary mt-1">
          ปรับแต่งพารามิเตอร์การตั้งค่าสัญญาเช่า อัตราภาษี และเงื่อนไขการแจ้งเตือนขององค์กร SINGER
        </p>
      </div>

      {/* Visitor Mode Warning Banner */}
      {isVisitor && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-xs font-sans flex items-start gap-3 max-w-2xl shadow-sm">
          <span className="material-symbols-outlined text-amber-600 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          <div>
            <p className="font-bold text-amber-800">โหมดผู้เยี่ยมชม (Read-Only Mode)</p>
            <p className="mt-1 text-amber-700 leading-relaxed">
              ขณะนี้คุณกำลังใช้งานระบบในฐานะ<strong>ผู้เยี่ยมชม (Visitor)</strong> ทำให้ไม่สามารถบันทึกหรือเปลี่ยนแปลงพารามิเตอร์ระบบได้ หากต้องการทดลองปรับตั้งค่า กรุณาปรับบทบาทเป็น <strong>Admin (ผู้ดูแลระบบ)</strong> ที่แถบเมนูด้านบนขวา
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm max-w-2xl">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-outline-variant pb-3 flex items-center gap-2 font-display">
            <span className="material-symbols-outlined text-primary">settings_applications</span>
            พารามิเตอร์การแจ้งเตือนต่ออายุ
          </h3>

          <div className="flex flex-col gap-4 font-sans">
            <div>
              <label className="form-label-styled">จำนวนวันล่วงหน้าก่อนสัญญาหมดอายุเพื่อเริ่มแจ้งเตือน (วัน)</label>
              <input
                type="number"
                value={warningDays}
                onChange={(e) => setWarningDays(Number(e.target.value))}
                disabled={isVisitor}
                className={`form-input-styled font-sans max-w-xs font-bold ${
                  isVisitor ? 'bg-surface-container-low text-secondary border-dashed cursor-not-allowed' : ''
                }`}
              />
              <p className="text-[10px] text-secondary mt-1 leading-relaxed">
                ระบบจะสร้างป้ายสถานะแจ้งเตือน (Warning) และส่งข้อมูลไปยังหน้าแดชบอร์ดตามจำนวนวันที่ตั้งค่า
              </p>
            </div>

            <div className="flex items-center gap-3 py-2 border-t border-b border-outline-variant/30">
              <input
                type="checkbox"
                id="emailAlertCheck"
                checked={emailAlert}
                onChange={(e) => setEmailAlert(e.target.checked)}
                disabled={isVisitor}
                className={`rounded text-primary focus:ring-primary border-outline-variant ${
                  isVisitor ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
              <label htmlFor="emailAlertCheck" className={`text-xs font-semibold text-on-surface select-none ${
                isVisitor ? 'text-secondary cursor-not-allowed' : 'cursor-pointer'
              }`}>
                ส่งรายงานสรุปสัญญารายสัปดาห์เข้าสู่อีเมลของผู้ดูแลระบบโดยอัตโนมัติ
              </label>
            </div>

            <div>
              <label className="form-label-styled">อัตราภาษีมูลค่าเพิ่มสำหรับการคำนวณฐานค่าเช่า (%)</label>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                disabled={isVisitor}
                className={`form-input-styled font-sans max-w-xs font-bold ${
                  isVisitor ? 'bg-surface-container-low text-secondary border-dashed cursor-not-allowed' : ''
                }`}
              />
              <p className="text-[10px] text-secondary mt-1 leading-relaxed">
                ใช้เป็นมาตรฐานในการคำนวณค่าเช่ารวมสุทธิเมื่อทำการกรอกฟอร์มสัญญาเช่าใหม่ในระบบ
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVisitor}
            className={`self-start px-6 py-2.5 text-xs font-semibold rounded shadow-sm transition-all ${
              isVisitor
                ? 'bg-outline-variant/50 text-secondary cursor-not-allowed'
                : 'bg-primary hover:bg-primary/95 text-white cursor-pointer'
            }`}
          >
            บันทึกการตั้งค่า
          </button>
        </form>
      </div>

      {/* Database Management / Reset to 0 card */}
      <div className="bg-white border border-red-200 rounded-lg p-6 shadow-sm max-w-2xl" id="database-setup-card">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-red-100 pb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2 font-display">
              <span className="material-symbols-outlined text-red-600">delete_sweep</span>
              การจัดการฐานข้อมูลและเริ่มใช้งานจริง (Production Setup)
            </h3>
            {isSuperAdmin ? (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block"></span> Super Admin
              </span>
            ) : (
              <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">lock</span> Super Admin Only
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
            ระบบจัดเก็บข้อมูลสาขาและรายละเอียดสัญญาเช่าของร้านในรูปแบบจำลอง (Demo Data) หากคุณต้องการใช้ระบบนี้สำหรับบันทึกข้อมูลจริงขององค์กร คุณสามารถลบข้อมูลทั้งหมดที่อยู่ในระบบเป็น 0 เพื่อเริ่มกรอกและจัดการข้อมูลจริงได้ทันที
          </p>

          {!isSuperAdmin && (
            <div className="p-3.5 bg-[#fcf8e3] border border-[#faebcc] rounded-lg flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#8a6d3b] shrink-0 text-lg">lock</span>
              <div className="text-[11px] text-[#8a6d3b] leading-relaxed font-sans">
                <p className="font-bold">ฟังก์ชันนี้สงวนไว้สำหรับสิทธิ์ระดับ Super Admin เท่านั้น</p>
                <p className="mt-0.5 text-secondary">
                  เฉพาะผู้ใช้งานบัญชี <strong className="text-on-surface">Officemanagement</strong> เท่านั้นที่สามารถเคลียร์ข้อมูลระบบทั้งหมดเป็น 0 ได้ กรุณาเข้าสู่ระบบด้วยชื่อบัญชีดังกล่าวเพื่อดำเนินการ
                </p>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-red-50/50 border border-red-100 rounded-lg flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-600 shrink-0 text-lg">warning</span>
            <p className="text-[11px] text-red-800 leading-relaxed font-sans">
              <strong>คำเตือนที่สำคัญ:</strong> การดำเนินการลบข้อมูลนี้จะลบสาขาทุกสาขา ข้อมูลสัญญาเช่าทั้งหมด และประวัติกิจกรรมในระบบเป็น 0 ทันที โดยไม่สามารถย้อนกลับหรือกู้คืนได้
            </p>
          </div>

          <button
            type="button"
            disabled={!isSuperAdmin}
            onClick={() => {
              if (!isSuperAdmin) {
                alert('คุณไม่มีสิทธิ์ระดับ Super Admin ในการเคลียร์ข้อมูลระบบทั้งหมด');
                return;
              }
              if (onVerifyAction && !onVerifyAction('ล้างข้อมูลระบบทั้งหมดเป็น 0 เพื่อเริ่มใช้งานจริง')) {
                return;
              }
              if (onClearAllData) {
                onClearAllData();
              }
            }}
            className={`self-start px-5 py-2.5 text-xs font-semibold rounded shadow-sm transition-all flex items-center gap-1.5 ${
              isSuperAdmin 
                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer' 
                : 'bg-outline-variant/50 text-secondary cursor-not-allowed border border-dashed border-outline-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            ลบข้อมูลทั้งหมดเป็น 0 เพื่อใช้งานจริง
          </button>
        </div>
      </div>
    </div>
  );
}
