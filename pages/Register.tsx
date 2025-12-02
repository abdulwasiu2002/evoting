
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { db } from '../services/mockDb';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    fullName: '',
    matricNo: '',
    department: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchDepts = async () => {
        try {
            const depts = await db.getDepartments();
            if (depts && depts.length > 0) {
                setDepartments(depts);
                if (!formData.department) {
                    setFormData(prev => ({ ...prev, department: depts[0] }));
                }
            } else {
                throw new Error("No departments found in DB");
            }
        } catch (e) {
            console.warn("Failed to load departments from DB, using fallback list.", e);
            // Fallback list to ensure UI doesn't get stuck on "Loading..."
            const fallbackDepts = [
                'Computer Science',
                'Software Engineering',
                'Cyber Security',
                'Information Technology',
                'Information Systems',
                'Data Science'
            ];
            setDepartments(fallbackDepts);
            if (!formData.department) {
                setFormData(prev => ({ ...prev, department: fallbackDepts[0] }));
            }
        }
    };
    fetchDepts();
  }, []);

  // Helper to compress image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500; // Reduced max width
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
          
          // Compress to JPEG at 0.5 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Show loading state for image processing if needed
        const compressedDataUrl = await compressImage(file);
        setPreview(compressedDataUrl);
        setError(null);
      } catch (err) {
        setError("Failed to process image. Please try another file.");
      }
    }
  };

  const handleClearData = () => {
      if (window.confirm("This will clear all local data to fix the storage error. Continue?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!preview) {
        setError("Please upload your student ID card");
        return;
    }

    setLoading(true);
    try {
      await db.register({
        fullName: formData.fullName,
        matricNo: formData.matricNo,
        department: formData.department,
        passwordHash: formData.password,
        idCardUrl: preview 
      });
      alert('Registration submitted! Please wait for admin approval.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes('quota') || err.name === 'QuotaExceededError')) {
        setError("STORAGE FULL");
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow overflow-hidden flex flex-col md:flex-row my-8">
      <div className="md:w-1/2 p-8 border-r border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Registration</h2>
        
        {error === "STORAGE FULL" ? (
             <div className="bg-red-50 text-red-700 p-4 rounded mb-4 text-sm border border-red-200">
                <p className="font-bold mb-2">Browser Storage Full</p>
                <p className="mb-3">The demo database has run out of space for images.</p>
                <button 
                    type="button"
                    onClick={handleClearData}
                    className="bg-red-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-red-700 transition"
                >
                    Clear Data & Reset App
                </button>
             </div>
        ) : error && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm break-words">{error}</div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input 
              required
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Matriculation Number</label>
            <input 
              required
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              value={formData.matricNo}
              onChange={(e) => setFormData({...formData, matricNo: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
            >
              {departments.length === 0 ? <option>Loading...</option> : null}
              {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input 
                required
                type="password"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Confirm</label>
                <input 
                required
                type="password"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID Card (Image)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 transition">
              <div className="space-y-1 text-center">
                {!preview ? (
                   <>
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600 justify-center">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB (Will be compressed)</p>
                   </>
                ) : (
                    <div className="relative">
                        <img src={preview} alt="ID Preview" className="mx-auto h-32 object-contain" />
                        <button 
                            type="button"
                            onClick={() => setPreview(null)}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <p className="text-xs text-green-600 mt-2 font-medium">Image loaded & compressed</p>
                    </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={loading}>
              Register Account
            </Button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
                Already registered? <span className="text-emerald-600 cursor-pointer hover:underline" onClick={() => navigate('/login')}>Login here</span>
            </p>
          </div>
        </form>
      </div>
      
      {/* Right side info panel */}
      <div className="md:w-1/2 bg-emerald-50 p-8 flex flex-col justify-center">
        <h3 className="text-xl font-bold text-emerald-800 mb-4">Registration Process</h3>
        <ul className="space-y-6">
            <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold mr-4">1</div>
                <div>
                    <h4 className="text-lg font-medium text-emerald-900">Fill your details</h4>
                    <p className="text-sm text-emerald-700">Provide accurate information matching your school records.</p>
                </div>
            </li>
            <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold mr-4">2</div>
                <div>
                    <h4 className="text-lg font-medium text-emerald-900">Upload ID Card</h4>
                    <p className="text-sm text-emerald-700">A clear image of your student ID card is required for verification.</p>
                </div>
            </li>
            <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold mr-4">3</div>
                <div>
                    <h4 className="text-lg font-medium text-emerald-900">Await Approval</h4>
                    <p className="text-sm text-emerald-700">Admins will verify your identity. You will be notified via email.</p>
                </div>
            </li>
            <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold mr-4">4</div>
                <div>
                    <h4 className="text-lg font-medium text-emerald-900">Login & Vote</h4>
                    <p className="text-sm text-emerald-700">Once approved, access the dashboard to cast your vote.</p>
                </div>
            </li>
        </ul>
      </div>
    </div>
  );
};
