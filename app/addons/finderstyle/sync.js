// Use the native small-icon list; remembered 24px sizes can render bad masks.
Sync.FinderStyle = {
    FreshStartup: te.Data.Load < 2,
    IsThisPC: function (FV) { return FV && FV.FolderItem && api.ILIsEqual(FV.FolderItem, ssfDRIVES); },
    FavoriteLocationCache: { signature: '', paths: [] },
    NormalizeLocation: function (path) { return String(path).toLowerCase().replace(/[\\\/]+$/, ''); },
    GetLocationJson: function () {
        const state = Sync.FinderStyle, nodes = te.Data.xmlMenus.getElementsByTagName('Favorites')[0].getElementsByTagName('Item');
        const texts = [];
        for (let i = 0; i < nodes.length; ++i) texts.push(nodes[i].text);
        const signature = JSON.stringify(texts), cache = state.FavoriteLocationCache;
        if (cache.signature != signature) {
            cache.paths = [];
            for (let i = 0; i < texts.length; ++i) cache.paths.push(state.NormalizeLocation(ExtractPath(te, texts[i])));
            cache.signature = signature;
        }
        const fv = te.Ctrl(CTRL_FV);
        return JSON.stringify({ path: fv && fv.FolderItem ? state.NormalizeLocation(fv.FolderItem.Path) : '', favorites: cache.paths });
    },
    PushLocation: function (fv) {
        const selected = te.Ctrl(CTRL_FV);
        if (fv && selected && fv.Id != selected.Id) return;
        InvokeUI('Addons.FinderStyle.ReceiveLocation', [Sync.FinderStyle.GetLocationJson()]);
    },
    SetView: function (FV) {
        if (!FV) return;
        FV.TreeView.Align = 0;
        if (Sync.FinderStyle.IsThisPC(FV)) {
            FV.Data.FinderWasThisPC = true;
            if (FV.CurrentViewMode != FVM_TILE || FV.IconSize != 48) FV.SetViewMode(FVM_TILE, 48);
            return;
        }
        if (FV.CurrentViewMode == FVM_TILE && (FV.Data.FinderWasThisPC || !FV.Data.FinderInitialized)) {
            FV.Data.FinderWasThisPC = false;
            FV.SetViewMode(FVM_DETAILS, 16);
        }
        if (FV.CurrentViewMode == FVM_DETAILS && FV.IconSize != 16) FV.IconSize = 16;
        if (FV.Data.FinderInitialized) return;
        FV.Data.FinderInitialized = true;
        if (FV.CurrentViewMode == FVM_DETAILS) {
            FV.Columns = '"System.ItemNameDisplay" 550 "System.DateModified" 136 "System.Size" 90 "System.ItemTypeText" 100 "System.DateCreated" 136';
        }
    }
};
// Modern Windows drive tiles include usage bars and available/total capacity.
te.Data.Conf_Layout = (te.Data.Conf_Layout | 0x20);
te.Layout = te.Data.Conf_Layout;
te.Data.bSaveConfig = true;
// A new process keeps window geometry but starts without the previous tabs.
// Customize/reload and manually loaded layouts keep their existing tabs.
if (Sync.FinderStyle.FreshStartup) g_.xmlWindow = null;
AddEvent('NavigateComplete', Sync.FinderStyle.SetView);
AddEvent('ViewModeChanged', Sync.FinderStyle.SetView);
AddEvent('ChangeView', Sync.FinderStyle.PushLocation);
AddEvent('FavoriteChanged', function () { Sync.FinderStyle.PushLocation(); });
AddEvent('Load', function () {
    if (Sync.FinderStyle.FreshStartup) {
        Sync.FinderStyle.FreshStartup = false;
        const TC = te.Ctrl(CTRL_TC);
        // InitWindow creates a default tab before opening command-line folders.
        // Discard that placeholder when a requested folder has been opened.
        if (TC && TC.Count > 1 && TC[0].Id != TC.Selected.Id) TC[0].Close();
    }
    const views = te.Ctrls(CTRL_FV);
    for (let i in views) Sync.FinderStyle.SetView(views[i]);
    Sync.FinderStyle.PushLocation();
});
