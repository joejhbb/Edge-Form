// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (PROFILEVIEW.TSX):
// 
// 1. ACCOUNT CONTROL CENTER (User settings panel):
//    - Nagbibigay-daan sa pag-edit ng physical stats (timbang, taas, edad) at visual avatar customization seeds.
// 
// 2. DISCIPLINED PERSISTENCE CONTROLS:
//    - Ang page na ito ang nagbabasa at sumusulat sa global options tulad ng:
//      * `voice_coach` (Kung papatutugtugin ang automated audio guides)
//      * `haptic_feed` (Haptic vibration cues sa responsive mobile device)
//      * `countdown_beep` (Beeping signals seconds bago mag-start ang Workout loop)
//    - Isinesave ang mga variables na ito sa LocalStorage upang maging persistent o hindi mabura kahit i-refresh ang system!
// ============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Lock, 
  Settings, 
  Headphones, 
  LogOut,
  Pencil,
  X,
  RefreshCw,
  Check,
  Bell,
  Key,
  ShieldCheck,
  Zap,
  Target,
  ChevronDown,
  Trophy,
  Flame,
  Volume2,
  LockKeyhole,
  Info,
  Activity
} from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { audioSynth } from '../lib/audioSynth';

// Map goals of system nicely
const getGoalLabel = (goal: string) => {
  const map: Record<string, string> = {
    lose_weight: 'Weight Loss',
    gain_weight: 'Gain Weight',
    muscle_gain: 'Muscle Mass Gain',
    shape_body: 'Shape Body',
    improve_endurance: 'Athletic Endurance',
    stay_healthy: 'General Health'
  };
  return map[goal] || goal || 'General Fitness';
};

const getActivityLabel = (lvl: string) => {
  const map: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  };
  return map[lvl] || lvl || 'Standard level';
};

interface ProfileViewProps {
  profile: UserProfile | null;
  onBack: () => void;
  onLogout: () => void;
  onUpdateProfile?: (updated: UserProfile) => void;
}

