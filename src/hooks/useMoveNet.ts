import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { useEffect, useState } from 'react';
import { Pose } from '../types';

export function useMoveNet() {
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadModel() {
      try {
        // Force TensorFlow.js environment to disable WebGPU to bypass GPUDevice and createBuffer crashes on specific GPUs/browsers.
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
          console.warn('Failed to force WebGL backend:', backendError);
        }
        await tf.ready();
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        };
        const newDetector = await poseDetection.createDetector(model, detectorConfig);
        setDetector(newDetector);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading MoveNet:', err);
        setError('Failed to initialize tracking');
        setIsLoading(false);
      }
    }
    loadModel();
  }, []);

  const estimatePoses = async (image: HTMLVideoElement | HTMLCanvasElement): Promise<Pose[]> => {
    if (!detector) return [];
    const poses = await detector.estimatePoses(image);
    return poses as Pose[];
  };

  return { detector, isLoading, error, estimatePoses };
}
