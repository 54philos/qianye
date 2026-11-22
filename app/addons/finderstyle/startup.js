if (window.Addon == 1 && !Addons.FinderStartup) {
    await $.importScript('addons\\finderstyle\\startup-sync.js');
    Addons.FinderStartup = {
        Open: async function (event) {
            if (event) event.stopPropagation();
            return $.Sync.FinderStartup.Menu();
        },
        Update: async function () {
            const button = document.getElementById('finder-startup-settings');
            if (!button) return;
            const path = await $.Sync.FinderStartup.GetPath();
            button.title = '\u9ed8\u8ba4\u6253\u5f00\u4f4d\u7f6e\uff1a' + (/^::\{20D04FE0/i.test(path) ? '\u6b64\u7535\u8111' : path);
        },
        Saved: async function (path) {
            await Addons.FinderStartup.Update();
            let toast = document.getElementById('finder-startup-toast');
            if (!toast) { toast = document.createElement('div'); toast.id = 'finder-startup-toast'; toast.setAttribute('role','status'); document.body.appendChild(toast); }
            toast.textContent = '\u9ed8\u8ba4\u6253\u5f00\u4f4d\u7f6e\u5df2\u4fdd\u5b58\uff1a' + (/^::\{20D04FE0/i.test(path) ? '\u6b64\u7535\u8111' : path);
            toast.hidden = false;
            clearTimeout(Addons.FinderStartup.timer);
            Addons.FinderStartup.timer = setTimeout(function () { toast.hidden = true; }, 3500);
        },
        Start: async function () {
            const controls = document.getElementById('finder-window-controls'), right = document.getElementById('ToolBar1Right');
            if (!controls || !right) return;
            if (!document.getElementById('finder-startup-style')) {
                const style = document.createElement('style'); style.id = 'finder-startup-style';
                style.textContent = '#finder-window-controls .finder-startup-settings{flex:0 0 36px;width:36px}#finder-window-controls .finder-startup-settings svg{stroke:#62676c;stroke-width:1.2}#finder-startup-toast{position:fixed;top:48px;right:16px;z-index:99999;max-width:70vw;padding:10px 14px;border:1px solid #d9dcdf;border-radius:5px;background:#fff;color:#303437;box-shadow:0 2px 8px #0002;overflow-wrap:anywhere;font-size:12px}#finder-startup-toast[hidden]{display:none}';
                document.head.appendChild(style);
            }
            right.style.width = '171px'; right.style.minWidth = '171px';
            if (!document.getElementById('finder-startup-settings')) controls.insertAdjacentHTML('afterbegin','<button id="finder-startup-settings" type="button" class="finder-startup-settings" aria-label="\u9ed8\u8ba4\u6253\u5f00\u4f4d\u7f6e\u8bbe\u7f6e" onclick="Addons.FinderStartup.Open(event)"><span><svg viewBox="0 0 14 14"><path d="m5.5 1.5-.4 1.4-1.3.7-1.4-.4L1 5.7l1.1 1v1.5L1 9.3l1.4 2.5 1.4-.4 1.3.7.4 1.4h3l.4-1.4 1.3-.7 1.4.4L13 9.3l-1.1-1.1V6.7l1.1-1-1.4-2.5-1.4.4-1.3-.7-.4-1.4z" transform="translate(.5 -.5) scale(.93)"/><circle cx="7" cy="7" r="2"/></svg></span></button>');
            await Addons.FinderStartup.Update();
            await Resize();
        }
    };
    AddEvent('Load', Addons.FinderStartup.Start);
}
