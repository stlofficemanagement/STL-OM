import React, { useState, useMemo, useEffect } from 'react';
import { Branch, NotificationItem } from '../types';
import * as XLSX from 'xlsx';

// Strategic Marketing Insights & Recommendations by Year
interface MarketingInsight {
  title: string;
  yearName: string;
  direction: string;
  targetGroup: string;
  geoStrategy: string;
  costOptimization: string;
  summaryQuote: string;
}

const marketingInsightsData: Record<string, MarketingInsight> = {
  'all': {
    title: 'แผนกลยุทธ์การบริหารพอร์ตโฟลิโอแบบผสมผสาน (Synergistic Portfolio Overview)',
    yearName: 'รวมทุกปี (2567 - 2569)',
    direction: 'เร่งผลักดันสัดส่วนจากพื้นที่ห้างสรรพสินค้าขนาดใหญ่ (Retail Store) ที่มีต้นทุนคงที่สูง ไปสู่โมเดลเจาะตลาดชุมชนขนาดเล็กผ่านระบบแบรนด์คู่พาร์ทเนอร์ (AIS BUDDY) และการใช้พื้นที่เชิงวัฒนธรรม/ฝีมือเฉพาะกลุ่ม (Sewing Shop) เพื่อยึดทำเลหัวหาดระดับอำเภอและตำบลอย่างมีประสิทธิภาพสูงสุด',
    targetGroup: 'กลุ่มผู้บริโภคระดับกลาง-ฐานราก, กลุ่มครอบครัวยุคใหม่ที่ต้องการสมาร์ทโฟนพร้อมอินเทอร์เน็ตคุณภาพ, และกลุ่มผู้ประกอบการสิ่งทอในระดับครัวเรือน (Home-preneurs)',
    geoStrategy: 'เน้นขยายพื้นที่นอกหัวเมืองใหญ่ (Rural Area Expansion) เพื่อกระจายความเสี่ยง และบูรณาการข้อมูลทำเลแบบท้องถิ่น (Hyper-local Analytics) ในการเลือกจุดขยายคู่ค้า',
    costOptimization: 'ปรับสัญญาการเช่าให้สัดส่วนค่าเช่ารวม (Total Rental Expense) เฉลี่ยลดลง 15-20% โดยเปลี่ยนพอร์ตเป็นโมเดลแชร์ค่าเช่าหรือปรับขนาดสาขาให้เล็กลง (Micro-formats)',
    summaryQuote: 'การปรับโครงสร้างพื้นที่นี้ช่วยลดความเสี่ยงในการดำเนินงานระยะยาว และเพิ่มมูลค่าอัตรากำไรขั้นต้นจากการเช่าเฉลี่ยต่อตารางเมตรอย่างก้าวกระโดด'
  },
  '2024': {
    title: 'การสร้างแบรนด์มาตรฐานและการปรับปรุงฐานราก (Re-branding & Foundation Standardization)',
    yearName: 'ปี พ.ศ. 2567 (2024)',
    direction: 'เน้นการปรับปรุงมาตรฐานการบริการของสาขาหลัก (Retail Store) ให้มีรูปแบบและภาพลักษณ์เดียวกันทั่วประเทศ พร้อมยกระดับสู่ระบบสัญญาดิจิทัล (Digital Lease Validation) เพื่อลดต้นทุนเอกสารและการจัดการ',
    targetGroup: 'กลุ่มพนักงานเงินเดือนระดับปฏิบัติการ และช่างตัดเย็บเสื้อผ้ารุ่นเริ่มต้นที่มองหาจักรเย็บผ้าราคาย่อมเยา',
    geoStrategy: 'ขยายและปรับปรุงเฉพาะทำเลศูนย์กลางภูมิภาค (Hub Locations) เพื่อเป็นฐานการจัดส่งและสนับสนุนสินค้าใน 24 ชั่วโมง',
    costOptimization: 'เจรจาต่อรองส่วนลดค่าเช่าจากการเป็นผู้เช่ารายใหญ่ของอาคาร และจัดทำสัญญาเป็นระยะสั้น 1-2 ปีเพื่อประเมินความคุ้มทุนก่อนขยายต่อ',
    summaryQuote: 'ปี 2567 เป็นปีแห่งการปรับฐานรากและคัดกรองคู่สัญญาเช่าให้มีมาตรฐานสูงสุดเพื่อความมั่นคงทางการคลัง'
  },
  '2025': {
    title: 'การเจาะกลุ่มตลาดท้องถิ่นด้วยพันธมิตรเชิงกลยุทธ์ (Micro-franchising & O2O Partnerships)',
    yearName: 'ปี พ.ศ. 2568 (2025)',
    direction: 'ผลักดันสินค้าไอทีและระบบดิจิทัลร่วมกับพาร์ทเนอร์ AIS โดยใช้บูธและร้านสาขา AIS BUDDY เป็นกลไกขับเคลื่อนหลักในระดับภูมิภาค เพื่อกระจายความเสี่ยงด้านค่าเช่าคงที่และเข้าถึงผู้ซื้อถึงถิ่นฐาน',
    targetGroup: 'กลุ่มนักเรียน นักศึกษา เกษตรกร และกลุ่มครอบครัวชนบทที่ต้องการสมาร์ทโฟนและเครื่องใช้ไฟฟ้าพ่วงโปรแกรมผ่อนชำระ',
    geoStrategy: 'เน้นขยายพื้นที่ตลาดชุมชน, แหล่งการค้าท้องถิ่นระดับอำเภอ และจุดเชื่อมต่อขนส่งสาธารณะในภูมิภาค',
    costOptimization: 'เปลี่ยนจากโมเดลพื้นที่ขนาดใหญ่มาใช้เป็นบูธหรือห้องแถวขนาดเล็ก (Space size < 20 ตร.ม.) เพื่อควบคุมต้นทุนค่าเช่าต่อจุดให้ต่ำที่สุด',
    summaryQuote: 'การเติบโตอย่างรวดเร็วของ AIS BUDDY ช่วยสร้างแต้มต่อทางการตลาด และเป็นกลไกสำคัญในการเข้าถึงฐานผู้ใช้ระดับล่างอย่างใกล้ชิด'
  },
  '2026': {
    title: 'คอมมูนิตี้และงานฝีมือเพื่อการสร้างอาชีพ (Niche Craft & Community Hub Activation)',
    yearName: 'ปี พ.ศ. 2569 (2026)',
    direction: 'เปิดตัวโมเดล Sewing Shop ในฐานะคอมมูนิตี้การเรียนรู้เฉพาะทาง ดึงดูดกลุ่มแม่บ้านและวิสาหกิจชุมชน OTOP ให้เข้ามาร่วมกิจกรรมเวิร์กช็อป ช่วยสร้างความเชื่อมั่นต่อจักรเย็บผ้าและแบรนด์ SINGER',
    targetGroup: 'กลุ่มผู้ประกอบการธุรกิจเสื้อผ้ารายย่อย, กลุ่มแม่บ้าน, นักเรียนวิชาชีพ, และผู้มองหาอาชีพเสริมสร้างรายได้ที่สอง',
    geoStrategy: 'ทำเลใกล้ตลาดสดประจำจังหวัด แหล่งอุตสาหกรรมสิ่งทอในพื้นที่ และโรงเรียนฝึกอาชีพ',
    costOptimization: 'จัดสรรพื้นที่ใช้สอยแบบแชร์พื้นที่ (Co-working sewing space) ร่วมกับแบรนด์อุปกรณ์อื่นๆ เพื่อกระจายภาระค่าเช่าและดึงปริมาณผู้เข้าใช้บริการ',
    summaryQuote: 'การฟื้นฟูแบรนด์ดั้งเดิมผ่าน Sewing Shop ช่วยรักษาความผูกพันของแบรนด์ SINGER และเพิ่มส่วนแบ่งทางการตลาดกลุ่มเครื่องใช้ไฟฟ้าและจักรเย็บผ้าที่มีมาร์จินสูง'
  }
};



