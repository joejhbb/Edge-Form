// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (WARMUPVIEW.TSX):
// 
// 1. STRETCHING AND PREPARATION STATION (Preventing injury):
//    - Nagbibigay ng custom joint flexing stretching guidance bago simulan ang high-impact biomechanical webcam session.
// 
// 2. PAANO GUMAGANA ANG TIMER SEQUENCE?
//    - Ang timer ay gumagamit ng modular `useEffect` setup upang pamahalaan ang real-time seconds ticking.
//    - Kapag natapos ang nakatakdang stretching activity (gaya ng "Knee Flexion Preparations"), awtomatikong isinesave nito ang `edgeform_warmed_up` token flag sa browser local database, upang hindi na pilitin ng application ang user na mag-warmup ulit sa susunod na workout session sa parehong araw.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Play, 
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Award,
  Settings,
  X,
  Search,
  Clock,
  Flame,
  Shield,
  LayoutGrid,
  ChevronRight,
  Dumbbell
} from 'lucide-react';
import { audioSynth } from '../lib/audioSynth';
import { ExerciseType, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface WarmupViewProps {
  key?: string;
  onBack: () => void;
  onStartWarmup: (routineType: string) => void;
  userProfile?: UserProfile | null;
  selectedExercise?: ExerciseType | null;
}

interface WarmupDrillDetail {
  id: string;
  category: string;
  name: string;
  duration: number; // in seconds
  description: string;
  image: string;
  video: string;
  steps: string[];
}

const WARMUP_CATEGORIES = [
  { id: 'legs', name: 'Squat Mobility', count: 3, icon: <Activity className="w-5 h-5" />, targets: 'Hips, Knees, Ankles' },
  { id: 'chest', name: 'Plank & Upper Body', count: 3, icon: <Dumbbell className="w-5 h-5" />, targets: 'Shoulders, Wrists, Core' },
];

const WARMUP_DRILLS: WarmupDrillDetail[] = [
  // LEGS (Squat)
  {
    id: 'ankle_mobility',
    category: 'legs',
    name: 'Ankle Mobility Flow',
    duration: 30,
    description: 'Keep heel flat on ground. Push knee forward dynamically over center toes to maximize ankle range of motion.',
    image: 'src/assets/images/ankle (2).png',
    video: "src/assets/videos/ankle mobility flow.mp4",
    steps: [
      "Press your heel firmly down into the ground.",
      "Drive your knee directly forward over center toes to maximize range.",
      "Slowly rock back and forth to lubricate deep tendons."
    ]
  },
  {
    id: 'hip_circles',
    category: 'legs',
    name: 'Hip Joint Circles',
    duration: 30,
    description: 'Place hands on hips and trace spacious circles to lubricate pelvic bone sockets and release lower back stiffness.',
    image: 'src/assets/images/hipc.png',
    video: "src/assets/videos/hip.mp4",
    steps: [
      "Place hands securely on your pelvic waistline.",
      "Trace wide outward circular patterns counter-clockwise.",
      "Keep core lightly braced and reverse direction halfway."
    ]
  },
  {
    id: 'jumping_jacks_warmup',
    category: 'legs',
    name: 'Jumping Jacks',
    duration: 40,
    description: 'An explosive full-body movement to raise your heart rate, warm up your lower limb fast, and increase blood circulation.',
    image: 'src/assets/images/jumpingjacks.png',
    video: "src/assets/videos/jumping jacks.mp4",
    steps: [
      "Stand with your feet together and your arms at your sides.",
      "Jump your feet out to the sides while raising your arms above your head.",
      "Immediately jump back to the starting position and repeat fluidly."
    ]
  },
  
  // CHEST (Plank & Upper Body)
  {
    id: 'wrist_rolls',
    category: 'chest',
    name: 'Wrist Joint Circles',
    duration: 30,
    description: 'Interlock fingers and rotate wrists in smooth circles. Preps joint pads for push loads.',
    image: 'src/assets/images/circlewrist.png',
    video: "src/assets/videos/circle wrist.mp4",
    steps: [
      "Interlock your fingers and bring palms together.",
      "Rotate wrists in smooth, continuous circles.",
      "Reverse rotation direction every 10 seconds to ease tight tendons."
    ]
  },
  {
    id: 'scapular_glides',
    category: 'chest',
    name: 'Scapular Glides',
    duration: 30,
    description: 'Retract and pinch shoulder blades back with straight arms to enable complete posture extension.',
    image: 'src/assets/images/scapular.png',
    video: "src/assets/videos/Scapular Glides.mp4",
    steps: [
      "Support hands against a wall, bench or floor with straight arms.",
      "Retract and pinch shoulder blades back with absolute control.",
      "Press away to expand shoulder blades, rounding the upper back slightly."
    ]
  },
  {
    id: 'cat_cow_warmup',
    category: 'chest',
    name: 'Cat Cow Pose',
    duration: 45,
    description: 'Alternating between arching and rounding your spine to release upper body tension, mobilize the vertebrae, and warm up the neck/core.',
    image: 'src/assets/images/catcow.png',
    video: "src/assets/videos/cat cow .mp4",
    steps: [
      "Start on your hands and knees in a tabletop position.",
      "Inhale, drop your belly, and look up to lift your chest and tailbone (Cow).",
      "Exhale, round your spine toward the ceiling, tucking your chin and tailbone (Cat)."
    ]
  }
];

export default function WarmupView({ 
  onBack, 
  onStartWarmup, 
  userProfile, 
  selectedExercise 
}: WarmupViewProps) {

  const getScheduledExerciseForToday = (): ExerciseType => {
    const day = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
    const schedule: ExerciseType[] = [
      'pushup',        // Sunday
      'pushup',        // Monday
      'squat',         // Tuesday
      'pushup',        // Wednesday
      'squat',         // Thursday
      'pushup',        // Friday
      'squat'          // Saturday
    ];
    return schedule[day];
  };

  const getCategoryForExercise = (ex: string | null | undefined): string => {
    if (!ex) {
      const day = new Date().getDay();
      const mappings = ['chest', 'chest', 'legs', 'chest', 'legs', 'chest', 'legs'];
      return mappings[day] || 'legs';
    }
    const slug = ex.toLowerCase();
    if (slug === 'squat' || slug === 'performance_squat' || slug === 'reverse_lunge' || slug === 'glute_bridge' || slug === 'goblet_squat' || slug === 'romanian_deadlift' || slug === 'legs') return 'legs';
    return 'chest';
  };

  const todayExercise = useMemo(() => getScheduledExerciseForToday(), []);
  
  const getInitialCategory = () => {
    const stored = localStorage.getItem('warmup_exercise_val');
    if (stored) {
      localStorage.removeItem('warmup_exercise_val');
      return getCategoryForExercise(stored);
    }
    return getCategoryForExercise(selectedExercise || todayExercise);
  };

  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory());
  const [selectedDrill, setSelectedDrill] = useState<WarmupDrillDetail | null>(null);

  // Filtered drills based on currently selected category
  const filteredDrills = useMemo(() => {
    return WARMUP_DRILLS.filter(dr => dr.category === selectedCategory);
  }, [selectedCategory]);

  const [fuelVal, setFuelVal] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [goalVal, setGoalVal] = useState<string>('muscle_gain');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Custom Warmup states for the active player
  const [hasStartedWarmup, setHasStartedWarmup] = useState(false);
  const [warmupCompleted, setWarmupCompleted] = useState(false);

  // HTML5 Video Support and tracking variables
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(30);
  const [isRunning, setIsRunning] = useState(false);

  // Sync initial timer when active drill changes
  useEffect(() => {
    if (selectedDrill) {
      setTimeLeft(selectedDrill.duration);
      setIsRunning(false);
      setHasStartedWarmup(false);
      setWarmupCompleted(false);
    }
  }, [selectedDrill]);

  // Sync state if selectedExercise changes externally
  useEffect(() => {
    const stored = localStorage.getItem('warmup_exercise_val');
    if (stored) {
      localStorage.removeItem('warmup_exercise_val');
      setSelectedCategory(getCategoryForExercise(stored));
      return;
    }
    if (selectedExercise) {
      setSelectedCategory(getCategoryForExercise(selectedExercise));
    }
  }, [selectedExercise]);

  // Sync state if userProfile exists
  useEffect(() => {
    if (userProfile) {
      const profileLevel = userProfile.activityLevel;
      if (profileLevel === 'beginner') {
        setFuelVal('low');
      } else if (profileLevel === 'intermediate') {
        setFuelVal('moderate');
      } else {
        setFuelVal('high');
      }
      setGoalVal(userProfile.goal);
    }
  }, [userProfile]);

  // Playback Toggle Control
  const togglePlayVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        setIsRunning(false);
      } else {
        setHasStartedWarmup(true);
        setIsRunning(true);
      }
    }
  };

  // Sync video play states to timer running state
  useEffect(() => {
    if (videoRef.current) {
      if (isRunning) {
        videoRef.current.play().then(() => {
          setIsVideoPlaying(true);
        }).catch((e) => {
          console.warn("Play blocked:", e);
          setIsVideoPlaying(false);
        });
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  }, [isRunning, selectedDrill]);

  // Timer Core Hook with sound cue trigger
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            try {
              audioSynth.init();
              audioSynth.playRepComplete(); // sound chime
            } catch (e) {}
            
            // Advance to next drill in the category if any, or trigger completion
            const currentDrillIndex = filteredDrills.findIndex(d => d.id === selectedDrill?.id);
            if (currentDrillIndex !== -1 && currentDrillIndex < filteredDrills.length - 1) {
              const nextDrill = filteredDrills[currentDrillIndex + 1];
              setSelectedDrill(nextDrill);
              return nextDrill.duration;
            } else {
              setIsRunning(false);
              setWarmupCompleted(true);
              localStorage.setItem('edgeform_warmed_up', 'true');
              return 0;
            }
          }
          // Tick sound effect on low 3 seconds
          if (prev <= 4) {
            try {
              audioSynth.init();
              audioSynth.playCountdown();
            } catch (e) {}
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, selectedDrill, filteredDrills]);

  // Formatter for Clock Display (00:00 style)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = daysOfWeek[new Date().getDay()];

  // If a drill is selected, render the beautifully crafted video tutorial & timer walkthrough screen!
  if (selectedDrill) {
    const currentCategoryDrills = filteredDrills;
    const currentDrillIndex = currentCategoryDrills.findIndex(d => d.id === selectedDrill.id);

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex flex-col min-h-screen bg-[#050A0E] text-[#E2E8F0] font-sans"
      >
        <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col justify-between">
          
          {/* Top Header / Navigation Layer */}
          <div className="flex items-center justify-between pt-1 h-8 shrink-0">
            <button 
              onClick={() => {
                setIsRunning(false);
                setSelectedDrill(null);
              }} 
              className="flex items-center gap-1.5 text-xs font-black text-white/70 hover:text-white transition-colors"
              id="btn-warmup-back-to-hub"
            >
              <span className="text-[10px] leading-none transform translate-y-[-0.5px]">◀</span>
              Warm-up Hub
            </button>

            <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-[0.15em] bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 animate-pulse">
              Active Session
            </span>

            <button
              onClick={() => setShowConfigModal(true)}
              className="w-7 h-7 bg-white/5 hover:bg-white/15 rounded-lg border border-white/10 flex items-center justify-center transition-all"
              id="btn-warmup-tune-settings"
              title="Configure Parameters"
            >
              <Settings className="w-3.5 h-3.5 text-white/60 hover:text-white" />
            </button>
          </div>

          {/* Big Athletic Centered Header */}
          <div className="text-center py-1 flex flex-col gap-0.5 shrink-0">
            <span className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">
              INTERACTIVE WARM-UP
            </span>
            <h1 className="text-2xl font-black text-white italic tracking-tight uppercase leading-none">
              {selectedDrill.name}
            </h1>
            <p className="text-[10px] text-white/40 leading-tight font-medium max-w-[280px] mx-auto line-clamp-2 mt-1">
              {selectedDrill.description}
            </p>
          </div>

          {/* Drill Navigation Tabs at Top of Video */}
          <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none justify-start md:justify-center shrink-0">
            {currentCategoryDrills.map((drill, idx) => {
              const isSelected = selectedDrill.id === drill.id;
              return (
                <button
                  key={drill.id}
                  onClick={() => {
                    if (hasStartedWarmup) return; 
                    setSelectedDrill(drill);
                    try {
                      audioSynth.init();
                      audioSynth.playCountdown();
                    } catch (e) {}
                  }}
                  disabled={hasStartedWarmup}
                  className={`py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 border ${
                    isSelected 
                      ? "bg-white text-black border-white shadow-md font-extrabold" 
                      : hasStartedWarmup
                        ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                        : "bg-white/10 text-white/70 border-white/10 hover:bg-white/15"
                  }`}
                  id={`tab-drill-mockup-${idx}`}
                >
                  {drill.name}
                </button>
              );
            })}
          </div>

          {/* Demonstration Clip Frame Grid */}
          <div className="flex-1 min-h-[160px] flex flex-col gap-2 overflow-hidden py-1 justify-center">
            <div 
              onClick={togglePlayVideo}
              className="relative flex-1 bg-[#070D13] rounded-3xl border border-white/15 overflow-hidden flex items-center justify-center group shadow-xl cursor-pointer min-h-0"
            >
              <video
                ref={videoRef}
                key={selectedDrill.id}
                src={selectedDrill.video}
                className="absolute inset-0 w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
                autoPlay
                loop
                muted
                playsInline
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onLoadedMetadata={(e) => {
                  setVideoDuration(e.currentTarget.duration || 15);
                }}
                onTimeUpdate={(e) => {
                  setVideoCurrentTime(e.currentTarget.currentTime || 0);
                }}
              />

              <div className="absolute inset-0 pointer-events-none opacity-10">
                <svg className="w-full h-full text-white" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="0.75" />
                  <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="0.75" />
                </svg>
              </div>

              <div className="absolute inset-0 border-2 border-white/5 group-hover:border-amber-500/30 transition-colors pointer-events-none" />

              {/* Pulsing Red DEMO Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded-md border border-white/10 text-[8px] font-black tracking-widest text-red-500 uppercase z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                DEMO VIDEO
              </div>

              {/* Quality badge */}
              <div className="absolute top-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded-md border border-white/10 text-[7px] font-mono font-bold text-white/50 uppercase z-20">
                {isVideoPlaying ? "PLAYING" : "PAUSED"} • LOOP
              </div>

              {/* Play/Pause overlay icon */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                  {isVideoPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-amber-500 fill-amber-500/20 translate-x-0.5" />
                  )}
                </div>
              </div>

              {/* Video Timeline Slider */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 z-20">
                <div 
                  className="h-full bg-amber-500 relative transition-all duration-100"
                  style={{ width: `${videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-md" />
                </div>
              </div>

              {/* Duration info */}
              <div className="absolute bottom-3 right-2.5 bg-black/80 px-2 py-0.5 rounded border border-white/10 text-[7.5px] font-mono text-amber-400 font-bold z-20">
                {videoDuration > 0 
                  ? `${Math.floor(videoCurrentTime / 60)}:${Math.floor(videoCurrentTime % 60).toString().padStart(2, '0')} / ${Math.floor(videoDuration / 60)}:${Math.floor(videoDuration % 60).toString().padStart(2, '0')}`
                  : `${timeLeft}s`
                }
              </div>

              <div className="absolute bottom-3 left-2.5 text-[7.5px] font-mono text-white/40 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded border border-white/10 z-20">
                <span>🖵 TAP TO PAUSE</span>
              </div>
            </div>

            {/* Step instructions */}
            <div className="flex flex-col min-w-0 px-2 bg-white/5 border border-white/5 rounded-2xl p-3">
              <span className="text-[8.5px] font-black text-amber-500 tracking-widest uppercase mb-1 block">
                STEP-BY-STEP INSTRUCTIONS
              </span>
              <div className="space-y-1 max-h-[50px] overflow-y-auto scrollbar-none">
                {selectedDrill.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-1.5 items-start text-[10px]">
                    <span className="font-extrabold text-amber-400 w-3 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <p className="text-white/70 font-semibold leading-normal">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Warm-Up Timer Box */}
          <div className="bg-[#0A0F14]/60 rounded-3xl border border-white/5 p-3 flex flex-col items-center justify-center gap-1 relative h-20 mb-3">
            <div className="w-full flex items-center justify-between px-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/60">
                <Clock size={16} className="text-amber-500" />
              </div>

              <div className="text-center flex flex-col justify-center">
                <span className="text-3xl font-black text-white tracking-tighter leading-none tabular-nums italic">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-0.5">
                  TIME REMAINING
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTimeLeft(selectedDrill.duration);
                    setIsRunning(false);
                  }}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 text-white/50 active:scale-95 transition-all"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setIsRunning(!isRunning);
                    try {
                      audioSynth.init();
                      audioSynth.playStartWorkout();
                    } catch (e) {}
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border transition-all shadow-lg",
                    isRunning 
                      ? "bg-[#D97706]/20 text-[#F59E0B] border-[#D97706]/40 hover:bg-[#D97706]/35" 
                      : "bg-white text-black border-white hover:bg-neutral-200"
                  )}
                >
                  {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Bottom Control Suite */}
          <div className="space-y-2">
            {!hasStartedWarmup ? (
              <button 
                onClick={() => {
                  try {
                    audioSynth.init();
                    audioSynth.playStartWorkout();
                  } catch (e) {}
                  setHasStartedWarmup(true);
                  setIsRunning(true);
                }}
                className="w-full py-3.5 bg-amber-500 text-black text-center font-black uppercase tracking-widest rounded-2xl border-2 border-amber-500 shadow-[0_4px_25px_rgba(245,158,11,0.25)] hover:bg-[#f59e0b]/90 hover:border-[#f59e0b]/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs"
                id="btn-warmup-start-warmup"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Warmup
              </button>
            ) : warmupCompleted ? (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setSelectedDrill(null);
                  }}
                  className="py-3.5 bg-white/5 text-white/80 text-center font-black uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 text-xs transition-all"
                >
                  Back To Hub
                </button>
                <button 
                  onClick={() => {
                    try {
                      audioSynth.init();
                      audioSynth.playStartWorkout();
                    } catch (e) {}
                    onStartWarmup('active');
                  }}
                  className="py-3.5 bg-amber-500 text-black text-center font-black uppercase tracking-widest rounded-2xl border-2 border-amber-500 shadow-[0_4px_30px_rgba(245,158,11,0.45)] hover:bg-amber-400 hover:border-amber-400 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 text-xs animate-bounce"
                  id="btn-warmup-start-workout-ready"
                >
                  Begin Workout 🚀
                </button>
              </div>
            ) : (
              <div className="w-full flex gap-3">
                <button 
                  onClick={() => {
                    setIsRunning(false);
                    setSelectedDrill(null);
                  }}
                  className="flex-1 py-3 bg-white/5 text-white border border-white/10 hover:bg-white/10 text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
                >
                  Back To Hub
                </button>
                <button 
                  onClick={() => {
                    setIsRunning(!isRunning);
                  }}
                  className={cn(
                    "flex-[2] py-3 text-center text-xs font-black uppercase tracking-wider rounded-2xl border transition-all",
                    isRunning 
                      ? "bg-white/10 text-white border-white/20 hover:bg-white/15" 
                      : "bg-amber-500 text-black border-amber-500 hover:bg-amber-400 animate-pulse"
                  )}
                >
                  {isRunning ? "Pause Session" : "Resume Session"}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Configuration settings modal */}
        {showConfigModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0C1217] rounded-3xl border border-white/10 p-5 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-white/30 tracking-widest uppercase flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  COACHING COEFFICIENTS
                </span>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[10px] text-white/40 mb-4 uppercase tracking-widest font-medium">
                Customize profile variables:
              </p>

              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Baseline Objective</label>
                  <select 
                    value={goalVal} 
                    onChange={(e) => setGoalVal(e.target.value)}
                    className="bg-white/5 hover:bg-white/10 text-white/90 text-xs font-bold py-2 px-3 rounded-lg border border-white/10 outline-none cursor-pointer focus:border-white transition-colors"
                  >
                    <option value="muscle_gain" className="bg-[#0C0E10]">Muscle gain</option>
                    <option value="lose_weight" className="bg-[#0C0E10]">Lose weight</option>
                    <option value="stay_healthy" className="bg-[#0C0E10]">Stay healthy</option>
                    <option value="improve_endurance" className="bg-[#0C0E10]">Improve endurance</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full mt-5 py-2.5 bg-white text-black text-center text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-all"
              >
                Apply Parameters
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // WARM-UP HUB VIEW: Styled EXACTLY like ExerciseSelect (Exercise Hub)!
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }} 
      className="min-h-screen bg-[#050A0E] text-white flex flex-col"
    >
      {/* Sticky Header styled identically to ExerciseSelect */}
      <header className="px-6 py-8 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#050A0E]/80 backdrop-blur-md z-30">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="text-center flex-1">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-1">SYSTEM_SELECTION</p>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Warm-up Hub</h1>
        </div>
        <div className="w-12 h-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 lg:p-12 scroll-smooth">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div 
              key="warmups"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Category Scroller identical to ExerciseSelect */}
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
                {WARMUP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-4 px-6 py-4 rounded-[2rem] border transition-all duration-300",
                      selectedCategory === cat.id 
                        ? "bg-white text-black border-white shadow-xl" 
                        : "bg-white/5 text-white/40 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedCategory === cat.id ? "bg-black/10" : "bg-white/5")}>
                      {cat.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{cat.name}</p>
                      <p className="text-xs font-black">{cat.count} PRESCRIBED</p>
                      <p className={cn(
                        "text-[9px] font-bold mt-0.5 uppercase tracking-wide",
                        selectedCategory === cat.id ? "text-black/60" : "text-amber-400"
                      )}>
                        {cat.targets}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Drills Grid matching ExerciseSelect */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredDrills.map((ex, i) => (
                  <motion.div 
                    key={ex.id} 
                    initial={{ y: 20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedDrill(ex)}
                    className="group relative cursor-pointer"
                  >
                    <div className="relative flex flex-col rounded-[2.5rem] overflow-hidden border-2 border-white/5 bg-[#070D13] shadow-2xl transition-all duration-500 hover:border-amber-500/20 h-[450px]">
                      
                      {/* Cover Image Container */}
                      <div className="relative h-56 w-full overflow-hidden bg-black/40 border-b border-white/5 shrink-0">
                        <img 
                          src={ex.image} 
                          alt={ex.name} 
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-1000 grayscale group-hover:grayscale-0" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-amber-500/95 flex items-center justify-center text-black shadow-lg shadow-amber-500/20 scale-90 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 p-6 flex flex-col justify-between bg-[#0A0F14]/60">
                        <div className="space-y-2">
                          <span className="text-amber-500 text-[9px] font-black uppercase tracking-[0.26em] italic block">
                            REGULATED MOBILITY DRILL
                          </span>
                          <h3 className="text-xl font-black text-white italic tracking-tighter leading-none group-hover:text-amber-500 transition-colors uppercase">
                            {ex.name}
                          </h3>
                          <p className="text-xs text-white/40 leading-relaxed font-semibold pt-1 line-clamp-3 group-hover:text-white/70 transition-colors">
                            {ex.description}
                          </p>
                        </div>

                        {/* Standardised metrics footer */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-white/50 bg-white/5 px-2.5 py-1 rounded-lg">
                              <Clock size={12} className="text-white/40" />
                              <span className="text-[9px] font-black uppercase tracking-wider">{ex.duration}s</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/50 bg-white/5 px-2.5 py-1 rounded-lg">
                              <Zap size={12} className="text-amber-500" />
                              <span className="text-[9px] font-black uppercase tracking-wider">Mobility</span>
                            </div>
                          </div>
                          
                          <div className="w-11 h-11 bg-white text-black rounded-xl flex items-center justify-center group-hover:bg-amber-500 transition-colors shadow-lg shadow-black/20 shrink-0">
                            <ChevronRight size={22} />
                          </div>
                        </div>
                        
                      </div>

                    </div>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
