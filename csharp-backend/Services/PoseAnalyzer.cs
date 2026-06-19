using PoseDetectorApp.Models;

namespace PoseDetectorApp.Services
{
    public class PoseAnalyzer
    {
        public static double CalculateAngle(Keypoint p1, Keypoint p2, Keypoint p3)
        {
            double radians = Math.Atan2(p3.Y - p2.Y, p3.X - p2.X) - Math.Atan2(p1.Y - p2.Y, p1.X - p2.X);
            double angle = Math.Abs((radians * 180.0) / Math.PI);
            if (angle > 180.0)
            {
                angle = 360.0 - angle;
            }
            return angle;
        }

        public static string? CheckEnvironmentAndPoseQuality(Pose pose, string quality)
        {
            var keypoints = pose.Keypoints;

            var nose = keypoints.FirstOrDefault(k => k.Name == "nose") ?? keypoints.ElementAtOrDefault(0);
            var lEye = keypoints.FirstOrDefault(k => k.Name == "left_eye") ?? keypoints.ElementAtOrDefault(1);
            var rEye = keypoints.FirstOrDefault(k => k.Name == "right_eye") ?? keypoints.ElementAtOrDefault(2);
            var lEar = keypoints.FirstOrDefault(k => k.Name == "left_ear") ?? keypoints.ElementAtOrDefault(3);
            var rEar = keypoints.FirstOrDefault(k => k.Name == "right_ear") ?? keypoints.ElementAtOrDefault(4);
            var lS = keypoints.FirstOrDefault(k => k.Name == "left_shoulder") ?? keypoints.ElementAtOrDefault(5);
            var rS = keypoints.FirstOrDefault(k => k.Name == "right_shoulder") ?? keypoints.ElementAtOrDefault(6);

            var lH = keypoints.FirstOrDefault(k => k.Name == "left_hip") ?? keypoints.ElementAtOrDefault(11);
            var rH = keypoints.FirstOrDefault(k => k.Name == "right_hip") ?? keypoints.ElementAtOrDefault(12);
            var lK = keypoints.FirstOrDefault(k => k.Name == "left_knee") ?? keypoints.ElementAtOrDefault(13);
            var rK = keypoints.FirstOrDefault(k => k.Name == "right_knee") ?? keypoints.ElementAtOrDefault(14);
            var lA = keypoints.FirstOrDefault(k => k.Name == "left_ankle") ?? keypoints.ElementAtOrDefault(15);
            var rA = keypoints.FirstOrDefault(k => k.Name == "right_ankle") ?? keypoints.ElementAtOrDefault(16);

            var faceKps = new List<Keypoint?> { nose, lEye, rEye, lEar, rEar };
            int trackedFacePointsCount = faceKps.Count(kp => kp != null && (kp.Score ?? 0.0) > 0.03);
            bool isFaceTrackable = trackedFacePointsCount >= 2;

            var upperTorsoKps = new List<Keypoint?> { lS, rS };
            bool isTorsoTrackable = upperTorsoKps.Count(kp => kp != null && (kp.Score ?? 0.0) > 0.03) >= 1;

            bool isAnyUpperBodyTracked = isFaceTrackable || isTorsoTrackable;

            var lowerBodyPoints = new List<Keypoint?> { lH, rH, lK, rK, lA, rA };
            int detectedLowerBodyCount = lowerBodyPoints.Count(kp => kp != null && (kp.Score ?? 0.0) > 0.03);

            var visibleKps = keypoints.Where(k => (k.Score ?? 0.0) > 0.03).ToList();

            // PRIORITY 1: ACCURATE STANCE POSITIONING / CLOSE TO CAMERA
            if (isAnyUpperBodyTracked && detectedLowerBodyCount < 1)
            {
                return "Too close to the camera! Please step back a bit";
            }

            // Estimate bounding box coords to check overflow
            if (visibleKps.Count >= 3)
            {
                var yCoords = visibleKps.Select(k => k.Y).ToList();
                var xCoords = visibleKps.Select(k => k.X).ToList();
                double minY = yCoords.Min();
                double maxY = yCoords.Max();
                double minX = xCoords.Min();
                double maxX = xCoords.Max();
                double height = maxY - minY;
                double width = maxX - minX;

                if (height > 430 || width > 590)
                {
                    return "Too close to the camera! Please step back a bit";
                }
            }

            if (isAnyUpperBodyTracked && visibleKps.Count < 3)
            {
                return "Position full body in frame";
            }

            // PRIORITY 1.5: SHOULDER TILT DETECTION (Nakatabingi Alert)
            if (lS != null && rS != null && (lS.Score ?? 0.0) > 0.20 && (rS.Score ?? 0.0) > 0.20)
            {
                double shoulderWidth = Math.Abs(lS.X - rS.X);
                if (shoulderWidth > 40)
                {
                    double shoulderDiffY = Math.Abs(lS.Y - rS.Y);
                    double tiltRatio = shoulderDiffY / shoulderWidth;
                    if (tiltRatio > 0.15)
                    {
                        return "Posturing tilted! Please stand straight and chest level";
                    }
                }
            }

            // PRIORITY 2: LIGHTING ALERTS
            bool isAnyJointTrackable = visibleKps.Count >= 2;
            if (!isAnyJointTrackable)
            {
                if (quality == "dark")
                {
                    return "Too dark! Brighten your room";
                }
                else if (quality == "bright")
                {
                    return "Too bright! Adjust lighting";
                }
                else
                {
                    return "Position full body in frame";
                }
            }

            return null;
        }

