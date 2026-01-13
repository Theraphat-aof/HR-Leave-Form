import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2';

const Navbar = ({ session, currentPage, setPage, lang, setLang }) => {
    const [isNavExpanded, setIsNavExpanded] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [orgData, setOrgData] = useState({ name: '', joinCode: '' });

    // --- Configuration: Texts ---
    const texts = {
        TH: {
            menuCalendar: "ปฏิทินวันลา",
            menuAttendance: "ตารางลงเวลา",
            switchPage: "เลือกหน้าใช้งาน",
            joinCodeBtn: "รหัสทีม",
            changePwdBtn: "เปลี่ยนรหัสผ่าน",
            logoutBtn: "ออกจากระบบ",
            orgTitle: "ข้อมูลบริษัท",
            joinCodeLabel: "รหัสเข้าร่วม:",
            copySuccess: "คัดลอกรหัสแล้ว!",
            pwdTitle: "เปลี่ยนรหัสผ่าน",
            pwdPlaceholder: "รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)",
            pwdSuccess: "เปลี่ยนรหัสผ่านสำเร็จ!",
            pwdError: "เกิดข้อผิดพลาด",
            logoutConfirm: "คุณต้องการออกจากระบบใช่หรือไม่?",
            confirmBtn: "ใช่, ออกจากระบบ",
            cancelBtn: "ยกเลิก"
        },
        EN: {
            menuCalendar: "Leave Calendar",
            menuAttendance: "Attendance Sheet",
            switchPage: "Switch Page",
            joinCodeBtn: "Join Code",
            changePwdBtn: "Change Password",
            logoutBtn: "Logout",
            orgTitle: "Organization Info",
            joinCodeLabel: "Join Code:",
            copySuccess: "Code Copied!",
            pwdTitle: "Change Password",
            pwdPlaceholder: "New Password (min 6 chars)",
            pwdSuccess: "Password Updated!",
            pwdError: "Error Occurred",
            logoutConfirm: "Are you sure you want to logout?",
            confirmBtn: "Yes, Logout",
            cancelBtn: "Cancel"
        },
        CN: {
            menuCalendar: "休假日历",
            menuAttendance: "考勤表",
            switchPage: "切换页面",
            joinCodeBtn: "团队代码",
            changePwdBtn: "修改密码",
            logoutBtn: "退出登录",
            orgTitle: "公司信息",
            joinCodeLabel: "加入代码:",
            copySuccess: "代码已复制!",
            pwdTitle: "修改密码",
            pwdPlaceholder: "新密码 (至少6位)",
            pwdSuccess: "密码修改成功!",
            pwdError: "发生错误",
            logoutConfirm: "确定要退出登录吗？",
            confirmBtn: "确定退出",
            cancelBtn: "取消"
        }
    };

    const t = texts[lang];
    const currentTitle = currentPage === 'calendar' ? t.menuCalendar : t.menuAttendance;

    // --- Fetch Org Data ---
    useEffect(() => {
        const fetchOrgData = async () => {
            if (!session) return;
            try {
                const { data: profile } = await supabase.from('user_profiles').select('org_id').eq('user_id', session.user.id).single();
                if (profile) {
                    const { data: org } = await supabase.from('organizations').select('name, join_code').eq('id', profile.org_id).single();
                    if (org) setOrgData({ name: org.name, joinCode: org.join_code });
                }
            } catch (error) { console.error(error); }
        };
        fetchOrgData();
    }, [session]);

    // Show Join Code
    const handleShowJoinCode = () => {
        Swal.fire({
            title: t.orgTitle,
            html: `
                <div class="text-start">
                    <p class="mb-1"><strong>🏢 ${orgData.name}</strong></p>
                    <p class="mb-0 text-muted">${t.joinCodeLabel}</p>
                    <div class="d-flex align-items-center mt-2 p-2 bg-light border rounded">
                        <span class="fs-4 fw-bold text-primary flex-grow-1 text-center font-monospace">${orgData.joinCode}</span>
                    </div>
                </div>
            `,
            icon: 'info',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#0d6efd',
            showCancelButton: true,
            cancelButtonText: 'Copy Code',
            cancelButtonColor: '#198754',
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
                navigator.clipboard.writeText(orgData.joinCode);
                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true
                });
                Toast.fire({ icon: 'success', title: t.copySuccess });
            }
        });
    };

    // Change Password
    const handleUpdatePassword = async () => {
        const { value: password } = await Swal.fire({
            title: t.pwdTitle,
            input: 'password',
            inputPlaceholder: t.pwdPlaceholder,
            showCancelButton: true,
            confirmButtonText: 'Update',
            confirmButtonColor: '#ffc107',
            cancelButtonText: t.cancelBtn,
            inputAttributes: {
                minlength: 6,
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            preConfirm: async (pwd) => {
                if (!pwd || pwd.length < 6) {
                    Swal.showValidationMessage('Password must be at least 6 characters');
                }
                return pwd;
            }
        });

        if (password) {
            Swal.fire({
                title: 'Updating...',
                didOpen: () => Swal.showLoading(),
                allowOutsideClick: false
            });

            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                Swal.fire({ icon: 'error', title: t.pwdError, text: error.message });
            } else {
                Swal.fire({ icon: 'success', title: t.pwdSuccess, timer: 1500, showConfirmButton: false });
            }
        }
    };

    // Logout
    const handleLogout = () => {
        Swal.fire({
            title: t.logoutBtn,
            text: t.logoutConfirm,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: t.confirmBtn,
            cancelButtonText: t.cancelBtn
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { error } = await supabase.auth.signOut();

                if (error) {
                    console.error('Logout Error:', error);
                }
                localStorage.clear();
                window.location.href = '/';
            }
        });
    };

    const toggleLanguage = () => {
        if (lang === 'TH') setLang('EN');
        else if (lang === 'EN') setLang('CN');
        else setLang('TH');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark shadow-sm px-3 sticky-top">
            <div className="container-fluid">

                {/* Brand */}
                <span className="navbar-brand fw-bold d-flex align-items-center">
                    <i className={`bi ${currentPage === 'calendar' ? 'bi-calendar-check' : 'bi-table'} me-2`}></i>
                    {currentTitle}
                </span>

                {/* Burger Button */}
                <button className="navbar-toggler" type="button" onClick={() => setIsNavExpanded(!isNavExpanded)}>
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Navbar Content */}
                <div className={`collapse navbar-collapse ${isNavExpanded ? 'show' : ''}`}>

                    {/* Dropdown Menu (Left) */}
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0 mt-2 mt-lg-0">
                        <li className="nav-item dropdown">
                            <button
                                className="nav-link dropdown-toggle btn btn-link text-white fw-bold text-start"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                            >
                                <i className="bi bi-grid-fill me-1"></i> {t.switchPage}
                            </button>

                            <ul className={`dropdown-menu shadow ${isDropdownOpen ? 'show' : ''}`}>
                                <li>
                                    <button
                                        className={`dropdown-item d-flex align-items-center ${currentPage === 'calendar' ? 'active' : ''}`}
                                        onClick={() => { setPage('calendar'); setIsDropdownOpen(false); setIsNavExpanded(false); }}
                                    >
                                        <i className="bi bi-calendar-date me-2"></i>
                                        {t.menuCalendar}
                                        {currentPage === 'calendar' && <i className="bi bi-check ms-auto"></i>}
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={`dropdown-item d-flex align-items-center ${currentPage === 'attendance' ? 'active' : ''}`}
                                        onClick={() => { setPage('attendance'); setIsDropdownOpen(false); setIsNavExpanded(false); }}
                                    >
                                        <i className="bi bi-table me-2"></i>
                                        {t.menuAttendance}
                                        {currentPage === 'attendance' && <i className="bi bi-check ms-auto"></i>}
                                    </button>
                                </li>
                            </ul>
                        </li>
                    </ul>

                    {/* User Controls (Right) */}
                    <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">

                        {session?.user?.email && (
                            <span className="text-white small opacity-75 mb-2 mb-lg-0 text-nowrap">
                                <i className="bi bi-person-circle me-1"></i> {session.user.email}
                            </span>
                        )}

                        <div className="d-flex flex-column flex-lg-row gap-2 w-100 w-lg-auto">
                            <button className="btn btn-outline-light btn-sm fw-bold w-100 w-lg-auto" onClick={toggleLanguage} style={{ minWidth: '50px' }}>
                                {lang}
                            </button>

                            <button className="btn btn-info btn-sm fw-bold text-white w-100 w-lg-auto text-nowrap" onClick={handleShowJoinCode}>
                                <i className="bi bi-building"></i> {t.joinCodeBtn}
                            </button>

                            <button className="btn btn-warning btn-sm text-dark fw-bold w-100 w-lg-auto" onClick={handleUpdatePassword} title={t.changePwdBtn}>
                                <i className="bi bi-key-fill d-none d-lg-inline"></i>
                                <span className="d-lg-none">{t.changePwdBtn}</span>
                            </button>

                            <button className="btn btn-danger btn-sm fw-bold w-100 w-lg-auto" onClick={handleLogout} title={t.logoutBtn}>
                                <i className="bi bi-box-arrow-right d-none d-lg-inline"></i>
                                <span className="d-lg-none">{t.logoutBtn}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;