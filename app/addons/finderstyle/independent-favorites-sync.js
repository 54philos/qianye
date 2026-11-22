// The sidebar keeps the standard Favorites menu; the top bar owns its XML.
Sync.FinderFavorites = {
    TopFile: 'finder-top-favorites.xml',
    FolderCache: {},
    Open: function (bar, index, newTab) {
        const node = Sync.FinderFavorites.Favorites(bar).getElementsByTagName('Item')[index];
        if (!node) return;
        const text = node.text, type = node.getAttribute('Type');
        if (!/^Open(?: in new tab| in background)?$/i.test(type) || !/^(?:[a-z]:\\|\\\\|::\{)[^\r\n]*$/i.test(text)) return Exec(te, text, newTab ? 'Open in new tab' : type, te.hwnd);
        const fv = te.Ctrl(CTRL_FV);
        if (!fv) return;
        let flags = GetNavigateFlags(fv);
        if (newTab || /^Open in (?:new tab|background)$/i.test(type) || GetLock(fv)) flags |= SBSP_NEWBROWSER;
        if (!newTab && /^Open in background$/i.test(type)) flags |= SBSP_ACTIVATE_NOFOCUS;
        const cache = Sync.FinderFavorites.FolderCache;
        const folder = cache[text] || (cache[text] = api.ILCreateFromPath(text));
        if (!(flags & SBSP_NEWBROWSER) && api.ILIsEqual(fv.FolderItem, folder)) { fv.Focus(); return S_OK; }
        fv.Navigate(folder, flags);
        if (!(flags & SBSP_ACTIVATE_NOFOCUS)) fv.Focus();
        return S_OK;
    },
    Init: function () {
        const xml = api.CreateObject('Msxml2.DOMDocument');
        xml.async = false;
        const path = BuildPath(te.Data.DataFolder, 'config', Sync.FinderFavorites.TopFile);
        if (api.PathFileExists(path)) {
            if (!xml.load(path) || !xml.getElementsByTagName('Favorites').length) throw Error('Cannot read top favorites: ' + path);
        } else {
            const source = te.Data.xmlMenus.getElementsByTagName('Favorites')[0];
            xml.loadXML('<TablacusExplorer>' + source.xml + '</TablacusExplorer>');
            SaveXmlEx(Sync.FinderFavorites.TopFile, xml);
        }
        te.Data.FinderTopFavorites = xml;
    },
    Document: function (bar) { return bar == 'top' ? te.Data.FinderTopFavorites : te.Data.xmlMenus; },
    Favorites: function (bar) { return Sync.FinderFavorites.Document(bar).getElementsByTagName('Favorites')[0]; },
    Save: function (bar) {
        if (bar == 'top') {
            SaveXmlEx(Sync.FinderFavorites.TopFile, te.Data.FinderTopFavorites);
            InvokeUI('Addons.FavBar.Changed');
        } else {
            SaveXmlEx('menus.xml', te.Data.xmlMenus);
            FavoriteChanged();
        }
    },
    GetTopJson: function () {
        const nodes = Sync.FinderFavorites.Favorites('top').getElementsByTagName('Item'), items = [];
        for (let i = 0; i < nodes.length; ++i) {
            items.push({ Name: nodes[i].getAttribute('Name'), Type: nodes[i].getAttribute('Type'), Icon: nodes[i].getAttribute('Icon') || '', text: nodes[i].text });
        }
        return JSON.stringify(items);
    },
    RemoveTop: function (index, expectedPath) {
        const root = Sync.FinderFavorites.Favorites('top'), node = root.getElementsByTagName('Item')[index];
        if (!node || node.text != expectedPath) return false;
        root.removeChild(node);
        Sync.FinderFavorites.Save('top');
        return true;
    },
    RenameTop: function (index, expectedPath) {
        const root = Sync.FinderFavorites.Favorites('top'), node = root.getElementsByTagName('Item')[index];
        if (!node || node.text != expectedPath) return;
        InputDialog('重命名顶部收藏', node.getAttribute('Name'), function (name) {
            if (name && String(name).trim() && node.parentNode == root) {
                node.setAttribute('Name', String(name).trim());
                Sync.FinderFavorites.Save('top');
            }
        });
    },
    AddCurrentTop: function () {
        const fv = te.Ctrl(CTRL_FV);
        if (!fv) return;
        const data = api.CreateObject('FolderItems');
        data.AddItem(fv.FolderItem);
        Sync.FinderFavoriteDrop.AddFolders(data, 'top');
    }
};
Sync.FinderFavorites.Init();
Common.FavBar = api.CreateObject('Object');
Common.FavBar.Items = api.CreateObject('Array');
Sync.FavBar = {
    FromPt: function (count, pt) {
        for (let i = Math.min(count, Common.FavBar.Items.length); --i >= 0;) {
            if (Common.FavBar.Items[i] && PtInRect(Common.FavBar.Items[i], pt)) return i;
        }
        return -1;
    }
};
