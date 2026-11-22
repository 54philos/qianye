if (!Sync.FinderStartup) {
    Sync.FinderStartup = {
        fallback: '::{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
        file: 'config\\finder-startup.json',
        Valid: function (path) { return /^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+|::\{20D04FE0-3AEA-1069-A2D8-08002B30309D\})/i.test(path) && !/[\r\n\x00]/.test(path); },
        GetPath: function () { return Sync.FinderStartup.path || Sync.FinderStartup.fallback; },
        Save: function (path, quiet) {
            const state = Sync.FinderStartup;
            path = wsh.ExpandEnvironmentStrings(PathUnquoteSpaces(String(path || '').trim()));
            if (!state.Valid(path) || (path != state.fallback && !api.PathIsDirectory(path))) {
                if (!quiet) MessageBox('\u8bf7\u9009\u62e9\u5b58\u5728\u7684\u6587\u4ef6\u5939\uff0c\u6216\u8f93\u5165\u5b8c\u6574\u7684\u6587\u4ef6\u5939\u8def\u5f84\u3002', TITLE, MB_ICONINFORMATION | MB_OK);
                return false;
            }
            const error = WriteTextFile(state.file, JSON.stringify({ version: 1, path: path }, null, 2));
            if (error) { if (!quiet) MessageBox(String(error), TITLE, MB_ICONERROR | MB_OK); return false; }
            state.path = path;
            HOME_PATH = path;
            if (!quiet) InvokeUI('Addons.FinderStartup.Saved', [path]);
            return true;
        },
        Current: function () {
            const fv = te.Ctrl(CTRL_FV);
            if (!fv || !fv.FolderItem) return '';
            if (api.ILIsEqual(fv.FolderItem, ssfDRIVES)) return Sync.FinderStartup.fallback;
            return api.GetDisplayNameOf(fv.FolderItem, SHGDN_FORPARSING);
        },
        Choose: function () {
            const state = Sync.FinderStartup, selected = BrowseForFolder(state.GetPath());
            if (selected) state.Save(selected);
        },
        Menu: function () {
            const state = Sync.FinderStartup, menu = api.CreatePopupMenu(), pt = api.Memory('POINT');
            const display = state.GetPath() == state.fallback ? '\u6b64\u7535\u8111' : state.GetPath();
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING | MF_DISABLED, 0, ('\u9ed8\u8ba4\u6253\u5f00\u4f4d\u7f6e\uff1a' + display).replace(/&/g, '&&'));
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 1, '\u8bbe\u4e3a\u5f53\u524d\u6587\u4ef6\u5939');
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 2, '\u9009\u62e9\u6587\u4ef6\u5939\u2026');
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 3, '\u624b\u52a8\u8f93\u5165\u8def\u5f84\u2026');
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 4, '\u6062\u590d\u4e3a\u201c\u6b64\u7535\u8111\u201d');
            api.GetCursorPos(pt); api.SetForegroundWindow(te.hwnd);
            let verb;
            try { verb = api.TrackPopupMenuEx(menu, TPM_RETURNCMD | TPM_RIGHTBUTTON, pt.x, pt.y, te.hwnd, null); }
            finally { api.DestroyMenu(menu); }
            if (verb == 1) state.Save(state.Current());
            if (verb == 2) state.Choose();
            if (verb == 3) InputDialog('\u9ed8\u8ba4\u6253\u5f00\u7684\u6587\u4ef6\u5939\u8def\u5f84', state.GetPath(), function (path) { if (path) Sync.FinderStartup.Save(path); });
            if (verb == 4) state.Save(state.fallback);
            return S_OK;
        },
        ResidentMenu: function (ctrl, hwnd, msg, wp, lp) {
            const resident = Sync.FinderResident;
            if (!resident || hwnd != te.hwnd || msg != resident.callback || lp != WM_RBUTTONUP) return;
            const menu = api.CreatePopupMenu(), pt = api.Memory('POINT');
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 1, '\u6253\u5f00\u9ed8\u8ba4\u4f4d\u7f6e');
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 2, '\u9ed8\u8ba4\u6253\u5f00\u4f4d\u7f6e\u8bbe\u7f6e\u2026');
            api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 3, '\u5f7b\u5e95\u9000\u51fa');
            api.GetCursorPos(pt); api.SetForegroundWindow(te.hwnd);
            let verb;
            try { verb = api.TrackPopupMenuEx(menu, TPM_RETURNCMD | TPM_RIGHTBUTTON, pt.x, pt.y, te.hwnd, null); }
            finally { api.DestroyMenu(menu); }
            if (verb == 1) resident.Open();
            if (verb == 2) Sync.FinderStartup.Menu();
            if (verb == 3) resident.Exit();
            return S_OK;
        },
        PatchResident: function () {
            if (!Sync.FinderResident) return;
            Sync.FinderResident.Open = function () {
                const state = Sync.FinderResident, fv = te.Ctrl(CTRL_FV);
                state.Show();
                if (fv && state.placeholder == fv.Id) { fv.Navigate(Sync.FinderStartup.GetPath(), SBSP_SAMEBROWSER); state.placeholder = 0; }
                Resize();
            };
        }
    };
    try {
        const json = JSON.parse(ReadTextFile(Sync.FinderStartup.file) || '{}');
        if (typeof json.path == 'string' && Sync.FinderStartup.Valid(json.path)) Sync.FinderStartup.path = json.path;
    } catch (e) { }
    HOME_PATH = Sync.FinderStartup.GetPath();
    Sync.FinderStartup.PatchResident();
    AddEvent('Load', Sync.FinderStartup.PatchResident);
    AddEvent('SystemMessage', Sync.FinderStartup.ResidentMenu, true);
}
