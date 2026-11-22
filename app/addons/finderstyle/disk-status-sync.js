if (!Sync.FinderDiskStatus) {
    Sync.FinderDiskStatus = {
        generation: String(Date.now()) + String(Math.random()),
        cache: {}, pending: {}, activeRoot: '', serial: 0,
        worker: ReadTextFile(BuildPath(te.Data.Installed, 'addons\\finderstyle\\disk-status-worker.js')),
        Root: function (fv) {
            if (!fv || !fv.FolderItem) return '';
            const path = String(fv.FolderItem.Path), root = GetDriveName(path);
            return root ? root.replace(/\\$/, '').toUpperCase() : '';
        },
        Publish: function (data) {
            InvokeUI('Addons.FinderDiskStatus.Receive', [JSON.stringify(data)]);
        },
        Receive: function (json) {
            const data = JSON.parse(json), state = Sync.FinderDiskStatus;
            if (data.generation != state.generation) return;
            delete state.pending[data.root];
            data.checked = Date.now();
            state.cache[data.root] = data;
            if (state.activeRoot == data.root && state.Root(te.Ctrl(CTRL_FV)) == data.root) state.Publish(data);
        },
        Query: function (root) {
            const state = Sync.FinderDiskStatus;
            if (state.pending[root]) return;
            state.pending[root] = true;
            const args = api.CreateObject('Object');
            args.Data = api.CreateObject('Object');
            args.Data.api = api; args.Data.root = root; args.Data.generation = state.generation; args.Data.Report = state.Receive;
            api.ExecScript(state.worker, 'JScript', args, true);
        },
        Update: function () {
            const state = Sync.FinderDiskStatus, root = state.Root(te.Ctrl(CTRL_FV));
            if (root != state.activeRoot) { state.activeRoot = root; state.Publish({ root: root }); }
            if (!root) { state.Publish({ root: '' }); return; }
            const cached = state.cache[root];
            if (cached) state.Publish(cached);
            if (!cached || Date.now() - cached.checked > 10000) state.Query(root);
        },
        Schedule: function (fv) {
            const state = Sync.FinderDiskStatus, selected = te.Ctrl(CTRL_FV);
            if (fv && fv.Type <= CTRL_EB && selected && fv.Id != selected.Id) return;
            clearTimeout(state.timer);
            state.timer = setTimeout(state.Update, 150);
        },
        Tick: function (generation) {
            const state = Sync.FinderDiskStatus;
            if (generation != state.generation) return;
            state.Schedule();
            setTimeout(state.Tick, 15000, state.generation);
        }
    };
    AddEvent('ChangeView', Sync.FinderDiskStatus.Schedule);
    AddEvent('NavigateComplete', Sync.FinderDiskStatus.Schedule);
    AddEvent('Load', Sync.FinderDiskStatus.Schedule);
    setTimeout(Sync.FinderDiskStatus.Tick, 200, Sync.FinderDiskStatus.generation);
}
