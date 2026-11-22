Sync.FinderFavoriteOrder = {
    marker: "",
    Hit: function (pt) {
        const c = Common.FinderFavoriteDrop, p = pt.Clone();
        api.ScreenToClient(WebBrowser.hwnd, p);
        const bar = c.side && PtInRect(c.side, p) ? "side" : (c.top && PtInRect(c.top, p) ? "top" : "");
        if (!bar) return null;
        const rects = bar == "side" ? Common.FavoritesBar.rcItem : Common.FavBar.Items;
        let first = null, last = null;
        for (let i = 0; i < rects.length; ++i) {
            const r = rects[i];
            if (!r || r.right <= r.left || r.bottom <= r.top) continue;
            const bounds = c[bar];
            if (r.right <= bounds.left || r.left >= bounds.right || r.bottom <= bounds.top || r.top >= bounds.bottom) continue;
            if (!first) first = { bar: bar, index: i, after: false };
            last = { bar: bar, index: i, after: true };
            if (PtInRect(r, p)) return { bar: bar, index: i, after: bar == "side" ? p.y >= (r.top + r.bottom) / 2 : p.x >= (r.left + r.right) / 2 };
            if (bar == "side" ? p.y < r.top : p.x < r.left) return { bar: bar, index: i, after: false };
        }
        return last || first;
    },
    Move: function (source, target, after, bar) {
        bar = bar == 'top' ? 'top' : 'side';
        const favorites = Sync.FinderFavorites.Favorites(bar);
        const items = favorites.getElementsByTagName("Item");
        if (source < 0 || source >= items.length || target < 0 || target >= items.length || source == target) return false;
        const node = items[source], anchor = items[target];
        if (!/^Open(?: in new tab| in background)?$/i.test(node.getAttribute("Type"))) return false;
        if ((!after && node.nextSibling == anchor) || (after && anchor.nextSibling == node)) return false;
        const reference = after ? anchor.nextSibling : anchor;
        if (reference) favorites.insertBefore(node, reference);
        else favorites.appendChild(node);
        Sync.FinderFavorites.Save(bar);
        return true;
    },
    Clear: function () {
        Common.FinderFavoriteOrder.active = false;
        Sync.FinderFavoriteOrder.marker = "";
        InvokeUI("Addons.FinderFavoriteOrder.Marker", ["", -1, false]);
    },
    DragOver: function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
        if (!Common.FinderFavoriteOrder.active) return;
        let hit = Ctrl.Type == CTRL_WB && (grfKeyState & MK_CONTROL) ? Sync.FinderFavoriteOrder.Hit(pt) : null;
        if (hit && hit.bar != Common.FinderFavoriteOrder.bar) hit = null;
        pdwEffect[0] = hit ? DROPEFFECT_MOVE : DROPEFFECT_NONE;
        const key = hit ? hit.bar + ":" + hit.index + ":" + hit.after : "";
        if (key != Sync.FinderFavoriteOrder.marker) {
            Sync.FinderFavoriteOrder.marker = key;
            InvokeUI("Addons.FinderFavoriteOrder.Marker", hit ? [hit.bar, hit.index, hit.after] : ["", -1, false]);
        }
        // Always consume an internal favorite drag, including canceled/outside drops.
        return S_OK;
    },
    Drop: function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
        if (!Common.FinderFavoriteOrder.active) return;
        const state = Common.FinderFavoriteOrder;
        const source = Number(state.index);
        const items = Sync.FinderFavorites.Favorites(state.bar).getElementsByTagName("Item");
        const valid = items[source] && items[source].text == state.path && items[source].getAttribute("Name") == state.name;
        let hit = valid && Ctrl.Type == CTRL_WB && (grfKeyState & MK_CONTROL) ? Sync.FinderFavoriteOrder.Hit(pt) : null;
        if (hit && hit.bar != state.bar) hit = null;
        if (hit) Sync.FinderFavoriteOrder.Move(source, hit.index, hit.after, state.bar);
        pdwEffect[0] = hit ? DROPEFFECT_MOVE : DROPEFFECT_NONE;
        Sync.FinderFavoriteOrder.Clear();
        return S_OK;
    },
    DragLeave: function () {
        if (Common.FinderFavoriteOrder.active) InvokeUI("Addons.FinderFavoriteOrder.Marker", ["", -1, false]);
    }
};
AddEvent("DragOver", Sync.FinderFavoriteOrder.DragOver, true);
AddEvent("Drop", Sync.FinderFavoriteOrder.Drop, true);
AddEvent("DragLeave", Sync.FinderFavoriteOrder.DragLeave, true);
