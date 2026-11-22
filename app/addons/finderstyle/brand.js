if (window.Addon == 1 && !Addons.QianyeBrand) {
    await $.importScript('addons\\finderstyle\\brand-sync.js');
    TITLE = '\u5343\u9875';
    Addons.QianyeBrand = {
        Apply: async function () {
            const fv = await te.Ctrl(CTRL_FV), title = fv && await fv.Title;
            document.title = title ? title + ' - \u5343\u9875' : '\u5343\u9875\u6587\u4ef6\u7ba1\u7406\u5668';
        }
    };
    AddEvent('Load', Addons.QianyeBrand.Apply);
    AddEvent('ChangeView1', Addons.QianyeBrand.Apply);
}
