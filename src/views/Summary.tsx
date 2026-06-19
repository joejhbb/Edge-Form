// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (SUMMARY.TSX):
// 
// 1. SESSION METRIC PRESENTATION PANEL (Success Hub):
//    - Ang `Summary.tsx` ay sumasalubong sa user pabalik pagkatapos ng workout. Ipinapakita nito ang real-time accomplishments ng kakatapos lang na program.
// 
// 2. PAANO GUMAGANA ANG HISTOGRAM METAL REVIEWS?
//    - Tinatanggap nito ang `reps` at `score` (biomechanical performance percentage) mula sa `WorkoutView`.
//    - Nagpapasabog ito ng celebratory confetti particle showers (`canvas-confetti`) sa loob ng 3 segundo upang madagdagan ang endorphins o motivation factor ng mag-aaral o atleta!
// ============================================================================

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Flame, Activity, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Summary({ 
  reps = 12, 
  score = 92, 
  exercise = 'Exercise',
  onHome = () => {} 
}: { reps?: number, score?: number, exercise?: string, onHome?: () => void, key?: string }) {
  useEffect(() => {
    // Fire a burst of confetti
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#050A0E] flex items-center justify-center p-6">
      <div className="bg-[#070D13] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-lime-500 rounded-3xl flex items-center justify-center mb-8 rotate-12">
            <Trophy className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-4xl font-black text-white text-center mb-2 uppercase italic">Workout Complete!</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest mb-12">{exercise}</p>

          <div className={`grid ${exercise.toLowerCase().includes('plank') ? 'grid-cols-2' : 'grid-cols-3'} gap-6 w-full mb-12`}>
            <div className="p-6 rounded-3xl bg-white/5 flex flex-col items-center">
              <Activity className="w-6 h-6 text-lime-500 mb-2" />
              <p className="text-2xl font-black">{reps}{exercise.toLowerCase().includes('plank') ? 's' : ''}</p>
              <p className="text-[10px] uppercase font-bold opacity-40">{exercise.toLowerCase().includes('plank') ? 'Duration' : 'Reps'}</p>
            </div>
            {!exercise.toLowerCase().includes('plank') && (
              <div className="p-6 rounded-3xl bg-white/5 flex flex-col items-center">
                <Target className="w-6 h-6 text-lime-500 mb-2" />
                <p className="text-2xl font-black">{score}%</p>
                <p className="text-[10px] uppercase font-bold opacity-40">Form</p>
              </div>
            )}
            <div className="p-6 rounded-3xl bg-white/5 flex flex-col items-center">
              <Flame className="w-6 h-6 text-orange-500 mb-2" />
              <p className="text-2xl font-black">{exercise.toLowerCase().includes('plank') ? Math.round(reps * 0.15) : reps * 2}</p>
              <p className="text-[10px] uppercase font-bold opacity-40">Kcal</p>
            </div>
          </div>

          <button onClick={onHome} className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase italic tracking-widest flex items-center justify-center gap-2">
            Back to Home <ChevronRight size={18} />
          </button>
      </div>
    </motion.div>
  );
}
