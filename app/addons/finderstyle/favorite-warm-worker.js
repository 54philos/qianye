var paths = JSON.parse(Data.paths), api = Data.api;
for (var i = 0; i < paths.length; ++i) {
    try {
        var folder = api.ILCreateFromPath(paths[i]);
        if (folder && !api.ILIsEmpty(folder)) api.Invoke(Data.Report, [paths[i], folder]);
    } catch (e) {}
}
