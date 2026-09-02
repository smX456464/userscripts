// ==UserScript==
// @name         B站动态UP主搜索+定位+全站搜索（修复切换不刷新关注列表）
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  在B站动态页面的UP主列表末尾添加搜索入口，点击弹窗模糊搜索，支持关注列表搜索（定位模拟点击）和全站用户搜索（打开空间），弹窗背景自适应并保证文字对比度；修复从全站切回关注列表不刷新数据的问题
// @author       You
// @match        https://t.bilibili.com/
// @icon         https://www.bilibili.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const SEARCH_ITEM_ATTR = 'data-dynamic-search-item';
    let currentMode = 'following'; // 'following' | 'global'

    // 等待列表出现
    function waitForList(callback) {
        const list = document.querySelector('.bili-dyn-up-list');
        if (list) {
            callback(list);
        } else {
            setTimeout(() => waitForList(callback), 500);
        }
    }

    // 提取UP主信息（跳过搜索项自身）
    function getUpItems(list) {
        const items = [];
        list.querySelectorAll('.bili-dyn-up-list__item').forEach(item => {
            if (item.hasAttribute(SEARCH_ITEM_ATTR)) return;
            const uid = item.getAttribute('biliscope-userid');
            if (!uid) return;
            const nameEl = item.querySelector('.bili-dyn-up-list__item__name');
            const name = nameEl ? nameEl.textContent.trim() : '';
            const imgEl = item.querySelector('.bili-dyn-up-list__item__face__img img');
            const avatar = imgEl ? imgEl.getAttribute('src') : '';
            items.push({ uid, name, avatar, element: item });
        });
        return items;
    }

    // 创建搜索入口项（与原版一致）
    function addSearchEntry(list) {
        if (list.querySelector(`[${SEARCH_ITEM_ATTR}]`)) return;

        const searchItem = document.createElement('div');
        searchItem.className = 'bili-dyn-up-list__item';
        searchItem.setAttribute(SEARCH_ITEM_ATTR, 'true');
        searchItem.style.cursor = 'pointer';

        searchItem.innerHTML = `
            <div class="bili-dyn-up-list__item__face">
                <div class="bili-dyn-up-list__item__face__img b-img--face b-img" style="
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: #fb7299;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                ">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                </div>
            </div>
            <div class="bili-dyn-up-list__item__name bili-ellipsis">搜索</div>
        `;

        list.appendChild(searchItem);
        searchItem.addEventListener('click', () => {
            const items = getUpItems(list);
            openSearchModal(items, list); // 传入 list 引用
        });
    }

    // 获取页面背景色
    function getPageBackgroundColor() {
        const selectors = [
            '.bili-dyn-up-list',
            '.bili-dyn-list__container',
            '.bili-dyn',
            'body'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                const bg = window.getComputedStyle(el).backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                    return bg;
                }
            }
        }
        return null;
    }

    // 解析颜色为RGB对象
    function parseColor(color) {
        if (!color) return null;
        let match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3]),
                a: match[4] !== undefined ? parseFloat(match[4]) : 1
            };
        }
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
            const num = parseInt(full, 16);
            return {
                r: (num >> 16) & 255,
                g: (num >> 8) & 255,
                b: num & 255,
                a: 1
            };
        }
        return null;
    }

    // 计算相对亮度
    function getLuminance(r, g, b) {
        const normalize = (c) => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
    }

    // 根据背景色应用对比度良好的文字颜色
    function applyContrastColors(card) {
        const bgColor = card.style.backgroundColor || window.getComputedStyle(card).backgroundColor;
        const parsed = parseColor(bgColor);
        let isDark = false;
        if (parsed) {
            const alpha = parsed.a;
            const r = Math.round(parsed.r * alpha + 0 * (1 - alpha));
            const g = Math.round(parsed.g * alpha + 0 * (1 - alpha));
            const b = Math.round(parsed.b * alpha + 0 * (1 - alpha));
            const luminance = getLuminance(r, g, b);
            isDark = luminance < 0.5;
        }

        const textColor = isDark ? '#ffffff' : '#333333';
        const subTextColor = isDark ? '#cccccc' : '#666666';
        const inputBg = isDark ? 'rgba(255,255,255,0.1)' : '#ffffff';
        const inputBorder = isDark ? '#555' : '#ddd';
        const inputTextColor = isDark ? '#fff' : '#333';
        const placeholderColor = isDark ? '#aaa' : '#999';
        const hoverBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        const closeColor = isDark ? '#ccc' : '#999';

        const title = card.querySelector('#dynamic-up-search-title');
        if (title) title.style.color = textColor;

        const closeBtn = card.querySelector('#dynamic-up-search-close');
        if (closeBtn) closeBtn.style.color = closeColor;

        const input = card.querySelector('#dynamic-up-search-input');
        if (input) {
            input.style.backgroundColor = inputBg;
            input.style.borderColor = inputBorder;
            input.style.color = inputTextColor;
        }

        card.dataset.textColor = textColor;
        card.dataset.subTextColor = subTextColor;
        card.dataset.hoverBg = hoverBg;

        const styleTag = document.createElement('style');
        styleTag.textContent = `#dynamic-up-search-input::placeholder { color: ${placeholderColor} !important; }`;
        card.appendChild(styleTag);

        // 更新模式按钮样式
        const buttons = card.querySelectorAll('.mode-btn');
        buttons.forEach(btn => {
            if (btn.dataset.mode === currentMode) {
                btn.style.backgroundColor = isDark ? 'rgba(255,255,255,0.2)' : '#fb7299';
                btn.style.color = '#fff';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = textColor;
            }
            btn.style.borderColor = isDark ? '#555' : '#ddd';
        });
    }

    // 创建并打开搜索模态框
    function openSearchModal(initialItems, listRef) {
        let modal = document.getElementById('dynamic-up-search-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dynamic-up-search-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                justify-content: center;
                align-items: center;
            `;
            modal.innerHTML = `
                <div id="dynamic-up-search-card" style="
                    background: white;
                    width: 500px;
                    max-width: 90%;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    max-height: 80vh;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 id="dynamic-up-search-title" style="margin: 0; color: #333;">搜索UP主</h3>
                        <span id="dynamic-up-search-close" style="cursor: pointer; font-size: 24px; color: #999; line-height: 1;">&times;</span>
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <button class="mode-btn" data-mode="following" style="padding: 5px 12px; border-radius: 15px; border: 1px solid #ddd; background: transparent; cursor: pointer; font-size: 13px;">关注列表</button>
                        <button class="mode-btn" data-mode="global" style="padding: 5px 12px; border-radius: 15px; border: 1px solid #ddd; background: transparent; cursor: pointer; font-size: 13px;">全站搜索</button>
                    </div>
                    <input type="text" id="dynamic-up-search-input" placeholder="输入名称或UID模糊搜索..." style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 15px; outline: none;">
                    <div id="dynamic-up-search-results" style="overflow-y: auto; flex: 1; min-height: 150px;"></div>
                </div>
            `;
            document.body.appendChild(modal);

            // 绑定模式切换
            modal.querySelectorAll('.mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentMode = btn.dataset.mode;
                    const input = modal.querySelector('#dynamic-up-search-input');
                    input.value = '';
                    input.placeholder = currentMode === 'following' ? '输入名称或UID模糊搜索...' : '输入关键词搜索全站用户...';
                    applyContrastColors(modal.querySelector('#dynamic-up-search-card'));
                    const results = modal.querySelector('#dynamic-up-search-results');
                    results.innerHTML = '';
                    input.focus();

                    // 修复：若切换到关注列表，则重新获取最新列表
                    if (currentMode === 'following') {
                        // 从 listRef 获取最新数据
                        if (listRef) {
                            localItems = getUpItems(listRef);
                            const title = modal.querySelector('#dynamic-up-search-title');
                            title.textContent = `搜索UP主 (${localItems.length})`;
                            // 重新渲染全部（或根据关键词，但此时输入已清空，直接显示全部）
                            renderLocalResults(localItems);
                        }
                    }
                });
            });
        }

        const card = modal.querySelector('#dynamic-up-search-card');
        const title = modal.querySelector('#dynamic-up-search-title');
        const input = modal.querySelector('#dynamic-up-search-input');
        const resultsContainer = modal.querySelector('#dynamic-up-search-results');
        const closeBtn = modal.querySelector('#dynamic-up-search-close');

        // 设置背景色
        const pageBg = getPageBackgroundColor();
        card.style.backgroundColor = pageBg || 'rgba(255, 255, 255, 0.3)';

        applyContrastColors(card);

        // 当前本地数据
        let localItems = initialItems;
        title.textContent = currentMode === 'following' ? `搜索UP主 (${localItems.length})` : '搜索全站用户';

        // 清理旧监听器（替换节点）
        const newInput = input.cloneNode(true);
        input.replaceWith(newInput);
        const newClose = closeBtn.cloneNode(true);
        closeBtn.replaceWith(newClose);

        newInput.value = '';
        resultsContainer.innerHTML = '';
        modal.style.display = 'flex';
        newInput.focus();

        const isDark = card.dataset.textColor === '#ffffff';
        newInput.style.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : '#fff';
        newInput.style.borderColor = isDark ? '#555' : '#ddd';
        newInput.style.color = isDark ? '#fff' : '#333';

        function closeModal() {
            modal.style.display = 'none';
            newInput.value = '';
            resultsContainer.innerHTML = '';
            document.removeEventListener('keydown', handleEscape);
        }

        function handleEscape(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
        }

        newClose.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        document.addEventListener('keydown', handleEscape);

        // 渲染本地结果（关注列表）
        function renderLocalResults(filteredItems) {
            resultsContainer.innerHTML = '';
            if (filteredItems.length === 0) {
                resultsContainer.innerHTML = `<div style="text-align: center; color: ${card.dataset.subTextColor}; padding: 20px;">未找到匹配的UP主</div>`;
                return;
            }
            filteredItems.forEach(item => {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; transition: background 0.2s;';
                div.onmouseover = () => div.style.background = card.dataset.hoverBg;
                div.onmouseout = () => div.style.background = 'transparent';
                div.onclick = () => {
                    const targetItem = item.element;
                    if (targetItem) {
                        targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetItem.style.outline = '2px solid #fb7299';
                        setTimeout(() => targetItem.style.outline = '', 2000);
                        targetItem.click();
                    }
                    closeModal();
                };

                if (item.avatar) {
                    const img = document.createElement('img');
                    img.src = item.avatar.startsWith('//') ? 'https:' + item.avatar : item.avatar;
                    img.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; object-fit: cover;';
                    div.appendChild(img);
                }

                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'display: flex; flex-direction: column;';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = item.name;
                nameSpan.style.color = card.dataset.textColor;
                nameSpan.style.fontSize = '14px';
                const uidSpan = document.createElement('span');
                uidSpan.textContent = `UID: ${item.uid}`;
                uidSpan.style.color = card.dataset.subTextColor;
                uidSpan.style.fontSize = '12px';
                infoDiv.appendChild(nameSpan);
                infoDiv.appendChild(uidSpan);
                div.appendChild(infoDiv);
                resultsContainer.appendChild(div);
            });
        }

        // 渲染全站结果
        function renderGlobalResults(users) {
            resultsContainer.innerHTML = '';
            if (users.length === 0) {
                resultsContainer.innerHTML = `<div style="text-align: center; color: ${card.dataset.subTextColor}; padding: 20px;">未找到相关用户</div>`;
                return;
            }
            users.forEach(user => {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; transition: background 0.2s;';
                div.onmouseover = () => div.style.background = card.dataset.hoverBg;
                div.onmouseout = () => div.style.background = 'transparent';
                div.onclick = () => {
                    window.open(`https://space.bilibili.com/${user.mid}`, '_blank');
                };

                if (user.upic) {
                    const img = document.createElement('img');
                    img.src = user.upic.startsWith('//') ? 'https:' + user.upic : user.upic;
                    img.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; object-fit: cover;';
                    div.appendChild(img);
                }

                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'display: flex; flex-direction: column; flex: 1;';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = user.uname || '未知用户';
                nameSpan.style.color = card.dataset.textColor;
                nameSpan.style.fontSize = '14px';
                const uidSpan = document.createElement('span');
                uidSpan.textContent = `UID: ${user.mid}`;
                uidSpan.style.color = card.dataset.subTextColor;
                uidSpan.style.fontSize = '12px';
                infoDiv.appendChild(nameSpan);
                infoDiv.appendChild(uidSpan);
                div.appendChild(infoDiv);

                const fansSpan = document.createElement('span');
                fansSpan.textContent = user.fans ? `粉丝 ${user.fans}` : '';
                fansSpan.style.color = card.dataset.subTextColor;
                fansSpan.style.fontSize = '12px';
                div.appendChild(fansSpan);

                resultsContainer.appendChild(div);
            });
        }

        // 更新结果（根据模式和关键词）
        function updateResults(keyword) {
            if (currentMode === 'following') {
                if (!keyword) {
                    renderLocalResults(localItems);
                } else {
                    const filtered = localItems.filter(item =>
                        item.name.toLowerCase().includes(keyword) || item.uid.includes(keyword)
                    );
                    renderLocalResults(filtered);
                }
            } else {
                if (!keyword) {
                    resultsContainer.innerHTML = `<div style="text-align: center; color: ${card.dataset.subTextColor}; padding: 20px;">请输入关键词进行全站搜索</div>`;
                    return;
                }
                clearTimeout(updateResults._timer);
                updateResults._timer = setTimeout(() => {
                    fetch(`https://api.bilibili.com/x/web-interface/search/type?search_type=bili_user&keyword=${encodeURIComponent(keyword)}`, { credentials: 'include' })
                        .then(res => res.json())
                        .then(data => {
                            if (data.code === 0 && data.data && data.data.result) {
                                renderGlobalResults(data.data.result);
                            } else {
                                resultsContainer.innerHTML = `<div style="text-align: center; color: ${card.dataset.subTextColor}; padding: 20px;">搜索失败或没有结果</div>`;
                            }
                        })
                        .catch(err => {
                            console.error('全站搜索请求失败:', err);
                            resultsContainer.innerHTML = `<div style="text-align: center; color: ${card.dataset.subTextColor}; padding: 20px;">搜索请求出错，请稍后重试</div>`;
                        });
                }, 400);
            }
        }

        // 初始显示
        updateResults('');

        // 输入事件
        newInput.addEventListener('input', function() {
            const keyword = this.value.trim().toLowerCase();
            updateResults(keyword);
        });
    }

    // 初始化
    waitForList((list) => {
        addSearchEntry(list);

        const observer = new MutationObserver(() => {
            if (!list.querySelector(`[${SEARCH_ITEM_ATTR}]`)) {
                addSearchEntry(list);
            }
        });
        observer.observe(list, { childList: true, subtree: false });
    });
})();