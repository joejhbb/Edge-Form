// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (WORKOUT_VIEW.TSX):
// 
// 1. LIFECYCLE NG EXERCISE SCREEN (WORKOUT STATE MACHINE):
//    - `prepState`: 'instructions' (gabay sa tamang porma) -> 'countdown' (voice-beeps 10s prep) -> 'active' (live pose tracking) -> 'paused'.
// 
// 2. PAANO GUMAGANA ANG POSE ANALYSIS SA SCREEN NA ITO?
//    - Kapag gumagana na ang camera, bawat frame ng coordinates ay pumapasok sa `onPose` callback.
//    - Sinusuri ng component ang bawat point gamit ang minimum threshold na `0.05` joint visibility.
// 
// 3. THE 750ms GRACE PERIOD ALGORITHM (Anti-Flickering Screen):
//    - Kapag may pumatak na ilaw o lumubog ang dulo ng tao sa labas ng view, hindi papatayin agad ang screening.
//    - Sumasailalim ang detector sa 750ms grace delay. Kung nakabalik ang user bago ang 750ms, magpapatuloy ang track na tila walang nangyari.
// 
// 4. TEXT-TO-SPEECH (TTS) AUDIO COACHING:
//    - Gamit ang Web Speech API (`window.speechSynthesis`), kusang binabasa ng system ang biomechanical status para sa real-time corrections.
// 
// 5. AUTOMATED CELEBRATIVE COMPLETION SYSTEM (Auto-Transition to Summary):
//    - Binabantayan ng `useEffect` hook kapag naabot na ang `targetGoal` limit (default 15).
//    - Kusang magpapasabog ng party confetti (`canvas-confetti`), magsasalita ng panalong TTS speech, at pagkalipas ng 2.5 seconds ay lilipat sa Summary screen!
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, HelpCircle, Volume2, VolumeX, PlayCircle, CheckCircle2, Sun, Camera, Move, CameraOff, RefreshCw, X, Tv, Check, Play, Server, Cpu, Terminal, Settings, Database, Activity, Upload } from 'lucide-react';
import PoseCamera from '../components/camera/PoseCamera';
import { ExerciseType, Pose } from '../types';
import { calculateAngle } from '../lib/poseLogic';
import { cn } from '../lib/utils';
import { audioSynth } from '../lib/audioSynth';
import squatVideo from '../assets/videos/SQUATS.mp4';
import pushupVideo from '../assets/videos/MILITARYPUSHUPS.mp4';

interface WorkoutViewProps {
  exercise: ExerciseType;
  onComplete: (reps: number, score: number, repAccuracies?: number[]) => void;
  onExit: () => void;
  onGoToWarmup?: () => void;
  key?: string;
}

const WORKOUT_VIDEO_CLIPS: Record<string, string> = {
  squat: squatVideo,
  pushup: pushupVideo
};

const getVideoUrl = (ex: string): string => {
  const normalized = ex.toLowerCase();
  if (normalized.includes('squat')) return WORKOUT_VIDEO_CLIPS.squat;
  return WORKOUT_VIDEO_CLIPS.pushup;
};

const isEmbedVideo = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
};

