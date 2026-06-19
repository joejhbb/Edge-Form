// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE & ARCHITECTURE EXPLANATION (POSE_CAMERA.TSX):
// 
// 1. ANONG GAMIT NG SYSTEM SA PAG-TRACK NG POSTURE?
//    - Gumagamit ang frontend ng **TensorFlow.js (TFJS)** at ang ultra-lightweight
//      deep learning model na **MoveNet (SinglePose Lightning)**.
//    - Ang model na ito ay ekspertong nag-i-scan ng webcam feed at lumilikha ng isang virtual
//      skeleton sa pamamagitan ng pag-detect ng **17 keypoints** (oints: shoulder, hip, knee, nose, etc.).
// 
// 2. PAANO UMAANDAR ANG CAMERA LOOP?
//    a) Hihingi ng pahintulot ang system sa browser gamit ang `MediaDevices.getUserMedia` na may 640x480 resolution.
//    b) Isasalin ng camera frame stream ang pixels patungo sa `<video>` ref.
//    c) Tatakbo ang `requestAnimationFrame()` render recursion loop upang patuloy na basahin ang bawat frame.
//    d) Papatakbuhin ng `detector.estimatePoses()` ang moveNET model sa GPU gamit ang WebGL acceleration.
//    e) Ang nakuhang coordinates (x, y) ay idodraw sa `<canvas>` bilang skeleton bones/dots, habang isinesend ang data sa biomechanical analyser!
// ============================================================================

