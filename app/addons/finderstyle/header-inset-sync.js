if (!Sync.FinderHeaderInset) {
    Sync.FinderHeaderInset = {
        fonts: {},
        Prefix: function (header, target) {
            const state = Sync.FinderHeaderInset, font = (Sync.FinderHeaderHeight ? Sync.FinderHeaderHeight.Font(header) : api.SendMessage(header, WM_GETFONT, 0, 0));
            target = target == null ? 20 : target;
            const key = font + ':' + target;
            if (state.fonts[key]) return state.fonts[key];
            const dc = api.GetDC(header), old = font ? api.SelectObject(dc, font) : null, size = api.Memory('SIZE');
            let best = { text: '', pixels: 0 }, error = target;
            try {
                for (let spaces = 0; spaces <= 6; ++spaces) {
                    for (let hair = 0; hair <= 12; ++hair) {
                        const text = new Array(spaces + 1).join(' ') + new Array(hair + 1).join('\u200a');
                        if (!text) continue;
                        api.GetTextExtentPoint32(dc, text, size);
                        const delta = Math.abs(size.cx - target);
                        if (delta < error) { best = { text: text, pixels: size.cx }; error = delta; }
                        if (!delta) break;
                    }
                    if (!error) break;
                }
            } finally {
                if (old) api.SelectObject(dc, old);
                api.ReleaseDC(header, dc);
            }
            return state.fonts[key] = best;
        },
        Apply: function (fv) {
            if (!fv || fv.Type > CTRL_EB || fv.CurrentViewMode != FVM_DETAILS || !fv.hwndList) return;
            const header = api.SendMessage(fv.hwndList, LVM_GETHEADER, 0, 0);
            if (!header) return;
            const state = Sync.FinderHeaderInset, item = api.Memory('HDITEM');
            for (let i = 0, count = api.SendMessage(header, HDM_GETITEMCOUNT, 0, 0); i < count; ++i) {
                item.mask = HDI_TEXT;
                item.pszText = api.Memory('WCHAR', 260);
                item.cchTextMax = 260;
                if (!api.SendMessage(header, HDM_GETITEM, i, item)) continue;
                const caption = api.SysAllocString(item.pszText), plain = caption.replace(/^[\s\u200a]+/, '');
                if (plain != '\u540d\u79f0' && plain != 'Name') continue;
                const label = api.Memory('RECT'), column = api.Memory('RECT');
                label.left = LVIR_LABEL;
                let target = (fv.IconSize || 16) + 4;
                if (api.SendMessage(fv.hwndList, LVM_GETITEMRECT, api.SendMessage(fv.hwndList, LVM_GETTOPINDEX, 0, 0), label) && api.SendMessage(header, 0x1207, i, column)) {
                    // Header and list text have native inner margins of 6 and 2 pixels.
                    target = Math.max(0, label.left - column.left - 4);
                }
                const prefix = state.Prefix(header, target);
                const padded = prefix.text + plain;
                if (caption != padded) {
                    const columns = fv.Columns;
                    item.pszText = padded;
                    item.mask = HDI_TEXT;
                    api.SendMessage(header, HDM_SETITEM, i, item);
                    state.last = { id: fv.Id, column: i, insetPixels: prefix.pixels, columnsUnchanged: columns == fv.Columns };
                }
            }
        },
        Schedule: function () {
            const state = Sync.FinderHeaderInset;
            clearTimeout(state.timer);
            state.timer = setTimeout(function () {
                const views = te.Ctrls(CTRL_FV);
                for (let i in views) state.Apply(views[i]);
            }, 100);
        }
    };
    AddEvent('NavigateComplete', Sync.FinderHeaderInset.Apply);
    AddEvent('ListViewCreated', Sync.FinderHeaderInset.Apply);
    AddEvent('ViewModeChanged', Sync.FinderHeaderInset.Apply);
    AddEvent('ColumnsChanged', Sync.FinderHeaderInset.Schedule);
    AddEvent('Arrange', Sync.FinderHeaderInset.Schedule);
    AddEvent('Load', Sync.FinderHeaderInset.Schedule);
}

