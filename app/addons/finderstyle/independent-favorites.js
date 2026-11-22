if (window.Addon == 1) {
    await $.importScript('addons\\finderstyle\\independent-favorites-sync.js');
    Addons.FavBar = {
        items: [], iconCache: {},
        Icon: async function (item) {
            const state = Addons.FavBar;
            if (!state.iconCacheLoaded) {
                state.iconCacheLoaded = true;
                try { state.iconCache = JSON.parse(await ReadTextFile('config\\finder-top-icon-cache.json') || '{}'); } catch (e) { state.iconCache = {}; }
            }
            const key = JSON.stringify([item.text, item.Icon || '']), cached = state.iconCache[key];
            if (cached && Date.now() - cached.time < 86400000) return cached.html;
            const path = await ExtractPath(te, item.text.split(/\r?\n/)[0]), pidl = await api.ILCreateFromPath(path);
            const html = await GetImgTag({ src: item.Icon || await GetIconImage(pidl, CLR_DEFAULT | COLOR_WINDOW) }, 34);
            state.iconCache[key] = { html: html, time: Date.now() }; state.iconCacheDirty = true;
            return html;
        },
        renderToken: 0,
        GetFovorites: async function () { return Addons.FavBar.items; },
        Click: function (index, newTab) {
            const item = Addons.FavBar.items[index];
            if (item) return $.Sync.FinderFavorites.Open('top', index, !!newTab);
        },
        Down: function (ev, index) {
            if ((ev.buttons != null ? ev.buttons : ev.button) == 4) Addons.FavBar.Click(index, true);
        },
        Popup: async function (ev, index) {
            ev.preventDefault();
            const item = Addons.FavBar.items[index];
            const menu = await api.CreatePopupMenu();
            let verb = 0;
            try {
                if (item) {
                    for (const entry of [[1, '打开'], [2, '在新标签页打开'], [3, '重命名收藏'], [4, '从顶部收藏移除']]) {
                        await api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, entry[0], entry[1]);
                    }
                    await api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
                }
                await api.InsertMenu(menu, MAXINT, MF_BYPOSITION | MF_STRING, 5, '将当前文件夹添加到顶部收藏');
                verb = await api.TrackPopupMenuEx(menu, TPM_LEFTALIGN | TPM_LEFTBUTTON | TPM_RIGHTBUTTON | TPM_RETURNCMD, ev.screenX * ui_.Zoom, ev.screenY * ui_.Zoom, ui_.hwnd, null);
            } finally { await api.DestroyMenu(menu); }
            if (verb == 1) Addons.FavBar.Click(index, false);
            if (verb == 2) Addons.FavBar.Click(index, true);
            if (verb == 3 && item) await $.Sync.FinderFavorites.RenameTop(index, item.text);
            if (verb == 4 && item) await $.Sync.FinderFavorites.RemoveTop(index, item.text);
            if (verb == 5) await $.Sync.FinderFavorites.AddCurrentTop();
        },
        Arrange: async function () {
            const token = ++Addons.FavBar.renderToken;
            const items = JSON.parse(await $.Sync.FinderFavorites.GetTopJson()), html = [];
            for (let i = 0; i < items.length; ++i) {
                const item = items[i];
                if (!/^Open(?: in new tab| in background)?$/i.test(item.Type)) continue;
                const img = await Addons.FavBar.Icon(item);
                html.push('<span id="_favbar' + i + '" class="button" title="' + EncodeSC(item.text) + '" onclick="Addons.FavBar.Click(' + i + ',event.ctrlKey||event.shiftKey)" onmousedown="Addons.FavBar.Down(event,' + i + ')" oncontextmenu="Addons.FavBar.Popup(event,' + i + ');return false;" onmouseover="MouseOver(this)" onmouseout="MouseOut()">' + img + EncodeSC(item.Name.replace(/\\t.*$/g, '').replace(/&(.)/g, '$1')) + '</span> ');
            }
            if (token != Addons.FavBar.renderToken) return;
            const root = document.getElementById('_favbar');
            if (!root) return;
            Addons.FavBar.items = items;
            root.innerHTML = html.join('');
            if (Addons.FavBar.iconCacheDirty) { Addons.FavBar.iconCacheDirty = false; MainWindow.WriteTextFile('config\\finder-top-icon-cache.json', JSON.stringify(Addons.FavBar.iconCache)); }
            root.oncontextmenu = function (ev) {
                if (ev.target == root) { Addons.FavBar.Popup(ev, -1); return false; }
            };
            if (Addons.FinderFavoriteDrop) Addons.FinderFavoriteDrop.EnsureZones();
            await Addons.FavBar.SetRects();
            Resize();
        },
        Changed: async function () {
            await Addons.FavBar.Arrange();
            if (Addons.FinderFavoriteDrop) await Addons.FinderFavoriteDrop.SetRects();
        },
        SetRects: async function () {
            const rects = await api.CreateObject('Array');
            for (let i = 0; i < Addons.FavBar.items.length; ++i) {
                const el = document.getElementById('_favbar' + i);
                if (el) rects[i] = await GetRect(el);
            }
            Common.FavBar.Items = rects;
            const root = document.getElementById('_favbar');
            if (root) Common.FavBar.Append = await GetRect(root);
        }
    };
    AddEvent('Layout', async function () {
        await SetAddon(null, 'ToolBar2Center', '<span id="_favbar"></span>');
    });
    AddEvent('Load', Addons.FavBar.Arrange);
    AddEvent('Load', function () {
        const sidebar = Addons.FavoritesBar;
        if (!sidebar) return;
        const originalOpen = sidebar.Open;
        sidebar.Open = function (ev, index, newTab) {
            const item = (ui_.MenuFavorites || [])[index];
            if (item && /^Open(?: in new tab| in background)?$/i.test(item.Type)) {
                return $.Sync.FinderFavorites.Open('side', index, !!(newTab || ev.ctrlKey || sidebar.NewTab));
            }
            return originalOpen.call(sidebar, ev, index, newTab);
        };
    });
}

