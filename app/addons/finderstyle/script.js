const Addon_Id = "finderstyle";
if (window.Addon == 1) {
    Addons.FinderStyle = {
        DockTabs: async function () {
            const controls = await te.Ctrls(CTRL_TC, true, window.chrome);
            const mount = document.getElementById("finder-tabs");
            if (!mount || await GetLength(controls) != 1) return;
            const tabs = document.getElementById("tabplus_" + await controls[0].Id);
            if (tabs && tabs.parentElement != mount) {
                mount.appendChild(tabs);
                Resize();
            }
        },
        View: async function (mode) {
            const fv = await te.Ctrl(CTRL_FV);
            if (fv) { await fv.SetViewMode(mode, mode == 4 ? 16 : 64); fv.Focus(); }
        },
        NewFolder: async function () { await Exec(await te.Ctrl(CTRL_FV), "NewFolder", "Background", ui_.hwnd); },
        locationTimer: 0,
        locationVersion: 0,
        locationSnapshot: null,
        ReceiveLocation: function (json) {
            Addons.FinderStyle.locationSnapshot = JSON.parse(json);
            Addons.FinderStyle.ScheduleLocation();
        },
        ScheduleLocation: function () {
            const state = Addons.FinderStyle;
            ++state.locationVersion;
            clearTimeout(state.locationTimer);
            state.locationTimer = setTimeout(state.MarkLocation, 40);
        },
        MarkLocation: function () {
            const location = Addons.FinderStyle.locationSnapshot;
            if (!location || !location.path) return;
            for (let i = 0; i < location.favorites.length; i++) {
                const node = document.getElementById("fav" + i);
                if (node) {
                    const current = location.path == location.favorites[i] ? "1" : "0";
                    if (node.getAttribute("data-current") != current) node.setAttribute("data-current", current);
                }
            }
        },
        Verify: async function () {
            const report = { version: 1, time: new Date().toISOString(), tabsAtTop: !!document.querySelector("#finder-tabs .tab0"), sidebar: !!document.getElementById("favoritesbar"), quickFolders: !!document.getElementById("_favbar"), stylesheet: !!document.getElementById("finder-css"), errors: [] };
            const fv = await te.Ctrl(CTRL_FV);
            try {
                if (fv) {
                    report.viewMode = await fv.CurrentViewMode;
                    report.iconSize = await fv.IconSize;
                    report.nativeList = !!await fv.hwndList;
                }
                report.font = [await $.DefaultFont.lfFaceName, await $.DefaultFont.lfHeight];
            } catch (e) { report.errors.push(String(e.message || e)); }
            await MainWindow.WriteTextFile("config\\finder-diagnostics.json", JSON.stringify(report, null, 2));
        }
    };
    AddEvent("Layout", async function () {
        const style = document.createElement("style");
        style.id = "finder-css";
        style.appendChild(document.createTextNode(await ReadTextFile(BuildPath(await te.Data.Installed, "addons\\finderstyle\\style.css"))));
        document.head.appendChild(style);
        await SetAddon(null, "ToolBar1Center", '<div id="finder-tabs"></div>');
        await SetAddon(null, "ToolBar2Left", '<span id="finder-actions"><span class="button finder-new" onclick="Addons.FinderStyle.NewFolder()" title="新建文件夹">新建文件夹</span><span class="button finder-view" onclick="Addons.FinderStyle.View(1)" title="图标视图">▦</span><span class="button finder-view" onclick="Addons.FinderStyle.View(4)" title="列表视图">☷</span></span>');
        await SetAddon(null, "LeftBar1", '<div id="finder-sidebar-title">个人收藏</div>');
    });
    AddEvent("PanelCreated", function () { setTimeout(Addons.FinderStyle.DockTabs, 250); });
    AddEvent("Load", function () {
        setTimeout(Addons.FinderStyle.DockTabs, 350);
        setTimeout(Addons.FinderStyle.ScheduleLocation, 650);
        setTimeout(Addons.FinderStyle.Verify, 2500);
    });
    $.importScript("addons\\finderstyle\\sync.js");
}

if (window.Addon == 1) await importScript("addons\\finderstyle\\independent-favorites.js");
if (window.Addon == 1) await importScript("addons\\finderstyle\\favorites-drop.js");

if (window.Addon == 1) {
    AddEvent("Load", function () {
        const bar = document.getElementById("ToolBar2Left");
        const actions = document.getElementById("finder-actions");
        if (bar && actions) { bar.insertBefore(actions, bar.firstChild); Resize(); }
    });
}
if (window.Addon == 1) await importScript("addons\\finderstyle\\favorites-order.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\thumbnail-repair-sync.js");
if (window.Addon == 1) await importScript("addons\\finderstyle\\frame.js");
if (window.Addon == 1) await importScript("addons\\finderstyle\\disk-status.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\selection-sync.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\selection-width-sync.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\header-inset-sync.js");
if (window.Addon == 1) await importScript("addons\\finderstyle\\sidebar-line-icons.js");
if (window.Addon == 1) await importScript("addons\\finderstyle\\window-chrome.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\header-sort-sync.js");

if (window.Addon == 1) await $.importScript("addons\\finderstyle\\header-separator-sync.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\header-height-sync.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\resident-sync.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\favorite-warm-sync.js");
if (window.Addon == 1) await $.importScript("addons\\finderstyle\\app-icon-sync.js");

if (window.Addon == 1) await importScript("addons\\finderstyle\\startup.js");

if (window.Addon == 1) await importScript("addons\\finderstyle\\brand.js");
