// Namespace o folder organization ng ating web app sa C# (.NET Core)
namespace PoseDetectorApp.Models
{
    // Model para sa isang "Keypoint" o body part joint na idinetect ng model (e.g. kanang tuhod, kaliwang balikat)
    public class Keypoint
    {
        // Pangalan ng Joint (hal. "left_knee", "right_shoulder")
        public string Name { get; set; } = string.Empty;

        // X Coordinate o pahalang na lokasyon ng joint sa camera display (mula kaliwa pakanan)
        public double X { get; set; }

        // Y Coordinate o patayong lokasyon ng joint sa camera display (mula itaas pababa)
        public double Y { get; set; }

        // Confidence Score o porsiyentong katiyakan ng AI na nandito nga ang joint (0.0 to 1.0)
        public double? Score { get; set; }
    }

    // Model para sa buong skeletal skeleton na binubuo ng listahan ng mga Keypoint joints
    public class Pose
    {
        // Listahan ng lahat ng joints (Keypoints) na nakuha sa kasalukuyang camera frame
        public List<Keypoint> Keypoints { get; set; } = new();

        // Pangkalahatang kalidad o tracking confidence level ng buong katawan ng tao
        public double? Score { get; set; }
    }

    // Model para sa state o sitwasyon ng pag-Squat ng gumagamit (ginagamit para mabilang ang Reps)
    public class SquatState
    {
        // Flag kung pababa na ang katawan sa squat position (Is Descending = pababa)
        public bool IsDescending { get; set; }

        // Kabuuang bilang ng nakumpletong correct Squat repetitions ng user
        public int Reps { get; set; }

        // Ang pinakahuling naitalang anggulo ng tuhod ng user (in degrees, e.g. 170 hanggang 90)
        public double? LastKneeAngle { get; set; }

        // Ang minimum na kalidad o biomechanical score habang bumababa (para suriin kung tuwid ang likod)
        public double? MinDescentScore { get; set; }

        // Flag na magiging true kapag sapat na ang lalim ng squat (depth >= 90 degrees knee bend)
        public bool DepthReached { get; set; }

        // Flag na nakatukoy kung masyadong mababa ang squat ng user na maaaring makasakit sa joints
        public bool TooDeepReached { get; set; }

        // Pinakamaliit na anggulo ng tuhod na naabot ng user sa kasalukuyang repetition loop
        public double? MinKneeAngle { get; set; }

        // Ang viewing profile o posisyon ng user (side profile o diagonal profilings para sa camera)
        public string ViewMode { get; set; } = "unknown";

        // Dahilan kung bakit hindi tinanggap ng system ang rep (halimbawa: "Knee not bent enough" o "Unstable spine")
        public string SkippedRepReason { get; set; } = string.Empty;

        // Flag/Signal para magpakita ng visualization alert kung bakit hindi natanggap ang workout point
        public bool SkippedRepAlert { get; set; }

        // Ang kasalukuyang porsiyento ng naitatalang lalim ng squat kumpara sa perfect benchmark limit
        public double? SquatDepthPercent { get; set; }

        // Timestamp sa milliseconds kung kailan nagsimulang bumaba ang user para makalkula ang tempo/speed
        public double? DescentStartTimeMs { get; set; }
    }

    // Model para sa state o sitwasyon ng pag-Pushup ng user (ginagamit sa rep counters)
    public class PushupState
    {
        // Flag kung pababa na ang katawan ng user patungo sa sahig
        public bool IsDescending { get; set; }

        // Kabuuang bilang ng tamang Pushup repetitions na nabilang
        public int Reps { get; set; }

        // Pinakamababang precision biomechanical score na nakuha habang bumababa
        public double? MinDescentScore { get; set; }

        // Sapat na ba ang lalim ng pagbaba ng dibdib (naabot ba ang 90 degrees elbow bend)
        public bool DepthReached { get; set; }

        // Dahilan kung bakit hindi tinanggap o invalid ang kasalukuyang rep (e.g. "Elbows too flared")
        public string SkippedRepReason { get; set; } = string.Empty;

        // Flag upang paganahin ang visual warning sa user screen
        public bool SkippedRepAlert { get; set; }
    }

    // Model para sa state ng Plank hold workout logs
    public class PlankState
    {
        // Bilang ng beses na pinalano o natapos na session
        public int Reps { get; set; }

        // Kung ilang segundo napanatili ang tuwid na posisyon sa exercise mat
        public double? LastPlankHoldTime { get; set; }
    }

    // Request payload structure na ipinapadala mula sa React Browser patungo sa C# Web API Endpoint
    public class AnalyzeRequest
    {
        // Uri ng ehersisyo (e.g. "squat", "pushup") na kailangang suriin ng machine learning algos
        public string Exercise { get; set; } = string.Empty;

        // Skeletal Pose data na binubuo ng (X,Y) coordinates ng 17 points mula sa MoveNet model
        public Pose Pose { get; set; } = new();

        // Ang huling kilalang estado (State machine memory parameters) nang sa gayon ay maalala ng backend ang huling posisyon
        public System.Text.Json.Nodes.JsonObject? State { get; set; }

        // Kalidad ng ilaw sa webcam (hal. "dark" - madilim, "bright" - sobrang silaw, o "good" - maganda)
        public string Quality { get; set; } = "good";
    }

    // Response payload structure na ibinabalik ng C# Backend pabalik sa browser ng gumagamit
    public class AnalyzeResponse
    {
        // Mensahe o voice instruction feedback galing sa C# coach (hal. "Bend lower!", "Good posture!")
        public string Message { get; set; } = string.Empty;

        // Kung tama ba ang porma o posture ng ginawang ehersisyo
        public bool IsCorrect { get; set; }

        // Accuracy score o porsiyento ng pagkakagawa (e.g. 96.5% match to physical rules)
        public double Score { get; set; }

        // Ang panibagong estado o state machine memory upang i-cache muli ng browser
        public object NewState { get; set; } = new();
    }
}
