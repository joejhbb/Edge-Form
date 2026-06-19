import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Search, 
  Clock, 
  Flame, 
  Zap, 
  Shield,
  Activity,
  Play,
  LayoutGrid,
  ChevronRight,
  Dumbbell,
  Lock
} from 'lucide-react';
import { ExerciseType, UserProfile } from '../types';
import { cn } from '../lib/utils';
import legsImg from '../assets/images/legs_workout_png_1779787720371.png';
import chestImg from '../assets/images/chest_workout_png_1779787753054.png';
import squatImg from '../assets/images/squat.png';
import pushupImg from '../assets/images/pushup.png';

interface ExerciseSelectProps {
  onBack: () => void;
  onSelect: (ex: ExerciseType) => void;
  key?: string;
  userProfile?: UserProfile | null;
}

const WORKOUT_CATEGORIES = [
  { id: 'legs', name: 'Legs', count: 1, icon: <Activity className="w-5 h-5" />, targets: 'Glutes, Quads, Hamstrings' },
  { id: 'chest', name: 'Chest', count: 1, icon: <LayoutGrid className="w-5 h-5" />, targets: 'Chest Muscles' },
];

const EXERCISES: { id: ExerciseType, category: string, name: string, level: string, time: string, cals: string, image: string, description: string }[] = [
  // 1. LEGS
  { 
    id: 'performance_squat', 
    category: 'legs', 
    name: 'Performance Squat', 
    level: 'Beginner • No Equipment', 
    time: '10 min', 
    cals: '85 kcal', 
    image: squatImg,
    description: 'Bodyweight (No equipment). Side-view squat tracking knee & hip flexion. Keep heels flat to avoid uneven/lopsided tilt.'
  },

  // 2. CHEST
  { 
    id: 'military_pushup', 
    category: 'chest', 
    name: 'Military Push-up', 
    level: 'Beginner • No Equipment', 
    time: '10 min', 
    cals: '70 kcal', 
    image: pushupImg,
    description: 'Bodyweight (No equipment). Side profile push-up tracking arm/elbow flexion and straight spine alignment.'
  }
];

