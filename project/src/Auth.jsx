import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2'; 

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // ✅ 1. เพิ่ม State
  const [view, setView] = useState('login'); 
  const [lang, setLang] = useState('TH');

  const texts = {
    TH: {
      loginTitle: 'เข้าสู่ระบบ',
      registerTitle: 'สมัครสมาชิก',
      recoveryTitle: 'ลืมรหัสผ่าน',
      emailLabel: 'อีเมล',
      passwordLabel: 'รหัสผ่าน',
      confirmPasswordLabel: 'ยืนยันรหัสผ่าน', // ✅ เพิ่มคำแปล
      forgotPasswordLink: 'ลืมรหัสผ่าน?',
      loginBtn: 'เข้าสู่ระบบ',
      registerBtn: 'สมัครสมาชิก',
      sendLinkBtn: 'ส่งลิงก์รีเซ็ต',
      processing: 'กำลังดำเนินการ...',
      noAccount: 'ยังไม่มีบัญชี? สมัครสมาชิก',
      hasAccount: 'มีบัญชีแล้ว? เข้าสู่ระบบ',
      backToLogin: 'กลับไปหน้าเข้าสู่ระบบ',
      alertRegisterSuccess: 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน',
      alertRecoverySent: 'ส่งลิงก์รีเซ็ตไปที่อีเมลแล้ว! กรุณาตรวจสอบ Inbox/Junk',
      alertPasswordMismatch: 'รหัสผ่านไม่ตรงกัน กรุณาลองใหม่อีกครั้ง' // ✅ เพิ่มคำแปล Error
    },
    EN: {
      loginTitle: 'Login',
      registerTitle: 'Sign Up',
      recoveryTitle: 'Reset Password',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm Password',
      forgotPasswordLink: 'Forgot Password?',
      loginBtn: 'Login',
      registerBtn: 'Sign Up',
      sendLinkBtn: 'Send Reset Link',
      processing: 'Processing...',
      noAccount: "Don't have an account? Sign Up",
      hasAccount: 'Already have an account? Login',
      backToLogin: 'Back to Login',
      alertRegisterSuccess: 'Registration successful! Please check your email for confirmation.',
      alertRecoverySent: 'Reset link sent! Please check your Inbox/Junk.',
      alertPasswordMismatch: 'Passwords do not match. Please try again.'
    },
    CN: {
      loginTitle: '登录',
      registerTitle: '注册',
      recoveryTitle: '重置密码',
      emailLabel: '电子邮箱',
      passwordLabel: '密码',
      confirmPasswordLabel: '确认密码',
      forgotPasswordLink: '忘记密码？',
      loginBtn: '登录',
      registerBtn: '注册',
      sendLinkBtn: '发送重置链接',
      processing: '处理中...',
      noAccount: '还没有账号？ 立即注册',
      hasAccount: '已有账号？ 立即登录',
      backToLogin: '返回登录',
      alertRegisterSuccess: '注册成功！ 请检查您的电子邮件进行确认。',
      alertRecoverySent: '重置链接已发送！ 请检查您的收件箱/垃圾邮件。',
      alertPasswordMismatch: '密码不匹配，请重试。'
    }
  };

  const t = texts[lang];

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    // ✅ 2. ตรวจสอบรหัสผ่านก่อนแสดง Loading
    if (view === 'register' && password !== confirmPassword) {
        Swal.fire({
            icon: 'warning',
            title: 'Warning',
            text: t.alertPasswordMismatch,
            confirmButtonColor: '#ffc107'
        });
        setLoading(false);
        return; // หยุดการทำงานทันที
    }

    Swal.fire({
        title: t.processing,
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
    });

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Swal.close(); 
      } 
      else if (view === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        Swal.fire({
            icon: 'success',
            title: t.registerTitle,
            text: t.alertRegisterSuccess,
            confirmButtonColor: '#0d6efd'
        });
        // Reset password fields
        setPassword('');
        setConfirmPassword('');
      } 
      else if (view === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;

        Swal.fire({
            icon: 'info',
            title: t.recoveryTitle,
            text: t.alertRecoverySent,
            confirmButtonColor: '#0d6efd'
        }).then(() => {
            setView('login'); 
        });
      }
    } catch (error) {
      Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message,
          confirmButtonColor: '#dc3545'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div className="card shadow p-4" style={{ maxWidth: '400px', width: '100%' }}>
        
        <div className="d-flex justify-content-end mb-2 gap-1">
            <button 
                className={`btn btn-sm ${lang === 'TH' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                onClick={() => setLang('TH')}
            >
                TH
            </button>
            <button 
                className={`btn btn-sm ${lang === 'EN' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                onClick={() => setLang('EN')}
            >
                EN
            </button>
            <button 
                className={`btn btn-sm ${lang === 'CN' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                onClick={() => setLang('CN')}
            >
                CN
            </button>
        </div>

        <h2 className="text-center mb-4 text-primary fw-bold">
          {view === 'login' && t.loginTitle}
          {view === 'register' && t.registerTitle}
          {view === 'recovery' && t.recoveryTitle}
        </h2>

        <form onSubmit={handleAuth}>
          {/* Email */}
          <div className="mb-3">
            <label className="form-label">{t.emailLabel}</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
            />
          </div>

          {/* Password */}
          {view !== 'recovery' && (
            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label">{t.passwordLabel}</label>
                {view === 'login' && (
                  <span 
                    role="button" 
                    className="text-primary small" 
                    style={{cursor: 'pointer'}}
                    onClick={() => setView('recovery')}
                  >
                    {t.forgotPasswordLink}
                  </span>
                )}
              </div>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {/* ✅ 3. Confirm Password (แสดงเฉพาะตอนสมัครสมาชิก) */}
          {view === 'register' && (
            <div className="mb-3">
              <label className="form-label">{t.confirmPasswordLabel}</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {view === 'login' ? t.loginBtn : 
             view === 'register' ? t.registerBtn : t.sendLinkBtn}
          </button>
        </form>

        {/* Switch Mode Links */}
        <div className="text-center mt-3">
          {view === 'login' ? (
            <button className="btn btn-link text-decoration-none" onClick={() => setView('register')}>
              {t.noAccount}
            </button>
          ) : view === 'register' ? (
            <button className="btn btn-link text-decoration-none" onClick={() => setView('login')}>
              {t.hasAccount}
            </button>
          ) : (
            <button className="btn btn-link text-decoration-none" onClick={() => setView('login')}>
              {t.backToLogin}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}