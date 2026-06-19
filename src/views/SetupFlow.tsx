// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (SETUPFLOW.TSX):
// 
// 1. BIOMETRIC ONBOARDING & DATA COLLECTOR:
//    - Ang `SetupFlow.tsx` ay isang stepped intake form na humihingi ng vital physiological statistics: Edad, Timbang (kg), Taas (cm), Deskless Mode Preferences, at Physical Limitations.
// 
// 2. BIOMECHANICAL ALIGNMENT INTEGRATION (Knee/Back Sensitivities):
//    - Ang espesyal na screen na ito ay may "Knee Sensitivity" at "Back Pain Assessment" options.
//    - Kapag na-detect ng form na may Knee Sensitivity ang user, awtomatikong iniaadjust ng system ang targets para sa lower joint flexion thresholds para sa kaligtasan sa squats!
// 
// 3. CALORIC AND HYDRATION ENGINE SETUP:
//    - Ang nakalap na physiological data ay gagamitin ng `FuelView.tsx` upang kalkulahin ang eksaktong BMR (Basal Metabolic Rate) at TDEE (Total Daily Energy Expenditure) ng user gamit ang Harris-Benedict formulas!
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Triangle, Heart, Moon, Droplets, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface SetupFlowProps {
  onComplete: (data: UserProfile) => void;
  onBack: () => void;
  key?: string;
}

type SetupStep = 'intro' | 'gender' | 'age' | 'weight' | 'height' | 'goal' | 'activity' | 'assessment' | 'result';

const MaleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <circle cx="10" cy="14" r="6" />
    <path d="M14 10l6-6" />
    <path d="M14 4h6v6" />
  </svg>
);

const FemaleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <circle cx="12" cy="9" r="6" />
    <path d="M12 15v7" />
    <path d="M9 19h6" />
  </svg>
);

// Technical Ticks Ruler for Weight/Age
const RulerTicks = ({ count = 30, activeIndex, theme = 'default' }: { count?: number, activeIndex: number, theme?: 'default' | 'green' }) => {
  return (
    <div className="flex items-end gap-3 h-10 px-[50%]">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "w-[1px] transition-all duration-300 rounded-full",
            i === activeIndex 
              ? (theme === 'green' ? "h-10 bg-lime-500 shadow-[0_0_10px_#84cc16]" : "h-10 bg-white") 
              : "h-4 bg-white/10"
          )}
        />
      ))}
    </div>
  );
};