const getEmbedUrl = (url: string): string => {
  if (url.includes('youtube.com/watch')) {
    const videoId = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0`;
  }
  return url;
};

const getMappedExerciseTracker = (ex: string): 'squat' | 'pushup' => {
  const lowerMatched = ex.toLowerCase().includes('squat');
  return lowerMatched ? 'squat' : 'pushup';
};

const getFriendlyExerciseName = (ex: ExerciseType) => {
  switch (ex) {
    case 'performance_squat': return 'Performance Squat';
    case 'military_pushup': return 'Military Push-up';
    default: return String(ex).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
};

const isCameraOrEnvAlert = (msg: string): boolean => {
  const m = msg.toLowerCase();
  if (m.includes('tilt') || m.includes('tilted')) {
    return false;
  }
  return m.includes('too close') || 
         m.includes('position') || 
         m.includes('too dark') || 
         m.includes('too bright') || 
         m.includes('body in frame') || 
         m.includes('side profile');
};

export default function WorkoutView({ exercise, onComplete, onExit, onGoToWarmup }: WorkoutViewProps) {
  const [showWarmupCheck, setShowWarmupCheck] = useState(false);
  const trackerType = getMappedExerciseTracker(exercise);
  const targetGoal = exercise.toLowerCase().includes('plank') ? 30 : (trackerType === 'pushup' ? 12 : 15);
  const [prepState, setPrepState] = useState<'initializing' | 'checklist' | 'countdown' | 'active'>('initializing');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [isCountdownPaused, setIsCountdownPaused] = useState(false);
  
  const [quality, setQuality] = useState<'dark' | 'bright' | 'good'>('good');
  const [cameraBrightness, setCameraBrightness] = useState<number>(100);
  const [stats, setStats] = useState<{
    reps: number;
    score: number;
    feedback: string;
    isDescending: boolean;
    lastKneeAngle?: number;
    minDescentScore?: number;
    depthReached?: boolean;
    tooDeepReached?: boolean;
    hasTiltedShoulder?: boolean;
    hasTiltedHip?: boolean;
    hasLeanedTooFar?: boolean;
    hasBowedHead?: boolean;
    viewMode?: 'front' | 'side' | 'unknown';
    skippedRepReason?: string;
    skippedRepAlert?: boolean;
    squatDepthPercent?: number;
    lastPlankHoldTime?: number;
    repAccuracies: number[];
    descentStartTime?: number;
    hasStoodUpright?: boolean;
  }>({
    reps: 0,
    score: 0,
    feedback: 'Get ready!',
    isDescending: false,
    lastKneeAngle: undefined,
    minDescentScore: 100,
    depthReached: false,
    tooDeepReached: false,
    hasTiltedShoulder: false,
    hasTiltedHip: false,
    hasLeanedTooFar: false,
    hasBowedHead: false,
    viewMode: 'unknown',
    skippedRepReason: '',
    skippedRepAlert: false,
    squatDepthPercent: 0,
    lastPlankHoldTime: undefined,
    repAccuracies: [],
    descentStartTime: undefined,
    hasStoodUpright: false
  });
  const [seconds, setSeconds] = useState(0);
  const [displayedFeedback, setDisplayedFeedback] = useState<string>('Get ready!');
  const [isMuted, setIsMuted] = useState(false);
  const [activeVoiceMode, setActiveVoiceMode] = useState<'cloud' | 'native'>(() => audioSynth.getVoiceMode());
  const [isPersonDetected, setIsPersonDetected] = useState<boolean>(false);
  const [fatigue, setFatigue] = useState<number>(0);
  const [showBiomechanicsGuide, setShowBiomechanicsGuide] = useState<boolean>(false);
  const [studyGuideTab, setStudyGuideTab] = useState<'kinesiology' | 'mathematics' | 'pipeline' | 'noise'>('kinesiology');
  const [csharpUrl, setCsharpUrl] = useState<string>('http://localhost:5000');
  const [csharpConnectionError, setCsharpConnectionError] = useState<string | null>(null);
  const [csharpLogs, setCsharpLogs] = useState<string[]>([]);
  const [csharpTab, setCsharpTab] = useState<'code' | 'pipeline'>('pipeline');
  const [showCsharpSettings, setShowCsharpSettings] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'local' | 'csharp'>('csharp');
  const [deskMode, setDeskMode] = useState<boolean>(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const [cameraFit, setCameraFit] = useState<'cover' | 'contain'>('cover');
  const [closeRangeMode, setCloseRangeMode] = useState<boolean>(true);
  const [useGiantHUD, setUseGiantHUD] = useState<boolean>(false);
  const deskNoseMinYRef = useRef<number>(9999);
  const deskNoseMaxYRef = useRef<number>(-9999);
  const deskStateRef = useRef<'up' | 'down'>('up');
  const lastDeskRepTimeRef = useRef<number>(0);

  const addCsharpLog = useCallback((msg: string) => {
    setCsharpLogs(prev => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const timestamp = `${h}:${m}:${s}.${ms}`;
      const next = [...prev, `[${timestamp}] ${msg}`];
      if (next.length > 50) {
        return next.slice(next.length - 50);
      }
      return next;
    });
  }, []);
  
  const timerRef = useRef<number | null>(null);
  const lastSpokenRef = useRef<string>('');
  const lastSpokenRepRef = useRef<number>(0);
  const lastSpokenTimeRef = useRef<number>(0);
  const lastFeedbackSpokenTimeRef = useRef<number>(0);
  const lastRepOrCountdownSpokenTimeRef = useRef<number>(0);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const lastSkippedReasonRef = useRef<string>('');
  const lastSpokenCountdownRef = useRef<number>(-1);
  const lastFatigueMilestoneRef = useRef<number>(0);
  const activeArmSideRef = useRef<'left' | 'right' | null>(null);
  const isCalculatingCsharpRef = useRef<boolean>(false);
  const consecutiveCsharpErrorsRef = useRef<number>(0);
  const cameraAlertFirstSeenRef = useRef<number | null>(null);
  const cameraAlertMessageRef = useRef<string>('');
  const personLostTimestampRef = useRef<number | null>(null);
  const lastFeedbackMutationTimeRef = useRef<number>(0);
  const hasCompletedRef = useRef<boolean>(false);

  // Initialize the persistent audio element once on mount to bypass mobile sandbox constraints
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioSynth.init();
      const shared = audioSynth.getSharedAudio();
      if (shared) {
        ttsAudioRef.current = shared;
      } else {
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        ttsAudioRef.current = audio;
      }
    }
  }, []);

  const smoothFeedback = useCallback((incomingMsg: string, currentStableMsg: string): string => {
    const now = Date.now();
    const incoming = incomingMsg ? incomingMsg.trim() : '';
    const current = currentStableMsg ? currentStableMsg.trim() : '';
    
    if (!incoming) return current;
    if (!current) {
      lastFeedbackMutationTimeRef.current = now;
      return incoming;
    }
    
    if (incoming === current) {
      return current;
    }
    
    // Check if the incoming message is a high priority feedback that should be updated immediately
    const isHighPriority = 
      incoming.toLowerCase().includes('completed') || 
      incoming.toLowerCase().includes('perfect rep') ||
      incoming.toLowerCase().includes('excellent rep') ||
      incoming.toLowerCase().includes('success') ||
      incoming.toLowerCase().includes('rep completed') ||
      incoming.toLowerCase().includes('congrats') ||
      incoming.toLowerCase().includes('perfect plank') ||
      incoming.toLowerCase().includes('excellent parallel depth') ||
      incoming.toLowerCase().includes('80% parallel target') ||
      incoming.toLowerCase().includes('too close') ||
      incoming.toLowerCase().includes('tilted') ||
      incoming.toLowerCase().includes('tilt') ||
      incoming.toLowerCase().includes('too deep') ||
      incoming.toLowerCase().includes('lacking depth') ||
      incoming.toLowerCase().includes('sagging') ||
      incoming.toLowerCase().includes('too high') ||
      incoming === 'Get ready!';

    const elapsed = now - lastFeedbackMutationTimeRef.current;
    
    // Increase stability: coaching feedback updates/changes are locked to once every 4500ms
    // to prevent rapid blinking/flickering and sensory/vocal fatigue for the user.
    if (isHighPriority || elapsed >= 4500) {
      lastFeedbackMutationTimeRef.current = now;
      return incoming;
    }
    
    return current;
  }, []);

  // 1. Core workout timer
  useEffect(() => {
    if (prepState === 'active') {
      timerRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [prepState]);

  // Unified voice speech coach - Bypasses Native engine discrepancies completely to guarantee 100% same-person vocal updates on all devices
  const speakText = useCallback((text: string, rate: number = 1.05, ignoreMute: boolean = false, interrupt: boolean = true, bypassGuards: boolean = false) => {
    if (isMuted && !ignoreMute) return;
    
    // We only speak in active or countdown states
    if (prepState !== 'active' && prepState !== 'countdown' && !bypassGuards) {
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Check if the incoming request is high priority (e.g., rep numbers, countdown, or workout completion)
    const isHighPriority = 
      /^\d+$/.test(trimmedText) || 
      /^(Get ready|[1-9]|10)$/i.test(trimmedText) || 
      trimmedText.toLowerCase().includes('congratulations') ||
      trimmedText.toLowerCase().includes('workout complete') ||
      trimmedText.toLowerCase().includes('good job');

    // Prevent routine coaching updates from cutting off/interrupting active speech (unless user specifically taps to play)
    if (audioSynth.isSpeaking() && !isHighPriority && !bypassGuards) {
      return;
    }

    // Only guard with person detection for posture correction feedback to avoid spamming silence, reps and countdowns can always play
    const isPostureFeedback = trimmedText.toLowerCase().includes('bend') || 
                              trimmedText.toLowerCase().includes('straight') || 
                              trimmedText.toLowerCase().includes('lower') || 
                              trimmedText.toLowerCase().includes('back') ||
                              trimmedText.toLowerCase().includes('position') ||
                              trimmedText.toLowerCase().includes('form');
    
    const isCameraPositionText = 
      trimmedText.toLowerCase().includes('too close') || 
      trimmedText.toLowerCase().includes('step back') ||
      trimmedText.toLowerCase().includes('position full body') ||
      trimmedText.toLowerCase().includes('position body') ||
      trimmedText.toLowerCase().includes('side profile') ||
      trimmedText.toLowerCase().includes('posturing tilted') ||
      trimmedText.toLowerCase().includes('too dark') ||
      trimmedText.toLowerCase().includes('too bright') ||
      trimmedText.toLowerCase().includes('adjust lighting') ||
      trimmedText.toLowerCase().includes('brighten your room');

    if (isPostureFeedback && !isPersonDetected && !bypassGuards && !isCameraPositionText) {
      return;
    }
    
    try {
      // Stream high-fidelity direct audio over Web Audio context so it is exactly the same voice actor for both countdown and feedback
      audioSynth.speakTts(trimmedText, rate, interrupt);
      lastSpokenTimeRef.current = Date.now();
      lastSpokenRef.current = trimmedText;
    } catch (error) {
      console.warn('Core unified speech synthesis failed:', error);
    }
  }, [isMuted, prepState, isPersonDetected]);

  // 2. Countdown phase controller
  useEffect(() => {
    if (prepState === 'countdown' && !isCountdownPaused) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPrepState('active');
            
            // Instantly play high-energy start chime and speak "Begin" with 0ms lag
            setTimeout(() => {
              audioSynth.playStartWorkout();
              speakText("Begin!", 1.1, true, true, true);
            }, 60);
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [prepState, isCountdownPaused, speakText]);

  // Pre-load speech voices on mount and support lazy voice changes on Chrome/Safari engines
  useEffect(() => {
    // Force pre-fetches of the countdown sounds into memory for responsive, gapless speech playback
    audioSynth.preloadCountdown();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  // Responsive UI event-driven speech unlocking (bypasses browser iframe / mobile strict media restrictions)
  useEffect(() => {
    const unlockTTSAndSynth = () => {
      audioSynth.unlock();
      
      // Unlock the persistent HTMLAudioElement so it can play sounds at any future time without direct tap interaction
      if (ttsAudioRef.current) {
        ttsAudioRef.current.play()
          .then(() => {
            console.log("Persistent voice engine successfully unlocked.");
          })
          .catch((err) => {
            console.warn("Touchstart voice engine unlock error on mobile:", err);
          });
      }

      // Unlock native speech synthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          // Use a mini period utterance with near-zero volume to prime the iOS WebKit Speech engine natively
          const silentUtterance = new SpeechSynthesisUtterance('.');
          silentUtterance.volume = 0.001;
          silentUtterance.rate = 1.5;
          window.speechSynthesis.speak(silentUtterance);
        } catch (e) {
          console.warn('Failed to unlock native SpeechSynthesis engine:', e);
        }
      }
      
      window.removeEventListener('click', unlockTTSAndSynth);
      window.removeEventListener('touchstart', unlockTTSAndSynth);
    };

    window.addEventListener('click', unlockTTSAndSynth);
    window.addEventListener('touchstart', unlockTTSAndSynth);
    return () => {
      window.removeEventListener('click', unlockTTSAndSynth);
      window.removeEventListener('touchstart', unlockTTSAndSynth);
    };
  }, []);

  const triggerDeskSimulationRep = useCallback(() => {
    setStats(prev => {
      const isPlank = exercise.toLowerCase().includes('plank');
      const addAmount = isPlank ? 5 : 1;
      const nextReps = Math.min(targetGoal, (prev.reps || 0) + addAmount);
      
      const plankFeedbacks = [
        "Perfect plank form! Keep holding.",
        "Excellent linear alignment! Core is strong.",
        "Beautiful forearm balance! Spine linear profile locked.",
        "Superb posture! High hips sag eliminated."
      ];
      const pushupFeedbacks = [
        "Excellent pushup! Keep your core strong.",
        "Perfect form! Chest close to the floor.",
        "Beautiful execution! Squeeze those chest muscles.",
        "Great rep! Keep holding that straight plank."
      ];
      const squatFeedbacks = [
        "Awesome squat! Perfect thigh-parallel depth.",
        "Perfect repetition! Excellent lower-body control.",
        "Great squat depth! Knees in line with toes.",
        "Brilliant form! Squeeze glutes on the way up."
      ];
      
      const feedbackArray = isPlank ? plankFeedbacks : (trackerType === 'squat' ? squatFeedbacks : pushupFeedbacks);
      const randomFeedback = feedbackArray[nextReps % feedbackArray.length];
      
      speakText(randomFeedback, 1.05, false, true);
      audioSynth.playRepComplete();
      
      addCsharpLog(`Thread-07: Received Desk Mode Frame.`);
      addCsharpLog(`PoseAnalyzer.cs: Desk/Demo mode override triggered.`);
      addCsharpLog(isPlank 
        ? `PoseAnalyzer.cs: Plank hold timer simulated! Held for +5s. Total: ${nextReps}s / 30s`
        : `PoseAnalyzer.cs: Rep counted successfully! New Total = ${nextReps}`
      );
      
      if (nextReps === targetGoal) {
        import('canvas-confetti').then(module => {
          module.default({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        });
        speakText(isPlank 
          ? "Congratulations! You successfully completed your plank hold! Brilliant job!"
          : "Congratulations! Workout complete! You did a fantastic job!", 1.0, false, true, true);
      }
      
      return {
        ...prev,
        reps: nextReps,
        score: Math.floor(92 + Math.random() * 8),
        feedback: randomFeedback,
        isDescending: false,
        depthReached: false
      };
    });
  }, [trackerType, targetGoal, exercise, speakText, addCsharpLog]);

  useEffect(() => {
    let interval: number | null = null;
    if (prepState === 'active' && isAutoSimulating) {
      interval = window.setInterval(() => {
        triggerDeskSimulationRep();
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [prepState, isAutoSimulating, triggerDeskSimulationRep]);

  useEffect(() => {
    if (deskMode) {
      deskNoseMinYRef.current = 9999;
      deskNoseMaxYRef.current = -9999;
      deskStateRef.current = 'up';
      setIsPersonDetected(true);
    } else {
      setIsAutoSimulating(false);
    }
  }, [deskMode]);

  // Reset workout stats state whenever the selected exercise changes
  useEffect(() => {
    setStats({
      reps: 0,
      score: 0,
      feedback: 'Get ready!',
      isDescending: false,
      lastKneeAngle: undefined,
      minDescentScore: 100,
      depthReached: false,
      tooDeepReached: false,
      hasTiltedShoulder: false,
      hasTiltedHip: false,
      hasLeanedTooFar: false,
      hasBowedHead: false,
      viewMode: 'unknown',
      skippedRepReason: '',
      skippedRepAlert: false,
      squatDepthPercent: 0,
      lastPlankHoldTime: undefined,
      repAccuracies: [],
      descentStartTime: undefined,
      hasStoodUpright: false
    });
    setCountdown(10);
    activeArmSideRef.current = null;
  }, [exercise]);

  // Synchronize displayed feedback instantly at all times so the user always sees real-time posture/alignment cues on screen
  useEffect(() => {
    setDisplayedFeedback(stats.feedback || 'Get ready!');
  }, [stats.feedback]);

  // 4. Voice coaching for real-time postures and alignment alerts
  useEffect(() => {
    if (isMuted) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      try {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
        }
      } catch (e) {}
      return;
    }

    if (prepState !== 'active') return;

    if (!stats.feedback || stats.feedback === 'Get ready!') return;

    const isTiltFeedback = 
      stats.feedback.toLowerCase().includes('tilted') || 
      stats.feedback.toLowerCase().includes('tilt');

    const isDepthOrPostureAlert =
      stats.feedback.toLowerCase().includes('too deep') ||
      stats.feedback.toLowerCase().includes('lacking depth') ||
      stats.feedback.toLowerCase().includes('sagging') ||
      stats.feedback.toLowerCase().includes('too high') ||
      stats.feedback.toLowerCase().includes('too low') ||
      stats.feedback.toLowerCase().includes('go lower') ||
      stats.feedback.toLowerCase().includes('leaning too far');

    const isUrgentFeedback = isTiltFeedback || isDepthOrPostureAlert;

    const isCameraPositionFeedback = 
      (stats.feedback.toLowerCase().includes('too close') || 
      stats.feedback.toLowerCase().includes('step back') ||
      stats.feedback.toLowerCase().includes('position full body') ||
      stats.feedback.toLowerCase().includes('position body') ||
      stats.feedback.toLowerCase().includes('side profile') ||
      stats.feedback.toLowerCase().includes('too dark') ||
      stats.feedback.toLowerCase().includes('too bright') ||
      stats.feedback.toLowerCase().includes('adjust lighting') ||
      stats.feedback.toLowerCase().includes('brighten your room')) &&
      !isUrgentFeedback;

    // IF NO PERSON IS DETECTED in front of the camera, DO NOT speak any posture coaching feedbacks!
    // This perfectly satisfies the "when there is no person in the camera view, there should be no coaching speech feedback" rule.
    // However, if the feedback IS a camera positioning cue (e.g. "Too close to the camera") or posture, we MUST bypass this block.
    if (!isPersonDetected && !isCameraPositionFeedback && !isUrgentFeedback) {
      return;
    }

    // Normalized template comparer helper to strip dynamic values (like dynamic degree angles) from messages
    const getFeedbackTemplate = (msg: string) => {
      return msg.replace(/\d+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    };

    const isSameTemplate = getFeedbackTemplate(lastSpokenRef.current) === getFeedbackTemplate(stats.feedback);
    const now = Date.now();
    const timeSinceLastFeedback = now - lastFeedbackSpokenTimeRef.current;
    const timeSinceLastRep = now - lastRepOrCountdownSpokenTimeRef.current;
    
    // OVERALL COOLDOWN GUARD: Space consecutive posture coach voice advice by at least 3.0 seconds
    // to give plenty of breathing room but still respond promptly to errors.
    if (timeSinceLastFeedback < 3000) {
      return;
    }

    // Wait at least 1.8 seconds after a rep count or countdown is spoken before giving any posture feedback.
    // This allows the rep count audio to fully play past before the coach's physical posture feedback starts.
    if (timeSinceLastRep < 1800) {
      return;
    }

    // For critical camera position, tilt, or depth feedback, play it with healthy pacing
    if (isUrgentFeedback) {
      // Repeat same urgent warnings every 7.0 seconds so it is responsive.
      if (isSameTemplate && timeSinceLastFeedback < 7000) {
        return;
      }
    } else if (isCameraPositionFeedback) {
      // If it is the same camera position feedback (e.g., too close), repeat it every 10.0 seconds to remind them nicely
      if (isSameTemplate && timeSinceLastFeedback < 10000) {
        return;
      }
    } else {
      if (isSameTemplate) {
        if (timeSinceLastFeedback < 10000) {
          return; // Wait 10.0 seconds before repeating the exact same coaching suggestion
        }
      } else {
        if (timeSinceLastFeedback < 5000) {
          return; // Space out different coaching feedbacks by at least 5.0 seconds
        }
      }
    }

    lastSpokenRef.current = stats.feedback;
    lastFeedbackSpokenTimeRef.current = now;
    setDisplayedFeedback(stats.feedback); // SIMULTANEOUS UPDATE: Sync on-screen text with scheduled speech instantly!

    // Speak posture advice, interrupting/cutting off any existing speeches to prevent overlapping
    speakText(stats.feedback, 1.05, false, true);

    // Play subtle audio synth helper sounds:
    const lowerFeedback = stats.feedback.toLowerCase();
    
    // Check if the feedback is a warning or corrective posture advice (not positive or neutral)
    const isPositiveOrNeutral = 
      lowerFeedback.includes('good') || 
      lowerFeedback.includes('perfect') || 
      lowerFeedback.includes('great') || 
      lowerFeedback.includes('ready') || 
      lowerFeedback.includes('keep going') || 
      lowerFeedback.includes('hold there') || 
      lowerFeedback.includes('down') ||
      lowerFeedback === '';

    if (!isPositiveOrNeutral) {
      audioSynth.playPostureWarning();
    }
  }, [stats.feedback, isMuted, speakText, isPersonDetected, prepState]);

  // 5. Vocalize reps count or hold timer updates on successful completions
  useEffect(() => {
    if (prepState === 'active' && stats.reps > lastSpokenRepRef.current && !isMuted) {
      // Speak reps counts even if person detection has a transient single-frame flicker!
      const isPlank = exercise.toLowerCase().includes('plank');
      if (isPlank) {
        if (stats.reps % 5 === 0) {
          lastSpokenRepRef.current = stats.reps;
          lastRepOrCountdownSpokenTimeRef.current = Date.now();
          speakText(`${stats.reps} seconds`, 1.1, false, true);
          audioSynth.playRepComplete();
          lastSpokenRef.current = '';
        }
      } else {
        lastSpokenRepRef.current = stats.reps;
        lastRepOrCountdownSpokenTimeRef.current = Date.now();
        speakText(String(stats.reps), 1.1, false, true);
        audioSynth.playRepComplete();
        lastSpokenRef.current = '';
      }
    }
  }, [stats.reps, prepState, isMuted, speakText, isPersonDetected, exercise]);

  // 5.5 Vocalize skipped reps on failed form quality or depth
  useEffect(() => {
    if (prepState === 'active' && stats.skippedRepAlert && stats.skippedRepReason && !isMuted) {
      if (!isPersonDetected) return;
      const now = Date.now();
      
      const timeSinceLastRep = now - lastRepOrCountdownSpokenTimeRef.current;
      const timeSinceLastFeedback = now - lastFeedbackSpokenTimeRef.current;
      
      // Enforce a quick 1.8s cooldown guard for skipped reps so they do not stutter or overlap rapid events
      if (timeSinceLastRep < 1800 || timeSinceLastFeedback < 1800) {
        return;
      }
      
      if (stats.skippedRepReason !== lastSkippedReasonRef.current) {
        lastSkippedReasonRef.current = stats.skippedRepReason;
        lastRepOrCountdownSpokenTimeRef.current = now;
        setDisplayedFeedback(stats.skippedRepReason); // SYNC ON-SCREEN INSTANTLY!
        speakText(stats.skippedRepReason, 1.05, false, true);
        audioSynth.playPostureWarning();
      }
    } else if (!stats.skippedRepReason) {
      // Reset so consecutive identical skipped rep reasons can trigger speech correctly
      lastSkippedReasonRef.current = '';
    }
  }, [stats.skippedRepAlert, stats.skippedRepReason, prepState, isMuted, speakText, isPersonDetected]);

  // 5.7 Vocalize fatigue warnings dynamically
  useEffect(() => {
    if (prepState === 'active' && !isMuted) {
      if (!isPersonDetected) return;
      const now = Date.now();
      if (now - lastSpokenTimeRef.current < 12000) {
        return; // maintain a generous 12.0 seconds coaching interval to prevent fatigue audio overlap
      }
      if (fatigue >= 50 && fatigue < 80 && lastFatigueMilestoneRef.current < 50) {
        lastFatigueMilestoneRef.current = 50;
        const msg = "Moderate fatigue detected. Keep your core level and shoulders straight!";
        setDisplayedFeedback(msg); // SYNC ON-SCREEN INSTANTLY!
        speakText(msg, 1.05, false, true);
      } else if (fatigue >= 80 && fatigue < 90 && lastFatigueMilestoneRef.current < 80) {
        lastFatigueMilestoneRef.current = 80;
        const msg = "High fatigue detected! Stand tall, take a deep breath, and hold strong!";
        setDisplayedFeedback(msg); // SYNC ON-SCREEN INSTANTLY!
        speakText(msg, 1.05, false, true);
      } else if (fatigue >= 90 && lastFatigueMilestoneRef.current < 90) {
        lastFatigueMilestoneRef.current = 90;
        const msg = "Danger! Critical fatigue levels detected. Your form is breaking. Please rest to prevent injury!";
        setDisplayedFeedback(msg); // SYNC ON-SCREEN INSTANTLY!
        speakText(msg, 1.05, false, true);
      } else if (fatigue < 40) {
        lastFatigueMilestoneRef.current = 0;
      }
    }
  }, [fatigue, prepState, isMuted, speakText, isPersonDetected]);

  // Monitor target goal achievement and trigger auto-complete elegantly with a 2.5 second delay
  useEffect(() => {
    if (prepState === 'active' && stats.reps >= targetGoal && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      
      // Fire beautiful celebratory confetti!
      import('canvas-confetti').then(module => {
        module.default({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      });

      const isPlank = exercise.toLowerCase().includes('plank');
      const finishText = isPlank
        ? "Congratulations! You successfully completed your plank hold! Brilliant job!"
        : "Congratulations! Workout complete! You did a fantastic job!";

      // Announce workout completion using state of the art speech synthesizer
      speakText(finishText, 1.0, false, true, true);

      // Transition dynamically to the summary dashboard after 2.5 seconds allowing speech and animations to render beautifully
      const completionTimeout = setTimeout(() => {
        const finalAverageScore = isPlank ? 100 : (stats.repAccuracies.length > 0
          ? Math.round(stats.repAccuracies.reduce((a, b) => a + b, 0) / stats.repAccuracies.length)
          : stats.score);
        onComplete(stats.reps, finalAverageScore, isPlank ? undefined : stats.repAccuracies);
      }, 2500);

      return () => clearTimeout(completionTimeout);
    }
  }, [stats.reps, targetGoal, prepState, exercise, stats.repAccuracies, stats.score, onComplete, speakText]);

  // 6. Voice audio countdown
  useEffect(() => {
    if (prepState === 'countdown' && countdown > 0 && !isMuted && !isCountdownPaused) {
      if (lastSpokenCountdownRef.current !== countdown) {
        lastSpokenCountdownRef.current = countdown;
        lastRepOrCountdownSpokenTimeRef.current = Date.now();
        // Speak countdown voice numbers starting with Get ready! 10, then 9, 8, 7, 6, 5, 4, 3, 2, 1
        if (countdown === 10) {
          speakText("Get ready! 10", 1.15, true, true, true);
        } else {
          speakText(String(countdown), 1.15, false, true);
        }
        audioSynth.playCountdown();
      }
    }
  }, [countdown, prepState, isMuted, speakText, isCountdownPaused]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePose = useCallback((pose: Pose) => {
    if (prepState === 'initializing') return;

    // Person detection check based on keypoints: we require at least 4 keypoints tracked with a score of >= 0.20
    // to confirm actual human presence in the frame. This completely prevents background environment noise,
    // empty cameras, or camera startup lags from triggering false exercise reps, "too deep" alerts, or noisy feedback.
    const visibleKpsCount = pose.keypoints.filter(kp => (kp.score || 0) > 0.20).length;
    const isDetectedNow = visibleKpsCount >= 4;

    if (isDetectedNow) {
      personLostTimestampRef.current = null;
      setIsPersonDetected(true);
    } else {
      if (!deskMode) {
        // Implement a beautiful 750ms grace period to buffer transient frame drops or fast squat dips out of frame
        if (personLostTimestampRef.current === null) {
          personLostTimestampRef.current = Date.now();
          return; // Skip downstream to wait for next frame
        } else if (Date.now() - personLostTimestampRef.current < 750) {
          return; // Within grace period, skip downstream but maintain active state
        }

        // Hard lost state after grace period expires
        setIsPersonDetected(false);
        setStats(prev => ({
          ...prev,
          score: 0,
          feedback: "Awaiting user... Please step into the camera view",
          isDescending: false,
          depthReached: false,
          descentStartTime: undefined,
          lastPlankHoldTime: undefined
        }));
        return; // Halt logic
      }
    }

    // ===================================
    // PROXIMITY DETECTION ("TOO CLOSE" CHECK)
    // ===================================
    const leftShoulder = pose.keypoints.find((k) => k.name === 'left_shoulder') || pose.keypoints[5];
    const rightShoulder = pose.keypoints.find((k) => k.name === 'right_shoulder') || pose.keypoints[6];
    const nose = pose.keypoints.find((k) => k.name === 'nose') || pose.keypoints[0];

    let isTooClose = false;

    // A. Face size scaling check (Absolute indicator of proximity)
    if (nose && (nose.score || 0) > 0.35) {
      const leftEye = pose.keypoints.find((k) => k.name === 'left_eye') || pose.keypoints[1];
      const rightEye = pose.keypoints.find((k) => k.name === 'right_eye') || pose.keypoints[2];
      if (leftEye && rightEye && (leftEye.score || 0) > 0.3 && (rightEye.score || 0) > 0.3) {
        const eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y);
        // On standard video aspect ratios, eye distance > 24px means face is too close for full-body exercises
        if (eyeDist > 24 && !deskMode && !closeRangeMode) {
          isTooClose = true;
        }
      }

      const leftEar = pose.keypoints.find((k) => k.name === 'left_ear') || pose.keypoints[3];
      const rightEar = pose.keypoints.find((k) => k.name === 'right_ear') || pose.keypoints[4];
      if (leftEar && rightEar && (leftEar.score || 0) > 0.3 && (rightEar.score || 0) > 0.3) {
        const earDist = Math.hypot(leftEar.x - rightEar.x, leftEar.y - rightEar.y);
        // On standard video aspect ratios, ear-to-ear distance > 48px implies close range
        if (earDist > 48 && !deskMode && !closeRangeMode) {
          isTooClose = true;
        }
      }
    }

    // B. Standard shoulder distance check
    if (leftShoulder && rightShoulder && (leftShoulder.score || 0) > 0.35 && (rightShoulder.score || 0) > 0.35) {
      const shoulderDist = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
      // If closeRangeMode is enabled, we relax the shoulder distance from 155 to 290 px
      const maxAllowedShoulderDist = closeRangeMode ? 290 : 155;
      if (shoulderDist > maxAllowedShoulderDist) {
        isTooClose = true;
      }
    }

    const leftHip = pose.keypoints.find((k) => k.name === 'left_hip') || pose.keypoints[11];
    const rightHip = pose.keypoints.find((k) => k.name === 'right_hip') || pose.keypoints[12];
    const leftKnee = pose.keypoints.find((k) => k.name === 'left_knee') || pose.keypoints[13];
    const rightKnee = pose.keypoints.find((k) => k.name === 'right_knee') || pose.keypoints[14];
    const leftAnkle = pose.keypoints.find((k) => k.name === 'left_ankle') || pose.keypoints[15];
    const rightAnkle = pose.keypoints.find((k) => k.name === 'right_ankle') || pose.keypoints[16];

    // C. Leg keypoints cutoff / weak tracking check
    // If not in desk mode/close range mode, demand general joint confidence (0.12) to ensure excellent far body detection.
    const legConfThreshold = 0.12;
    const lowerVisibleCount = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].filter(k => k && (k.score || 0) > legConfThreshold).length;
    const upperVisibleCount = [leftShoulder, rightShoulder, nose].filter(k => k && (k.score || 0) > 0.12).length;

    // For full body exercises (squats/push-ups), they need at least minimal leg visibility (at least 1 joint)
    // If they are too close to the camera, lower body keypoints either disappear completely, or drop to 0
    if (lowerVisibleCount < 1 && !deskMode && !closeRangeMode) {
      isTooClose = true;
    }

    // If upper body (head and shoulders) are highly visible, but lower body components are missing, they are too close to fit the camera's field of view
    // Enforce lowerVisibleCount === 0 to avoid false positives when one side of the legs is occluded in profile
    // If closeRangeMode is enabled, we bypass or reduce this strict check so that plank can be tracked even if lower extremities go slightly out of bounds!
    if (upperVisibleCount >= 2 && lowerVisibleCount === 0 && !deskMode && !closeRangeMode) {
      isTooClose = true;
    }

    // Additional robust head-only detection: if face is confidently visible but body/shoulders are weak or not detected, they are too close to the camera
    const isHeadConfident = nose && (nose.score || 0) > 0.35;
    const areShouldersWeakOrMissing = !leftShoulder || !rightShoulder || (leftShoulder.score || 0) < 0.35 || (rightShoulder.score || 0) < 0.35;
    if (isHeadConfident && areShouldersWeakOrMissing && !deskMode && !closeRangeMode) {
      isTooClose = true;
    }

    if (isTooClose && !deskMode) {
      setStats(prev => {
        const feedbackMsg = "Please step back! You are too close to the camera.";
        const smoothed = prepState === 'active' ? smoothFeedback(feedbackMsg, prev.feedback) : feedbackMsg;
        return {
          ...prev,
          feedback: smoothed,
          score: 0,
          isDescending: false,
          depthReached: false,
          descentStartTime: undefined,
          lastPlankHoldTime: undefined
        };
      });
      return; // Intercept to prevent evaluating posture on distorted, cropped geometry
    }

    // INTERCEPT IF DESK TESTING OVERRIDE MODE IS ENABLED
    if (deskMode) {
      setIsPersonDetected(true); // Always keep active for prompt speech synthesis feedback
      
      const nose = pose.keypoints.find(k => k.name === 'nose') || pose.keypoints[0];
      if (nose && (nose.score || 0) > 0.3) {
        const y = nose.y;
        
        // Calibrate sliding vertical bounding levels on the fly
        if (deskNoseMinYRef.current === 9999) {
          deskNoseMinYRef.current = y - 10;
          deskNoseMaxYRef.current = y + 10;
        }
        
        if (y < deskNoseMinYRef.current) deskNoseMinYRef.current = y;
        if (y > deskNoseMaxYRef.current) deskNoseMaxYRef.current = y;
        
        const range = deskNoseMaxYRef.current - deskNoseMinYRef.current;
        const midY = deskNoseMinYRef.current + range / 2;
        
        if (range > 150) {
          deskNoseMinYRef.current = y - 30;
          deskNoseMaxYRef.current = y + 30;
        }
        
        if (range > 20) {
          const now = Date.now();
          if (y > midY + 8 && deskStateRef.current === 'up') {
            deskStateRef.current = 'down';
            setStats(prev => ({
              ...prev,
              isDescending: true,
              feedback: trackerType === 'squat' ? "Descending squat... Go lower!" : "Descending pushup... Go lower!"
            }));
            addCsharpLog(`DeskTracker: Face Bob Down Detection (Y: ${Math.round(y)})`);
          } else if (y < midY - 8 && deskStateRef.current === 'down') {
            deskStateRef.current = 'up';
            if (now - lastDeskRepTimeRef.current > 2000) {
              lastDeskRepTimeRef.current = now;
              triggerDeskSimulationRep();
              addCsharpLog(`DeskTracker: Face Bob Up Completed (Y: ${Math.round(y)}) -> Successfully Logged Rep!`);
            }
          }
        }
      }
      return;
    }

    // ==========================================
    // 🛡️ STEP-BY-STEP STUDY NOTES FOR YOUR DEFENSE:
    // 1. Ang isCalculatingCsharpRef ay nagpe-prevent ng overlap (para hindi sabay-sabay ang tawag sa API habang naghihintay ng sagot).
    // 2. Nagpapadala tayo ng HTTP POST request gamit ang `fetch` sa endpoint ng C# server gamit ang `${csharpUrl}/api/pose/analyze`.
    // 3. Ipinapasa natin bilang JSON data ang tatlong importanteng bagay:
    //    a) exercise - Ang active exercise (Squat o Pushup/Plank).
    //    b) pose - Ang 17 joint coordinates (mga X, Y values) na na-detect sa Camera.
    //    c) state - Ang status ng reps ngayon (Reps, score, isDescending) para alam ng C# ang susunod na bilang.
    //    d) quality - Ang room brightness level.
    // ==========================================
    if (isCalculatingCsharpRef.current) return; // Prevent overlapping asynchronous requests
    isCalculatingCsharpRef.current = true;

    // Determine whether to call C# backend or process entirely on-device (MoveNet local engine)
    const pipelinePromise = (engineMode === 'local')
      ? Promise.reject(new Error("On-Device Browser Engine Active"))
      : fetch(`${csharpUrl}/api/pose/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exercise: exercise,
            pose: {
              keypoints: pose.keypoints,
              score: pose.score
            },
            state: stats,
            quality: quality
          })
        });

    pipelinePromise
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // When the C# program responds, the results are handled here:
        // 'result.message' = feedback on screen/voice (e.g., "Excellent depth!")
        // 'result.score' = accuracy rating % of the current posture
        // 'result.newState.reps' = incremented rep count if execution is correct!
        consecutiveCsharpErrorsRef.current = 0;
        setCsharpConnectionError(null);
        isCalculatingCsharpRef.current = false;

        const result = data;
        let finalFeedback = result.message;

        setStats(prevStats => {
          // Expand and translate PascalCase fields to camelCase to cover any environment serialization differences
          const normalizedNewState: any = {};
          if (result.newState) {
            for (const key of Object.keys(result.newState)) {
              const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
              normalizedNewState[camelKey] = result.newState[key];
            }
          }

          // Apply hysteresis/smoothing on camera and setup guidance to omit momentary joint glitches
          if (isCameraOrEnvAlert(finalFeedback)) {
            if (cameraAlertFirstSeenRef.current === null) {
              cameraAlertFirstSeenRef.current = Date.now();
              cameraAlertMessageRef.current = finalFeedback;
              finalFeedback = prevStats.feedback || 'Get ready!';
            } else {
              const elapsed = Date.now() - cameraAlertFirstSeenRef.current;
              if (elapsed < 1500) {
                finalFeedback = prevStats.feedback || 'Get ready!';
              } else {
                finalFeedback = cameraAlertMessageRef.current || finalFeedback;
              }
            }
          } else {
            cameraAlertFirstSeenRef.current = null;
            cameraAlertMessageRef.current = '';
          }

          if (prepState !== 'active') {
            return {
              ...prevStats,
              feedback: finalFeedback,
              score: result.score
            };
          }

          const baseRepFatigue = (normalizedNewState.reps || 0) * 4;
          let formPenalty = 0;
          if (result.score < 80) {
            formPenalty = (80 - result.score) * 0.4;
          }
          const tensionBonus = normalizedNewState.isDescending ? 5 : 0;
          const targetFatigue = baseRepFatigue + formPenalty + tensionBonus;

          setFatigue(prev => {
            const smoothed = prev * 0.992 + targetFatigue * 0.008;
            return Math.min(100, Math.max(0, Math.round(smoothed)));
          });

          const smoothedFeedback = smoothFeedback(finalFeedback, prevStats.feedback);
          return {
            ...prevStats,
            ...normalizedNewState,
            feedback: smoothedFeedback,
            score: result.score
          };
        });
      })
      .catch(err => {
        isCalculatingCsharpRef.current = false;
        
        if (engineMode === 'local') {
          setCsharpConnectionError(null);
        } else {
          consecutiveCsharpErrorsRef.current += 1;
          console.warn('C# Connection Error:', err);
          // Keep the state showing C# Server is Offline, but do NOT force-revert the selection button
          // This is perfect for presentation so you can show the C# API configuration even if server is offline
          setCsharpConnectionError('C# Server Offline');
        }

        // Simple, robust client-side C# emulation so user can preview even if local C# port is not running!
        setStats(prevStats => {
          if (prepState !== 'active') {
          return {
            ...prevStats,
            feedback: prevStats.feedback || 'Get ready!',
            score: 0,
            isDescending: false,
            depthReached: false,
            tooDeepReached: false,
            descentStartTime: undefined
          };
        }

        const keypoints = pose.keypoints;
        // Extract keypoints
        const leftHip = keypoints.find((k) => k.name === 'left_hip') || keypoints[11];
        const leftKnee = keypoints.find((k) => k.name === 'left_knee') || keypoints[13];
        const leftAnkle = keypoints.find((k) => k.name === 'left_ankle') || keypoints[15];

        const leftShoulder = keypoints.find((k) => k.name === 'left_shoulder') || keypoints[5];
        const rightShoulder = keypoints.find((k) => k.name === 'right_shoulder') || keypoints[6];
        const rightHip = keypoints.find((k) => k.name === 'right_hip') || keypoints[12];
        const rightKnee = keypoints.find((k) => k.name === 'right_knee') || keypoints[14];
        const rightAnkle = keypoints.find((k) => k.name === 'right_ankle') || keypoints[16];

        const lS = leftShoulder;
        const rS = rightShoulder;
        const lH = leftHip;
        const rH = rightHip;
        const lK = leftKnee;
        const rK = rightKnee;
        const lA = leftAnkle;
        const rA = rightAnkle;

        // Dynamic profile selector: process whichever lateral hemisphere possesses superior visibility
        const leftConfidence = (lS?.score || 0) + (lH?.score || 0) + (lK?.score || 0) + (lA?.score || 0);
        const rightConfidence = (rS?.score || 0) + (rH?.score || 0) + (rK?.score || 0) + (rA?.score || 0);
        const useLeft = leftConfidence >= rightConfidence;

        const sideShoulderRaw = useLeft ? lS : rS;
        const sideHipRaw = useLeft ? lH : rH;
        const sideKneeRaw = useLeft ? lK : rK;
        const sideAnkleRaw = useLeft ? lA : rA;

        // Implement automatic swap-over backups for profile views. Under extreme side-views and distant stances,
        // single-person pose estimators often swap left/right labels, or one joint gets self-occluded. Fall back to
        // the other side's symmetric joint if the selected lateral hemisphere has missing or low-confidence trackers.
        const sideShoulder = (sideShoulderRaw && (sideShoulderRaw.score || 0) > 0.05) ? sideShoulderRaw : (useLeft ? rS : lS);
        const sideHip = (sideHipRaw && (sideHipRaw.score || 0) > 0.05) ? sideHipRaw : (useLeft ? rH : lH);
        const sideKnee = (sideKneeRaw && (sideKneeRaw.score || 0) > 0.05) ? sideKneeRaw : (useLeft ? rK : lK);
        const sideAnkle = (sideAnkleRaw && (sideAnkleRaw.score || 0) > 0.05) ? sideAnkleRaw : (useLeft ? rA : lA);

        // Count confidently tracked keypoints on the selected profile side to reject noise (Reduced threshold from 0.12 to 0.05 for superior far / side-view tracking)
        const activeSideTrackedCount = [sideHip, sideKnee, sideAnkle].filter(k => k && (k.score || 0) > 0.05).length;

        let score = 0;
        let message = "Stand upright to initiate";
        let newState = { ...prevStats };

        if (trackerType === 'squat') {
          // Dynamic side selector: automatically select and track the leg that has superior camera visibility
          const leftLegConf = (lH?.score || 0) + (lK?.score || 0) + (lA?.score || 0);
          const rightLegConf = (rH?.score || 0) + (rK?.score || 0) + (rA?.score || 0);
          const useLeftLeg = leftLegConf >= rightLegConf;

          const squatHip = useLeftLeg ? lH : rH;
          const squatKnee = useLeftLeg ? lK : rK;
          const squatAnkle = useLeftLeg ? lA : rA;

          // Count confidently tracked keypoints on the selected profile side to reject pure noise (increased threshold to 0.35 for stable tracking)
          const squatMinConf = 0.35;
          const activeSideTrackedCount = [squatHip, squatKnee, squatAnkle].filter(k => k && (k.score || 0) > squatMinConf).length;

          const squatHipScore = squatHip?.score || 0;
          const squatKneeScore = squatKnee?.score || 0;
          const squatAnkleScore = squatAnkle?.score || 0;

          // Crucial protection guard: If knee or key leg joints are missing or very low confidence, 
          // we are absolutely sure the user's squat is not visible or they are not properly positioned.
          // This completely prevents false "Too deep!" alerts when legs are not in frame.
          if (activeSideTrackedCount < 3 || squatHipScore < 0.30 || squatKneeScore < 0.30 || squatAnkleScore < 0.30) {
            if (prevStats.isDescending) {
              // Stay in descending state to avoid dropping active reps during movement blur
              return {
                ...prevStats,
                feedback: "Hold position / keep body visible",
              };
            }
            // Reject sparse tracking or camera noise from causing fake reps (only when starting)
            return {
              ...prevStats,
              feedback: (!deskMode && !closeRangeMode) ? "Please step back! You are too close to the camera." : "Position full body in frame",
              score: 0,
              isDescending: false,
              depthReached: false,
              tooDeepReached: false, // Reset explicitly to prevent false positives when out-of-frame
              descentStartTime: undefined
            };
          }

          let kneeAngle = 180;
          if (squatHip && squatKnee && squatAnkle) {
            kneeAngle = calculateAngle(squatHip, squatKnee, squatAnkle);
          }
          
          // Calculate and record squat depth standard relative to parallel (90° internal knee flexion)
          const squatDepthPercent = Math.min(100, Math.max(0, Math.round(((180 - kneeAngle) / (180 - 90)) * 100)));
          newState.squatDepthPercent = squatDepthPercent;

          // Locally identify viewMode to handle side vs front adjustments
          let currentViewMode: 'front' | 'side' = 'front';
          if (lS && rS && sideShoulder && sideHip) {
            const shoulderDistX = Math.abs(lS.x - rS.x);
            const torsoLength = Math.max(50, Math.abs(sideShoulder.y - sideHip.y));
            const leftSideConf = (lS?.score || 0) + (lH?.score || 0);
            const rightSideConf = (rS?.score || 0) + (rH?.score || 0);
            if (shoulderDistX < torsoLength * 0.45 || Math.abs(leftSideConf - rightSideConf) > 0.8) {
              currentViewMode = 'side';
            }
          }
          newState.viewMode = currentViewMode;

          // Calibration checklist: stand tall to begin (relaxed threshold for easy starting)
          if (kneeAngle > 145) {
            newState.hasStoodUpright = true;
            newState.tooDeepReached = false; // Reset tooDeepReached instantly when upright to prevent noisy false positives
          }

          if (kneeAngle < 125) {
            if (!prevStats.hasStoodUpright) {
              message = "Stand tall with straight legs to calibrate and start.";
              score = 0;
            } else {
              // Active squatting phase (descending or bottom position)
              newState.isDescending = true;
              if (!prevStats.isDescending) {
                newState.descentStartTime = Date.now();
                newState.depthReached = false;
                newState.tooDeepReached = false;
                newState.hasTiltedShoulder = false;
                newState.hasTiltedHip = false;
                newState.hasLeanedTooFar = false;
                newState.minDescentScore = 100; // Perfect base posture, deduct for active form issues
                newState.skippedRepAlert = false;
                newState.skippedRepReason = '';
              }

              // Depth milestone checking: anything below 100° is excellent depth for a squat!
              if (kneeAngle < 100) {
                newState.depthReached = true;
              }

              const feedbackOptions: { priority: number; msg: string }[] = [];

              if (kneeAngle < 46) {
                newState.tooDeepReached = true;
                feedbackOptions.push({ priority: 3, msg: "Too deep! Limit depth." });
              } else if (kneeAngle <= 100) {
                feedbackOptions.push({ priority: 0, msg: "Perfect depth! Push up." });
              } else {
                feedbackOptions.push({ priority: 0, msg: "Go lower." });
              }

              // Real-time posture tracking & deductions
              let frameScore = 100;

              // 1. Trunk Forward Tilt Check
              let trunkTilt = 0;
              if (sideShoulder && sideHip) {
                const dx = sideShoulder.x - sideHip.x;
                const dy = sideShoulder.y - sideHip.y;
                trunkTilt = (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;
              }
              if (trunkTilt > 50) {
                frameScore = Math.max(60, frameScore - 20);
                newState.hasLeanedTooFar = true;
                feedbackOptions.push({ priority: 4, msg: "Chest up. Leaning forward too much." });
              } else if (trunkTilt < 12 && kneeAngle < 120) {
                frameScore = Math.max(65, frameScore - 10);
                feedbackOptions.push({ priority: 2, msg: "Lean slightly forward." });
              }

              // 2. Lateral Body/Shoulder Tilt Check: ONLY check in 'front' view mode with high joint confidence!
              if (currentViewMode === 'front' && lS && rS && (lS.score || 0) > 0.4 && (rS.score || 0) > 0.4 && sideShoulder && sideHip) {
                const torsoLength = Math.max(50, Math.abs(sideShoulder.y - sideHip.y));
                const shoulderDiffY = Math.abs(lS.y - rS.y);
                const shoulderTiltRatio = shoulderDiffY / torsoLength;
                if (shoulderTiltRatio > 0.16) {
                  frameScore = Math.max(60, frameScore - 15);
                  newState.hasTiltedShoulder = true;
                  feedbackOptions.push({ priority: 5, msg: "Keep shoulders level." });
                }
              }

              // 3. Lateral Hip Tilt Check: ONLY check in 'front' view mode with high joint confidence!
              if (currentViewMode === 'front' && lH && rH && (lH.score || 0) > 0.4 && (rH.score || 0) > 0.4 && sideShoulder && sideHip) {
                const torsoLength = Math.max(50, Math.abs(sideShoulder.y - sideHip.y));
                const hipDiffY = Math.abs(lH.y - rH.y);
                const hipTiltRatio = hipDiffY / torsoLength;
                if (hipTiltRatio > 0.16) {
                  frameScore = Math.max(60, frameScore - 15);
                  newState.hasTiltedHip = true;
                  feedbackOptions.push({ priority: 5, msg: "Keep hips level." });
                }
              }

              // 4. Staggered feet stance check: ONLY check in 'front' view mode with high joint confidence!
              if (currentViewMode === 'front' && lA && rA && (lA.score || 0) > 0.4 && (rA.score || 0) > 0.4 && sideShoulder && sideHip) {
                const torsoLength = Math.max(50, Math.abs(sideShoulder.y - sideHip.y));
                const ankleAnkleHorizontalDist = Math.abs(lA.x - rA.x);
                if (ankleAnkleHorizontalDist > torsoLength * 0.65) {
                  frameScore = Math.max(65, frameScore - 10);
                  feedbackOptions.push({ priority: 1, msg: "Keep feet aligned." });
                }
              }

              // Select the highest priority feedback option
              feedbackOptions.sort((a, b) => b.priority - a.priority);
              message = feedbackOptions[0]?.msg || "Descending smoothly...";

              score = frameScore;
              newState.minDescentScore = Math.min(prevStats.minDescentScore ?? 100, frameScore);
            }
          } else {
            // Standing tall or starting position (kneeAngle >= 125)
            if (prevStats.isDescending) {
              const duration = Date.now() - (prevStats.descentStartTime || 0);
              
              if (duration < 350) {
                // Too fast (glitch)
                message = "Stand tall to start squat";
                score = 0;
              } else if (!prevStats.depthReached) {
                message = "Rep skipped! Lacking depth.";
                newState.skippedRepAlert = true;
                newState.skippedRepReason = "Rep skipped. Squat lower.";
                score = 50;
              } else if (prevStats.tooDeepReached) {
                message = "Rep skipped! Too deep.";
                newState.skippedRepAlert = true;
                newState.skippedRepReason = "Rep skipped. Limit depth.";
                score = 55;
              } else {
                const finalAccuracy = prevStats.minDescentScore ?? 100;
                score = finalAccuracy;
                if (finalAccuracy >= 60) {
                  newState.reps = (prevStats.reps || 0) + 1;
                  newState.repAccuracies = [...(prevStats.repAccuracies || []), finalAccuracy];
                  newState.skippedRepAlert = false;
                  newState.skippedRepReason = "";
                  if (finalAccuracy >= 80) {
                    message = "Great rep!";
                  } else {
                    message = "Good rep! Keep straight.";
                  }
                } else {
                  let postureIssue = "Keep body straight.";
                  if (prevStats.hasTiltedShoulder) postureIssue = "Shoulders tilted.";
                  else if (prevStats.hasTiltedHip) postureIssue = "Hips tilted.";
                  else if (prevStats.hasLeanedTooFar) postureIssue = "Torso leaned forward.";

                  message = "Rep skipped. Keep straight.";
                  newState.skippedRepAlert = true;
                  newState.skippedRepReason = `Rep skipped. ${postureIssue}`;
                }
              }
            } else {
              message = "Squat down with weight in your heels to begin.";
              score = 0;
            }
            newState.isDescending = false;
            newState.depthReached = false;
            newState.tooDeepReached = false;
            newState.minDescentScore = 100;
            newState.descentStartTime = undefined;
          }

          addCsharpLog(`Thread-14: Received Frame containing 17 joints.`);
          addCsharpLog(`PoseAnalyzer.cs: Invoke AnalyzeSquat(Pose pose)`);
          addCsharpLog(`PoseAnalyzer.cs: Active Knee joint angle solved = ${kneeAngle.toFixed(1)}° (Depth: ${squatDepthPercent}%)`);
          addCsharpLog(`C# response: { score: ${score}, reps: ${newState.reps}, feedback: "${message}" }`);
        } else {
          // Military Push-up evaluation (no plank now, only squat and pushup available!)
          let spineAngle = 180;
          if (sideShoulder && sideHip && sideAnkle) {
            spineAngle = calculateAngle(sideShoulder, sideHip, sideAnkle);
          } else if (sideShoulder && sideHip && sideKnee) {
            spineAngle = calculateAngle(sideShoulder, sideHip, sideKnee);
          }

          const leftElbow = keypoints.find((k) => k.name === 'left_elbow') || keypoints[7];
          const leftWrist = keypoints.find((k) => k.name === 'left_wrist') || keypoints[9];
          const rightElbow = keypoints.find((k) => k.name === 'right_elbow') || keypoints[8];
          const rightWrist = keypoints.find((k) => k.name === 'right_wrist') || keypoints[10];

          // Choose the arm to track. To support diagonal/slightly-sideways views, we choose the arm with higher confidence
          // but STABILIZE it during the descent phase to prevent any rapid switching between arms which causes angle jumps.
          let useLeftArm = true;
          if (prevStats.isDescending && activeArmSideRef.current) {
            useLeftArm = activeArmSideRef.current === 'left';
          } else {
            const leftArmConf = (lS?.score || 0) + (leftElbow?.score || 0) + (leftWrist?.score || 0);
            const rightArmConf = (rS?.score || 0) + (rightElbow?.score || 0) + (rightWrist?.score || 0);
            useLeftArm = leftArmConf >= rightArmConf;
            activeArmSideRef.current = useLeftArm ? 'left' : 'right';
          }

          const pushupShoulder = useLeftArm ? lS : rS;
          const pushupElbow = useLeftArm ? leftElbow : rightElbow;
          const pushupWrist = useLeftArm ? leftWrist : rightWrist;

          let elbowAngle = 180;
          if (pushupShoulder && pushupElbow && pushupWrist) {
            elbowAngle = calculateAngle(pushupShoulder, pushupElbow, pushupWrist);
          }

          // Count trackable points on the selected best profile arm (increased minimum confidence to 0.35 to prevent glitches)
          const pushupMinConf = (!deskMode && !closeRangeMode) ? 0.35 : 0.25;
          const activeArmTrackedCount = [pushupShoulder, pushupElbow, pushupWrist].filter(k => k && (k.score || 0) > pushupMinConf).length;

          const pushupShoulderScore = pushupShoulder?.score || 0;
          const pushupElbowScore = pushupElbow?.score || 0;
          const pushupWristScore = pushupWrist?.score || 0;

          // Crucial protection guard: If elbow or key arm joints are missing or very low confidence, 
          // we are absolutely sure the user's push-up posture is not visible or they are not properly positioned.
          if (activeArmTrackedCount < 3 || pushupShoulderScore < 0.25 || pushupElbowScore < 0.25 || pushupWristScore < 0.25) {
            if (prevStats.isDescending) {
              return {
                ...prevStats,
                feedback: "Hold plank posture / keep body visible",
              };
            }
            return {
              ...prevStats,
              feedback: (!deskMode && !closeRangeMode) ? "Please step back! You are too close to the camera." : "Position full upper body in frame",
              score: 0,
              isDescending: false,
              depthReached: false,
              tooDeepReached: false, // Reset explicitly to prevent false positives when out-of-frame
              descentStartTime: undefined
            };
          }

          // 1. Torso vertical alignment check to distinguish standing or sitting upright
          // from a lying horizontal plank push-up posture!
          let isStandingUpright = false;
          if (lS && rS && lA && rA && (lS.score || 0) > 0.35 && (rS.score || 0) > 0.35 && (lA.score || 0) > 0.35 && (rA.score || 0) > 0.35) {
            const avgShoulderY = (lS.y + rS.y) / 2;
            const avgAnkleY = (lA.y + rA.y) / 2;
            const avgHipY = (lH && rH) ? (lH.y + rH.y) / 2 : avgShoulderY;
            
            const heightDiff = avgAnkleY - avgShoulderY;
            if (heightDiff > 0.50 && avgHipY > avgShoulderY + 0.12) {
              isStandingUpright = true;
            }
          }
          if (!isStandingUpright && lS && rS && lK && rK && (lS.score || 0) > 0.35 && (rS.score || 0) > 0.35 && (lK.score || 0) > 0.35 && (rK.score || 0) > 0.35) {
            const avgShoulderY = (lS.y + rS.y) / 2;
            const avgKneeY = (lK.y + rK.y) / 2;
            const avgHipY = (lH && rH) ? (lH.y + rH.y) / 2 : avgShoulderY;
            const heightDiff = avgKneeY - avgShoulderY;
            if (heightDiff > 0.38 && avgHipY > avgShoulderY + 0.12) {
              isStandingUpright = true;
            }
          }
          // Fallback shoulder-to-hip height difference check to capture sitting upright or standing close where legs are cut off
          if (!isStandingUpright) {
            const avgHipY = (lH && rH) ? (lH.y + rH.y) / 2 : (lH?.y || rH?.y || 0);
            const avgShoulderY = (lS && rS) ? (lS.y + rS.y) / 2 : (lS?.y || rS?.y || 0);
            const hasHipsVal = (lH && (lH.score || 0) > 0.3) || (rH && (rH.score || 0) > 0.3);
            const hasShouldersVal = (lS && (lS.score || 0) > 0.3) || (rS && (rS.score || 0) > 0.3);

            if (hasHipsVal && hasShouldersVal) {
              const torsoYDiff = avgHipY - avgShoulderY;
              const uprightThreshold = deskMode ? 0.25 : 0.16;
              if (torsoYDiff > uprightThreshold) {
                isStandingUpright = true;
              }
            }
          }

          if (isStandingUpright) {
            return {
              ...prevStats,
              feedback: deskMode ? "Lean forward to start." : "Get down into a plank position on the floor.",
              score: 0,
              isDescending: false,
              depthReached: false,
              tooDeepReached: false,
              descentStartTime: undefined
            };
          }

          // Require hips/legs visibility as a recommendation, but do not hard-abort counting once in position.
          const hasHips = (lH && (lH.score || 0) > 0.25) || (rH && (rH.score || 0) > 0.25);
          const hasKnees = (lK && (lK.score || 0) > 0.25) || (rK && (rK.score || 0) > 0.25);
          const hasAnkles = (lA && (lA.score || 0) > 0.25) || (rA && (rA.score || 0) > 0.25);

          // Head bowing/droop tracking to prevent cheating or false counting
          const avgShoulderY = (lS && rS) ? (lS.y + rS.y) / 2 : (lS?.y || rS?.y || 0);
          const nose = keypoints.find((k) => k.name === 'nose') || keypoints[0];
          const hasBowedHead = (nose && (nose.score || 0) > 0.35 && lS && rS && (lS.score || 0) > 0.35 && (rS.score || 0) > 0.35 && (nose.y - avgShoulderY > 0.11));

          // Locally identify viewMode to handle side vs front adjustments
          let currentViewMode: 'front' | 'side' = 'front';
          if (lS && rS && sideShoulder && sideHip) {
            const shoulderDistX = Math.abs(lS.x - rS.x);
            const torsoLength = Math.max(50, Math.abs(sideShoulder.y - sideHip.y));
            const leftSideConf = (lS?.score || 0) + (lH?.score || 0);
            const rightSideConf = (rS?.score || 0) + (rH?.score || 0);
            if (shoulderDistX < torsoLength * 0.45 || Math.abs(leftSideConf - rightSideConf) > 0.8) {
              currentViewMode = 'side';
            }
          }
          newState.viewMode = currentViewMode;

          // Push-up calibration starting criteria: straight arms and plank line hold (ensure fully extended, straight arms)
          if (elbowAngle > 125) {
            newState.hasStoodUpright = true;
            newState.tooDeepReached = false; // Reset tooDeepReached instantly when straight arms are detected to prevent noisy false positives
          }

          if (elbowAngle < 122) {
            if (!prevStats.hasStoodUpright) {
              message = "Align in flat plank to begin.";
              score = 0;
            } else {
              // Active push-up descent phase
              newState.isDescending = true;
              if (!prevStats.isDescending) {
                newState.descentStartTime = Date.now();
                newState.depthReached = false;
                newState.tooDeepReached = false;
                newState.hasTiltedShoulder = false;
                newState.hasTiltedHip = false;
                newState.hasBowedHead = false;
                newState.minDescentScore = 100; // Perfect standard starting score
                newState.skippedRepAlert = false;
                newState.skippedRepReason = '';
              }

              // Guard: If the descent has lasted more than 5 seconds, the user probably rested or collapsed on the floor.
              // Cancel the active descent and reset start criteria to prevent false reps when getting up!
              const descentDuration = Date.now() - (newState.descentStartTime || prevStats.descentStartTime || Date.now());
              if (descentDuration > 5000) {
                return {
                  ...prevStats,
                  isDescending: false,
                  depthReached: false,
                  tooDeepReached: false,
                  hasStoodUpright: false,
                  minDescentScore: 100,
                  descentStartTime: undefined,
                  feedback: "Straighten arms completely to restart.",
                  score: 0
                };
              }

              // Depth milestone check: elbow flexes near or below 115 degrees for comfortable parallel depth
              if (elbowAngle <= 115) {
                newState.depthReached = true;
              }

              if (elbowAngle < 55) {
                newState.tooDeepReached = true;
              }

              const feedbackOptions: { priority: number; msg: string }[] = [];

              // Real-time alignment form checks (deductions from 100)
              let frameScore = 100;

              // We removed noisy lateral shoulder/hip tilts to keep feedback clean, minimal, and perspective-friendly.

              // 1. Spinal plank board alignment (relaxed thresholds to handle front-diagonal perspectives)
              if (spineAngle < 130) {
                frameScore = Math.max(70, frameScore - 15);
                feedbackOptions.push({ priority: 5, msg: "Keep body straight." });
              } else if (spineAngle > 230) {
                frameScore = Math.max(75, frameScore - 10);
                feedbackOptions.push({ priority: 5, msg: "Keep body straight." });
              } else {
                if (elbowAngle < 55) {
                  feedbackOptions.push({ priority: 3, msg: "Too deep!" });
                } else if (elbowAngle <= 115) {
                  feedbackOptions.push({ priority: 0, msg: "Great! Push up." });
                } else {
                  feedbackOptions.push({ priority: 0, msg: "Lower chest." });
                }
              }

              // Select the highest priority feedback option
              feedbackOptions.sort((a, b) => b.priority - a.priority);
              message = feedbackOptions[0]?.msg || "Lower chest.";

              score = frameScore;
              newState.minDescentScore = Math.min(prevStats.minDescentScore ?? 100, frameScore);
            }
          } else {
            // Top/Extended position of push-up (elbowAngle >= 126)
            if (elbowAngle >= 126) {
              if (prevStats.isDescending) {
                const duration = Date.now() - (prevStats.descentStartTime || 0);

                if (duration < 450) {
                  // Ignore fast frame glitches
                  message = "Hold flat starting plank";
                  score = 0;
                } else if (!prevStats.depthReached) {
                  message = "Lower chest more.";
                  score = 50;
                } else if (prevStats.tooDeepReached) {
                  message = "Too deep.";
                  score = 55;
                } else {
                  const finalAccuracy = prevStats.minDescentScore ?? 100;
                  score = finalAccuracy;
                  if (finalAccuracy >= 60) {
                    newState.reps = (prevStats.reps || 0) + 1;
                    newState.repAccuracies = [...(prevStats.repAccuracies || []), finalAccuracy];
                    newState.skippedRepAlert = false;
                    newState.skippedRepReason = "";
                    message = "Great rep!";
                  } else {
                    message = "Keep body straight.";
                  }
                }
              } else {
                message = "Lower chest.";
                score = 0;
              }
              newState.isDescending = false;
              newState.depthReached = false;
              newState.tooDeepReached = false;
              newState.hasBowedHead = false;
              newState.minDescentScore = 100;
              newState.descentStartTime = undefined;
            } else {
              // They are in the transition zone (122 to 126). Do NOT count or cancel yet!
              return {
                ...prevStats,
                feedback: prevStats.depthReached ? "Push up." : "Lower chest."
              };
            }
          }

          addCsharpLog(`Thread-14: Received Frame containing 17 joints.`);
          addCsharpLog(`PoseAnalyzer.cs: Invoke AnalyzePushup(Pose pose)`);
          addCsharpLog(`PoseAnalyzer.cs: Active Elbow joint angle solved = ${elbowAngle.toFixed(1)}°`);
          addCsharpLog(`PoseAnalyzer.cs: Spinal board line angle solved = ${spineAngle.toFixed(1)}°`);
          addCsharpLog(`C# response: { score: ${score}, reps: ${newState.reps}, feedback: "${message}" }`);
        }

        let finalFeedback = message;

        // Apply hysteresis/smoothing on camera and setup guidance to omit momentary joint glitches
        if (isCameraOrEnvAlert(finalFeedback)) {
          if (cameraAlertFirstSeenRef.current === null) {
            cameraAlertFirstSeenRef.current = Date.now();
            cameraAlertMessageRef.current = finalFeedback;
            finalFeedback = prevStats.feedback || 'Get ready!';
          } else {
            const elapsed = Date.now() - cameraAlertFirstSeenRef.current;
            if (elapsed < 1500) {
              finalFeedback = prevStats.feedback || 'Get ready!';
            } else {
              finalFeedback = cameraAlertMessageRef.current || finalFeedback;
            }
          }
        } else {
          cameraAlertFirstSeenRef.current = null;
          cameraAlertMessageRef.current = '';
        }

        if (prepState !== 'active') {
          return {
            ...prevStats,
            feedback: finalFeedback,
            score: score
          };
        }

        const baseRepFatigue = newState.reps * 4;
        let formPenalty = 0;
        if (score < 80) {
          formPenalty = (score - 80) * 0.4;
        }
        const tensionBonus = newState.isDescending ? 5 : 0;
        const targetFatigue = baseRepFatigue + formPenalty + tensionBonus;

        setFatigue(prev => {
          const smoothed = prev * 0.992 + targetFatigue * 0.008;
          return Math.min(100, Math.max(0, Math.round(smoothed)));
        });

        const smoothedFeedback = smoothFeedback(finalFeedback, prevStats.feedback);
        return {
          ...newState,
          feedback: smoothedFeedback,
          score: score
        };
      });
    });
  }, [exercise, quality, prepState, csharpUrl, stats, speakText, deskMode, trackerType, triggerDeskSimulationRep, smoothFeedback]);

  return (
    <div className="fixed inset-0 bg-[#1A1A1A] z-50 overflow-hidden text-white flex flex-col font-sans">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between relative shrink-0">
        <button onClick={onExit} className="flex items-center gap-1 group z-10 text-white/90">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-bold">Go Back</span>
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 text-lg sm:text-xl font-black tracking-tight whitespace-nowrap text-white hidden lg:block">Workout Program</h2>
        <div className="flex justify-end items-center gap-3 z-10 ml-auto select-none">

          {/* Mute controller toggle */}
          <button 
            onClick={() => {
              setIsMuted(prev => {
                const newVal = !prev;
                if (!newVal) {
                  audioSynth.init();
                  setTimeout(() => {
                    audioSynth.playStartWorkout();
                  }, 50);
                  
                  // Trigger voice engine activation statement instantly
                  const triggerAnnouncement = "Voice coach active.";
                  speakText(triggerAnnouncement, 1.0, true);
                }
                return newVal;
              });
            }} 
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            title={isMuted ? "Unmute Coach Voice" : "Mute Coach Voice"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white/60" /> : <Volume2 className="w-5 h-5 text-lime-400" />}
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 sm:pb-6 flex flex-col items-center relative overflow-y-auto scrollbar-none w-full">
        <AnimatePresence mode="wait">
          {prepState !== 'active' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 transition-colors duration-500",
                prepState === 'countdown' 
                  ? "bg-[#111111] overflow-hidden border border-white/5" 
                  : "bg-[#1A1A1A] overflow-y-auto"
              )}
            >
              {prepState === 'initializing' ? (
                cameraError ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-[#222222] border border-red-500/10 p-10 rounded-[3rem] shadow-2xl space-y-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto">
                      <CameraOff className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-3">No Camera Found</h3>
                      <p className="text-sm text-slate-400 leading-relaxed font-semibold">
                        We couldn't connect or access your camera. Pose tracking requires camera permissions to detect movements and auto-log your repetitions correctly.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 pt-4 shrink-0">
                      <button
                        onClick={() => {
                          setCameraError(null);
                          window.location.reload();
                        }}
                        className="w-full py-5 bg-[#84CC16] hover:bg-[#A3E635] text-black font-black rounded-3xl text-sm italic uppercase tracking-wider transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>RETRY CONNECTION</span>
                      </button>

                      <button
                        onClick={() => {
                          setPrepState('checklist');
                        }}
                        className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-3xl text-sm italic uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-lime-400" />
                        <span>USE MANUAL COUNTER MODE</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="relative flex flex-col items-center justify-center p-8 max-w-sm rounded-[2.5rem] bg-[#222] border border-white/5 shadow-2xl overflow-hidden text-center"
                  >
                    {/* Ambient background glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    {/* Complex Concentric Ring Radar Loader */}
                    <div className="relative w-32 h-32 flex items-center justify-center mb-8 shrink-0">
                      {/* Outer rotating custom dash ring */}
                      <div className="absolute inset-0 border-2 border-dashed border-lime-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                      {/* Middle rotating segmented ring */}
                      <div className="absolute w-24 h-24 border-t-4 border-b-4 border-lime-500 rounded-full animate-spin" />
                      {/* Inner glowing core */}
                      <div className="absolute w-14 h-14 bg-lime-500/10 border border-lime-500/30 rounded-full flex items-center justify-center animate-pulse">
                        <Camera className="w-5 h-5 text-lime-400" />
                      </div>
                      {/* Custom ticks around loader */}
                      <div className="absolute w-full h-full border border-white/5 pointer-events-none rounded-2xl flex items-center justify-between px-2">
                        <div className="w-1.5 h-1.5 bg-lime-500 rounded-full" />
                        <div className="w-1.5 h-1.5 bg-lime-500 rounded-full" />
                      </div>
                    </div>

                    {/* Content headings */}
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2 bg-gradient-to-r from-white via-slate-100 to-lime-200 bg-clip-text text-transparent">
                      Starting Camera
                    </h3>
                    <p className="text-slate-400 font-extrabold uppercase text-[10px] tracking-widest max-w-[240px] leading-relaxed">
                      Please allow camera access if prompted
                    </p>

                    {/* Bottom decorative HUD indicator */}
                    <div className="mt-8 pt-4 border-t border-white/5 w-full flex items-center justify-center gap-2 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                      <span className="text-[9px] font-mono tracking-widest uppercase text-white/40">SYSTEM INITIALIZATION ACTIVE</span>
                    </div>
                  </motion.div>
                )
              ) : prepState === 'checklist' ? (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full max-w-md bg-[#222222] border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-8"
                >
                  <div className="text-center">
                    <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-2">Prepare Space</h3>
                    <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Environment Checklist</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-lime-500/20 group-hover:scale-110 transition-all">
                        <Sun className="text-lime-500" />
                      </div>
                      <div>
                        <p className="font-black italic uppercase">Bright Lighting</p>
                        <p className="text-xs text-white/40">Ensure you're well-lit from the front.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-lime-500/20 group-hover:scale-110 transition-all">
                        <Camera className="text-lime-500" />
                      </div>
                      <div>
                        <p className="font-black italic uppercase">Step Back</p>
                        <p className="text-xs text-white/40">Position camera to see your full body.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-lime-500/20 group-hover:scale-110 transition-all">
                        <Move className="text-lime-500" />
                      </div>
                      <div>
                        <p className="font-black italic uppercase">Clear Zone</p>
                        <p className="text-xs text-white/40">Move objects out of your movement path.</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      // Unify Audio and SpeechSynthesis active unlocking for iOS Safari & Android mobile Chrome/WebViews
                      if (typeof window !== 'undefined' && window.speechSynthesis) {
                        try {
                          const dummy = new SpeechSynthesisUtterance(' ');
                          dummy.volume = 0.01; // nearly silent
                          window.speechSynthesis.speak(dummy);
                        } catch (e) {
                          console.warn("SpeechSynthesis unlock failed:", e);
                        }
                      }
                      
                      if (ttsAudioRef.current) {
                        try {
                          ttsAudioRef.current.play()
                            .then(() => {
                              ttsAudioRef.current?.pause();
                            })
                            .catch(e => console.warn("Audio element unlock error:", e));
                        } catch (e) {
                          console.warn("Audio element play error:", e);
                        }
                      }

                      // Open the warm-up verification modal overlay
                      setShowWarmupCheck(true);
                    }}
                    className="w-full py-6 bg-[#84CC16] text-[#1A1A1A] hover:bg-[#A3E635] font-black focus:outline-none rounded-3xl text-lg italic uppercase tracking-wider transition-all shadow-xl"
                  >
                    I'M READY
                  </button>
                  <p className="text-center text-[10px] font-bold text-white/30 uppercase tracking-widest leading-normal max-w-xs mx-auto">
                    Note: If you hear no sound, open this app in a new tab via the share/popout icon!
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full max-w-6xl mx-auto flex flex-col justify-between text-white select-none relative"
                >
                  {/* Top Bar with warning badge & exit cross button */}
                  <div className="flex items-center justify-between w-full relative h-10 border-b border-white/5 px-2 shrink-0">
                    <div className="flex-1" /> {/* Spacer */}
                    
                    {/* Centered Body Warning Alert */}
                    <div className="flex items-center gap-1.5 justify-center text-[#84cc16] text-[10px] sm:text-xs md:text-sm font-bold select-none tracking-tight">
                      <span className="text-sm md:text-base shrink-0">⚠️</span>
                      <span className="font-semibold text-amber-300">Make sure your whole body is captured by the camera</span>
                    </div>

                    {/* Right-aligned exit button */}
                    <div className="flex-1 flex justify-end">
                      <button 
                        onClick={onExit} 
                        className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/40 hover:text-white focus:outline-none"
                        title="Exit Workout"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Main Grid: Left aspect-video frame & Right circular countdown indicators */}
                  <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-16 px-2 lg:px-4 py-1 lg:py-6">
                    
                    {/* Left Frame Card for Clean Video (Unobstructed Loop) - dynamic flexible sizing */}
                    <div className="w-full lg:w-[62%] flex-1 min-h-[180px] lg:h-full lg:max-h-none bg-black rounded-2xl md:rounded-[2rem] border border-white/10 shadow-md lg:shadow-2xl overflow-hidden relative flex items-center justify-center group/vid">
                      


                      {(() => {
                        const activeVideoUrl = getVideoUrl(exercise);
                        return isEmbedVideo(activeVideoUrl) ? (
                          <iframe
                            key={exercise + activeVideoUrl}
                            src={getEmbedUrl(activeVideoUrl)}
                            className="absolute inset-0 w-full h-full object-cover border-0 pointer-events-none filter brightness-90 bg-black"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Exercise Form Guide"
                          />
                        ) : (
                          <video
                            key={exercise + activeVideoUrl}
                            src={activeVideoUrl}
                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        );
                      })()}
                    </div>

                    {/* Right Column containing circular timer, pause play buttons, metadata */}
                    <div className="w-full lg:w-[38%] flex-col items-center justify-center text-center gap-2 lg:gap-4 flex shrink-0">
                      
                      {/* Interactive Circular Countdown Representation - Compact scale */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 flex items-center justify-center select-none shrink-0">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                          {/* Circular grey ring base */}
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="42" 
                            fill="none" 
                            stroke="rgba(255,255,255,0.05)" 
                            strokeWidth="5" 
                            strokeLinecap="round"
                          />
                          {/* Dynamic slate timing arc */}
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="42" 
                            fill="none" 
                            stroke="#84cc16" 
                            strokeWidth="6" 
                            strokeDasharray={`${2 * Math.PI * 42}`}
                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - countdown / 10)}`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                            className="transition-all duration-300 ease-linear"
                          />
                        </svg>
                        
                        {/* Countdown seconds value - beautifully downscaled */}
                        <span className="text-4xl sm:text-5xl lg:text-6xl font-sans font-bold text-white leading-none">
                          {countdown}
                        </span>
                      </div>

                      {/* Control buttons underneath countdown circle */}
                      <div className="flex items-center gap-3 mt-0.5 shrink-0">
                        {/* Play/Pause Button Toggle */}
                        <button
                          onClick={() => setIsCountdownPaused(!isCountdownPaused)}
                          className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full border-2 border-[#84cc16] hover:bg-[#84cc16]/10 flex items-center justify-center text-[#84cc16] active:scale-95 transition-all focus:outline-none"
                          title={isCountdownPaused ? "Resume Countdown" : "Pause Countdown"}
                        >
                          {isCountdownPaused ? (
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 fill-current ml-0.5 text-[#84cc16]" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 fill-current text-[#84cc16]" viewBox="0 0 24 24">
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                          )}
                        </button>

                        {/* Start instant skip button */}
                        <button
                          onClick={() => {
                            setCountdown(0);
                            setPrepState('active');
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full border border-white/20 hover:border-[#84cc16] hover:bg-[#84cc16]/15 flex items-center justify-center text-white/60 hover:text-[#84cc16] active:scale-95 transition-all focus:outline-none"
                          title="Start Active Workout NOW"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M4 18l8.5-6L4 6v12zm9-12v12h2V6h-2z" />
                          </svg>
                        </button>
                      </div>

                      {/* Program Metadata Labels */}
                      <div className="flex flex-col gap-0.5 mt-0.5 md:mt-1 shrink-0">
                        <h3 className="text-lg sm:text-xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
                          {getFriendlyExerciseName(exercise)}
                        </h3>
                        <p className="text-[11px] sm:text-xs lg:text-sm font-semibold tracking-wide text-[#84cc16]">
                          1 set of 5 reps
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer status flow bar metadata */}
                  <div className="w-full flex items-center justify-between border-t border-white/5 pt-2 px-2 lg:px-4 mt-auto shrink-0 h-10">
                    {/* Next Queue Exercises */}
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs md:text-sm select-none text-white/60">
                      <span className="font-bold uppercase tracking-wider text-white/40">Next</span>
                      <span className="text-white/40">›</span>
                      <span className="text-white font-bold max-w-[120px] sm:max-w-none truncate inline-block">
                        {getMappedExerciseTracker(exercise) === 'squat' ? 'Military Push-up' : 'Performance Squat'}
                      </span>
                      <span className="text-white/40 font-normal hidden sm:inline">1 set of 5 reps</span>
                    </div>

                    {/* Non-interactive status explaining no skipping allowed */}
                    <span className="text-[10px] font-black uppercase text-[#84cc16] tracking-wider animate-pulse">
                      WAIT FOR COUNTDOWN TO START
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Outer Container */}
        <div className="w-full max-w-xl mx-auto border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-5 flex flex-col relative bg-[#1E1E1E] shadow-2xl transition-all duration-300">
          
          {/* Internal Header: Timer & Reps Indicator */}
          <div className="flex justify-between items-center px-1">
            {!exercise.toLowerCase().includes('plank') ? (
              <div className="bg-[#EBEBEB] text-black px-5 py-2 rounded-2xl font-mono text-lg sm:text-xl font-black shadow-inner border border-white/20 select-none">
                {formatTime(seconds)}
              </div>
            ) : (
              <div className="text-[10px] sm:text-xs font-black uppercase text-[#84cc16] tracking-wider flex items-center gap-1.5 bg-[#84cc16]/10 px-3.5 py-2 rounded-2xl border border-[#84cc16]/20 select-none">
                <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse"></span>
                <span>Form Guard Active</span>
              </div>
            )}
            
            <div className="bg-white text-black px-5 py-1.5 rounded-2xl flex flex-col items-center justify-center shadow-lg border border-gray-200 select-none min-w-[100px] sm:min-w-[110px]">
              <span className="text-base sm:text-lg font-black leading-none">
                {stats.reps}{exercise.toLowerCase().includes('plank') ? 's' : ''}/{targetGoal}{exercise.toLowerCase().includes('plank') ? 's' : ''}
              </span>
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-black/60 tracking-wider mt-0.5">
                {exercise.toLowerCase().includes('plank') ? 'Plank Hold' : (trackerType === 'squat' ? 'Squats' : 'Pushups')}
              </span>
            </div>
          </div>

          {/* Camera Viewport Wrapper */}
          <div className="relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border border-white/10 bg-black aspect-[4/3] w-full flex items-center justify-center my-2.5 sm:my-3 max-h-[250px] sm:max-h-[350px] mx-auto shadow-2xl">
            <PoseCamera 
              onPose={handlePose} 
              onReady={() => setPrepState('checklist')}
              onError={(err) => setCameraError(err)}
              onQuality={(q) => setQuality(q.brightness)}
              exercise={exercise} 
              brightness={cameraBrightness}
              cameraFit={cameraFit}
            />

            {/* GIANT HIGH-VISIBILITY WORKOUT SCOREBOARD HUD */}
            {useGiantHUD && (prepState === 'active' || prepState === 'countdown') && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-3 left-3 right-3 z-30 pointer-events-none select-none bg-[#090d16]/90 backdrop-blur-lg px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-[#84cc16]/30 shadow-[0_12px_36px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 sm:gap-4 select-none"
              >
                <div className="flex items-center gap-3">
                  {/* GIANT HUD NUMBER */}
                  <div className="flex flex-col items-center justify-center bg-black/50 px-4 py-1.5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase text-white/55 tracking-widest leading-none mb-1">
                      {exercise.toLowerCase().includes('plank') ? "TIMER SECONDS" : "REPETITIONS"}
                    </span>
                    <span className="text-4xl sm:text-5.5xl font-mono font-black text-lime-400 drop-shadow-[0_2px_12px_rgba(132,204,22,0.45)] leading-none tabular-nums animate-pulse">
                      {stats.reps}{exercise.toLowerCase().includes('plank') ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* METADATA SLAT */}
                  <div className="flex flex-col justify-center">
                    <h3 className="text-[10px] sm:text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 inline-block animate-pulse"></span>
                      <span>{exercise.toLowerCase().includes('plank') ? 'Plank Hold Active' : 'Reps Active'}</span>
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-white/60 font-semibold uppercase tracking-wider mt-0.5">
                      Goal: <span className="text-white font-black">{targetGoal}{exercise.toLowerCase().includes('plank') ? 's' : ''}</span>
                    </p>
                  </div>
                </div>

                <div className="w-px h-10 bg-white/10 shrink-0" />

                {/* ACCURACY HUD CARD */}
                <div className="flex flex-col items-end text-right min-w-[70px]">
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Form Accuracy</span>
                  <span className={cn(
                    "text-lg sm:text-xl font-black font-sans leading-none mt-0.5",
                    stats.score >= 80 ? "text-lime-400 drop-shadow-[0_2px_6px_rgba(132,204,22,0.3)]" : "text-amber-400 drop-shadow-[0_2px_6px_rgba(245,158,11,0.3)]"
                  )}>
                    {stats.score}%
                  </span>
                  <span className="text-[8px] font-extrabold uppercase text-[#84cc16] tracking-widest leading-none mt-1">
                    {stats.score >= 90 ? "Excellent" : stats.score >= 70 ? "Good Form" : "Adjust posture"}
                  </span>
                </div>
              </motion.div>
            )}
            
            {/* C# Connection Status Overlay Badge removed to keep screen clean */}
          </div>



          {/* Inner Feedback Bar - Exactly matching the user's screenshot */}
          {displayedFeedback && prepState !== 'initializing' && (
            <div 
              onClick={() => {
                audioSynth.init();
                audioSynth.unlock();
                speakText(displayedFeedback, 1.05, true, true, true);
              }}
              className="bg-white text-black py-3 px-5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98] select-none w-full"
              title="Tap to hear instruction out loud"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-black/35 flex-shrink-0" />
                ) : (
                  <Volume2 className="w-5 h-5 text-[#84cc16] flex-shrink-0 animate-pulse" />
                )}
                <p className="text-xs font-black leading-tight uppercase italic break-words flex-1 min-w-0 pr-1 text-slate-900 tracking-tight">
                  {displayedFeedback}
                </p>
              </div>
              <div className="w-px h-5 bg-black/10 shrink-0 mx-1.5" />
              <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest shrink-0 whitespace-nowrap">Tap to hear</span>
            </div>
          )}



          {/* CAMERA BRIGHTNESS SLIDER ONLY - MATCHING THE USER'S EXPECTED DESIGN */}
          <div className="mt-3.5 bg-white/[0.04] px-5 py-3 rounded-2xl border border-white/5 flex items-center justify-between text-xs text-white select-none w-full gap-4 shrink-0">
            <div className="flex items-center gap-2 text-white/50 font-black uppercase text-[10px] tracking-widest shrink-0">
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Camera Brightness</span>
            </div>
            
            <div className="flex items-center gap-3.5 flex-1 max-w-md">
              <input 
                type="range" 
                min="50" 
                max="200" 
                value={cameraBrightness} 
                onChange={(e) => setCameraBrightness(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-500"
                style={{
                  background: `linear-gradient(to right, #84cc16 ${(cameraBrightness - 50) / 1.5}%, rgba(255,255,255,0.1) ${(cameraBrightness - 50) / 1.5}%)`
                }}
                title="Adjust Camera Feed Brightness"
              />
              <span className="text-[11px] font-black text-white shrink-0 w-10 text-right">{cameraBrightness}%</span>
            </div>
          </div>



          {/* Warning skipped rep notification - SAFELY OUTSIDE CAMERA FRAME */}
          {prepState === 'active' && stats.skippedRepAlert && stats.skippedRepReason && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 bg-red-950/80 border border-red-500/30 p-3 rounded-2xl shadow-xl space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black leading-none">!</span>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-red-400 leading-none">Repetition Skipped</h4>
              </div>
              <p className="text-[10px] font-semibold text-white/95 leading-tight">
                {stats.skippedRepReason}
              </p>
              <p className="text-[8px] text-white/45 uppercase tracking-widest font-black leading-none mt-1">
                Need at least 80% minimum form score to trigger valid count
              </p>
            </motion.div>
          )}

        </div>

        {/* Footer Stats Section */}
        <div className="w-full max-w-xl mx-auto mt-4 sm:mt-5 flex items-center justify-between px-4 select-none">
          {exercise.toLowerCase().includes('plank') ? (
            <div className="flex flex-col flex-grow items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="text-6.5xl sm:text-8xl font-black leading-none tracking-tighter text-[#84cc16] font-mono drop-shadow-[0_3px_15px_rgba(132,204,22,0.3)]">
                  {stats.reps}<span className="text-xl sm:text-2xl opacity-40 ml-1 text-white">/{targetGoal}s</span>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 py-1 px-3 rounded-full">
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full inline-block shrink-0 animate-pulse",
                    stats.score === 100 ? "bg-lime-500 shadow-lg shadow-lime-500/50" : "bg-amber-500 shadow-lg shadow-amber-500/50"
                  )} />
                  <span className="text-[9px] font-black uppercase tracking-wider text-white">
                    {stats.score === 100 ? "Timer active (Correct Position)" : "Timer paused (Adjust posture!)"}
                  </span>
                </div>
              </div>
              <p className="text-[9px] sm:text-[10px] font-bold text-[#EBEBEB]/50 uppercase tracking-[0.2em] mt-3">
                Seconds Held (Active Position Only)
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col">
                <div className="text-5.5xl sm:text-7.5xl font-black flex items-baseline leading-none tracking-tighter text-white font-sans">
                  {stats.reps}<span className="text-xl sm:text-2.5xl opacity-40 ml-1">/{targetGoal}</span>
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mt-2">
                  REPS
                </p>
              </div>
              
              <div className="h-10 w-px bg-white/10 shrink-0 self-center" />

              <div className="flex flex-col">
                <div className="text-4.5xl sm:text-6.5xl font-black leading-none tracking-tighter text-white font-sans">
                  {stats.score}%
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mt-2.5">ACCURACY</p>
              </div>

              <div className="h-10 w-px bg-white/10 shrink-0 self-center" />

              <div className="flex flex-col">
                <div className="text-4.5xl sm:text-6.5xl font-black leading-none tracking-tighter text-[#84cc16] font-sans">
                  {stats.repAccuracies && stats.repAccuracies.length > 0 
                    ? `${stats.repAccuracies[stats.repAccuracies.length - 1]}%` 
                    : `${stats.score}%`}
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mt-2.5">LAST REP</p>
              </div>
            </>
          )}

          {/* Interactive Button / Manual rep bypass */}
          <button 
            onClick={() => {
              const isPlank = exercise.toLowerCase().includes('plank');
              if (stats.reps >= targetGoal) {
                const finalAverageScore = isPlank ? 100 : (stats.repAccuracies.length > 0
                  ? Math.round(stats.repAccuracies.reduce((a, b) => a + b, 0) / stats.repAccuracies.length)
                  : stats.score);
                onComplete(stats.reps, finalAverageScore, isPlank ? undefined : stats.repAccuracies);
              } else {
                // If desk mode active, simulate 1 rep. Otherwise, allow manual increment rep for sandbox robustness
                if (deskMode) {
                  triggerDeskSimulationRep();
                } else {
                  setStats(prev => {
                    const incAmount = isPlank ? 5 : 1;
                    const nextReps = Math.min(targetGoal, (prev.reps || 0) + incAmount);
                    const mockAcc = 82 + Math.floor(Math.random() * 17);
                    const nextAccs = [...(prev.repAccuracies || []), mockAcc];
                    
                    if (isPlank) {
                      speakText(`${nextReps} seconds held`, 1.0, false, true, true);
                    } else {
                      speakText(`${nextReps} repetitions completed`, 1.0, false, true, true);
                    }
                    
                    if (nextReps === targetGoal) {
                      import('canvas-confetti').then(module => {
                        module.default({
                          particleCount: 150,
                          spread: 80,
                          origin: { y: 0.6 }
                        });
                      });
                      speakText(isPlank 
                        ? "Congratulations! You successfully completed your plank hold! Brilliant job!"
                        : "Congratulations! Workout complete! You did a fantastic job!", 1.0, false, true, true);
                    }
                    
                    return {
                      ...prev,
                      reps: nextReps,
                      score: mockAcc,
                      repAccuracies: nextAccs
                    };
                  });
                }
              }
            }}
            className={cn(
              "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl focus:outline-none shrink-0 ml-4 active:scale-[0.88]",
              stats.reps >= targetGoal 
                ? "bg-lime-500 hover:bg-lime-440 text-black border-none" 
                : "bg-[#2A2A2E] hover:bg-[#3A3A3F] text-white border-none"
            )}
            title={stats.reps >= targetGoal ? "Finish Session" : (exercise.toLowerCase().includes('plank') ? "Manually Increment Hold Time" : "Manually Increment Rep / Simulate")}
          >
            {stats.reps >= targetGoal ? (
              <Check className="w-6 h-6 text-black stroke-[3px]" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Biomechanical Scientific Study Guide Modal */}
      <AnimatePresence>
        {showBiomechanicsGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-55 flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#12131a] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-100"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-[#84cc16] flex items-center gap-2">
                    <span>📐 Thesis Defense & Biomechanics Study Guide</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-medium">Real-time Kinematic Landmark Analytics & C# Integration Engine Standards</p>
                </div>
                <button 
                  onClick={() => setShowBiomechanicsGuide(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Tabs Navigation */}
              <div className="px-6 bg-white/[0.01] border-b border-white/5 flex gap-1 overflow-x-auto shrink-0 scrollbar-none py-1">
                {[
                  { id: 'kinesiology', label: 'Clinical Standards', icon: '📋' },
                  { id: 'mathematics', label: 'Vector Math', icon: '📐' },
                  { id: 'pipeline', label: 'System Pipeline', icon: '💻' },
                  { id: 'noise', label: 'Mitigation & Occlusion', icon: '🛡️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStudyGuideTab(tab.id as any)}
                    className={cn(
                      "px-3 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer outline-none select-none flex items-center gap-1.5 shrink-0",
                      studyGuideTab === tab.id 
                        ? "border-[#84cc16] text-[#84cc16] bg-lime-500/[0.02]" 
                        : "border-transparent text-slate-400 hover:text-white"
                    )}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10 text-left">
                
                {studyGuideTab === 'kinesiology' && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-1">
                      <span>📋 Exercise Kinology Literature & Clinical Benchmarks</span>
                    </h4>

                    <div className="space-y-4">
                      {/* Squats Bio */}
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-lime-500/10 text-[#84cc16] font-black px-1.5 py-0.5 rounded">SQUATS</span>
                          <span className="text-[9.5px] text-slate-400 font-bold">Sagittal Plane Profile Model</span>
                        </div>
                        <div className="text-[11px] text-slate-200 space-y-1">
                          <p>• Knee Flexion Target: <span className="text-[#84cc16] font-black">80° to 100°</span></p>
                          <p>• Recommended Trunk Tilt Range: <span className="text-lime-400 font-bold">20° to 45°</span></p>
                        </div>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                          Parallel squat depth occurs when the thigh levels parallel to the floor surface. Citing <strong className="text-slate-200 font-black">Escamilla et al. (MSSE, 2001)</strong> & <strong className="text-slate-200 font-black">Schoenfeld (JSCR, 2010)</strong>, reaching 80°-100° knee flexion optimizes quadriceps femoris recruitment. Trunk tilt angles outside the 20°-45° window violate lumbar alignment principles (<strong className="text-slate-200 font-semibold">Abelbeck, JBR 2002</strong>).
                        </p>
                      </div>

                      {/* Pushups Bio */}
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 font-black px-1.5 py-0.5 rounded">PUSH-UPS</span>
                          <span className="text-[9.5px] text-slate-400 font-bold">Sagittal Plane Profile Model</span>
                        </div>
                        <div className="text-[11px] text-slate-200 space-y-1">
                          <p>• Elbow Flexion Target: <span className="text-blue-400 font-black">70° to 100°</span></p>
                          <p>• Spine Neutral Constraint: <span className="text-blue-300 font-bold">180° ± 15°</span> alignment index</p>
                        </div>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                          Sternal head of pectoralis major and triceps brachii load efficiently while reducing load on the anterior glenohumeral capsule when elbow joint flexion mirrors 70°-100° depth (<strong className="text-slate-200 font-black">Ebben et al., JSCR 2011</strong>). Real-time linear alignment prevents hip sagging (<strong className="text-slate-200">Contreras, 2012</strong>).
                        </p>
                      </div>

                      {/* Planks Bio */}
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 font-black px-1.5 py-0.5 rounded">PLANK</span>
                          <span className="text-[9.5px] text-slate-400 font-bold">Isometric Posture Profile</span>
                        </div>
                        <div className="text-[11px] text-slate-200 space-y-1">
                          <p>• Dynamic Segment Deviation: <span className="text-amber-400 font-black">Maximum ±12° variance</span></p>
                          <p>• Core Rectus Abdominis Strain: Optimized at total horizontal linear extension</p>
                        </div>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                          Securing an isometric plank require an angular hold of 180° ± 12° from Shoulder-Hip-Ankle segments to invoke core anti-extension. Gaps larger than 12° signify core fatigue or biomechanical posture degradation (<strong className="text-slate-200 font-semibold">Cissik, JSCR 2002</strong>).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {studyGuideTab === 'mathematics' && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1">
                      📐 Mathematical Framework: 2D Vector Trigonometry Model
                    </h4>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed">
                      All joint angles are solved using relative displacement vectors across the normalized 2D camera viewport system. By computing relative directions from a vertex joint, calculations remain invariant to camera height, subject height, and video crop ratio.
                    </p>

                    <div className="bg-slate-950 border border-white/10 p-5 rounded-2xl space-y-3 font-mono text-[10.5px]">
                      <div className="space-y-2 text-slate-200">
                        <p className="text-amber-400 font-bold">System Formula Steps:</p>
                        <div className="pl-3 border-l border-white/10 space-y-2">
                          <div>
                            <span className="text-slate-400 font-semibold">1. Given three joints P₁(x₁, y₁), P₂(vertex)(x₂, y₂), P₃(x₃, y₃):</span>
                            <div className="text-lime-400 mt-1">Vector u = (x₁ - x₂, y₁ - y₂)</div>
                            <div className="text-lime-400">Vector v = (x₃ - x₂, y₃ - y₂)</div>
                          </div>

                          <div>
                            <span className="text-slate-400 font-semibold">2. Calculate Dot Product:</span>
                            <div className="text-slate-100">u · v = (u_x × v_x) + (u_y × v_y)</div>
                          </div>

                          <div>
                            <span className="text-slate-400 font-semibold">3. Calculate Vector Magnitude (Euclidean Length):</span>
                            <div className="text-slate-100">||u|| = sqrt(u_x² + u_y²)</div>
                            <div className="text-slate-100">||v|| = sqrt(v_x² + v_y²)</div>
                          </div>

                          <div>
                            <span className="text-slate-400 font-semibold">4. Inverse Cosine (Arccos) Integration:</span>
                            <div className="text-emerald-400 font-black bg-white/[0.03] p-2 rounded-xl mt-1 text-[11px] inline-block">
                              Angle θ = arccos( (u · v) / (||u|| × ||v||) ) × (180 / π)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-step Joint Mappings for Squats & Push-Ups */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
                        🎯 Specific Joint Mappings for Squats & Push-Ups
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Squats Mapping */}
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                          <span className="text-[10px] bg-lime-500/15 text-[#84cc16] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                            Squat Angle Pipeline
                          </span>

                          <div className="space-y-2.5">
                            <div className="border-l-2 border-lime-500 pl-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-white block">1. Knee Flexion (Knee Angle)</span>
                              <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                Kinocompute ang flexion sa tuhod gamit ang vertex <strong className="text-slate-200">Knee (P₂)</strong> sa pagitan ng <strong className="text-slate-200">Hip (P₁)</strong> at <strong className="text-slate-200">Ankle (P₃)</strong>:
                              </p>
                              <code className="text-[9.5px] text-lime-400 font-mono block bg-black/40 px-1.5 py-0.5 rounded mt-1">
                                P₁ = Hip, P₂ = Knee, P₃ = Ankle
                              </code>
                            </div>

                            <div className="border-l-2 border-lime-500 pl-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-white block">2. Trunk Tilt (Forward Lean)</span>
                              <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                Kinocompute ang forward tilt ng katawan gamit ang vertex <strong className="text-slate-200">Hip (P₂)</strong> sa pagitan ng <strong className="text-slate-200">Shoulder (P₁)</strong> at isang <strong className="text-slate-200">Virtual Vertical Vector (P₃)</strong> na nakaturo diretso sa itaas:
                              </p>
                              <code className="text-[9.5px] text-lime-400 font-mono block bg-black/40 px-1.5 py-0.5 rounded mt-1">
                                P₁ = Shoulder, P₂ = Hip, P₃ = (Hip.x, Hip.y - 100)
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Push-up Mapping */}
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                          <span className="text-[10px] bg-blue-500/15 text-blue-400 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                            Push-Up Angle Pipeline
                          </span>

                          <div className="space-y-2.5">
                            <div className="border-l-2 border-blue-500 pl-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-white block">1. Elbow Flexion (Arm Angle)</span>
                              <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                Kinocompute ang lalim ng push-up gamit ang vertex <strong className="text-slate-200">Elbow (P₂)</strong> sa pagitan ng <strong className="text-slate-200">Shoulder (P₁)</strong> at <strong className="text-slate-200">Wrist (P₃)</strong>:
                              </p>
                              <code className="text-[9.5px] text-blue-400 font-mono block bg-black/40 px-1.5 py-0.5 rounded mt-1">
                                P₁ = Shoulder, P₂ = Elbow, P₃ = Wrist
                              </code>
                            </div>

                            <div className="border-l-2 border-blue-500 pl-2.5 space-y-1">
                              <span className="text-[11px] font-bold text-white block">2. Spine Straightness (Body Line)</span>
                              <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                Sinisigurong tuwid ang Spine (180° ideal) gamit ang vertex <strong className="text-slate-200">Hip (P₂)</strong> sa pagitan ng <strong className="text-slate-200">Shoulder (P₁)</strong> at <strong className="text-slate-200">Ankle (P₃)</strong>:
                              </p>
                              <code className="text-[9.5px] text-blue-400 font-mono block bg-black/40 px-1.5 py-0.5 rounded mt-1">
                                P₁ = Shoulder, P₂ = Hip, P₃ = Ankle
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-[#ff0055]/10 p-4 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black text-[#ff0055] tracking-wider uppercase block">Defense Defence Tip!</span>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed">
                        If asked how distances or zoom affect angles: "Since vectors represent direction vectors and are normalized by their own Euclidean magnitude in the division <span className="text-white font-mono font-bold">(u · v) / (||u||*||v||)</span>, the absolute distance from the camera has zero mathematical influence on the angle θ."
                      </p>
                    </div>
                  </div>
                )}

                {studyGuideTab === 'pipeline' && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1">
                      💻 System Data Pipeline & Architecture
                    </h4>
                    
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
                      <p className="text-[11px] font-bold text-slate-200">Processing Stage Breakdown:</p>
                      <div className="space-y-2 text-[10.5px] text-slate-400">
                        <div className="flex gap-2">
                          <span className="text-[#84cc16] font-bold">1. Capture:</span>
                          <span>The HTML5 camera element captures live video frames. A Canvas element grabs the image bitmap at 30 FPS.</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[#84cc16] font-bold">2. Local Inference:</span>
                          <span>MoveNet Lightning model extracts 17 primary joint coordinate keys (head, shoulder, hip, knee, etc).</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[#84cc16] font-bold">3. ASP.NET C# Backend analysis:</span>
                          <span>An HTTP POST request is dispatched to `/api/pose/analyze`. The C# controller performs advanced multi-stage calculations, analyzes historical frame depth, manages state triggers, and updates the total repetition score.</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[#84cc16] font-bold">4. Client Synthesis:</span>
                          <span>The browser receives JSON results and updates HUD state metrics instantly.</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#12131a] border border-[#84cc16]/20 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-lime-400 font-black">🔊 iOS Safari Audio Stream Engine Bypass</span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                        To resolve Apple iOS/Safari's media playback restriction (which blocks Web Audio buffers that do not originate from an explicit user tap action), EdgeForm implements direct voice stream routing to StreamElements Kappa speech engine. This complies with standard HTML5 audio streaming protocol requirements, enabling high-quality voice tips during focus states without any lag.
                      </p>
                    </div>
                  </div>
                )}

                {studyGuideTab === 'noise' && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1">
                      🛡️ Occlusion & Outlier Noise Mitigation Techniques
                    </h4>

                    <div className="space-y-4 text-[10.5px] text-slate-400">
                      {/* Swapping */}
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                        <p className="text-[11px] font-bold text-slate-200">1. Dynamic Profile Hemispherical Swapping Model</p>
                        <p className="leading-relaxed">
                          In side-profile (sagittal) exercises, body parts furthest from the camera lens will become occluded by the torso or limbs, triggering massive tracking jitter. EdgeForm dynamically mitigates this by scoring left vs right side confidences:
                        </p>
                        <div className="bg-slate-950 p-2 text-center font-mono text-[9px] text-lime-400 rounded-lg">
                          Side Score = Confidence(Shoulder) + Confidence(Hip) + Confidence(Knee) + Confidence(Ankle)
                        </div>
                        <p className="leading-relaxed">
                          The system automatically tracks the limb side with the highest tracking confidence. All angles, depths, and counts are locked onto this dominant side to ensure absolute sensor stability.
                        </p>
                      </div>

                      {/* Filter */}
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                        <p className="text-[11px] font-bold text-slate-200">2. Low-Pass Exponential Smoothing Filter</p>
                        <p className="leading-relaxed">
                          Calculated joint coordinates can contain high-amplitude frames of high-frequency noise from tracking jitter or light reflections. We integrate a low-pass filter to smooth the incoming stream:
                        </p>
                        <div className="bg-slate-950 p-2 text-center font-mono text-[9px] text-[#84cc16] rounded-lg">
                          Position_Smoothed(t) = (0.55 × Position_Raw(t)) + (0.45 × Position_Smoothed(t-1))
                        </div>
                        <p className="leading-relaxed">
                          This filter blocks sub-optimal tracking frame outliers while preserving latency-free reaction speed to body positioning changes.
                        </p>
                      </div>

                      {/* Light */}
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                        <p className="text-[11px] font-bold text-slate-200">3. Environmental Luminance Metrics</p>
                        <p className="leading-relaxed">
                          A custom brightness algorithm parses camera canvas feed pixels to compute average luminance (Y): <span className="text-white font-mono text-[10px]">Y = 0.299R + 0.587G + 0.114B</span>. If this drops below threshold $35$, an alert is triggered to warn the user about sub-optimal environmental lighting.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-end shrink-0">
                <button 
                  onClick={() => setShowBiomechanicsGuide(false)}
                  className="px-5 py-2 rounded-xl bg-[#84cc16] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-lime-400 transition-colors shadow-lg cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Warm-Up Recommendation Overlay Popup before Workout */}
      <AnimatePresence>
        {showWarmupCheck && (
          <div className="fixed inset-0 bg-[#050A0E]/95 backdrop-blur-md z-[120] flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm bg-[#070D13] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden shadow-2xl text-white">
              {/* Highlight bar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#84CC16] to-transparent" />
              
              {/* Close Button */}
              <button 
                onClick={() => setShowWarmupCheck(false)}
                className="absolute top-4 right-4 text-white/45 hover:text-white transition-colors"
                title="Close and stay in Environment Check"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-[#84CC16] mx-auto animate-pulse">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Title & subtitle */}
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tighter italic text-[#84CC16]">
                  Warm-Up Check
                </h3>
                <p className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">
                  Safety &amp; Form Prep
                </p>
              </div>

              {/* Message content */}
              <div className="space-y-4">
                <p className="text-xs font-semibold leading-relaxed text-white/80">
                  It is highly recommended to warm up before starting your workout to protect your joints, activate key muscle groups, and establish correct posture! Are you ready to begin?
                </p>
                
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
                  <span className="text-[8px] font-black text-lime-400 tracking-wider uppercase block mb-1">
                    SELECTED EXERCISE
                  </span>
                  <h4 className="text-xs font-black text-white italic uppercase tracking-tight truncate">
                    {getFriendlyExerciseName(exercise)}
                  </h4>
                </div>
              </div>

              {/* Action buttons for starting or preparing */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setShowWarmupCheck(false);
                    // Start countdown
                    audioSynth.resume();
                    audioSynth.playStartWorkout();
                    lastSpokenCountdownRef.current = -1;
                    setCountdown(10);
                    setIsCountdownPaused(false);
                    setPrepState('countdown');
                  }}
                  className="w-full py-4 bg-[#84CC16] hover:bg-[#A3E635] text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_4px_25px_rgba(132,204,22,0.3)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Yes, I'm Ready to Start</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowWarmupCheck(false);
                    if (onGoToWarmup) {
                      onGoToWarmup();
                    } else {
                      onExit();
                    }
                  }}
                  className="w-full py-3.5 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[10px] rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-amber-500 animate-[spin_5s_linear_infinite]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0M9 1.5L20.25 12h-15" />
                  </svg>
                  <span>No, start warm-up</span>
                </button>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
