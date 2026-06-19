// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (DASHBOARD.TSX):
// 
// 1. DATA CACHING & LOCAL STORAGE ENGINE (Our Database Solution):
//    - Ang dashboard na ito ay direktang nakikipag-ugnayan sa **HTML5 Web Storage (LocalStorage) Database**.
//    - Bakit hindi central SQL Server o Firestore?
//      a) **Zero Network Latency:** Kailangan ng instant feedback habang nag-eehersisyo ang gumagamit nang walang delay ng wifi/mobile data.
//      b) **100% Offline-First Capability:** Gumagana kahit walang internet sa gym o bahay kapag na-load na ang model.
//      c) **Demographic Privacy Control:** Ang timbang, taas, pangalan, at workout records ay pinoprotektahan nang lokal sa device ng user.
// 
// 2. MGA DATABASE TABLES AT KEYS NA HIGPIT NA PINAPATAKBO RITO:
//    - `edgeform_weekly_completed_v1_${emailKey}` : Listahan ng mga araw sa linggong ito kung kailan matagumpay na natapos ang workouts.
//    - `edgeform_workout_history_${emailKey}`   : Kasaysayan (cumulative arrays) ng bawat session ng reps, accuracy scores, and timestamps.
//    - `edgeform_weekly_schedule_v2_${emailKey}`: Listahan ng plano ng bawat araw (halimbawa Lunes: Squats, Martes: Forearm Plank).
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp as TrendingUpIcon, 
  TrendingDown,
  Flame, 
  Trophy, 
  Target, 
  Droplets,
  Play, 
  ChevronRight, 
  Activity, 
  LayoutGrid,
  Dumbbell,
  Zap,
  LogOut,
  LineChart,
  User,
  ShieldCheck,
  RefreshCcw,
  Palette,
  X,
  Save,
  Trash2,
  Calendar,
  Check,
  Clock,
  Sparkles,
  Pencil,
  Lock
} from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import WorkoutMediaFrame from '../components/WorkoutMediaFrame';
import legsImg from '../assets/images/legs_workout_png_1779787720371.png';
import cardioImg from '../assets/images/cardio_workout_png_1779787736563.png';
import chestImg from '../assets/images/chest_workout_png_1779787753054.png';
import armsImg from '../assets/images/arms_workout_png_1779787768498.png';
import coreImg from '../assets/images/core_workout_png_1779787784490.png';
import backImg from '../assets/images/back_workout_png_1779787800827.png';

export const COMPREHENSIVE_EXERCISES: Record<string, { focus: string; muscles: string; tips: string; warmup: string; volume: string }> = {
  performance_squat: {
    focus: 'Performance Squat (Legs)',
    muscles: 'Quads, Glutes, Hamstrings, Ankles',
    tips: 'Leg Day Tip: Keep heels flat on the floor. Track knees over toes and stand straight to prevent Nakatabingi tilt.',
    warmup: 'Ankle flexes & dynamic hip circles',
    volume: '3 Sets of 10 Reps'
  },
  military_pushup: {
    focus: 'Military Push-up (Chest)',
    muscles: 'Pectorals, Anterior Deltoids, Triceps, Core',
    tips: 'Chest Tip: Keep body straight, lower elbows to 90 degrees, and push back up dynamically.',
    warmup: 'Arm swings & shoulder rotations',
    volume: '3 Sets of 8 Reps'
  },
  none: {
    focus: 'Rest & Recovery Day (Rest)',
    muscles: 'Systemic Recovery',
    tips: 'Rest Day Tip: Take a light walk or perform gentle stretching. Adequate hydration and deep breathing speed up recovery.',
    warmup: 'Deep diaphragmatic breathing & joint mobility',
    volume: 'Rest Day'
  }
};

export const EXERCISES_BY_CATEGORY: Record<string, { id: string; name: string; level: string; time: string; cals: string; image: string; description: string }[]> = {
  legs: [
    { id: 'performance_squat', name: 'Performance Squat', level: 'Beginner • No Equipment', time: '10 min', cals: '85 kcal', image: legsImg, description: 'Bodyweight (No equipment). Side-view squat tracking knee & hip flexion. Keep heels flat to avoid uneven/lopsided tilt.' }
  ],
  chest: [
    { id: 'military_pushup', name: 'Military Push-up', level: 'Beginner • No Equipment', time: '10 min', cals: '70 kcal', image: chestImg, description: 'Bodyweight (No equipment). Side profile push-up tracking arm/elbow flexion and straight spine alignment.' }
  ]
};

