if (!Sync.FinderResident) {
    Sync.FinderResident = {
        hidden: false, exiting: false, placeholder: 0, callback: 0x8462,
        Marker: function () {
            const pid = api.Memory('DWORD'); api.GetWindowThreadProcessId(te.hwnd, pid);
            WriteTextFile('config\\finder-resident-target.json', JSON.stringify({ active: Sync.FinderResident.hidden, hwnd: Number(te.hwnd), pid: pid[0] }));
        },
        Tray: function (show) {
            const state = Sync.FinderResident;
            if (!state.icon) {
                const icon = state.icon = api.Memory('NOTIFYICONDATA'); icon.cbSize = icon.Size;
                icon.hWnd = te.hwnd; icon.uID = 0x4645; icon.uFlags = 7; icon.uCallbackMessage = state.callback;
                icon.hIcon = api.SendMessage(te.hwnd, WM_GETICON, 0, 0) || api.SendMessage(te.hwnd, WM_GETICON, 1, 0);
                if (!icon.hIcon) { const info = api.Memory('SHFILEINFO'); api.SHGetFileInfo(BuildPath(te.Data.Installed, 'TE64.exe'), 0, info, info.Size, SHGFI_ICON | SHGFI_SMALLICON); icon.hIcon = info.hIcon; state.ownsIcon = !!info.hIcon; }
                icon.szTip = '\u5343\u9875 - \u5feb\u901f\u6253\u5f00';
            }
            if (show && !state.trayVisible) state.trayVisible = api.Shell_NotifyIcon(0, state.icon);
            if (!show && state.trayVisible) { api.Shell_NotifyIcon(2, state.icon); state.trayVisible = false; }
        },
        Close: function (ctrl) {
            if (!ctrl || ctrl.Type != CTRL_TE) return;
            const state = Sync.FinderResident;
            if (state.exiting || api.GetKeyState(VK_SHIFT) < 0) { state.exiting = true; state.Tray(false); if (state.ownsIcon) { api.DestroyIcon(state.icon.hIcon); state.ownsIcon = false; } return; }
            if (state.hidden) return S_FALSE;
            if (CanClose(te) != S_OK) return;
            state.hidden = true;
            api.ShowWindow(te.hwnd, SW_HIDE);
            const tc = te.Ctrl(CTRL_TC), keep = tc && tc.Selected;
            if (tc && keep) {
                state.placeholder = keep.Id;
                for (let i = tc.Count - 1; i >= 0; --i) if (tc[i].Id != keep.Id) { tc[i].Data.Lock = false; tc[i].Close(); }
                keep.Data.Lock = false;
                keep.Navigate('about:blank', SBSP_SAMEBROWSER);
            }
            state.Tray(true); state.Marker(); SaveConfig();
            return S_FALSE;
        },
        Cleanup: function (fv) {
            const state = Sync.FinderResident;
            if (state.hidden || !state.placeholder || !fv) return;
            if (fv.Id == state.placeholder) { if (!api.ILIsEqual(fv.FolderItem, 'about:blank')) state.placeholder = 0; return; }
            const tc = te.Ctrl(CTRL_TC);
            for (let i = tc.Count - 1; i >= 0; --i) if (tc[i].Id == state.placeholder) { tc[i].Data.Lock = false; tc[i].Close(); }
            state.placeholder = 0;
        },
        Show: function () {
            const state = Sync.FinderResident; state.hidden = false; state.Tray(false); state.Marker();
            RestoreFromTray();
        },
        Open: function () {
            const state = Sync.FinderResident, fv = te.Ctrl(CTRL_FV);
            state.Show();
            if (fv && state.placeholder == fv.Id) { fv.Navigate(ssfDRIVES, SBSP_SAMEBROWSER); state.placeholder = 0; }
            Resize();
        },
        Exit: function () {
            const state = Sync.FinderResident; state.exiting = true; state.Tray(false); state.hidden = false; state.Marker();
            api.PostMessage(te.hwnd, WM_CLOSE, 0, 0);
        },
        CopyData: function (ctrl, cd) {
            const state = Sync.FinderResident, folderMessage = cd.dwData == 0x4645;
            if (ctrl.Type != CTRL_TE || (!folderMessage && cd.dwData != 0) || !cd.cbData) return;
            const command = api.SysAllocStringByteLen(cd.lpData, cd.cbData, cd.cbData);
            if (/\b(?:JScript|VBScript),/i.test(command)) { if (state.hidden) { RunCommandLine(command); return S_OK; } return; }
            const args = api.CommandLineToArgv(command);
            if (folderMessage && args.length == 2 && /^(?:[a-z]:\\|\\\\|::\{)/i.test(args[1])) {
                const wasHidden = state.hidden, path = args[1], folder = Sync.FinderFavorites.FolderCache[path] || api.ILCreateFromPath(path), fv = te.Ctrl(CTRL_FV);
                if (wasHidden) { state.Show(); state.placeholder = 0; if (fv) fv.Navigate(folder, SBSP_SAMEBROWSER); }
                else { RestoreFromTray(); Navigate(folder, SBSP_NEWBROWSER); }
                Resize(); return S_OK;
            }
            if (!state.hidden) return;
            state.Show();
            if (args.length < 2) state.Open(); else RunCommandLine(command);
            Resize(); return S_OK;
        },
        Message: function (ctrl, hwnd, msg, wp, lp) {
            const state = Sync.FinderResident;
            if (hwnd != te.hwnd) return;
            if (msg == 0x0011 || msg == 0x0016) { state.exiting = true; state.Tray(false); if (state.ownsIcon) { api.DestroyIcon(state.icon.hIcon); state.ownsIcon = false; } return; }
            if (msg != state.callback) return;
            if (lp == WM_LBUTTONUP || lp == WM_LBUTTONDBLCLK) { state.Open(); return; }
            if (lp == WM_RBUTTONUP) {
                const menu = api.CreatePopupMenu(), point = api.Memory('POINT');
                api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 1, '\u6253\u5f00\u6b64\u7535\u8111');
                api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 2, '\u5f7b\u5e95\u9000\u51fa');
                api.GetCursorPos(point); api.SetForegroundWindow(te.hwnd);
                const verb = api.TrackPopupMenuEx(menu, TPM_RETURNCMD | TPM_RIGHTBUTTON, point.x, point.y, te.hwnd, null);
                api.DestroyMenu(menu);
                if (verb == 1) state.Open(); if (verb == 2) state.Exit();
            }
        }
    };
    AddEvent('Close', Sync.FinderResident.Close, true);
    AddEvent('CopyData', Sync.FinderResident.CopyData, true);
    AddEvent('NavigateComplete', Sync.FinderResident.Cleanup);
    AddEvent('SystemMessage', Sync.FinderResident.Message);
    Sync.FinderResident.Marker();
}



