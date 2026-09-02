// ==UserScript==
// @name         DeepSeek 代码块跳转
// @namespace    https://github.com/smX456464
// @version      8.2
// @description  代码块按钮位于复制/下载左侧，思考部分按钮位于最右侧，均带文字标签
// @author       smX456464
// @match        https://chat.deepseek.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deepseek.com
// @grant        none
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/593932/DeepSeek%20%E4%BB%A3%E7%A0%81%E5%9D%97%E8%B7%B3%E8%BD%AC.user.js
// @updateURL https://update.greasyfork.org/scripts/593932/DeepSeek%20%E4%BB%A3%E7%A0%81%E5%9D%97%E8%B7%B3%E8%BD%AC.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 创建按钮（复用站点样式，带文字标签）
    function createScrollButton(iconRotate, title, text, className) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div role="button" class="ds-button ds-button--borderlessNeutral ds-button--borderless ds-button--capsule ds-button--xs ds-button--icon-relative-m ds-button--min-width ${className}" tabindex="0" title="${title}">
                <div class="ds-button__background"></div>
                <div class="ds-button__icon" style="${iconRotate ? 'transform: rotate(180deg);' : ''}">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z" fill="currentColor"></path>
                    </svg>
                </div>
                <span class="ds-button__content"><span class="code-info-button-text">${text}</span></span>
            </div>
        `;
        return wrapper.firstElementChild;
    }

    // 为代码块添加按钮
    function addButtonsToCodeBlock(codeBlock) {
        if (codeBlock.querySelector('.scroll-to-start, .scroll-to-end')) return;

        const banner = codeBlock.querySelector('.md-code-block-banner');
        if (!banner) return;

        const buttonContainer = banner.querySelector('.efa13877');
        if (!buttonContainer) return;

        const upBtn = createScrollButton(true, '跳到代码块开头', '开头', 'scroll-to-start');
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            codeBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        const downBtn = createScrollButton(false, '跳到代码块结尾', '结尾', 'scroll-to-end');
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            codeBlock.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });

        // 恢复原位：插入到按钮容器最前面（即复制按钮左侧）
        buttonContainer.prepend(upBtn, downBtn);
    }

    // 为思考部分添加按钮
    function addButtonsToThinkBlock(thinkContent) {
        const thinkContainer = thinkContent.closest('._74c0879');
        if (!thinkContainer) return;

        const titleRow = thinkContainer.querySelector('._5ab5d64');
        if (!titleRow) return;

        // 防止重复添加
        if (titleRow.querySelector('.scroll-to-start, .scroll-to-end')) return;

        const upBtn = createScrollButton(true, '跳到思考开头', '开头', 'scroll-to-start');
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            thinkContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        const downBtn = createScrollButton(false, '跳到思考结尾', '结尾', 'scroll-to-end');
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            thinkContent.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });

        // 思考部分按钮保持在最右侧（追加到标题栏末尾）
        titleRow.append(upBtn, downBtn);
    }

    // 处理所有现有元素
    function processAllElements() {
        document.querySelectorAll('.md-code-block').forEach(addButtonsToCodeBlock);
        document.querySelectorAll('.ds-think-content').forEach(addButtonsToThinkBlock);
    }

    // 初始执行
    processAllElements();

    // 监听动态新增节点
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;

                    // 直接是代码块
                    if (node.classList && node.classList.contains('md-code-block')) {
                        addButtonsToCodeBlock(node);
                    }
                    // 直接是思考内容
                    if (node.classList && node.classList.contains('ds-think-content')) {
                        addButtonsToThinkBlock(node);
                    }
                    // 内部包含代码块或思考内容
                    if (node.querySelectorAll) {
                        node.querySelectorAll('.md-code-block').forEach(addButtonsToCodeBlock);
                        node.querySelectorAll('.ds-think-content').forEach(addButtonsToThinkBlock);
                    }
                });
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();