export const WARMUPS_BY_CATEGORY: Record<string, { id: string; name: string; duration: string; image: string; description: string }[]> = {
  legs: [
    { id: 'ankle_mobility', name: 'Ankle Mobility Flow', duration: '30s', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600', description: 'Keep heel flat on ground. Push knee forward dynamically over center toes to maximize ankle range of motion.' },
    { id: 'hip_circles', name: 'Hip Joint Circles', duration: '30s', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600', description: 'Place hands on hips and trace spacious circles to lubricate pelvic bone sockets.' },
    { id: 'jumping_jacks_warmup', name: 'Jumping Jacks', duration: '40s', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600', description: 'An explosive full-body movement to raise your heart rate and warm up your limbs fast.' }
  ],
  chest: [
    { id: 'arm_swings', name: 'Dynamic Arm Swings', duration: '30s', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600', description: 'Swing arms wide to open chest and warm up shoulder joints.' },
    { id: 'shoulder_rolls', name: 'Shoulder Joint Rolls', duration: '30s', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600', description: 'Trace dynamic circles with elbows to lubricate the shoulder sockets.' },
    { id: 'cat_cow_stretch', name: 'Decompressing Cat-Cow', duration: '40s', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=600', description: 'Decompress spinal path to set standard core neutral brace.' }
  ]
};

export function getWarmupValForCategory(catId: string): string {
  switch (catId) {
    case 'legs': return 'squat';
    case 'chest': return 'pushup';
    default: return 'squat';
  }
}

export const SCHEDULE_PRESETS: Record<string, { focus: string; muscles: string; tips: string; warmup: string; volume: string; exerciseId: string }> = {
  'Leg Day': {
    focus: 'Leg Day (Performance Squat)',
    muscles: 'Quads, Glutes, Hamstrings',
    tips: 'Ensure your heels are always flat on the floor. Keep your shoulders upright and aligned to avoid uneven lopsided tilt.',
    warmup: 'Hip rotations & ankle range-of-motion stretching',
    volume: '3 Sets of 10 Reps (Performance Squats Focus)',
    exerciseId: 'performance_squat'
  },
  'Chest': {
    focus: 'Chest Workout (Military Push-up)',
    muscles: 'Pectorals, Shoulders, Triceps, Core',
    tips: 'Lower your chest to dynamic 90 deg elbow bend. Keep body rigid.',
    warmup: 'Shoulder rotations & dynamic arm swings',
    volume: '3 Sets of 8 Reps (Military Push-up Focus)',
    exerciseId: 'military_pushup'
  },
  'Rest': {
    focus: 'Rest & Recovery Day',
    muscles: 'Full-body muscle fiber recovery',
    tips: 'Drink enough water and rest well. This helps replenish energy and rebuild muscle fibers.',
    warmup: 'Gentle whole-body static stretching',
    volume: 'Rest day - no high-intensity work sets',
    exerciseId: 'none'
  }
};

export function getCategoryLabelForExercise(exerciseId: string): string {
  switch (exerciseId) {
    case 'performance_squat':
      return 'Leg Day';
    case 'military_pushup':
      return 'Chest & Arms Focus';
    case 'none':
    default:
      return 'Rest & Recovery Day';
  }
}

export function getPrimaryExerciseIdForCategory(exerciseId: string): string {
  const category = getCategoryLabelForExercise(exerciseId);
  switch (category) {
    case 'Leg Day':
      return 'performance_squat';
    case 'Chest & Arms Focus':
      return 'military_pushup';
    case 'Rest & Recovery Day':
    default:
      return 'none';
  }
}

export function getCategoryIdForExercise(exerciseId: string): string {
  switch (exerciseId) {
    case 'performance_squat':
      return 'legs';
    case 'military_pushup':
      return 'chest';
    case 'none':
      return 'none';
    default:
      return 'legs';
  }
}

export const CATEGORY_IMAGES: Record<string, string> = {
  legs: legsImg,
  chest: chestImg,
  cardio: cardioImg,
  arms: armsImg,
  core: coreImg,
  back: backImg,
  none: ''
};

export function getExercisePersonalizedData(exerciseId: string, level: string, goal: string) {
  const details = COMPREHENSIVE_EXERCISES[exerciseId] || COMPREHENSIVE_EXERCISES.none;
  
  // Compute customized volume based on exercise type and user level
  let baseVolume = details.volume;
  if (exerciseId !== 'none') {
    // If it's a timed hold/cardio duration
    if (baseVolume.includes('seconds') || baseVolume.includes('Run') || baseVolume.includes('mins')) {
      let durationStr = '20 seconds';
      if (baseVolume.includes('30 seconds')) {
        durationStr = level === 'beginner' ? '20 seconds' : level === 'intermediate' ? '30 seconds' : '45 seconds';
      } else if (baseVolume.includes('20 seconds')) {
        durationStr = level === 'beginner' ? '15 seconds' : level === 'intermediate' ? '25 seconds' : '40 seconds';
      } else if (baseVolume.includes('40 seconds')) {
        durationStr = level === 'beginner' ? '30 seconds' : level === 'intermediate' ? '40 seconds' : '60 seconds';
      } else if (baseVolume.includes('15 mins')) {
        durationStr = level === 'beginner' ? '10 mins' : level === 'intermediate' ? '15 mins' : '20 mins';
      }
      
      let suffix = '';
      if (goal === 'lose_weight' || goal === 'improve_endurance') {
        suffix = ' (Short Resets)';
      } else if (goal === 'muscle_gain' || goal === 'shape_body') {
        suffix = ' (Aerobic Build)';
      }
      baseVolume = `3 Sets of ${durationStr}${suffix}`;
    } else {
      // Reps based! E.g. '3 Sets of 10 Reps'
      let repsCount = 10;
      if (baseVolume.includes('6 Reps')) {
        repsCount = level === 'beginner' ? 6 : level === 'intermediate' ? 10 : 14;
      } else if (baseVolume.includes('8 Reps')) {
        repsCount = level === 'beginner' ? 8 : level === 'intermediate' ? 12 : 16;
      } else if (baseVolume.includes('10 Reps')) {
        repsCount = level === 'beginner' ? 10 : level === 'intermediate' ? 14 : 18;
      } else if (baseVolume.includes('12 Reps')) {
        repsCount = level === 'beginner' ? 12 : level === 'intermediate' ? 16 : 20;
      } else if (baseVolume.includes('15 Reps')) {
        repsCount = level === 'beginner' ? 12 : level === 'intermediate' ? 18 : 24;
      }
      
      let suffix = '';
      if (goal === 'lose_weight' || goal === 'improve_endurance') {
        suffix = ' (Cardio Tempo)';
      } else if (goal === 'muscle_gain' || goal === 'shape_body') {
        suffix = ' (Hypertrophy)';
      }
      
      const setPrefix = level === 'beginner' ? '3 Sets' : level === 'intermediate' ? '3 Sets' : '4 Sets';
      const isPerSide = baseVolume.includes('per leg') || baseVolume.includes('per side') || baseVolume.includes('per arm');
      const sideSuffix = isPerSide ? (baseVolume.includes('per leg') ? '  per leg' : baseVolume.includes('per side') ? ' per side' : ' per arm') : '';
      baseVolume = `${setPrefix} of ${repsCount} Reps${sideSuffix}${suffix}`;
    }
  }

  const friendlyName = details.focus.split('(')[0].trim();

  return {
    focus: getCategoryLabelForExercise(exerciseId),
    muscles: details.muscles,
    tips: details.tips,
    warmup: details.warmup,
    volume: baseVolume,
    exerciseId,
    actionText: exerciseId === 'none' ? 'Rest Day' : 'Start Exercise',
    isSupported: exerciseId !== 'none'
  };
}

export function getDefaultSchedule(level: string, goal: string) {
  return [
    {
      id: 'mon',
      index: 1,
      name: 'Monday',
      shortName: 'M',
      ...getExercisePersonalizedData('performance_squat', level, goal)
    },
    {
      id: 'tue',
      index: 2,
      name: 'Tuesday',
      shortName: 'T',
      ...getExercisePersonalizedData('military_pushup', level, goal)
    },
    {
      id: 'wed',
      index: 3,
      name: 'Wednesday',
      shortName: 'W',
      ...getExercisePersonalizedData('none', level, goal)
    },
    {
      id: 'thu',
      index: 4,
      name: 'Thursday',
      shortName: 'T',
      ...getExercisePersonalizedData('performance_squat', level, goal)
    },
    {
      id: 'fri',
      index: 5,
      name: 'Friday',
      shortName: 'F',
      ...getExercisePersonalizedData('military_pushup', level, goal)
    },
    {
      id: 'sat',
      index: 6,
      name: 'Saturday',
      shortName: 'S',
      ...getExercisePersonalizedData('none', level, goal)
    },
    {
      id: 'sun',
      index: 0,
      name: 'Sunday',
      shortName: 'S',
      ...getExercisePersonalizedData('none', level, goal)
    }
  ];
}

interface DashboardProps {
  profile: UserProfile | null;
  onNavigate: (view: string) => void;
  onSelectExercise: (exercise: any) => void;
  onLogout: () => void;
  key?: string;
}

export default function Dashboard({ profile, onNavigate, onSelectExercise, onLogout }: DashboardProps) {
  const emailKey = profile?.email?.toLowerCase().trim() || 'default';
  const [avatarSeed] = useState(localStorage.getItem('avatarSeed') || profile?.goal || 'default');
  const [soonMessage, setSoonMessage] = useState<string | null>(null);

  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>(() => {
    const emailKey = profile?.email?.toLowerCase().trim() || 'default';
    const saved = localStorage.getItem(`edgeform_weekly_completed_v1_${emailKey}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [workoutHistory, setWorkoutHistory] = useState<any[]>(() => {
    const emailKey = profile?.email?.toLowerCase().trim() || 'default';
    try {
      const saved = localStorage.getItem(`edgeform_workout_history_${emailKey}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    if (profile?.email) {
      return []; // brand new individual user starts with zero workouts
    }
    // Guest fallback
    return [
      { d: 'Mon', v: 62, reps: 6, timestamp: Date.now() - 4 * 86400000, exercise: 'pushup' },
      { d: 'Tue', v: 75, reps: 12, timestamp: Date.now() - 3 * 86400000, exercise: 'squat' },
      { d: 'Wed', v: 80, reps: 10, timestamp: Date.now() - 2 * 86400000, exercise: 'pushup' },
      { d: 'Thu', v: 68, reps: 8, timestamp: Date.now() - 1 * 86400000, exercise: 'squat' },
      { d: 'Fri', v: 67, reps: 12, timestamp: Date.now(), exercise: 'squat' }
    ];
  });

  useEffect(() => {
    const handleStorageUpdate = () => {
      const emailKey = profile?.email?.toLowerCase().trim() || 'default';
      try {
        const saved = localStorage.getItem(`edgeform_workout_history_${emailKey}`);
        if (saved) {
          setWorkoutHistory(JSON.parse(saved));
        } else if (profile?.email) {
          setWorkoutHistory([]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    handleStorageUpdate();
    const interval = setInterval(handleStorageUpdate, 2000);
    return () => clearInterval(interval);
  }, [profile]);

  const avgScore = React.useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return profile?.email ? 0 : 80;
    const records = workoutHistory.filter(w => typeof w.v === 'number');
    if (records.length === 0) return profile?.email ? 0 : 80;
    return Math.round(records.reduce((acc, curr) => acc + (curr.v || 80), 0) / records.length);
  }, [workoutHistory, profile]);

  const currentStreak = React.useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) {
      return profile?.email ? 0 : 3;
    }
    const dates = workoutHistory.map(w => {
      try {
        return new Date(w.timestamp).toDateString();
      } catch (e) {
        return '';
      }
    }).filter(Boolean);
    const uniqueDates = Array.from(new Set(dates));
    return uniqueDates.length || (profile?.email ? 0 : 3);
  }, [workoutHistory, profile]);

  const [weeklySchedule, setWeeklySchedule] = useState<any[]>(() => {
    const emailKey = profile?.email?.toLowerCase().trim() || 'default';
    const saved = localStorage.getItem(`edgeform_weekly_schedule_v2_${emailKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            ...item,
            focus: getCategoryLabelForExercise(item.exerciseId)
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    const level = profile?.activityLevel || 'beginner';
    const goal = profile?.goal || 'shape_body';
    return getDefaultSchedule(level, goal);
  });

  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState<any[] | null>(null);

  // Synchronize dynamic schedule updates on profile settings changes if not manually customized yet
  useEffect(() => {
    const emailKey = profile?.email?.toLowerCase().trim() || 'default';
    const isCustomized = localStorage.getItem(`edgeform_weekly_schedule_customised_${emailKey}`) === 'true';
    if (!isCustomized) {
      const level = profile?.activityLevel || 'beginner';
      const goal = profile?.goal || 'shape_body';
      setWeeklySchedule(getDefaultSchedule(level, goal));
    }
  }, [profile]);

  const handleToggleEditSchedule = () => {
    if (isEditingSchedule) {
      setIsEditingSchedule(false);
      setDraftSchedule(null);
    } else {
      setIsEditingSchedule(true);
      setDraftSchedule(JSON.parse(JSON.stringify(weeklySchedule)));
    }
  };

  const handleUpdateDraftDaySchedule = (dayId: string, updatedFields: Partial<any>) => {
    if (!draftSchedule) return;
    const nextDraft = draftSchedule.map(day => {
      if (day.id === dayId) {
        const exerciseId = updatedFields.exerciseId !== undefined ? updatedFields.exerciseId : day.exerciseId;
        
        let autoFields = {};
        if (updatedFields.exerciseId !== undefined) {
          const level = profile?.activityLevel || 'beginner';
          const goal = profile?.goal || 'shape_body';
          autoFields = getExercisePersonalizedData(exerciseId, level, goal);
        }

        return {
          ...day,
          ...autoFields,
          ...updatedFields
        };
      }
      return day;
    });
    setDraftSchedule(nextDraft);
  };

  const handleSaveScheduleChanges = () => {
    if (draftSchedule) {
      setWeeklySchedule(draftSchedule);
      localStorage.setItem(`edgeform_weekly_schedule_v2_${emailKey}`, JSON.stringify(draftSchedule));
      localStorage.setItem(`edgeform_weekly_schedule_customised_${emailKey}`, 'true');
    }
    setIsEditingSchedule(false);
    setDraftSchedule(null);
  };

  const handleCancelScheduleChanges = () => {
    setIsEditingSchedule(false);
    setDraftSchedule(null);
  };

  const handleResetSchedule = () => {
    const level = profile?.activityLevel || 'beginner';
    const goal = profile?.goal || 'shape_body';
    const defaults = getDefaultSchedule(level, goal);
    if (isEditingSchedule) {
      setDraftSchedule(defaults);
    } else {
      setWeeklySchedule(defaults);
      localStorage.setItem(`edgeform_weekly_schedule_v2_${emailKey}`, JSON.stringify(defaults));
      localStorage.removeItem(`edgeform_weekly_schedule_customised_${emailKey}`);
    }
  };

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    return new Date().getDay();
  });

  const toggleDayComplete = (dayId: string, dayName: string) => {
    const nextVal = { ...completedDays, [dayId]: !completedDays[dayId] };
    setCompletedDays(nextVal);
    localStorage.setItem(`edgeform_weekly_completed_v1_${emailKey}`, JSON.stringify(nextVal));
  };

  // Personalized goal recommendations and guidelines
  const { goalLabel, goalRecommendation } = React.useMemo(() => {
    const goal = profile?.goal || 'shape_body';
    
    let label = 'Shape Body';
    let recommendation = 'High-performance symmetry exercises, Core stability, and perfect form alignment sweeps.';
    
    if (goal === 'lose_weight') {
      label = 'Weight Loss';
      recommendation = 'Aerobic tempo pacing and optimized rest bounds targeted for fat loss and cardiovascular stamina.';
    } else if (goal === 'improve_endurance') {
      label = 'Improve Endurance';
      recommendation = 'Higher volume repetition sets with short recovery cycles to upgrade physical threshold and muscle stamina.';
    } else if (goal === 'muscle_gain') {
      label = 'Muscle Gain';
      recommendation = 'Concentrated progressive hypertrophy splits, targeted control on negatives, and muscle hypertrophy growth.';
    }
    
    return {
      goalLabel: label,
      goalRecommendation: recommendation
    };
  }, [profile]);

  // Helper to find the numeric day-of-month for a given index of the weekly schedule
  const getCalendarDateForIndex = (index: number) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diff = index - currentDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate.getDate();
  };

  // Today's scheduled focus
  const todayTargetFocus = React.useMemo(() => {
    const day = new Date().getDay();
    // Sunday: pushup (upper), Monday: pushup (upper), Tuesday: squat (lower), Wednesday: lunge (lower), Thursday: deadlift (lower), Friday: overhead_press (upper), Saturday: squat (lower)
    const isLower = [2, 3, 4, 6].includes(day);
    return isLower ? 'Lower Body' : 'Upper Body';
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#050A0E] text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/5 blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[150px]" />
      </div>

      {/* Top Bar */}
      <header className="h-20 border-b border-white/5 px-6 flex items-center justify-between bg-[#050A0E]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-500 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-black" />
          </div>
          <span className="font-black text-2xl tracking-tighter italic uppercase text-white">
            EDGE<span className="text-lime-500">FORM</span>
          </span>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span className="font-black text-sm uppercase tracking-wider">{currentStreak} Day Streak</span>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => onNavigate('profile')}
              className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-white/5 p-1 ring-2 ring-transparent hover:ring-lime-500/50 transition-all cursor-pointer active:scale-95 outline-none"
            >
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt="User" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 p-6 pb-32 md:p-8 lg:p-12 relative z-10">
        <div className="max-w-7xl mx-auto relative">
          {/* Subtle Background HUD elements */}
          <div className="absolute -top-10 -left-10 w-40 h-40 border-t border-l border-white/5 pointer-events-none hidden lg:block" />
          <div className="absolute top-20 -right-20 w-[1px] h-96 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
          
          {/* Greeting Section */}
          <div className="mb-8 group">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 mb-1"
                >
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase italic">
                    Hello, <span className="text-lime-500">
                      {profile?.name ? profile.name.split(' ')[0] : (profile?.gender === 'female' ? 'Sarah' : 'John')}!
                    </span> 👋
                  </h2>
                </motion.div>
                <p className="text-white/40 text-sm md:text-lg font-medium tracking-wide">
                  Ready to crush your goals today?
                </p>
              </div>

              {/* Dynamic User Setup Configuration Badges */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-2 self-start md:self-center"
              >
                <div className="px-3.5 py-1.5 bg-[#84cc16]/10 border border-[#84cc16]/20 rounded-xl text-[#84cc16] text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse" />
                  <span>Target: {profile?.goal === 'muscle_gain' ? 'Muscle Mass Gain' : (profile?.goal === 'lose_weight' ? 'Weight Loss' : (profile?.goal === 'gain_weight' ? 'Gain Weight' : (profile?.goal === 'shape_body' ? 'Shape Body' : (profile?.goal === 'improve_endurance' ? 'Athletic Endurance' : 'General Health'))))}</span>
                </div>
                <div className="px-3.5 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Experience: {profile?.activityLevel === 'beginner' ? 'Beginner' : (profile?.activityLevel === 'intermediate' ? 'Intermediate' : 'Advanced')}</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* DYNAMIC PERFORMANCE & WORKOUT STREAKS BAR */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:gap-8 mb-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="relative p-4 sm:p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-[#1A0C02] via-[#0A0501] to-[#050200] border-2 border-orange-500/20 hover:border-orange-500/40 overflow-hidden group shadow-2xl flex flex-col justify-between transition-all duration-300 min-h-[140px] sm:min-h-0"
            >
              {/* Dynamic fiery pulse effect resembling TikTok premium streak */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-600/10 to-transparent pointer-events-none" />
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-baseline gap-1 sm:gap-1.5 pt-1">
                      <span id="streak-counter" className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 tabular-nums pr-4 pb-2 inline-block drop-shadow-md group-hover:scale-105 transition-transform duration-300 leading-none select-none">
                        {currentStreak}
                      </span>
                      <div className="relative">
                        <Flame className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 text-orange-500 fill-orange-500 animate-bounce" />
                        <div className="absolute inset-0 bg-orange-400/50 blur-md rounded-full -z-10 animate-ping" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-white font-black italic uppercase text-[10px] sm:text-xs md:text-base leading-tight tracking-tighter group-hover:text-amber-300 transition-colors whitespace-nowrap flex items-center gap-1">
                    <span>Current Streak</span>
                    <span className="animate-pulse">🔥</span>
                  </p>
                  <div className="mt-2 w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (currentStreak / 7) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="relative p-4 sm:p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-[#02140A] via-[#010A05] to-[#010502] border-2 border-lime-500/20 hover:border-lime-500/40 overflow-hidden group shadow-2xl flex flex-col justify-between transition-all duration-300 min-h-[140px] sm:min-h-0"
            >
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-lime-600/5 to-transparent pointer-events-none" />
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-lime-500/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-3 md:gap-6 h-full justify-center sm:justify-start">
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 shrink-0">
                  {/* Scalable viewBox to ensure perfect circle fit */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke="currentColor" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 32} 
                      strokeDashoffset={2 * Math.PI * 32 * (1 - avgScore / 100)} 
                      className="text-lime-500 transition-all duration-1000 filter drop-shadow-[0_0_6px_rgba(132,204,22,0.6)]" 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div id="accuracy-counter" className="absolute inset-0 flex items-center justify-center font-mono font-black text-[10px] sm:text-xs md:text-sm italic text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400 tabular-nums">{avgScore}%</div>
                </div>
                <div className="min-w-0">
                  <p className="text-lime-400/80 text-[7px] sm:text-[8px] font-mono tracking-widest uppercase mb-1">POSE PRECISION</p>
                  <p className="text-white font-black italic uppercase text-[11px] sm:text-xs md:text-lg leading-tight tracking-tighter group-hover:text-lime-300 transition-colors break-words">
                    Average Accuracy
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* WEEKLY WORKOUT PLANS & ACTIVE PROGRESS MATRIX */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12 bg-gradient-to-br from-[#0A0F14] to-[#050A0E] rounded-[2.5rem] border border-white/5 p-6 md:p-8 relative overflow-hidden shadow-2xl"
          >
            {/* Absolute glow design accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-lime-500/10 border border-lime-500/20 rounded-2xl flex items-center justify-center text-lime-500 shadow-lg shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">
                      Weekly Workout Schedule
                    </h3>
                    <button
                      onClick={handleToggleEditSchedule}
                      className={cn(
                        "p-1.5 rounded-lg active:scale-95 transition-all outline-none select-none border cursor-pointer flex items-center justify-center",
                        isEditingSchedule 
                          ? "bg-lime-500 text-black border-lime-400" 
                          : "bg-white/5 text-lime-400 hover:text-lime-300 border-white/10 hover:bg-white/10"
                      )}
                      title="Edit Schedule"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mt-0.5">
                    Interactive posture alignment program
                  </p>
                </div>
              </div>

              {/* Completion Progress Bar */}
              <div className="flex flex-col sm:items-end gap-1.5 min-w-[200px]">
                <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-wider font-mono text-white/60">
                  <span>Weekly Compliance</span>
                  <span className="text-lime-500 font-black italic">
                    {weeklySchedule.filter(d => completedDays[d.id]).length} / 7 Completed
                  </span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(132,204,22,0.5)]"
                    style={{ width: `${(weeklySchedule.filter(d => completedDays[d.id]).length / 7) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {isEditingSchedule && draftSchedule ? (
              /* DYNAMIC EDITING INTERACTIVE SCHEDULE MANAGER */
              <div 
                id="schedule-editor-view" 
                className="py-4 space-y-4 relative z-10 border-t border-white/5 mt-4 text-left"
              >
                {/* Clean Top Action Bar / Info Row */}
                <div className="flex justify-between items-center py-2">
                  <div>
                    <h4 className="text-sm font-bold uppercase text-lime-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Customized Routine Editor
                    </h4>
                  </div>
                  <button 
                    onClick={handleResetSchedule}
                    className="text-[10px] text-white/40 hover:text-red-400 font-bold uppercase tracking-wider transition-all cursor-pointer underline hover:no-underline"
                  >
                    Reset defaults
                  </button>
                </div>

                {/* Minimal basic listing list with just Name and Dropdown selection */}
                <div className="space-y-1 divide-y divide-white/5 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                  {draftSchedule.map((day) => (
                    <div 
                      key={day.id} 
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      {/* Name Header */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{day.name}</span>
                        {new Date().getDay() === day.index && (
                          <span className="text-[8px] font-black uppercase text-lime-400 bg-lime-500/10 px-1.5 py-0.5 rounded-md tracking-wider">Today</span>
                        )}
                      </div>

                      {/* Dropdown Focus Selection */}
                      <div className="w-48">
                        <select
                          value={getPrimaryExerciseIdForCategory(day.exerciseId)}
                          onChange={(e) => {
                            handleUpdateDraftDaySchedule(day.id, { exerciseId: e.target.value });
                          }}
                          className="w-full bg-[#090F14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-lime-400 tracking-wide outline-none focus:border-lime-500 cursor-pointer"
                        >
                          <option value="performance_squat">Leg Day</option>
                          <option value="military_pushup">Chest & Arms Focus</option>
                          <option value="none">Rest & Recovery Day</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Controls: Back & Save Changes */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-4">
                  <button
                    type="button"
                    onClick={handleCancelScheduleChanges}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all border border-white/10 cursor-pointer outline-none select-none"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveScheduleChanges}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer outline-none select-none font-bold"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TABBED WEEKLY CALENDAR & DETAILS VIEW */
              <>
                {/* Tab List of Days */}
                <div className="py-6 border-b border-white/5 relative z-10 overflow-x-auto hide-scrollbar -mx-6 px-6">
                  <div className="flex justify-between items-center gap-2 min-w-max">
                    {weeklySchedule.map((item) => {
                      const isToday = new Date().getDay() === item.index;
                      const isSelected = selectedDayIndex === item.index;
                      const isCompleted = !!completedDays[item.id];

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedDayIndex(item.index);
                          }}
                          className={cn(
                            "relative flex flex-col items-center p-3 rounded-2xl w-[82px] transition-all cursor-pointer border group active:scale-95 outline-none select-none",
                            isSelected 
                              ? "bg-gradient-to-b from-lime-400 to-lime-500 text-black border-lime-400 shadow-[0_8px_20px_rgba(132,204,22,0.2)]"
                              : isToday
                                ? "bg-white/5 text-white border-lime-500/30 hover:border-lime-500/50"
                                : "bg-[#0A0F14] text-white/50 border-white/5 hover:border-white/10"
                          )}
                        >
                          {/* Today marker label */}
                          {isToday && (
                            <span className={cn(
                              "absolute -top-2.5 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md border text-center scale-90",
                              isSelected 
                                ? "bg-black text-lime-400 border-lime-500/25" 
                                : "bg-lime-500 text-black border-lime-400"
                            )}>
                              Today
                            </span>
                          )}

                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isSelected ? "text-black/60" : "text-white/40"
                          )}>
                            {item.name.substring(0, 3)}
                          </span>

                          <span className={cn(
                            "text-xl font-black italic tracking-tighter my-0.5",
                            isSelected ? "text-black" : "text-white"
                          )}>
                            {getCalendarDateForIndex(item.index)}
                          </span>

                          <span className={cn(
                            "text-[8px] font-semibold uppercase tracking-wider",
                            isSelected ? "text-black/50" : "text-white/30"
                          )}>
                            Day {item.index === 0 ? 7 : item.index}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Day Detail Presentation */}
                {(() => {
                  const activeItem = weeklySchedule.find(item => item.index === selectedDayIndex) || weeklySchedule[0];
                  const isCompleted = !!completedDays[activeItem.id];
                  const isToday = new Date().getDay() === activeItem.index;

                  return (
                    <div className="pt-6 relative z-10 space-y-6">
                      {/* Top Container: Video or 3D reference media */}
                      <div className="relative w-full h-[280px] sm:h-[365px] md:h-[420px] lg:h-[450px] rounded-3xl overflow-hidden border border-white/5 bg-[#050A0E] shadow-2xl group">
                        <WorkoutMediaFrame 
                          exerciseId={activeItem.exerciseId} 
                          dayId={activeItem.id} 
                          dayName={activeItem.name} 
                          focusTitle={activeItem.focus} 
                        />
                      </div>

                      {/* Bottom Container: Workout blueprint details and performance launcher */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Left description area */}
                        <div className="lg:col-span-8 p-6 md:p-8 rounded-3xl bg-[#070c10]/40 border border-white/5 space-y-5 text-left flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-xs font-semibold uppercase text-lime-400 bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded">
                                {activeItem.name} Focus
                              </span>
                              {isToday && (
                                <span className="text-xs font-semibold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded">
                                  ⚡ Today's Workout
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-xs font-semibold uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Target Cleared
                                </span>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-start md:items-center gap-3">
                                <h4 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight font-sans">
                                  {activeItem.focus}
                                </h4>
                                {activeItem.exerciseId && activeItem.exerciseId !== 'none' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-lime-500/10 text-lime-400 border border-lime-500/20 uppercase tracking-widest font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                    Tracker Target: {activeItem.exerciseId.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs text-white/50">
                                <span className="font-bold uppercase tracking-wider text-[10px] text-white/30">Target muscles:</span>
                                <span className="font-medium text-white/70">{activeItem.muscles}</span>
                              </div>
                            </div>

                            {/* Tips and alignment guidelines callouts */}
                            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex gap-3 items-start">
                              <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-4 h-4" />
                              </div>
                              <div className="space-y-1 text-left">
                                <h5 className="text-xs font-bold uppercase text-lime-400 tracking-wider">Form Tip</h5>
                                <p className="text-sm text-white/80 leading-relaxed">
                                  {activeItem.tips}
                                </p>
                              </div>
                            </div>

                            {/* List of exercises for this focus day */}
                            {(() => {
                              const catId = getCategoryIdForExercise(activeItem.exerciseId);
                              const exercisesList = EXERCISES_BY_CATEGORY[catId] || [];
                              if (exercisesList.length === 0) return null;
                              return (
                                <div className="space-y-3 pt-2">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <h5 className="text-xs font-black uppercase text-lime-400 tracking-wider flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                      Included in {activeItem.name}'s ({catId.toUpperCase()}) Focus
                                    </h5>
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                      {exercisesList.length} Exercises Available
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {exercisesList.map((ex) => {
                                      const isAllowed = ex.id === 'performance_squat' || ex.id === 'military_pushup';
                                      return (
                                        <div 
                                          key={ex.id}
                                          onClick={() => {
                                            if (isAllowed) {
                                              if (typeof onSelectExercise === 'function') {
                                                onSelectExercise(ex.id);
                                              }
                                            } else {
                                              setSoonMessage(`"${ex.name}" is coming soon!`);
                                              setTimeout(() => {
                                                setSoonMessage(null);
                                              }, 3000);
                                            }
                                          }}
                                          className={cn(
                                            "group flex gap-3 items-center p-3 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border transition-all relative overflow-hidden select-none",
                                            !isAllowed 
                                              ? "opacity-45 hover:opacity-60 cursor-not-allowed border-white/5 hover:border-orange-500/10" 
                                              : (activeItem.exerciseId === ex.id 
                                                ? "border-lime-500/30 bg-lime-500/[0.02] cursor-pointer" 
                                                : "border-white/5 hover:border-white/10 cursor-pointer")
                                          )}
                                        >
                                          {/* Soon indicator tag */}
                                          {!isAllowed && (
                                            <div className="absolute top-1 right-2 bg-orange-500 text-black text-[7px] font-black uppercase px-2 py-0.5 rounded-full scale-90 z-10">
                                              SOON
                                            </div>
                                          )}
                                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/5 relative">
                                            <img 
                                              src={ex.image} 
                                              alt={ex.name} 
                                              className={cn(
                                                "w-full h-full object-cover transition-transform duration-500",
                                                isAllowed ? "opacity-60 group-hover:scale-105" : "opacity-25 blur-[0.5px]"
                                              )} 
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                          <div className="min-w-0 flex-1 text-left">
                                            <h6 className={cn(
                                              "text-[11px] font-black leading-tight truncate transition-colors",
                                              isAllowed ? "text-white group-hover:text-lime-400" : "text-white/40"
                                            )}>
                                              {ex.name}
                                            </h6>
                                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider truncate mt-0.5">
                                              {isAllowed ? (ex.level.split(' • ')[1] || ex.level) : "Locked / Soon"}
                                            </p>
                                          </div>
                                          <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0",
                                            isAllowed 
                                              ? "bg-white/5 group-hover:bg-lime-500 text-white/60 group-hover:text-black" 
                                              : "bg-white/5 text-white/30"
                                          )}>
                                            {isAllowed ? (
                                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                            ) : (
                                              <Lock className="w-2.5 h-2.5" />
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* List of warm-ups for this focus day */}
                            {(() => {
                              const catId = getCategoryIdForExercise(activeItem.exerciseId);
                              const warmupsList = WARMUPS_BY_CATEGORY[catId] || [];
                              if (warmupsList.length === 0) return null;
                              return (
                                <div className="space-y-3 pt-3 border-t border-white/5">
                                  <div className="flex items-center justify-between pb-2">
                                    <h5 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                                      <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                      Required Warm-up Drills ({catId.toUpperCase()})
                                    </h5>
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                      {warmupsList.length} Drills Prescribed
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {warmupsList.map((wu) => (
                                      <div 
                                        key={wu.id}
                                        onClick={() => {
                                          const warmupVal = getWarmupValForCategory(catId);
                                          localStorage.setItem('warmup_exercise_val', warmupVal);
                                          onNavigate('warmup');
                                        }}
                                        className="group flex gap-3 items-center p-3 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer"
                                      >
                                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/5 relative">
                                          <img 
                                            src={wu.image} 
                                            alt={wu.name} 
                                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                        <div className="min-w-0 flex-1 text-left">
                                          <h6 className="text-[11px] font-black leading-tight text-white group-hover:text-amber-400 transition-colors truncate">
                                            {wu.name}
                                          </h6>
                                          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider truncate mt-0.5">
                                            Duration: {wu.duration}
                                          </p>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-white/5 group-hover:bg-amber-500 text-white/60 group-hover:text-black flex items-center justify-center transition-all shrink-0">
                                          <Zap className="w-2.5 h-2.5 fill-current" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Right details targets & Actions area */}
                        <div className="lg:col-span-4 p-6 md:p-8 rounded-3xl bg-[#070c10]/40 border border-white/5 flex flex-col justify-between gap-6">
                          <div className="space-y-4">
                            <h5 className="text-xs font-bold uppercase text-white/40 tracking-wider text-left">Prescribed Goals</h5>
                            
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-lime-500/5 flex items-center justify-center text-lime-400 shrink-0 border border-lime-500/10">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                  <span className="block text-[9px] uppercase tracking-wider text-white/40">Target Volume</span>
                                  <span className="text-sm font-black uppercase text-white leading-tight">{activeItem.volume}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-lime-500/5 flex items-center justify-center text-lime-400 shrink-0 border border-lime-500/10">
                                  <Dumbbell className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                  <span className="block text-[9px] uppercase tracking-wider text-white/40">Recommended Warm-up</span>
                                  <span className="text-sm font-black uppercase text-white leading-tight">{activeItem.warmup}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 justify-center w-full">
                            {/* Navigation launcher */}
                            {activeItem.exerciseId === 'none' ? (
                              <div className="w-full p-4 bg-white/[0.01] border border-dashed border-white/10 text-white/50 rounded-2xl font-medium text-xs text-center relative overflow-hidden flex flex-col gap-1 items-center justify-center min-h-[70px]">
                                <div className="text-[10px] text-lime-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                                  <span>REST & RECOVERY</span>
                                </div>
                                <p className="leading-relaxed text-white/40 text-center text-xs">
                                  Enjoy your rest today! Focus on hydration and light mobility work to aid posture recovery.
                                </p>
                              </div>
                            ) : (() => {
                              const isActiveDayAllowed = activeItem.exerciseId === 'performance_squat' || activeItem.exerciseId === 'military_pushup';
                              return (
                                <button
                                  onClick={() => {
                                    if (isActiveDayAllowed) {
                                      if (activeItem.exerciseId && activeItem.exerciseId !== 'none') {
                                        const catId = getCategoryIdForExercise(activeItem.exerciseId);
                                        localStorage.setItem('exercise_select_category', catId);
                                      }
                                      onNavigate('exercise_select');
                                    } else {
                                      setSoonMessage(`"${activeItem.focus}" training is locked. Only Squats and Push-ups are currently available.`);
                                      setTimeout(() => {
                                        setSoonMessage(null);
                                      }, 3500);
                                    }
                                  }}
                                  className={cn(
                                    "w-full py-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:scale-[1.01] active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer outline-none font-bold",
                                    isActiveDayAllowed
                                      ? "bg-lime-500 hover:bg-lime-400 text-black animate-pulse"
                                      : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20"
                                  )}
                                >
                                  {isActiveDayAllowed ? (
                                    <>
                                      <Play className="w-3 h-3 fill-current" />
                                      <span>Start Exercise</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3" />
                                      <span>Locked (Squat/Push-up Only)</span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </motion.div>

          {/* Feature Cards Grid (Stat cards removed and relocated above) */}

        </div>
      </main>

      {/* NEW Horizontal Bottom Tab Navigation */}
      <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        {/* Bottom Safety Mask - This prevents content from peeking below the pill */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050A0E] via-[#050A0E]/80 to-transparent pointer-events-none" />
        
        <div className="relative w-full max-w-sm pointer-events-auto p-4 pb-8">
          {/* Central elevated circular button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-20">
            <button 
              onClick={() => onNavigate('exercise_select')}
              className="w-20 h-20 bg-lime-500 rounded-full flex items-center justify-center text-black shadow-[0_10px_30px_rgba(132,204,22,0.6)] hover:scale-110 active:scale-95 transition-all border-[6px] border-[#0A0F14] relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Dumbbell className="w-8 h-8 fill-current relative z-10" />
            </button>
          </div>

          {/* Background pill container */}
          <div className="bg-[#0A0F14] border border-white/10 rounded-full px-2 py-2 flex items-center justify-between shadow-2xl relative h-20 ring-1 ring-white/5">
            <div className="flex-1 flex justify-center gap-6 pr-6">
              <NavItem icon={<LayoutGrid />} label="HOME" active onClick={() => onNavigate('dashboard')} />
              <NavItem icon={<Zap />} label="WARMUP" onClick={() => onNavigate('warmup')} />
            </div>
            
            <div className="flex-1 flex justify-center gap-6 pl-6">
              <NavItem icon={<Droplets />} label="FUEL" onClick={() => onNavigate('fuel')} />
              <NavItem icon={<LineChart />} label="DATA" onClick={() => onNavigate('progress')} />
            </div>
          </div>
        </div>
      </nav>

      {/* Toast Alert Notice */}
      <AnimatePresence>
        {soonMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#160D08]/95 border border-orange-500/50 text-orange-200 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3.5 select-none"
          >
            <Lock className="w-5 h-5 text-orange-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="text-left">
              <h5 className="font-bold text-[11px] uppercase tracking-wider text-orange-400">Beta Version Limitations</h5>
              <p className="text-xs text-orange-200/90 leading-snug mt-1 font-medium font-sans">
                {soonMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-300 group outline-none",
        active ? "text-lime-500" : "text-white/20 hover:text-white"
      )}
    >
      <div className={cn("w-6 h-6 mb-1.5 transition-transform group-hover:scale-110", active ? "text-lime-500" : "")}>
        {React.cloneElement(icon as React.ReactElement, { strokeWidth: 2.5 })}
      </div>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-[0.1em] italic",
        active ? "text-lime-500" : ""
      )}>
        {label}
      </span>
      {active && (
        <div className="mt-1 w-1 h-1 rounded-full bg-lime-500 shadow-[0_0_8px_#84cc16]" />
      )}
    </button>
  );
}

function MenuButton({ icon, label, onClick, danger = false }: { icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all group",
        danger 
          ? "text-red-500 hover:bg-red-500/10" 
          : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <div className={cn("w-5 h-5 transition-transform group-hover:scale-110", danger ? "" : "group-hover:text-lime-500")}>
        {icon}
      </div>
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, color, trend, description }: { 
  icon: React.ReactNode, 
  label: string, 
  value: string, 
  color: string,
  trend?: string,
  description?: string
}) {
  const colorMap: Record<string, string> = {
    lime: 'text-lime-500 bg-lime-500/10 border-lime-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
  };

  const activeColor = colorMap[color] || 'text-white bg-white/5 border-white/10';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative p-6 md:p-8 rounded-[3rem] bg-[#0A0F14] border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden"
    >
      {/* Background Decor */}
      <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full bg-current", activeColor.split(' ')[0])} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-2xl", activeColor)}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-7 h-7" })}
          </div>
          {trend && (
            <div className="px-2 py-1 rounded-md bg-white/5 border border-white/5">
              <span className="text-[10px] font-black text-lime-500 italic">{trend}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] italic transition-colors group-hover:text-white/40">{label}</p>
          <p className="text-3xl md:text-4xl font-black text-white italic tracking-tighter tabular-nums leading-none">
            {value}
          </p>
          {description && (
            <p className="text-[9px] text-white/10 font-bold uppercase tracking-widest mt-2 group-hover:text-white/20 transition-colors">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Decorative Border Glow */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/5 rounded-[3rem] pointer-events-none transition-colors" />
    </motion.div>
  );
}