        // ==========================================
        // 💎 STUDY NOTES FOR DEFENSE:
        // 'AnalyzeSquat' - Sinusuri ang squat posture:
        // 1. Tinitingnan muna kung okay ang layo at liwanag ng kwarto sa pamamagitan ng 'CheckEnvironmentAndPoseQuality'.
        // 2. Hinahanap ang mga critical joints: Shoulder (S), Hip (H), Knee (K), Ankle (A).
        // 3. Ginagamit ang 'CalculateAngle' para malaman ang 'kneeAngle' (flexion ng tuhod).
        // ==========================================
        public static AnalyzeResponse AnalyzeSquat(Pose pose, SquatState state, string quality)
        {
            string? envCheck = CheckEnvironmentAndPoseQuality(pose, quality);
            if (envCheck != null)
            {
                state.SkippedRepAlert = false;
                return new AnalyzeResponse
                {
                    Message = envCheck,
                    IsCorrect = false,
                    Score = 0,
                    NewState = state
                };
            }

            var keypoints = pose.Keypoints;

            var lS = keypoints.FirstOrDefault(k => k.Name == "left_shoulder") ?? keypoints.ElementAtOrDefault(5);
            var lH = keypoints.FirstOrDefault(k => k.Name == "left_hip") ?? keypoints.ElementAtOrDefault(11);
            var lK = keypoints.FirstOrDefault(k => k.Name == "left_knee") ?? keypoints.ElementAtOrDefault(13);
            var lA = keypoints.FirstOrDefault(k => k.Name == "left_ankle") ?? keypoints.ElementAtOrDefault(15);

            var rS = keypoints.FirstOrDefault(k => k.Name == "right_shoulder") ?? keypoints.ElementAtOrDefault(6);
            var rH = keypoints.FirstOrDefault(k => k.Name == "right_hip") ?? keypoints.ElementAtOrDefault(12);
            var rK = keypoints.FirstOrDefault(k => k.Name == "right_knee") ?? keypoints.ElementAtOrDefault(14);
            var rA = keypoints.FirstOrDefault(k => k.Name == "right_ankle") ?? keypoints.ElementAtOrDefault(16);

            // Clean with symmetric side fallbacks to support absolute side profiles and far distance tracking
            var cleanLS = (lS != null && (lS.Score ?? 0.0) > 0.03) ? lS : rS;
            var cleanRS = (rS != null && (rS.Score ?? 0.0) > 0.03) ? rS : lS;
            var cleanLH = (lH != null && (lH.Score ?? 0.0) > 0.03) ? lH : rH;
            var cleanRH = (rH != null && (rH.Score ?? 0.0) > 0.03) ? rH : lH;
            var cleanLK = (lK != null && (lK.Score ?? 0.0) > 0.03) ? lK : rK;
            var cleanRK = (rK != null && (rK.Score ?? 0.0) > 0.03) ? rK : lK;
            var cleanLA = (lA != null && (lA.Score ?? 0.0) > 0.03) ? lA : rA;
            var cleanRA = (rA != null && (rA.Score ?? 0.0) > 0.03) ? rA : lA;

            bool leftVisible = cleanLH != null && cleanLK != null && cleanLA != null && cleanLS != null && 
                               (cleanLH.Score ?? 0.0) > 0.03 && (cleanLK.Score ?? 0.0) > 0.03 && (cleanLA.Score ?? 0.0) > 0.03;
            bool rightVisible = cleanRH != null && cleanRK != null && cleanRA != null && cleanRS != null && 
                                (cleanRH.Score ?? 0.0) > 0.03 && (cleanRK.Score ?? 0.0) > 0.03 && (cleanRA.Score ?? 0.0) > 0.03;

            if (!leftVisible && !rightVisible)
            {
                state.SkippedRepAlert = false;
                return new AnalyzeResponse
                {
                    Message = "Position full body in frame",
                    IsCorrect = false,
                    Score = 0,
                    NewState = state
                };
            }

            double leftKneeAngle = leftVisible ? CalculateAngle(cleanLH!, cleanLK!, cleanLA!) : 0;
            double rightKneeAngle = rightVisible ? CalculateAngle(cleanRH!, cleanRK!, cleanRA!) : 0;
            double avgKneeAngle = (leftVisible && rightVisible) 
                ? (leftKneeAngle + rightKneeAngle) / 2.0 
                : (leftVisible ? leftKneeAngle : rightKneeAngle);

            double CalculateTorsoLean(Keypoint shoulder, Keypoint hip)
            {
                var verticalPoint = new Keypoint { X = hip.X, Y = hip.Y - 100 };
                return CalculateAngle(shoulder, hip, verticalPoint);
            }

            double leftTorsoLean = leftVisible ? CalculateTorsoLean(cleanLS!, cleanLH!) : 0;
            double rightTorsoLean = rightVisible ? CalculateTorsoLean(cleanRS!, cleanRH!) : 0;
            double avgTorsoLean = (leftVisible && rightVisible)
                ? (leftTorsoLean + rightTorsoLean) / 2.0
                : (leftVisible ? leftTorsoLean : rightTorsoLean);

            string detectedViewMode = "unknown";
            if (leftVisible && rightVisible)
            {
                double shoulderWidth = Math.Abs(cleanLS!.X - cleanRS!.X);
                double hipWidth = Math.Abs(cleanLH!.X - cleanRH!.X);
                double heightLeft = Math.Abs(cleanLS!.Y - cleanLA!.Y);
                double heightRight = Math.Abs(cleanRS!.Y - cleanRA!.Y);
                double avgHeight = (heightLeft + heightRight) / 2.0;

                if (shoulderWidth > avgHeight * 0.16 && hipWidth > avgHeight * 0.12)
                {
                    detectedViewMode = "front";
                }
                else
                {
                    detectedViewMode = "side";
                }
            }
            else
            {
                detectedViewMode = "side";
            }

            string message = "Stand tall to start squat";
            var nextState = new SquatState
            {
                IsDescending = state.IsDescending,
                Reps = state.Reps,
                LastKneeAngle = avgKneeAngle,
                MinDescentScore = state.MinDescentScore,
                DepthReached = state.DepthReached,
                TooDeepReached = state.TooDeepReached,
                MinKneeAngle = state.MinKneeAngle,
                ViewMode = detectedViewMode,
                SkippedRepReason = state.SkippedRepReason,
                SkippedRepAlert = state.SkippedRepAlert,
                SquatDepthPercent = Math.Min(100, Math.Max(0, Math.Round(((150.0 - avgKneeAngle) / (150.0 - 90.0)) * 100.0))),
                DescentStartTimeMs = state.DescentStartTimeMs
            };

            double deductions = 0;

            // 1. STANCE WIDTH CHECK (Pediatric/Science parameters)
            if (detectedViewMode == "front" && leftVisible && rightVisible)
            {
                double shoulderWidth = Math.Abs(lS!.X - rS!.X);
                double stanceWidth = Math.Abs(lA!.X - rA!.X);
                double ratio = stanceWidth / Math.Max(1.0, shoulderWidth);

                if (ratio < 0.85)
                {
                    deductions += 30; // Heavily penalize feet connecting/stuck close
                    message = "Widen feet! Stance is too narrow";
                }
                else if (ratio < 0.95)
                {
                    deductions += 15;
                    message = "Widen feet to shoulder-width";
                }
                else if (ratio > 1.6)
                {
                    deductions += 15;
                    message = "Narrow your feet stance slightly";
                }
            }
            else if (detectedViewMode == "side" && lA != null && rA != null && (lA.Score ?? 0.0) > 0.25 && (rA.Score ?? 0.0) > 0.25)
            {
                double ankleAnkleHorizontalDist = Math.Abs(lA.X - rA.X);
                double bodyHeight = lS != null ? Math.Abs(lS.Y - lA.Y) : 300.0;
                if (ankleAnkleHorizontalDist > bodyHeight * 0.16)
                {
                    deductions += 15;
                    message = "Keep feet aligned! Do not stagger feet in side-view";
                }
            }

            // 2. KNEE VALGUS (Knees buckling inward)
            if (detectedViewMode == "front" && leftVisible && rightVisible && avgKneeAngle < 140)
            {
                double hipWidth = Math.Abs(lH!.X - rH!.X);
                double kneeWidth = Math.Abs(lK!.X - rK!.X);
                double ankleWidth = Math.Abs(lA!.X - rA!.X);

                if (kneeWidth < ankleWidth * 0.82 || kneeWidth < hipWidth * 0.82)
                {
                    deductions += 25;
                    message = "Push knees out inline with toes";
                }
            }

            // 3. TORSO POSITIONING
            if (avgKneeAngle < 140)
            {
                if (avgTorsoLean > 45)
                {
                    deductions += Math.Min(35.0, Math.Round((avgTorsoLean - 45.0) * 2.0));
                    message = "Chest up! Leaning too far forward (20°-45° ideal)";
                }
                else if (avgTorsoLean < 20)
                {
                    deductions += 15;
                    message = "Chest too upright! Lean forward slightly (20°-45° ideal)";
                }
            }

            // 4. SYMMETRY
            if (detectedViewMode == "front" && leftVisible && rightVisible && avgKneeAngle < 145)
            {
                double diff = Math.Abs(leftKneeAngle - rightKneeAngle);
                if (diff > 20)
                {
                    deductions += 12;
                    message = "Balance weight evenly on both feet";
                }
            }

            // 4b. SHOULDER/BODY TILT (Alisin ang tagilid)
            if (lS != null && rS != null && (lS.Score ?? 0) > 0.10 && (rS.Score ?? 0) > 0.10 && avgKneeAngle < 150)
            {
                var sideShoulderPoint = leftVisible ? lS : rS;
                var sideHipPoint = leftVisible ? lH : rH;
                double torsoLen = (sideShoulderPoint != null && sideHipPoint != null) 
                    ? Math.Max(50.0, Math.Abs(sideShoulderPoint.Y - sideHipPoint.Y)) 
                    : 150.0;

                double shoulderDiffY = Math.Abs(lS.Y - rS.Y);
                double shoulderTiltRatio = shoulderDiffY / torsoLen;
                if (shoulderTiltRatio > 0.08)
                {
                    deductions += 25;
                    message = "Alisin ang tagilid! Keep your shoulders level and your stance straight.";
                }
            }

            if (lH != null && rH != null && (lH.Score ?? 0) > 0.10 && (rH.Score ?? 0) > 0.10 && avgKneeAngle < 150)
            {
                var sideShoulderPoint = leftVisible ? lS : rS;
                var sideHipPoint = leftVisible ? lH : rH;
                double torsoLen = (sideShoulderPoint != null && sideHipPoint != null) 
                    ? Math.Max(50.0, Math.Abs(sideShoulderPoint.Y - sideHipPoint.Y)) 
                    : 150.0;

                double hipDiffY = Math.Abs(lH.Y - rH.Y);
                double hipTiltRatio = hipDiffY / torsoLen;
                if (hipTiltRatio > 0.08)
                {
                    deductions += 20;
                    message = "Alisin ang tagilid! Keep your hips level and weight balanced.";
                }
            }

            // 5. DEPTH VALIDATION
            bool isDeepEnough = avgKneeAngle <= 112 && avgKneeAngle >= 80;
            bool isTooDeep = avgKneeAngle < 80;

            double frameScore = Math.Max(0.0, 100.0 - deductions);

            if (avgKneeAngle < 140)
            {
                if (!state.IsDescending)
                {
                    nextState.IsDescending = true;
                    nextState.MinDescentScore = frameScore;
                    nextState.DepthReached = false;
                    nextState.TooDeepReached = false;
                    nextState.SkippedRepAlert = false;
                    nextState.DescentStartTimeMs = (double)DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                }
                else
                {
                    nextState.MinDescentScore = Math.Min(state.MinDescentScore ?? frameScore, frameScore);
                }

                if (isTooDeep)
                {
                    nextState.TooDeepReached = true;
                    deductions += 15;
                    message = "Too low! Rise slightly to protect your knees and keep parallel form.";
                }
                else if (isDeepEnough)
                {
                    nextState.DepthReached = true;
                    message = "Good squat depth! Parallel standard achieved. Stand back up.";
                }
                else if (avgKneeAngle > 112)
                {
                    message = "Descending smoothly... Go lower to hit parallel target!";
                }
            }
            else if (avgKneeAngle > 142)
            {
                if (state.IsDescending)
                {
                    double finalDescentScore = nextState.MinDescentScore ?? frameScore;
                    double nowMs = (double)DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    double durationMs = nowMs - (state.DescentStartTimeMs ?? 0);

                    if (durationMs < 500)
                    {
                        // Too fast - likely camera jitter or adjusting stance
                        nextState.IsDescending = false;
                        nextState.DepthReached = false;
                        nextState.TooDeepReached = false;
                        nextState.MinDescentScore = 100.0;
                        nextState.DescentStartTimeMs = null;
                        message = "Stand tall to start squat";
                    }
                    else if (state.TooDeepReached)
                    {
                        nextState.SkippedRepAlert = true;
                        nextState.SkippedRepReason = "Rep skipped! You squatted too low (below 80°). Stop descent at 90°-100° parallel.";
                        message = "Rep skipped: Squatted too low";
                    }
                    else if (!state.DepthReached)
                    {
                        nextState.SkippedRepAlert = true;
                        nextState.SkippedRepReason = "Rep skipped! Lacking bend. Squat lower to parallel level.";
                        message = "Rep skipped: Squat lower";
                    }
                    else if (finalDescentScore >= 80)
                    {
                        nextState.Reps = state.Reps + 1;
                        nextState.SkippedRepAlert = false;
                        nextState.SkippedRepReason = "";
                        message = "Great rep! Perfect parallel standard achieved.";
                    }
                    else
                    {
                        nextState.SkippedRepAlert = true;
                        string whySkipped = "Slight posture issue.";
                        if (avgTorsoLean > 45)
                        {
                            whySkipped = "Chest leaned too far forward (20°-45° ideal).";
                        }
                        else if (avgTorsoLean < 20)
                        {
                            whySkipped = "Chest was kept too upright (20°-45° ideal).";
                        }
                        else
                        {
                            whySkipped = "Your body was tilted or misaligned sideways.";
                        }
                        nextState.SkippedRepReason = $"Rep skipped! Form accuracy was only {Math.Round(finalDescentScore)}% (Needs 80%). {whySkipped}";
                        message = "Rep skipped: Focus on good form";
                    }

                    nextState.IsDescending = false;
                    nextState.DepthReached = false;
                    nextState.TooDeepReached = false;
                    nextState.MinDescentScore = 100.0;
                    nextState.DescentStartTimeMs = null;
                }
                else
                {
                    message = "Stand neutral to begin rep";
                }
            }

            if (nextState.IsDescending && !nextState.DepthReached)
            {
                if (avgKneeAngle > 112)
                {
                    message = "Squat lower to bottom position (90°-100°)";
                }
            }

            return new AnalyzeResponse
            {
                Message = message,
                IsCorrect = deductions == 0,
                Score = frameScore,
                NewState = nextState
            };
        }

