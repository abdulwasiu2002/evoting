
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  // Mock Data for the Trading-style Chart
  const chartData = [
    { time: '09:00', votes: 120 },
    { time: '10:00', votes: 230 },
    { time: '11:00', votes: 180 },
    { time: '12:00', votes: 450 },
    { time: '13:00', votes: 320 },
    { time: '14:00', votes: 580 },
    { time: '15:00', votes: 410 },
    { time: '16:00', votes: 670 },
    { time: '17:00', votes: 540 },
  ];

  return (
    <div className="relative min-h-screen bg-white overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* --- BACKGROUND LAYERS --- */}
      
      {/* 1. Federal Poly Bida / CS Dept Themed Background Image (Subtle Overlay) */}
      <div className="absolute inset-0 z-0">
          {/* Using a high-quality 'Computer Lab/Campus' image to represent the CS Department */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.06] mix-blend-multiply pointer-events-none"></div>
          {/* Gradient overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/90 to-white pointer-events-none"></div>
      </div>

      {/* 2. Existing Tech Grid Pattern */}
      <div className="absolute inset-0 bg-tech-grid pointer-events-none z-0 opacity-50"></div>
      
      {/* 3. Existing Color Gradients for depth */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/3 z-0"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-50/50 rounded-full filter blur-3xl translate-y-1/3 -translate-x-1/3 z-0"></div>

      {/* --- HERO SECTION --- */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* LEFT COLUMN: Typography & Actions */}
          <div className="space-y-6 lg:space-y-8 animate-fade-in max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
            
            {/* Trust Badge - Updated for FPB */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm backdrop-blur-sm bg-opacity-80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-600 tracking-wide">Official NACOS Platform • <span className="text-emerald-700">Federal Poly Bida</span></span>
            </div>

            {/* Headline - Updated for Bida */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              The Future of Voting at <br/>
              <span className="relative inline-block text-emerald-900">
                NACOS.
                {/* Underline decoration */}
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-emerald-400 opacity-50" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </span>
            </h1>

            {/* Subtext - Updated for CS Dept */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Empowering the <strong>Department of Computer Science</strong> with a secure, transparent, and blockchain-backed e-voting system. 
              Your voice matters in building a stronger NACOS FPB Chapter.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Access Student Portal
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
              
              <button 
                onClick={() => navigate('/register-aspirant')}
                className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center w-full sm:w-auto"
              >
                Register as an Aspirant
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 lg:pt-8 flex flex-wrap gap-4 sm:gap-6 text-sm font-medium text-slate-500 justify-center lg:justify-start">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                FPB Accredited
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Secure Ballot
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Real-time Results
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Illustration (Maintained Animations) */}
          <div className="relative h-[350px] sm:h-[450px] lg:h-[500px] w-full flex items-center justify-center animate-fade-in delay-200 mt-8 lg:mt-0">
             
             {/* Ripple Circles Background */}
             <div className="absolute border border-slate-100 rounded-full w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] animate-pulse-ring"></div>
             <div className="absolute border border-slate-100 rounded-full w-[450px] sm:w-[550px] h-[450px] sm:h-[550px] animate-pulse-ring delay-300"></div>

             {/* MAIN CARD (Shield) */}
             <div className="relative z-20 w-56 sm:w-72 h-80 sm:h-96 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-white border border-slate-700/50">
                {/* Shield Icon */}
                <div className="w-20 sm:w-24 h-20 sm:h-24 mb-6 relative">
                   <svg className="w-full h-full text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                   </svg>
                   <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20"></div>
                </div>
                
                {/* Loading Bar */}
                <div className="w-32 sm:w-40 h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                   <div className="h-full bg-emerald-500 w-2/3 animate-[shimmer_2s_infinite]"></div>
                </div>
                <p className="text-xs text-slate-400 font-mono">Verifying FPB Nodes...</p>
                
                {/* Grid overlay on card */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay pointer-events-none rounded-2xl"></div>
             </div>

             {/* FLOATING BADGE 1: Encryption (Top Left) */}
             <div className="absolute top-4 sm:top-10 left-0 sm:left-0 lg:-left-4 glass-card-sm p-2 sm:p-3 rounded-xl flex items-center gap-3 animate-float-slow z-30 scale-90 sm:scale-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                   <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                   <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Encryption</p>
                   <p className="text-xs sm:text-sm font-bold text-slate-800">AES-256</p>
                </div>
             </div>

             {/* FLOATING BADGE 2: Access (Right) */}
             <div className="absolute top-16 sm:top-24 right-0 lg:-right-8 glass-card-sm p-2 sm:p-3 rounded-xl flex items-center gap-3 animate-float-reverse z-10 scale-90 sm:scale-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                   <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                </div>
                <div>
                   <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Campus</p>
                   <p className="text-xs sm:text-sm font-bold text-slate-800">FPB Connected</p>
                </div>
             </div>

             {/* FLOATING BADGE 3: Results (Bottom Left) */}
             <div className="absolute bottom-12 sm:bottom-20 left-0 sm:left-4 lg:-left-8 glass-card-sm p-2 sm:p-3 rounded-xl flex items-center gap-3 animate-float-medium z-30 scale-90 sm:scale-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                   <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                   <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Results</p>
                   <p className="text-xs sm:text-sm font-bold text-slate-800">Live Feed</p>
                </div>
             </div>

             {/* FLOATING BADGE 4: Audit (Bottom Right) */}
             <div className="absolute bottom-6 sm:bottom-10 right-0 sm:right-4 lg:right-0 glass-card-sm p-2 sm:p-3 rounded-xl flex items-center gap-3 animate-float-fast z-30 scale-90 sm:scale-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                   <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                   <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Audit</p>
                   <p className="text-xs sm:text-sm font-bold text-slate-800">Verified</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- LIVE ELECTION VELOCITY CHART (Trading Style) --- */}
      <section className="py-12 sm:py-24 bg-slate-50 border-y border-slate-200 relative overflow-hidden">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center">
                       {/* Text Content */}
                       <div className="lg:w-1/2 space-y-6 lg:space-y-8">
                            <div className="text-center lg:text-left">
                                <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-sm mb-2">Live Market Data</h2>
                                <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 leading-tight">Real-Time Election Velocity</h2>
                            </div>
                            <p className="text-slate-600 text-base sm:text-lg leading-relaxed text-center lg:text-left">
                                Our blockchain-backed ledger processes votes with the precision of a high-frequency trading engine. Monitor voter turnout spikes across the Federal Polytechnic Bida campus as they happen.
                            </p>
                            <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-2">
                                <div className="p-4 sm:p-5 bg-white rounded-xl shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Votes/Sec</p>
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">1,240</p>
                                    <p className="text-[10px] sm:text-xs text-emerald-600 mt-1 font-medium">▲ High Turnout</p>
                                </div>
                                <div className="p-4 sm:p-5 bg-white rounded-xl shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">FPB Network</p>
                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">~45ms</p>
                                    <p className="text-[10px] sm:text-xs text-blue-600 mt-1 font-medium">Low Latency</p>
                                </div>
                            </div>
                       </div>

                       {/* The Trade Chart Card */}
                       <div className="lg:w-1/2 w-full">
                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative group">
                                {/* Header imitating a trading terminal */}
                                <div className="bg-slate-50 border-b border-slate-100 px-4 sm:px-5 py-4 flex justify-between items-center">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded text-emerald-700 text-[10px] sm:text-xs font-bold border border-emerald-200">
                                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                                            LIVE
                                        </div>
                                        <span className="text-slate-700 font-bold text-xs sm:text-sm tracking-tight">VOTE/HOUR VOLUME</span>
                                    </div>
                                    <div className="text-[10px] sm:text-xs font-mono text-slate-400 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        POLLS OPEN
                                    </div>
                                </div>
                                
                                {/* Chart Area */}
                                <div className="h-60 sm:h-72 w-full p-4 sm:p-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis 
                                                dataKey="time" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 500}} 
                                                dy={10}
                                            />
                                            <YAxis 
                                                hide={true} 
                                            />
                                            <Tooltip 
                                                cursor={{fill: '#f8fafc', opacity: 0.8}}
                                                contentStyle={{
                                                    borderRadius: '8px', 
                                                    border: '1px solid #e2e8f0', 
                                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                    padding: '12px'
                                                }}
                                                labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}
                                                itemStyle={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}
                                            />
                                            <Bar 
                                                dataKey="votes" 
                                                radius={[4, 4, 0, 0]} 
                                                barSize={32}
                                                animationDuration={1500}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} stroke={index % 2 === 0 ? '#059669' : '#10b981'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Overlay Gradient at bottom to fade nicely */}
                                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                            </div>
                       </div>
                  </div>
             </div>
      </section>

      {/* --- DEPARTMENTS OFFERED SECTION --- */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-end mb-8 sm:mb-10 gap-4">
                  <div className="text-center md:text-left w-full md:w-auto">
                      <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-xs sm:text-sm mb-2">Academic Excellence</h2>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">Specializations in Computer Science</h3>
                  </div>
                  <div className="hidden md:block w-1/3 h-px bg-slate-200 mb-4"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
                  {/* 1. Computer Science */}
                  <div className="lg:col-span-2 group relative rounded-2xl overflow-hidden shadow-lg h-56 sm:h-64">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-4 sm:p-6">
                          <span className="bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block">CORE</span>
                          <h4 className="text-base sm:text-lg font-bold text-white leading-tight">Computer Science</h4>
                          <p className="text-slate-300 text-[10px] sm:text-xs mt-1">Foundation of Computing</p>
                      </div>
                  </div>

                  {/* 2. Networking and Cloud Computing */}
                  <div className="lg:col-span-2 group relative rounded-2xl overflow-hidden shadow-lg h-56 sm:h-64">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-4 sm:p-6">
                          <span className="bg-indigo-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block">INFRASTRUCTURE</span>
                          <h4 className="text-base sm:text-lg font-bold text-white leading-tight">Networking & Cloud Computing</h4>
                          <p className="text-slate-300 text-[10px] sm:text-xs mt-1">Connectivity & Cloud Systems</p>
                      </div>
                  </div>

                  {/* 3. Software and Web Development */}
                  <div className="lg:col-span-2 group relative rounded-2xl overflow-hidden shadow-lg h-56 sm:h-64">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-4 sm:p-6">
                          <span className="bg-purple-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block">DEVELOPMENT</span>
                          <h4 className="text-base sm:text-lg font-bold text-white leading-tight">Software & Web Development</h4>
                          <p className="text-slate-300 text-[10px] sm:text-xs mt-1">Building Digital Solutions</p>
                      </div>
                  </div>

                  {/* 4. Artificial Intelligence */}
                  <div className="lg:col-span-3 group relative rounded-2xl overflow-hidden shadow-lg h-56 sm:h-64">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-4 sm:p-6">
                          <span className="bg-pink-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block">INNOVATION</span>
                          <h4 className="text-lg sm:text-xl font-bold text-white leading-tight">Artificial Intelligence</h4>
                          <p className="text-slate-300 text-[10px] sm:text-xs mt-1">Machine Learning & Smart Systems</p>
                      </div>
                  </div>

                  {/* 5. Cyber Security */}
                  <div className="lg:col-span-3 group relative rounded-2xl overflow-hidden shadow-lg h-56 sm:h-64">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-4 sm:p-6">
                          <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block">SECURITY</span>
                          <h4 className="text-lg sm:text-xl font-bold text-white leading-tight">Cyber Security & Data Protection</h4>
                          <p className="text-slate-300 text-[10px] sm:text-xs mt-1">Defending Digital Assets</p>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- ABOUT NACOS SECTION --- */}
      <div className="bg-white py-12 sm:py-24 relative overflow-hidden">
            {/* Decorative background animations */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
            <div className="absolute -left-20 top-20 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
            <div className="absolute -right-20 bottom-20 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute left-1/2 bottom-0 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 transform -translate-x-1/2"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
                    <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-xs sm:text-sm mb-2">About The Association</h2>
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-display">NACOS - Federal Poly Bida Chapter</h3>
                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                        We are the Bida Chapter of the largest student professional body in Sub-Saharan Africa. We foster IT excellence within Federal Polytechnic Bida, promoting innovation among students in Computer Science.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                    {/* Card 1: Mission */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 sm:mb-6 border border-emerald-100">
                            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">Our Mission</h4>
                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                            To facilitate opportunities for study, research, and IT application development, ensuring FPB students remain at the forefront of the digital economy.
                        </p>
                    </div>

                    {/* Card 2: Reach */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 sm:mb-6 border border-blue-100">
                            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">Campus Wide</h4>
                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                            Serving the vibrant student body of the Computer Science Department at Federal Polytechnic Bida, connecting ND and HND students.
                        </p>
                    </div>

                    {/* Card 3: Innovation */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 sm:mb-6 border border-purple-100">
                            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </div>
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">Innovation Hub</h4>
                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                            Through conferences, hackathons, and platforms like this e-voting system, we bridge the gap between academic theory and practical industry application.
                        </p>
                    </div>
                </div>

                {/* Stats Strip */}
                <div className="mt-12 sm:mt-20 border-t border-slate-200 pt-10 sm:pt-16 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
                    <div className="group">
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">FPB</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Campus</div>
                    </div>
                    <div className="group">
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">CS</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Department</div>
                    </div>
                     <div className="group">
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">100%</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Student Led</div>
                    </div>
                     <div className="group">
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">1977</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">FPB Est. Year</div>
                    </div>
                </div>
            </div>
      </div>
    </div>
  );
};
