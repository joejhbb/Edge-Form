// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (APP.TSX):
// 
// 1. ANG PINUNO O ROOT ROUTER (Central Navigator):
//    - Ang `App.tsx` ang "Conductor ng Orchestra" ng buong System. Ito ang root component ng React application.
//    - Nagpapanatili ito ng sentral na `view` state na nagsisilbing Virtual Router ('splash' -> 'onboarding' -> 'auth' -> etc.).
// 
// 2. PAANO GUMAGANA ANG USER-SESSION & PRE-CLEARING MECHANISM?
//    - Sa simula ng pag-mount (via `useEffect`), sinisiguro ng `App.tsx` na nabubura ang mga antigong demo logs gamit ang version keys.
//    - Binabasa nito ang persistent profile mula sa LocalStorage (`edgeform_profile`) upang awtomatikong mai-log in ang gumagamit.
// 
// 3. WORKOUT LOGGER MECHANISM:
//    - Kapag natapos ang active training session sa `WorkoutView`, ang statistics data (reps, score, and repAccuracies arrays) ay sinasala rito.
//    - Ito ang responsable sa pag-append o pagdaragdag ng session logs sa email-keyed workout database cache bago i-load ang `Summary` view.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppView, ExerciseType, UserProfile } from './types.ts';
import Dashboard from './views/Dashboard.tsx';
import Splash from './views/Splash.tsx';
import OnboardingSlides from './views/OnboardingSlides.tsx';
import SetupFlow from './views/SetupFlow.tsx';
import ExerciseSelect from './views/ExerciseSelect.tsx';
import WorkoutView from './views/WorkoutView.tsx';
import Auth from './views/Auth.tsx';
import Summary from './views/Summary.tsx';
import WarmupView from './views/WarmupView.tsx';
import FuelView from './views/FuelView.tsx';
import ProgressView from './views/ProgressView.tsx';
import ProfileView from './views/ProfileView.tsx';
import { audioSynth } from './lib/audioSynth.ts';
import { Zap, LogOut } from 'lucide-react';

