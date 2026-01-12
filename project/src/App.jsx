import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Import Components
import Navbar from './Navbar'; 
import LeaveForm from './LeaveForm';
import Auth from './Auth';
import OrgSetup from './OrgSetup';
import AttendanceSheet from './AttendanceSheet';

function App() {
  const [session, setSession] = useState(null);
  const [hasOrg, setHasOrg] = useState(false);
  const [checkingOrg, setCheckingOrg] = useState(true);

  const [currentPage, setCurrentPage] = useState('calendar'); 
  const [lang, setLang] = useState('TH'); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserOrg(session.user.id);
      else setCheckingOrg(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserOrg(session.user.id);
      else {
        setHasOrg(false);
        setCheckingOrg(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserOrg = async (userId) => {
    setCheckingOrg(true);
    const { data } = await supabase.from('user_profiles').select('org_id').eq('user_id', userId).single();
    if (data && data.org_id) setHasOrg(true);
    setCheckingOrg(false);
  };

  if (checkingOrg) return <div className="d-flex justify-content-center align-items-center min-vh-100 fw-bold text-primary"></div>;

  if (!session) return <Auth />;
  
  if (!hasOrg) return <OrgSetup session={session} onOrgSet={() => setHasOrg(true)} />;

  // --- Main App UI ---
  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
        
        <Navbar 
            session={session} 
            currentPage={currentPage} 
            setPage={setCurrentPage} 
            lang={lang} 
            setLang={setLang} 
        />

        <div className="flex-grow-1">
            {currentPage === 'calendar' ? (
                <LeaveForm session={session} lang={lang} /> 
            ) : (
                <AttendanceSheet session={session} lang={lang} />
            )}
        </div>
    </div>
  );
}

export default App;