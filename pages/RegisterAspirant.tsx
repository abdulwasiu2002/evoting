
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { db } from '../services/mockDb';

export const RegisterAspirant: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lists
  const [positions, setPositions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const LEVELS = ['ND I', 'ND II', 'HND I', 'HND II'];

  // Images
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    matricNo: '',
    department: '',
    level: 'ND I',
    password: '',
    confirmPassword: '',
    position: '',
    cgpa: '',
    manifesto: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, d] = await Promise.all([db.getPositions(), db.getDepartments()]);
        setPositions(p);
        setDepartments(d);
        if (p.length > 0) setFormData(prev => ({ ...prev, position: p[0] }));
        if (d.length > 0) setFormData(prev => ({ ...prev, department: d[0] }));
      } catch (e) {
          console.error(e);
      }
    };
    fetchData();
  }, []);

  // Compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'passport' | 'result') => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const compressed = await compressImage(file);
              if (type === 'passport') setPassportPreview(compressed);
              else setResultPreview(compressed);
          } catch (err) {
              alert("Error processing image");
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
    }
    if (!passportPreview || !resultPreview) {
        setError("Both Passport and Result document are required.");
        return;
    }
    
    setLoading(true);
    
    try {
        // Use the new combined registration method
        await db.registerAspirantUser({
            // User Account Data
            fullName: formData.fullName,
            matricNo: formData.matricNo,
            department: formData.department,
            level: formData.level,
            passwordHash: formData.password,
            idCardUrl: passportPreview, // Use passport as ID card for login profile too
            
            // Aspirant Data
            position: formData.position,
            cgpa: formData.cgpa,
            manifesto: formData.manifesto,
            passportUrl: passportPreview,
            resultUrl: resultPreview
        });

        alert("Application submitted successfully! Please wait for admin approval. Once approved, you can log in to your dashboard.");
        navigate('/');
    } catch (err: any) {
        setError(err.message || "Submission failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row border border-purple-100">
            <div className="md:w-3/5 p-8 border-r border-gray-100">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Aspirant Registration</h2>
                    <p className="text-sm text-gray-500">Create an account and apply for an executive position.</p>
                </div>

                {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm break-words">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Section 1: Account Details */}
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">1. Personal & Login Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input required type="text" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Matric Number</label>
                                    <input required type="text" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.matricNo} onChange={e => setFormData({...formData, matricNo: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Level</label>
                                    <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Department</label>
                                <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input 
                                            required 
                                            type={showPassword ? "text" : "password"} 
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3 pr-10 focus:ring-emerald-500 focus:border-emerald-500" 
                                            value={formData.password} 
                                            onChange={e => setFormData({...formData, password: e.target.value})} 
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input 
                                            required 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3 pr-10 focus:ring-emerald-500 focus:border-emerald-500" 
                                            value={formData.confirmPassword} 
                                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Contest Details */}
                    <div className="bg-purple-50 p-4 rounded border border-purple-200">
                        <h3 className="text-sm font-bold text-purple-800 uppercase mb-3 border-b border-purple-200 pb-2">2. Contest Application</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Position</label>
                                    <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">CGPA</label>
                                    <input required type="text" placeholder="e.g. 3.50" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.cgpa} onChange={e => setFormData({...formData, cgpa: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Manifesto</label>
                                <textarea required rows={4} className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.manifesto} onChange={e => setFormData({...formData, manifesto: e.target.value})} placeholder="State your vision..."></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Uploads */}
                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">Passport Photo</label>
                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 bg-white">
                                 {passportPreview ? (
                                     <div className="relative">
                                         <img src={passportPreview} className="h-32 mx-auto object-cover rounded" />
                                         <button type="button" onClick={() => setPassportPreview(null)} className="text-xs text-red-600 underline mt-1">Remove</button>
                                     </div>
                                 ) : (
                                     <label className="cursor-pointer">
                                         <span className="text-emerald-600 text-sm font-medium">Upload Photo</span>
                                         <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'passport')} />
                                     </label>
                                 )}
                             </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">Result Document</label>
                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 bg-white">
                                 {resultPreview ? (
                                     <div className="relative">
                                         <img src={resultPreview} className="h-32 mx-auto object-contain" />
                                         <button type="button" onClick={() => setResultPreview(null)} className="text-xs text-red-600 underline mt-1">Remove</button>
                                     </div>
                                 ) : (
                                     <label className="cursor-pointer">
                                         <span className="text-emerald-600 text-sm font-medium">Upload Result</span>
                                         <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'result')} />
                                     </label>
                                 )}
                             </div>
                        </div>
                    </div>

                    <Button type="submit" className="w-full mt-4" size="lg" isLoading={loading}>Complete Registration</Button>
                </form>
            </div>

            {/* Side Info */}
            <div className="md:w-2/5 bg-gradient-to-br from-purple-900 to-emerald-900 text-white p-8 flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-white mb-6">Aspirant Guidelines</h3>
                <ul className="space-y-6">
                    <li className="flex items-start">
                        <span className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-4 font-bold">1</span>
                        <div>
                            <p className="font-bold">One Account, Dual Role</p>
                            <p className="text-sm text-gray-200 mt-1">This form creates your student login AND your aspirant application. You don't need to register twice.</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-4 font-bold">2</span>
                        <div>
                            <p className="font-bold">Wait for Approval</p>
                            <p className="text-sm text-gray-200 mt-1">Admins will verify your CGPA and details. Once approved, your login will work, and you will appear on the ballot.</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-4 font-bold">3</span>
                        <div>
                            <p className="font-bold">Track & Vote</p>
                            <p className="text-sm text-gray-200 mt-1">Log in to your dashboard to see your live campaign performance and cast your own vote.</p>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
  );
};