interface DashboardViewProps {
  branches: Branch[];
  notifications: NotificationItem[];
  onSelectBranch: (id: string) => void;
  onNavigateToView: (view: string) => void;
}

export default function DashboardView({
  branches,
  notifications,
  onSelectBranch,
  onNavigateToView,
}: DashboardViewProps) {
  // Chart Hover State
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  
  // Custom interactive download states
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedDownloadYear, setSelectedDownloadYear] = useState<string>('all');

  // Helper to parse dates
  const parseBranchDate = (dateStr: string | undefined): { year: number; month: number } | null => {
    if (!dateStr) return null;
    const matchYmd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchYmd) {
      return {
        year: parseInt(matchYmd[1], 10),
        month: parseInt(matchYmd[2], 10),
      };
    }
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const parts = dateStr.split(' ');
    if (parts.length >= 3) {
      const monthName = parts[1];
      let year = parseInt(parts[2], 10);
      if (year > 2500) year -= 543;
      const monthIdx = thaiMonths.indexOf(monthName);
      if (monthIdx !== -1) {
        return { year, month: monthIdx + 1 };
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1
      };
    }
    return null;
  };

  // 1. Show only the current year as requested by the user
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [String(currentYear)];
  }, []);

  // Selected year for the interactive chart, defaults to 2026
  const [selectedChartYear, setSelectedChartYear] = useState<string>('2026');

  // Keep selectedChartYear updated if availableYears changes and current selection is invalid
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedChartYear)) {
      setSelectedChartYear(availableYears[0]);
    }
  }, [availableYears, selectedChartYear]);

  // Short rent formatter
  const formatRentShort = (amount: number) => {
    if (amount >= 1000000) {
      return `฿${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `฿${(amount / 1000).toFixed(0)}K`;
    }
    return `฿${amount}`;
  };

  // Generate dynamic monthly data for a single year
  const getDynamicChartDataForYear = (yearStr: string, branchesList: Branch[]) => {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'];
    
    return months.map((monthName, mIdx) => {
      const monthNum = mIdx + 1;
      const targetYear = parseInt(yearStr, 10);
      
      const activeBranchesInMonth = branchesList.filter((b) => {
        // Let's check when the branch opens/starts
        const start = parseBranchDate(b.startDate) || parseBranchDate(b.openingDate);
        if (!start) return false;
        
        // Started in or before this month/year?
        const started = start.year < targetYear || (start.year === targetYear && start.month <= monthNum);
        if (!started) return false;
        
        // Ended in or before this month/year?
        if (b.endDate) {
          const end = parseBranchDate(b.endDate);
          if (end) {
            const ended = end.year < targetYear || (end.year === targetYear && end.month < monthNum);
            if (ended) return false;
          }
        } else if (b.status === 'Inactive') {
          return false;
        }
        
        return true;
      });

      let retailStoreCount = 0;
      let aisBuddyCount = 0;
      let directSaleCount = 0;
      let sewingShopCount = 0;
      let totalRent = 0;

      activeBranchesInMonth.forEach((b) => {
        const typeLower = (b.type || '').toLowerCase();
        const rentAmount = Number(b.rent) || 0;
        totalRent += rentAmount;

        if (typeLower.includes('buddy') || typeLower.includes('partner')) {
          aisBuddyCount++;
        } else if (typeLower.includes('direct') || typeLower.includes('sale')) {
          directSaleCount++;
        } else if (typeLower.includes('sewing') || typeLower.includes('cut') || typeLower.includes('studio')) {
          sewingShopCount++;
        } else {
          retailStoreCount++;
        }
      });

      return {
        month: monthName,
        total: activeBranchesInMonth.length,
        rent: formatRentShort(totalRent),
        types: [
          { name: 'Retail Store', value: retailStoreCount, color: 'bg-sky-500' },
          { name: 'AIS BUDDY', value: aisBuddyCount, color: 'bg-emerald-500' },
          { name: 'Direct Sale', value: directSaleCount, color: 'bg-blue-500' },
          { name: 'Sewing Shop', value: sewingShopCount, color: 'bg-rose-500' },
        ],
      };
    });
  };

  // Dynamically compute the datasets for the active years based on the active branches list
  const dynamicDatasetsByYear = useMemo(() => {
    const datasets: Record<string, Array<{ month: string; total: number; rent: string; types: Array<{ name: string; value: number; color: string }> }>> = {};
    availableYears.forEach((year) => {
      datasets[year] = getDynamicChartDataForYear(year, branches);
    });
    return datasets;
  }, [availableYears, branches]);

  // Safe marketing insight retriever
  const getActiveMarketingInsight = (yearKey: string): MarketingInsight => {
    if (marketingInsightsData[yearKey]) {
      return marketingInsightsData[yearKey];
    }
    const thYear = parseInt(yearKey, 10) + 543;
    return {
      title: `แผนพัฒนาเชิงพื้นที่และการประเมินประสิทธิภาพสาขา (Asset Optimization & Performance Review)`,
      yearName: `ปี พ.ศ. ${thYear} (${yearKey})`,
      direction: `มุ่งเน้นการประเมินประสิทธิภาพของพื้นที่เช่าใหม่ในปี ${thYear} ควบคู่ไปกับการควบคุมเสถียรภาพของต้นทุน โดยการวิเคราะห์ข้อมูลความคุ้มค่า (Yield per square meter) และการเจรจาต่ออายุสัญญาเชิงรุกก่อนครบกำหนด`,
      targetGroup: `กลุ่มผู้ใช้บริการหลักในกลุ่มพื้นที่จังหวัดเป้าหมาย และกลุ่มผู้ประกอบการยุคใหม่ในท้องถิ่น`,
      geoStrategy: `ยึดจุดยุทธศาสตร์ที่ได้ผลตอบแทนการลงทุนสูง (High-ROI Locations) และปรับกลยุทธ์แบบเน้นเป้าหมายตามพฤติกรรมลูกค้าท้องถิ่น`,
      costOptimization: `ตั้งเป้าเจรจาอัตราค่าเช่าให้สอดคล้องกับสภาพเศรษฐกิจจริง และจัดสรรพื้นที่ใช้งานร่วม (Shared Spaces) เพื่อกระจายต้นทุน`,
      summaryQuote: `การบริหารจัดการพื้นที่เช่าด้วยความยืดหยุ่นและการวางแผนทางการเงินที่รอบคอบ คือหัวใจสำคัญของปี พ.ศ. ${thYear}`
    };
  };

  const downloadOptions = useMemo(() => {
    const minThai = availableYears.length > 0 ? parseInt(availableYears[0], 10) + 543 : 2567;
    const maxThai = availableYears.length > 0 ? parseInt(availableYears[availableYears.length - 1], 10) + 543 : 2569;
    
    const list = [{ key: 'all', label: `รวมทุกปี (${minThai}-${maxThai})` }];
    availableYears.forEach(yr => {
      list.push({ key: yr, label: `ปี ${parseInt(yr, 10) + 543} (${yr})` });
    });
    return list;
  }, [availableYears]);

  const monthlyLeaseGrowth = dynamicDatasetsByYear[selectedChartYear] || [];

  // Dynamic statistics calculations based on current local list of branches
  // Let's compute some nice ratios or counts to make it feel super alive!
  const totalLocalBranches = branches.length;
  const activeLocalBranches = branches.filter((b) => b.status === 'Active' || b.status === 'ใช้งานอยู่').length;
  const underRenovationBranches = branches.filter((b) => b.status === 'ปิดปรับปรุง' || b.status === 'ปรับปรุง').length;
  const uniqueProvincesCount = Array.from(new Set(branches.map(b => b.province).filter(Boolean))).length;

  const expiringSoonCount = branches.filter((b) => {
    if (!b.endDate) return false;
    const diffTime = new Date(b.endDate).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  }).length;

  const totalRentSum = branches.reduce((sum, b) => sum + (Number(b.rent) || 0), 0);

  // Dynamically compute count of each branch type
  const typeCounts = branches.reduce((acc, branch) => {
    const bType = branch.type || 'ไม่ระบุ';
    acc[bType] = (acc[bType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Only show types that have at least one branch in the current list
  const allTypesInSystem = Object.keys(typeCounts).filter((t) => typeCounts[t] > 0);

  const getIconForType = (t: string) => {
    const lower = t.toLowerCase();
    if (lower.includes('buddy')) return 'handshake';
    if (lower.includes('direct')) return 'person_pin_circle';
    if (lower.includes('partner')) return 'handshake';
    if (lower.includes('outlet')) return 'shopping_bag';
    if (lower.includes('store')) return 'store';
    if (lower.includes('sewing')) return 'content_cut';
    if (lower.includes('mall') || lower.includes('ห้างสรรพสินค้า')) return 'domain';
    return 'storefront';
  };

  const getColorClassForType = (t: string) => {
    const lower = t.toLowerCase();
    if (lower.includes('buddy')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (lower.includes('direct')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('partner')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (lower.includes('outlet')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (lower.includes('store')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (lower.includes('sewing')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (lower.includes('mall') || lower.includes('ห้างสรรพสินค้า')) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const handleDownloadExcelReport = (yearKey: string) => {
    const wb = XLSX.utils.book_new();
    const yearInsight = getActiveMarketingInsight(yearKey);

    // 1. Sheet 1: แผนกลยุทธ์การตลาด (Marketing Strategy Sheet)
    const strategyRows = [
      ["บทสรุปทิศทางการตลาดและแผนกลยุทธ์ช่องทางสาขา SINGER"],
      ["ช่วงเวลาวิเคราะห์", yearInsight.yearName],
      [],
      ["หัวข้อกลยุทธ์", "รายละเอียดเชิงลึกเพื่อการตัดสินใจทางธุรกิจ"],
      ["แนวคิดและทิศทางการตลาดหลัก (Primary Market Direction)", yearInsight.direction],
      ["กลุ่มเป้าหมายผู้บริโภคหลัก (Target Demographics)", yearInsight.targetGroup],
      ["กลยุทธ์การเลือกทำเลและขยายพื้นที่ (Geographical Strategy)", yearInsight.geoStrategy],
      ["การบริหารจัดการต้นทุนและสัญญาเช่า (Cost & Lease Management)", yearInsight.costOptimization],
      ["บทสรุปเพื่อผู้บริหาร (Executive Summary Quote)", yearInsight.summaryQuote],
      [],
      ["ข้อเสนอแนะเชิงกลยุทธ์เพิ่มเติม (Strategic Recommendations)"],
      ["1. ส่งเสริมการขยายช่องทางโมเดลขนาดเล็ก (Mini-formats)", "เพื่อลดภาระค่าเช่าคงที่และเพิ่มยอดขายเฉลี่ยต่อตารางเมตร"],
      ["2. บูรณาการแคมเปญการขายสินค้าคู่กับบริการโทรศัพท์ (Cross-promotion)", "ร่วมกับพาร์ทเนอร์เพื่อใช้จุดบริการ AIS BUDDY เป็นศูนย์กลางบริการ O2O"],
      ["3. สร้างเวิร์กช็อปเย็บผ้าดึงดูดลูกค้าและแบรนด์คู่ค้า", "ใช้ Sewing Shop เป็นศูนย์กลางการฝึกอาชีพเพื่อเพิ่มการรับรู้แบรนด์และผลักดันแคมเปญกระตุ้นยอดขายแบบมีส่วนร่วม"]
    ];

    const wsStrategy = XLSX.utils.aoa_to_sheet(strategyRows);
    
    // Auto column widths
    wsStrategy['!cols'] = [
      { wch: 45 },
      { wch: 90 }
    ];

    XLSX.utils.book_append_sheet(wb, wsStrategy, "แผนกลยุทธ์การตลาด");

    // 2. Sheet 2: ข้อมูลการเติบโตรายเดือน (Monthly Growth Sheet)
    const growthRows: any[] = [];
    if (yearKey === 'all') {
      availableYears.forEach(yr => {
        const dataForYear = dynamicDatasetsByYear[yr];
        dataForYear.forEach(row => {
          const retail = row.types.find(t => t.name === 'Retail Store')?.value || 0;
          const buddy = row.types.find(t => t.name === 'AIS BUDDY')?.value || 0;
          const direct = row.types.find(t => t.name === 'Direct Sale')?.value || 0;
          const sewing = row.types.find(t => t.name === 'Sewing Shop')?.value || 0;
          growthRows.push({
            "ปี พ.ศ.": parseInt(yr) + 543,
            "ปี ค.ศ.": parseInt(yr),
            "เดือน": row.month,
            "Retail Store (สาขา)": retail,
            "AIS BUDDY (สาขา)": buddy,
            "Direct Sale (สาขา)": direct,
            "Sewing Shop (สาขา)": sewing,
            "รวมสัญญาเช่าทั้งหมด (สัญญา)": row.total,
            "ประมาณการค่าเช่ารวม": row.rent
          });
        });
      });
    } else {
      const dataForYear = dynamicDatasetsByYear[yearKey];
      dataForYear.forEach(row => {
        const retail = row.types.find(t => t.name === 'Retail Store')?.value || 0;
        const buddy = row.types.find(t => t.name === 'AIS BUDDY')?.value || 0;
        const direct = row.types.find(t => t.name === 'Direct Sale')?.value || 0;
        const sewing = row.types.find(t => t.name === 'Sewing Shop')?.value || 0;
        growthRows.push({
          "ปี พ.ศ.": parseInt(yearKey) + 543,
          "ปี ค.ศ.": parseInt(yearKey),
          "เดือน": row.month,
          "Retail Store (สาขา)": retail,
          "AIS BUDDY (สาขา)": buddy,
          "Direct Sale (สาขา)": direct,
          "Sewing Shop (สาขา)": sewing,
          "รวมสัญญาเช่าทั้งหมด (สัญญา)": row.total,
          "ประมาณการค่าเช่ารวม": row.rent
        });
      });
    }

    const wsGrowth = XLSX.utils.json_to_sheet(growthRows);
    XLSX.utils.book_append_sheet(wb, wsGrowth, "ข้อมูลการเติบโตรายเดือน");

    // 3. Sheet 3: รายชื่อสาขาปัจจุบันในระบบ (Active Branches Sheet)
    const dbBranchesRows = branches.map(b => ({
      "รหัสสัญญา": b.contractNumber || b.id,
      "ชื่อสาขา": b.name,
      "ประเภทสาขา": b.type,
      "จังหวัด": b.province,
      "ผู้จัดการสาขา": b.manager,
      "เบอร์โทรศัพท์": b.phone,
      "อีเมลติดต่อ": b.email,
      "ขนาดพื้นที่ (ตร.ม.)": b.spaceSize,
      "ค่าเช่าต่อเดือน (บาท)": b.rent,
      "เงินประกันสัญญา (บาท)": b.deposit,
      "วันเริ่มต้นสัญญาเช่า": b.startDate,
      "วันสิ้นสุดสัญญาเช่า": b.endDate,
      "สถานะการใช้งาน": b.status
    }));

    const wsBranches = XLSX.utils.json_to_sheet(dbBranchesRows);
    XLSX.utils.book_append_sheet(wb, wsBranches, "รายชื่อสาขาปัจจุบัน");

    // Trigger file download
    const fileName = yearKey === 'all' 
      ? `SINGER_Lease_Growth_All_Years_Marketing_Report_${new Date().getFullYear()}.xlsx`
      : `SINGER_Lease_Growth_Year_${yearKey}_Marketing_Report.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div id="dashboard-container" className="flex flex-col gap-8">
      {/* Dashboard Heading Title */}
      <div className="mb-2">
        <h2 className="text-3xl font-display font-extrabold text-on-surface mb-2">ภาพรวมแดชบอร์ด</h2>
        <p className="text-base text-secondary font-sans">
          สรุปข้อมูลการจัดการสัญญาเช่าและสถานะสาขาทั่วประเทศ (สถิติปัจจุบัน ณ เดือนปัจจุบัน)
        </p>
      </div>

      {/* 4 Core Metric cards in a grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white border border-outline-variant rounded-lg p-6 hover:bg-surface-container-low transition-all duration-200 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-sans font-bold text-secondary uppercase tracking-wider">สัญญาเช่าทั้งหมด</h3>
            <div className="p-2 bg-primary-fixed text-on-primary-fixed rounded">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-on-surface">{branches.length.toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-sans text-primary font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>อัปเดตแบบเรียลไทม์</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-outline-variant rounded-lg p-6 hover:bg-surface-container-low transition-all duration-200 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-sans font-bold text-secondary uppercase tracking-wider">สาขาที่ใช้งานอยู่</h3>
            <div className="p-2 bg-surface-container-high text-on-surface rounded">
              <span className="material-symbols-outlined text-[20px]">storefront</span>
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-on-surface">{activeLocalBranches.toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-sans text-secondary">
            <span>ครอบคลุม {uniqueProvincesCount} จังหวัด ({totalLocalBranches} สาขาทั้งหมด)</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-outline-variant rounded-lg p-6 hover:bg-surface-container-low transition-all duration-200 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#f59f00] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-sans font-bold text-secondary uppercase tracking-wider">การต่ออายุที่กำลังจะมาถึง</h3>
            <div className="p-2 bg-[#fff3bf] text-[#d9480f] rounded">
              <span className="material-symbols-outlined text-[20px]">update</span>
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-on-surface">{expiringSoonCount.toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-sans text-[#d9480f] font-semibold">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>สัญญาหมดอายุภายใน 90 วัน</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-outline-variant rounded-lg p-6 hover:bg-surface-container-low transition-all duration-200 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#2b8a3e] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-sans font-bold text-secondary uppercase tracking-wider">ค่าเช่ารวมต่อเดือน</h3>
            <div className="p-2 bg-[#d3f9d8] text-[#2b8a3e] rounded">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-[#2b8a3e]">฿{totalRentSum.toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-sans text-secondary">
            <span>จากสัญญาเช่าทั้งหมดในระบบ</span>
          </div>
        </div>
      </div>

      {/* Branch Type Category Row */}
      {allTypesInSystem.length > 0 && (
        <div>
          <h3 className="text-lg font-display font-bold text-on-surface mb-4">สรุปประเภทสาขา</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {allTypesInSystem.map((t) => {
              const count = typeCounts[t] || 0;
              const icon = getIconForType(t);
              const colorClass = getColorClassForType(t);
              return (
                <div 
                  key={t} 
                  className="bg-white border border-outline-variant rounded-lg p-4 flex flex-col gap-3 justify-between hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-secondary uppercase leading-tight line-clamp-2 max-w-[80%]">
                      {t}
                    </span>
                    <div className={`p-1.5 rounded-full shrink-0 flex items-center justify-center ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]}`}>
                      <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-on-surface leading-none">
                      {count}
                    </p>
                    <p className="text-[10px] text-secondary mt-1 font-sans">สาขาในระบบ</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bento Grid Area - Interactive custom chart and Notification list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Lease Growth interactive Bar chart (Span 2) */}
        <div className="lg:col-span-2 bg-white border border-outline-variant rounded-lg p-6 flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-display font-bold text-on-surface">การเติบโตของสัญญาเช่ารายเดือน</h3>
              {/* Color legend representing branch types */}
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-sm"></span>
                  <span className="text-[10px] text-secondary font-sans font-medium">Retail Store</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                  <span className="text-[10px] text-secondary font-sans font-medium">AIS BUDDY</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>
                  <span className="text-[10px] text-secondary font-sans font-medium">Direct Sale</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
                  <span className="text-[10px] text-secondary font-sans font-medium">Sewing Shop</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Interactive Year Selector Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-outline-variant/30 shrink-0">
                {availableYears.map((year) => {
                  const thYear = parseInt(year, 10) + 543;
                  const label = `${thYear} (${year})`;
                  return (
                    <button
                      key={year}
                      onClick={() => setSelectedChartYear(year)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        selectedChartYear === year
                          ? 'bg-white text-primary shadow-xs font-bold border border-outline-variant/10'
                          : 'text-secondary hover:text-on-surface'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowDownloadModal(true)}
                className="text-primary hover:bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 shadow-sm hover:scale-[1.02]"
                title="เลือกดาวน์โหลดรายงานแยกรายปีพร้อมวิเคราะห์ทิศทางการตลาด"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                ดาวน์โหลดรายงาน
              </button>
            </div>
          </div>

          {/* Custom Interactive Chart Area */}
          <div className="flex-1 min-h-[280px] relative w-full rounded border border-outline-variant/30 bg-[#F8F9FA] flex items-end p-4 gap-3 lg:gap-6">
            {(() => {
              const maxTotalVal = Math.max(...monthlyLeaseGrowth.map(d => d.total), 0);
              
              if (maxTotalVal === 0) {
                return (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
                    <span className="material-symbols-outlined text-outline text-3xl">bar_chart_off</span>
                    <p className="text-xs font-semibold text-secondary">ไม่มีข้อมูลสัญญาเช่าที่เริ่มต้นหรือเปิดดำเนินการในปี พ.ศ. {parseInt(selectedChartYear) + 543}</p>
                    <p className="text-[10px] text-outline">เมื่อคุณเพิ่มสาขาหรือต่อสัญญาใหม่ในช่วงปีนี้ กราฟและข้อมูลรายงานจะคำนวณและแสดงผลที่นี่โดยอัตโนมัติ</p>
                  </div>
                );
              }

              return monthlyLeaseGrowth.map((data, index) => {
                const isHovered = hoveredBar === index;
                const barHeight = data.total > 0 ? Math.max((data.total / maxTotalVal) * 220, 12) : 0;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end z-10"
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 bg-[#1e293b] text-white text-[11px] font-sans px-3 py-2 rounded-lg shadow-xl z-20 flex flex-col gap-1.5 w-44">
                        <div className="border-b border-slate-700 pb-1 font-bold flex justify-between items-center">
                          <span>เดือน {data.month}</span>
                          <span className="text-emerald-400 font-bold">{data.rent}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {data.types.map((t, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 ${t.color} rounded-full`}></span>
                                <span className="text-slate-300 text-[10px] truncate max-w-[90px]">{t.name}</span>
                              </div>
                              <span className="font-semibold text-white">{t.value} สาขา</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-slate-700 pt-1 mt-0.5 text-[10px] text-slate-400 flex justify-between font-medium">
                          <span>รวมทั้งหมด:</span>
                          <span className="text-white font-bold">{data.total} สัญญา</span>
                        </div>
                      </div>
                    )}

                    {/* Animated Stacked Bar */}
                    {data.total > 0 && (
                      <div
                        className={`w-full rounded-t overflow-hidden flex flex-col transition-all duration-300 ${
                          isHovered ? 'shadow-md scale-x-[1.05] ring-2 ring-primary/20' : ''
                        }`}
                        style={{ height: `${barHeight}px` }}
                      >
                        {data.types.map((t, idx) => {
                          const segmentHeightPercent = data.total > 0 ? (t.value / data.total) * 100 : 0;
                          if (segmentHeightPercent === 0) return null;
                          return (
                            <div
                              key={idx}
                              className={`${t.color} w-full transition-all duration-200 hover:brightness-110`}
                              style={{ height: `${segmentHeightPercent}%` }}
                              title={`${t.name}: ${t.value} สัญญา`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}

            {/* Simulated Horizontal Guidelines */}
            <div className="absolute w-full h-[1px] bg-outline-variant/10 bottom-[25%] left-0 pointer-events-none"></div>
            <div className="absolute w-full h-[1px] bg-outline-variant/10 bottom-[50%] left-0 pointer-events-none"></div>
            <div className="absolute w-full h-[1px] bg-outline-variant/10 bottom-[75%] left-0 pointer-events-none"></div>
          </div>

          {/* Month Labels */}
          <div className="flex justify-between mt-3 px-2 text-xs font-sans text-secondary font-semibold">
            {monthlyLeaseGrowth.map((data, idx) => (
              <span key={idx} className="flex-1 text-center">
                {data.month}
              </span>
            ))}
          </div>
        </div>

        {/* Right Col: Notification center */}
        <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-display font-bold text-on-surface mb-6">การแจ้งเตือนสำคัญ</h3>
            <div className="flex flex-col gap-4">
              {(showAllNotifications ? notifications : notifications.slice(0, 4)).map((not) => {
                const getIconStyles = (type: string) => {
                  switch (type) {
                    case 'warning':
                      return { bg: 'bg-[#fff3bf]', text: 'text-[#d9480f]', icon: 'warning' };
                    case 'success':
                      return { bg: 'bg-[#d3f9d8]', text: 'text-[#2b8a3e]', icon: 'task_alt' };
                    case 'error':
                      return { bg: 'bg-error-container', text: 'text-on-error-container', icon: 'error' };
                    default:
                      return { bg: 'bg-surface-variant', text: 'text-on-surface', icon: 'info' };
                  }
                };

                const styleObj = getIconStyles(not.type);

                return (
                  <div
                    key={not.id}
                    onClick={() => alert(`แจ้งเตือน: ${not.title}\n${not.description}`)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-high border border-transparent hover:border-outline-variant cursor-pointer transition-all duration-150"
                  >
                    <div className={`p-2 ${styleObj.bg} ${styleObj.text} rounded-full shrink-0`}>
                      <span className="material-symbols-outlined text-[18px]">{styleObj.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{not.title}</p>
                      <p className="text-[11px] text-secondary mt-0.5">{not.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {notifications.length > 4 && (
            <button
              onClick={() => setShowAllNotifications(!showAllNotifications)}
              className="w-full mt-6 text-primary hover:bg-primary-fixed border border-primary text-xs font-semibold py-2 rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <span>{showAllNotifications ? 'แสดงน้อยลง' : 'คลิกดูเพิ่มเติม'}</span>
              <span className="material-symbols-outlined text-[16px]">
                {showAllNotifications ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Table Section: Recent Activity */}
      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-white">
          <h3 className="text-lg font-display font-bold text-on-surface">กิจกรรมและสถานะล่าสุด (Recent Activity)</h3>
          <button
            onClick={() => onNavigateToView('branches')}
            className="text-secondary hover:text-primary transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            ดูสาขาทั้งหมด <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F3F5] text-secondary font-sans text-xs font-semibold border-b border-outline-variant">
                <th className="p-4 w-1/4">รหัสสัญญา/สาขา</th>
                <th className="p-4 w-1/4">ชื่อสาขา</th>
                <th className="p-4">ผู้ดำเนินการ / ผู้จัดการ</th>
                <th className="p-4">สถานะการต่ออายุ</th>
                <th className="p-4 text-right">วันปรับปรุงล่าสุด</th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-xs text-on-surface font-sans">
              {branches.slice(0, 4).map((branch) => {
                const getStatusBadge = (status: string) => {
                  if (status === 'Active' || status === 'ใช้งานอยู่') {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#d3f9d8] text-[#2b8a3e] font-sans text-[11px] font-semibold">
                        Active
                      </span>
                    );
                  } else if (status === 'ปิดปรับปรุง') {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#fff3bf] text-[#d9480f] font-sans text-[11px] font-semibold">
                        ปิดปรับปรุง
                      </span>
                    );
                  } else if (status === 'ปิดไม่มีพนักงานขาย') {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#f3f0ff] text-[#6f2db8] font-sans text-[11px] font-semibold">
                        ปิดไม่มีพนักงานขาย
                      </span>
                    );
                  } else if (status === 'เตรียมเปิดสาขา') {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#e7f5ff] text-[#1c7ed6] font-sans text-[11px] font-semibold">
                        เตรียมเปิดสาขา
                      </span>
                    );
                  } else {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-error-container text-primary font-sans text-[11px] font-semibold">
                        Inactive
                      </span>
                    );
                  }
                };

                return (
                  <tr
                    key={branch.id}
                    onClick={() => onSelectBranch(branch.id)}
                    className="border-b border-outline-variant/40 hover:bg-[#F8F9FA] transition-colors border-l-2 border-l-transparent hover:border-l-primary cursor-pointer"
                  >
                    <td className="p-4 font-semibold text-primary">{branch.contractNumber || branch.id}</td>
                    <td className="p-4 font-medium">{branch.name}</td>
                    <td className="p-4 text-secondary">{branch.manager}</td>
                    <td className="p-4">{getStatusBadge(branch.status)}</td>
                    <td className="p-4 text-right text-secondary">{branch.openingDate}</td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectBranch(branch.id)}
                        className="text-secondary hover:text-primary p-1 cursor-pointer"
                        title="ดูรายละเอียดสาขา"
                      >
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year Selection and Marketing Insights Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-outline-variant rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            {/* Modal Header */}
            <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-2xl">insights</span>
                <div>
                  <h3 className="font-display font-bold text-base leading-tight">สรุปรายงานประจำปี & ทิศทางการตลาด</h3>
                  <p className="text-[11px] text-white/80 font-sans">เลือกรอบปีเพื่อดาวน์โหลดรายงานการเติบโตของค่าเช่าและข้อมูลกลยุทธ์แบรนด์</p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/15 p-1 rounded-full transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
              {/* Segmented Controls for Years */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-2">เลือกปีที่ต้องการส่งออกข้อมูล (Select Year)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {downloadOptions.map((yr) => (
                    <button
                      key={yr.key}
                      onClick={() => setSelectedDownloadYear(yr.key)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all border text-center flex flex-col items-center justify-center gap-1 ${
                        selectedDownloadYear === yr.key
                          ? 'bg-primary/5 text-primary border-primary ring-2 ring-primary/10 shadow-xs'
                          : 'bg-surface text-on-surface border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="truncate">{yr.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Interactive Marketing Analysis Board */}
              {(() => {
                const downloadInsight = getActiveMarketingInsight(selectedDownloadYear);
                return (
                  <div className="bg-slate-50 border border-outline-variant/70 rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                        บทวิเคราะห์และแนวโน้มทางธุรกิจ SINGER
                      </span>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        {downloadInsight.yearName}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-1">🎯 ทิศทางและเป้าหมายการตลาดหลัก (Marketing Direction)</h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                          {downloadInsight.direction}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
                          <h5 className="text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-slate-500 text-sm">groups</span>
                            กลุ่มเป้าหมาย (Target Group)
                          </h5>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            {downloadInsight.targetGroup}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
                          <h5 className="text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-slate-500 text-sm">distance</span>
                            กลยุทธ์พื้นที่ (Geo Strategy)
                          </h5>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            {downloadInsight.geoStrategy}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#f0f9ff] border border-sky-100 p-3 rounded-lg">
                        <h5 className="text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sky-700 text-sm">savings</span>
                          แผนการลดค่าใช้จ่ายและการเจรจาสัญญาเช่า (Lease Optimization)
                        </h5>
                        <p className="text-[10px] text-sky-700 leading-relaxed">
                          {downloadInsight.costOptimization}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Highlight Summary Quote */}
                    <div className="border-t border-slate-200 pt-3 mt-1.5 flex gap-2 items-start">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">format_quote</span>
                      <p className="text-[10.5px] text-primary italic font-medium leading-relaxed">
                        {downloadInsight.summaryQuote}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Download File Outline Banners */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3.5 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                  <span className="material-symbols-outlined text-2xl">table_chart</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-emerald-900">ไฟล์รายงาน Excel มัลติเวิร์กชีต (.xlsx) ที่พร้อมดาวน์โหลด</p>
                  <p className="text-[10px] text-emerald-700 leading-relaxed mt-0.5">
                    ประกอบด้วย 3 แท็บข้อมูล: (1) แผนกลยุทธ์การตลาดประจำปี (2) ข้อมูลสถิติค่าเช่าและการเติบโตสาขารายเดือน (3) รายชื่อสาขาปัจจุบันในฐานข้อมูลพร้อมเบอร์โทรและรหัสสัญญาเช่า
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-outline-variant px-6 py-4 bg-slate-50 flex justify-between items-center gap-3">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:bg-slate-100 border border-outline-variant rounded-lg cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  handleDownloadExcelReport(selectedDownloadYear);
                  setShowDownloadModal(false);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-sm">download_for_offline</span>
                <span>ยืนยันดาวน์โหลดรายงานสถิติ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
