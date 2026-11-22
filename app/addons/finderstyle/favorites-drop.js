if (window.Addon == 1) {
    Common.FinderFavoriteDrop = await api.CreateObject("Object");
    Addons.FinderFavoriteDrop = {
        EnsureZones: function () {
            for (const id of ['finder-drop-side', 'finder-drop-top']) {
                const node = document.getElementById(id);
                if (node) node.remove();
            }
        },
        SetRects: async function () {
            Addons.FinderFavoriteDrop.EnsureZones();
            if (Addons.FavoritesBar) await Addons.FavoritesBar.SetRects();
            if (Addons.FavBar) await Addons.FavBar.SetRects();
            const ids = { side: "favoritesbar", top: "ToolBar2Center" };
            for (const key in ids) {
                const el = document.getElementById(ids[key]);
                if (el) Common.FinderFavoriteDrop[key] = await GetRect(el);
            }
        },
        Highlight: function () {},
        Feedback: function () {},
        Start: async function () {
            await Addons.FinderFavoriteDrop.SetRects();
            Resize();
        }
    };
    await $.importScript("addons\\finderstyle\\favorites-drop-sync.js");
    AddEvent("Load", function () { setTimeout(Addons.FinderFavoriteDrop.Start, 500); });
    AddEvent("Resize", function () { Addons.FinderFavoriteDrop.SetRects(); });
    AddEvent("FavoriteChanged", function () { setTimeout(Addons.FinderFavoriteDrop.SetRects, 200); });
}
