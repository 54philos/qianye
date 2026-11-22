TITLE = '\u5343\u9875';
if (Sync.FinderResident && Sync.FinderResident.icon) {
    Sync.FinderResident.icon.szTip = '\u5343\u9875 - \u5feb\u901f\u6253\u5f00';
    if (Sync.FinderResident.trayVisible) api.Shell_NotifyIcon(1, Sync.FinderResident.icon);
}
