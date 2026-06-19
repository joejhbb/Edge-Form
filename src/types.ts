// ============================================================================
// 🛡️ THESIS TUTORIAL NOTE (TYPES.TS):
// Ang file na ito ang naglalarawan ng "Shapes" o Structures ng variables natin.
// Tinitiyak nito na walang maling tipo ng data (e.g. text sa numero) na maipapasa sa buong system.
// ============================================================================

export type Pose = {
  // Naglalaman ng listahan ng lahat ng joints ng katawan (skeletal keypoints) na nakuha ng camera
  keypoints: Keypoint[];
  // Pangkalahatang kalidad o tracking confidence score ng pose na ito (0.0 hanggang 1.0)
  score?: number;
};

export type Keypoint = {
  // X at Y coordinate ng joint sa screen (halimbawa: Left Shoulder o Right Hip)
  x: number;
  y: number;
  // Gaano kasiguro ang AI engine na ito ay tamang joint (confidence level ng sensor)
  score?: number;
  // Pangalan ng joint (halimbawa: "left_knee", "right_hip", "nose", etc.)
  name?: string;
};

export type WorkoutState = {
  // Total reps o bilang na matagumpay na nagawa sa kasalukuyang session
  reps: number;
  // Posture or range of motion accuracy score (e.g., 95% perfect depth)
  score: number;
  // Real-time voice/visual feedback instruction (e.g., "Lower your chest")
  feedback: string;
  // Flags para sa state machine (na-detect na pababa na ang katawan)
  isDescending: boolean;
  // Min/Max angles na naitala sa kasalukuyang rep para sa analytics
  minKneeAngle: number;
  // Max knee angle (tuwid na tayo)
  maxKneeAngle: number;
};

// Halimbawa: 'squat', 'pushup', 'plank'
export type ExerciseType = string;

export type UserProfile = {
  // Profile demographics na ginagamit sa calories calculation at daily goal algorithm
  gender: 'male' | 'female' | 'other';
  age: number;
  weight: number; // Timbang (kg)
  height: number; // Taas (cm)
  // Fitness Objective
  goal: 'lose_weight' | 'gain_weight' | 'muscle_gain' | 'shape_body' | 'improve_endurance' | 'stay_healthy';
  // Kasalukuyang lakas o sanay ng katawan
  activityLevel: 'beginner' | 'intermediate' | 'advanced';
  name?: string;
  email?: string; // Susi sa user-keyed sa LocalStorage database
  password?: string;
  sleepHours?: string;
  hasKneeSensitivity?: boolean; // Kung may pananakit sa tuhod (reduces threshold squat goals)
  hasBackPain?: boolean;        // Kung may sakit sa likod (warns system to relax posture sag)
  hydrationLevel?: string;
  energyLevel?: string;
};

// Ang iba't-ibang Views/Screens na pinapalitan ng aming central router
export type AppView = 'splash' | 'onboarding' | 'auth' | 'profile_setup' | 'dashboard' | 'exercise_select' | 'profile' | 'warmup' | 'workout' | 'summary' | 'fuel' | 'progress';

