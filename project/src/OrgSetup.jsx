import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2';

export default function OrgSetup({ session, onOrgSet }) {
  const [mode, setMode] = useState('create');
  const [companyName, setCompanyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [lang, setLang] = useState('TH');

  const texts = {
    TH: {
      header: "ตั้งค่าองค์กร",
      createTab: "สร้างบริษัทใหม่",
      joinTab: "เข้าร่วมบริษัทเดิม",
      labelCompany: "ชื่อบริษัท",
      placeholderCompany: "เช่น บริษัท ร่ำรวย จำกัด",
      labelCode: "รหัสเข้าร่วม (Join Code)",
      placeholderCode: "ขอรหัสจากผู้สร้าง (เช่น X7Y9Z1)",
      btnConfirm: "ยืนยัน",
      btnProcessing: "กำลังดำเนินการ...",
      alertSuccessTitle: "สำเร็จ!",
      alertSuccessDesc: "สร้างบริษัทเรียบร้อยแล้ว รหัสเข้าร่วมของคุณคือ:",
      alertSuccessHint: "(กรุณาจดรหัสนี้ส่งให้ HR ท่านอื่น)",
      alertError: "เกิดข้อผิดพลาด",
      alertNotFound: "ไม่พบรหัสบริษัทนี้"
    },
    EN: {
      header: "Organization Setup",
      createTab: "Create New Org",
      joinTab: "Join Existing Org",
      labelCompany: "Company Name",
      placeholderCompany: "e.g. Rich Company Ltd.",
      labelCode: "Join Code",
      placeholderCode: "Ask admin for code (e.g. X7Y9Z1)",
      btnConfirm: "Confirm",
      btnProcessing: "Processing...",
      alertSuccessTitle: "Success!",
      alertSuccessDesc: "Organization created! Your Join Code is:",
      alertSuccessHint: "(Please share this code with other HRs)",
      alertError: "Error",
      alertNotFound: "Join Code not found"
    },
    CN: {
      header: "组织设置",
      createTab: "创建新公司",
      joinTab: "加入现有公司",
      labelCompany: "公司名称",
      placeholderCompany: "例如：富贵有限公司",
      labelCode: "加入代码 (Join Code)",
      placeholderCode: "向管理员索取代码 (例如 X7Y9Z1)",
      btnConfirm: "确认",
      btnProcessing: "处理中...",
      alertSuccessTitle: "成功！",
      alertSuccessDesc: "创建成功！您的加入代码是：",
      alertSuccessHint: "（请将此代码分享给其他人事）",
      alertError: "发生错误",
      alertNotFound: "未找到此加入代码"
    }
  };

  const t = texts[lang];

  // ฟังก์ชันสุ่มรหัสบริษัท 6 หลัก
  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    Swal.fire({
      title: t.btnProcessing,
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      background: '#fff'
    });

    try {
      let orgId = null;

      if (mode === 'create') {
        // สร้างบริษัทใหม่
        const code = generateJoinCode();
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert([{ name: companyName, join_code: code }])
          .select();

        if (orgError) throw orgError;
        orgId = orgData[0].id;

        await Swal.fire({
          icon: 'success',
          title: t.alertSuccessTitle,
          html: `
                <p>${t.alertSuccessDesc}</p>
                <div class="p-3 my-2 bg-light border rounded">
                    <h1 class="text-primary fw-bold m-0" style="letter-spacing: 2px;">${code}</h1>
                </div>
                <small class="text-muted">${t.alertSuccessHint}</small>
            `,
          confirmButtonText: 'OK',
          confirmButtonColor: '#0d6efd'
        });

      } else {
        // เข้าร่วมบริษัทเดิม
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('join_code', joinCode)
          .single();

        if (orgError || !orgData) throw new Error(t.alertNotFound);
        orgId = orgData.id;

        Swal.close();
      }

      // ผูก User เข้ากับ Org
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{ user_id: session.user.id, org_id: orgId }]);

      if (profileError) throw profileError;

      onOrgSet();

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: t.alertError,
        text: error.message,
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow p-4" style={{ maxWidth: '500px', width: '100%' }}>

        <div className="d-flex justify-content-end mb-2 gap-1">
          <button className={`btn btn-sm ${lang === 'TH' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setLang('TH')}>TH</button>
          <button className={`btn btn-sm ${lang === 'EN' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setLang('EN')}>EN</button>
          <button className={`btn btn-sm ${lang === 'CN' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setLang('CN')}>CN</button>
        </div>

        <h3 className="text-center mb-4">{t.header}</h3>

        <div className="d-flex justify-content-center gap-3 mb-4">
          <button className={`btn ${mode === 'create' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('create')}>
            {t.createTab}
          </button>
          <button className={`btn ${mode === 'join' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setMode('join')}>
            {t.joinTab}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'create' ? (
            <div className="mb-3">
              <label className="form-label">{t.labelCompany}</label>
              <input
                type="text"
                className="form-control"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
                placeholder={t.placeholderCompany}
              />
            </div>
          ) : (
            <div className="mb-3">
              <label className="form-label">{t.labelCode}</label>
              <input
                type="text"
                className="form-control"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                required
                placeholder={t.placeholderCode}
              />
            </div>
          )}
          <button type="submit" className="btn btn-dark w-100" disabled={loading}>
            {loading ? t.btnProcessing : t.btnConfirm}
          </button>
        </form>
      </div>
    </div>
  );
}