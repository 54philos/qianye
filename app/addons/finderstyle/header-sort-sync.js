if (!Sync.FinderHeaderSort) {
    Sync.FinderHeaderSort = {
        defaultSort: '-System.DateModified',
        activeColor: GetWinColor('#35383d'), inactiveColor: GetWinColor('#909499'),
        views: {}, defaults: {}, busy: {},
        Default: function (fv) {
            if (!fv || fv.Type > CTRL_EB || !fv.FolderItem || Sync.FinderStyle.IsThisPC(fv)) return;
            const state = Sync.FinderHeaderSort, path = String(fv.FolderItem.Path);
            if (state.defaults[fv.Id] != path) {
                state.defaults[fv.Id] = path;
                fv.SortColumn = state.defaultSort;
            }
            state.Schedule();
        },
        Bitmap: function (header, caption, width, height, active, descending) {
            const state = Sync.FinderHeaderSort, windowDC = api.GetDC(header), dc = api.CreateCompatibleDC(windowDC);
            const bitmap = api.CreateCompatibleBitmap(windowDC, width, height), oldBitmap = api.SelectObject(dc, bitmap), font = (Sync.FinderHeaderHeight ? Sync.FinderHeaderHeight.Font(header) : api.SendMessage(header, WM_GETFONT, 0, 0)), oldFont = font ? api.SelectObject(dc, font) : null;
            try {
                const rect = api.Memory('RECT'); rect.right = width; rect.bottom = height;
                api.SetDCBrushColor(dc, 0xffffff);
                api.FillRect(dc, rect, api.GetStockObject(DC_BRUSH));
                api.SetBkMode(dc, 1);
                api.SetTextColor(dc, active ? state.activeColor : state.inactiveColor);
                api.DrawText(dc, caption, -1, rect, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
                if (active && width >= 12) {
                    const pen = api.CreatePen(0, 1, GetWinColor('#73777d')), oldPen = api.SelectObject(dc, pen), x = Math.floor(width / 2);
                    api.MoveToEx(dc, x - 3, descending ? 0 : 3, null);
                    api.LineTo(dc, x, descending ? 3 : 0);
                    api.LineTo(dc, x + 3, descending ? 0 : 3);
                    api.SelectObject(dc, oldPen); api.DeleteObject(pen);
                }
            } finally {
                if (oldFont) api.SelectObject(dc, oldFont);
                api.SelectObject(dc, oldBitmap); api.DeleteDC(dc); api.ReleaseDC(header, windowDC);
            }
            return bitmap;
        },
        Paint: function (fv) {
            if (!fv || fv.Type > CTRL_EB || fv.CurrentViewMode != FVM_DETAILS || !fv.hwndList || !api.IsWindowVisible(fv.hwndList)) return;
            const state = Sync.FinderHeaderSort;
            if (state.busy[fv.Id]) return;
            const header = api.SendMessage(fv.hwndList, LVM_GETHEADER, 0, 0), rect = api.Memory('RECT');
            if (!header) return;
            api.GetClientRect(header, rect);
            const height = rect.bottom - 4;
            if (height < 8) return;
            let cache = state.views[fv.Id];
            if (cache && cache.header != header) { state.Release(fv.Id); cache = null; }
            if (!cache) cache = state.views[fv.Id] = { header: header, items: [] };
            const sort = String(fv.GetSortColumn(1)), descending = sort.charAt(0) == '-', key = sort.replace(/^-/, '').toLowerCase(), keys = [], pattern = /"([^"]+)"\s+-?\d+/g;
            let match; const columns = String(fv.Columns(1));
            while ((match = pattern.exec(columns))) keys.push(match[1].toLowerCase());
            state.busy[fv.Id] = true;
            try {
                for (let i = 0, count = api.SendMessage(header, HDM_GETITEMCOUNT, 0, 0); i < count; ++i) {
                    const item = api.Memory('HDITEM'); item.mask = HDI_TEXT | HDI_FORMAT | HDI_BITMAP | HDI_WIDTH;
                    item.pszText = api.Memory('WCHAR', 260); item.cchTextMax = 260;
                    if (!api.SendMessage(header, HDM_GETITEM, i, item)) continue;
                    const caption = api.SysAllocString(item.pszText), width = Math.max(1, item.cxy - 12), active = keys[i] == key;
                    const signature = [caption, width, height, active, descending, (Sync.FinderHeaderHeight ? Sync.FinderHeaderHeight.Font(header) : api.SendMessage(header, WM_GETFONT, 0, 0))].join('|');
                    let entry = cache.items[i];
                    if (!entry || entry.signature != signature) {
                        const bitmap = state.Bitmap(header, caption, width, height, active, descending);
                        const old = entry;
                        entry = cache.items[i] = { bitmap: bitmap, signature: signature, originalFormat: old ? old.originalFormat : item.fmt, caption: caption, active: active, descending: descending };
                        item.hbm = bitmap;
                        item.fmt = (item.fmt & ~(HDF_STRING | HDF_IMAGE | HDF_SORTUP | HDF_SORTDOWN | HDF_JUSTIFYMASK | HDF_BITMAP_ON_RIGHT)) | HDF_BITMAP;
                        item.mask = HDI_BITMAP | HDI_FORMAT;
                        api.SendMessage(header, HDM_SETITEM, i, item);
                        if (old) api.DeleteObject(old.bitmap);
                    } else {
                        const format = (item.fmt & ~(HDF_STRING | HDF_IMAGE | HDF_SORTUP | HDF_SORTDOWN | HDF_JUSTIFYMASK | HDF_BITMAP_ON_RIGHT)) | HDF_BITMAP;
                        if (item.fmt != format || item.hbm != entry.bitmap) {
                            item.fmt = format; item.hbm = entry.bitmap; item.mask = HDI_BITMAP | HDI_FORMAT;
                            api.SendMessage(header, HDM_SETITEM, i, item);
                        }
                    }
                }
                cache.sort = sort;
            } finally { delete state.busy[fv.Id]; }
        },
        Schedule: function () {
            const state = Sync.FinderHeaderSort;
            clearTimeout(state.timer);
            state.timer = setTimeout(function () {
                const views = te.Ctrls(CTRL_FV);
                for (let i in views) state.Paint(views[i]);
            }, 130);
        },
        Release: function (id) {
            const state = Sync.FinderHeaderSort, cache = state.views[id];
            if (!cache) return;
            for (let i = 0; i < cache.items.length; ++i) {
                const entry = cache.items[i]; if (!entry) continue;
                if (api.IsWindow(cache.header)) {
                    const item = api.Memory('HDITEM'); item.mask = HDI_BITMAP | HDI_FORMAT; item.hbm = null;
                    item.fmt = (entry.originalFormat & ~(HDF_BITMAP | HDF_SORTUP | HDF_SORTDOWN)) | HDF_STRING;
                    if (entry.active) item.fmt |= entry.descending ? HDF_SORTDOWN : HDF_SORTUP;
                    api.SendMessage(cache.header, HDM_SETITEM, i, item);
                }
                api.DeleteObject(entry.bitmap);
            }
            delete state.views[id];
        },
        Restore: function () {
            const state = Sync.FinderHeaderSort; clearTimeout(state.timer);
            for (const id in state.views) state.Release(id);
        }
    };
    AddEvent('NavigateComplete', Sync.FinderHeaderSort.Default);
    AddEvent('ViewModeChanged', Sync.FinderHeaderSort.Default);
    AddEvent('Sort', Sync.FinderHeaderSort.Schedule);
    AddEvent('Sorting', Sync.FinderHeaderSort.Schedule);
    AddEvent('ChangeView', Sync.FinderHeaderSort.Schedule);
    AddEvent('ColumnsChanged', Sync.FinderHeaderSort.Schedule);
    AddEvent('Arrange', Sync.FinderHeaderSort.Schedule);
    AddEvent('CloseView', function (fv) { Sync.FinderHeaderSort.Release(fv.Id); delete Sync.FinderHeaderSort.defaults[fv.Id]; });
    AddEvent('Load', function () { const views = te.Ctrls(CTRL_FV); for (let i in views) Sync.FinderHeaderSort.Default(views[i]); });
    const previousDisable = eventTE.addondisabledex && eventTE.addondisabledex.finderstyle;
    AddEventId('AddonDisabledEx', 'finderstyle', function () { Sync.FinderHeaderSort.Restore(); if (previousDisable) previousDisable(); });
}

