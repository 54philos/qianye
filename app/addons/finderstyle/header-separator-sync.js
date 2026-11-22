if (!Sync.FinderHeaderSeparator) {
    Sync.FinderHeaderSeparator = {
        color: GetWinColor('#dedfe0'), views: {},
        Apply: function (fv) {
            if (!fv || fv.Type > CTRL_EB || fv.CurrentViewMode != FVM_DETAILS || !fv.hwndList || !api.IsWindowVisible(fv.hwndList)) return;
            const state = Sync.FinderHeaderSeparator, header = api.SendMessage(fv.hwndList, LVM_GETHEADER, 0, 0), rect = api.Memory('RECT');
            if (!header || !api.IsWindowVisible(header)) return;
            api.GetClientRect(header, rect);
            const width = rect.right, height = rect.bottom;
            if (width < 1 || width > 32767 || height < 2) return;
            let cache = state.views[fv.Id];
            if (cache && (cache.header != header || !api.IsWindow(cache.window))) { state.Release(fv.Id); cache = null; }
            if (!cache) {
                const child = api.CreateWindowEx(0, 'STATIC', '', 0x5000000e, 0, height - 1, width, 1, header, null, null, null);
                if (!child) return;
                cache = state.views[fv.Id] = { header: header, window: child, width: 0, height: 0, bitmap: null };
            }
            if (cache.width != width) {
                const windowDC = api.GetDC(header), dc = api.CreateCompatibleDC(windowDC), bitmap = api.CreateCompatibleBitmap(windowDC, width, 1), previous = api.SelectObject(dc, bitmap), line = api.Memory('RECT');
                try {
                    line.right = width; line.bottom = 1;
                    api.SetDCBrushColor(dc, state.color);
                    api.FillRect(dc, line, api.GetStockObject(DC_BRUSH));
                } finally { api.SelectObject(dc, previous); api.DeleteDC(dc); api.ReleaseDC(header, windowDC); }
                api.SendMessage(cache.window, 0x0172, 0, bitmap);
                if (cache.bitmap) api.DeleteObject(cache.bitmap);
                cache.bitmap = bitmap;
            }
            if (cache.width != width || cache.height != height) api.SetWindowPos(cache.window, 0, 0, height - 1, width, 1, 0x0010);
            cache.width = width; cache.height = height;
        },
        Schedule: function () {
            const state = Sync.FinderHeaderSeparator;
            clearTimeout(state.timer);
            state.timer = setTimeout(function () { const views = te.Ctrls(CTRL_FV); for (let i in views) state.Apply(views[i]); }, 160);
        },
        Release: function (id) {
            const state = Sync.FinderHeaderSeparator, cache = state.views[id];
            if (!cache) return;
            if (api.IsWindow(cache.window)) { api.SendMessage(cache.window, 0x0172, 0, null); api.DestroyWindow(cache.window); }
            if (cache.bitmap) api.DeleteObject(cache.bitmap);
            delete state.views[id];
        },
        Restore: function () { const state = Sync.FinderHeaderSeparator; clearTimeout(state.timer); for (const id in state.views) state.Release(id); }
    };
    AddEvent('NavigateComplete', Sync.FinderHeaderSeparator.Schedule);
    AddEvent('ListViewCreated', Sync.FinderHeaderSeparator.Schedule);
    AddEvent('ViewModeChanged', Sync.FinderHeaderSeparator.Schedule);
    AddEvent('ColumnsChanged', Sync.FinderHeaderSeparator.Schedule);
    AddEvent('Arrange', Sync.FinderHeaderSeparator.Schedule);
    AddEvent('ChangeView', Sync.FinderHeaderSeparator.Schedule);
    AddEvent('Load', Sync.FinderHeaderSeparator.Schedule);
    AddEvent('CloseView', function (fv) { Sync.FinderHeaderSeparator.Release(fv.Id); });
    const previousDisable = eventTE.addondisabledex && eventTE.addondisabledex.finderstyle;
    AddEventId('AddonDisabledEx', 'finderstyle', function () { Sync.FinderHeaderSeparator.Restore(); if (previousDisable) previousDisable(); });
}