export default function ProfileView({ profile, onBack, onLogout, onUpdateProfile }: ProfileViewProps) {
  const [avatarSeed, setAvatarSeed] = useState(localStorage.getItem('avatarSeed') || profile?.goal || 'default');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [tempSeed, setTempSeed] = useState(avatarSeed);
  const [activeSubView, setActiveSubView] = useState<null | 'profile' | 'privacy' | 'settings' | 'help'>(null);

  const handleSaveAvatar = () => {
    localStorage.setItem('avatarSeed', tempSeed);
    setAvatarSeed(tempSeed);
    setIsAvatarModalOpen(false);
  };

  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setTempSeed(randomSeed);
  };

  const menuItems = [
    { icon: <User className="w-5 h-5" />, label: 'Personal Details', sublabel: 'Edit height, weight & goals', onClick: () => setActiveSubView('profile') },
    { icon: <Settings className="w-5 h-5" />, label: 'Voice & App Settings', sublabel: 'Guided coaching cues', onClick: () => setActiveSubView('settings') },
    { icon: <ShieldCheck className="w-5 h-5" />, label: 'Privacy & Biosync', sublabel: 'Encrypted storage status', onClick: () => setActiveSubView('privacy') },
    { icon: <Headphones className="w-5 h-5" />, label: 'Support Center', sublabel: 'Help & documentation FAQs', onClick: () => setActiveSubView('help') },
    { icon: <LogOut className="w-5 h-5" />, label: 'Logout Account', sublabel: 'Sign out of EdgeForm', onClick: onLogout, isDanger: true },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#050A0E] text-white overflow-hidden relative font-sans">
      <AnimatePresence mode="wait">
        {!activeSubView ? (
          <motion.div 
            key="main"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col flex-1"
          >
            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto pb-12 hide-scrollbar">
              
              {/* Back Dropplet Top Ambient Highlights */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[460px] bg-gradient-to-b from-[#0A131A] via-[#050A0E] to-transparent -z-10" />
              <div className="absolute top-20 right-[-10%] w-[250px] h-[250px] bg-lime-500/[0.04] rounded-full blur-[110px] pointer-events-none -z-10" />
              <div className="absolute top-40 left-[-15%] w-[250px] h-[250px] bg-lime-500/[0.02] rounded-full blur-[100px] pointer-events-none -z-10" />

              {/* Navigation Header */}
              <div className="w-full px-6 pt-10 pb-4 flex items-center justify-between">
                <button 
                  onClick={onBack}
                  className="flex items-center gap-2 text-white/50 hover:text-white font-bold text-xs uppercase tracking-[0.15em] transition-all group"
                >
                  <ChevronLeft className="w-5 h-5 text-lime-500 group-hover:-translate-x-1 transition-transform" />
                  Go Back
                </button>
                <div className="px-3.5 py-1 bg-lime-500/10 border border-lime-500/20 rounded-full flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  <span className="font-mono text-[9px] font-black text-lime-400 uppercase tracking-widest">Biosync Live</span>
                </div>
              </div>

              {/* Page Title */}
              <div className="px-6 pt-2 pb-1">
                <h1 className="text-sm font-black uppercase tracking-[0.25em] text-white/90">User Profile</h1>
                <p className="text-[9px] text-white/40 uppercase tracking-[0.15em] font-medium mt-0.5">Stats & Preferences Configuration</p>
              </div>

              {/* Main Avatar Section & Profile Card */}
              <div className="px-6 flex flex-col items-center mt-4">
                
                {/* Avatar Wrapper with glow */}
                <div className="relative mb-5">
                  <div className="absolute -inset-1 bg-gradient-to-b from-lime-500/30 to-transparent rounded-full blur-lg opacity-85" />
                  
                  <motion.div 
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-32 h-32 bg-[#090F14] rounded-full overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.8)] relative border-[3px] border-white/10 z-10 flex items-center justify-center group"
                  >
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=0f172a,020617`} 
                      alt="User Avatar" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 referrer-policy='no-referrer'" 
                    />
                  </motion.div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setTempSeed(avatarSeed);
                      setIsAvatarModalOpen(true);
                    }}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-lime-500 text-black hover:bg-white rounded-full flex items-center justify-center shadow-lg border-[3px] border-[#050A0E] z-20 transition-all cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 fill-current" />
                  </motion.button>
                </div>

                {/* Name, Goal Indicator */}
                <div className="text-center max-w-xs space-y-1.5 mb-8">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                    {profile?.name || 'TRAINEE #0023'}
                  </h2>
                  
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <span className="px-3 py-1 bg-white/[0.04] border border-white/5 rounded-full text-white/50 text-[9px] font-black uppercase tracking-[0.1em]">
                      {getActivityLabel(profile?.activityLevel || 'beginner')}
                    </span>
                    <span className="px-3 py-1 bg-lime-500/10 border border-lime-500/20 rounded-full text-lime-400 text-[9px] font-black uppercase tracking-[0.1em]">
                      {getGoalLabel(profile?.goal || 'stay_healthy')}
                    </span>
                  </div>
                </div>

                {/* Tech Bio readout Grid */}
                <div className="w-full max-w-sm mb-10 px-1">
                  <div className="bg-[#090F15]/90 border border-white/5 rounded-[2rem] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 to-transparent opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700 pointer-events-none" />
                    
                    {/* Background faint diagnostic bars */}
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-5 group-hover:opacity-10 transition-opacity p-2">
                      <Activity className="w-full h-full text-lime-500" />
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-white/5 text-center">
                      <div className="flex flex-col items-center py-1">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 font-mono">Weight</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-bold italic text-lime-400">{profile?.weight || 72}</span>
                          <span className="text-[10px] text-white/40 font-bold uppercase">kg</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center py-1">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 font-mono">Height</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-bold italic text-white">{profile?.height || 175}</span>
                          <span className="text-[10px] text-white/40 font-bold uppercase">cm</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center py-1">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 font-mono">Age</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-bold italic text-white">{profile?.age || 26}</span>
                          <span className="text-[10px] text-white/40 font-bold uppercase">yrs</span>
                        </div>
                      </div>
                    </div>

                    {/* Integrated streaks/rewards line */}
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                        <span className="font-semibold">Consistency Streak</span>
                      </div>
                      <span className="font-mono font-black italic uppercase text-orange-400 tracking-wider">3 DAYS ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* Section Title */}
                <div className="w-full max-w-sm px-2 mb-3 mt-1 text-left">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em] font-mono">System Configuration</p>
                </div>

                {/* Menu items list */}
                <div className="w-full max-w-sm space-y-2 px-1">
                  {menuItems.map((item, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ x: 4, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center justify-between w-full group outline-none py-3.5 px-4.5 rounded-2xl transition-all border border-white/[0.02] text-left",
                        item.isDanger 
                          ? "bg-red-500/[0.02] hover:bg-red-500/[0.08] hover:border-red-500/20"
                          : "bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                          item.isDanger
                            ? "bg-red-500/10 border-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white"
                            : "bg-white/5 border-white/5 text-slate-300 group-hover:bg-lime-500 group-hover:text-black group-hover:border-lime-400"
                        )}>
                          {item.icon}
                        </div>
                        
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-bold uppercase tracking-tight italic transition-colors",
                            item.isDanger 
                              ? "text-red-400"
                              : "text-white/80 group-hover:text-white"
                          )}>
                            {item.label}
                          </span>
                          <span className="text-[10px] text-white/40 font-medium">
                            {item.sublabel}
                          </span>
                        </div>
                      </div>
                      
                      <ChevronRight className={cn(
                        "w-5 h-5 transition-all",
                        item.isDanger
                          ? "text-red-500/40 group-hover:text-red-500 group-hover:translate-x-1"
                          : "text-white/10 group-hover:text-lime-500 group-hover:translate-x-1"
                      )} />
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="subview"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 25 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col h-full bg-[#050A0E] flex-1"
          >
            <SubView 
              view={activeSubView} 
              onBack={() => setActiveSubView(null)} 
              profile={profile}
              onUpdateProfile={onUpdateProfile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Selection Modal */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0A0F14] w-full max-w-sm rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="p-7 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-5">
                  <div className="text-left">
                    <h3 className="text-xl font-bold uppercase italic text-lime-400 tracking-tight leading-none mb-1">Select Avatar</h3>
                    <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Choose a style below</p>
                  </div>
                  <button 
                    onClick={() => setIsAvatarModalOpen(false)} 
                    className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-white/75" />
                  </button>
                </div>

                {/* Active Image Canvas preview */}
                <div className="w-36 h-36 bg-gradient-to-tr from-[#16222F] to-[#0D161F] rounded-full mb-6 overflow-hidden border-[3px] border-lime-500/40 relative flex items-center justify-center">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tempSeed}&backgroundColor=0f172a`} 
                    alt="Current Avatar Choice" 
                    className="w-full h-full object-cover" 
                  />
                  <button 
                    onClick={generateRandomAvatar}
                    className="absolute bottom-1 right-1 w-10 h-10 bg-lime-500 hover:bg-lime-400 text-black rounded-full flex items-center justify-center shadow-md border-4 border-[#0F172A] hover:scale-110 transition-transform cursor-pointer"
                    title="Generate Random"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 w-full max-h-[160px] overflow-y-auto pr-1 hide-scrollbar">
                  {[...Array(12)].map((_, i) => {
                    const seed = `avatar-${i + 1}`;
                    return (
                      <button
                        key={i}
                        onClick={() => setTempSeed(seed)}
                        className={cn(
                          "aspect-square rounded-xl bg-white/5 overflow-hidden border-2 transition-all cursor-pointer hover:opacity-100",
                          tempSeed === seed ? "border-lime-500 bg-white/10 opacity-100 scale-95" : "border-transparent opacity-70"
                        )}
                      >
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=0f172a`} 
                          alt={`Avatar Seed ${i}`} 
                          className="w-full h-full object-cover" 
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex gap-3">
                <button 
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAvatar}
                  className="flex-1 py-3 bg-lime-500 hover:bg-lime-450 text-black rounded-xl font-black uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-lime-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <span className="text-xl font-black italic tracking-tighter leading-none mb-1 text-white">{value}</span>
      <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">{label}</span>
    </div>
  );
}

interface SubViewProps {
  view: 'profile' | 'privacy' | 'settings' | 'help';
  onBack: () => void;
  profile: UserProfile | null;
  onUpdateProfile?: (updated: UserProfile) => void;
}

function SubView({ view, onBack, profile, onUpdateProfile }: SubViewProps) {
  const titles = {
    profile: 'Personal Profile',
    privacy: 'Privacy & Biosync',
    settings: 'Voice & Coaching',
    help: 'System Documentations'
  };

  const descriptions = {
    profile: 'Biometrics tracking & objectives setup',
    privacy: 'Local storage verification & telemetry protocols',
    settings: 'Tailor responsive voice guidance & reminders',
    help: 'Tutorial details on camera setup & poses'
  };

  return (
    <div className="flex flex-col h-full bg-[#050A0E] flex-1">
      {/* Top Banner Navigation */}
      <div className="pt-10 pb-5 px-6 flex items-center gap-4 bg-[#0A0F15] border-b border-white/5 shrink-0">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:text-lime-500 hover:bg-lime-500/10 hover:border hover:border-lime-500/20 transition-all cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-white leading-none mb-1">{titles[view]}</h3>
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-[0.05em]">{descriptions[view]}</p>
        </div>
      </div>

      {/* Subview Body Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 hide-scrollbar pb-16">
        {view === 'profile' && <ProfileEditContent profile={profile} onUpdateProfile={onUpdateProfile} />}
        {view === 'privacy' && <PrivacyContent />}
        {view === 'settings' && <SettingsContent />}
        {view === 'help' && <HelpContent />}
      </div>
    </div>
  );
}

function ProfileEditContent({ profile, onUpdateProfile }: { profile: UserProfile | null, onUpdateProfile?: (updated: UserProfile) => void }) {
  const [currentGoal, setCurrentGoal] = useState(profile?.goal || 'stay_healthy');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Custom states to adjust weight, height and age directly!
  const [weight, setWeight] = useState(profile?.weight || 72);
  const [height, setHeight] = useState(profile?.height || 175);
  const [age, setAge] = useState(profile?.age || 26);
  const [activityLevel, setActivityLevel] = useState(profile?.activityLevel || 'beginner');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setWeight(profile.weight);
      setHeight(profile.height);
      setAge(profile.age);
      setActivityLevel(profile.activityLevel);
    }
  }, [profile]);

  const goals = [
    { id: 'lose_weight', label: 'Weight Loss', desc: 'Focus on calorie deficit & high metabolic stress' },
    { id: 'gain_weight', label: 'Gain Weight', desc: 'Strategic mass building with high-volume load' },
    { id: 'muscle_gain', label: 'Muscle Mass Gain', desc: 'Hypertrophy focused professional routines' },
    { id: 'shape_body', label: 'Shape Body', desc: 'Body recomposition & precision definition' },
    { id: 'improve_endurance', label: 'Athletic Endurance', desc: 'Amplify lung, cardiovascular, and stamina levels' },
    { id: 'stay_healthy', label: 'General Health', desc: 'Remain active, mobile, and balanced' }
  ];

  const triggerUpdateProfile = (updatedFields: Partial<UserProfile>) => {
    if (profile && onUpdateProfile) {
      const merged: UserProfile = { ...profile, ...updatedFields };
      onUpdateProfile(merged);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Bio Identity Panel */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-lime-500/50 tracking-widest px-1 font-mono">Bio Identity</label>
        <div className="bg-[#0A0F15] p-5 rounded-2xl border border-white/5 space-y-4">
          
          <div>
            <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider mb-2 font-mono">Profile Handle</p>
            {isEditingName ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-500 font-sans"
                  placeholder="Enter dynamic nickname"
                  autoFocus
                />
                <button 
                  onClick={() => {
                    setIsEditingName(false);
                    triggerUpdateProfile({ name: name.trim() || 'User' });
                  }}
                  className="px-4.5 bg-lime-500 hover:bg-lime-400 text-black rounded-xl font-bold text-xs uppercase tracking-tight cursor-pointer transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-xl px-4.5 py-3">
                <p className="text-base font-black italic uppercase leading-none text-white">{name || 'No Name Set'}</p>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="text-xs text-lime-500 font-bold hover:text-white transition-colors"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider mb-1 font-mono">Synchronized Email</p>
            <div className="bg-white/[0.01] border border-transparent rounded-xl px-4.5 py-2.5">
              <p className="text-xs font-mono font-semibold text-white/60 leading-none">{profile?.email || 'local_handshake@edgeform_db'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Adjust Metrics panel */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-lime-500/50 tracking-widest px-1 font-mono">Biometrics Diagnostic Metrics</label>
        <div className="bg-[#0A0F15] p-5 rounded-3xl border border-white/5 space-y-5">
          
          {/* Weight selector slider */}
          <div className="space-y-1.5 animate-fadeIn">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 uppercase font-mono tracking-wider font-bold text-[10px]">Bodyweight</span>
              <span className="font-bold text-lime-400 font-mono text-sm">{weight} <span className="text-[9px] text-white/40">KG</span></span>
            </div>
            <input 
              type="range" 
              min="40" 
              max="160" 
              value={weight} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setWeight(val);
                triggerUpdateProfile({ weight: val });
              }}
              className="w-full accent-lime-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Height slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 uppercase font-mono tracking-wider font-bold text-[10px]">Stature Height</span>
              <span className="font-bold text-white font-mono text-sm">{height} <span className="text-[9px] text-white/40">CM</span></span>
            </div>
            <input 
              type="range" 
              min="110" 
              max="230" 
              value={height} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setHeight(val);
                triggerUpdateProfile({ height: val });
              }}
              className="w-full accent-lime-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Age adjusts */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 uppercase font-mono tracking-wider font-bold text-[10px]">Age Chrono</span>
              <span className="font-bold text-white font-mono text-sm">{age} <span className="text-[9px] text-white/40">Yrs</span></span>
            </div>
            <input 
              type="range" 
              min="14" 
              max="90" 
              value={age} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setAge(val);
                triggerUpdateProfile({ age: val });
              }}
              className="w-full accent-lime-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Activity presets */}
          <div>
            <span className="text-white/40 uppercase font-mono tracking-wider font-bold text-[9px] block mb-2">Posture Engine Velocity Thresholds</span>
            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setActivityLevel(lvl);
                    triggerUpdateProfile({ activityLevel: lvl });
                  }}
                  className={cn(
                    "py-2 px-1.5 rounded-xl border font-black text-[9px] uppercase tracking-wider text-center transition-all cursor-pointer",
                    activityLevel === lvl 
                      ? "bg-lime-500 border-lime-500 text-black" 
                      : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Goal selectors */}
      <div className="bg-[#0A0F15] p-5 rounded-[2rem] border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
          <Target className="w-16 h-16 text-lime-500" />
        </div>
        
        <div className="flex justify-between items-center mb-3 relative z-10">
          <div>
            <h4 className="text-base font-black italic uppercase tracking-tighter text-white">Objective Plan</h4>
            <p className="text-[9px] font-mono text-white/40 uppercase">Vocal response customized for this</p>
          </div>
          <span className="px-2.5 py-0.5 bg-lime-500 text-black text-[9px] font-black uppercase tracking-wider rounded-md">Engine Sync</span>
        </div>
        
        <AnimatePresence mode="wait">
          {!isEditingGoal ? (
            <motion.div
              key="view-goal"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="relative z-10"
            >
              <p className="text-white/60 text-[11px] leading-relaxed mb-4">
                Your computer vision cues are specifically optimized to analyze motion paths supporting your <span className="text-lime-500 font-bold uppercase italic">{getGoalLabel(currentGoal)}</span>.
              </p>
              <button 
                onClick={() => setIsEditingGoal(true)}
                className="w-full py-3 bg-white/5 hover:bg-lime-500 hover:text-black hover:border-lime-400 transition-all text-white/80 font-black uppercase italic tracking-widest text-[9px] rounded-xl border border-white/5 cursor-pointer"
              >
                Change Program Goal
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="edit-goal"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-3 relative z-10"
            >
              <div className="grid grid-cols-1 gap-1.5">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setCurrentGoal(g.id);
                      setIsEditingGoal(false);
                      triggerUpdateProfile({ goal: g.id as any });
                    }}
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer",
                      currentGoal === g.id 
                        ? "bg-lime-500/10 border-lime-500/50" 
                        : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-black uppercase italic tracking-wider leading-none mb-1",
                      currentGoal === g.id ? "text-lime-400" : "text-white"
                    )}>
                      {g.label}
                    </span>
                    <span className="text-[9px] text-white/40 italic font-medium">{g.desc}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsEditingGoal(false)}
                className="w-full py-2 text-[9px] font-bold uppercase text-white/30 hover:text-white transition-colors cursor-pointer"
              >
                Cancel and close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Account Info list summary */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-lime-500/50 tracking-widest px-1 font-mono">Telemetry Data Summary</label>
        <div className="bg-[#0A0F15] rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          <div className="p-4 flex justify-between items-center text-xs">
            <span className="text-white/40 uppercase font-mono tracking-wider font-bold">Bio Profile Sync Log</span>
            <span className="text-lime-500 font-mono font-bold tracking-wider">SECURE INSTANCE</span>
          </div>
          <div className="p-4 flex justify-between items-center text-xs">
            <span className="text-white/40 uppercase font-mono tracking-wider font-bold">Total Finished Sessions</span>
            <span className="text-white font-mono font-bold">18 workouts</span>
          </div>
          <div className="p-4 flex justify-between items-center text-xs">
            <span className="text-white/40 uppercase font-mono tracking-wider font-bold">Last Synchronized</span>
            <span className="text-white/80 font-mono text-[10px]">Today, 14:20 UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyContent() {
  return null;
}

function SettingsContent() {
  const [voiceCoach, setVoiceCoach] = useState(() => localStorage.getItem('voice_coach') !== 'off');
  const [hapticFeed, setHapticFeed] = useState(() => localStorage.getItem('haptic_feed') !== 'off');
  const [countdownBeep, setCountdownBeep] = useState(() => localStorage.getItem('countdown_beep') !== 'off');
  
  const [voiceMode, setVoiceMode] = useState<'cloud' | 'native'>(() => audioSynth.getVoiceMode());
  const [cloudVoice, setCloudVoice] = useState(() => audioSynth.getCloudVoice());
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const saveSetting = (key: string, value: boolean) => {
    localStorage.setItem(key, value ? 'on' : 'off');
  };

  const handleVoiceModeChange = (mode: 'cloud' | 'native') => {
    setVoiceMode(mode);
    audioSynth.setVoiceMode(mode);
    // Trigger instant brief tone or cue to confirm activation
    audioSynth.playTone(440, 0.1, 'sine', 0.05);
  };

  const handleCloudVoiceChange = (voice: string) => {
    setCloudVoice(voice);
    audioSynth.setCloudVoice(voice);
  };

  const testVoiceSpeaker = () => {
    if (isTestingVoice) return;
    setIsTestingVoice(true);
    audioSynth.unlock();
    
    const previewText = voiceMode === 'cloud'
      ? "Hello! I am your visual fitness coach. Let's practice pushups and squats together!"
      : "Default voice connected. Ready to start.";
      
    audioSynth.speakTts(previewText, 1.0, true);
    setTimeout(() => {
      setIsTestingVoice(false);
    }, 3200);
  };

  const voicesList = [
    { id: 'Salli', name: 'Salli', desc: 'Warm & Natural (Female US)' },
    { id: 'Joanna', name: 'Joanna', desc: 'Fit Professional Coach (Female US)' },
    { id: 'Joey', name: 'Joey', desc: 'Athletic Gym Instructor (Male US)' },
    { id: 'Emma', name: 'Emma', desc: 'Articulate British Trainer (Female UK)' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-left space-y-1">
        <h4 className="text-base font-black italic uppercase text-white tracking-tight">Audio feedback & coach loop</h4>
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Tailor real-time assistant guides</p>
      </div>

      <div className="bg-[#0A0F15] rounded-[2rem] border border-white/5 divide-y divide-white/5 overflow-hidden">
        {/* Toggle Voice Feedback completely */}
        <div className="p-5 space-y-1">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-lime-500" />
              <span className="text-xs uppercase font-black italic text-white tracking-wider">Voice Coach Audio</span>
            </div>
            
            <button 
              onClick={() => {
                const next = !voiceCoach;
                setVoiceCoach(next);
                saveSetting('voice_coach', next);
              }}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer",
                voiceCoach ? "bg-lime-500" : "bg-white/10"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full transition-transform shadow-md",
                voiceCoach ? "bg-black translate-x-5" : "bg-white/40"
              )} />
            </button>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed font-semibold">
            Triggers artificial voice cues like "Lower down" or "Awesome form!" to assist you mid-workout.
          </p>
        </div>

        {/* VOICE ENGINE CHOICE PANEL */}
        {voiceCoach && (
          <div className="p-5 text-left space-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black italic text-white/80 tracking-wider">Speech Engine Choice</span>
              <p className="text-[9px] text-white/40 leading-relaxed">
                If the voice feels robotic, stutters, or fails entirely on laptops & Android, switch below to Premium AI Voice!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleVoiceModeChange('cloud')}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                  voiceMode === 'cloud' 
                    ? "bg-lime-500/10 border-lime-500 text-lime-400" 
                    : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Check className={cn("w-3.5 h-3.5", voiceMode === 'cloud' ? "opacity-100" : "opacity-0")} />
                  <span className="text-xs font-bold uppercase tracking-tight">Premium Voice (Cloud)</span>
                </div>
                <span className="text-[8.5px] leading-relaxed text-white/40">
                  Zero lag, natural human tone. Bypass Chrome & Android iframe restrictions.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleVoiceModeChange('native')}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                  voiceMode === 'native' 
                    ? "bg-lime-500/10 border-lime-500 text-lime-400" 
                    : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Check className={cn("w-3.5 h-3.5", voiceMode === 'native' ? "opacity-100" : "opacity-0")} />
                  <span className="text-xs font-bold uppercase tracking-tight">System Voice (Native)</span>
                </div>
                <span className="text-[8.5px] leading-relaxed text-white/40">
                  Offline fallback. Highly subject to robotic sounds and browser blocking.
                </span>
              </button>
            </div>

            {/* Premium speaker voices configuration list */}
            {voiceMode === 'cloud' && (
              <div className="mt-2.5 p-3 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2.5">
                <span className="text-[9px] uppercase font-bold tracking-widest text-lime-400 font-mono">Select Cloud Speaker voice</span>
                
                <div className="grid grid-cols-2 gap-2">
                  {voicesList.map(voice => (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => handleCloudVoiceChange(voice.id)}
                      className={cn(
                        "p-2 rounded-xl border text-left transition-all cursor-pointer text-[10px]",
                        cloudVoice === voice.id
                          ? "bg-white/10 border-lime-500 text-white"
                          : "bg-[#0A0F15] border-white/5 text-white/50 hover:bg-white/[0.03]"
                      )}
                    >
                      <div className="font-bold">{voice.name}</div>
                      <div className="text-[8px] text-white/30 truncate">{voice.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test Voice Speaker Button */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={testVoiceSpeaker}
                disabled={isTestingVoice}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 transition-all text-black cursor-pointer",
                  isTestingVoice ? "bg-white/40 cursor-wait text-white" : "bg-lime-400 hover:bg-lime-300"
                )}
              >
                <Volume2 className="w-3 h-3" />
                {isTestingVoice ? "Speaking test..." : "Test Voice Output (Subukan Ang Boses)"}
              </button>
            </div>
          </div>
        )}

        {/* Countdown option */}
        <div className="p-5 space-y-1">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-lime-500" />
              <span className="text-xs uppercase font-black italic text-white tracking-wider">Countdown Synth Chimes</span>
            </div>
            
            <button 
              onClick={() => {
                const next = !countdownBeep;
                setCountdownBeep(next);
                saveSetting('countdown_beep', next);
              }}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer",
                countdownBeep ? "bg-lime-500" : "bg-white/10"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full transition-transform shadow-md",
                countdownBeep ? "bg-black translate-x-5" : "bg-white/40"
              )} />
            </button>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed font-semibold">
            Synthesizes neon pulse chords and warm warning bleeps on transition sequences of warmup steps.
          </p>
        </div>

        {/* Haptic Visual panel */}
        <div className="p-5 space-y-1">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-lime-500" />
              <span className="text-xs uppercase font-black italic text-white tracking-wider">Haptic Visual Loops</span>
            </div>
            
            <button 
              onClick={() => {
                const next = !hapticFeed;
                setHapticFeed(next);
                saveSetting('haptic_feed', next);
              }}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer",
                hapticFeed ? "bg-lime-500" : "bg-white/10"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full transition-transform shadow-md",
                hapticFeed ? "bg-black translate-x-5" : "bg-white/40"
              )} />
            </button>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed font-semibold">
            Causes screen borders to pulse neon-green in synchrony with completion tracking.
          </p>
        </div>
      </div>

      <div className="p-4 bg-lime-500/5 rounded-2xl border border-lime-500/10 text-left">
        <p className="text-[9px] text-lime-400 font-bold uppercase tracking-wider mb-1 font-mono">Expert Guidance Loop</p>
        <p className="text-[10px] text-white/60 leading-relaxed">
          Need custom audio timing? Set up is responsive automatically to your workout velocities, increasing warning rates if posture sways out of safe bounds.
        </p>
      </div>
    </div>
  );
}

function HelpContent() {
  return null;
}

function FaqCard({ q, a }: { q: string, a: string, key?: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#0A0F15] rounded-xl border border-white/5 overflow-hidden transition-all text-left">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 hover:bg-white/[0.02] text-left flex justify-between items-center gap-3 cursor-pointer"
      >
        <span className="text-xs font-bold text-white uppercase tracking-tight italic">{q}</span>
        <ChevronRight className={cn("w-4 h-4 text-white/30 shrink-0 transition-transform", isOpen ? "rotate-90 text-lime-400" : "")} />
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4.5 pb-4.5 text-[11px] leading-relaxed text-white/50 border-t border-white/[0.02] bg-[#080C11] pt-3 font-medium">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