        public static AnalyzeResponse AnalyzePushup(Pose pose, PushupState state, string quality)
        {
            string? envCheck = CheckEnvironmentAndPoseQuality(pose, quality);
            if (envCheck != null)
            {
                state.SkippedRepAlert = false;
                return new AnalyzeResponse
                {
                    Message = envCheck,
                    IsCorrect = false,
                    Score = 0,
                    NewState = state
                };
            }

            var keypoints = pose.Keypoints;
            var lS = keypoints.FirstOrDefault(k => k.Name == "left_shoulder") ?? keypoints.ElementAtOrDefault(5);
            var lE = keypoints.FirstOrDefault(k => k.Name == "left_elbow") ?? keypoints.ElementAtOrDefault(7);
            var lW = keypoints.FirstOrDefault(k => k.Name == "left_wrist") ?? keypoints.ElementAtOrDefault(9);
            var rS = keypoints.FirstOrDefault(k => k.Name == "right_shoulder") ?? keypoints.ElementAtOrDefault(6);
            var rE = keypoints.FirstOrDefault(k => k.Name == "right_elbow") ?? keypoints.ElementAtOrDefault(8);
            var rW = keypoints.FirstOrDefault(k => k.Name == "right_wrist") ?? keypoints.ElementAtOrDefault(10);

            var lH = keypoints.FirstOrDefault(k => k.Name == "left_hip") ?? keypoints.ElementAtOrDefault(11);
            var lA = keypoints.FirstOrDefault(k => k.Name == "left_ankle") ?? keypoints.ElementAtOrDefault(15);
            var rH = keypoints.FirstOrDefault(k => k.Name == "right_hip") ?? keypoints.ElementAtOrDefault(12);
            var rA = keypoints.FirstOrDefault(k => k.Name == "right_ankle") ?? keypoints.ElementAtOrDefault(16);

            // Clean with symmetric side fallbacks to support absolute side profiles and far distance tracking
            var cleanLS = (lS != null && (lS.Score ?? 0.0) > 0.03) ? lS : rS;
            var cleanRS = (rS != null && (rS.Score ?? 0.0) > 0.03) ? rS : lS;
            var cleanLE = (lE != null && (lE.Score ?? 0.0) > 0.03) ? lE : rE;
            var cleanRE = (rE != null && (rE.Score ?? 0.0) > 0.03) ? rE : lE;
            var cleanLW = (lW != null && (lW.Score ?? 0.0) > 0.03) ? lW : rW;
            var cleanRW = (rW != null && (rW.Score ?? 0.0) > 0.03) ? rW : lW;

            bool leftVisible = cleanLS != null && cleanLE != null && cleanLW != null && 
                               (cleanLS.Score ?? 0.0) > 0.03 && (cleanLE.Score ?? 0.0) > 0.03 && (cleanLW.Score ?? 0.0) > 0.03;
            bool rightVisible = cleanRS != null && cleanRE != null && cleanRW != null && 
                                (cleanRS.Score ?? 0.0) > 0.03 && (cleanRE.Score ?? 0.0) > 0.03 && (cleanRW.Score ?? 0.0) > 0.03;

            if (!leftVisible && !rightVisible)
            {
                state.SkippedRepAlert = false;
                return new AnalyzeResponse
                {
                    Message = "Position body in side profile",
                    IsCorrect = false,
                    Score = 0,
                    NewState = state
                };
            }

            double leftAngle = leftVisible ? CalculateAngle(cleanLS!, cleanLE!, cleanLW!) : 0;
            double rightAngle = rightVisible ? CalculateAngle(cleanRS!, cleanRE!, cleanRW!) : 0;
            double avgElbowAngle = (leftVisible && rightVisible) 
                ? (leftAngle + rightAngle) / 2.0 
                : (leftVisible ? leftAngle : rightAngle);

            string message = "Lower your chest to bottom position";
            var nextState = new PushupState
            {
                IsDescending = state.IsDescending,
                Reps = state.Reps,
                MinDescentScore = state.MinDescentScore ?? 100.0,
                DepthReached = state.DepthReached,
                SkippedRepReason = state.SkippedRepReason,
                SkippedRepAlert = state.SkippedRepAlert
            };

            double deductions = 0;

            bool leftLegVisible = lH != null && lA != null && (lH.Score ?? 0.0) > 0.10 && (lA.Score ?? 0.0) > 0.10;
            bool rightLegVisible = rH != null && rA != null && (rH.Score ?? 0.0) > 0.10 && (rA.Score ?? 0.0) > 0.10;

            bool isAligned = true;
            if (leftVisible && leftLegVisible)
            {
                double alignmentAngle = CalculateAngle(lS!, lH!, lA!);
                if (alignmentAngle < 165)
                {
                    deductions += 20;
                    isAligned = false;
                    message = "Don't sag hips! Keep shoulder, hip, and ankle aligned";
                }
                else if (alignmentAngle > 195)
                {
                    deductions += 20;
                    isAligned = false;
                    message = "Hips too high! Flatten your body";
                }
            }
            else if (rightVisible && rightLegVisible)
            {
                double alignmentAngle = CalculateAngle(rS!, rH!, rA!);
                if (alignmentAngle < 165)
                {
                    deductions += 20;
                    isAligned = false;
                    message = "Don't sag hips! Keep shoulder, hip, and ankle aligned";
                }
                else if (alignmentAngle > 195)
                {
                    deductions += 20;
                    isAligned = false;
                    message = "Hips too high! Flatten your body";
                }
            }
            else
            {
                var lK = keypoints.FirstOrDefault(k => k.Name == "left_knee") ?? keypoints.ElementAtOrDefault(13);
                var rK = keypoints.FirstOrDefault(k => k.Name == "right_knee") ?? keypoints.ElementAtOrDefault(14);
                bool leftKneeVisible = lH != null && lK != null && (lH.Score ?? 0.0) > 0.10 && (lK.Score ?? 0.0) > 0.10;
                bool rightKneeVisible = rH != null && rK != null && (rH.Score ?? 0.0) > 0.10 && (rK.Score ?? 0.0) > 0.10;

                if (leftVisible && leftKneeVisible)
                {
                    double hipAngle = CalculateAngle(lS!, lH!, lK!);
                    if (hipAngle < 155)
                    {
                        deductions += 15;
                        isAligned = false;
                        message = "Don't sag hips! Squeeze core";
                    }
                    else if (hipAngle > 195)
                    {
                        deductions += 15;
                        isAligned = false;
                        message = "Lower hips to straight line";
                    }
                }
                else if (rightVisible && rightKneeVisible)
                {
                    double hipAngle = CalculateAngle(rS!, rH!, rK!);
                    if (hipAngle < 155)
                    {
                        deductions += 15;
                        isAligned = false;
                        message = "Don't sag hips! Squeeze core";
                    }
                    else if (hipAngle > 195)
                    {
                        deductions += 15;
                        isAligned = false;
                        message = "Lower hips to straight line";
                    }
                }
            }

            if (leftVisible && rightVisible)
            {
                double shoulderWidth = Math.Abs(lS!.X - rS!.X);
                double handWidth = Math.Abs(lW!.X - rW!.X);
                if (handWidth < shoulderWidth * 0.8)
                {
                    deductions += 10;
                    message = "Widen hands slightly";
                }
                else if (handWidth > shoulderWidth * 2.2)
                {
                    deductions += 10;
                    message = "Narrow hands for joint safety";
                }
            }

            double frameScore = Math.Max(0.0, 100.0 - deductions);

            bool isCorrectBottomDepth = avgElbowAngle <= 100 && avgElbowAngle >= 70;
            bool isTooLow = avgElbowAngle < 65;

            if (avgElbowAngle < 135)
            {
                if (!state.IsDescending)
                {
                    nextState.IsDescending = true;
                    nextState.MinDescentScore = frameScore;
                    nextState.DepthReached = false;
                    nextState.SkippedRepAlert = false;
                }
                else
                {
                    nextState.MinDescentScore = Math.Min(nextState.MinDescentScore ?? frameScore, frameScore);
                }

                if (isCorrectBottomDepth)
                {
                    nextState.DepthReached = true;
                    message = "Perfect bottom depth (70°-100°)! Push up";
                }
                else if (isTooLow)
                {
                    deductions += 15;
                    message = "Careful, too low! Maintain 70°-100° elbow angle";
                }
                else
                {
                    if (nextState.DepthReached)
                    {
                        message = "Great depth reached! Push up";
                    }
                    else
                    {
                        message = "Lower further to bottom position (70°-100°)";
                    }
                }
            }
            else if (avgElbowAngle > 142)
            {
                if (state.IsDescending)
                {
                    double finalDescentScore = nextState.MinDescentScore ?? frameScore;

                    if (nextState.DepthReached)
                    {
                        if (finalDescentScore >= 80)
                        {
                            nextState.Reps = state.Reps + 1;
                            nextState.SkippedRepAlert = false;
                            nextState.SkippedRepReason = "";
                            message = "Great push-up rep! Perfect form";
                        }
                        else
                        {
                            nextState.SkippedRepAlert = true;
                            string whySkipped = "Keep body straight.";
                            if (!isAligned)
                            {
                                whySkipped = "Keep shoulder, hip, and ankle aligned (straight body line).";
                            }
                            nextState.SkippedRepReason = $"Rep skipped! Form accuracy was only {Math.Round(finalDescentScore)}% (Needs 80%). {whySkipped}";
                            message = "Rep skipped: Maintain straight body";
                        }
                    }
                    else
                    {
                        nextState.SkippedRepAlert = true;
                        nextState.SkippedRepReason = "Rep skipped! Did not descend deep enough. Aim for elbow flexion between 70° and 100°.";
                        message = "Rep skipped: Lower further";
                    }

                    nextState.IsDescending = false;
                    nextState.DepthReached = false;
                    nextState.MinDescentScore = 100.0;
                }
                else
                {
                    message = "Hold plank to begin push-up";
                }
            }

            if (nextState.IsDescending && !nextState.DepthReached)
            {
                if (avgElbowAngle > 100)
                {
                    message = "Lower further to bottom range (70°-100°)";
                }
            }

            return new AnalyzeResponse
            {
                Message = message,
                IsCorrect = deductions == 0,
                Score = frameScore,
                NewState = nextState
            };
        }

