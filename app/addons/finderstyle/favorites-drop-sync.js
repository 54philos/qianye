// Dropping into either favorite bar adds shortcuts; Ctrl dragging reorders them.
Sync.FinderFavoriteDrop = {
    activeTarget: "",
    Normalize: function (path) { return String(path).replace(/[\\\/]+$/, "").toLowerCase(); },
    GetFolder: function (item) {
        if (!item) return null;
        const link = item.ExtendedProperty("linktarget");
        const folder = link ? api.ILCreateFromPath(link) : item;
        return folder.IsFolder && api.PathIsDirectory(folder.Path) ? folder : null;
    },
    Target: function (pt) {
        if (Common.FavoritesBar && Common.FavoritesBar.drag5) return "";
        const c = Common.FinderFavoriteDrop;
        const p = pt.Clone();
        api.ScreenToClient(WebBrowser.hwnd, p);
        if (c.side && PtInRect(c.side, p)) return "side";
        if (c.top && PtInRect(c.top, p)) return "top";
        return "";
    },
    HasFolder: function (dataObj) {
        for (let i = 0; i < dataObj.Count; ++i) if (Sync.FinderFavoriteDrop.GetFolder(dataObj.Item(i))) return true;
        return false;
    },
    AddFolders: function (dataObj, bar) {
        bar = bar == 'top' ? 'top' : 'side';
        const xml = Sync.FinderFavorites.Document(bar);
        const favorites = Sync.FinderFavorites.Favorites(bar);
        if (!favorites) return { added: 0, eligible: 0 };
        const seen = {};
        const items = favorites.getElementsByTagName("Item");
        for (let i = 0; i < items.length; ++i) {
            if (/^Open(?: in new tab| in background)?$/i.test(items[i].getAttribute("Type"))) {
                seen[Sync.FinderFavoriteDrop.Normalize(ExtractPath(te, items[i].text.split(/\r?\n/)[0]))] = true;
            }
        }
        let added = 0, eligible = 0;
        for (let i = 0; i < dataObj.Count; ++i) {
            const folder = Sync.FinderFavoriteDrop.GetFolder(dataObj.Item(i));
            if (!folder) continue;
            ++eligible;
            const path = api.GetDisplayNameOf(folder, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
            const key = Sync.FinderFavoriteDrop.Normalize(path);
            if (seen[key]) continue;
            seen[key] = true;
            const node = xml.createElement("Item");
            node.setAttribute("Name", api.GetDisplayNameOf(folder, SHGDN_INFOLDER));
            node.setAttribute("Type", "Open");
            node.text = path;
            favorites.appendChild(node);
            ++added;
        }
        if (added) {
            Sync.FinderFavorites.Save(bar);
        }
        return { added: added, eligible: eligible };
    },
    DragEnter: function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
        if (Ctrl.Type == CTRL_WB) InvokeUI("Addons.FinderFavoriteDrop.SetRects");
    },
    DragOver: function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
        const target = Ctrl.Type == CTRL_WB ? Sync.FinderFavoriteDrop.Target(pt) : "";
        if (target != Sync.FinderFavoriteDrop.activeTarget) {
            Sync.FinderFavoriteDrop.activeTarget = target;
            InvokeUI("Addons.FinderFavoriteDrop.Highlight", [target]);
        }
        if (target) {
            pdwEffect[0] = Sync.FinderFavoriteDrop.HasFolder(dataObj) ? DROPEFFECT_LINK : DROPEFFECT_NONE;
            return S_OK;
        }
    },
    Drop: function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
        const target = Ctrl.Type == CTRL_WB ? Sync.FinderFavoriteDrop.Target(pt) : "";
        if (!target) return;
        const result = Sync.FinderFavoriteDrop.AddFolders(dataObj, target);
        pdwEffect[0] = result.eligible ? DROPEFFECT_LINK : DROPEFFECT_NONE;
        Sync.FinderFavoriteDrop.activeTarget = "";
        InvokeUI("Addons.FinderFavoriteDrop.Highlight", [""]);
        InvokeUI("Addons.FinderFavoriteDrop.Feedback", [result.added, result.eligible, target]);
        return S_OK;
    },
    DragLeave: function () {
        Sync.FinderFavoriteDrop.activeTarget = "";
        InvokeUI("Addons.FinderFavoriteDrop.Highlight", [""]);
    }
};
AddEvent("DragEnter", Sync.FinderFavoriteDrop.DragEnter, true);
AddEvent("DragOver", Sync.FinderFavoriteDrop.DragOver, true);
AddEvent("Drop", Sync.FinderFavoriteDrop.Drop, true);
AddEvent("DragLeave", Sync.FinderFavoriteDrop.DragLeave, true);
