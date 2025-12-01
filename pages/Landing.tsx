
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <div className="text-center py-16 lg:py-24 w-full relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-50 rounded-full opacity-50 z-0 pointer-events-none"></div>
        
        <div className="relative z-10">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Nigeria Association of</span>
            <span className="block text-emerald-600">Computer Science Students</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Towards Advanced Computing Technology.
            </p>
            <p className="mt-2 max-w-md mx-auto text-base text-gray-400 font-medium tracking-wide uppercase">
            Official 2024/2025 Executive Elections
            </p>
            
            <div className="mt-10 max-w-lg mx-auto flex flex-col sm:flex-row gap-4 justify-center">
            {/* Prominent Student Portal Button */}
            <Button 
                onClick={() => navigate('/login')} 
                className="w-full sm:w-auto px-8 py-4 text-xl shadow-lg transform hover:scale-105 transition-transform duration-200 flex items-center justify-center ring-4 ring-emerald-100"
            >
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Access Student Portal
            </Button>
            <Button 
                variant="outline" 
                onClick={() => navigate('/register')} 
                className="w-full sm:w-auto px-8 py-4 text-lg"
            >
                Voter Registration
            </Button>
            </div>
        </div>
      </div>

      {/* History and Status Section */}
      <div className="w-full max-w-7xl mx-auto px-4 mb-16">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-emerald-600 p-8">
                  <h2 className="text-3xl font-bold text-white text-center">About NACOSS</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {/* History Column */}
                  <div className="p-8 md:p-12">
                      <div className="flex items-center mb-6">
                          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mr-4">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900">Our History</h3>
                      </div>
                      <div className="prose text-gray-600 leading-relaxed">
                          <p className="mb-4">
                              The Nigeria Association of Computer Science Students (NACOSS) was established in 1993 with a vision to unite students across the nation. Over three decades, it has grown into the largest student body in Nigeria, representing hundreds of thousands of minds dedicated to the digital evolution of our country.
                          </p>
                          <p>
                              From humble beginnings as a small collective of early computing enthusiasts, NACOSS has evolved into a powerhouse of innovation, producing industry leaders, tech entrepreneurs, and academic giants who are shaping the future of technology in Africa and beyond.
                          </p>
                      </div>
                  </div>

                  {/* Current Status Column */}
                  <div className="p-8 md:p-12 bg-gray-50">
                       <div className="flex items-center mb-6">
                          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mr-4">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900">Current Status</h3>
                      </div>
                      <div className="prose text-gray-600 leading-relaxed">
                          <p className="mb-4">
                              Today, NACOSS stands as a beacon of technological advancement in our institution. We are currently spearheading initiatives in Artificial Intelligence, Software Engineering, and Digital Literacy.
                          </p>
                          <p>
                              Our current administration is focused on "Digital Inclusion," ensuring every student has access to the tools and mentorship required to succeed. This election serves as a pivotal moment to select the next generation of leaders who will carry this torch forward.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 w-full max-w-4xl mb-12 px-4">
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <div className="h-12 w-12 text-emerald-500 mb-4 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Verified NACCOSSites</h3>
          <p className="mt-2 text-sm text-gray-500">Only verified departmental students can vote. Your ID is your voice.</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <div className="h-12 w-12 text-emerald-500 mb-4 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Transparency</h3>
          <p className="mt-2 text-sm text-gray-500">Live counting and public results ensures the election is free and fair.</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <div className="h-12 w-12 text-emerald-500 mb-4 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Accessibility</h3>
          <p className="mt-2 text-sm text-gray-500">Vote from anywhere, whether you are on campus or at home.</p>
        </div>
      </div>

      {/* Bottom CTA Banner */}
      <div className="w-full max-w-7xl px-4 mb-16">
        <div className="bg-emerald-900 rounded-2xl shadow-xl overflow-hidden relative p-8 md:p-16 text-center">
            <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-4">Ready to make your voice heard?</h2>
                <p className="text-emerald-100 mb-8 text-lg max-w-2xl mx-auto">Access the secure student portal to verify your eligibility and cast your vote for the future of NACOSS.</p>
                <Button 
                    onClick={() => navigate('/login')} 
                    className="px-8 py-4 text-lg bg-white text-emerald-900 hover:bg-gray-100 font-bold border-none"
                >
                    Access Student Portal
                </Button>
            </div>
            {/* Decor */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-800 rounded-full opacity-50"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-800 rounded-full opacity-50"></div>
        </div>
      </div>
    </div>
  );
};
