if (window.Addon == 1 && !Addons.FinderFrame) {
    await $.importScript('addons\\finderstyle\\frame-sync.js');
    Addons.FinderFrame = {
        widthLayoutPatched: true,
        Update: function () {
            const bottom = document.getElementById('bottombar');
            const background = document.getElementById('Background');
            if (!bottom || !background) return;
            const root = document.documentElement;
            const height = bottom.offsetHeight;
            const left = Math.round(background.getBoundingClientRect().left);
            const heightText = height + 'px', leftText = left + 'px';
            if (root.style.getPropertyValue('--finder-bottom-height') != heightText) root.style.setProperty('--finder-bottom-height', heightText);
            if (root.style.getPropertyValue('--finder-file-left') != leftText) root.style.setProperty('--finder-file-left', leftText);
        }
    };
    const resizeSideBar = ResizeSideBar;
    ResizeSideBar = async function (side, height) {
        if (side == 'Left') height += document.getElementById('bottombar').offsetHeight;
        await resizeSideBar(side, height);
        if (side == 'Left') document.documentElement.style.setProperty('--finder-sidebar-width', document.getElementById('leftbarT').style.width || '206px');
    };
    AddEvent('Resize', Addons.FinderFrame.Update);
    AddEvent('Load', function () { Addons.FinderFrame.Update(); Resize(); });
}
