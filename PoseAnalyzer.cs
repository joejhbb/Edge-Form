// Gagamitin ang System namespace para sa standard string at mathematical classes ng C#
using System;
// Gagamitin ang generic List collections
using System.Collections.Generic;

// Ang folder organization kung saan kabilang ang calculator
namespace PostureAI.PoseEstimation
{
    // Model na naglalarawan sa isang partikular na coordinate point ng katawan (Keypoint o joint)
    public class Keypoint
    {
        // Pangalan ng body part joint (halimbawa "left_hip")
        public string Name { get; set; }
        // Pahalang na posisyon (X-coordinate coordinate) sa screen grid
        public double X { get; set; }
        // Patayong posisyon (Y-coordinate coordinate) sa screen grid
        public double Y { get; set; }
        // Katiyakan o confidence index ng sensor o neural network model
        public double Score { get; set; }
    }

    // Capture model na binubuo ng listahan ng keypoints na kumakatawan sa buong katawan (skeletal system)
    public class Pose
    {
        // Ang set ng nakuhang keypoints para sa kasalukuyang snapshot
        public List<Keypoint> Keypoints { get; set; }
        // Pangkalahatang rating score para sa postural detection confidence
        public double Score { get; set; }
    }

    // Response structure na nagbibigay ng pinal na resulta mula sa pagsusuri
    public class DetectionResult
    {
        // Mensaheng nakalaan para sa user o atleta (hal. "Great shoulder depth!")
        public string Message { get; set; }
        // Flag kung tama o ligtas ang isinagawang porma (true/false)
        public bool IsCorrect { get; set; }
        // Accuracy percentage rating (0% to 100%) para sa workout
        public double Score { get; set; }
    }

    // Ang mismong Physics / Biomechanical computational engine
    public class PoseAnalyzer
    {
        /// <summary>
        /// Sinusuri ang Squat sa pamamagitan ng pagkalkula sa anggulo ng kaliwang tuhod (knee flexion angle) kumpara sa hip at ankle joints.
        /// </summary>
        public static DetectionResult AnalyzeSquat(Pose pose)
        {
            // Kunin ang listahan ng lahat ng skeletal coordinates
            var keypoints = pose.Keypoints;
            // Hanapin ang kaliwang balakang (Left Hip)
            var leftHip = FindKeypoint(keypoints, "left_hip");
            // Hanapin ang kaliwang tuhod (Left Knee)
            var leftKnee = FindKeypoint(keypoints, "left_knee");
            // Hanapin ang kasukasuan ng kaliwang bukung-bukong (Left Ankle)
            var leftAnkle = FindKeypoint(keypoints, "left_ankle");

            // Siyasatin kung nakikita ng system ang lahat ng tatlong joints nang malinaw (may threshold na 0.20 score)
            if (leftHip == null || leftKnee == null || leftAnkle == null || 
                leftHip.Score < 0.20 || leftKnee.Score < 0.20 || leftAnkle.Score < 0.20)
            {
                // Kung may nakaharang na bagay tulad ng damit o mesa, magpadala ng alert na ihanay ang kaliwang profile ng katawan
                return new DetectionResult
                {
                    Message = "Align left profile; tracking knee joints",
                    IsCorrect = false,
                    Score = 0
                };
            }

            // Gamitin ang Trigonometry Solver para makuha ang flexion angle ng tuhod ng user base sa hip, knee, at ankle coordinates
            double kneeAngle = CalculateAngle(leftHip, leftKnee, leftAnkle);

            // A. Kung mababa sa 100 degrees ang anggulo (Nalampasan ang 90° horizontal parallel line ng hita)
            if (kneeAngle < 100.0)
            {
                return new DetectionResult
                {
                    Message = "Great squat depth! Push back up", // Napakaganda ng lalim ng Squat! Tumayo na pabalik.
                    IsCorrect = true,
                    Score = 95.0
                };
            }
            // B. Kung sa pagitan ng 100 at 140 degrees naman (Kasalukuyang pababa pa lang)
            else if (kneeAngle < 140.0)
            {
                return new DetectionResult
                {
                    Message = "Descending smoothly... Keep going lower!", // Bumababa nang maayos. Magpatuloy pa sa pagbaba!
                    IsCorrect = true,
                    Score = 80.0
                };
            }
            // C. Kung nakatayo pa lang o kulang na kulang ang flexion depth
            else
            {
                return new DetectionResult
                {
                    Message = "Squat down until thighs are parallel to floor", // Bumaba pa hanggang sa pumantay ang hita sa sahig.
                    IsCorrect = true,
                    Score = 100.0
                };
            }
        }