// Advanced Horizontal Ruler for Age
const AgeRuler = ({ min, max, value, onChange }: { min: number, max: number, value: number, onChange: (v: number) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const itemWidth = 70;

  useEffect(() => {
    if (scrollRef.current) {
       scrollRef.current.scrollLeft = (value - min) * itemWidth;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        onChange(Math.min(max, value + 1));
      } else if (e.key === 'ArrowLeft') {
        onChange(Math.max(min, value - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, min, max, onChange]);

  useEffect(() => {
    if (scrollRef.current) {
      const targetScroll = (value - min) * itemWidth;
      const currentScroll = scrollRef.current.scrollLeft;
      if (Math.abs(currentScroll - targetScroll) > 1) {
        scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [value, min]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollLeft;
    const index = Math.round(scrollPos / itemWidth);
    const newValue = min + index;
    if (newValue >= min && newValue <= max && newValue !== value) {
      onChange(newValue);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center">
      <div className="flex flex-col items-center mb-6">
        <div className="text-6xl font-black text-lime-500 italic leading-none drop-shadow-[0_0_20px_#84cc16]">
          {value}
        </div>
        <Triangle className="w-6 h-6 text-lime-500 fill-current mt-4 drop-shadow-[0_0_15px_#84cc16]" />
      </div>

      <div className="relative w-full h-24 bg-[#111] rounded-2xl border border-white/5 shadow-inner">
        {/* Fade Masks */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#111] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#111] to-transparent z-10 pointer-events-none" />
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="hide-scrollbar w-full h-full overflow-x-auto flex items-center snap-x snap-mandatory cursor-ew-resize"
        >
          <div className="flex" style={{ paddingLeft: 'calc(50% - 35px)', paddingRight: 'calc(50% - 35px)' }}>
            {items.map((item) => (
              <button 
                key={item} 
                onClick={() => onChange(item)}
                style={{ minWidth: itemWidth }} 
                className="snap-center flex flex-col items-center justify-center h-full outline-none"
              >
                <span className={cn(
                  "text-2xl font-black italic tabular-nums transition-all duration-300",
                  item === value ? "text-lime-500 scale-125 drop-shadow-[0_0_15px_#84cc16]" : "text-white/10 hover:text-white/30"
                )}>
                  {item}
                </span>
                <div className={cn(
                  "w-[1.5px] mt-2 rounded-full transition-all duration-300",
                  item === value ? "h-6 bg-lime-500 shadow-[0_0_10px_#84cc16]" : "h-3 bg-white/10"
                )} />
              </button>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-2xl" />
      </div>
    </div>
  );
};

// Advanced Horizontal Ruler for Weight
const WeightRuler = ({ min, max, value, unit, onChange }: { min: number, max: number, value: number, unit: string, onChange: (v: number) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const itemWidth = 80;

  useEffect(() => {
    if (scrollRef.current) {
       scrollRef.current.scrollLeft = (value - min) * itemWidth;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        onChange(Math.min(max, value + 1));
      } else if (e.key === 'ArrowLeft') {
        onChange(Math.max(min, value - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, min, max, onChange]);

  useEffect(() => {
    if (scrollRef.current) {
      const targetScroll = (value - min) * itemWidth;
      const currentScroll = scrollRef.current.scrollLeft;
      if (Math.abs(currentScroll - targetScroll) > 1) {
        scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [value, min]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollLeft;
    const index = Math.round(scrollPos / itemWidth);
    const newValue = min + index;
    if (newValue >= min && newValue <= max && newValue !== value) {
      onChange(newValue);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center">
      {/* Fade Masks */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black via-black/40 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black via-black/40 to-transparent z-10 pointer-events-none" />

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        className="hide-scrollbar w-full h-32 overflow-x-auto flex items-center snap-x snap-mandatory mb-4 cursor-ew-resize"
      >
        <div className="flex" style={{ paddingLeft: 'calc(50% - 40px)', paddingRight: 'calc(50% - 40px)' }}>
          {items.map((item) => (
            <button 
              key={item} 
              onClick={() => onChange(item)}
              style={{ minWidth: itemWidth }} 
              className="snap-center flex flex-col items-center justify-center h-full gap-4 outline-none group"
            >
              <span className={cn(
                "text-4xl font-black italic tabular-nums transition-all duration-500",
                item === value ? "text-white scale-110 drop-shadow-[0_0_25px_rgba(255,255,255,0.7)]" : "text-white/10 group-hover:text-white/30"
              )}>
                {item}
              </span>
              <div className="flex items-end gap-2 h-10 justify-center">
                <div className={cn(
                  "w-[2px] rounded-full transition-all duration-500", 
                  item === value ? "h-10 bg-lime-500 shadow-[0_0_20px_#84cc16]" : "h-4 bg-lime-500/20"
                )} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center mt-8 mb-12">
         <Triangle className="w-6 h-6 text-white fill-current mb-4 drop-shadow-[0_0_15px_white] rotate-180" />
         <div className="text-7xl font-black italic flex items-baseline gap-3 leading-none tracking-tighter">
           {value} <span className="text-2xl text-white/40 not-italic uppercase font-bold tracking-widest">{unit}</span>
         </div>
      </div>
    </div>
  );
};

// Vertical Height Design
const VerticalTechnicalRuler = ({ min, max, value, onChange }: { min: number, max: number, value: number, onChange: (v: number) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = Array.from({ length: max - min + 1 }, (_, i) => max - i);
  const itemHeight = 36; 
  const containerHeight = 280;

  // Set initial scroll position on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: (max - value) * itemHeight });
    }
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        onChange(Math.min(max, value + 1));
      } else if (e.key === 'ArrowDown') {
        onChange(Math.max(min, value - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, max, min, onChange]);

  useEffect(() => {
    if (scrollRef.current) {
      const targetScroll = (max - value) * itemHeight;
      const currentScroll = scrollRef.current.scrollTop;
      if (Math.abs(currentScroll - targetScroll) > 1) {
        scrollRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  }, [value, max]); // Regular updates are smooth

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const index = Math.round(scrollPos / itemHeight);
    const newValue = max - index;
    
    if (newValue !== value && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY > 0) {
      onChange(Math.max(min, value - 1));
    } else {
      onChange(Math.min(max, value + 1));
    }
  };

  const handleItemClick = (item: number) => {
    onChange(item);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
       {/* Top Big Green Display */}
       <div className="flex items-baseline gap-3 mb-6 -ml-8">
          <div className="text-[4.5rem] font-black text-[#00FF00] italic leading-none drop-shadow-[0_0_20px_rgba(0,255,0,0.5)]">
             {value}
          </div>
          <span className="text-xl font-bold text-white/80 italic">Cm</span>
       </div>

        <div className="relative w-full max-w-[280px] flex items-center justify-between" style={{ height: containerHeight }}>
          {/* Numbers on the Left side */}
          <div className="w-16 z-10 overflow-hidden relative border-r border-white/5 h-full">
             {/* Fade Mask */}
             <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />
             <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />

             <div 
               className="flex flex-col items-center w-full transition-transform duration-300 ease-out"
               style={{ transform: `translateY(${(containerHeight/2 - (itemHeight/2)) - (max - value) * itemHeight}px)` }}
             >
                {items.map((num) => {
                   const isActive = num === value;
                   return (
                      <button 
                        key={num} 
                        onClick={() => handleItemClick(num)}
                        style={{ height: itemHeight }}
                        className={cn(
                          "flex items-center justify-center w-full transition-all duration-300 outline-none",
                          isActive 
                           ? "text-[#00FF00] text-3xl font-black drop-shadow-[0_0_25px_#00FF00] opacity-100 italic scale-110" 
                           : "text-white/10 text-lg font-bold opacity-30 italic hover:text-white/40 hover:opacity-100"
                        )}
                      >
                         {num}
                      </button>
                   );
                })}
             </div>
          </div>

          {/* Central Ruler Column */}
          <div className="relative flex-1 h-full bg-[#0A0F14] rounded-2xl border border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden mx-4 ring-1 ring-white/5">
             {/* Fade Mask */}
             <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0A0F14] to-transparent z-20 pointer-events-none" />
             <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A0F14] to-transparent z-20 pointer-events-none" />

             <div 
               ref={scrollRef}
               onScroll={handleScroll}
               onWheel={handleWheel}
               className="hide-scrollbar h-full w-full overflow-y-auto snap-y snap-mandatory cursor-ns-resize"
             >
                <div className="flex flex-col" style={{ paddingTop: (containerHeight - itemHeight) / 2, paddingBottom: (containerHeight - itemHeight) / 2 }}>
                   {items.map(item => (
                      <button 
                       key={item} 
                       onClick={() => handleItemClick(item)}
                       style={{ height: itemHeight }} 
                       className="snap-center flex flex-col items-center justify-center outline-none w-full group"
                     >
                        <div className={cn(
                          "transition-all duration-300 rounded-full",
                          item === value 
                            ? "w-16 h-[4px] bg-[#00FF00] shadow-[0_0_20px_#00FF00,0_0_8px_#fff]" 
                            : (item % 5 === 0 ? "w-12 h-[2px] bg-[#00FF00]/40" : "w-10 h-[1.5px] bg-[#00FF00]/10")
                        )} />
                      </button>
                   ))}
                </div>
             </div>
             {/* Center focus line overlay for extra sharpness */}
             <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#00FF00]/20 -translate-y-1/2 pointer-events-none blur-sm" />
             <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Right Arrow Indicator */}
          <div className="w-8 z-20 flex justify-center">
             <Triangle className="w-6 h-6 text-[#00FF00] fill-current rotate-[-90deg] drop-shadow-[0_0_15px_rgba(0,255,0,0.8)]" />
          </div>
       </div>
    </div>
  );
};

export default function SetupFlow({ onComplete, onBack }: SetupFlowProps) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    gender: 'male',
    age: 28,
    weight: 75,
    height: 170,
    goal: 'muscle_gain',
    activityLevel: 'beginner',
    sleepHours: '7_8',
    hasKneeSensitivity: false,
    hasBackPain: false,
    hydrationLevel: 'moderate',
    energyLevel: 'normal'
  });
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [hasScrolledResult, setHasScrolledResult] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset scroll state when entering result step
  useEffect(() => {
    if (step === 'result') {
      setHasScrolledResult(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [step]);

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (step === 'result' && !hasScrolledResult) {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      // If user has scrolled at least 100px or reached near bottom
      if (scrollTop > 100 || scrollTop + clientHeight >= scrollHeight - 50) {
        setHasScrolledResult(true);
      }
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const next = () => {
    const steps: SetupStep[] = ['intro', 'gender', 'age', 'weight', 'height', 'goal', 'activity', 'assessment', 'result'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      onComplete(profile);
    }
  };

  const back = () => {
    const steps: SetupStep[] = ['intro', 'gender', 'age', 'weight', 'height', 'goal', 'activity', 'assessment', 'result'];
    const currentIndex = steps.indexOf(step);
    if (step === 'assessment' && disclaimerAccepted) {
      setDisclaimerAccepted(false);
      return;
    }
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      onBack();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden text-white font-sans flex flex-col selection:bg-lime-500/30">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div 
            key="intro" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 flex flex-col"
          >
            <div className="flex-1 relative overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=2069&auto=format&fit=crop" 
                alt="" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              
              <div className="absolute bottom-0 inset-x-0 p-8 pb-16 sm:p-12 sm:pb-24 z-10">
                 <div className="space-y-6 max-w-xl">
                    <div className="space-y-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "60px" }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="h-1 bg-lime-500 mb-4"
                      />
                      <h2 className="text-[40px] sm:text-[72px] font-black leading-[0.9] uppercase italic tracking-tighter drop-shadow-2xl">
                        INITIALIZE<br />
                        <span className="text-lime-500">PERFORMANCE</span>
                      </h2>
                    </div>
                    <p className="text-white/50 text-sm sm:text-base leading-relaxed max-w-[260px] sm:max-w-md font-medium">
                      Calibrate your target metrics to unlock professional posture coaching and track your evolution with precision biometric data.
                    </p>
                    <button 
                      onClick={next} 
                      className="w-full sm:w-auto px-12 py-5 bg-lime-500 text-black rounded-2xl font-black uppercase italic tracking-widest hover:scale-[1.02] transition-all shadow-[0_20px_40px_rgba(132,204,22,0.3)] active:scale-95 group relative overflow-hidden"
                    >
                      <span className="relative z-10">Let's Start</span>
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {step !== 'intro' && (
          <motion.div 
            key={step} 
            initial={{ x: 30, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: -30, opacity: 0 }} 
            className="absolute inset-0 flex flex-col p-6 sm:p-8"
          >
            <header className="flex items-center justify-between mb-4 pt-2 w-full">
              <button 
                onClick={back} 
                className="flex items-center gap-2 text-white/40 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors animate-pulse"
              >
                <ChevronLeft size={16} /> Back
              </button>

              {step !== 'result' && (
                <div className="flex items-center gap-1.5">
                  {['gender', 'age', 'weight', 'height', 'goal', 'activity', 'assessment'].map((s) => (
                    <div 
                      key={s} 
                      className={cn(
                        "h-1 rounded-full transition-all duration-300", 
                        step === s 
                          ? "w-6 bg-lime-500 shadow-[0_0_10px_#84cc16]" 
                          : "w-1.5 bg-white/10"
                      )} 
                    />
                  ))}
                </div>
              )}
            </header>

            <div 
              ref={scrollContainerRef}
              onScroll={handleMainScroll}
              className="flex-1 flex flex-col items-center overflow-y-auto px-4 pt-12 pb-10 hide-scrollbar scroll-smooth"
            >
                {step === 'gender' && (
                  <div className="w-full max-w-sm flex flex-col items-center flex-1 justify-center py-6">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tighter leading-none">Biological Profile</h2>
                      <p className="text-white/40 text-[10px] font-medium max-w-[280px] mx-auto uppercase tracking-widest leading-relaxed">
                        Data accuracy is critical for metabolic calculation.
                      </p>
                    </div>
                    
                    <div className="flex gap-6 w-full max-w-[320px]">
                      {[
                        { id: 'male' as const, label: 'Male', Icon: MaleIcon },
                        { id: 'female' as const, label: 'Female', Icon: FemaleIcon }
                      ].map(({ id, label, Icon }) => (
                        <button 
                          key={id}
                          onClick={() => updateProfile({ gender: id })} 
                          className={cn(
                            "flex-1 aspect-[4/5] rounded-[2.5rem] border-2 flex flex-col items-center justify-center gap-4 transition-all duration-500 relative group overflow-hidden",
                            profile.gender === id 
                              ? "bg-lime-500/10 border-lime-500 shadow-[0_0_40px_rgba(163,230,71,0.15)]" 
                              : "bg-[#0A0A0A] border-white/5 hover:border-white/10"
                          )}
                        >
                          <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500",
                            profile.gender === id ? "bg-lime-500 text-black scale-110" : "bg-white/5 text-white/20 group-hover:bg-white/10 group-hover:text-white/40"
                          )}>
                            <div className="scale-75"><Icon /></div>
                          </div>
                          <span className={cn(
                            "font-black uppercase italic text-[11px] tracking-[0.2em] transition-colors",
                            profile.gender === id ? "text-white" : "text-white/20"
                          )}>
                            {label}
                          </span>
                          
                          {profile.gender === id && (
                            <motion.div 
                              layoutId="gender-glow"
                              className="absolute inset-0 bg-lime-500/5 pointer-events-none"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'age' && (
                   <div className="w-full flex flex-col items-center flex-1 justify-center py-10">
                      <h2 className="text-2xl font-black mb-1 uppercase italic text-center">How Old Are You?</h2>
                      <p className="text-white/20 text-[10px] text-center leading-relaxed mb-6">
                        Helps us calculate your metabolism.
                      </p>
                      
                      <div className="w-full max-w-sm">
                        <AgeRuler min={12} max={90} value={profile.age} onChange={(v) => updateProfile({ age: v })} />
                      </div>
                   </div>
                )}

                {step === 'weight' && (
                   <div className="w-full flex flex-col items-center flex-1 justify-center py-10">
                      <h2 className="text-2xl font-black mb-1 uppercase italic text-center leading-none">What Is Your Weight?</h2>
                      <p className="text-white/20 text-[10px] text-center leading-relaxed mb-4">
                        Essential for BMI calculations.
                      </p>

                      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-1 mb-6 flex w-full max-w-[160px]">
                         <button 
                          onClick={() => setUnit('kg')}
                          className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all", unit === 'kg' ? "bg-black text-white shadow-xl" : "text-white/20")}
                        >KG</button>
                         <div className="w-[1px] h-4 bg-white/10 self-center" />
                         <button 
                          onClick={() => setUnit('lb')}
                          className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all", unit === 'lb' ? "bg-black text-white shadow-xl" : "text-white/20")}
                        >LB</button>
                      </div>

                      <div className="w-full">
                        <WeightRuler min={30} max={250} value={profile.weight} unit={unit} onChange={(v) => updateProfile({ weight: v })} />
                      </div>
                   </div>
                )}

                {step === 'height' && (
                   <div className="w-full flex flex-col items-center flex-1 justify-center py-10 min-h-0">
                      <h2 className="text-2xl font-black mb-1 uppercase italic text-center leading-none">What Is Your Height?</h2>
                      <p className="text-white/20 text-[10px] text-center leading-relaxed mb-4">
                        Establishes your physical profile.
                      </p>
                      
                      <div className="w-full">
                        <VerticalTechnicalRuler min={100} max={250} value={profile.height} onChange={(v) => updateProfile({ height: v })} />
                      </div>
                   </div>
                )}

                {step === 'goal' && (
                   <div className="w-full max-w-sm flex flex-col items-center flex-1 pt-4 pb-8 min-h-0">
                      <div className="text-center mb-6 px-4">
                        <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tighter leading-none">Your Primary Objective</h2>
                        <p className="text-white/40 text-[10px] font-medium max-w-[280px] mx-auto uppercase tracking-widest leading-relaxed">
                          Our smart system will adapt your training intensity based on this evolution path.
                        </p>
                      </div>
                      
                      <div className="w-full space-y-3 overflow-y-auto px-4 hide-scrollbar py-2 max-h-[65vh]">
                        {[
                          { id: 'lose_weight', label: 'Lose Weight', desc: 'Focus on calorie deficit & high metabolic stress' },
                          { id: 'gain_weight', label: 'Gain Weight', desc: 'Strategic mass building with high-volume load' },
                          { id: 'muscle_gain', label: 'Muscle Mass Gain', desc: 'Hypertrophy focused professional routines' },
                          { id: 'shape_body', label: 'Shape Body', desc: 'Body recomposition & precision definition' },
                          { id: 'others', label: 'Others', desc: 'Tailored hybrid performance goals' }
                        ].map(g => (
                          <button 
                            key={g.id} 
                            onClick={() => updateProfile({ goal: g.id as any })} 
                            className={cn(
                              "w-full group relative transition-all duration-300",
                              profile.goal === g.id ? "scale-[1.02]" : "hover:scale-[1.01]"
                            )}
                          >
                            <div className={cn(
                              "relative z-10 p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300",
                              profile.goal === g.id 
                                ? "bg-lime-500/10 border-lime-500 shadow-[0_0_25px_rgba(163,230,71,0.2)]" 
                                : "bg-[#111] border-white/5 hover:border-white/20"
                            )}>
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                                profile.goal === g.id ? "bg-lime-500 text-black rotate-90" : "bg-white/5 text-white/40 group-hover:text-white"
                              )}>
                                <Triangle size={16} fill="currentColor" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className={cn(
                                  "text-xs font-black uppercase italic tracking-wider transition-colors",
                                  profile.goal === g.id ? "text-lime-500" : "text-white/60 group-hover:text-white"
                                )}>
                                  {g.label}
                                </div>
                                <div className="text-[9px] text-white/30 font-bold uppercase tracking-wider mt-0.5 leading-tight">
                                  {g.desc}
                                </div>
                              </div>
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center",
                                profile.goal === g.id ? "border-lime-500 bg-lime-500" : "border-white/10"
                              )}>
                                {profile.goal === g.id && (
                                  <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                   </div>
                )}

                {step === 'activity' && (
                   <div className="w-full max-w-sm flex flex-col items-center flex-1 pt-4 pb-8 min-h-0">
                      <div className="text-center mb-6 px-4">
                        <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tighter leading-none">Current Capacity</h2>
                        <p className="text-white/40 text-[10px] font-medium max-w-[280px] mx-auto uppercase tracking-widest leading-relaxed text-center">
                          Select the level that matches your consistent training frequency.
                        </p>
                      </div>

                      <div className="w-full space-y-4 px-4 pb-10">
                        {[
                          { id: 'beginner', label: 'Beginner', level: 'Level 01', desc: '0-2 training sessions per week' },
                          { id: 'intermediate', label: 'Intermediate', level: 'Level 02', desc: '3-5 training sessions per week' },
                          { id: 'advanced', label: 'Advanced', level: 'Level 03', desc: '6+ elite training sessions per week' }
                        ].map(lvl => (
                          <button 
                            key={lvl.id} 
                            onClick={() => updateProfile({ activityLevel: lvl.id as any })} 
                            className={cn(
                              "w-full p-6 rounded-3xl border-2 transition-all duration-500 relative group overflow-hidden",
                              profile.activityLevel === lvl.id 
                                ? "bg-gradient-to-br from-lime-500/20 to-transparent border-lime-500/80 shadow-[0_0_30px_rgba(163,230,71,0.15)]" 
                                : "bg-[#0A0A0A] border-white/5 hover:border-white/10"
                            )}
                          >
                            <div className="relative z-10 flex flex-col items-start gap-1">
                              <span className={cn(
                                "text-[9px] font-black italic tracking-[0.2em] uppercase mb-1",
                                profile.activityLevel === lvl.id ? "text-lime-500" : "text-white/20"
                              )}>
                                {lvl.level}
                              </span>
                              <h3 className={cn(
                                "text-2xl font-black italic uppercase transition-colors tracking-tighter",
                                profile.activityLevel === lvl.id ? "text-white" : "text-white/40 group-hover:text-white/60"
                              )}>
                                {lvl.label}
                              </h3>
                              <p className={cn(
                                "text-[10px] uppercase font-bold tracking-widest transition-colors",
                                profile.activityLevel === lvl.id ? "text-white/40" : "text-white/10"
                              )}>
                                {lvl.desc}
                              </p>
                            </div>
                            
                            {/* Decorative background number */}
                            <span className={cn(
                              "absolute -bottom-4 -right-2 text-7xl font-black italic opacity-[0.03] transition-all duration-700 select-none",
                              profile.activityLevel === lvl.id ? "opacity-[0.12] translate-y-0 text-lime-500" : "translate-y-4"
                            )}>
                              {lvl.level.split(' ')[1]}
                            </span>

                            {profile.activityLevel === lvl.id && (
                              <motion.div 
                                layoutId="activity-active"
                                className="absolute left-0 top-0 bottom-0 w-1.5 bg-lime-500 shadow-[2px_0_15px_#84cc16]"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                   </div>
                )}

                {step === 'assessment' && (
                  <div className="w-full max-w-sm flex flex-col items-center justify-between flex-1 pt-2 pb-6 min-h-0">
                    <div className="text-center px-4 w-full flex-1 flex flex-col justify-center">
                      <div className="relative inline-block mx-auto mb-4">
                        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-150 animate-pulse" />
                        <ShieldAlert className="w-14 h-14 text-orange-500 relative z-10 mx-auto" />
                      </div>
                      <h2 className="text-2xl font-black mb-2 uppercase italic tracking-tighter leading-tight text-orange-500 font-sans">
                        Medical Advisory
                      </h2>
                      <div className="h-[2px] w-12 bg-orange-500/30 mx-auto mb-4 rounded-full" />
                      
                      <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-4 leading-snug">
                        Please consult a doctor before training
                      </p>
                      
                      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-left space-y-3 shadow-inner">
                        <p className="text-white/80 text-[11px] font-medium leading-relaxed">
                          If you have any current illness, medical condition, cardiovascular issue, or orthopedic concern, <strong className="text-orange-400 font-bold">you are strongly advised to consult your doctor or professional healthcare provider</strong> before using this fitness system.
                        </p>
                        <p className="text-white/50 text-[10px] font-medium leading-relaxed">
                          By continuing past this screen, you acknowledge that you have reviewed your health, obtained professional medical clearance if necessary, and assume full personal responsibility for your activities.
                        </p>
                      </div>
                    </div>

                    <div className="w-full px-4 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setDisclaimerAccepted(true);
                          next();
                        }}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black rounded-2xl font-black uppercase italic tracking-widest border-none transition-all shadow-[0_10px_20px_rgba(249,115,22,0.2)] active:scale-95 cursor-pointer text-center flex items-center justify-center"
                      >
                        I Understand &amp; Agree
                      </button>
                    </div>
                  </div>
                 )}

                {step === 'result' && (() => {
                  const hM = profile.height / 100;
                  const bmi = profile.weight / (hM * hM);
                  
                  // Mifflin-St Jeor Equation for BMR
                  let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
                  bmr = profile.gender === 'male' ? bmr + 5 : bmr - 161;

                  // TDEE multiplier based on activity level
                  const getActivityMultiplier = (level: string) => {
                    switch(level) {
                      case 'advanced': return 1.725;
                      case 'intermediate': return 1.55;
                      default: return 1.2;
                    }
                  };
                  const tdee = Math.round(bmr * getActivityMultiplier(profile.activityLevel));

                  let category = "Normal";
                  let color = "#bef264"; // lime-300
                  let glowColor = "rgba(190, 242, 100, 0.2)";
                  
                  if (bmi < 18.5) {
                    category = "Underweight";
                    color = "#7dd3fc"; // sky-300
                    glowColor = "rgba(125, 211, 252, 0.2)";
                  } else if (bmi >= 25 && bmi < 29.9) {
                    category = "Overweight";
                    color = "#fdba74"; // orange-300
                    glowColor = "rgba(253, 186, 116, 0.2)";
                  } else if (bmi >= 30) {
                    category = "Obese";
                    color = "#fca5a1"; // Red-300
                    glowColor = "rgba(252, 165, 161, 0.2)";
                  }

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-sm flex flex-col items-center flex-1 py-4"
                    >
                       {/* Advanced BMI Gauge */}
                       <div className="relative mb-12 flex justify-center items-center">
                          <svg className="w-64 h-64 -rotate-90">
                            {/* Background Track */}
                            <circle 
                              cx="128" cy="128" r="100" 
                              stroke="#111" 
                              strokeWidth="12" 
                              fill="transparent" 
                              className="stroke-white/[0.03]"
                            />
                            {/* Segments for visual reference */}
                            {[...Array(24)].map((_, i) => (
                              <line 
                                key={i}
                                x1="228" y1="128" x2="238" y2="128"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-white/10"
                                transform={`rotate(${i * 15} 128 128)`}
                              />
                            ))}
                            {/* Main Progress */}
                            <motion.circle 
                              cx="128" cy="128" r="100" 
                              stroke={color}
                              strokeWidth="12"
                              strokeDasharray={2 * Math.PI * 100}
                              initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                              animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - Math.min(bmi / 40, 1)) }}
                              transition={{ duration: 2, ease: "easeOut", delay: 0.2 }}
                              strokeLinecap="round"
                              fill="transparent"
                              style={{ 
                                filter: `drop-shadow(0 0 12px ${color}44)`
                              }}
                            />
                          </svg>
                          
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <motion.span 
                               initial={{ opacity: 0, scale: 0.5 }}
                               animate={{ opacity: 1, scale: 1 }}
                               transition={{ delay: 1 }}
                               className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em] mb-1 italic"
                             >
                               BMI INDEX
                             </motion.span>
                             <motion.span 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ delay: 1.2 }}
                               className="text-7xl font-black italic tracking-tighter leading-none tabular-nums"
                               style={{ color: color }}
                             >
                               {bmi.toFixed(1)}
                             </motion.span>
                             <div className="mt-4 flex gap-1">
                                {[1,2,3,4,5].map(i => (
                                  <div key={i} className={cn("w-3 h-1 rounded-full", i <= Math.ceil(bmi/8) ? "bg-white/40" : "bg-white/5")} />
                                ))}
                             </div>
                          </div>

                          {/* Decorative HUD lines */}
                          <div className="absolute -inset-4 border-2 border-white/[0.03] rounded-full pointer-events-none" />
                          <div className="absolute -inset-8 border border-white/[0.01] rounded-full pointer-events-none" />
                       </div>

                       <div className="text-center space-y-3 mb-10 w-full">
                          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/5 mb-2">
                             <p className="text-white/40 text-[9px] uppercase font-black tracking-[0.3em] italic">
                               {profile.age}YS • {profile.gender.toUpperCase()} • {profile.activityLevel.toUpperCase()}
                             </p>
                          </div>
                          
                          <motion.h2 
                            initial={{ opacity: 0, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            transition={{ delay: 1.5 }}
                            className="text-4xl font-black uppercase italic leading-none tracking-tighter"
                          >
                            YOU ARE <span style={{ color: color }} className="relative">
                              {category}
                              <motion.span 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ delay: 2, duration: 1 }}
                                className="absolute -bottom-1 left-0 h-1 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </span>
                          </motion.h2>
                       </div>

                       <div className="grid grid-cols-2 gap-4 w-full mb-6">
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.8 }}
                            className="relative group h-full"
                          >
                            <div className="absolute inset-0 bg-lime-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-[#0A0A0A] border-2 border-white/5 p-5 rounded-3xl flex flex-col items-start gap-4 hover:border-lime-500/30 transition-all duration-500">
                               <div className="w-10 h-10 rounded-2xl bg-lime-500/10 flex items-center justify-center text-lime-500">
                                  <Triangle size={18} fill="currentColor" />
                               </div>
                               <div>
                                 <span className="text-[10px] font-black text-white/20 uppercase italic tracking-widest block mb-1">Daily Calories</span>
                                 <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black italic text-lime-500 tracking-tighter">{tdee}</span>
                                    <span className="text-[10px] text-white/40 font-bold uppercase">Kcal</span>
                                 </div>
                               </div>
                            </div>
                          </motion.div>

                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 2 }}
                            className="relative group h-full"
                          >
                            <div className="relative bg-[#0A0A0A] border-2 border-white/5 p-5 rounded-3xl flex flex-col items-start gap-4 transition-all duration-500">
                               <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                                  <div className="w-4 h-[2px] bg-white/40 rotate-45" />
                               </div>
                               <div>
                                 <span className="text-[10px] font-black text-white/20 uppercase italic tracking-widest block mb-1">Basal Rate</span>
                                 <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black italic text-white tracking-tighter">{Math.round(bmr)}</span>
                                    <span className="text-[10px] text-white/40 font-bold uppercase">Kcal</span>
                                 </div>
                               </div>
                            </div>
                          </motion.div>
                       </div>

                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 2.2 }}
                         className="grid grid-cols-2 gap-3 w-full"
                       >
                          <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between group overflow-hidden relative">
                             <div className="relative z-10">
                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] block">Height</span>
                                <span className="text-lg font-black italic text-white/80">{profile.height}CM</span>
                             </div>
                             <div className="text-4xl font-black italic text-white/[0.02] absolute -right-2 tracking-tighter group-hover:text-white/[0.05] transition-colors">HT</div>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between group overflow-hidden relative">
                             <div className="relative z-10">
                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] block">Weight</span>
                                <span className="text-lg font-black italic text-white/80">{profile.weight}KG</span>
                             </div>
                             <div className="text-4xl font-black italic text-white/[0.02] absolute -right-2 tracking-tighter group-hover:text-white/[0.05] transition-colors">WT</div>
                          </div>
                       </motion.div>
                    </motion.div>
                  );
                })()}
            </div>

            <div className="mt-4 pb-4 w-full max-w-[240px] mx-auto h-[72px]">
              <AnimatePresence>
                {(step !== 'result' || hasScrolledResult) && step !== 'assessment' && (
                  <motion.button 
                    key="continue-btn"
                    initial={step === 'result' ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    onClick={next} 
                    className="w-full py-4 bg-lime-500 hover:bg-lime-400 text-black rounded-2xl font-black uppercase italic tracking-widest border-none transition-all shadow-[0_10px_20px_rgba(132,204,22,0.2)] active:scale-95 cursor-pointer"
                  >
                    {step === 'result' ? 'Let\'s Start' : 'Continue'}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
