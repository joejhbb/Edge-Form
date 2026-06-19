// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (ONBOARDINGSLIDES.TSX):
// 
// 1. WELCOME ONBOARDING SLIDES:
//    - Nagpapakita ng visual concept slides tungkol sa features ng app (AI/C# validation, Offline sovereignty, meal planners) bago tuluyang mag-enroll ang user.
// 
// 2. PAANO GUMAGANA ANG MICRO-ANIMATIONS?
//    - Gumagamit ito ng custom `AnimatePresence` mula sa libong library na `motion/react`.
//    - Kapag ipinlano ng user na mag-slide pakanan (`ArrowRight`), sumasailalim ang lumang imahe sa fade-out crawl effect habang sumisimula ang bagong visual presentation upang mapanatili ang premium "native-grade feel" ng presentation.
// ============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

const SLIDES = [
  {
    title: "Break Limits",
    description: "Push past your boundaries with adaptive workout routines that adapt to your evolving strength.",
    image: "https://images.unsplash.com/photo-1616279969096-54b228f5f103?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Peak Form",
    description: "Perfect every movement with real-time biometric analysis and professional coaching cues.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Pure Data",
    description: "Monitor your physiological evolution with deep analytics and performance milestones.",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80"
  }
];

export default function OnboardingSlides({ onComplete }: { onComplete: () => void; key?: string }) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <button 
        onClick={onComplete}
        className="absolute top-8 right-8 z-50 text-white/40 hover:text-white font-black uppercase tracking-[0.2em] italic text-xs transition-colors flex items-center gap-2 group"
      >
        Skip <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0"
        >
          {/* HUD Elements */}
          <div className="absolute inset-0 z-20 pointer-events-none p-8 md:p-12 overflow-hidden">
          </div>
          <motion.div 
            className="absolute inset-0 z-0"
            animate={{ 
              scale: [1, 1.15, 1],
              x: [0, -20, 0],
              y: [0, -10, 0]
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <img 
              src={SLIDES[current].image} 
              alt="" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          {/* Tech Overlays - minimal for maximum background visibility */}
          <div className="absolute inset-0 bg-black/5 z-[1]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_60%,_rgba(0,0,0,0.4)_100%)] z-[2]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-[3]" />
          
          {/* Animated Scanline Overlay */}
          <div className="absolute inset-0 z-[4] pointer-events-none opacity-[0.03] overflow-hidden">
            <motion.div 
              animate={{ y: ["0%", "100%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-full h-[50%] bg-gradient-to-b from-transparent via-white to-transparent"
            />
          </div>
          
          <div className="absolute inset-x-0 bottom-0 p-8 pb-12 md:pb-24 md:p-24 w-full max-w-7xl mx-auto flex flex-col justify-end z-10">
            <div className="relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100px" }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="h-1 bg-lime-500 mb-8"
              />
              <motion.h2 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                className="text-6xl md:text-[10rem] font-black text-white mb-6 leading-[0.85] tracking-tighter uppercase italic drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              >
                {SLIDES[current].title.split(' ').map((word, i) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </motion.h2>
            </div>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/50 text-xl md:text-3xl leading-tight mb-16 font-black uppercase italic tracking-tight max-w-3xl"
            >
              {SLIDES[current].description}
            </motion.p>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {SLIDES.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      i === current ? "w-12 bg-lime-500" : "w-4 bg-white/10"
                    )} 
                  />
                ))}
              </div>
              
              <button 
                onClick={next}
                className="w-20 h-20 bg-lime-500 rounded-full flex items-center justify-center text-black shadow-[0_20px_40px_rgba(132,204,22,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 group"
              >
                <ArrowRight className="w-10 h-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
