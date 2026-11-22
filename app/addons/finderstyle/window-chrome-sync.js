if (!Sync.FinderWindowChrome) {
    Sync.FinderWindowChrome = {
        enabled: false,
        Apply: function () {
            const state = Sync.FinderWindowChrome;
            state.enabled = true;
            const style = api.GetWindowLongPtr(te.hwnd, GWL_STYLE);
            if (state.originalStyle == null) state.originalStyle = style;
            if (g_.FullscreenWS != null) g_.FullscreenWS &= ~WS_CAPTION;
            if (!g_.Fullscreen && (style & WS_CAPTION)) {
                api.SetWindowLongPtr(te.hwnd, GWL_STYLE, style & ~WS_CAPTION);
                api.SetWindowPos(te.hwnd, null, 0, 0, 0, 0, 0x0037);
            }
            state.FitMaximized();
            // Use the normal rectangular window frame.
        },
        FitMaximized: function () {
            const state = Sync.FinderWindowChrome;
            if (!state.enabled || g_.Fullscreen || !api.IsZoomed(te.hwnd)) return;
            const rect = api.Memory('RECT'), monitor = api.Memory('MONITORINFOEX');
            api.GetWindowRect(te.hwnd, rect);
            api.GetMonitorInfo(api.MonitorFromRect(rect, MONITOR_DEFAULTTONEAREST), monitor);
            const height = monitor.rcWork.top + monitor.rcWork.bottom - rect.top * 2;
            if (height > 0 && height != rect.bottom - rect.top) api.MoveWindow(te.hwnd, rect.left, rect.top, rect.right - rect.left, height, true);
        },
        ScheduleFit: function (Ctrl, hwnd, msg) {
            if (hwnd != te.hwnd || msg != WM_SIZE || !Sync.FinderWindowChrome.enabled) return;
            clearTimeout(Sync.FinderWindowChrome.fitTimer);
            Sync.FinderWindowChrome.fitTimer = setTimeout(Sync.FinderWindowChrome.FitMaximized, 60);
        },
        Command: function (verb) {
            const command = { close: SC_CLOSE, minimize: SC_MINIMIZE, zoom: api.IsZoomed(te.hwnd) ? SC_RESTORE : SC_MAXIMIZE }[verb];
            if (command) api.PostMessage(te.hwnd, WM_SYSCOMMAND, command, 0);
        },
        Drag: function () {
            const point = api.Memory('POINT');
            api.GetCursorPos(point);
            api.ReleaseCapture();
            api.PostMessage(te.hwnd, WM_NCLBUTTONDOWN, 2, (point.x & 0xffff) | ((point.y & 0xffff) << 16));
        },
        Restore: function () {
            const state = Sync.FinderWindowChrome;
            state.enabled = false;
            clearTimeout(state.fitTimer);
            const style = api.GetWindowLongPtr(te.hwnd, GWL_STYLE);
            api.SetWindowLongPtr(te.hwnd, GWL_STYLE, style | WS_CAPTION);
            if (g_.FullscreenWS != null) g_.FullscreenWS |= WS_CAPTION;
            api.SetWindowPos(te.hwnd, null, 0, 0, 0, 0, 0x0037);
        }
    };
    AddEvent('SystemMessage', Sync.FinderWindowChrome.ScheduleFit);
    AddEvent('FullscreenChanged', function () { if (Sync.FinderWindowChrome.enabled) Sync.FinderWindowChrome.Apply(); });
    AddEventId('AddonDisabledEx', 'finderstyle', Sync.FinderWindowChrome.Restore);
}