export default function App() {
  // 1. Dito idinedeklara ang bawat State variables na namamahala sa buong buhay ng application.
  const [view, setView] = useState<AppView>('splash'); // 'view' - ang kasalukuyang active screen na ipinapakita sa browser.
  const [profile, setProfile] = useState<UserProfile | null>(null); // 'profile' - ang detalye ng naka-login na user (edad, timbang, taas, goal).
  const [currentExercise, setCurrentExercise] = useState<ExerciseType | null>(null); // 'currentExercise' - ang pinapantakbong workout mode (e.g. Squat o Pushup).
  const [tempAuthData, setTempAuthData] = useState<{ email?: string; name?: string; password?: string } | null>(null); // 'tempAuthData' - pansamantalang data habang nasa Setup Flow.
  const [completedStats, setCompletedStats] = useState<{ reps: number; score: number } | null>(null); // 'completedStats' - naitatalang reps at pose score pagkatapos mag-ehersisyo.
  const [exercisePendingWarmup, setExercisePendingWarmup] = useState<ExerciseType | null>(null); // 'exercisePendingWarmup' - nagho-hold ng workout kapag kailangan pa mag-warmup.
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // 'showLogoutConfirm' - toggle para sa pop-up confirm box sa pag-logout.

  // 2. Ang kauna-unahang hook na tumatakbo sa system bootup.
  useEffect(() => {
    // Ido-download at ihahanda ang dynamic speech synthesizer assets para handang magsalita ang coach nang walang lag.
    audioSynth.preloadCountdown();

    // Global user interaction unlock listener to bypass browser/mobile security autoplay policies for Audio & SpeechSynthesis
    const unlockAudio = () => {
      audioSynth.unlock();
      // Remove listeners once unlocked
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('mousedown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Isa itong special version cleaner para linisin ang mga lumang placeholder account data kung meron man.
    const hasClearedOldAccounts = localStorage.getItem('edgeform_has_cleared_old_accounts_v2');
    if (!hasClearedOldAccounts) {
      localStorage.removeItem('edgeform_registered_users'); // Burahin ang unstable structure.
      localStorage.removeItem('edgeform_profile');          // Burahin ang lumang dummy profile.
      localStorage.setItem('edgeform_has_cleared_old_accounts_v2', 'true'); // Lagyan ng tapos-na flag.
    }

    // Basahin ang dinalang identity ng user mula sa local storage database ng web browser.
    const savedProfile = localStorage.getItem('edgeform_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile); // I-convert ang text patungong readable Javascript Object.
        setProfile(parsed); // I-save sa centralized react state ang user profile.
        
        // Auto-register sa bagong local database schema kung wala pa ito sa built-in system registry.
        if (parsed.email) {
          const emailKey = parsed.email.toLowerCase().trim(); // I-sanitize ang text (gawing lowercase at tanggalin ang spaces).
          const registeredRaw = localStorage.getItem('edgeform_registered_users');
          const registeredUsers = registeredRaw ? JSON.parse(registeredRaw) : {};
          if (!registeredUsers[emailKey]) {
            registeredUsers[emailKey] = parsed; // Idagdag ang user sa multi-user array registry.
            localStorage.setItem('edgeform_registered_users', JSON.stringify(registeredUsers)); // I-save pabalik sa browser local database.
          }
        }
      } catch (e) {
        console.error(e); // Mag-print ng error console trace kapag nagkaroon ng depekto sa json format.
      }
    }
  }, []); // Ang [] array ibig sabihin ay isang beses lang tatakbo ang block na ito upon app startup.

  // 3. Security Guard Hook: Tinitiyak na walang pwedeng makapasok sa Dashboard at Workout kung walang validated account!
  useEffect(() => {
    const publicViews = ['splash', 'onboarding', 'auth', 'profile_setup']; // Listahan ng mga screens na pinapahintulutang makita ng kahit sino.
    if (!profile && !tempAuthData && !publicViews.includes(view)) {
      setView('auth'); // Kung walang active user, pilit syang ibabalik ng system sa Login screen.
    }
  }, [view, profile, tempAuthData]); // Tatakbo sa tuwing may magbabago sa view, profile, o tempAuthData status.

  // 4. Controller Method: Pinapangasiwaan ang transisyon sa pagitan ng pagpili ng routine, warm-up, o diretso sa tracking.
  const handleStartWorkout = (exercise: ExerciseType) => {
    // Siyasatin kung ang routine ay kabilang sa supported real-time computer vision models (Performance Squat o Military Pushup).
    const isAllowed = exercise === 'performance_squat' || exercise === 'military_pushup';
    if (!isAllowed) {
      setView('exercise_select'); // Kung hindi suportado, ibalik muna sya sa Exercise Selection Screen.
      return;
    }
    // Siyasatin kung nakapagsagawa na ng dynamic warm-up ang user ngayong araw.
    const hasWarmedUp = localStorage.getItem('edgeform_warmed_up') === 'true';
    if (!hasWarmedUp) {
      setExercisePendingWarmup(exercise); // Kung hindi pa, i-hold muna ang training at i-trigger ang warm-up proposal dialogue!
    } else {
      setCurrentExercise(exercise); // Kung nag-warmup na, i-save ang target routine.
      setView('workout'); // At simulan na agad ang Live pose estimation tracking loop!
    }
  };

  // 5. Account Auth Handler: Nagpapagana sa user sign-in process.
  const handleLogin = (email: string, password?: string) => {
    const emailKey = email.toLowerCase().trim(); // Linisin ang email text para maging standardized database lookup index.
    const registeredRaw = localStorage.getItem('edgeform_registered_users');
    const registeredUsers = registeredRaw ? JSON.parse(registeredRaw) : {};
    
    // Kung wala pang ganitong rehistradong user sa device, awtomatiko silang gagawan ng default profile para sa madaling onboarding.
    if (!registeredUsers[emailKey]) {
      const defaultUser: UserProfile = {
        name: email.split('@')[0], // Gamitin ang text bago ang '@' symbol bilang pansamantalang pangalan ng user.
        email: email,
        password: password || '',
        gender: 'male',
        age: 28,
        weight: 70, // Default baseline parameters na gagamitin sa calculation algorithms.
        height: 175,
        goal: 'muscle_gain',
        activityLevel: 'intermediate'
      };
      registeredUsers[emailKey] = defaultUser;
      localStorage.setItem('edgeform_registered_users', JSON.stringify(registeredUsers)); // I-save ang default user record.
    }
    
    const savedUser = registeredUsers[emailKey];
    // I-update ang password record kung sakaling may bagong input
    if (password && savedUser.password !== password) {
      savedUser.password = password;
      registeredUsers[emailKey] = savedUser;
      localStorage.setItem('edgeform_registered_users', JSON.stringify(registeredUsers));
    }
    
    setProfile(savedUser); // I-save ang active profile sa React global state memory.
    localStorage.setItem('edgeform_profile', JSON.stringify(savedUser)); // Itakda ang active local storage cookie session.
    setView('dashboard'); // Papasukin na ang user sa primary dashboard.
    return { success: true };
  };

  // 6. Registration Gateway: Nagsisimula sa onboarding registration flow at pinatatakbo ang profile customizer.
  const handleRegisterStart = (email: string, name: string, password?: string) => {
    setTempAuthData({ email, name: name || email.split('@')[0], password }); // I-map ang screen inputs sa temp memory state.
    setView('profile_setup'); // Ilipat ang view sa physiological setup steps.
  };

  // 7. Profile Setup Callback: Tinatawag kapag natapos ng user ang stepwise questionnaire details (weight, height, and pain issues).
  const handleSetupComplete = (newProfile: UserProfile) => {
    // Pagsamahin ang pansamantalang authentication credentials at nakuhang biometric data.
    const mergedProfile = {
      ...newProfile,
      name: tempAuthData?.name || newProfile.name || 'User',
      email: tempAuthData?.email || newProfile.email || 'user@example.com',
      password: tempAuthData?.password || ''
    };
    setProfile(mergedProfile); // I-set bilang opisyal na active session profile ng gumagamit.
    localStorage.setItem('edgeform_profile', JSON.stringify(mergedProfile)); // I-export sa system persistent config storage.
    
    // I-update din ang pangunahing user repository list ng web browser.
    if (mergedProfile.email) {
      const emailKey = mergedProfile.email.toLowerCase().trim();
      const registeredRaw = localStorage.getItem('edgeform_registered_users');
      const registeredUsers = registeredRaw ? JSON.parse(registeredRaw) : {};
      registeredUsers[emailKey] = mergedProfile;
      localStorage.setItem('edgeform_registered_users', JSON.stringify(registeredUsers));
    }
    
    setView('dashboard'); // Diretsong pasok sa system dashboard pagkatapos ng personalized calculations!
  };

  // 8. Profile Editor Hook: Pinapayagan ang user na baguhin ang timbang, taas, o target na fitness goals anumang oras mula sa Profile screen.
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile); // I-overwrite ang active model state.
    localStorage.setItem('edgeform_profile', JSON.stringify(updatedProfile)); // I-update ang persistent cache configuration.
    
    if (updatedProfile.email) {
      const emailKey = updatedProfile.email.toLowerCase().trim();
      const registeredRaw = localStorage.getItem('edgeform_registered_users');
      const registeredUsers = registeredRaw ? JSON.parse(registeredRaw) : {};
      registeredUsers[emailKey] = updatedProfile;
      localStorage.setItem('edgeform_registered_users', JSON.stringify(registeredUsers)); // Isulat ang updated structural parameters.
    }
  };

  const [isInsideIframe, setIsInsideIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInsideIframe(window.self !== window.top);
    }
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#050A0E] text-slate-100 font-sans selection:bg-emerald-500/30 flex flex-col relative">
      <AnimatePresence mode="wait">
        {view === 'splash' && (
          <Splash 
            key="splash" 
            onComplete={() => {
              const savedProfile = localStorage.getItem('edgeform_profile');
              if (savedProfile) {
                setView('dashboard');
              } else {
                setView('onboarding');
              }
            }} 
          />
        )}
        {view === 'onboarding' && <OnboardingSlides key="onboarding" onComplete={() => setView('auth')} />}
        {view === 'auth' && <Auth key="auth" onLogin={handleLogin} onRegisterStart={handleRegisterStart} />}
        {view === 'profile_setup' && <SetupFlow key="setup" onBack={() => setView('auth')} onComplete={handleSetupComplete} />}
        {view === 'dashboard' && (
          <Dashboard 
            key="dashboard"
            profile={profile}
            onLogout={() => {
              setShowLogoutConfirm(true);
            }}
            onNavigate={(v) => setView(v as AppView)}
            onSelectExercise={(ex) => {
               handleStartWorkout(ex);
            }}
          />
        )}
        {view === 'warmup' && (
          <WarmupView 
            key="warmup" 
            onBack={() => setView('dashboard')} 
            onStartWarmup={() => setView('exercise_select')} 
            userProfile={profile}
            selectedExercise={currentExercise}
          />
        )}
        {view === 'fuel' && <FuelView key="fuel" onBack={() => setView('dashboard')} profile={profile} />}
        {view === 'progress' && <ProgressView key="progress" onBack={() => setView('dashboard')} profile={profile} />}
        {view === 'profile' && (
          <ProfileView 
            profile={profile} 
            onBack={() => setView('dashboard')} 
            onUpdateProfile={handleUpdateProfile}
            onLogout={() => {
              setShowLogoutConfirm(true);
            }} 
          />
        )}
        {view === 'exercise_select' && <ExerciseSelect key="exercise_select" userProfile={profile} onBack={() => setView('dashboard')} onSelect={handleStartWorkout} />}
        {view === 'workout' && currentExercise && (
          <WorkoutView 
            key="workout" 
            exercise={currentExercise} 
            onComplete={(reps, score, repAccuracies) => {
              setCompletedStats({ reps, score });
              
              // Persist history log dynamically inside local storage for real-time progress calculations!
              try {
                const emailRaw = profile?.email || 'default';
                const emailKey = emailRaw.toLowerCase().trim();
                const historyRaw = localStorage.getItem(`edgeform_workout_history_${emailKey}`);
                const history = historyRaw ? JSON.parse(historyRaw) : [];
                
                // Keep mapping keys aligned with ProgressView charts
                const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                const currentDay = weekDays[new Date().getDay()];
                
                history.push({
                  d: currentDay,
                  v: score,
                  reps: reps,
                  timestamp: Date.now(),
                  exercise: currentExercise,
                  repAccuracies: repAccuracies || []
                });
                
                // Clamp length to hold latest 7 training sessions for analytics
                if (history.length > 7) {
                  history.shift();
                }
                
                localStorage.setItem(`edgeform_workout_history_${emailKey}`, JSON.stringify(history));

                // AUTO-CHECK the daily schedule checklist upon completion as requested
                const daysId = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const currentDayId = daysId[new Date().getDay()];
                const savedCompletedRaw = localStorage.getItem(`edgeform_weekly_completed_v1_${emailKey}`);
                const completed = savedCompletedRaw ? JSON.parse(savedCompletedRaw) : {};
                completed[currentDayId] = true;
                localStorage.setItem(`edgeform_weekly_completed_v1_${emailKey}`, JSON.stringify(completed));
              } catch (err) {
                console.error("Failed to store analytics log:", err);
              }
              
              setView('summary');
            }} 
            onExit={() => setView('dashboard')} 
            onGoToWarmup={() => {
              if (currentExercise) {
                localStorage.setItem('warmup_exercise_val', currentExercise);
              }
              setView('warmup');
            }}
          />
        )}
        {view === 'summary' && (
          <Summary 
            key="summary" 
            exercise={currentExercise?.replace('_', ' ')} 
            reps={completedStats?.reps} 
            score={completedStats?.score} 
            onHome={() => setView('dashboard')} 
          />
        )}
      </AnimatePresence>

      {/* Warm-Up recommendation overlay */}
      <AnimatePresence>
        {exercisePendingWarmup && (() => {
          const cleanExName = getExerciseCleanName(exercisePendingWarmup);
          const rec = getWarmupRecommendation(exercisePendingWarmup);
          return (
            <div className="fixed inset-0 bg-[#050A0E]/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
              <div className="w-full max-w-sm bg-[#070D13] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden text-center space-y-5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                
                {/* Close Button */}
                <button 
                  onClick={() => setExercisePendingWarmup(null)}
                  className="absolute top-4 right-4 text-white/45 hover:text-white transition-colors"
                  title="Close and stay in Hub"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
                  <Zap className="w-6 h-6 fill-current text-amber-500" />
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-lg font-black uppercase tracking-tighter italic text-amber-500">
                    Warm-Up Recommended
                  </h2>
                  <p className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">
                    Safety &amp; Form Activation
                  </p>
                </div>
                
                <p className="text-[11px] font-semibold leading-relaxed text-white/70">
                  To protect your joints and maximize tracking score, perform a quick dynamic warm-up designed specifically for this routine.
                </p>

                {/* Specific recommendation details */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="text-[8px] font-black text-lime-400 tracking-wider uppercase block leading-none mb-1">
                        Selected Exercise
                      </span>
                      <h4 className="text-xs font-black text-white italic uppercase tracking-tight truncate">
                        {cleanExName}
                      </h4>
                    </div>
                    <div className="bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded text-[7.5px] font-black text-lime-400 uppercase tracking-widest shrink-0">
                      {rec.name}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2">
                    <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block leading-none mb-1">
                      Target Area
                    </span>
                    <p className="text-[10px] font-bold text-white/85">
                      {rec.targets}
                    </p>
                  </div>

                  <div className="border-t border-white/5 pt-2">
                    <span className="text-[8px] font-black text-white/40 tracking-wider uppercase block leading-none mb-1.5">
                      Prescribed Drills ({rec.drills.length})
                    </span>
                    <div className="space-y-1">
                      {rec.drills.map((drill, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] font-semibold text-white/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                          <span>{drill}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1 font-sans">
                  {/* Primary: Start Warmup */}
                  <button
                    onClick={() => {
                      localStorage.setItem('warmup_exercise_val', exercisePendingWarmup);
                      setCurrentExercise(exercisePendingWarmup);
                      setExercisePendingWarmup(null);
                      setView('warmup');
                    }}
                    className="w-full py-3 bg-lime-500 hover:bg-[#a3e635] text-black font-black uppercase tracking-widest text-[10.5px] rounded-xl shadow-[0_4px_20px_rgba(132,204,22,0.35)] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Start Warm-Up Flow
                  </button>
                  
                  {/* Secondary: Skip & Start Workout */}
                  <button
                    onClick={() => {
                      setCurrentExercise(exercisePendingWarmup);
                      setExercisePendingWarmup(null);
                      setView('workout');
                    }}
                    className="w-full py-2 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[9px] rounded-xl transition-all cursor-pointer"
                  >
                    Skip and start workout
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Logout confirmation overlay */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-[#050A0E]/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-[#070D13] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-lime-500 to-transparent" />
              
              <div className="w-16 h-16 rounded-full bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-500 mx-auto">
                <LogOut className="w-8 h-8 text-lime-500" />
              </div>
              
              <div className="space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tighter italic text-lime-500">
                  Are you sure?
                </h2>
                <p className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">
                  Confirm Logout
                </p>
              </div>
              
              <p className="text-xs font-semibold leading-relaxed text-white/70">
                Do you really want to sign out? Your training streak and stats synchronization will be paused until you return.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('edgeform_profile');
                    setProfile(null);
                    setTempAuthData(null);
                    setShowLogoutConfirm(false);
                    setView('splash');
                  }}
                  className="w-full py-4.5 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_4px_25px_rgba(132,204,22,0.45)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Yes, Sign Out
                </button>
                
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                  }}
                  className="w-full py-3.5 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[10px] rounded-2xl transition-all cursor-pointer"
                >
                  No, Stay Here
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const getWarmupRecommendation = (ex: string | null | undefined) => {
  if (!ex) return { category: 'legs', name: 'Legs & Lower Body', targets: 'Hips, Knees, Ankles', drills: ["Ankle Mobility Flow", "Hip Joint Circles", "Cossack Side Stretch"] };
  const slug = ex.toLowerCase();
  if (slug === 'squat' || slug === 'performance_squat' || slug === 'reverse_lunge' || slug === 'glute_bridge' || slug === 'goblet_squat' || slug === 'romanian_deadlift' || slug === 'legs') {
    return {
      category: 'legs',
      name: 'Legs & Lower Body',
      targets: 'Hips, Knees, Ankles',
      drills: ["Ankle Mobility Flow", "Hip Joint Circles", "Cossack Side Stretch"]
    };
  }
  if (slug === 'pushup' || slug === 'military_pushup' || slug === 'incline_pushup' || slug === 'decline_pushup' || slug === 'floor_press' || slug === 'chest_fly' || slug === 'chest') {
    return {
      category: 'chest',
      name: 'Chest & Shoulders',
      targets: 'Pecs, Rotator Cuffs, Wrists',
      drills: ["Wrist Joint Circles", "Scapular Glides", "Plank Shoulder Taps"]
    };
  }
  if (slug === 'lunge' || slug === 'high_knees' || slug === 'mountain_climbers' || slug === 'plank_jacks' || slug === 'step_ups' || slug === 'dumbbell_thruster' || slug === 'cardio') {
    return {
      category: 'cardio',
      name: 'Cardio & Heart Rate',
      targets: 'Pulse, Lungs, Agility',
      drills: ["Cardio Jumping Jacks", "Spine Twists", "Light Knee Drives"]
    };
  }
  if (slug === 'overhead_press' || slug === 'tricep_dips' || slug === 'diamond_pushup' || slug === 'inchworm' || slug === 'bicep_curl' || slug === 'tricep_extension' || slug === 'arms') {
    return {
      category: 'arms',
      name: 'Arms & Upper Body',
      targets: 'Shoulders, Elbows, Wrists',
      drills: ["Dynamic Alternating swings", "Elbow Joint Loops", "Rotator Shoulders Circles"]
    };
  }
  if (slug === 'deadlift' || slug === 'good_morning' || slug === 'cobra_raise' || slug === 'bird_dog' || slug === 'bent_over_row' || slug === 'dumbbell_glute_bridge' || slug === 'back') {
    return {
      category: 'back',
      name: 'Back & Hips',
      targets: 'Scapula, Lats, Hamstrings',
      drills: ["Hip Hinge Alignment", "Back Cobra Extension", "Decompress Hamstring Scoops"]
    };
  }
  return {
    category: 'legs',
    name: 'Legs & Lower Body',
    targets: 'Hips, Knees, Ankles',
    drills: ["Ankle Mobility Flow", "Hip Joint Circles", "Cossack Side Stretch"]
  };
};

const getExerciseCleanName = (id: ExerciseType): string => {
  const names: Record<string, string> = {
    performance_squat: 'Performance Squat',
    reverse_lunge: 'Reverse Lunge',
    glute_bridge: 'Floor Glute Bridge',
    goblet_squat: 'Dumbbell Goblet Squat',
    romanian_deadlift: 'Dumbbell Romanian Deadlift',
    military_pushup: 'Military Push-up',
    incline_pushup: 'Incline Push-up',
    decline_pushup: 'Decline Push-up',
    floor_press: 'Dumbbell Floor Press',
    chest_fly: 'Dumbbell Chest Fly',
    high_knees: 'High Knees Run',
    mountain_climbers: 'Mountain Climbers',
    plank_jacks: 'Plank Jacks',
    step_ups: 'Dumbbell Step-Up',
    dumbbell_thruster: 'Dumbbell Thruster',
    tricep_dips: 'Tricep Bench Dips',
    diamond_pushup: 'Diamond Push-up',
    inchworm: 'Inchworm Push-up',
    bicep_curl: 'Dumbbell Bicep Curl',
    tricep_extension: 'Overhead Tricep Extension',
    forearm_plank: 'Forearm Plank',
    bicycle_crunch: 'Bicycle Crunch',
    hollow_body: 'Hollow Body Hold',
    russian_twist: 'Dumbbell Russian Twist',
    plank_pull_through: 'Plank Pull-Through',
    good_morning: 'Good Morning',
    cobra_raise: 'Prone Cobra Raise',
    bird_dog: 'Bird-Dog Extension',
    bent_over_row: 'Dumbbell Bent-over Row',
    dumbbell_glute_bridge: 'Dumbbell Glute Bridge'
  };
  return names[id] || id.replace('_', ' ');
};