        public static AnalyzeResponse AnalyzePlank(Pose pose, PlankState state, string quality)
        {
            string? envCheck = CheckEnvironmentAndPoseQuality(pose, quality);
            if (envCheck != null)
            {
                return new AnalyzeResponse
                {
                    Message = envCheck,
                    IsCorrect = false,
                    Score = 0,
                    NewState = state
                };
            }

            var keypoints = pose.Keypoints;
            var lS = keypoints.FirstOrDefault(k => k.Name == "left_shoulder") ?? keypoints.ElementAtOrDefault(5);
            var rS = keypoints.FirstOrDefault(k => k.Name == "right_shoulder") ?? keypoints.ElementAtOrDefault(6);
            var lH = keypoints.FirstOrDefault(k => k.Name == "left_hip") ?? keypoints.ElementAtOrDefault(11);
            var rH = keypoints.FirstOrDefault(k => k.Name == "right_hip") ?? keypoints.ElementAtOrDefault(12);
            var lK = keypoints.FirstOrDefault(k => k.Name == "left_knee") ?? keypoints.ElementAtOrDefault(13);
            var rK = keypoints.FirstOrDefault(k => k.Name == "right_knee") ?? keypoints.ElementAtOrDefault(14);
            var lA = keypoints.FirstOrDefault(k => k.Name == "left_ankle") ?? keypoints.ElementAtOrDefault(15);
            var rA = keypoints.FirstOrDefault(k => k.Name == "right_ankle") ?? keypoints.ElementAtOrDefault(16);

            var lE = keypoints.FirstOrDefault(k => k.Name == "left_elbow") ?? keypoints.ElementAtOrDefault(7);
            var lW = keypoints.FirstOrDefault(k => k.Name == "left_wrist") ?? keypoints.ElementAtOrDefault(9);
            var rE = keypoints.FirstOrDefault(k => k.Name == "right_elbow") ?? keypoints.ElementAtOrDefault(8);
            var rW = keypoints.FirstOrDefault(k => k.Name == "right_wrist") ?? keypoints.ElementAtOrDefault(10);

            // Clean with symmetric side fallbacks
            var sideShoulder = (lS != null && (lS.Score ?? 0.0) > 0.03) ? lS : rS;
            var sideHip = (lH != null && (lH.Score ?? 0.0) > 0.03) ? lH : rH;
            var sideKnee = (lK != null && (lK.Score ?? 0.0) > 0.03) ? lK : rK;
            var sideAnkle = (lA != null && (lA.Score ?? 0.0) > 0.03) ? lA : rA;

            var cleanLS = sideShoulder;
            var cleanLH = sideHip;
            var cleanLA = (sideAnkle != null && (sideAnkle.Score ?? 0) > 0.03) ? sideAnkle : sideKnee;

            double spineAngle = 180;
            if (cleanLS != null && cleanLH != null && cleanLA != null)
            {
                spineAngle = CalculateAngle(cleanLS, cleanLH, cleanLA);
            }

            var leftElbow = (lE != null && (lE.Score ?? 0.0) > 0.03) ? lE : rE;
            var leftWrist = (lW != null && (lW.Score ?? 0.0) > 0.03) ? lW : rW;
            var rightElbow = (rE != null && (rE.Score ?? 0.0) > 0.03) ? rE : lE;
            var rightWrist = (rW != null && (rW.Score ?? 0.0) > 0.03) ? rW : lW;

            var useLeft = ((lS?.Score ?? 0.0) + (lH?.Score ?? 0.0)) >= ((rS?.Score ?? 0.0) + (rH?.Score ?? 0.0));
            var elbowNode = useLeft ? leftElbow : rightElbow;
            var wristNode = useLeft ? leftWrist : rightWrist;

            double elbowAngle = 90;
            if (cleanLS != null && elbowNode != null && wristNode != null)
            {
                elbowAngle = CalculateAngle(cleanLS, elbowNode, wristNode);
            }

            double score = 0;
            string message = "Get into forearm plank position";
            var nextState = new PlankState
            {
                Reps = state.Reps,
                LastPlankHoldTime = state.LastPlankHoldTime
            };

            double nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            // Detect horizontal body alignment to distinguish plank from vertical standing
            bool isHorizontal = true;
            if (cleanLS != null && cleanLH != null)
            {
                double dx = Math.Abs(cleanLH.X - cleanLS.X);
                double dy = Math.Abs(cleanLH.Y - cleanLS.Y);
                if (dy > dx * 0.8)
                {
                    isHorizontal = false;
                }
            }

            bool isPlankActive = isHorizontal && (spineAngle >= 140 && spineAngle <= 220);

            if (isPlankActive)
            {
                double lastHold = state.LastPlankHoldTime ?? nowMs;
                double elapsed = nowMs - lastHold;

                if (elapsed >= 1000)
                {
                    nextState.Reps = state.Reps + (int)Math.Floor(elapsed / 1000);
                    nextState.LastPlankHoldTime = nowMs - (elapsed % 1000);
                }
                else if (state.LastPlankHoldTime == null)
                {
                    nextState.LastPlankHoldTime = nowMs;
                }
            }
            else
            {
                nextState.LastPlankHoldTime = null;
            }

            if (!isHorizontal)
            {
                score = 30;
                message = "Get down into horizontal forearm plank position on the floor!";
            }
            else if (spineAngle < 140)
            {
                score = 30;
                message = "Hips collapsed! Pull your belly and hips off the floor to resume plank.";
            }
            else if (spineAngle > 220)
            {
                score = 40;
                message = "Hips too high! Lower your body down towards the floor.";
            }
            else if (spineAngle >= 165 && spineAngle <= 195)
            {
                if (elbowAngle >= 70 && elbowAngle <= 110)
                {
                    score = 100;
                    message = "Perfect plank form! Linear alignment is locked and loaded.";
                }
                else
                {
                    score = 80;
                    message = "Spinal board is flat! Align elbows at 90° directly below shoulders.";
                }
            }
            else if (spineAngle < 165)
            {
                score = 55;
                message = $"Sagging posture alert ({Math.Round(spineAngle)}° < 165°)! Tighten core and pull hips upward.";
            }
            else
            {
                score = 60;
                message = $"High hips alert ({Math.Round(spineAngle)}° > 195°)! Lower glutes to make a straight board.";
            }

            return new AnalyzeResponse
            {
                Message = message,
                IsCorrect = score == 100,
                Score = score,
                NewState = nextState
            };
        }
    }
}
