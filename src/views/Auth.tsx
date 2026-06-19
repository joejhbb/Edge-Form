// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (AUTH.TSX):
// 
// 1. SIGN-IN AT REGISTRATION PORTAL:
//    - Ang `Auth.tsx` ang pinto ng system. Hinahayaan nito ang user na mag-log in o gumawa ng bagong account.
// 
// 2. PAANO GUMAGANA ANG ATING LIGHTWEIGHT ACCOUNT PERSISTENCE?
//    - Nakikipag-ugnayan ito sa LocalStorage (`edgeform_registered_users`).
//    - Kapag gumawa ng account ang user, isineserialize nito ang user object (pangalan, email, encoded secrets) at isinesave sa browser database.
//    - Kapag nag-login, binabasa, pinaparse, at tinutugma nito ang input credentials laban sa rehistradong profile list upang maging ligtas at matagumpay ang sesyon.
// ============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Activity, 
  User,
  Facebook,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth({ onLogin, onRegisterStart }: { onLogin: (email: string, password?: string) => { success: boolean; error?: string }, onRegisterStart: (email: string, name: string, password?: string) => void, key?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-white/10', textClass: 'text-white/40' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[@$!%*#?&^()_+=[\]{};':",./<>?-]/.test(pass)) score++;

    switch (score) {
      case 0:
      case 1:
        return { score: 1, label: 'WEAK', color: 'bg-red-500', textClass: 'text-red-500' };
      case 2:
        return { score: 2, label: 'MEDIUM', color: 'bg-amber-500', textClass: 'text-amber-500' };
      case 3:
        return { score: 3, label: 'STRONG', color: 'bg-lime-500', textClass: 'text-lime-500' };
      case 4:
        return { score: 4, label: 'ELITE POWER', color: 'bg-lime-400 shadow-[0_0_10px_#a3e635]', textClass: 'text-lime-400 font-extrabold animate-pulse' };
      default:
        return { score: 0, label: '', color: 'bg-white/10', textClass: 'text-white/40' };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (mode === 'signup') {
      if (!username.trim()) {
        setError("Please enter a username");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match");
        return;
      }
      onRegisterStart(email, username.trim(), password);
    } else {
      const res = onLogin(email, password);
      if (!res.success) {
        setError(res.error || "Email not registered. Please create an account first.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 px-4 overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-40 bg-grid-pattern" />
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-lime-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-lime-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 100 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-lime-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_20px_60px_rgba(132,204,22,0.3)]">
            <Activity className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            EDGE<span className="text-lime-500">FORM</span>
          </h1>
        </div>

        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-black text-white mb-3 tracking-tight">
              {mode === 'login' ? 'Login' : 'Join Now'}
            </h2>
            <p className="text-white/40 text-sm font-medium">
              {mode === 'login' ? 'Continue your journey to strength.' : 'Start your transformation today.'}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-5 overflow-hidden pb-1"
                >
                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 z-20 pointer-events-none transition-colors group-focus-within:text-lime-500" />
                    <input 
                      type="text" 
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-16 pr-6 focus:outline-none focus:border-lime-500/50 focus:bg-white/[0.08] transition-all font-bold text-sm text-white relative z-10"
                      required={mode === 'signup'}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 z-20 pointer-events-none transition-colors group-focus-within:text-lime-500" />
              <input 
                type="email" 
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full bg-white/5 border rounded-2xl h-16 pl-16 pr-6 focus:outline-none focus:bg-white/[0.08] transition-all font-bold text-sm text-white relative z-10",
                  error === "Please enter a valid email address" ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-lime-500/50"
                )}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 z-20 pointer-events-none transition-colors group-focus-within:text-lime-500" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-16 pr-14 focus:outline-none focus:border-lime-500/50 focus:bg-white/[0.08] transition-all font-bold text-sm text-white relative z-10"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-20 text-white/20 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {mode === 'signup' && password && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-2 pt-1 pb-2 space-y-2 overflow-hidden"
                >
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-white/40">Password Strength</span>
                    <span className={cn("transition-colors duration-300", strength.textClass)}>{strength.label}</span>
                  </div>
                  <div className="flex gap-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    {[1, 2, 3, 4].map((step) => (
                      <div 
                        key={step}
                        className={cn(
                          "flex-1 h-full rounded-full transition-all duration-500",
                          step <= strength.score ? strength.color : "bg-white/5"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[9px] text-white/30 font-medium leading-relaxed uppercase tracking-wider">
                    Tip: Combine uppercase, letters, numbers, and symbols (min 8 chars).
                  </p>
                </motion.div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button type="button" className="text-[11px] font-black text-lime-500 uppercase tracking-[0.2em] hover:text-white transition-colors">Forgot password?</button>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 z-20 pointer-events-none transition-colors group-focus-within:text-lime-500" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error === "Passwords don't match" && e.target.value === password) {
                          setError(null);
                        }
                      }}
                      className={cn(
                        "w-full bg-white/5 border rounded-2xl h-16 pl-16 pr-14 focus:outline-none focus:bg-white/[0.08] transition-all font-bold text-sm text-white relative z-10",
                        confirmPassword && password !== confirmPassword 
                          ? "border-red-500/50 focus:border-red-500" 
                          : "border-white/10 focus:border-lime-500/50"
                      )}
                      required={mode === 'signup'}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 z-20 text-white/20 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-2"
                    >
                      Passwords do not match
                    </motion.p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-lime-500 text-[10px] font-black uppercase tracking-widest pl-2"
                    >
                      Passwords match
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs font-black uppercase tracking-widest text-center"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full py-6 bg-lime-500 text-black rounded-2xl font-black text-sm tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(132,204,22,0.25)] flex items-center justify-center gap-2 group mt-8"
            >
              {mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-6 text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="flex justify-center gap-6">
            <button className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-lime-500/50 transition-all group">
              <Mail className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </button>
            <button className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-lime-500/50 transition-all group">
              <Facebook className="w-6 h-6 text-white fill-current group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="pt-8 text-center">
            <div className="text-[12px] font-black text-white/40 uppercase tracking-widest">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <button 
                    onClick={() => {
                      setMode('signup');
                      setPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
                    className="text-lime-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Join now
                  </button>
                </>
              ) : (
                <>
                  Already a member?{' '}
                  <button 
                    onClick={() => {
                      setMode('login');
                      setPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
                    className="text-lime-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
