if (!Sync.FinderHeaderHeight) {
    Sync.FinderHeaderHeight = {
        padding: 5, views: {},
        Font: function (header) {
            const current = api.SendMessage(header, WM_GETFONT, 0, 0), views = Sync.FinderHeaderHeight.views;
            for (const id in views) if (views[id].header == header && views[id].font == current) return views[id].original;
            return current;
        },
        Relayout: function (list) {
            const rect = api.Memory('RECT'); api.GetClientRect(list, rect);
            api.SendMessage(list, WM_SIZE, 0, (rect.bottom << 16) | rect.right);
        },
        Apply: function (fv) {
            if (!fv || fv.Type > CTRL_EB || fv.CurrentViewMode != FVM_DETAILS || !fv.hwndList || !api.IsWindowVisible(fv.hwndList)) return;
            const state = Sync.FinderHeaderHeight, header = api.SendMessage(fv.hwndList, LVM_GETHEADER, 0, 0);
            if (!header) return;
            let cache = state.views[fv.Id];
            if (cache && cache.header != header) { state.Release(fv.Id); cache = null; }
            const current = api.SendMessage(header, WM_GETFONT, 0, 0);
            if (cache && current == cache.font) return;
            if (cache) { api.DeleteObject(cache.font); delete state.views[fv.Id]; }
            const metrics = api.Memory('LOGFONT');
            if (!api.GetObject(current, metrics.Size, metrics)) return;
            metrics.lfHeight += metrics.lfHeight < 0 ? -state.padding : state.padding;
            const font = api.CreateFontIndirect(metrics);
            if (!font) return;
            cache = state.views[fv.Id] = { header: header, list: fv.hwndList, original: current, font: font };
            api.SendMessage(header, WM_SETFONT, font, 0);
            state.Relayout(fv.hwndList);
            if (Sync.FinderHeaderInset) Sync.FinderHeaderInset.Apply(fv);
            if (Sync.FinderHeaderSort) Sync.FinderHeaderSort.Paint(fv);
            if (Sync.FinderHeaderSeparator) Sync.FinderHeaderSeparator.Apply(fv);
        },
        Schedule: function () {
            const state = Sync.FinderHeaderHeight;
            clearTimeout(state.timer);
            state.timer = setTimeout(function () { const views = te.Ctrls(CTRL_FV); for (let i in views) state.Apply(views[i]); }, 40);
        },
        Release: function (id) {
            const state = Sync.FinderHeaderHeight, cache = state.views[id];
            if (!cache) return;
            if (api.IsWindow(cache.header) && api.SendMessage(cache.header, WM_GETFONT, 0, 0) == cache.font) {
                api.SendMessage(cache.header, WM_SETFONT, cache.original, 0);
                if (api.IsWindow(cache.list)) state.Relayout(cache.list);
            }
            api.DeleteObject(cache.font); delete state.views[id];
        },
        Restore: function () { const state = Sync.FinderHeaderHeight; clearTimeout(state.timer); for (const id in state.views) state.Release(id); }
    };
    AddEvent('NavigateComplete', Sync.FinderHeaderHeight.Schedule);
    AddEvent('ListViewCreated', Sync.FinderHeaderHeight.Schedule);
    AddEvent('ViewModeChanged', Sync.FinderHeaderHeight.Schedule);
    AddEvent('ChangeView', Sync.FinderHeaderHeight.Schedule);
    AddEvent('Arrange', Sync.FinderHeaderHeight.Schedule);
    AddEvent('Load', Sync.FinderHeaderHeight.Schedule);
    AddEvent('CloseView', function (fv) { Sync.FinderHeaderHeight.Release(fv.Id); });
    const previousDisable = eventTE.addondisabledex && eventTE.addondisabledex.finderstyle;
    AddEventId('AddonDisabledEx', 'finderstyle', function () { Sync.FinderHeaderHeight.Restore(); if (previousDisable) previousDisable(); });
}
