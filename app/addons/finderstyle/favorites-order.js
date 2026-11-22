if (window.Addon == 1) {
    Common.FinderFavoriteOrder = await api.CreateObject("Object");
    Common.FinderFavoriteOrder.active = false;
    Addons.FinderFavoriteOrder = {
        drag: null,
        suppressClickUntil: 0,
        observers: [],
        Item: function (node, root) {
            while (node && node != root) {
                const match = /^(?:fav|_favbar)(\d+)$/.exec(node.id || "");
                if (match) return { node: node, index: Number(match[1]), bar: root.id == '_favbar' ? 'top' : 'side' };
                node = node.parentElement;
            }
        },
        Decorate: function () {
            const items = document.querySelectorAll('#favoritesbar [id^="fav"], #_favbar [id^="_favbar"]');
            for (const item of items) {
                if (/^(?:fav|_favbar)\d+$/.test(item.id)) {
                    item.draggable = true;
                    for (const img of item.querySelectorAll("img")) img.draggable = false;
                    if (!item.hasAttribute("data-finder-order-hint")) {
                        item.title += "\nCtrl+拖动排序";
                        item.setAttribute("data-finder-order-hint", "1");
                    }
                }
            }
        },
        Begin: function (ev, item) {
            ev.stopImmediatePropagation();
            if (!ev.ctrlKey) { ev.preventDefault(); return; }
            const favorite = (item.bar == 'top' ? Addons.FavBar.items : (ui_.MenuFavorites || []))[item.index];
            if (!favorite || !/^Open(?: in new tab| in background)?$/i.test(favorite.Type)) { ev.preventDefault(); return; }
            const state = Common.FinderFavoriteOrder;
            state.bar = item.bar;
            state.index = item.index;
            state.path = favorite.text;
            state.name = favorite.Name;
            state.active = true;
            // Prevent the official sidebar's unrestricted reorder handler from taking over.
            Common.FavoritesBar.drag5 = false;
            ev.dataTransfer.effectAllowed = "move";
            ev.dataTransfer.setData("text/plain", favorite.text);
            Addons.FinderFavoriteOrder.drag = item.node;
            item.node.classList.add("finder-order-source");
            Addons.FinderFavoriteDrop.SetRects();
        },
        End: function () {
            Common.FinderFavoriteOrder.active = false;
            if (Addons.FinderFavoriteOrder.drag) {
                Addons.FinderFavoriteOrder.drag.classList.remove("finder-order-source");
                Addons.FinderFavoriteOrder.drag = null;
                Addons.FinderFavoriteOrder.suppressClickUntil = Date.now() + 350;
            }
            Addons.FinderFavoriteOrder.Marker("", -1, false);
        },
        Marker: function (bar, index, after) {
            let marker = document.getElementById("finder-order-marker");
            if (!marker) {
                marker = document.createElement("div");
                marker.id = "finder-order-marker";
                document.body.appendChild(marker);
            }
            const node = document.getElementById((bar == "side" ? "fav" : "_favbar") + index);
            if (!bar || !node) { marker.style.display = "none"; return; }
            const rect = node.getBoundingClientRect();
            marker.style.display = "block";
            marker.style.left = (bar == "side" ? rect.left + 3 : (after ? rect.right : rect.left)) + "px";
            marker.style.top = (bar == "side" ? (after ? rect.bottom : rect.top) : rect.top + 3) + "px";
            marker.style.width = (bar == "side" ? Math.max(0, rect.width - 6) : 2) + "px";
            marker.style.height = (bar == "side" ? 2 : Math.max(0, rect.height - 6)) + "px";
        },
        Start: function () {
            const keyState = function (ev) { document.body.classList.toggle("finder-order-ready", ev.ctrlKey); };
            document.addEventListener("keydown", keyState);
            document.addEventListener("keyup", keyState);
            window.addEventListener("blur", function () { document.body.classList.remove("finder-order-ready"); });
            for (const id of ["favoritesbar", "_favbar"]) {
                const root = document.getElementById(id);
                if (!root) continue;
                root.addEventListener("dragstart", function (ev) {
                    const item = Addons.FinderFavoriteOrder.Item(ev.target, root);
                    if (item) Addons.FinderFavoriteOrder.Begin(ev, item);
                }, true);
                root.addEventListener("dragend", function () { Addons.FinderFavoriteOrder.End(); }, true);
                root.addEventListener("click", function (ev) {
                    if (Date.now() < Addons.FinderFavoriteOrder.suppressClickUntil) { ev.preventDefault(); ev.stopImmediatePropagation(); }
                }, true);
                const observer = new MutationObserver(Addons.FinderFavoriteOrder.Decorate);
                observer.observe(root, { childList: true, subtree: true });
                Addons.FinderFavoriteOrder.observers.push(observer);
            }
            Addons.FinderFavoriteOrder.Decorate();
        }
    };
    await $.importScript("addons\\finderstyle\\favorites-order-sync.js");
    AddEvent("Load", function () { setTimeout(Addons.FinderFavoriteOrder.Start, 650); });
}