// Biomechanical science weight calculation based on exercise category, training scale & biological markers
function getWeightRecommendation(exId: string, level: 'beginner' | 'intermediate' | 'advanced', gender: 'male' | 'female' | 'other') {
  const isFemale = gender === 'female';
  
  switch (exId) {
    // 1. LEGS
    case 'goblet_squat':
      if (level === 'beginner') return { label: 'Single Dumbbell Goblet', weight: isFemale ? '4kg - 8kg' : '8kg - 12kg', tip: 'Focus on perfect upright chest form and proper squat depth.' };
      if (level === 'intermediate') return { label: 'Single Dumbbell Goblet', weight: isFemale ? '8kg - 14kg' : '14kg - 20kg', tip: 'Actively squeeze the dumbbell and push knees outward.' };
      return { label: 'Single Dumbbell Goblet', weight: isFemale ? '16kg - 24kg' : '22kg - 32kg', tip: 'Advanced loading. Accelerate up on each eccentric rep.' };

    case 'romanian_deadlift':
      if (level === 'beginner') return { label: 'Pair of Dumbbells', weight: isFemale ? '3kg - 6kg/hand' : '6kg - 10kg/hand', tip: 'Hinge hips straight backward keeping spine flat.' };
      if (level === 'intermediate') return { label: 'Pair of Dumbbells', weight: isFemale ? '7kg - 12kg/hand' : '12kg - 18kg/hand', tip: 'Feel tension in your hamstrings, not your lower back.' };
      return { label: 'Pair of Dumbbells', weight: isFemale ? '14kg - 22kg/hand' : '20kg - 30kg/hand', tip: 'Advanced loading. Squeeze glutes firmly at the apex.' };

    case 'dumbbell_glute_bridge':
      if (level === 'beginner') return { label: 'Single Dumbbell on Hips', weight: isFemale ? '4kg - 6kg' : '6kg - 10kg', tip: 'Hold the dumbbell securely on your pelvis with both hands.' };
      if (level === 'intermediate') return { label: 'Single Dumbbell on Hips', weight: isFemale ? '8kg - 12kg' : '12kg - 18kg', tip: 'Drive heels through the floor, holding 1s at top.' };
      return { label: 'Single Dumbbell on Hips', weight: isFemale ? '14kg - 22kg' : '20kg - 32kg', tip: 'Advanced hip thrusting load, prioritize complete pelvic extension.' };

    // 2. CHEST
    case 'floor_press':
      if (level === 'beginner') return { label: 'Pair of Dumbbells', weight: isFemale ? '2.5kg - 5kg/hand' : '5kg - 8kg/hand', tip: 'Gently touch elbows to floor without bouncing.' };
      if (level === 'intermediate') return { label: 'Pair of Dumbbells', weight: isFemale ? '6kg - 10kg/hand' : '10kg - 16kg/hand', tip: 'Control the descent, then press vertically with force.' };
      return { label: 'Pair of Dumbbells', weight: isFemale ? '12kg - 18kg/hand' : '18kg - 28kg/hand', tip: 'Drive heels down to stabilize shoulders on the floor.' };

    case 'chest_fly':
      if (level === 'beginner') return { label: 'Pair of Dumbbells', weight: isFemale ? '2kg - 4kg/hand' : '4kg - 6kg/hand', tip: 'Keep a slight bend in your elbow to shield joints.' };
      if (level === 'intermediate') return { label: 'Pair of Dumbbells', weight: isFemale ? '5kg - 8kg/hand' : '8kg - 12kg/hand', tip: 'Maintain slow 3-second negative pacing.' };
      return { label: 'Pair of Dumbbells', weight: isFemale ? '10kg - 14kg/hand' : '14kg - 20kg/hand', tip: 'Focus on full pectoral stretch without hyper-extending.' };

    // 3. CARDIO
    case 'step_ups':
      if (level === 'beginner') return { label: 'Pair of Dumbbells at Sides', weight: isFemale ? '2kg - 4kg/hand' : '4kg - 6kg/hand', tip: 'Place full foot on platform and step up with calf control.' };
      if (level === 'intermediate') return { label: 'Pair of Dumbbells at Sides', weight: isFemale ? '5kg - 8kg/hand' : '8kg - 12kg/hand', tip: 'Alternate lead legs gracefully with straight posture.' };
      return { label: 'Pair of Dumbbells at Sides', weight: isFemale ? '9kg - 14kg/hand' : '14kg - 22kg/hand', tip: 'Increase pace while prioritizing stable knee alignment.' };

    case 'dumbbell_thruster':
      if (level === 'beginner') return { label: 'Pair of Dumbbells', weight: isFemale ? '2kg - 4kg/hand' : '4kg - 6kg/hand', tip: 'Unify squat drive directly into shoulder press motion.' };
      if (level === 'intermediate') return { label: 'Pair of Dumbbells', weight: isFemale ? '5kg - 8kg/hand' : '8kg - 12kg/hand', tip: 'Breathe out hard at the top extension phase.' };
      return { label: 'Pair of Dumbbells', weight: isFemale ? '9kg - 14kg/hand' : '14kg - 22kg/hand', tip: 'Extremely high demand. Maintain flat heels throughout.' };

    // 4. ARMS
    case 'bicep_curl':
      if (level === 'beginner') return { label: 'Pair of Dumbbells', weight: isFemale ? '2kg - 4kg/hand' : '4kg - 6kg/hand', tip: 'Keep elbows strictly adjacent to ribs without swinging.' };
      if (level === 'intermediate') return { label: 'Pair of Dumbbells', weight: isFemale ? '5kg - 8kg/hand' : '8kg - 12kg/hand', tip: 'Rotate wrists outwards (supinate) at top of curl.' };
      return { label: 'Pair of Dumbbells', weight: isFemale ? '9kg - 14kg/hand' : '14kg - 20kg/hand', tip: 'Advanced isolation load. 3s eccentric negative step.' };

    case 'tricep_extension':
      if (level === 'beginner') return { label: 'Single Dumbbell Overhead', weight: isFemale ? '2kg - 4kg' : '4kg - 6kg', tip: 'Keep shoulders relaxed and elbows pointing forward.' };
      if (level === 'intermediate') return { label: 'Single Dumbbell Overhead', weight: isFemale ? '5kg - 8kg' : '8kg - 12kg', tip: 'Incorporate deep elbow bends for direct tricep stretch.' };
      return { label: 'Single Dumbbell Overhead', weight: isFemale ? '9kg - 14kg' : '14kg - 22kg', tip: 'Keep core tight to protect lumbar arching.' };

    // 5. CORE
    case 'russian_twist':
      if (level === 'beginner') return { label: 'Single Dumbbell at Chest', weight: isFemale ? '2kg - 4kg' : '4kg - 6kg', tip: 'Rotate shoulders fully from left to right side.' };
      if (level === 'intermediate') return { label: 'Single Dumbbell at Chest', weight: isFemale ? '5kg - 8kg' : '8kg - 12kg', tip: 'Lift feet off floor slightly for greater oblique load.' };
      return { label: 'Single Dumbbell at Chest', weight: isFemale ? '9kg - 12kg' : '12kg - 18kg', tip: 'Keep spine tall, rotate core slowly under load.' };

    case 'plank_pull_through':
      if (level === 'beginner') return { label: 'Single Dumbbell Underneath', weight: isFemale ? '2kg - 4kg' : '4kg - 6kg', tip: 'Keep hips dead parallel to the floor during pulls.' };
      if (level === 'intermediate') return { label: 'Single Dumbbell Underneath', weight: isFemale ? '5kg - 8kg' : '8kg - 12kg', tip: 'Minimize pelvic sway by contracting thighs hard.' };
      return { label: 'Single Dumbbell Underneath', weight: isFemale ? '9kg - 14kg' : '14kg - 20kg', tip: 'Slow the transition step to maximize anti-rotation power.' };

    // 6. BACK
    case 'bent_over_row':
      if (level === 'beginner') return { label: 'Pair of Dumbbells', weight: isFemale ? '3kg - 6kg/hand' : '6kg - 10kg/hand', tip: 'Pull elbow straight back directly to hips.' };
      if (level === 'intermediate') return { label: 'Pair of Dumbbells', weight: isFemale ? '7kg - 12kg/hand' : '12kg - 18kg/hand', tip: 'Keep knees bent slightly to support optimal spine hinge.' };
      return { label: 'Pair of Dumbbells', weight: isFemale ? '14kg - 22kg/hand' : '20kg - 30kg/hand', tip: 'Squeeze shoulder blades together fully for upper back.' };

    default:
      return null;
  }
}

