using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using ThumbProbe;

public sealed class RepairRequest { public string id, path; public bool inspectOnly; }
public sealed class FolderRepair {
    public string path;
    public List<Result> before = new List<Result>();
    public List<Result> after = new List<Result>();
    public bool passed;
}
public sealed class RepairReport {
    public string id, path, error;
    public int checkedFolders, cachedImages;
    public bool inspectOnly, passed = true;
    public List<FolderRepair> repaired = new List<FolderRepair>();
    public List<string> errors = new List<string>();
}
public static class ThumbnailRepair {
    static readonly uint[] Sizes = {32, 96, 256};
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 4194304 };
    static bool IsDamaged(Result image) {
        return image.hr == "0x00000000" && image.alphaType == 1 && image.opaqueBlackPixels > 0 &&
            image.topLeft != null && image.topLeft[0] < 8 && image.topLeft[1] < 8 && image.topLeft[2] < 8;
    }
    static void CheckFolder(string path, RepairReport report) {
        report.checkedFolders++;
        var before = new List<Result>();
        bool damaged = false;
        foreach (uint size in Sizes) {
            Result image = Probe.Read(path, size, 1, null); // Cache-only: never generate healthy thumbnails.
            if (image.hr == "0x00000000") report.cachedImages++;
            before.Add(image);
            damaged |= IsDamaged(image);
        }
        if (!damaged) return;
        var repair = new FolderRepair { path = path, before = before, passed = report.inspectOnly };
        if (!report.inspectOnly) {
            foreach (uint size in Sizes) Probe.Read(path, size, 4, null);
            repair.passed = true;
            foreach (uint size in Sizes) {
                Result image = Probe.Read(path, size, 1, null);
                repair.after.Add(image);
                if (image.hr != "0x00000000" || image.alphaType != 2 || IsDamaged(image)) repair.passed = false;
            }
        }
        report.repaired.Add(repair);
        report.passed &= repair.passed;
    }
    [STAThread]
    public static int Main(string[] args) {
        if (args.Length != 2) return 2;
        var report = new RepairReport();
        try {
            var request = Json.Deserialize<RepairRequest>(File.ReadAllText(args[0], Encoding.UTF8));
            report.id = request.id; report.path = request.path; report.inspectOnly = request.inspectOnly;
            if (String.IsNullOrEmpty(request.path) || request.path.Length < 3 || request.path[1] != ':' ||
                request.path[2] != '\\' || !Directory.Exists(request.path)) throw new IOException("Not an available local directory");
            // Only immediate folders: image/document contents and folder attributes are never changed.
            foreach (string folder in Directory.EnumerateDirectories(request.path)) {
                try { CheckFolder(folder, report); }
                catch (Exception e) { report.errors.Add(folder + ": " + e.Message); }
            }
        } catch (Exception e) { report.error = e.Message; report.passed = false; }
        try {
            string temporary = args[1] + ".tmp";
            File.WriteAllText(temporary, Json.Serialize(report), new UTF8Encoding(false));
            File.Move(temporary, args[1]);
        } catch { return 3; }
        return report.passed ? 0 : 1;
    }
}
