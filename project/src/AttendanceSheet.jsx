import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import 'bootstrap/dist/css/bootstrap.min.css';

const AttendanceSheet = ({ session, lang }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [holidays, setHolidays] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [orgId, setOrgId] = useState(null);

    // --- Configuration: Texts & Colors ---
    const leaveColors = {
        sick: '#dc3545', 
        personal: '#ffc107', 
        vacation: '#198754',
        maternity: '#0d6efd', 
        absent: '#212529', 
        late: '#fd7e14', 
        halfDay: '#6f42c1'
    };

    const texts = {
        TH: {
            title: "ตารางลงเวลา",
            empName: "ชื่อพนักงาน",
            summary: "สรุปยอดเดือนนี้ (วัน)",
            legendWork: "มาทำงาน (ติ๊กเอง)",
            legendHoliday: "วันหยุดนักขัตฤกษ์",
            exportBtn: "ดาวน์โหลด Excel",
            col: {
                present: { label: "เข้า", tooltip: "เข้างาน (รวมลาครึ่งวัน)" }, // ✅ อัปเดต Tooltip
                absent: { label: "ขาด", tooltip: "ขาดงาน" },
                vacation: { label: "พัก", tooltip: "ลาพักร้อน" },
                personal: { label: "กิจ", tooltip: "ลากิจ" },
                sick: { label: "ป่วย", tooltip: "ลาป่วย" },
                late: { label: "สาย", tooltip: "มาสาย" },         // ✅ เพิ่ม
                maternity: { label: "คลอด", tooltip: "ลาคลอด" },   // ✅ เพิ่ม
                halfDay: { label: "ครึ่ง", tooltip: "ลาครึ่งวัน" }  // ✅ เพิ่ม
            },
            codes: { sick: 'ป', personal: 'ก', vacation: 'พ', maternity: 'ค', absent: 'ข', late: 'ส', halfDay: 'คร' }
        },
        EN: {
            title: "Attendance Sheet",
            empName: "Employee Name",
            summary: "Monthly Summary (Days)",
            legendWork: "Present (Check)",
            legendHoliday: "Public Holiday",
            exportBtn: "Export Excel",
            col: {
                present: { label: "P", tooltip: "Present (Inc. Half-Day)" },
                absent: { label: "A", tooltip: "Absent" },
                vacation: { label: "V", tooltip: "Vacation" },
                personal: { label: "L", tooltip: "Personal Leave" },
                sick: { label: "S", tooltip: "Sick Leave" },
                late: { label: "Lt", tooltip: "Late" },
                maternity: { label: "M", tooltip: "Maternity" },
                halfDay: { label: "HD", tooltip: "Half-Day" }
            },
            codes: { sick: 'S', personal: 'P', vacation: 'V', maternity: 'M', absent: 'A', late: 'L', halfDay: 'HD' }
        },
        CN: {
            title: "考勤表",
            empName: "员工姓名",
            summary: "本月汇总 (天)",
            legendWork: "出勤 (勾选)",
            legendHoliday: "法定假日",
            exportBtn: "导出 Excel",
            col: {
                present: { label: "勤", tooltip: "出勤 (含半天)" },
                absent: { label: "旷", tooltip: "旷工" },
                vacation: { label: "休", tooltip: "年假" },
                personal: { label: "事", tooltip: "事假" },
                sick: { label: "病", tooltip: "病假" },
                late: { label: "迟", tooltip: "迟到" },
                maternity: { label: "产", tooltip: "产假" },
                halfDay: { label: "半", tooltip: "半天假" }
            },
            codes: { sick: '病', personal: '事', vacation: '休', maternity: '产', absent: '旷', late: '迟', halfDay: '半' }
        }
    };

    const t = texts[lang] || texts.TH;

    // --- Helper Functions ---
    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    };

    const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            if (!session) return;
            setIsLoading(true);
            try {
                const { data: profile } = await supabase.from('user_profiles').select('org_id').eq('user_id', session.user.id).single();
                if (!profile) throw new Error("No Org Found");
                setOrgId(profile.org_id);

                const { data: empData } = await supabase.from('employees').select('*').eq('org_id', profile.org_id).order('id');
                setEmployees(empData || []);

                const startStr = formatDateKey(days[0]);
                const endStr = formatDateKey(days[days.length - 1]);

                const { data: leaveData } = await supabase.from('leave_records').select('*').gte('date', startStr).lte('date', endStr);
                setLeaves(leaveData || []);

                const { data: attData } = await supabase.from('attendance_logs').select('*').gte('date', startStr).lte('date', endStr).eq('is_present', true);
                setAttendanceLogs(attData || []);

                const { data: hData } = await supabase.from('holidays').select('*');
                const hMap = {};
                if (hData) hData.forEach(h => hMap[h.date] = h.name);
                setHolidays(hMap);

            } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
        };
        fetchData();
    }, [session, currentDate, days]);

    // --- Actions ---
    const handleCheckAttendance = async (empId, date, currentStatus) => {
        if (!orgId) {
            alert("Organization ID not found. Please refresh the page.");
            return;
        }

        const dateStr = formatDateKey(date);
        
        // Optimistic Update
        if (!currentStatus) {
            setAttendanceLogs(prev => [...prev, { emp_id: empId, date: dateStr, is_present: true }]);
        } else {
            setAttendanceLogs(prev => prev.filter(r => !(r.emp_id === empId && r.date === dateStr)));
        }

        try {
            let error;
            if (!currentStatus) {
                // บันทึกการมาทำงาน
                // เพิ่ม .select() เพื่อตรวจสอบว่าการ Upsert สำเร็จจริงหรือไม่ (ป้องกันเคส 200 OK แต่ไม่ Update)
                const { data, error: upsertError } = await supabase
                    .from('attendance_logs')
                    .upsert(
                        { emp_id: empId, date: dateStr, is_present: true }, 
                        { onConflict: 'emp_id, date' }
                    )
                    .select();
                
                error = upsertError;

                // Hack: ถ้า Upsert ตอบกลับ 200/201 แต่ไม่มี Data กลับมา แสดงว่าติด RLS หรือ Update ไม่สำเร็จ
                if (!error && (!data || data.length === 0)) {
                    console.warn("Update returned no data. Attempting force re-insert...", { empId, dateStr });
                    
                    // ลองลบของเก่าทิ้งก่อน (ถ้ามี)
                    await supabase.from('attendance_logs').delete().eq('emp_id', empId).eq('date', dateStr);
                    
                    // ลอง Insert ใหม่
                    const { error: retryError } = await supabase
                        .from('attendance_logs')
                        .insert({ emp_id: empId, date: dateStr, is_present: true });
                    
                    error = retryError;
                }
            } else {
                const { error: deleteError } = await supabase
                    .from('attendance_logs')
                    .delete()
                    .eq('emp_id', empId)
                    .eq('date', dateStr);
                error = deleteError;
            }

            if (error) throw error;

        } catch (error) { 
            console.error("Error updating attendance:", error);
            alert("บันทึกไม่สำเร็จ: " + (error.message || "Unknown error"));
            
            // Revert state if failed
            if (!currentStatus) {
                setAttendanceLogs(prev => prev.filter(r => !(r.emp_id === empId && r.date === dateStr)));
            } else {
                setAttendanceLogs(prev => [...prev, { emp_id: empId, date: dateStr, is_present: true }]);
            }
        }
    };

    const getCellData = (empId, date) => {
        const dateStr = formatDateKey(date);
        const leaveRecord = leaves.find(l => l.emp_id === empId && l.date === dateStr);
        if (leaveRecord) return { type: 'leave', leaveType: leaveRecord.type };

        const isPresent = attendanceLogs.some(a => a.emp_id === empId && a.date === dateStr);

        if (holidays[dateStr]) return { type: 'holiday', isPresent, holidayName: holidays[dateStr] };

        return { type: 'work', isPresent };
    };

    // ✅ ปรับปรุง Logic คำนวณยอด
    const calculateStats = (empId) => {
        // 1. ตั้งค่าเริ่มต้นให้ครบทุกประเภท (ไม่ต้องมี Other แล้ว)
        let stats = { 
            present: 0, 
            sick: 0, 
            personal: 0, 
            vacation: 0, 
            absent: 0, 
            late: 0, 
            maternity: 0, 
            halfDay: 0 
        };

        // 2. นับวันมาทำงาน (ติ๊กถูก)
        stats.present = attendanceLogs.filter(a => a.emp_id === empId).length;

        // 3. นับวันลาประเภทต่างๆ
        leaves.filter(l => l.emp_id === empId).forEach(l => {
            const daysCount = Number(l.days) || 1;

            if (stats[l.type] !== undefined) {
                stats[l.type] += daysCount;
            }

            // ✅ Logic พิเศษ: ถ้าเป็น "ลาครึ่งวัน" (halfDay) ให้บวก 0.5 เข้าไปใน "ยอดเข้างาน" (present) ด้วย
            if (l.type === 'halfDay') {
                stats.present += 0.5;
            }
        });

        return stats;
    };

    const handleMonthChange = (offset) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const handleExportExcel = () => {
        const fileName = `Attendance_${formatDateKey(currentDate).substring(0, 7)}.xlsx`;

        // ✅ แก้ไข Header Excel ให้ตรงกับตารางใหม่
        const header = [
            t.empName, 
            t.col.present.label, 
            t.col.absent.label, 
            t.col.vacation.label, 
            t.col.personal.label, 
            t.col.sick.label,
            t.col.late.label,      // เพิ่ม
            t.col.maternity.label, // เพิ่ม
            t.col.halfDay.label,   // เพิ่ม
            ...days.map(d => d.getDate())
        ];

        const body = employees.map(emp => {
            const stats = calculateStats(emp.id);
            const dailyData = days.map(d => {
                const cell = getCellData(emp.id, d);
                if (cell.type === 'leave') return t.codes[cell.leaveType] || 'L';
                if (cell.type === 'holiday') return cell.isPresent ? '/' : 'H';
                return cell.isPresent ? '/' : '';
            });
            // ✅ แก้ไขข้อมูล Row ให้ตรง Header
            return [
                emp.name, 
                stats.present, 
                stats.absent, 
                stats.vacation, 
                stats.personal, 
                stats.sick, 
                stats.late, 
                stats.maternity, 
                stats.halfDay, 
                ...dailyData
            ];
        });

        const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, fileName);
    };

    if (isLoading) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 bg-white">
            <div className="loader-wrapper">
                <div className="loader-circle"></div><div className="loader-circle"></div><div className="loader-circle"></div>
                <div className="loader-shadow"></div><div className="loader-shadow"></div><div className="loader-shadow"></div>
            </div>
        </div>
    );

    return (
        <div className="container-fluid py-4 bg-white">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                <h4 className="fw-bold text-primary mb-0"></h4>

                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => handleMonthChange(-1)}><i className="bi bi-chevron-left"></i></button>
                    <span className="fw-bold fs-5 px-2">
                        {currentDate.toLocaleString(lang === 'TH' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => handleMonthChange(1)}><i className="bi bi-chevron-right"></i></button>

                    <button className="btn btn-success btn-sm ms-3" onClick={handleExportExcel}>
                        <i className="bi bi-file-earmark-excel me-1"></i> {t.exportBtn}
                    </button>
                </div>
            </div>

            <div className="table-responsive shadow-sm" style={{ borderRadius: '10px', overflowX: 'auto' }}>
                <table className="table table-bordered table-hover mb-0 text-center align-middle" style={{ fontSize: '0.85rem', minWidth: '1200px' }}>
                    <thead className="bg-light text-secondary">
                        <tr>
                            <th rowSpan="2" className="align-middle bg-white sticky-col" style={{ minWidth: '150px', left: 0, zIndex: 10, position: 'sticky' }}>{t.empName}</th>
                            
                            {/* ✅ ขยาย colSpan เป็น 8 ช่อง (เพราะเพิ่มประเภทลา) */}
                            <th colSpan="8" className="text-center">{t.summary}</th>
                            
                            {days.map(d => {
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return <th key={d} className={`p-1 ${isWeekend ? 'bg-light text-danger' : ''}`} style={{ minWidth: '35px' }}>{d.getDate()}</th>;
                            })}
                        </tr>
                        <tr>
                            {/* ✅ ปรับปรุง Header Columns (เอา Other ออก, เพิ่ม Late, Maternity, HalfDay) */}
                            <th className="text-success" title={t.col.present.tooltip}><small>{t.col.present.label}</small></th>
                            <th className="text-dark" title={t.col.absent.tooltip}><small>{t.col.absent.label}</small></th>
                            <th className="text-success" title={t.col.vacation.tooltip}><small>{t.col.vacation.label}</small></th>
                            <th className="text-warning" title={t.col.personal.tooltip}><small>{t.col.personal.label}</small></th>
                            <th className="text-danger" title={t.col.sick.tooltip}><small>{t.col.sick.label}</small></th>
                            
                            {/* Columns ใหม่ */}
                            <th className="text-warning" style={{color: '#fd7e14'}} title={t.col.late.tooltip}><small>{t.col.late.label}</small></th>
                            <th className="text-primary" title={t.col.maternity.tooltip}><small>{t.col.maternity.label}</small></th>
                            <th className="text-info" style={{color: '#6f42c1'}} title={t.col.halfDay.tooltip}><small>{t.col.halfDay.label}</small></th>

                            {days.map(d => {
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                const dayName = d.toLocaleString(lang === 'TH' ? 'th-TH' : 'en-US', { weekday: 'short' });
                                return <th key={d} className={`p-0 ${isWeekend ? 'text-danger' : ''}`}><small>{dayName}</small></th>;
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => {
                            const stats = calculateStats(emp.id);
                            return (
                                <tr key={emp.id}>
                                    <td className="text-start fw-bold bg-white sticky-col" style={{ left: 0, zIndex: 5, position: 'sticky' }}>{emp.name}</td>
                                    
                                    {/* ✅ แสดงผลข้อมูลตามช่องใหม่ */}
                                    <td className="bg-success-subtle fw-bold">{stats.present}</td>
                                    <td className="bg-secondary-subtle">{stats.absent}</td>
                                    <td>{stats.vacation}</td>
                                    <td>{stats.personal}</td>
                                    <td>{stats.sick}</td>
                                    <td>{stats.late}</td>
                                    <td>{stats.maternity}</td>
                                    <td>{stats.halfDay}</td>

                                    {days.map(d => {
                                        const cell = getCellData(emp.id, d);
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                                        if (cell.type === 'leave') return (
                                            <td key={d} style={{ backgroundColor: leaveColors[cell.leaveType], color: 'white' }} title={cell.leaveType}>
                                                {t.codes[cell.leaveType] || 'L'}
                                            </td>
                                        );

                                        if (cell.type === 'holiday') return (
                                            <td key={d} className="bg-warning-subtle position-relative" title={`${t.legendHoliday}: ${cell.holidayName}`}>
                                                <i className="bi bi-star-fill text-warning position-absolute" style={{ fontSize: '0.6rem', top: '2px', right: '2px' }}></i>
                                                <input type="checkbox" className="form-check-input border-dark" style={{ cursor: 'pointer' }} checked={cell.isPresent} onChange={() => handleCheckAttendance(emp.id, d, cell.isPresent)} />
                                            </td>
                                        );

                                        return (
                                            <td key={d} className={isWeekend ? 'bg-light' : ''}>
                                                <input type="checkbox" className="form-check-input border-dark" style={{ cursor: 'pointer' }} checked={cell.isPresent} onChange={() => handleCheckAttendance(emp.id, d, cell.isPresent)} />
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 d-flex flex-wrap gap-3 small">
                <span className="d-flex align-items-center gap-1"><div style={{ width: 15, height: 15, border: '1px solid #333', borderRadius: 3 }}></div> {t.legendWork}</span>
                <span className="d-flex align-items-center gap-1"><div style={{ width: 15, height: 15, background: leaveColors.sick }}></div> {t.codes.sick}={t.col.sick.tooltip}</span>
                <span className="d-flex align-items-center gap-1"><div style={{ width: 15, height: 15, background: leaveColors.personal }}></div> {t.codes.personal}={t.col.personal.tooltip}</span>
                <span className="d-flex align-items-center gap-1"><div style={{ width: 15, height: 15, background: leaveColors.vacation }}></div> {t.codes.vacation}={t.col.vacation.tooltip}</span>
                <span className="d-flex align-items-center gap-1"><div style={{ width: 15, height: 15, background: leaveColors.absent }}></div> {t.codes.absent}={t.col.absent.tooltip}</span>
                <span className="d-flex align-items-center gap-1"><i className="bi bi-star-fill text-warning"></i> {t.legendHoliday}</span>
            </div>
        </div>
    );
};

export default AttendanceSheet;