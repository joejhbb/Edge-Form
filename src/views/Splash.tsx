// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (SPLASH.TSX):
// 
// 1. SPLASH SCREEN (Launcher Gate):
//    - Ang `Splash.tsx` ang kauna-unahang sumasalubong sa gumagamit kapag binuksan ang mobile-grade React page.
// 
// 2. PAANO GUMAGANA ANG REDIRECTION SYSTEM?
//    - Nagpapasimula ito ng isang `setTimeout` hook na tumatakbo nang perpektong 3 segundo.
//    - Habang naglo-load ang web layout, ang user ay nakakakita ng dynamic spinning vectors na nagpapakita ng high-performance at secure offline fitness concept.
//    - Pagkalipas ng timer, binubuksan nito ang root portal gate patungo sa onboarding o login page depende sa user cache availability!
// ============================================================================

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, ShieldCheck } from 'lucide-react';

export default function Splash({ onComplete }: { onComplete: () => void; key?: string }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-lime-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-lime-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-lime-500 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(132,204,22,0.3)] rotate-12">
          <Activity className="w-12 h-12 text-black" />
        </div>
        
        <h1 className="text-6xl font-black tracking-tighter text-white">
          Edge<span className="text-lime-500">Form</span>
        </h1>
        <p className="mt-4 text-slate-500 font-black tracking-[0.4em] uppercase text-xs">
          On-Device Biometric Coach
        </p>

        <div className="mt-12 flex gap-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold tracking-widest">
            <Zap className="w-4 h-4 text-lime-500" />
            REAL-TIME
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold tracking-widest">
            <ShieldCheck className="w-4 h-4 text-lime-500" />
            SECURE
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-12 w-64 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="w-full h-full bg-lime-500"
        />
      </div>
    </motion.div>
  );
}
