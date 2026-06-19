// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (PROGRESSVIEW.TSX):
// 
// 1. BIOMETRIC DATA DESK (Simplified & Connected Edition):
//    - Ang `ProgressView.tsx` na ito ay binago upang maging napakasimple at madaling intindihin.
//    - Direktang nakakonekta ito sa mga totoong nagawang workout at warm-up status ng user mula sa storage.
//    - Ipinapakita rin nito ang active fire streaks at profile info nang walang kalat o kumplikadong tsart.
// ============================================================================

import React, { useState, useEffect } from 'react'; // I-import ang core React at state hooks para sa data lifecycle.
import { UserProfile } from '../types.ts'; // I-import ang custom type definition para sa Profile.
import { 
  ChevronLeft, // Icon para sa pag-back sa dashboard.
  User, // Icon para sa Profile profile compartment.
  Activity, // Icon para sa live exercises.
  Flame, // Icon para sa streak hot score.
  Trophy, // Icon para sa highscore at premyo.
  Clock, // Icon para sa timestamp trackers.
  CheckCircle2, // Icon kapag nakumpleto ang target.
  Zap, // Icon para sa mabilisang feedback.
  AlertCircle // Icon kapag may pending task.
} from 'lucide-react'; // Kumuha ng functional at malilinis na vector icons mula sa Lucide library.
import { audioSynth } from '../lib/audioSynth.ts'; // Katulong na Class para magpatunog ng dynamic coach audio prompts.

// Interface configuration para sa mga parameter (Props) na tinatanggap ng component.
interface ProgressViewProps {
  onBack: () => void; // Function callback upang makabalik sa front panel.
  profile?: UserProfile | null; // Ang kasalukuyang profile data ng user.
  key?: string; // Optional na susi o key identifier na kinakailangan ng React virtual DOM.
}

// Interface para sa mga item na ipapakita sa workout activity list.
interface WorkoutHistoryItem {
  d: string; // Day abbreviation (e.g., M, T, W).
  v: number; // Posture precision score (0-100%).
  reps: number; // Bilang ng repetitions na nagawa.
  timestamp: number; // Eksaktong oras sa milliseconds kung kailan natapos ang sesyon.
  exercise: string; // Uri ng ehersisyo (e.g. performance_squat).
}

