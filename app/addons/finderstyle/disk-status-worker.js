var result = { root: root, generation: generation };
try {
    var drive = api.CreateObject('Scripting.FileSystemObject').GetDrive(root);
    if (!drive.IsReady) throw new Error('Drive is not ready');
    result.label = String(drive.VolumeName || '');
    result.free = Number(drive.AvailableSpace);
    result.total = Number(drive.TotalSize);
} catch (error) { result.error = String(error.message || error); }
api.Invoke(Report, JSON.stringify(result));
