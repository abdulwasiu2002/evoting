
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
        
        <div className="relative z-10 px-4">
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
            
            <div className="mt-10 max-w-lg mx-auto flex flex-col gap-6 justify-center items-center">
                {/* Prominent Student Portal Button */}
                <Button 
                    onClick={() => navigate('/login')} 
                    className="w-full sm:w-auto px-10 py-5 text-xl shadow-xl transform hover:scale-105 transition-transform duration-200 flex items-center justify-center ring-4 ring-emerald-100 font-bold rounded-full"
                >
                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7" />
                    </svg>
                    Access Student Portal
                </Button>

                {/* Big Aspirant Card */}
                <div onClick={() => navigate('/register-aspirant')} className="w-full bg-white p-6 rounded-2xl shadow-lg border-2 border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all cursor-pointer group mt-4">
                    <div className="flex items-center justify-between">
                         <div className="text-left">
                             <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Want to Contest?</h3>
                             <p className="text-sm text-gray-500 mt-1">Register as an Aspirant for an executive position.</p>
                         </div>
                         <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* About NACOSS Section */}
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 bg-white border-t border-gray-100">
          <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900">About NACOSS</h2>
              <p className="mt-4 text-lg text-gray-500">The Student Body for Computer Science & Related Disciplines.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                  <p>
                      The <strong>Nigeria Association of Computer Science Students (NACOSS)</strong> is the umbrella body for all students studying Computer Science, Computer Engineering, Information Technology, and related disciplines in Nigeria's tertiary institutions.
                  </p>
                  <p>
                      Established to bridge the gap between theoretical knowledge and practical application, NACOSS organizes conferences, hackathons, and workshops to equip students with industry-relevant skills.
                  </p>
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
                      <p className="font-bold text-emerald-800">Mission</p>
                      <p className="text-sm">To breed a generation of digital innovators who will use technology to solve societal problems and drive the nation's digital economy.</p>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                       <span className="text-gray-400 font-bold">Networking</span>
                  </div>
                  <div className="bg-emerald-100 rounded-lg h-48 flex items-center justify-center text-emerald-800 font-bold">
                       Innovation
                  </div>
                  <div className="bg-emerald-600 rounded-lg h-48 flex items-center justify-center text-white font-bold">
                       Leadership
                  </div>
                  <div className="bg-gray-800 rounded-lg h-48 flex items-center justify-center text-white font-bold">
                       Excellence
                  </div>
              </div>
          </div>
      </div>
      
      {/* Bottom CTA */}
      <div className="w-full bg-emerald-900 py-12 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to shape the future?</h2>
          <Button onClick={() => navigate('/login')} variant="secondary" size="lg">Log In to Vote</Button>
      </div>
    </div>
  );
};