        /// <summary>
        /// Sinusuri ang pagkahanay ng gulugod at kasukasuan sa Plank (tuwid na alignment ng shoulder, hip, at knee).
        /// </summary>
        public static DetectionResult AnalyzePlank(Pose pose)
        {
            // Kunin ang listahan ng coordinates
            var keypoints = pose.Keypoints;
            // Hanapin ang balikat ng user (kaliwa o kanan depende kung saan nakaharap)
            var shoulder = FindKeypoint(keypoints, "left_shoulder") ?? FindKeypoint(keypoints, "right_shoulder");
            // Hanapin ang balakang ng user (Hip)
            var hip = FindKeypoint(keypoints, "left_hip") ?? FindKeypoint(keypoints, "right_hip");
            // Hanapin ang tuhod (Knee)
            var knee = FindKeypoint(keypoints, "left_knee") ?? FindKeypoint(keypoints, "right_knee");

            // Siguruhing malinaw ang pagkakakuha ng camera sa core joints (Score > 0.20)
            if (shoulder == null || hip == null || knee == null ||
                shoulder.Score < 0.20 || hip.Score < 0.20 || knee.Score < 0.20)
            {
                return new DetectionResult
                {
                    Message = "Position body in side profile for Plank", // Iposisyon ang katawan nang patabingi (side profile) para sa Plank.
                    IsCorrect = false,
                    Score = 0
                };
            }

            // Kalkulahin ang spinal alignment angle/hip angle base sa Shoulder, Hip, at Knee points
            double spineAngle = CalculateAngle(shoulder, hip, knee);

            // A. Kung nasa pagitan ng 165 at 195 degrees (Ibig sabihin, ang likod ay tuwid tulad ng isang mahabang table o tabla)
            if (spineAngle >= 165.0 && spineAngle <= 195.0)
            {
                return new DetectionResult
                {
                    Message = "Perfect straight plank! Hold and squeeze core", // Tamang alignment ng plank! Ipagpatuloy ang pag-stretch.
                    IsCorrect = true,
                    Score = 98.0
                };
            }
            // B. Kung mas mababa sa 165 degrees (Ibig sabihin, nakalaylay o nakasag ang balakang pababa sa banig na makakasakit sa lower back)
            else if (spineAngle < 165.0)
            {
                return new DetectionResult
                {
                    Message = "Hips are sagging! Pull belly button upwards", // Nakalaylay ang balakang! Hilahin ang puson paitaas.
                    IsCorrect = false,
                    Score = 55.0
                };
            }
            // C. Mas mataas sa 195 degrees (Ibig sabihin, masyadong mataas ang puwetan paitaas na parang bundok o pyramid)
            else
            {
                return new DetectionResult
                {
                    Message = "Hips are too high! Flatten back to flat boards", // Masyadong mataas ang balakang! Ipantay ang iyong likod.
                    IsCorrect = false,
                    Score = 60.0
                };
            }
        }

        // Katulong na formula para sa trigonometry: Kinukuha ang anggulo gamit ang Math.Atan2 arc-tangent
        private static double CalculateAngle(Keypoint p1, Keypoint p2, Keypoint p3)
        {
            // Kalkulahin ang pagkakaiba ng vectors (radians) sa pagitan ng mga magkakakonektang joints
            double radians = Math.Atan2(p3.Y - p2.Y, p3.X - p2.X) - Math.Atan2(p1.Y - p2.Y, p1.X - p2.X);
            // I-convert ang radians patungong degrees (angle = radians * 180 / π)
            double angle = Math.Abs((radians * 180.0) / Math.PI);
            // Siguruhing hindi lalampas sa 180 degrees ang acute angle para sa natural joint rotation limits
            if (angle > 180.0)
            {
                angle = 360.0 - angle;
            }
            return angle; // Ibalik ang mathematical angle value
        }

        // Maliit na search utility upang iretrieyb ang keypoint name mula sa neural list
        private static Keypoint FindKeypoint(List<Keypoint> keypoints, string name)
        {
            return keypoints.Find(k => k.Name == name);
        }
    }
}
