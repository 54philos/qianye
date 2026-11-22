if (window.Addon == 1 && !Addons.FinderWindowChrome) {
    await $.importScript('addons\\finderstyle\\window-chrome-sync.js');
    Addons.FinderWindowChrome = {
        Command: function (verb) { $.Sync.FinderWindowChrome.Command(verb); },
        UpdateZoom: async function () {
            const button = document.querySelector('#finder-window-controls .finder-window-zoom');
            if (!button) return;
            const maximized = await api.IsZoomed(ui_.hwnd), label = maximized ? '\u8fd8\u539f' : '\u6700\u5927\u5316';
            button.title = label;
            button.setAttribute('aria-label', label);
            button.setAttribute('data-maximized', maximized ? '1' : '0');
            button.querySelector('svg').innerHTML = maximized ? '<path d="M4.5 4.5v-2h7v7h-2"/><rect x="2.5" y="4.5" width="7" height="7"/>' : '<rect x="2.5" y="2.5" width="9" height="9"/>';
        },
        Drag: function (ev) {
            if (ev.button != 0 || ev.target.closest('li,button,a,input,select,textarea')) return;
            ev.preventDefault();
            if (ev.detail == 2) Addons.FinderWindowChrome.Command('zoom');
            else $.Sync.FinderWindowChrome.Drag();
        },
        Start: async function () {
            const state = Addons.FinderWindowChrome, left = document.getElementById('ToolBar1Left'), center = document.getElementById('ToolBar1Center'), right = document.getElementById('ToolBar1Right');
            if (!left || !center || !right) return;
            right.style.display = 'table-cell';
            const previous = document.getElementById('finder-window-controls');
            if (previous) previous.remove();
            if (!left.children.length) left.style.display = 'none';
            right.insertAdjacentHTML('beforeend', '<div id="finder-window-controls">' +
                '<button type="button" class="finder-window-minimize" aria-label="\u6700\u5c0f\u5316" title="\u6700\u5c0f\u5316" onclick="Addons.FinderWindowChrome.Command(\'minimize\')"><span><svg viewBox="0 0 14 14"><path d="M2.5 7.5h9"/></svg></span></button>' +
                '<button type="button" class="finder-window-zoom" aria-label="\u6700\u5927\u5316" title="\u6700\u5927\u5316" onclick="Addons.FinderWindowChrome.Command(\'zoom\')"><span><svg viewBox="0 0 14 14"><rect x="2.5" y="2.5" width="9" height="9"/></svg></span></button>' +
                '<button type="button" class="finder-window-close" aria-label="\u5173\u95ed\u7a97\u53e3" title="\u5173\u95ed\u7a97\u53e3\uff08\u540e\u53f0\u4fdd\u6d3b\uff1bShift+\u5173\u95ed\u5f7b\u5e95\u9000\u51fa\uff09" onclick="Addons.FinderWindowChrome.Command(\'close\')"><span><svg viewBox="0 0 14 14"><path d="m3 3 8 8m0-8-8 8"/></svg></span></button></div>');
            right.removeAttribute('title');
            if (!state.bound) {
                center.addEventListener('mousedown', state.Drag);
                right.addEventListener('mousedown', state.Drag);
                state.bound = true;
            }
            if (!state.zoomBound) {
                AddEvent('Resize', state.UpdateZoom);
                state.zoomBound = true;
            }
            await state.UpdateZoom();
            await Resize();
            await $.Sync.FinderWindowChrome.Apply();
            setTimeout(Resize, 80);
        }
    };
    AddEvent('Load', Addons.FinderWindowChrome.Start);
}

