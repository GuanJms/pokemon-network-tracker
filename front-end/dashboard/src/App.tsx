import React , { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import './App.css';
import ApiService from './services/api';
const api = new ApiService();

const NAV_TABS = [
  { label: 'Dashboard', path: '/' },
  // Logs and Metrics tabs removed per requirement
  { label: 'Docs', path: '/docs' },
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [liveCount,setLiveCount]=useState<number>(0);

  useEffect(()=>{
    const fetchCount=()=> api.getLiveUserCount().then(c=>setLiveCount(c)).catch(()=>{});
    fetchCount();
    const interval=setInterval(fetchCount,5000);
    return ()=> clearInterval(interval);
  },[]);

  return (
    <div className="App">
      {/* NAVIGATION BAR */}
      <nav className="w-full max-w-6xl mx-auto flex items-center justify-between px-2 py-3 mb-4 border-b-4 border-pixel-border bg-pixel-gray" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        <div className="flex space-x-8 text-pixel-blue text-lg uppercase">
          {NAV_TABS.map(tab => (
            <button
              key={tab.path}
              className={
                (location.pathname === tab.path || (tab.path === '/' && location.pathname === ''))
                  ? 'text-pixel-orange underline underline-offset-4'
                  : 'hover:text-pixel-orange'
              }
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-pixel-green animate-pulse"></span>
          <span className="text-pixel-green text-base">LIVE</span>
          <span className="text-pixel-green text-base">{liveCount}</span>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/docs" element={<div className="text-white text-center mt-12">Docs View (Coming Soon)</div>} />
      </Routes>
    </div>
  );
}

export default App;