import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
import { Activity, Tv, Check, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { Pose, Keypoint } from '../../types';
import { calculateAngle } from '../../lib/poseLogic';

interface PoseCameraProps {
  onPose: (pose: Pose) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
  onQuality?: (quality: { brightness: 'dark' | 'bright' | 'good' }) => void;
  exercise: string;
  brightness?: number;
  cameraFit?: 'cover' | 'contain';
}

// Generates joint positions for simulated exercises when the raw camera is restricted
function getSimulatedPose(exercise: string, frameIndex: number, preset: 'perfect' | 'tilt' | 'depth' | 'sag'): Pose {
  const keypoints: Keypoint[] = Array.from({ length: 17 }, () => ({ x: 0, y: 0, score: 0.95 }));
  
  const cycleLength = 200;
  const t = frameIndex % cycleLength;
  let p = 0;
  if (t < 100) {
    p = t / 100;
  } else {
    p = (200 - t) / 100;
  }
  
  // Cubic easing for organic joint acceleration/deceleration
  let easedP = p * p * (3 - 2 * p);
  
  if (preset === 'depth') {
    // Limit depth to 35% of target to trigger "lower further" coach alerts
    easedP = easedP * 0.35;
  }

  // Normalize exercise string for robust profile mapping
  const normEx = exercise.toLowerCase().includes('squat') ? 'squat' : 'pushup';

  // Segment exercise profiles for display orientation
  const isFrontView = normEx === 'squat' || exercise === 'overhead_press';
  
  if (isFrontView) {
    // Front view skeletal profile
    // Head keypoints
    keypoints[0] = { x: 320, y: 110 - easedP * 20, score: 0.95 }; // nose
    keypoints[1] = { x: 310, y: 100 - easedP * 20, score: 0.95 }; // left_eye
    keypoints[2] = { x: 330, y: 100 - easedP * 20, score: 0.95 }; // right_eye
    keypoints[3] = { x: 295, y: 105 - easedP * 20, score: 0.95 }; // left_ear
    keypoints[4] = { x: 345, y: 105 - easedP * 20, score: 0.95 }; // right_ear
    
    // Shoulders - skewed if tilt warning preset is loaded
    let shoulderL_Y = 160 + (normEx === 'squat' ? easedP * 65 : 0);
    let shoulderR_Y = 160 + (normEx === 'squat' ? easedP * 65 : 0);
    
    if (preset === 'tilt') {
      shoulderL_Y -= 25; // Introduce a tilted skewed angle > 8.5 deg
      shoulderR_Y += 15;
    }
    
    keypoints[5] = { x: 260, y: shoulderL_Y, score: 0.95 }; // left_shoulder
    keypoints[6] = { x: 380, y: shoulderR_Y, score: 0.95 }; // right_shoulder
    
    if (exercise === 'overhead_press') {
      // Hands extend fully above head
      keypoints[7] = { x: 230 - easedP * 10, y: shoulderL_Y - easedP * 110, score: 0.95 }; // left_elbow
      keypoints[8] = { x: 410 + easedP * 10, y: shoulderR_Y - easedP * 110, score: 0.95 }; // right_elbow
      keypoints[9] = { x: 230 - easedP * 10, y: shoulderL_Y - easedP * 170, score: 0.95 }; // left_wrist
      keypoints[10] = { x: 410 + easedP * 10, y: shoulderR_Y - easedP * 170, score: 0.95 }; // right_wrist
    } else {
      // Core joint position (Front squat)
      keypoints[7] = { x: 230, y: shoulderL_Y + 50, score: 0.95 }; // left_elbow
      keypoints[8] = { x: 410, y: shoulderR_Y + 50, score: 0.95 }; // right_elbow
      keypoints[9] = { x: 300, y: shoulderL_Y + 40, score: 0.95 }; // left_wrist
      keypoints[10] = { x: 340, y: shoulderR_Y + 40, score: 0.95 }; // right_wrist
    }
    
    // Hips
    let hipL_Y = 250 + (normEx === 'squat' ? easedP * 90 : 0);
    let hipR_Y = 250 + (normEx === 'squat' ? easedP * 90 : 0);
    if (preset === 'tilt') {
      hipL_Y -= 15;
      hipR_Y += 10;
    }
    
    keypoints[11] = { x: 280, y: hipL_Y, score: 0.95 }; // left_hip
    keypoints[12] = { x: 360, y: hipR_Y, score: 0.95 }; // right_hip
    
    // Knees
    keypoints[13] = { x: 270 - (normEx === 'squat' ? easedP * 25 : 0), y: 340 + (normEx === 'squat' ? easedP * 35 : 0), score: 0.95 }; // left_knee
    keypoints[14] = { x: 370 + (normEx === 'squat' ? easedP * 25 : 0), y: 340 + (normEx === 'squat' ? easedP * 35 : 0), score: 0.95 }; // right_knee
    
    // Ankles
    keypoints[15] = { x: 280, y: 430, score: 0.95 }; // left_ankle
    keypoints[16] = { x: 360, y: 430, score: 0.95 }; // right_ankle
  } else {
    // Sagittal plane profile simulation: Pushups, Deadlifts, Lunges (Left prominent profile)
    const noseX = 160;
    const noseY = 210 + (normEx === 'pushup' ? easedP * 85 : easedP * 30);
    keypoints[0] = { x: noseX, y: noseY, score: 0.95 }; // nose
    keypoints[1] = { x: noseX + 5, y: noseY - 8, score: 0.95 }; // left_eye
    keypoints[2] = { x: noseX + 5, y: noseY - 8, score: 0.01 }; // right_eye (occluded)
    keypoints[3] = { x: noseX + 15, y: noseY - 12, score: 0.95 }; // left_ear
    keypoints[4] = { x: noseX + 15, y: noseY - 12, score: 0.01 }; // right_ear (occluded)
    
    // Shoulder
    let shoulderY = 250 + (normEx === 'pushup' ? easedP * 85 : easedP * 40);
    keypoints[5] = { x: 220, y: shoulderY, score: 0.95 }; // left_shoulder
    keypoints[6] = { x: 220, y: shoulderY, score: 0.05 }; // right_shoulder (occluded)
    
    if (normEx === 'pushup') {
      const elbowX = 250 + easedP * 15;
      const elbowY = 220 + easedP * 50;
      keypoints[7] = { x: elbowX, y: elbowY, score: 0.95 }; // left_elbow
      keypoints[8] = { x: elbowX, y: elbowY, score: 0.05 }; // right_elbow
      keypoints[9] = { x: 220, y: 350, score: 0.95 }; // left_wrist
      keypoints[10] = { x: 220, y: 350, score: 0.05 }; // right_wrist
    } else if (exercise === 'deadlift') {
      keypoints[7] = { x: 220, y: shoulderY + 50, score: 0.95 }; // left_elbow
      keypoints[8] = { x: 220, y: shoulderY + 50, score: 0.05 };
      keypoints[9] = { x: 220, y: shoulderY + 90, score: 0.95 }; // left_wrist
      keypoints[10] = { x: 220, y: shoulderY + 90, score: 0.05 };
    } else {
      keypoints[7] = { x: 200, y: shoulderY + 40, score: 0.95 }; // left_elbow
      keypoints[8] = { x: 200, y: shoulderY + 40, score: 0.05 };
      keypoints[9] = { x: 190, y: shoulderY + 60, score: 0.95 }; // left_wrist
      keypoints[10] = { x: 190, y: shoulderY + 60, score: 0.05 };
    }
    
    // Hips
    let hipY = 280 + (normEx === 'pushup' ? easedP * 85 : (exercise === 'deadlift' ? easedP * 65 : easedP * 80));
    let hipX = 350 - (exercise === 'deadlift' ? easedP * 30 : 0);
    if (preset === 'sag') {
      hipY += 30; // Force sagging hips
    }
    keypoints[11] = { x: hipX, y: hipY, score: 0.95 }; // left_hip
    keypoints[12] = { x: hipX, y: hipY, score: 0.05 }; // right_hip
    
    // Knees
    let kneeY = 310 + (normEx === 'pushup' ? easedP * 85 : (exercise === 'deadlift' ? easedP * 15 : easedP * 90));
    let kneeX = exercise === 'lunge' ? 460 - easedP * 50 : 460;
    keypoints[13] = { x: kneeX, y: kneeY, score: 0.95 }; // left_knee
    keypoints[14] = { x: kneeX, y: kneeY, score: 0.05 }; // right_knee
    
    // Ankles
    let ankleY = 330 + (normEx === 'pushup' ? easedP * 85 : (exercise === 'deadlift' ? 0 : easedP * 65));
    keypoints[15] = { x: 550, y: ankleY, score: 0.95 }; // left_ankle
    keypoints[16] = { x: 550, y: ankleY, score: 0.05 }; // right_ankle
  }
  
  return { keypoints, score: 0.95 };
}

// Optimized global cache for TensorFlow.js initialization & MoveNet model helper functions
let globalTfInitPromise: Promise<void> | null = null;
let globalDetector: poseDetection.PoseDetector | null = null;
let globalDetectorPromise: Promise<poseDetection.PoseDetector> | null = null;

function ensureTFInitialized(): Promise<void> {
  if (!globalTfInitPromise) {
    globalTfInitPromise = (async () => {
      try {
        const env = tf.env() as any;
        if (env.flags && 'HAS_WEBGPU' in env.flags) {
          env.set('HAS_WEBGPU', false);
        } else {
          env.registerFlag('HAS_WEBGPU', () => false);
        }
      } catch (flagError) {
        console.warn('Could not disable WebGPU flag:', flagError);
      }
      try {
        await tf.setBackend('webgl');
      } catch (backendError) {
        console.warn('Failed to force WebGL backend, falling back:', backendError);
      }
      await tf.ready();
    })();
  }
  return globalTfInitPromise;
}

function getPoseDetector(): Promise<poseDetection.PoseDetector> {
  if (globalDetector) return Promise.resolve(globalDetector);
  if (!globalDetectorPromise) {
    globalDetectorPromise = (async () => {
      await ensureTFInitialized();
      const model = poseDetection.SupportedModels.MoveNet;
      globalDetector = await poseDetection.createDetector(model, { 
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING 
      });
      return globalDetector;
    })();
  }
  return globalDetectorPromise;
}

export default function PoseCamera({ onPose, onReady, onError, onQuality, exercise, brightness = 100, cameraFit = 'cover' }: PoseCameraProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);
  const [simPreset, setSimPreset] = useState<'perfect' | 'tilt' | 'depth' | 'sag'>('perfect');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const requestRef = useRef<number>(0);
  const simFrameRef = useRef<number>(0);
  const lastQualityCheckRef = useRef<number>(0);
  const smoothedPoseRef = useRef<Pose | null>(null);
  const lastNosePosRef = useRef<{ x: number; y: number } | null>(null);
  const consecutiveRejectedFramesRef = useRef<number>(0);
  const SMOOTHING_FACTOR = 0.30;

  const onPoseRef = useRef(onPose);
  const onQualityRef = useRef(onQuality);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onPoseRef.current = onPose;
    onQualityRef.current = onQuality;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onPose, onQuality, onReady, onError]);

  const ADJACENT_KEYPOINTS = [
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]
  ];

  // 1. Hook para sa Setup ng Webcam o Device Camera Control.
  useEffect(() => {
    if (isSimulated) return; // Kung naka-aktibo ang simulator preset, huwag ipagana ang totoong webcamera.

    async function setupCamera() {
      try {
        // Tiyaking handa at fully optimized na ang TensorFlow engine backend bago buksan ang device stream.
        await ensureTFInitialized();

        // Suriin kung ang web browser ay sumusuporta sa built-in HTML5 Camera Media Devices.
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Hindi sinusuportahan ang Camera API sa browser na ito. Pakisundan ang gabay sa ibaba.");
        }

        // Kumuha ng pahintulot sa gumagamit (user prompt) gamit ang modernong getUserMedia API stream.
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user', // Gamitin ang front web camera (Selfie Mode) para sa madaling pagsusuri.
            width: { ideal: 640 }, // Ideyal na lapad (width) para sa GPU matrix analysis.
            height: { ideal: 480 } // Ideyal na taas (height) ng video frames.
          }, 
          audio: false // Deaktibo ang audio upang mapanatili ang privacy ng user.
        });

        // I-link ang nakuha nating camera stream sa ating HTML5 `<video>` selector element.
        if (videoRef.current) {
          videoRef.current.srcObject = stream; // Isalin ang raw video binary interface stream.
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && canvasRef.current) {
              const vw = videoRef.current.videoWidth;
              const vh = videoRef.current.videoHeight;
              if (vw > 0 && vh > 0) {
                // I-sync ang lapad at taas ng painting Canvas sa sukat ng camera ng device.
                canvasRef.current.width = vw;
                canvasRef.current.height = vh;
              }
            }
            videoRef.current?.play(); // Patakbuhin ang camera preview agad.
            initDetector(); // Simulan ang deep learning computer vision model interface!
          };
        }
      } catch (err) {
        console.error("Camera capture block:", err);
        const errMsg = "Na-block o walang nahanap na camera device.";
        setError(errMsg);
        setIsLoading(false);
        onErrorRef.current?.(errMsg);
      }
    }

    // 2. Pag-load ng MoveNet Neural Network model.
    async function initDetector() {
      try {
        detectorRef.current = await getPoseDetector(); // Sangguniin ang aming cached global tf model instance.
        setIsLoading(false); // Tapos na ang startup loading animation.
        onReadyRef.current?.(); // I-trigger ang signal na handa na ang workout setup.
        renderFrame(); // Patakbuhin ang frame recursion loop!
      } catch (err) {
        const errMsg = "Hindi ma-initialize ang pose tracking neural model.";
        setError(errMsg);
        setIsLoading(false);
        onErrorRef.current?.(errMsg);
      }
    }

    // 3. Render Loop Recursion: Lumilikha ng loop upang i-scan ang webcam pixels nang paulit-ulit (60 frames kada segundo).
    async function renderFrame() {
      try {
        if (
          detectorRef.current && 
          videoRef.current && 
          canvasRef.current && 
          videoRef.current.readyState === 4 && // Sapat na ang buffered data ng video.
          videoRef.current.videoWidth > 80 &&
          videoRef.current.videoHeight > 80
        ) {
          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          if (canvasRef.current.width !== vw || canvasRef.current.height !== vh) {
            canvasRef.current.width = vw;
            canvasRef.current.height = vh;
          }

          // Papatakbuhin ang tensorflow model upang mahulaan ang lokasyon ng joints ng mukha at katawan.
          const poses = await detectorRef.current.estimatePoses(videoRef.current);
          let rawPose: Pose | null = null;

          if (poses.length > 0) {
            const candidate = poses[0] as Pose;

            // Siyasatin kung ang kahit isang skeletal joint ay may sapat na visibility score (confidence > 0.05).
            const confidentKps = candidate.keypoints.filter(kp => (kp.score || 0) > 0.05);
            let isValid = confidentKps.length >= 1;

            // Alisin sa pagtutok ang sino mang background o dumadaang tao sa likod (anti-photo-bombing filter).
            const leftShoulder = candidate.keypoints[5];
            const rightShoulder = candidate.keypoints[6];
            if (isValid && leftShoulder && rightShoulder && (leftShoulder.score || 0) > 0.25 && (rightShoulder.score || 0) > 0.25) {
              const shoulderDist = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
              if (shoulderDist < 8) {
                isValid = false; // Masyadong malayo o napakaliit na balikat, ibig sabihin background entity ito.
              }
            }

            // Suriin ang biglaang pagtalon ng lokasyon ng ilong upang maiwasan ang coordinate glitching.
            const nose = candidate.keypoints[0];
            if (isValid && nose && (nose.score || 0) > 0.4) {
              if (lastNosePosRef.current) {
                const distNose = Math.hypot(nose.x - lastNosePosRef.current.x, nose.y - lastNosePosRef.current.y);
                if (distNose > 280) {
                  consecutiveRejectedFramesRef.current += 1;
                  if (consecutiveRejectedFramesRef.current < 30) {
                    isValid = false; // I-reject muna ang frame na ito pansamantala habang sinusuri.
                  } else {
                    lastNosePosRef.current = { x: nose.x, y: nose.y };
                    consecutiveRejectedFramesRef.current = 0;
                  }
                } else {
                  lastNosePosRef.current = { x: nose.x, y: nose.y };
                  consecutiveRejectedFramesRef.current = 0;
                }
              } else {
                lastNosePosRef.current = { x: nose.x, y: nose.y };
              }
            }

            if (isValid) {
              rawPose = candidate; // Ang pose na ito ay lehitimo at ipapasa sa analysis pipeline!
            }
          }

          if (rawPose) {
            const smoothedPose = smoothPose(rawPose); // I-smooth ang jittering gamit ang motion logic noise filter.
            onPoseRef.current(smoothedPose); // I-send ang filtered skeletal points sa Workout view.
            drawPose(smoothedPose); // Draw the bones and dots on canvas!
          } else {
            // I-report na walang nakitang lehitimong tao sa view para mag-trigger ang warning overlay.
            onPoseRef.current({ keypoints: [], score: 0 });
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }

          // Suriin ang kalidad ng ilaw sa silid (Brightness calculation tag).
          const now = Date.now();
          if (now - lastQualityCheckRef.current > 2000 && onQualityRef.current) {
            try {
              const offscreenCanvas = document.createElement('canvas');
              offscreenCanvas.width = 16;
              offscreenCanvas.height = 16;
              const offscreenCtx = offscreenCanvas.getContext('2d');
              if (offscreenCtx && videoRef.current) {
                offscreenCtx.drawImage(videoRef.current, 0, 0, 16, 16);
                const imageData = offscreenCtx.getImageData(0, 0, 16, 16);
                const data = imageData.data;
                let brightnessSum = 0;
                for (let i = 0; i < data.length; i += 4) {
                  brightnessSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
                }
                const avgBrightness = brightnessSum / (data.length / 4);
                
                let result: 'dark' | 'bright' | 'good' = 'good';
                if (avgBrightness < 14) result = 'dark'; // Sobrang dilim
                else if (avgBrightness > 245) result = 'bright'; // Sobrang silaw
                
                onQualityRef.current({ brightness: result });
                lastQualityCheckRef.current = now;
              }
            } catch (brightnessErr) {
              console.warn('Offscreen brightness check failed:', brightnessErr);
            }
          }
        }
      } catch (err: any) {
        const errMsg = err?.toString() || "";
        if (errMsg.includes('yMin') || errMsg.includes('null (reading')) {
          console.warn("Temporary bounding box skip.");
        } else {
          console.error("Pose detection error:", err);
        }
      }
      // Recursion request animation frame parameter
      requestRef.current = requestAnimationFrame(renderFrame);
    }

    setupCamera();

    // Cleanup: Patayin ang camera devices at recursion hooks sa tuwing aalis ng view!
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop()); // Stop the hardware indicator green light.
      }
    };
  }, [isSimulated]);

  // Integrated Simulator Loop Hook
  useEffect(() => {
    if (!isSimulated) return;

    setIsLoading(false);
    setError(null);
    onReadyRef.current?.();

    if (canvasRef.current) {
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }

    let simRequest: number;
    function renderSimulatedLoop() {
      const pose = getSimulatedPose(exercise, simFrameRef.current++, simPreset);
      onPoseRef.current(pose);
      drawPose(pose);
      simRequest = requestAnimationFrame(renderSimulatedLoop);
    }

    simRequest = requestAnimationFrame(renderSimulatedLoop);

    return () => {
      cancelAnimationFrame(simRequest);
    };
  }, [isSimulated, simPreset, exercise]);

  function smoothPose(newPose: Pose): Pose {
    if (!smoothedPoseRef.current) {
      smoothedPoseRef.current = newPose;
      return newPose;
    }

    const smoothedKeypoints = newPose.keypoints.map((kp, i) => {
      const prevKp = smoothedPoseRef.current!.keypoints[i];
      if (!prevKp) return kp;

      const dx = kp.x - prevKp.x;
      const dy = kp.y - prevKp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const score = kp.score || 0;

      // Ultra-precise and highly sticky biometric motion filtering:
      // 1. For minuscule motion (sub-pixel camera noise or static posture), use extremely low alpha to lock points in place
      // 2. For medium to fast motions of physical exercise, scale alpha up to 0.85 so lines/points immediately follow the limbs with absolute 1:1 fidelity
      // 3. For low-confidence keypoints (e.g. self-occluded sides or transient shadows), drop alpha to prevent noisy coordinate hops
      let alpha = 0.65; // High responsiveness default so skeleton sticks to limbs perfectly

      if (dist < 1.0) {
        alpha = 0.03; // Static posture lock (filters micro-jitter)
      } else if (dist < 6.0) {
        const t = (dist - 1.0) / 5.0;
        alpha = 0.03 + t * 0.62; // scales smoothly from 0.03 to 0.65
      } else {
        const t = Math.min(1.0, (dist - 6.0) / 14.0);
        alpha = 0.65 + t * 0.22; // scales up to 0.87 for active exercise speeds (zero-lag 1:1 tracking)
      }

      // Safeguard against low-confidence coordinate hops
      if (score < 0.22) {
        alpha = Math.min(alpha, 0.08);
      } else if (score < 0.45) {
        alpha = Math.min(alpha, 0.28);
      }

      return {
        ...kp,
        x: prevKp.x + alpha * dx,
        y: prevKp.y + alpha * dy,
        score: kp.score
      };
    });

    const smoothedPose = { ...newPose, keypoints: smoothedKeypoints };
    smoothedPoseRef.current = smoothedPose;
    return smoothedPose;
  }

  function drawPose(pose: Pose) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Background style if we are in simulated grid mode
    if (isSimulated) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw biomechanics cyberpunk calibration grid lines
      ctx.strokeStyle = 'rgba(132, 204, 22, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvasRef.current.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasRef.current.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvasRef.current.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasRef.current.width, y);
        ctx.stroke();
      }

      // Draw horizontal scanner bar
      ctx.strokeStyle = 'rgba(132, 204, 22, 0.12)';
      ctx.lineWidth = 1.5;
      const scanY = (Date.now() / 15) % canvasRef.current.height;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvasRef.current.width, scanY);
      ctx.stroke();

      // Scanner telemetry overlay
      ctx.font = 'bold 9px "JetBrains Mono", Courier, monospace';
      ctx.fillStyle = 'rgba(132, 204, 22, 0.75)';
      ctx.fillText(`BIOMETRIC VIRTUAL SIMULATOR RUNNING: ${exercise.toUpperCase()}`, 15, 30);
      ctx.fillText(`PRESET PREVIEW MODEL: ${simPreset.toUpperCase()}`, 15, 45);
      ctx.fillText(`COW: COMPILATION HEALTH STATUS - OK`, 15, 60);
    }
    
    const keypoints = pose.keypoints;
    // Lower threshold from 0.22 to 0.15 for robust side-profile and distant posture rendering
    const isVisible = (kp: any) => kp && (kp.score || 0) > 0.15;

    const lS = keypoints[5];
    const rS = keypoints[6];
    const lE = keypoints[7];
    const rE = keypoints[8];
    const lW = keypoints[9];
    const rW = keypoints[10];
    const lH = keypoints[11];
    const rH = keypoints[12];
    const lK = keypoints[13];
    const rK = keypoints[14];
    const lA = keypoints[15];
    const rA = keypoints[16];

    const leftSideVisible = isVisible(lS) && isVisible(lH) && isVisible(lK) && isVisible(lA);
    const rightSideVisible = isVisible(rS) && isVisible(rH) && isVisible(rK) && isVisible(rA);
    const isFullBodyPositioned = leftSideVisible || rightSideVisible || (isVisible(lS) && isVisible(rS) && isVisible(lH) && isVisible(rH));

    // Draw face markers (indices 0 to 4: eyes, nose, ears)
    pose.keypoints.forEach((kp, idx) => {
      if (idx < 5 && (kp.score || 0) > 0.15) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    });
    
    // Skeleton connections
    ctx.strokeStyle = '#84cc16';
    ctx.lineWidth = 3;
    ADJACENT_KEYPOINTS.forEach(([i, j]) => {
      const kp1 = pose.keypoints[i];
      const kp2 = pose.keypoints[j];
      if (kp1 && kp2 && (kp1.score || 0) > 0.15 && (kp2.score || 0) > 0.15) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    });

    // Joint markers
    pose.keypoints.forEach((kp, idx) => {
      if (idx >= 5 && (kp.score || 0) > 0.15) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Dynamic numeric labels
    const drawUprightText = (text: string, x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y - 18);
      if (!isSimulated) {
        ctx.scale(-1, 1); // Flip x coordinate to offset external mirror css layout
      }
      
      ctx.font = 'bold 10px "JetBrains Mono", "Fira Code", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textWidth = ctx.measureText(text).width;
      const paddingX = 6;
      const paddingY = 4;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = 14 + paddingY;
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 4);
      } else {
        ctx.rect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
      }
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(132, 204, 22, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
 
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
      
      ctx.restore();
    };

    const isKpOk = (kp: any) => kp && (kp.score || 0) > 0.15;

    // Left knee angle
    if (isKpOk(lH) && isKpOk(lK) && isKpOk(lA)) {
      const angle = calculateAngle(lH, lK, lA);
      drawUprightText(`L-Knee: ${Math.round(angle)}°`, lK.x, lK.y);
    }
    // Right knee angle
    if (isKpOk(rH) && isKpOk(rK) && isKpOk(rA)) {
      const angle = calculateAngle(rH, rK, rA);
      drawUprightText(`R-Knee: ${Math.round(angle)}°`, rK.x, rK.y);
    }
    // Left elbow angle
    if (isKpOk(lS) && isKpOk(lE) && isKpOk(lW)) {
      const angle = calculateAngle(lS, lE, lW);
      drawUprightText(`L-Elb: ${Math.round(angle)}°`, lE.x, lE.y);
    }
    // Right elbow angle
    if (isKpOk(rS) && isKpOk(rE) && isKpOk(rW)) {
      const angle = calculateAngle(rS, rE, rW);
      drawUprightText(`R-Elb: ${Math.round(angle)}°`, rE.x, rE.y);
    }
    // Left hip angle
    if (isKpOk(lS) && isKpOk(lH) && isKpOk(lK)) {
      const angle = calculateAngle(lS, lH, lK);
      drawUprightText(`L-Hip: ${Math.round(angle)}°`, lH.x, lH.y);
    }
    // Right hip angle
    if (isKpOk(rS) && isKpOk(rH) && isKpOk(rK)) {
      const angle = calculateAngle(rS, rH, rK);
      drawUprightText(`R-Hip: ${Math.round(angle)}°`, rH.x, rH.y);
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0d14] flex items-center justify-center">
      
      {/* 1. Camera Error & Permissions Block - ONLY if not simulated */}
      {error && !isSimulated ? (
        <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 text-slate-100 backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 animate-bounce">
            <AlertTriangle className="w-6 h-6" />
          </div>
          
          <h3 className="font-sans font-black uppercase tracking-tight text-white text-base leading-none mb-2">
            Camera Connection Restricted
          </h3>
          
          <p className="text-[11px] text-slate-400 font-medium max-w-[320px] leading-relaxed mb-6">
            Standard browsers block microphone/camera permissions inside sandboxed iframes. To resolve, click <strong className="text-white">Open in New Tab</strong> above, or activate our interactive biometric simulator below!
          </p>

          <div className="flex flex-col gap-2 w-full max-w-[280px]">
            {/* CTA 1: Switch to Biometric Gym Simulator */}
            <button
               onClick={() => setIsSimulated(true)}
              className="bg-lime-500 hover:bg-lime-450 text-black font-black uppercase italic tracking-tighter text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <Tv className="w-4 h-4 text-black" />
              <span>LAUNCH AI GYM SIMULATOR</span>
            </button>

            {/* CTA 2: Instructions to open in tab */}
            <button
              onClick={() => {
                window.open(window.location.href, '_blank');
              }}
              className="bg-white/5 border border-white/15 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[10px] py-1.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab (Fixes Camera)</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. Loading state while tfjs loads and webcam connects */}
      {isLoading && !isSimulated ? (
        <div className="absolute inset-0 z-25 bg-slate-950 flex flex-col items-center justify-center text-slate-300">
          <RefreshCw className="w-8 h-8 text-lime-500 animate-spin mb-3" />
          <p className="font-mono text-xs uppercase tracking-widest text-lime-500/80">Securing WebGL Core Feed...</p>
        </div>
      ) : null}

      {/* 3. Real video feed mirror wrapper */}
      {!isSimulated && (
        <video 
          ref={videoRef} 
          style={{ filter: `brightness(${brightness}%)` }} 
          className={`absolute inset-0 w-full h-full ${cameraFit === 'cover' ? 'object-cover' : 'object-contain'} scale-x-[-1] transition-all duration-300`} 
          playsInline 
          muted 
        />
      )}

      {/* 4. Common analytical Canvas element */}
      <canvas 
        ref={canvasRef} 
        style={{ filter: `brightness(${brightness}%)` }} 
        className={`absolute inset-0 w-full h-full ${cameraFit === 'cover' ? 'object-cover' : 'object-contain'} z-10 transition-all duration-300 ${!isSimulated ? 'scale-x-[-1]' : ''}`} 
      />

      {/* 5. Workout Simulator Controls */}
      {isSimulated && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-lime-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span>Interactive Posture Debugger</span>
            </span>
            <button
              onClick={() => {
                setIsSimulated(false);
                setError(null);
                setIsLoading(true);
              }}
              className="text-[8.5px] font-black uppercase tracking-widest text-[#84cc16] hover:text-white px-2 py-0.5 rounded border border-[#84cc16]/30 hover:border-white/30 transition-all"
            >
              Retry Real Camera
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
            {/* Perfect Form */}
            <button
              onClick={() => setSimPreset('perfect')}
              className={`text-[9px] font-extrabold uppercase py-1.5 px-2 rounded-xl border transition-all truncate flex items-center justify-center gap-1.5 ${
                simPreset === 'perfect'
                  ? 'bg-lime-500/15 border-lime-400 text-[#84cc16]'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              {simPreset === 'perfect' && <Check className="w-3 h-3 text-[#84cc16]" />}
              <span>Perfect Form</span>
            </button>

            {/* Skewed / Crooked shoulders */}
            <button
              onClick={() => setSimPreset('tilt')}
              className={`text-[9px] font-extrabold uppercase py-1.5 px-2 rounded-xl border transition-all truncate flex items-center justify-center gap-1.5 ${
                simPreset === 'tilt'
                  ? 'bg-amber-500/15 border-amber-400 text-amber-400'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              {simPreset === 'tilt' && <Check className="w-3 h-3 text-amber-400" />}
              <span>Tilt Pose</span>
            </button>

            {/* Shallow squat range */}
            <button
              onClick={() => setSimPreset('depth')}
              className={`text-[9px] font-extrabold uppercase py-1.5 px-2 rounded-xl border transition-all truncate flex items-center justify-center gap-1.5 ${
                simPreset === 'depth'
                  ? 'bg-indigo-500/15 border-indigo-400 text-indigo-400'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              {simPreset === 'depth' && <Check className="w-3 h-3 text-indigo-400" />}
              <span>Shallow Depth</span>
            </button>

            {/* Sagging hips for pushup */}
            <button
              onClick={() => setSimPreset('sag')}
              className={`text-[9px] font-extrabold uppercase py-1.5 px-2 rounded-xl border transition-all truncate flex items-center justify-center gap-1.5 ${
                simPreset === 'sag'
                  ? 'bg-red-500/15 border-red-400 text-red-400'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              {simPreset === 'sag' && <Check className="w-3 h-3 text-red-400" />}
              <span>Sagging Spine</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
