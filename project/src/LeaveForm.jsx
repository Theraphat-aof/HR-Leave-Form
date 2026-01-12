import React, { useState, useMemo, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-calendar/dist/Calendar.css';
import Calendar from 'react-calendar';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

const LeaveForm = () => {
    const [lang, setLang] = useState('TH');

    const [employees, setEmployees] = useState([]);
    const [leaveRecords, setLeaveRecords] = useState([]);
    const [thaiHolidays, setThaiHolidays] = useState({});

    const [selectedEmpId, setSelectedEmpId] = useState(null);
    const [newEmpName, setNewEmpName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeLeaveType, setActiveLeaveType] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Configuration ---
    const texts = {
        TH: { appTitle: "ระบบบันทึกวันลา (Online)", empListTitle: "รายชื่อพนักงาน", searchPlaceholder: "ค้นหาชื่อ...", addEmpPlaceholder: "ชื่อพนักงานใหม่...", addBtn: "เพิ่ม", exportMonthBtn: "Excel (เดือนนี้)", exportAllBtn: "Excel (ปีนี้)", summaryTitle: "สรุปวันลาของ", monthUsage: "เดือนนี้", yearUsage: "ปีนี้", selectType: "เลือกประเภท", noEmpSelected: "กรุณาเลือกพนักงาน", types: { personal: "ลากิจ", sick: "ลาป่วย", vacation: "พักร้อน", maternity: "ลาคลอด", absent: "ขาดงาน", late: "มาสาย", halfDay: "ลาครึ่งวัน" } },
        CN: { appTitle: "休假管理系统 (Online)", empListTitle: "员工列表", searchPlaceholder: "搜索姓名...", addEmpPlaceholder: "新员工姓名...", addBtn: "添加", exportMonthBtn: "Excel (本月)", exportAllBtn: "Excel (全部)", summaryTitle: "休假摘要", monthUsage: "本月", yearUsage: "本年", selectType: "选择类型", noEmpSelected: "请选择员工", types: { personal: "事假", sick: "病假", vacation: "年假", maternity: "产假", absent: "旷工", late: "迟到", halfDay: "半天假" } }
    };
    const leaveTypes = [
        { id: 'personal', color: '#ffc107', label: texts[lang].types.personal },
        { id: 'sick', color: '#dc3545', label: texts[lang].types.sick },
        { id: 'vacation', color: '#198754', label: texts[lang].types.vacation },
        { id: 'maternity', color: '#0d6efd', label: texts[lang].types.maternity },
        { id: 'absent', color: '#212529', label: texts[lang].types.absent },
        { id: 'late', color: '#fd7e14', label: texts[lang].types.late },
        { id: 'halfDay', color: '#6f42c1', label: texts[lang].types.halfDay },
    ];

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: empData, error: empError } = await supabase.from('employees').select('*').order('id');
                if (empError) throw empError;
                setEmployees(empData);
                if (empData.length > 0) setSelectedEmpId(empData[0].id);

                const { data: leaveData, error: leaveError } = await supabase.from('leave_records').select('*');
                if (leaveError) throw leaveError;
                const formattedLeaves = leaveData.map(r => ({ ...r, empId: r.emp_id }));
                setLeaveRecords(formattedLeaves);

                const { data: holidayData } = await supabase.from('holidays').select('*');
                if (holidayData) {
                    const hMap = {};
                    holidayData.forEach(h => hMap[h.date] = h.name);
                    setThaiHolidays(hMap);
                }
            } catch (error) {
                console.error("Error fetching data:", error.message);
                alert("โหลดข้อมูลไม่สำเร็จ: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const currentEmployee = employees.find(e => e.id === selectedEmpId) || {};
    const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // --- Actions ---
    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newEmpName.trim()) return;
        try {
            const { data, error } = await supabase.from('employees').insert([{ name: newEmpName }]).select();
            if (error) throw error;
            if (data) {
                setEmployees(prev => [...prev, data[0]]);
                setNewEmpName('');
                setSelectedEmpId(data[0].id);
            }
        } catch (error) {
            alert("เพิ่มพนักงานไม่ได้: " + error.message);
        }
    };

    const handleEditEmployee = async (id, oldName, e) => {
        e.stopPropagation();
        const newName = prompt("แก้ไขชื่อ / Edit Name:", oldName);
        if (newName && newName.trim() && newName !== oldName) {
            try {
                const { error } = await supabase.from('employees').update({ name: newName }).eq('id', id);
                if (error) throw error;
                setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, name: newName } : emp));
            } catch (error) {
                alert("แก้ไขชื่อไม่สำเร็จ");
            }
        }
    };

    const handleDeleteEmployee = async (id, e) => {
        e.stopPropagation();
        if (window.confirm("ยืนยันการลบ? ข้อมูลการลาทั้งหมดของคนนี้จะหายไป")) {
            try {
                const { error } = await supabase.from('employees').delete().eq('id', id);
                if (error) throw error;
                setEmployees(prev => prev.filter(emp => emp.id !== id));
                setLeaveRecords(prev => prev.filter(rec => rec.empId !== id));
                if (selectedEmpId === id) setSelectedEmpId(null);
            } catch (error) {
                alert("ลบข้อมูลไม่สำเร็จ");
            }
        }
    };

    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDayClick = async (value) => {
        if (!activeLeaveType || !selectedEmpId) return;
        const dateKey = formatDateKey(value);
        if (thaiHolidays[dateKey]) { alert('วันหยุดนักขัตฤกษ์'); return; }

        const daysValue = activeLeaveType === 'halfDay' ? 0.5 : 1.0;
        const existingRecord = leaveRecords.find(r => r.date === dateKey && r.empId === selectedEmpId);

        try {
            if (existingRecord) {
                if (existingRecord.type === activeLeaveType) {
                    const { error } = await supabase.from('leave_records').delete().eq('emp_id', selectedEmpId).eq('date', dateKey);
                    if (error) throw error;
                    setLeaveRecords(prev => prev.filter(r => !(r.date === dateKey && r.empId === selectedEmpId)));
                } else {
                    const { error } = await supabase.from('leave_records').update({ type: activeLeaveType, days: daysValue }).eq('emp_id', selectedEmpId).eq('date', dateKey);
                    if (error) throw error;
                    setLeaveRecords(prev => prev.map(r => (r.date === dateKey && r.empId === selectedEmpId) ? { ...r, type: activeLeaveType, days: daysValue } : r));
                }
            } else {
                const { data, error } = await supabase.from('leave_records').insert([{ emp_id: selectedEmpId, date: dateKey, type: activeLeaveType, days: daysValue }]).select();
                if (error) throw error;
                if (data) setLeaveRecords(prev => [...prev, { ...data[0], empId: data[0].emp_id }]);
            }
        } catch (error) {
            console.error(error);
            alert("บันทึกข้อมูลไม่สำเร็จ: " + error.message);
        }
    };

    const getTileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateKey = formatDateKey(date);
            const record = leaveRecords.find(r => r.date === dateKey && r.empId === selectedEmpId);
            const holidayName = thaiHolidays[dateKey];
            return (
                <div className="d-flex flex-column align-items-center">
                    {holidayName && <span className="holiday-text">{holidayName}</span>}
                    {record && (
                        <div className="badge rounded-pill mt-1" style={{ backgroundColor: leaveTypes.find(t => t.id === record.type)?.color, fontSize: '0.6rem' }}>
                            {leaveTypes.find(t => t.id === record.type)?.label}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const getTileClassName = ({ date, view }) => (view === 'month' && thaiHolidays[formatDateKey(date)]) ? 'holiday-tile' : null;

    const stats = useMemo(() => {
        if (!selectedEmpId) return { yearly: 0, monthly: 0 };
        const currentYear = selectedDate.getFullYear();
        const currentMonth = selectedDate.getMonth();
        const myRecords = leaveRecords.filter(r => r.empId === selectedEmpId);
        const calculateDays = (records) => records.reduce((total, r) => total + (Number(r.days) || 1), 0);
        return {
            yearly: calculateDays(myRecords.filter(r => new Date(r.date).getFullYear() === currentYear)),
            monthly: calculateDays(myRecords.filter(r => {
                const d = new Date(r.date);
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            }))
        };
    }, [leaveRecords, selectedDate, selectedEmpId]);

    // --- New Export Function: สรุปรายชื่อพนักงานทุกคน ---
    const exportSummaryToExcel = (targetRecords, fileName) => {
        if (employees.length === 0) { alert("ไม่มีข้อมูลพนักงาน"); return; }

        const data = employees.map(emp => {
            const empRecords = targetRecords.filter(r => r.empId === emp.id);

            const totalDays = empRecords.reduce((sum, r) => sum + (Number(r.days) || 1), 0);

            const details = empRecords
                .sort((a, b) => new Date(a.date) - new Date(b.date)) 
                .map(r => {
                    const typeLabel = texts[lang].types[r.type] || r.type;
                    const isHoliday = thaiHolidays[r.date] ? ` [${thaiHolidays[r.date]}]` : '';
                    return `${r.date} (${typeLabel}${isHoliday})`;
                })
                .join(', ');

            // 5. คืนค่าเป็น Object สำหรับ Excel Row
            return {
                "รหัส (ID)": emp.id,
                "ชื่อพนักงาน (Name)": emp.name,
                "รวมวันลา (Total Days)": totalDays,
                "รายละเอียดการลา (Details)": details || "-" 
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
        XLSX.writeFile(wb, fileName);
    };

    if (isLoading) return <div className="text-center mt-5">Loading data...</div>;

    return (
        <div className="bg-light min-vh-100 font-sans">

            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark shadow-sm px-4 sticky-top">
                <a className="navbar-brand fw-bold" href="#">
                    <i className="bi bi-calendar-check me-2"></i> {texts[lang].appTitle}
                </a>
                <div className="d-flex ms-auto gap-2">
                    <button className="btn btn-outline-light btn-sm fw-bold" onClick={() => setLang(lang === 'TH' ? 'CN' : 'TH')} style={{ width: '80px' }}>
                        {lang === 'TH' ? 'CN' : 'TH'}
                    </button>
                </div>
            </nav>

            <div className="container-fluid py-4">
                <div className="row">

                    {/* Sidebar */}
                    <div className="col-md-3 mb-3">
                        <div className="card shadow-sm border-0 h-100">
                            <div className="card-header bg-white fw-bold py-3">{texts[lang].empListTitle}</div>
                            <div className="card-body d-flex flex-column">
                                <div className="mb-3">
                                    <input type="text" className="form-control" placeholder={texts[lang].searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>

                                <div className="list-group list-group-flush border rounded overflow-auto mb-3 flex-grow-1" style={{ maxHeight: '400px' }}>
                                    {filteredEmployees.map(emp => (
                                        <div
                                            key={emp.id}
                                            onClick={() => setSelectedEmpId(emp.id)}
                                            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center user-list-item ${selectedEmpId === emp.id ? 'active' : ''}`}
                                        >
                                            <span className="text-truncate" style={{ maxWidth: '120px' }}>{emp.name}</span>
                                            <div className="d-flex align-items-center gap-2">
                                                <i className="bi bi-pencil-square action-btn action-btn-edit" onClick={(e) => handleEditEmployee(emp.id, emp.name, e)}></i>
                                                <i className="bi bi-trash action-btn action-btn-delete" onClick={(e) => handleDeleteEmployee(emp.id, e)}></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleAddEmployee} className="input-group">
                                    <input type="text" className="form-control" placeholder={texts[lang].addEmpPlaceholder} value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} />
                                    <button className="btn-addname btn" type="submit"><i className="bi bi-plus-lg"></i></button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-md-9">
                        <div className="mb-4">
                            <h4 className="mb-3">{texts[lang].summaryTitle}: <span className="text-dark fw-bold">{currentEmployee.name || <span className="text-danger">({texts[lang].noEmpSelected})</span>}</span></h4>
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <div className="card border-0 shadow-sm p-3 h-100 d-flex flex-column justify-content-center">
                                        <h6 className="text-muted">{texts[lang].monthUsage}</h6>
                                        <h2 className="mb-0 fw-bold text-primary">{stats.monthly} <small className="fs-6 text-muted">Days</small></h2>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 shadow-sm p-3 h-100 d-flex flex-column justify-content-center">
                                        <h6 className="text-muted">{texts[lang].yearUsage}</h6>
                                        <h2 className="mb-0 fw-bold text-dark">{stats.yearly} <small className="fs-6 text-muted">Days</small></h2>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <button
                                        onClick={() => {
                                            const m = selectedDate.getMonth();
                                            const y = selectedDate.getFullYear();
                                            const monthName = selectedDate.toLocaleString('default', { month: 'long' }); // ชื่อเดือนภาษาไทย/อังกฤษ

                                            const monthlyData = leaveRecords.filter(r => {
                                                const d = new Date(r.date);
                                                return d.getMonth() === m && d.getFullYear() === y;
                                            });

                                            exportSummaryToExcel(monthlyData, `Summary_Monthly_${monthName}_${y}.xlsx`);
                                        }}
                                        className="btn btn-outline-primary shadow-sm w-100 h-100 d-flex align-items-center justify-content-center fw-bold"
                                    >
                                        <div className="text-center">
                                            <i className="bi bi-file-earmark-excel d-block fs-4"></i>
                                            {texts[lang].exportMonthBtn}
                                        </div>
                                    </button>
                                </div>

                                <div className="col-md-3">
                                    <button
                                        onClick={() => {
                                            const y = selectedDate.getFullYear();

                                            const yearlyData = leaveRecords.filter(r => {
                                                const d = new Date(r.date);
                                                return d.getFullYear() === y;
                                            });

                                            exportSummaryToExcel(yearlyData, `Summary_Year_${y}.xlsx`);
                                        }}
                                        className="btn btn-success shadow-sm w-100 h-100 d-flex align-items-center justify-content-center fw-bold"
                                    >
                                        <div className="text-center">
                                            <i className="bi bi-file-earmark-spreadsheet d-block fs-4"></i>
                                            {texts[lang].exportAllBtn}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-3 mb-3">
                                <div className="card shadow-sm border-0">
                                    <div className="card-header bg-white fw-bold">{texts[lang].selectType}</div>
                                    <div className="card-body p-2 d-grid gap-2">
                                        {leaveTypes.map((type) => (
                                            <button key={type.id} onClick={() => setActiveLeaveType(type.id)} disabled={!selectedEmpId} className="btn btn-sm text-start position-relative d-flex align-items-center" style={{ backgroundColor: activeLeaveType === type.id ? type.color : 'white', color: activeLeaveType === type.id ? 'white' : '#333', border: `1px solid ${type.color}`, opacity: !selectedEmpId ? 0.5 : 1 }}>
                                                <span className="rounded-circle me-2" style={{ width: 8, height: 8, backgroundColor: activeLeaveType === type.id ? 'white' : type.color }}></span>
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-9">
                                <div className="card shadow border-0 p-3">
                                    <Calendar
                                        onChange={setSelectedDate}
                                        value={selectedDate}
                                        onClickDay={handleDayClick}
                                        tileContent={getTileContent}
                                        tileClassName={getTileClassName}
                                        className="w-100 border-0 fs-5"
                                        locale={lang === 'TH' ? 'th-TH' : 'zh-CN'}
                                        calendarType="gregory"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveForm;