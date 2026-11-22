if (!Sync.FinderSelectionWidth) {
    Sync.FinderSelectionWidth = {
        keys: ['System.ItemNameDisplay', 'System.DateModified', 'System.Size', 'System.ItemTypeText', 'System.DateCreated'],
        compact: [136, 90, 100, 136], busy: {}, minimumCleared: {}, applied: {},
        Widths: function (available) {
            const base = Sync.FinderSelectionWidth.compact, nameMin = Math.min(220, Math.max(20, Math.floor(available * 0.4)));
            const total = base.reduce(function (a, b) { return a + b; }, 0), scale = Math.min(1, Math.max(0, (available - nameMin) / total)), widths = [0];
            let used = 0;
            for (let i = 0; i < base.length; ++i) { const width = Math.max(1, Math.floor(base[i] * scale)); widths.push(width); used += width; }
            widths[0] = Math.max(1, available - used);
            return widths;
        },
        Apply: function (fv) {
            if (!fv || fv.Type > CTRL_EB || fv.CurrentViewMode != FVM_DETAILS || !fv.hwndList || Sync.FinderStyle.IsThisPC(fv)) return;
            const state = Sync.FinderSelectionWidth, hwnd = fv.hwndList;
            if (state.busy[hwnd] || !api.IsWindowVisible(hwnd)) return;
            const client = api.Memory('RECT');
            api.GetClientRect(hwnd, client);
            if (client.right < 8 || client.right >= 32768) return;
            const frame = api.Memory('RECT'); api.GetClientRect(te.hwnd, frame);
            if (client.right > frame.right) return;
            const stamp = client.right + ':' + fv.SessionId;
            if (state.applied[hwnd] == stamp) return;
            state.busy[hwnd] = true;
            let changed = false;
            try {
                const widths = state.Widths(client.right), current = [], text = String(fv.Columns(1)), pattern = /"([^"]+)"\s+-?\d+/g;
                let match;
                while ((match = pattern.exec(text))) current.push(match[1].toLowerCase());
                if (JSON.stringify(current) != JSON.stringify(state.keys.map(function (key) { return key.toLowerCase(); }))) {
                    fv.Columns = state.keys.map(function (key, i) { return '"' + key + '" ' + widths[i]; }).join(' ');
                    changed = true;
                }
                const header = api.SendMessage(hwnd, LVM_GETHEADER, 0, 0), count = api.SendMessage(header, HDM_GETITEMCOUNT, 0, 0);
                if (count != state.keys.length) { state.Schedule(); return; }
                    const minimumTag = String(fv.FolderItem.Path) + ':' + current.join('|');
                    if (state.minimumCleared[hwnd] != minimumTag) {
                        const column = api.Memory('LVCOLUMN'); column.mask = 0x40; column.cxMin = 0;
                        for (let index = 0; index < 5; ++index) api.SendMessage(hwnd, LVM_SETCOLUMN, index, column);
                        state.minimumCleared[hwnd] = minimumTag;
                    }
                    for (const index of [1, 2, 3, 4]) {
                        if (api.SendMessage(hwnd, LVM_GETCOLUMNWIDTH, index, 0) != widths[index]) {
                            api.SendMessage(hwnd, LVM_SETCOLUMNWIDTH, index, widths[index]);
                            changed = true;
                        }
                        widths[index] = api.SendMessage(hwnd, LVM_GETCOLUMNWIDTH, index, 0);
                    }
                    widths[0] = Math.max(1, client.right - widths.slice(1).reduce(function (a, b) { return a + b; }, 0));
                    if (api.SendMessage(hwnd, LVM_GETCOLUMNWIDTH, 0, 0) != widths[0]) {
                        api.SendMessage(hwnd, LVM_SETCOLUMNWIDTH, 0, widths[0]); changed = true;
                    }
                state.applied[hwnd] = stamp;
                state.last = { id: fv.Id, clientWidth: client.right, widths: widths, totalWidth: widths.reduce(function (a, b) { return a + b; }, 0) };
            } finally { delete state.busy[hwnd]; }
            if (changed) {
                api.InvalidateRect(hwnd, null, true);
                if (Sync.FinderHeaderInset) Sync.FinderHeaderInset.Schedule();
                state.Schedule();
            }
        },
        Schedule: function () {
            const state = Sync.FinderSelectionWidth;
            clearTimeout(state.timer);
            state.timer = setTimeout(function () {
                const views = te.Ctrls(CTRL_FV);
                for (let i in views) state.Apply(views[i]);
            }, 80);
        }
    };
    AddEvent('NavigateComplete', Sync.FinderSelectionWidth.Apply);
    AddEvent('ChangeView', Sync.FinderSelectionWidth.Schedule);
    AddEvent('ListViewCreated', Sync.FinderSelectionWidth.Apply);
    AddEvent('ViewModeChanged', Sync.FinderSelectionWidth.Apply);
    AddEvent('ColumnsChanged', function (fv) { if (fv && fv.hwndList) delete Sync.FinderSelectionWidth.applied[fv.hwndList]; Sync.FinderSelectionWidth.Schedule(); });
    AddEvent('CloseView', function (fv) { const hwnd = fv.hwndList; delete Sync.FinderSelectionWidth.applied[hwnd]; delete Sync.FinderSelectionWidth.minimumCleared[hwnd]; });
    AddEvent('Arrange', Sync.FinderSelectionWidth.Schedule);
    AddEvent('Load', Sync.FinderSelectionWidth.Schedule);
}


