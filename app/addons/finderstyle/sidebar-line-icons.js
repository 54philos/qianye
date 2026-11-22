if (window.Addon == 1 && !Addons.FinderSidebarIcons) {
    Addons.FinderSidebarIcons = {
        paths: {
            folder: '<path d="M3 6.5h6l2 2h10v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M3 8.5v-3A1.5 1.5 0 0 1 4.5 4h4.8l2 2H19a2 2 0 0 1 2 2v.5"/>',
            computer: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M9 21h6m-3-4v4"/>',
            desktop: '<rect x="2.5" y="4.5" width="19" height="13" rx="1.5"/><path d="M8 21h8m-6-3.5-.5 3.5m4.5-3.5.5 3.5"/>',
            downloads: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v10m-4-4 4 4 4-4"/>',
            documents: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/>',
            recent: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5V12H8.5"/>',
            applications: '<path d="m10 3 10 17M14 3 4 20M3 15h18"/>',
            cloud: '<path d="M7 18H6a4 4 0 0 1-.6-8 6 6 0 0 1 11.4-2A5 5 0 0 1 18 18z"/>',
            drive: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18m-4 2.5h1"/>'
        },
        sources: {},
        Kind: function (item) {
            const path = String(item.text || '').split(/\r?\n/)[0], name = String(item.Name || '').replace(/&/g, '');
            if (/20D04FE0-3AEA-1069-A2D8-08002B30309D/i.test(path) || /^(?:This PC|\u6b64\u7535\u8111)$/i.test(name)) return 'computer';
            if (/(?:^|[\\/])Desktop[\\/]?$/i.test(path) || /^(?:Desktop|\u684c\u9762)$/i.test(name)) return 'desktop';
            if (/(?:^|[\\/])Downloads[\\/]?$/i.test(path) || /^(?:Downloads|\u4e0b\u8f7d)$/i.test(name)) return 'downloads';
            if (/(?:^|[\\/])Documents[\\/]?$/i.test(path) || /^(?:Documents|\u6587\u7a3f)$/i.test(name)) return 'documents';
            if (/^(?:Recents?|\u6700\u8fd1\u4f7f\u7528)$/i.test(name)) return 'recent';
            if (/^(?:Applications|\u5e94\u7528\u7a0b\u5e8f)$/i.test(name)) return 'applications';
            if (/^(?:[A-Z]:[\\/]?)$/i.test(path)) return 'drive';
            if (/(?:OneDrive|iCloud|\u575a\u679c\u4e91|\u7f51\u76d8)/i.test(name)) return 'cloud';
            return 'folder';
        },
        Source: function (kind) {
            const state = Addons.FinderSidebarIcons;
            return state.sources[kind] || (state.sources[kind] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + state.paths[kind] + '</svg>'));
        },
        Decorate: function () {
            const state = Addons.FinderSidebarIcons, items = ui_.MenuFavorites || [];
            for (const row of document.querySelectorAll('#favoritesbar div[id^="fav"]')) {
                const match = /^fav(\d+)$/.exec(row.id);
                if (!match) continue;
                const img = row.querySelector('img.favicon'), item = items[Number(match[1])];
                if (!img || !item) continue;
                const kind = state.Kind(item), source = state.Source(kind);
                if (!img.hasAttribute('data-finder-original-src')) img.setAttribute('data-finder-original-src', img.getAttribute('src') || '');
                if (img.getAttribute('src') != source) img.setAttribute('src', source);
                img.setAttribute('data-finder-line-icon', kind);
                img.draggable = false;
            }
        },
        Start: function () {
            const state = Addons.FinderSidebarIcons, root = document.getElementById('favoritesbar');
            if (!root) return;
            if (state.observer) state.observer.disconnect();
            state.observer = new MutationObserver(state.Decorate);
            state.observer.observe(root, { childList: true, subtree: true });
            state.Decorate();
        }
    };
    AddEvent('Load', Addons.FinderSidebarIcons.Start);
}