export default function ProgressView({ onBack, profile }: ProgressViewProps) {
  // Siyasatin ang email key ng gumagamit upang makagawa ng tumpak na local database query.
  const emailKey = profile?.email?.toLowerCase().trim() || 'default';

  // State para sa nakuhang cumulative list ng workouts mula sa local storage.
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  
  // State para sa indicator kung completed o hindi ang warm-up ngayong araw.
  const [isWarmedUp, setIsWarmedUp] = useState<boolean>(false);

  // State para sa streak o tuloy-tuloy na araw ng pag-workout ng atleta.
  const [activeStreak, setActiveStreak] = useState<number>(0);

  // State kung nakapag-claim na ng streak score ang user para sa kasalukuyang araw.
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(() => {
    try {
      const lastCheckIn = localStorage.getItem(`edgeform_last_checkin_date_${emailKey}`); // Alamin mula sa cookie cache.
      return lastCheckIn === new Date().toDateString(); // Ihambing kung ang huling checkin date ay tugma sa araw na ito.
    } catch {
      return false; // Fallback kapag walang nahanap.
    }
  });

  // State para sa notification message o virtual trophy reward popup.
  const [rewardsToast, setRewardsToast] = useState<string | null>(null);

  // Hook upang i-load ang lahat ng kailangang impormasyon pagka-bukas ng screen.
  useEffect(() => {
    // 1. Basahin ang warm-up status ng user gamit ang global browser item checker.
    const warmedUpStatus = localStorage.getItem('edgeform_warmed_up') === 'true';
    setIsWarmedUp(warmedUpStatus); // Itala ang nahanap na status sa React screen state.

    // 2. Basahin ang pinagsama-samang real-time workout logs ng user para sa exercises.
    try {
      const historyRaw = localStorage.getItem(`edgeform_workout_history_${emailKey}`);
      if (historyRaw) {
        const parsedHistory = JSON.parse(historyRaw); // I-convert ang raw text pabalik sa readable list array.
        if (Array.isArray(parsedHistory)) {
          setWorkoutHistory(parsedHistory); // I-save ang workout logs sa listahan.

          // Kalkulahin ang streak batay sa dami ng magkakaibang araw na may naitalang training sessions.
          const dates = parsedHistory.map((w: any) => new Date(w.timestamp).toDateString());
          const uniqueDates = Array.from(new Set(dates)); // Alisin ang duplicates upang malaman ang totoong unique days.
          setActiveStreak(uniqueDates.length || 0); // Isulat ang tumpak na bilang ng active days streak!
        }
      }
    } catch (e) {
      console.error("Hindi ma-parse ang workout history mula sa browser database:", e); // Ligtas na sabihan ang developer kapag nag-error.
    }
  }, [emailKey]); // Tatakbo kapag nagbago ang identifier ng user.

  // Katulong na formatter para ibahin ang string tungo sa magandang pamagat (e.g., performance_squat -> Performance Squat).
  const cleanExerciseName = (name: string) => {
    if (!name) return "Unknown Exercise"; // Handlers para sa empty variables.
    return name
      .replace(/_/g, ' ') // Palitan ang mga underscore ng space.
      .split(' ') // Hatiin ang salita.
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Gawing uppercase ang unang letra ng bawat salita.
      .join(' '); // Pagsamahin muli ang teksto.
  };

  // Katulong na function para makuha ang readable date at oras mula sa numerical timestamp.
  const formatWorkoutDate = (timestamp: number) => {
    try {
      const dateObj = new Date(timestamp); // Gumawa ng date object mula sa milliseconds.
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); // Ibalik ang format tulad ng "June 16, 05:41 PM".
    } catch {
      return "Kamakailan Lang"; // Fallback kapag sira ang timestamp parameter.
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050A0E] text-slate-100 flex flex-col font-sans select-none relative" id="progress-view-root">
      
      {/* Background ambient glowing effect sa itaas ng dashboard card layout */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#84cc16]/5 via-transparent to-transparent pointer-events-none" />

      {/* TOP COMPACT SCREEN HEADER */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#050A0E]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} // Ipalatog ang pagbabalik sa dashboard pag pinindot.
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 text-[#84cc16] hover:text-lime-300"
            id="back-btn"
            title="Go Back to Dashboard"
          >
            <ChevronLeft className="w-5 h-5 pointer-events-none" />
          </button>
          <div>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-[#84cc16]">Biometric Data Desk</h1>
            <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Personal Training Log, Streak &amp; Warm-up Hub</p>
          </div>
        </div>

        {/* Status indicator badge na naka-sync sa local space ng user */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-bold tracking-wider bg-black/40 px-3.5 py-1.5 rounded-full border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse" />
          <span>Desk Live Check</span>
        </div>
      </header>

      {/* MAIN SINGLE SCREEN CONTENT DESIGN */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6 relative z-10">
        
        {/* WELCOME SECTION AND USER BIO BRIEF */}
        <div className="bg-black/30 p-5 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[9px] font-black tracking-widest uppercase text-lime-500/80 block mb-0.5">Active Trainee Identity</span>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{profile?.name || "Fitness User"}</span>
              <span className="text-[10px] font-black px-2 py-0.5 bg-[#84cc16]/10 text-[#84cc16] rounded-full">
                {profile?.gender === 'female' ? '♀ Female' : '♂ Male'}
              </span>
            </h2>
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-wider mt-1">
              Age: {profile?.age || 25} yrs old &nbsp;●&nbsp; Target Goal: {cleanExerciseName(profile?.goal || "Stay Healthy")}
            </p>
          </div>

          {/* Symmetrical split showing crucial static parameters for metabolic scale */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6 shrink-0">
            <div>
              <span className="block text-sm font-black text-[#84cc16]">{profile?.weight || 70} Kg</span>
              <span className="text-[9.5px] text-white/45 uppercase font-mono tracking-wider font-bold">Weight Scale</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <span className="block text-sm font-black text-[#84cc16]">{profile?.height || 175} Cm</span>
              <span className="text-[9.5px] text-white/45 uppercase font-mono tracking-wider font-bold">Height Scale</span>
            </div>
          </div>
        </div>

        {/* THREE COLUMNS: WARMUP STATUS (LEFT), WORKOUT ACTIVITIES (MIDDLE), STREAKS & REWARDS (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ==========================================
              COLUMN 1: WARM-UP STATUS REPORT PANEL
              ========================================== */}
          <div className="bg-black/50 p-6 rounded-[2.2rem] border border-white/5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Daily Warm-up Status</span>
              </h3>
            </div>

            {/* Visual verification whether warm-up is done */}
            {isWarmedUp ? (
              // Green completed box layout
              <div className="bg-[#84cc16]/10 border border-[#84cc16]/20 p-5 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#84cc16]/20 flex items-center justify-center mx-auto text-[#84cc16]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Warm-up Secured!</h4>
                  <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed font-semibold">
                    You have successfully activated your muscles and joints with preparatory stretching today. Your body is ready for exercise!
                  </p>
                </div>
                <div className="text-[9px] font-mono font-bold uppercase text-[#84cc16] tracking-widest pt-1">
                  ✓ Ready for Action
                </div>
              </div>
            ) : (
              // Yellow pending warning box layout
              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider">Warm-up Pending</h4>
                  <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed font-semibold">
                    You haven&apos;t done any physical warm-up stretching routines yet today. It is recommended to warm up before starting heavy workouts to prevent potential knee or muscle pain.
                  </p>
                </div>
                <div className="text-[9px] font-mono font-bold uppercase text-amber-500 tracking-widest pt-1 animate-pulse">
                  ⚠️ Stretching Recommended
                </div>
              </div>
            )}

            {/* Quick action info badge */}
            <div className="bg-[#0C1217] p-3.5 rounded-xl border border-white/5 space-y-1.5">
              <span className="text-[8.5px] font-mono font-black text-white/30 uppercase tracking-wider block">Safety Guidelines</span>
              <p className="text-[10px] text-slate-400 leading-normal">
                Warming up correctly resets mechanical joint limits in our C# engine, helping achieve correct parallel squat lines and flat pushups.
              </p>
            </div>
          </div>

          {/* ==========================================
              COLUMN 2: WORKOUT RECORDS & REPS DONE
              ========================================== */}
          <div className="bg-black/50 p-6 rounded-[2.2rem] border border-white/5 lg:col-span-2 space-y-5">
            
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#84cc16]" />
                <span>Your Workout Sessions Done</span>
              </h3>
              
              {/* Dynamic counter indicating total finished exercises */}
              <span className="bg-[#84cc16]/10 px-3 py-1 rounded-full text-[9px] font-mono font-black text-[#84cc16]">
                {workoutHistory.length} SESSIONS LOGGED
              </span>
            </div>

            {/* Grid statistics showing sum total metrics gathered directly from the completed workouts list */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0C1217] p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest font-black block">Total Repetitions</span>
                <strong className="text-2xl font-black font-mono text-white block mt-1.5">
                  {workoutHistory.reduce((sum, item) => sum + (item.reps || 0), 0)} Reps
                </strong>
              </div>
              <div className="bg-[#0C1217] p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest font-black block">Average Accuracy</span>
                <strong className="text-2xl font-black font-mono text-[#84cc16] block mt-1.5">
                  {workoutHistory.length > 0 
                    ? Math.round(workoutHistory.reduce((sum, item) => sum + (item.v || 0), 0) / workoutHistory.length) 
                    : 0}%
                </strong>
              </div>
            </div>

            {/* List of actual workouts parsed from localStorage */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {workoutHistory.length === 0 ? (
                // Displays elegant card message when no sessions are completed yet
                <div className="bg-[#0C1217] p-10 rounded-2xl border border-white/5 text-center text-slate-400 space-y-2">
                  <span className="text-3xl">🏋️</span>
                  <h4 className="text-xs font-bold uppercase text-white tracking-wider">No Workouts Recorded Yet</h4>
                  <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                    Complete your first camera-guided exercise to record progress counters, accuracies, and reps!
                  </p>
                </div>
              ) : (
                // Iterate on workoutHistory list array from latest to pioneer
                [...workoutHistory].reverse().map((session, index) => (
                  <div 
                    key={index}
                    className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-[#84cc16]/20 transition-all shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      {/* Interactive round icon representer */}
                      <div className="w-10 h-10 rounded-full bg-[#11191d] flex items-center justify-center border border-[#84cc16]/20">
                        <Trophy className="w-4 h-4 text-[#84cc16]" />
                      </div>
                      <div>
                        <strong className="text-xs font-black uppercase text-white block leading-tight">
                          {cleanExerciseName(session.exercise)}
                        </strong>
                        <span className="text-[9px] font-mono text-white/30 font-semibold uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-white/35" />
                          {formatWorkoutDate(session.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#84cc16] tracking-tight block">
                        {session.reps} reps
                      </span>
                      <span className="text-[8.5px] font-mono text-white/40 block">
                        {session.v}% accuracy
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

        {/* ACTIVE STREAK SECTION & COMPLIANCE BOX - WIDE ROW AT BOTTOM */}
        <div className="relative bg-gradient-to-b from-[#1E0E05] via-[#0D0502] to-black rounded-3xl p-6 border border-orange-500/20 shadow-xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-5">
            {/* Glowing active fire icon representer */}
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/35 blur-xl rounded-full scale-125 animate-pulse" />
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center border-2 border-orange-400 relative z-10 shadow-md">
                <Flame className="w-7 h-7 text-white fill-yellow-400 animate-bounce" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-amber-400 uppercase leading-none">
                {activeStreak} DAYS SOVEREIGN STREAK
              </h3>
              <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest mt-1.5 leading-relaxed">
                Your consistency checking is fully active. Complete workouts daily to extend flame streak index.
              </p>
            </div>
          </div>

          {/* Symmetrical checking trigger button to manually claim daily spark reward */}
          <div className="w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                if (hasCheckedInToday) return; // Igat-lock kung tapos na pag-checkin.
                audioSynth.playRepComplete(); // Mag-play ng audio spark.
                const nextStreak = activeStreak + 1; // Itaas ang active streak count.
                setActiveStreak(nextStreak); // Itala sa state.
                setHasCheckedInToday(true); // Flag checked state as true.
                localStorage.setItem(`edgeform_last_checkin_date_${emailKey}`, new Date().toDateString()); // Isulat sa browser cookie storage.
                setRewardsToast("Daily check-in secured! Streak increased."); // Ipagmalaki sa toast panel.
                setTimeout(() => setRewardsToast(null), 3000); // Awto-laho pagkatapos ng tatlong segundo.
              }}
              disabled={hasCheckedInToday}
              className={`w-full md:w-auto py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border ${
                hasCheckedInToday 
                  ? 'bg-orange-600/10 border-orange-500/20 text-orange-400/80 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black border-yellow-300 active:scale-95'
              }`}
            >
              <span>{hasCheckedInToday ? "✓ Streak Spark Active Today" : "Claim Daily Streak (+1 Day)"}</span>
            </button>
          </div>
        </div>

      </main>

      {/* Global Success rewards notification badge overlay */}
      {rewardsToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] bg-[#070D13]/95 border border-amber-500/30 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-[0_10px_35px_rgba(245,158,11,0.2)] text-amber-400 animate-bounce">
          <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
          <div className="text-left font-sans text-xs">
            <span className="block font-black uppercase tracking-wider text-white">Reward Decal Unlocked!</span>
            <span className="text-white/60 text-[10.5px]">{rewardsToast}</span>
          </div>
        </div>
      )}

      {/* FOOTER SYSTEM CREDENTIALS */}
      <footer className="py-4 text-center border-t border-white/5 text-[9px] text-white/20 uppercase tracking-widest font-mono">
        EdgeForm Biometric Lab System ● Unified Diagnostic Hub Terminal
      </footer>

    </div>
  );
}
