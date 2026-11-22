// Repair damaged Windows folder thumbnails asynchronously whenever a folder opens.
Sync.FinderThumbnailRepair = {
    generation: String(new Date().getTime()) + String(Math.random()),
    queue: [], active: null, pending: {}, checked: {}, serial: 0,
    helper: BuildPath(te.Data.Installed, 'addons\\finderstyle\\thumbnail-repair.exe'),
    Queue: function (FV, force) {
        if (!FV || FV.Type > CTRL_EB || !FV.FolderItem) return;
        const path = String(FV.FolderItem.Path);
        // Filesystem checks belong to the background worker, never navigation.
        if (!/^[a-z]:\\/i.test(path)) return;
        const state = Sync.FinderThumbnailRepair, key = path.toLowerCase();
        if (state.pending[key] || (!force && new Date().getTime() - (state.checked[key] || 0) < 30000)) return;
        state.pending[key] = true;
        state.queue.push({ path: path, key: key, viewId: FV.Id });
        if (!state.active) setTimeout(state.Next, 1200);
    },
    Next: function () {
        const state = Sync.FinderThumbnailRepair;
        if (state.active || !state.queue.length) return;
        const job = state.queue.shift(), selected = te.Ctrl(CTRL_FV);
        if (!selected || String(selected.FolderItem.Path).toLowerCase() != job.key) { delete state.pending[job.key]; setTimeout(state.Next, 100); return; }
        try {
            if (!api.PathFileExists(state.helper)) throw Error('Missing thumbnail repair helper');
            const base = BuildPath(te.Data.DataFolder, 'cache\\finder-thumbnail-repair');
            CreateFolder2(base);
            job.id = String(new Date().getTime()) + '-' + (++state.serial) + '-' + String(Math.random()).slice(2);
            job.input = BuildPath(base, job.id + '.request.json');
            job.output = BuildPath(base, job.id + '.result.json');
            job.started = new Date().getTime();
            WriteTextFile(job.input, JSON.stringify({ id: job.id, path: job.path, inspectOnly: false }));
            state.active = job;
            wsh.Run(PathQuoteSpaces(state.helper) + ' ' + PathQuoteSpaces(job.input) + ' ' + PathQuoteSpaces(job.output), 0, false);
            setTimeout(state.Poll, 350, state.generation);
        } catch (e) {
            WriteTextFile('config\\thumbnail-auto-repair.json', JSON.stringify({ path: job.path, error: String(e.message || e) }));
            delete state.pending[job.key]; state.active = null;
            setTimeout(state.Next, 100);
        }
    },
    Poll: function (generation) {
        const state = Sync.FinderThumbnailRepair, job = state.active;
        if (generation != state.generation || !job) return;
        if (!api.PathFileExists(job.output)) {
            if (new Date().getTime() - job.started < 120000) { setTimeout(state.Poll, 350, generation); return; }
            WriteTextFile('config\\thumbnail-auto-repair.json', JSON.stringify({ path: job.path, error: 'Thumbnail repair timed out' }));
        } else {
            try {
                const report = JSON.parse(ReadTextFile(job.output));
                if (report.id != job.id) throw Error('Unexpected thumbnail repair result');
                state.checked[job.key] = new Date().getTime();
                const repaired = report.repaired || [];
                for (let i = 0; i < repaired.length; ++i) {
                    if (repaired[i].passed) api.SHChangeNotify(SHCNE_UPDATEITEM, 0x2005, repaired[i].path, null);
                }
                if (repaired.some(function (item) { return item.passed; })) {
                    const views = te.Ctrls(CTRL_FV);
                    for (let i in views) {
                        if (String(views[i].FolderItem.Path).toLowerCase() == job.key) views[i].Refresh();
                    }
                }
                report.elapsedMs = new Date().getTime() - job.started;
                WriteTextFile('config\\thumbnail-auto-repair.json', JSON.stringify(report, null, 2));
                if (repaired.some(function (item) { return item.passed; })) {
                    let history = [];
                    try { history = JSON.parse(ReadTextFile('config\\thumbnail-auto-repair-history.json') || '[]'); } catch (e) { }
                    history.push(report);
                    while (history.length > 20) history.shift();
                    WriteTextFile('config\\thumbnail-auto-repair-history.json', JSON.stringify(history, null, 2));
                }
                // Job files belong only to this add-on; keep the latest report above.
                api.DeleteFile(job.input); api.DeleteFile(job.output);
            } catch (e) {
                WriteTextFile('config\\thumbnail-auto-repair.json', JSON.stringify({ path: job.path, error: String(e.message || e) }));
            }
        }
        delete state.pending[job.key]; state.active = null;
        setTimeout(state.Next, 100);
    }
};
AddEvent('NavigateComplete', function (FV) { Sync.FinderThumbnailRepair.Queue(FV); });
AddEvent('ViewModeChanged', function (FV) { Sync.FinderThumbnailRepair.Queue(FV); });
AddEvent('IconSizeChanged', function (FV) { Sync.FinderThumbnailRepair.Queue(FV); });
AddEvent('ContentsChanged', function (FV) { Sync.FinderThumbnailRepair.Queue(FV); });
AddEvent('Load', function () {
    const views = te.Ctrls(CTRL_FV);
    for (let i in views) Sync.FinderThumbnailRepair.Queue(views[i]);
});


