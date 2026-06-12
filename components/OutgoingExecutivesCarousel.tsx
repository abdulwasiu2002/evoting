import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { db } from '../services/mockDb';
import { OutgoingExecutive, ExecutiveStatus } from '../types';

export const OutgoingExecutivesCarousel: React.FC = () => {
    const [executives, setExecutives] = useState<OutgoingExecutive[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedExec, setSelectedExec] = useState<OutgoingExecutive | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const fetchExecs = async () => {
            const execs = await db.getOutgoingExecutives();
            // Filter only valid outgoing executives for display
            setExecutives(execs.filter(e => e.status === ExecutiveStatus.OUTGOING));
        };
        fetchExecs();
    }, []);

    useEffect(() => {
        if (executives.length <= 1 || selectedExec || isHovered) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % executives.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [executives, selectedExec, isHovered]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % executives.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? executives.length - 1 : prev - 1));
    };

    const getOffset = (index: number) => {
        let offset = index - currentIndex;
        const len = executives.length;
        if (offset < -Math.floor((len - 1) / 2)) offset += len;
        if (offset > Math.floor(len / 2)) offset -= len;
        return offset;
    };

    if (executives.length === 0) return null;

    return (
        <section 
            className="py-16 md:py-24 relative overflow-hidden bg-slate-50 border-y border-slate-200"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none -translate-x-1/2 translate-y-1/2" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Outgoing Executives</h2>
                    <p className="text-emerald-600 text-lg md:text-xl font-medium mb-3">Honouring the Leaders Who Served the Association</p>
                    <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">Recognising the dedication, leadership, and achievements of our outgoing executives.</p>
                </div>

                {/* Horizontal Slider Container */}
                <div className="relative h-[600px] w-full flex items-center justify-center">
                    <AnimatePresence initial={false} mode="wait">
                        {executives.map((exec, index) => {
                            const position = getOffset(index);
                            const isCurrent = position === 0;
                            
                            // Only show current, previous, and next items in DOM to save performance
                            if (Math.abs(position) > 2) return null;

                            // Calculate X offset
                            let xOffset = position * (typeof window !== 'undefined' && window.innerWidth < 768 ? 260 : 380);

                            return (
                                <motion.div
                                    key={exec.id}
                                    className={`absolute w-[240px] sm:w-[280px] md:w-[320px] h-[500px] rounded-2xl bg-white backdrop-blur-xl flex flex-col overflow-hidden cursor-pointer shadow-xl
                                        ${isCurrent 
                                            ? 'z-30 border-2 border-emerald-400 ring-2 ring-emerald-400/50 ring-offset-2 shadow-[0_0_30px_rgba(52,211,153,0.3)]' 
                                            : 'z-10 border border-gray-200'
                                        }`}
                                    initial={{ opacity: 0, x: position * 100, scale: 0.8 }}
                                    animate={{ 
                                        opacity: isCurrent ? 1 : 0.6, 
                                        x: xOffset, 
                                        scale: isCurrent ? 1 : 0.85, 
                                    }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    onClick={() => setSelectedExec(exec)}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(e, { offset, velocity }) => {
                                        const swipe = offset.x;
                                        if (swipe < -50) handleNext();
                                        else if (swipe > 50) handlePrev();
                                    }}
                                >
                                    <div className="h-[55%] w-full bg-gray-100 relative shrink-0 overflow-hidden">
                                        {exec.profileImage ? (
                                            <img src={exec.profileImage} alt={exec.fullName} className="w-full h-full object-cover pointer-events-none" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/10 to-transparent pointer-events-none"></div>
                                        <div className="absolute top-4 right-4">
                                            <span className="bg-emerald-500 border border-emerald-400 text-white shadow-sm text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm">
                                                Completed Service
                                            </span>
                                        </div>
                                        <div className="absolute bottom-4 left-4 right-4 text-white">
                                            <h3 className="text-xl md:text-2xl font-bold mb-1 leading-tight">{exec.fullName}</h3>
                                            <p className="text-emerald-300 font-medium text-sm md:text-base">{exec.position}</p>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col justify-between bg-white">
                                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                                            {exec.session}
                                        </div>
                                        <blockquote className="text-gray-700 italic text-sm border-l-4 border-emerald-400 pl-4 flex-1 line-clamp-3 relative mt-2">
                                            <span className="text-emerald-100 text-4xl absolute -top-4 left-0 -z-10 opacity-50">"</span>
                                            {exec.quote || 'Leadership is the capacity to translate vision into reality.'}
                                        </blockquote>
                                        {isCurrent && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 w-full text-center">
                                                <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider">
                                                    View Details &rarr;
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Carousel Controls */}
                    {executives.length > 1 && (
                        <>
                            <button onClick={handlePrev} className="absolute left-2 md:left-10 z-40 p-3 md:p-4 rounded-full bg-white shadow-lg text-gray-700 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button onClick={handleNext} className="absolute right-2 md:right-10 z-40 p-3 md:p-4 rounded-full bg-white shadow-lg text-gray-700 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}
                </div>

                {/* Appreciation Wall */}
                <div className="mt-16 text-center flex flex-col items-center">
                    <div className="w-16 h-1 bg-emerald-500 rounded-full mb-6"></div>
                    <p className="text-gray-600 max-w-2xl text-lg italic bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        "Thank you for your dedication and service to the association."
                    </p>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedExec && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 px-4 sm:px-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                            onClick={() => setSelectedExec(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 max-h-[90vh]"
                        >
                            <button onClick={() => setSelectedExec(null)} className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            
                            {/* Left: Image & Quick Stats */}
                            <div className="md:w-2/5 md:h-auto h-64 relative bg-gray-900 shrink-0">
                                {selectedExec.profileImage ? (
                                    <img src={selectedExec.profileImage} alt={selectedExec.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">No Photo</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                                    <h2 className="text-3xl font-bold mb-1">{selectedExec.fullName}</h2>
                                    <p className="text-emerald-400 font-medium text-lg">{selectedExec.position}</p>
                                    <p className="text-gray-300 text-sm mt-1">{selectedExec.session}</p>
                                </div>
                            </div>
                            
                            {/* Right: Details */}
                            <div className="md:w-3/5 p-6 sm:p-8 overflow-y-auto bg-gray-50">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Tenure Duration</h4>
                                        <p className="text-gray-900 font-medium">{new Date(selectedExec.startDate).toLocaleDateString()} — {new Date(selectedExec.endDate).toLocaleDateString()}</p>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Biography</h4>
                                        <p className="text-gray-700 leading-relaxed">{selectedExec.biography || 'No biography provided.'}</p>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Major Achievements</h4>
                                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                                            <p className="text-gray-700 whitespace-pre-wrap">{selectedExec.achievements || 'No achievements listed.'}</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Personal Quote</h4>
                                        <blockquote className="border-l-4 border-emerald-500 pl-4 py-1 text-gray-700 italic">
                                            "{selectedExec.quote || 'Leadership is service.'}"
                                        </blockquote>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-200">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Appreciation Message</h4>
                                        <p className="text-gray-600 bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-100">
                                            {selectedExec.appreciationMessage || 'Thank you.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};
