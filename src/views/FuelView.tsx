import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Apple } from 'lucide-react';
import { UserProfile } from '../types';

export default function FuelView({ onBack, profile }: { onBack: () => void; profile?: UserProfile | null; key?: string }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#050A0E] text-white relative font-sans overflow-x-hidden select-none">
      {/* Background glow shadow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-lime-500/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Container */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 md:py-8 flex flex-col z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col space-y-6"
        >
          {/* HEADER BAR */}
          <div id="fuel-header" className="flex justify-between items-center bg-[#0b1016]/80 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
            <button 
              id="fuel-back-btn"
              type="button" 
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 cursor-pointer transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h1 id="fuel-title" className="text-sm font-black tracking-[0.2em] uppercase text-white font-mono">Fuel</h1>
            <div id="fuel-icon-wrap" className="w-9 h-9 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400">
              <Apple size={16} />
            </div>
          </div>

          {/* EMPTY CONTENT PANEL */}
          <div id="fuel-empty-panel" className="bg-[#0b1016]/40 border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 min-h-[350px]">
            <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20">
              <Apple className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white/50 tracking-wider uppercase font-mono">No Content</h3>
              <p className="text-xs text-white/30 max-w-[240px] leading-relaxed">
                This tab is currently empty.
              </p>
            </div>
            <button
              id="fuel-back-home-btn"
              onClick={onBack}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
            >
              Go Back to Dashboard
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
