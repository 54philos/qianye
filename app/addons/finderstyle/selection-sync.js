if (!Sync.FinderSelection) {
    Sync.FinderSelection = {
        color: GetWinColor('#007be8'),
        textColor: 0xffffff,
        draws: 0,
        themeWindows: {},
        Apply: function (fv) {
            if (!fv || fv.Type > CTRL_EB) return;
            const hwnd = fv.hwndList, state = Sync.FinderSelection;
            if (hwnd && !state.themeWindows[hwnd]) {
                api.SetWindowTheme(hwnd, null, null);
                state.themeWindows[hwnd] = true;
            }
            if (fv.CurrentViewMode != FVM_DETAILS) return;
            if (!(fv.FolderFlags & FWF_FULLROWSELECT)) fv.FolderFlags |= FWF_FULLROWSELECT;
            if (hwnd) api.SendMessage(hwnd, LVM_SETEXTENDEDLISTVIEWSTYLE, LVS_EX_FULLROWSELECT, LVS_EX_FULLROWSELECT);
        },
        PrePaint: function (fv, item, nmcd, vcd, result) {
            if (!item || fv.Type > CTRL_EB || !fv.hwndList) return;
            // No hover highlight; selected rows retain the custom blue below.
            if (nmcd.uItemState & CDIS_HOT) {
                nmcd.uItemState &= ~CDIS_HOT;
                result[0] |= 2;
                Sync.FinderSelection.hoverSuppressed = (Sync.FinderSelection.hoverSuppressed || 0) + 1;
            }
            if (fv.CurrentViewMode != FVM_DETAILS) return;
            if (!(api.SendMessage(fv.hwndList, LVM_GETITEMSTATE, nmcd.dwItemSpec, LVIS_SELECTED) & LVIS_SELECTED)) return;
            const state = Sync.FinderSelection, rect = api.Memory('RECT');
            api.GetClientRect(fv.hwndList, rect);
            rect.top = nmcd.rc.top; rect.bottom = nmcd.rc.bottom;
            api.SetDCBrushColor(nmcd.hdc, state.color);
            api.FillRect(nmcd.hdc, rect, api.GetStockObject(DC_BRUSH));
            nmcd.uItemState &= ~(CDIS_SELECTED | CDIS_FOCUS | CDIS_HOT);
            vcd.clrTextBk = state.color;
            vcd.clrText = state.textColor;
            result[0] |= 2;
            ++state.draws;
            state.last = { id: fv.Id, index: nmcd.dwItemSpec, width: rect.right, top: rect.top, bottom: rect.bottom };
        }
    };
    AddEvent('ItemPrePaint', Sync.FinderSelection.PrePaint, true);
    AddEvent('NavigateComplete', Sync.FinderSelection.Apply);
    AddEvent('ViewModeChanged', Sync.FinderSelection.Apply);
    AddEvent('ListViewCreated', Sync.FinderSelection.Apply);
    AddEvent('Load', function () {
        const views = te.Ctrls(CTRL_FV);
        for (let i in views) Sync.FinderSelection.Apply(views[i]);
    });
}
