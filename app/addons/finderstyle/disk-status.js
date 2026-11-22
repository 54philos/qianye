if (window.Addon == 1 && !Addons.FinderDiskStatus) {
    Addons.FinderDiskStatus = {
        data: null,
        Size: function (bytes) {
            const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
            let value = Number(bytes), unit = 0;
            while (value >= 1024 && unit < units.length - 1) { value /= 1024; ++unit; }
            return (unit > 0 ? value.toFixed(1).replace(/\.0$/, '') : Math.round(value)) + ' ' + units[unit];
        },
        Receive: function (json) {
            const state = Addons.FinderDiskStatus, data = JSON.parse(json);
            state.data = data;
            const bottom = document.getElementById('BottomBar3Left');
            if (!bottom) return;
            let node = document.getElementById('finder-disk-space');
            if (!node) { node = document.createElement('span'); node.id = 'finder-disk-space'; bottom.appendChild(node); }
            if (!data.root || data.error || data.free == null) { node.textContent = ''; node.title = ''; return; }
            const label = data.label || '\u672c\u5730\u78c1\u76d8';
            node.textContent = label + ' (' + data.root + ')\uff0c' + state.Size(data.free) + ' \u53ef\u7528';
            node.title = data.root + '\\  ' + state.Size(data.free) + ' \u53ef\u7528 / ' + state.Size(data.total) + ' \u603b\u5bb9\u91cf';
        }
    };
    await $.importScript('addons\\finderstyle\\disk-status-sync.js');
    AddEvent('Load', function () {
        if (Addons.FinderDiskStatus.data) Addons.FinderDiskStatus.Receive(JSON.stringify(Addons.FinderDiskStatus.data));
        $.Sync.FinderDiskStatus.Schedule();
    });
}