export default function ExerciseSelect({ onBack, onSelect, userProfile }: ExerciseSelectProps) {
  // Automatically select category matching today's target focus
  const getTodayCategory = () => {
    const day = new Date().getDay();
    const mappings = ['legs', 'legs', 'chest', 'legs', 'chest', 'legs', 'chest'];
    return mappings[day] || 'legs';
  };

  const getInitialCategory = () => {
    const saved = localStorage.getItem('exercise_select_category');
    if (saved) {
      localStorage.removeItem('exercise_select_category');
      return saved;
    }
    return getTodayCategory();
  };

  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory());

  const activityLevel = React.useMemo(() => {
    if (userProfile && userProfile.activityLevel) {
      return userProfile.activityLevel;
    }
    try {
      const saved = localStorage.getItem('edgeform_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.activityLevel) {
          return parsed.activityLevel;
        }
      }
    } catch (e) {}
    return 'intermediate';
  }, [userProfile]);

  const userGender = React.useMemo(() => {
    if (userProfile && userProfile.gender) {
      return userProfile.gender;
    }
    try {
      const saved = localStorage.getItem('edgeform_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.gender) {
          return parsed.gender;
        }
      }
    } catch (e) {}
    return 'male';
  }, [userProfile]);

  const [soonMessage, setSoonMessage] = useState<string | null>(null);

  const handleExerciseClick = (exId: ExerciseType, exName: string) => {
    const isAllowed = exId === 'performance_squat' || exId === 'military_pushup';
    if (isAllowed) {
      onSelect(exId);
    } else {
      setSoonMessage(`"${exName}" is coming soon!`);
      setTimeout(() => {
        setSoonMessage(null);
      }, 3000);
    }
  };

  const currentPreviewLevel = (activityLevel as 'beginner' | 'intermediate' | 'advanced') || 'beginner';

  const filteredExercises = EXERCISES.filter(ex => ex.category === selectedCategory);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }} 
      className="min-h-screen bg-[#050A0E] text-white flex flex-col"
    >
      <header className="px-6 py-8 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#050A0E]/80 backdrop-blur-md z-30">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="text-center flex-1">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-1">SYSTEM_SELECTION</p>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Exercise Hub</h1>
        </div>
        <div className="w-12 h-12" />
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 lg:p-12 scroll-smooth">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div 
              key="workout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Categories Scroll */}
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
                {WORKOUT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-4 px-6 py-4 rounded-4xl border transition-all duration-300",
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
                      <p className="text-xs font-black">{cat.count > 0 ? `${cat.count} AVAILABLE` : 'COMING SOON'}</p>
                      <p className={cn(
                        "text-[9px] font-bold mt-0.5 uppercase tracking-wide",
                        selectedCategory === cat.id ? "text-black/60" : "text-lime-400"
                      )}>
                        {cat.targets}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Exercises Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredExercises.length > 0 ? (
                  filteredExercises.map((ex, i) => {
                    const weightRec = getWeightRecommendation(ex.id, currentPreviewLevel, userGender);
                    const isAllowed = ex.id === 'performance_squat' || ex.id === 'military_pushup';
                    return (
                      <motion.div 
                        key={ex.id} 
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        transition={{ delay: i * 0.1 }}
                        onClick={() => handleExerciseClick(ex.id, ex.name)}
                        className={cn(
                          "group relative cursor-pointer selection:bg-transparent",
                          !isAllowed && "opacity-60 hover:opacity-80 transition-opacity"
                        )}
                      >
                        <div className={cn(
                          "relative flex flex-col rounded-[2.5rem] overflow-hidden border-2 bg-[#070D13] shadow-2xl transition-all duration-500 min-h-130 h-auto pb-4",
                          isAllowed 
                            ? "border-white/5 hover:border-lime-500/20 hover:shadow-[0_15px_30px_rgba(132,204,22,0.05)]" 
                            : "border-white/5 hover:border-orange-500/10 cursor-not-allowed"
                        )}>
                          
                          {/* Coming Soon/Soon badge floating overlay */}
                          {!isAllowed && (
                            <div className="absolute top-4 right-4 z-20 bg-orange-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>SOON</span>
                            </div>
                          )}

                          {/* Top Media Container - Perfect for 3D Video or Image placeholder */}
                          <div className="relative h-56 w-full overflow-hidden bg-black/40 border-b border-white/5 shrink-0">
                            <img 
                              src={ex.image} 
                              alt={ex.name} 
                              className={cn(
                                "w-full h-full object-cover transition-all duration-1000",
                                isAllowed 
                                  ? "opacity-80 group-hover:scale-105 grayscale group-hover:grayscale-0" 
                                  : "opacity-30 grayscale blur-[2px]"
                              )}
                            />
                            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black/20">
                              <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 scale-90 group-hover:scale-100",
                                isAllowed 
                                  ? "bg-lime-500/90 text-black shadow-lime-500/20" 
                                  : "bg-orange-500/90 text-black shadow-orange-500/20"
                              )}>
                                {isAllowed ? (
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                ) : (
                                  <Lock className="w-5 h-5" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Info & Description Container */}
                          <div className="flex-1 p-6 flex flex-col justify-between bg-[#0A0F14]/60">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-[0.26em] italic block",
                                  isAllowed ? "text-lime-500" : "text-amber-500/80"
                                )}>
                                  {isAllowed ? "Available Prototype" : "Locked / Coming Soon"}
                                </span>
                                <h3 className={cn(
                                  "text-xl font-black italic tracking-tighter leading-none uppercase transition-colors",
                                  isAllowed ? "text-white group-hover:text-lime-500" : "text-white/60"
                                )}>
                                  {ex.name}
                                </h3>
                                <p className="text-xs text-white/40 leading-relaxed font-semibold pt-1 line-clamp-3 group-hover:text-white/70 transition-colors">
                                  {ex.description}
                                </p>
                              </div>

                              {/* AI Biological & Structural Weight Calculator Card */}
                              {weightRec ? (
                                <div className="p-3.5 rounded-[1.5rem] bg-amber-500/5 border border-amber-500/15 flex flex-col justify-between space-y-2 opacity-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-amber-500">
                                      <Dumbbell size={12} />
                                      <span className="text-[9px] font-black uppercase tracking-wider font-mono">
                                        {weightRec.label}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-black text-black font-mono bg-amber-500 px-2 py-0.5 rounded-md shadow-md">
                                      {weightRec.weight}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-white/60 font-semibold leading-relaxed">
                                    <span className="text-amber-500 font-black uppercase">Form Tip: </span>
                                    {weightRec.tip}
                                  </p>
                                </div>
                              ) : (
                                <div className={cn(
                                  "p-3.5 rounded-[1.5rem] border flex flex-col justify-between space-y-1",
                                  isAllowed 
                                    ? "bg-lime-500/5 border-lime-500/15" 
                                    : "bg-white/5 border-white/5 opacity-40"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <span className={cn("text-[9px] font-black uppercase tracking-wider font-mono", isAllowed ? "text-lime-400" : "text-white/40")}>
                                      Load Metric
                                    </span>
                                    <span className={cn("text-[9px] font-black font-mono", isAllowed ? "text-lime-400" : "text-white/40")}>
                                      Bodyweight (No load)
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-white/50 font-semibold leading-relaxed">
                                    Leverage bodyweight to avoid Joint mechanical friction. Superb coordinate tracing!
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                              <div className="flex gap-4">
                                <div className={cn(
                                  "flex items-center gap-2 px-2.5 py-1 rounded-lg border",
                                  isAllowed 
                                    ? "text-lime-400 bg-lime-500/5 border-lime-500/10" 
                                    : "text-white/30 bg-white/5 border-white/5"
                                )}>
                                  <Activity size={12} className={cn(isAllowed && "text-lime-500 animate-pulse")} />
                                  <span className="text-[9px] font-black uppercase tracking-wider">{activityLevel}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white/50 bg-white/5 px-2.5 py-1 rounded-lg">
                                  <Flame size={12} className={isAllowed ? "text-orange-500" : "text-white/20"} />
                                  <span className="text-[9px] font-black uppercase tracking-wider">{ex.cals}</span>
                                </div>
                              </div>
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-black/20 shrink-0",
                                isAllowed 
                                  ? "bg-white text-black group-hover:bg-lime-500" 
                                  : "bg-white/5 text-white/30"
                              )}>
                                {isAllowed ? <ChevronRight size={22} /> : <Lock size={16} />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-20 filter grayscale">
                     <Activity size={80} className="mb-8" />
                     <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Neural Data Restricted</h3>
                     <p className="text-lg font-medium tracking-widest uppercase">Workout coming to this sector soon</p>
                     <div className="mt-8 flex gap-2">
                        {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                     </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Soon Toast Notification */}
      <AnimatePresence>
        {soonMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0A0F14]/95 border border-orange-500/30 text-orange-400 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md"
          >
            <Lock className="w-4 h-3.5 text-orange-500" />
            <span className="text-xs font-black uppercase tracking-wider">{soonMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
