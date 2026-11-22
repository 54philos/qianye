if (!Sync.FinderFrame) {
Sync.FinderFrame = {
    Apply: function (fv) {
        if (!fv || fv.Type > CTRL_EB) return;
        if (!(fv.FolderFlags & FWF_NOCLIENTEDGE)) fv.FolderFlags |= FWF_NOCLIENTEDGE;
        for (const hwnd of [fv.hwnd, fv.hwndList]) {
            if (!hwnd) continue;
            const style = api.GetWindowLongPtr(hwnd, GWL_STYLE), ex = api.GetWindowLongPtr(hwnd, GWL_EXSTYLE);
            const cleanStyle = style & ~0x00800000, cleanEx = ex & ~0x00020200;
            if (cleanStyle != style || cleanEx != ex) {
                api.SetWindowLongPtr(hwnd, GWL_STYLE, cleanStyle);
                api.SetWindowLongPtr(hwnd, GWL_EXSTYLE, cleanEx);
                api.SetWindowPos(hwnd, null, 0, 0, 0, 0, 0x0037);
            }
        }
    }
};
AddEvent('BeforeNavigate', function (fv, settings) { settings.fFlags |= FWF_NOCLIENTEDGE; });
AddEvent('NavigateComplete', Sync.FinderFrame.Apply);
AddEvent('ListViewCreated', Sync.FinderFrame.Apply);
AddEvent('ViewModeChanged', Sync.FinderFrame.Apply);
AddEvent('Load', function () {
    const views = te.Ctrls(CTRL_FV);
    for (let i in views) Sync.FinderFrame.Apply(views[i]);
});
}
