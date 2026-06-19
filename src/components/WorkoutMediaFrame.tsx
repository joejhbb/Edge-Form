// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (WORKOUTMEDIAFRAME.TSX):
// 
// 1. VISUAL DEMO PROVIDER (Guidance Panel):
//    - Ang `WorkoutMediaFrame.tsx` ay responsable sa pag-render ng demo media resources (mga paliwanag, imahe o video clips) batay sa napiling ehersisyo.
//    - Tinutulungan nito ang user na makita ang tamang porma (tamang anggulo) bago simulan ang live computer vision camera scan.
// 
// 2. PAANO GUMAGANA ANG FALLBACK AT MAPPING LOGIC?
//    - Bina-map nito ang mga static image asset references tulad ng leg, chest, o cardio files gamit ang conditional switch-case.
//    - Sinisiguro nito ang zero crash rate ng system sa pamamagitan ng pagkakaroon ng reliable local assets.
// ============================================================================

import React, { useState, useRef } from 'react';
import { Play, Pause, VolumeX, Volume2 } from 'lucide-react';
import legsImg from '../assets/images/legs_workout_png_1779787720371.png';
import cardioImg from '../assets/images/cardio_workout_png_1779787736563.png';
import chestImg from '../assets/images/chest_workout_png_1779787753054.png';
import armsImg from '../assets/images/arms_workout_png_1779787768498.png';
import coreImg from '../assets/images/core_workout_png_1779787784490.png';
import backImg from '../assets/images/back_workout_png_1779787800827.png';

interface WorkoutMediaFrameProps {
  exerciseId: string;
  dayId: string;
  dayName: string;
  focusTitle: string;
}

// =========================================================================
// CUSTOMIZE YOUR IMAGES OR VIDEOS HERE!
// You can directly change these URLs to any image (.png/.jpg) or video (.mp4/.webm or YouTube embed) you want.
// =========================================================================
export const WORKOUT_MEDIA_SOURCES: Record<string, { type: 'video' | 'image'; url: string }> = {
  // Legs/Squats (Change type to 'video' or 'image' and change url)
  legs: {
    type: 'image',
    url: legsImg
  },
  // Chest/Pushups (Change type to 'video' or 'image' and change url)
  chest: {
    type: 'image',
    url: chestImg
  },
  // Arms/Bicep curls (Change type to 'video' or 'image' and change url)
  arms: {
    type: 'image',
    url: armsImg
  },
  // Core/Planks (Change type to 'video' or 'image' and change url)
  core: {
    type: 'image',
    url: coreImg
  },
  // Cardio exercises (Change type to 'video' or 'image' and change url)
  cardio: {
    type: 'image',
    url: cardioImg
  },
  // Back exercises (Change type to 'video' or 'image' and change url)
  back: {
    type: 'image',
    url: backImg
  },
  // Fallback default
  default: {
    type: 'image',
    url: legsImg
  }
};

export default function WorkoutMediaFrame({ exerciseId, dayId, dayName, focusTitle }: WorkoutMediaFrameProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to determine which media source should be rendered based on the exercise ID
  const getMediaSource = () => {
    const id = exerciseId.toLowerCase();
    
    if (id === 'none' || !id || dayId.toLowerCase() === 'sun') {
      return null;
    }
    
    if (id.includes('squat') || id.includes('lunge') || id.includes('leg') || id.includes('glute')) {
      return WORKOUT_MEDIA_SOURCES.legs;
    }
    if (id.includes('press') || id.includes('chest') || id.includes('pushup')) {
      return WORKOUT_MEDIA_SOURCES.chest;
    }
    if (id.includes('curl') || id.includes('tricep') || id.includes('arm') || id.includes('bicep')) {
      return WORKOUT_MEDIA_SOURCES.arms;
    }
    if (id.includes('plank') || id.includes('crunch') || id.includes('core') || id.includes('ab')) {
      return WORKOUT_MEDIA_SOURCES.core;
    }
    if (id.includes('cardio') || id.includes('run') || id.includes('jump') || id.includes('hiit') || id.includes('knee')) {
      return WORKOUT_MEDIA_SOURCES.cardio;
    }
    if (id.includes('back') || id.includes('row') || id.includes(' pull') || id.includes('lat') || id.includes('morning')) {
      return WORKOUT_MEDIA_SOURCES.back;
    }
    return WORKOUT_MEDIA_SOURCES.default;
  };

  const media = getMediaSource();

  // Helper to check if a URL is a YouTube/Vimeo video
  const isEmbedVideo = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  // Convert watch link to YouTube embed link
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
    }
    return url;
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(err => console.log('Autoplay guard:', err));
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050A0E] flex flex-col justify-end overflow-hidden group select-none">
      {/* Background Media Component */}
      <div className="absolute inset-0 w-full h-full z-0">
        {!media ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#070c10] text-zinc-500 p-6">
            <div className="text-[10px] font-mono font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-md uppercase tracking-widest mb-2 animate-pulse">
              Rest Day
            </div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Recovery Viewport Active</p>
          </div>
        ) : media.type === 'video' ? (
          isEmbedVideo(media.url) ? (
            <iframe
              src={getEmbedUrl(media.url)}
              className="w-full h-full object-cover border-0 pointer-events-auto filter brightness-75 bg-black"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={focusTitle}
            />
          ) : (
            <div className="w-full h-full relative">
              <video
                ref={videoRef}
                src={media.url}
                loop
                muted={isMuted}
                autoPlay
                playsInline
                className="w-full h-full object-cover filter brightness-75 bg-black"
              />
              
              {/* Overlay controls for custom local mp4/webm videos */}
              <div className="absolute bottom-20 left-4 right-4 flex items-center justify-between pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={togglePlay}
                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>
                  <button 
                    onClick={toggleMute}
                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-ping" />
                  reference video
                </span>
              </div>
            </div>
          )
        ) : (
          <img
            src={media.url}
            alt={focusTitle}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-all duration-700 filter brightness-75 saturate-100 group-hover:scale-105"
          />
        )}
      </div>

      {/* Dark vignette overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050A0E] via-[#050A0E]/30 to-transparent pointer-events-none z-10" />

      {/* Stylized HUD Corner lines */}
      <div className="absolute inset-0 pointer-events-none z-10 border border-white/5 m-3 rounded-2xl">
        <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/20" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/20" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/20" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/20" />
      </div>

      {/* Elegant minimalist title panel */}
      <div className="relative z-10 text-left p-6 w-full mb-0 pointer-events-none">
        <h5 className="text-lg font-black uppercase italic tracking-tighter text-white leading-tight">
          {dayName} Viewport
        </h5>
        <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider mt-0.5">
          {focusTitle} Reference Track
        </p>
      </div>
    </div>
  );
}
