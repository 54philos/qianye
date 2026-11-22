if (!Sync.FinderFavoriteWarm) {
    Sync.FinderFavoriteWarm = {
        received: 0,
        Receive: function (path, folder) { if (folder) { Sync.FinderFavorites.FolderCache[path] = folder; ++Sync.FinderFavoriteWarm.received; } },
        Start: function () {
            if (!Sync.FinderFavorites) return;
            const paths = [], seen = {};
            for (const bar of ['side', 'top']) {
                const items = Sync.FinderFavorites.Favorites(bar).getElementsByTagName('Item');
                for (let i = 0; i < items.length; ++i) {
                    const path = String(items[i].text);
                    if (/^[a-z]:\\[^\r\n]*$/i.test(path) && !Sync.FinderFavorites.FolderCache[path] && !seen[path.toLowerCase()]) { seen[path.toLowerCase()] = true; paths.push(path); }
                }
            }
            if (!paths.length) return;
            const args = api.CreateObject('Object'); args.Data = api.CreateObject('Object');
            args.Data.api = api; args.Data.paths = JSON.stringify(paths); args.Data.Report = Sync.FinderFavoriteWarm.Receive;
            api.ExecScript(ReadTextFile('addons\\finderstyle\\favorite-warm-worker.js'), 'JScript', args, true);
        }
    };
    AddEvent('Load', Sync.FinderFavoriteWarm.Start);
    AddEvent('FavoriteChanged', Sync.FinderFavoriteWarm.Start);
}

