if (!Sync.FinderAppIcon) {
    Sync.FinderAppIcon = {
        icons: null,
        Apply: function () {
            const state = Sync.FinderAppIcon;
            if (!state.icons) {
                const path = BuildPath(te.Data.Installed, 'addons\\finderstyle\\finder-classic-fuller.ico');
                const small = api.LoadImage(null, path, IMAGE_ICON, api.GetSystemMetrics(SM_CXSMICON), api.GetSystemMetrics(SM_CYSMICON), LR_LOADFROMFILE);
                const big = api.LoadImage(null, path, IMAGE_ICON, api.GetSystemMetrics(SM_CXICON), api.GetSystemMetrics(SM_CYICON), LR_LOADFROMFILE);
                if (!small || !big) { if (small) api.DestroyIcon(small); if (big) api.DestroyIcon(big); return; }
                state.icons = { small: small, big: big, oldSmall: api.SendMessage(te.hwnd, WM_GETICON, 0, 0), oldBig: api.SendMessage(te.hwnd, WM_GETICON, 1, 0) };
            }
            api.SendMessage(te.hwnd, WM_SETICON, 0, state.icons.small);
            api.SendMessage(te.hwnd, WM_SETICON, 1, state.icons.big);
            const resident = Sync.FinderResident;
            if (resident && resident.icon && resident.icon.hIcon != state.icons.small) {
                const old = resident.icon.hIcon, owned = resident.ownsIcon;
                resident.icon.hIcon = state.icons.small; resident.ownsIcon = false;
                if (resident.trayVisible) api.Shell_NotifyIcon(1, resident.icon);
                if (old && owned) api.DestroyIcon(old);
            }
        },
        Restore: function () {
            const state = Sync.FinderAppIcon, icons = state.icons;
            if (!icons) return;
            api.SendMessage(te.hwnd, WM_SETICON, 0, icons.oldSmall);
            api.SendMessage(te.hwnd, WM_SETICON, 1, icons.oldBig);
            const resident = Sync.FinderResident;
            if (resident && resident.icon && resident.icon.hIcon == icons.small) {
                let fallback = icons.oldSmall;
                if (!fallback) { const info = api.Memory('SHFILEINFO'); api.SHGetFileInfo(BuildPath(te.Data.Installed, 'TE64.exe'), 0, info, info.Size, SHGFI_ICON | SHGFI_SMALLICON); fallback = info.hIcon; resident.ownsIcon = !!fallback; }
                resident.icon.hIcon = fallback;
                if (resident.trayVisible) api.Shell_NotifyIcon(1, resident.icon);
            }
            api.DestroyIcon(icons.small); api.DestroyIcon(icons.big); state.icons = null;
        }
    };
    AddEvent('Load', Sync.FinderAppIcon.Apply);
    const previousDisable = eventTE.addondisabledex && eventTE.addondisabledex.finderstyle;
    AddEventId('AddonDisabledEx', 'finderstyle', function () { Sync.FinderAppIcon.Restore(); if (previousDisable) previousDisable(); });
}
