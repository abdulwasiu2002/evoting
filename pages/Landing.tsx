
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col overflow-hidden">
      
      {/* --- HERO SECTION --- */}
      <div className="relative min-h-[90vh] flex items-center justify-center bg-slate-50 overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] z-0 pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
            
            {/* Text Content */}
            <div className="flex-1 text-center lg:text-left space-y-8 animate-fade-in-up">
                <div className="inline-flex items-center space-x-2 bg-white bg-opacity-60 backdrop-blur-sm border border-emerald-100 rounded-full px-4 py-1.5 shadow-sm mb-4">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-emerald-800 tracking-wide uppercase">2025 Elections Live</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                    Decide the <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Future</span> of <br/>
                    Computing.
                </h1>
                
                <p className="text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    The official blockchain-verified voting platform for the Nigeria Association of Computing Students (NACOSS). Secure. Transparent. Immediate.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                    <Button 
                        onClick={() => navigate('/login')} 
                        className="w-full sm:w-auto px-8 py-4 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200/50 transition-transform transform hover:-translate-y-1"
                    >
                        Access Student Portal
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={() => navigate('/register-aspirant')}
                        className="w-full sm:w-auto px-8 py-4 text-lg border-2 hover:bg-slate-50"
                    >
                        Become a Candidate
                    </Button>
                </div>

                <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-sm text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Verified IDs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        <span>Secure Encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>Real-time Results</span>
                    </div>
                </div>
            </div>

            {/* Graphics Content */}
            <div className="flex-1 w-full max-w-lg relative animate-fade-in-up delay-200">
                {/* CSS 3D Floating Ballot Box Illustration */}
                <div className="relative w-full h-96 animate-float">
                    {/* Abstract Cards Background */}
                    <div className="absolute top-0 right-0 w-64 h-80 bg-white rounded-2xl shadow-2xl transform rotate-6 z-10 border border-slate-100 flex flex-col p-6">
                        <div className="h-20 w-20 bg-emerald-100 rounded-full mb-4 self-center animate-pulse"></div>
                        <div className="h-4 w-32 bg-slate-100 rounded mb-2 self-center"></div>
                        <div className="h-3 w-24 bg-slate-100 rounded self-center mb-8"></div>
                        <div className="space-y-2">
                            <div className="h-10 w-full bg-emerald-50 rounded border border-emerald-100"></div>
                            <div className="h-10 w-full bg-slate-50 rounded"></div>
                        </div>
                    </div>
                    
                    <div className="absolute top-12 left-4 w-64 h-80 glass-card rounded-2xl shadow-xl transform -rotate-6 z-20 border border-white/50 p-6 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-3 w-3 bg-red-400 rounded-full"></div>
                            <div className="h-2 w-12 bg-slate-200 rounded"></div>
                        </div>
                        <div className="h-32 w-full bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-lg mb-4 flex items-center justify-center shadow-inner">
                            <svg className="w-16 h-16 text-white opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-purple-100 rounded-full"></div>
                                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-orange-100 rounded-full"></div>
                                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Elements */}
                    <div className="absolute -right-8 bottom-20 bg-white p-4 rounded-xl shadow-lg animate-float-delayed z-30">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-full">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Votes Cast</p>
                                <p className="text-lg font-bold text-gray-900">1,240+</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- STATISTICS TICKER --- */}
      <div className="bg-slate-900 py-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900 z-10"></div>
          <div className="flex whitespace-nowrap animate-[shimmer_20s_linear_infinite]">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center mx-8 text-slate-400 font-mono text-sm">
                      <span className="text-emerald-500 mr-2">●</span> LIVE: VOTE PROCESSING <span className="mx-4 text-slate-600">|</span> 
                      <span className="text-purple-400 mr-2">▲</span> TURNOUT +5% <span className="mx-4 text-slate-600">|</span>
                  </div>
              ))}
          </div>
      </div>

      {/* --- FEATURES SECTION --- */}
      <div className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Why E-Voting?</h2>
                  <p className="mt-4 text-lg text-slate-600">Modernizing the democratic process for the digital age.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                  {[
                      {
                          title: "Biometric-Ready Security",
                          desc: "Linked directly to student matriculation numbers and ID cards for authentic verification.",
                          icon: "shield",
                          color: "bg-blue-50 text-blue-600"
                      },
                      {
                          title: "Instant Analytics",
                          desc: "No more manual counting. Results are tallied in real-time as votes are cast on the network.",
                          icon: "chart",
                          color: "bg-purple-50 text-purple-600"
                      },
                      {
                          title: "Accessible Anywhere",
                          desc: "Vote from your hostel, lecture hall, or home using any internet-enabled device.",
                          icon: "globe",
                          color: "bg-emerald-50 text-emerald-600"
                      }
                  ].map((feature, idx) => (
                      <div key={idx} className="group p-8 rounded-2xl border border-slate-100 bg-white hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                          <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                              {feature.icon === 'shield' && <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                              {feature.icon === 'chart' && <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
                              {feature.icon === 'globe' && <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                          <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* --- CTA SECTION --- */}
      <div className="bg-emerald-900 relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
          
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Ready to shape the administration?</h2>
              <p className="text-emerald-200 text-lg md:text-xl max-w-2xl mx-auto">
                  Every vote counts. Join thousands of students in selecting the next generation of NACOSS leaders.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button onClick={() => navigate('/login')} className="bg-white text-emerald-900 hover:bg-emerald-50 border-none px-8 py-4 text-lg font-bold">
                      Login to Vote
                  </Button>
                  <Button onClick={() => navigate('/register')} variant="outline" className="border-emerald-700 text-emerald-100 hover:bg-emerald-800 hover:text-white px-8 py-4 text-lg">
                      Register Account
                  </Button>
              </div>
          </div>
      </div>

    </div>
  );
};
