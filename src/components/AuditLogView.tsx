import React, { useState } from 'react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export default function AuditLogView({ logs }: AuditLogViewProps) {
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Filtering logs
  const filteredLogs = logs.filter((log) => {
    const matchesDate = dateFilter ? log.dateTime.includes(dateFilter) : true;
    const matchesUser = userFilter ? log.user.includes(userFilter) : true;
    const matchesAction = actionFilter ? log.action === actionFilter : true;
    return matchesDate && matchesUser && matchesAction;
  });

  const handleExport = () => {
    const worksheetName = 'ประวัติการแก้ไขข้อมูล';
    const headers = [
      'วัน/เวลา (Date/Time)',
      'ผู้ใช้งาน (User)',
      'ประเภทการกระทำ (Action)',
      'เป้าหมาย (Target)',
      'รายละเอียดการเปลี่ยนแปลง (Description)'
    ];

    let tableHtml = `
      <table border="1" style="border-collapse:collapse; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size:12px;">
        <thead>
          <tr style="background-color:#1e3a8a; color:#ffffff; font-weight:bold;">
            ${headers.map(h => `<th style="padding:8px; border:1px solid #cbd5e1; white-space:nowrap;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    filteredLogs.forEach((log) => {
      let actionLabel = log.action;
      if (log.action === 'Create') actionLabel = 'สร้าง (Create)';
      else if (log.action === 'Edit') actionLabel = 'แก้ไข (Edit)';
      else if (log.action === 'Delete') actionLabel = 'ลบ (Delete)';

      tableHtml += `
        <tr>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; white-space:nowrap;">${log.dateTime}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; font-weight:bold;">${log.user}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; color:${log.action === 'Create' ? '#16a34a' : log.action === 'Edit' ? '#d97706' : '#dc2626'};">${actionLabel}</td>
          <td style="padding:8px; border:1px solid #cbd5e1; font-weight:bold;">${log.target}</td>
          <td style="padding:8px; border:1px solid #cbd5e1;">${log.description}</td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
       <x:ExcelWorkbook>
        <x:ExcelWorksheets>
         <x:ExcelWorksheet>
          <x:Name>${worksheetName}</x:Name>
          <x:WorksheetOptions>
           <x:DisplayGridlines/>
          </x:WorksheetOptions>
         </x:ExcelWorksheet>
        </x:ExcelWorksheets>
       </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      </head>
      <body>
        <div style="margin-bottom:15px; font-family:'Segoe UI', sans-serif;">
          <h2 style="margin:0; color:#1e3a8a;">ประวัติการแก้ไขข้อมูลทั้งหมด (Audit Log)</h2>
          <p style="margin:5px 0; color:#475569; font-size:12px;">
            จำนวนรายการ: ${filteredLogs.length} รายการ | วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}
          </p>
        </div>
        ${tableHtml}
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `STL_Audit_Logs_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="audit-logs-view">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-on-surface">ประวัติการแก้ไขข้อมูล</h2>
          <p className="text-xs text-on-surface-variant font-sans">
            Audit Log - ตรวจสอบและติดตามรายละเอียดการเปลี่ยนแปลงข้อมูลสัญญาเช่าในระบบทั้งหมด
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-white hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold py-2 px-4 rounded flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          ส่งออก (Export)
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-outline-variant p-4 rounded-lg flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-on-surface-variant mb-1 font-sans">
            ค้นหาด้วยวัน/เวลา
          </label>
          <input
            type="text"
            placeholder="เช่น 24 ต.ค."
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded px-3 py-2 text-xs font-sans focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-on-surface-variant mb-1 font-sans">
            ผู้ดำเนินการ
          </label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded p-2 text-xs font-sans outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">ทั้งหมด</option>
            <option value="สมชาย ใจดี">คุณสมชาย ใจดี</option>
            <option value="สมหญิง">คุณสมหญิง รักการงาน</option>
            <option value="Admin System">Admin System</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-on-surface-variant mb-1 font-sans">
            ประเภทการกระทำ
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded p-2 text-xs font-sans outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">ทั้งหมด</option>
            <option value="Create">สร้าง (Create)</option>
            <option value="Edit">แก้ไข (Edit)</option>
            <option value="Delete">ลบ (Delete)</option>
          </select>
        </div>

        <button
          onClick={() => {
            setDateFilter('');
            setUserFilter('');
            setActionFilter('');
          }}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded text-xs font-semibold transition-colors h-[34px] cursor-pointer"
        >
          รีเซ็ตตัวกรอง
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F3F5] border-b border-outline-variant text-xs text-on-surface-variant font-semibold">
                <th className="py-3 px-4 font-sans">วัน/เวลา (Date/Time)</th>
                <th className="py-3 px-4 font-sans">ผู้ใช้งาน (User)</th>
                <th className="py-3 px-4 font-sans">การกระทำ (Action)</th>
                <th className="py-3 px-4 font-sans">เป้าหมาย (Target)</th>
                <th className="py-3 px-4 font-sans min-w-[300px]">รายละเอียด (Description)</th>
              </tr>
            </thead>
            <tbody className="text-xs text-on-surface font-sans">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="border-b border-outline-variant/30 hover:bg-[#F8F9FA] transition-colors group">
                      <td className="py-3 px-4 border-l-2 border-transparent group-hover:border-primary">
                        {log.dateTime}
                      </td>
                      <td className="py-3 px-4 flex items-center gap-2 font-medium">
                        <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                          {log.userInitial || 'ส'}
                        </div>
                        {log.user}
                      </td>
                      <td className="py-3 px-4">
                        {log.action === 'Edit' && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">edit</span> Edit
                          </span>
                        )}
                        {log.action === 'Create' && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">add</span> Create
                          </span>
                        )}
                        {log.action === 'Delete' && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">delete</span> Delete
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-on-surface">{log.target}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{log.description}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-secondary font-medium">
                    ไม่พบข้อมูลประวัติการแก้ไขสัญญาเช่า
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination mock footer */}
        <div className="mt-auto px-4 py-3 border-t border-outline-variant bg-surface flex items-center justify-between font-sans text-xs text-on-surface-variant">
          <span>แสดง {filteredLogs.length} จากทั้งหมด {logs.length} รายการ</span>
          <div className="flex gap-1">
            <button className="p-1 rounded border border-outline-variant hover:bg-surface-container"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
            <button className="w-8 h-8 rounded border border-primary bg-primary-fixed text-primary font-bold">1</button>
            <button className="p-1 rounded border border-outline-variant hover:bg-surface-container"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
