
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { db } from '../services/mockDb';

export const AspirantRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  // Images
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    matricNo: '',
    department: '',
    level: '',
    position: '',
    cgpa: '',
    manifesto: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [d, p] = await Promise.all([db.getDepartments(), db.getPositions()]);
        setDepartments(d);
        setPositions(p);
        if (d.length > 0) setFormData(prev => ({ ...prev, department: d[0] }));
        if (p.length > 0) setFormData(prev => ({ ...prev, position: p[0] }));
      } catch (e) {
          console.error(e);
      }
    };
    fetchData();
  }, []);

  // Reuse compression logic
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
    if (!passportPreview || !resultPreview) {
        setError("Both Passport and Result document are required.");
        return;
    }
    setLoading(true);
    setError(null);
    
    try {
        await db.registerAspirant({
            fullName: formData.fullName,
            matricNo: formData.matricNo,
            department: formData.department,
            level: formData.level,
            position: formData.position,
            cgpa: formData.cgpa,
            manifesto: formData.manifesto,
            passportUrl: passportPreview,
            resultUrl: resultPreview
        });
        alert("Aspirant application submitted successfully! Pending admin review.");
        navigate('/');
    } catch (err: any) {
        setError(err.message || "Submission failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-3/5 p-8 border-r border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Aspirant Registration</h2>
                <p className="text-sm text-gray-500 mb-6">Apply to contest for an executive position.</p>

                {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input required type="text" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Matric No</label>
                            <input required type="text" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.matricNo} onChange={e => setFormData({...formData, matricNo: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Level</label>
                            <input required type="text" placeholder="e.g. 300" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">CGPA</label>
                            <input required type="text" placeholder="e.g. 4.5" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.cgpa} onChange={e => setFormData({...formData, cgpa: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Department</label>
                            <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Position</label>
                            <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                                {positions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Manifesto</label>
                        <textarea required rows={4} className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={formData.manifesto} onChange={e => setFormData({...formData, manifesto: e.target.value})} placeholder="State your vision..."></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">Passport Photo</label>
                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50">
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
                             <label className="block text-sm font-medium text-gray-700 mb-2">Result Document (Proof)</label>
                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50">
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

                    <Button type="submit" className="w-full mt-4" isLoading={loading}>Submit Application</Button>
                </form>
            </div>

            {/* Side Info */}
            <div className="md:w-2/5 bg-emerald-900 text-emerald-100 p-8 flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-white mb-6">Guidelines</h3>
                <ul className="space-y-4">
                    <li className="flex items-start">
                        <span className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center mr-3 text-sm">1</span>
                        <span>You must be a registered student of the department.</span>
                    </li>
                    <li className="flex items-start">
                        <span className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center mr-3 text-sm">2</span>
                        <span>Minimum CGPA Requirement: <strong>3.0</strong></span>
                    </li>
                    <li className="flex items-start">
                        <span className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center mr-3 text-sm">3</span>
                        <span>Upload a clear passport photograph (Official wear recommended).</span>
                    </li>
                    <li className="flex items-start">
                        <span className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center mr-3 text-sm">4</span>
                        <span>Upload your most recent result slip as proof of academic standing.</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
  );
};
