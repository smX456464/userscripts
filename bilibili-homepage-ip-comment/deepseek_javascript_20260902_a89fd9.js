// ==UserScript==
// @name         哔哩哔哩主页 IP 属地 + 评论区一键查主页IP（改进版）
// @namespace    https://maxchang.me
// @version      1.0.0
// @description  在哔哩哔哩个人主页显示 IP 属地，并在评论区每行添加“获取”按钮，点击即可查看该用户个人主页的 IP 属地（支持主评论和楼中楼）。基于 maxchang3 的 0.0.5 版扩展。
// @author       smX456464 (github.com/smX456464)
// @original-author maxchang3
// @original-license MIT
// @match        https://space.bilibili.com/*
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM.registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @require      https://update.greasyfork.org/scripts/400945/1055319/libBilibiliToken.js
// @require      https://fastly.jsdelivr.net/npm/gm-extra@0.0.1
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ---------- Token 管理 ----------
    const tokenClient = new BilibiliToken();
    const qs = d => Object.entries(d).map(([k,v])=>`${k}=${v}`).join('&');
    const getAccessKey = () => GM_getValue('aceess_key');
    const hasToken = !!getAccessKey();

    const getLocation = async (vmid) => {
        if (!hasToken) return null;
        const params = BilibiliToken.signQuery(qs({
            access_key: getAccessKey(),
            appkey: BilibiliToken.appKey,
            build: tokenClient.build,
            mobi_app: tokenClient.mobiApp,
            vmid
        }));
        try {
            const data = await BilibiliToken.XHR({
                GM: true,
                anonymous: true,
                method: 'GET',
                url: `https://app.bilibili.com/x/v2/space?${params}`,
                responseType: 'json',
                headers: tokenClient.headers,
            });
            if (data?.body?.code === 0) {
                const tag = data.body.data.card.space_tag.find(t => t.type === 'location');
                return tag ? tag.title : null;
            }
            return null;
        } catch (_) { return null; }
    };

    // ---------- 主页 IP 注入 ----------
    const injectLocation = (loc, container, selector, style = {}) => {
        const target = container.querySelector(selector);
        if (!target) return;
        const el = document.createElement('div');
        Object.assign(el.style, {
            color: '#fff', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '4px', padding: '.4em', marginLeft: '.4em',
            verticalAlign: 'middle', display: 'inline-block', ...style
        });
        el.className = 'location';
        el.innerText = loc;
        target.appendChild(el);
    };

    const main = async () => {
        const isNew = (await GmExtra.querySelector(document.body, '#biliMainHeader'))?.tagName === 'HEADER';
        const app = await GmExtra.querySelector(document.body, '#app');
        if (!app) return;
        const mainSel = isNew ? '.upinfo__main' : '.h-inner';
        const infoSel = isNew ? '.upinfo-detail__top' : '.h-basic div';
        const container = await GmExtra.querySelector(app, mainSel);
        if (!container) return;
        const vmid = window.location.pathname.match(/\/(\d+)/)?.[1];
        if (!vmid) return;
        const loc = await getLocation(vmid);
        if (loc) injectLocation(loc, container, infoSel, isNew ? {} : { padding: '0 5px', marginLeft: '5px' });
    };

    // ---------- 评论区 ----------
    function getAllElements(root) {
        let els = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let n;
        while (n = walker.nextNode()) {
            els.push(n);
            if (n.shadowRoot) els = els.concat(getAllElements(n.shadowRoot));
        }
        return els;
    }

    async function fetchAndDisplay(vmid, btn) {
        if (btn.dataset.loading) return;
        btn.dataset.loading = 'true';
        btn.textContent = '加载中...';
        btn.style.color = '#999';
        btn.style.cursor = 'default';
        const loc = await getLocation(vmid);
        if (loc) {
            btn.textContent = loc;
            btn.style.color = '#666';
            btn.style.cursor = 'pointer';
            btn.title = '点击刷新';
            delete btn.dataset.loading;
            delete btn.dataset.failed;
        } else {
            btn.textContent = '失败';
            btn.style.color = '#e74c3c';
            btn.style.cursor = 'pointer';
            btn.title = '点击重试';
            delete btn.dataset.loading;
            btn.dataset.failed = 'true';
        }
    }

    function addButton(comment) {
        if (comment.dataset.ipBtnAdded) return;
        comment.dataset.ipBtnAdded = 'true';
        const sr = comment.shadowRoot;
        if (!sr) return;
        let cSR = sr;
        const renderer = sr.querySelector('bili-comment-renderer');
        if (renderer?.shadowRoot) cSR = renderer.shadowRoot;

        let vmid = null;
        const avatar = cSR.querySelector('#user-avatar');
        if (avatar) {
            const m = avatar.getAttribute('href')?.match(/\/\/space\.bilibili\.com\/(\d+)/);
            if (m) vmid = m[1];
        }
        if (!vmid) {
            const info = cSR.querySelector('bili-comment-user-info');
            if (info?.shadowRoot) {
                const name = info.shadowRoot.querySelector('#user-name');
                if (name) vmid = name.getAttribute('data-user-profile-id');
            }
        }
        if (!vmid) return;

        const footer = cSR.querySelector('#footer');
        if (!footer) return;
        const actions = footer.querySelector('bili-comment-action-buttons-renderer');
        if (!actions) return;
        const aSR = actions.shadowRoot;
        if (!aSR) return;
        const ip = aSR.querySelector('#ip');
        if (!ip) return;
        const row = ip.parentNode;
        if (!row) return;

        const btn = document.createElement('span');
        btn.textContent = '获取';
        Object.assign(btn.style, {
            display: 'inline-block', marginLeft: '6px', cursor: 'pointer',
            fontSize: '12px', color: '#666', background: 'transparent !important',
            border: 'none !important', padding: '0 4px', userSelect: 'none',
            lineHeight: '1.8', transition: 'color 0.2s'
        });
        btn.title = '点击获取该用户主页IP';
        btn.addEventListener('mouseenter', () => { if (!btn.dataset.loading) btn.style.color = '#FB7299'; });
        btn.addEventListener('mouseleave', () => { if (!btn.dataset.loading && !btn.dataset.failed) btn.style.color = '#666'; });
        btn.addEventListener('click', e => { e.stopPropagation(); fetchAndDisplay(vmid, btn); });
        row.insertBefore(btn, ip.nextSibling);
    }

    function scanAll() {
        const els = getAllElements(document);
        const roots = els.filter(el => el.tagName === 'BILI-COMMENT-THREAD-RENDERER' || el.tagName === 'BILI-COMMENT-REPLY-RENDERER');
        roots.forEach(addButton);
    }

    // ---------- 监听 ----------
    let timer;
    const debounce = () => { clearTimeout(timer); timer = setTimeout(scanAll, 300); };
    const obs = new MutationObserver(debounce);
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(scanAll, 1500);
    window.addEventListener('scroll', debounce);

    // ---------- 菜单 ----------
    GM.registerMenuCommand('🔄 手动扫描评论区', scanAll);
    GM.registerMenuCommand(
        `${hasToken ? '【✅ 已获取】' : '【❌ 未获取】'}获取 Access Key`,
        async () => {
            const tokenData = await tokenClient.getToken();
            if (tokenData) {
                GM_setValue('aceess_key', tokenData.access_token);
                alert('Access Key 已刷新，请刷新页面');
                location.reload();
            } else {
                alert('获取失败，请重新登录B站');
            }
        }
    );

    // ---------- 启动主页 ----------
    if (window.location.hostname === 'space.bilibili.com') main();
})();