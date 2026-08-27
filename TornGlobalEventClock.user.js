// ==UserScript==
// @name         Torn Global Event Clock
// @namespace    https://github.com/ShavedW00kie/
// @version      1.3.3
// @description  Draggable global event countdown clock for Torn.com (Desktop & TornPDA) with granular toggles
// @author       ShavedW00kie (Torn: ThaWookie [2954173] )
// @license      BSD-3-Clause
// @homepageURL  https://github.com/ShavedW00kie
// @downloadURL  https://github.com/ShavedW00kie/Torn-Global-Event-Clock/raw/refs/heads/main/TornGlobalEventClock.user.js
// @updateURL    https://github.com/ShavedW00kie/Torn-Global-Event-Clock/raw/refs/heads/main/TornGlobalEventClock.user.js
// @match        https://*.torn.com/*
// @match        https://torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_info
// @run-at       document-start
// @position     1

// @connect      api.torn.com
// ==/UserScript==

(function () {
    "use strict";

    /**
     * File: userscript-debugger-module.js
     * Version 1.0.1
     * Advanced Modular Userscript Debugger Engine
     * Author: Github.com/ShavedW00kie/
     * Optimized for Desktop PC, Mobile Browsers, and TornPDA Native WebViews
     * License: BSD-3-Clause
     */
    function initializeModularDebugger(scriptNamespace = 'App') {
        // 1. Generate unique random IDs to completely isolate parallel instances on one page
        const randomSuffix = Math.random().toString(36).substring(2, 11);
        const prefix = `us-debug-${randomSuffix}`;
        
        // 2. Strict Character/Memory Management (Targeting exactly 9,100,000 characters)
        const CLIPBOARD_MAX_CHARS = 10 * 1024 * 1024; // 10MB safe baseline across platforms
        const BUFFER_REDUCTION_SHY = 900 * 1024;      // 900KB safety margin padding
        const MAX_LOG_STRING_LENGTH = CLIPBOARD_MAX_CHARS - BUFFER_REDUCTION_SHY; // Exactly 9.1 million characters

        // 3. Isolated State Engine Tracking Data Streams
        const state = {
            logs: [],
            currentBufferLength: 0,
            domElements: {
                container: null,
                logArea: null
            }
        };

        /**
         * Appends an operational log line to the local memory stack.
         * Evaluates character footprint dynamically to purge aged history rows.
         * @param {any} message - The string data or structured object payload to log
         */
        function log(message) {
            const time = new Date().toLocaleTimeString();
            let cleanMessage = '';
            
            try {
                cleanMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
            } catch (e) {
                cleanMessage = `[Serialization Error] ${message}`;
            }
            
            const entry = `[${time}] ${cleanMessage}`;
            const entryLength = entry.length + 1; // Explicit newline character offset (\n)

            // Prune older log strings line-by-line if next entry overflows memory limits
            while (state.logs.length > 0 && (state.currentBufferLength + entryLength) > MAX_LOG_STRING_LENGTH) {
                const removed = state.logs.shift();
                if (removed) {
                    state.currentBufferLength -= (removed.length + 1);
                }
            }

            // Add to tracking stack if item cleanly complies with space caps
            if (entryLength <= MAX_LOG_STRING_LENGTH) {
                state.logs.push(entry);
                state.currentBufferLength += entryLength;
            }

            // Live DOM updating if visual container pane is actively drawn
            if (state.domElements.logArea) {
                state.domElements.logArea.innerText = state.logs.join('\n');
                if (state.domElements.container) {
                    state.domElements.container.scrollTop = state.domElements.container.scrollHeight;
                }
            }
        }

        /**
         * Copies global runtime logs to system clipboard.
         * Integrates hardware fallbacks for restricted mobile environments.
         * @param {HTMLElement|null} buttonElement - UI Button reference for instant status feedback
         */
        function copyLogs(buttonElement = null) {
            const payload = state.logs.join('\n');
            if (!payload) {
                if (buttonElement) buttonElement.innerText = "Empty!";
                setTimeout(() => { if (buttonElement) buttonElement.innerText = "Copy Logs"; }, 1500);
                return;
            }

            // Standard Async Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(payload)
                    .then(() => handleCopySuccess(buttonElement))
                    .catch(() => handleCopyFallback(payload, buttonElement));
            } else {
                // Instant fallback if running inside restricted application containers
                handleCopyFallback(payload, buttonElement);
            }
        }

        function handleCopySuccess(btn) {
            if (!btn) return;
            const baselineText = btn.innerText;
            btn.innerText = "Copied!";
            setTimeout(() => { btn.innerText = baselineText; }, 1500);
        }

        function handleCopyFallback(textData, btn) {
            // Fallback for sandboxed frames or native iOS/Android WebViews in TornPDA
            try {
                const textarea = document.createElement('textarea');
                textarea.value = textData;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (success) {
                    handleCopySuccess(btn);
                } else {
                    if (btn) btn.innerText = "Failed!";
                }
            } catch (e) {
                if (btn) btn.innerText = "Error!";
                log(`Fallback copy system error: ${e.message}`);
            }
        }

        /**
         * Renders or toggles the visible status overlay window dynamically.
         */
        function toggleConsoleView() {
            let existingContainer = document.getElementById(`${prefix}-box`);
            
            if (existingContainer) {
                // Flip visualization variables if DOM structure is already generated
                if (existingContainer.style.display === 'none') {
                    existingContainer.style.display = 'block';
                    state.domElements.logArea.innerText = state.logs.join('\n');
                    existingContainer.scrollTop = existingContainer.scrollHeight;
                } else {
                    existingContainer.style.display = 'none';
                }
                return;
            }

            // Generate Core Overlay Node
            const container = document.createElement('div');
            container.id = `${prefix}-box`;
            // Designed with responsive layout queries natively scaled for ultra-wide PCs down to mobile viewports
            container.style.cssText = `position:fixed;bottom:12px;right:12px;width:calc(100% - 24px);max-width:380px;height:250px;background:#181818;color:#00ff66;font-family:monospace;font-size:11px;padding:12px;z-index:2147483647;border:1px solid #00ff66;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.7);border-radius:4px;box-sizing:border-box;`;

            // Generate Control Header Action Rows
            const header = document.createElement('div');
            header.style.cssText = `display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:5px;user-select:none;`;

            const title = document.createElement('span');
            title.innerText = `DEBUG LOG [${scriptNamespace}]`;
            title.style.cssText = `font-weight:bold;letter-spacing:0.5px;`;

            const buttonGroup = document.createElement('div');
            buttonGroup.style.cssText = `display:flex;gap:6px;`;

            // Direct Clipboard Mirror Button (Rendered exclusively inside the debug UI)
            const copyBtn = document.createElement('button');
            copyBtn.innerText = 'Copy';
            copyBtn.style.cssText = `background:#2a2a2a;color:#fff;border:1px solid #444;cursor:pointer;padding:3px 8px;font-size:10px;border-radius:3px;transition:all 0.2s;`;
            copyBtn.onclick = () => copyLogs(copyBtn);

            // UI Layer Minimizer Button
            const closeBtn = document.createElement('button');
            closeBtn.innerText = 'Hide';
            closeBtn.style.cssText = `background:#a82020;color:#fff;border:none;cursor:pointer;padding:3px 8px;font-size:10px;border-radius:3px;`;
            closeBtn.onclick = () => { container.style.display = 'none'; };

            // Output Display Box Terminal
            const logArea = document.createElement('div');
            logArea.id = `${prefix}-logs`;
            logArea.style.cssText = `white-space:pre-wrap;word-break:break-all;font-family:monospace;line-height:1.4;`;

            // Structural Nodes Tree Compiler
            buttonGroup.appendChild(copyBtn);
            buttonGroup.appendChild(closeBtn);
            header.appendChild(title);
            header.appendChild(buttonGroup);
            container.appendChild(header);
            container.appendChild(logArea);
            document.body.appendChild(container);

            // Capture Global State Context 
            state.domElements.container = container;
            state.domElements.logArea = logArea;

            // Render buffer rows instantly to display
            logArea.innerText = state.logs.join('\n');
            container.scrollTop = container.scrollHeight;
        }

        // Export internal operational routines to top layer callers
        // Notice: copyLogs is intentionally NOT exported to prevent external clutter
        return {
            log: log,
            toggleView: toggleConsoleView
        };
    }

    // Initialize Debugger Module
    const SCRIPT_NAME = (typeof GM_info !== "undefined" && GM_info.script) ? GM_info.script.name : 'Torn Global Event Clock';
    const SCRIPT_VERSION = (typeof GM_info !== "undefined" && GM_info.script) ? GM_info.script.version : "1.3.2";
    const MyDebug = initializeModularDebugger(SCRIPT_NAME);
    MyDebug.log(`[Lifecycle] ${SCRIPT_NAME} v${SCRIPT_VERSION} initializing...`);

    // ==========================================
    // 1. UNIVERSAL STORAGE MANAGER (PDA Optimized)
    // ==========================================
    const Storage = {
        get: (key, defaultValue) => {
            let val = undefined;
            
            // 1st Priority: GM Storage
            if (typeof GM_getValue === "function") {
                val = GM_getValue(key);
            }
            
            // 2nd Priority: Fallback to localStorage (Fixes TornPDA webview isolation issues)
            if (val === undefined) {
                try {
                    const stored = window.localStorage.getItem(`TornClock_${key}`);
                    if (stored !== null) {
                        val = JSON.parse(stored);
                    }
                } catch (e) {
                    MyDebug.log(`[Storage] localStorage read failed for key ${key}: ${e.message}`);
                }
            }
            
            return val !== undefined ? val : defaultValue;
        },
        set: (key, value) => {
            // Write to GM Storage
            if (typeof GM_setValue === "function") {
                GM_setValue(key, value);
            }
            
            // Dual-write to localStorage for maximum cross-webview persistence on Mobile
            try {
                window.localStorage.setItem(`TornClock_${key}`, JSON.stringify(value));
            } catch (e) {
                MyDebug.log(`[Storage] localStorage write failed for key ${key}: ${e.message}`);
            }
        }
    };

    // Default configuration state
    const State = {
        isCollapsed: Storage.get("isCollapsed", false),
        pos: Storage.get("pos", { top: 50, left: 50 }),
        useLocalTime: Storage.get("useLocalTime", false),
        localOffset: Storage.get("localOffset", 0),
        
        // Category Toggles
        cat_hourly: Storage.get("cat_hourly", true),
        cat_daily: Storage.get("cat_daily", true),
        cat_weekly: Storage.get("cat_weekly", true),
        cat_monthly: Storage.get("cat_monthly", true),
        cat_regen: Storage.get("cat_regen", true),

        // Individual Event Toggles
        ev_hourly_vendors: Storage.get("ev_hourly_vendors", true),
        
        ev_daily_reset: Storage.get("ev_daily_reset", true),
        ev_daily_virus: Storage.get("ev_daily_virus", true),
        ev_daily_prop: Storage.get("ev_daily_prop", true),
        ev_daily_addiction: Storage.get("ev_daily_addiction", true),
        ev_daily_company: Storage.get("ev_daily_company", true),
        
        ev_weekly_lotto: Storage.get("ev_weekly_lotto", true),
        ev_weekly_news: Storage.get("ev_weekly_news", true),
        ev_weekly_company: Storage.get("ev_weekly_company", true),
        
        ev_monthly_sub: Storage.get("ev_monthly_sub", true),
        
        ev_regen_energy: Storage.get("ev_regen_energy", true),
        ev_regen_nerve: Storage.get("ev_regen_nerve", true),
        ev_regen_happy: Storage.get("ev_regen_happy", true)
    };

    const saveState = () => {
        Storage.set("isCollapsed", State.isCollapsed);
        Storage.set("pos", State.pos);
        Storage.set("useLocalTime", State.useLocalTime);
        Storage.set("localOffset", State.localOffset);
        
        Storage.set("cat_hourly", State.cat_hourly);
        Storage.set("cat_daily", State.cat_daily);
        Storage.set("cat_weekly", State.cat_weekly);
        Storage.set("cat_monthly", State.cat_monthly);
        Storage.set("cat_regen", State.cat_regen);

        Storage.set("ev_hourly_vendors", State.ev_hourly_vendors);
        Storage.set("ev_daily_reset", State.ev_daily_reset);
        Storage.set("ev_daily_virus", State.ev_daily_virus);
        Storage.set("ev_daily_prop", State.ev_daily_prop);
        Storage.set("ev_daily_addiction", State.ev_daily_addiction);
        Storage.set("ev_daily_company", State.ev_daily_company);
        Storage.set("ev_weekly_lotto", State.ev_weekly_lotto);
        Storage.set("ev_weekly_news", State.ev_weekly_news);
        Storage.set("ev_weekly_company", State.ev_weekly_company);
        Storage.set("ev_monthly_sub", State.ev_monthly_sub);
        Storage.set("ev_regen_energy", State.ev_regen_energy);
        Storage.set("ev_regen_nerve", State.ev_regen_nerve);
        Storage.set("ev_regen_happy", State.ev_regen_happy);
    };

    // ==========================================
    // 2. TIME & EVENT PARSER LOGIC
    // ==========================================
    const getTCTDate = () => new Date();

    const getNextOccurrence = (hour, minute, dayOfWeek = null, dayOfMonth = null) => {
        const now = getTCTDate();
        let target = new Date(now.getTime());
        target.setUTCHours(hour, minute, 0, 0);

        if (dayOfMonth !== null) {
            target.setUTCDate(dayOfMonth);
            if (target <= now) target.setUTCMonth(target.getUTCMonth() + 1);
        } else if (dayOfWeek !== null) {
            let diff = dayOfWeek - target.getUTCDay();
            if (diff < 0 || (diff === 0 && target <= now)) diff += 7;
            target.setUTCDate(target.getUTCDate() + diff);
        } else {
            if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
        }
        return target;
    };

    const getNextInterval = (intervalMinutes) => {
        const now = getTCTDate();
        const minutes = now.getUTCMinutes();
        const nextTargetMin = Math.floor((minutes + intervalMinutes) / intervalMinutes) * intervalMinutes;
        let target = new Date(now.getTime());
        target.setUTCHours(now.getUTCHours(), nextTargetMin, 0, 0);
        return target;
    };

    const Categories = [
        { id: "hourly", name: "Hourly Events" },
        { id: "daily", name: "Daily Events" },
        { id: "weekly", name: "Weekly Events" },
        { id: "monthly", name: "Monthly Events" },
        { id: "regen", name: "Regeneration" }
    ];

    const EventDictionary = [
        // Hourly
        { id: "ev_hourly_vendors", cat: "hourly", name: "Vendors / Territory", getNext: () => getNextInterval(15) },
        
        // Daily
        { id: "ev_daily_reset", cat: "daily", name: "Daily Reset", getNext: () => getNextOccurrence(0, 0) },
        { id: "ev_daily_virus", cat: "daily", name: "Virus Coding", getNext: () => getNextOccurrence(3, 25) },
        { id: "ev_daily_prop", cat: "daily", name: "Property/Stats", getNext: () => getNextOccurrence(3, 30) },
        { id: "ev_daily_addiction", cat: "daily", name: "Addiction Decay", getNext: () => getNextOccurrence(3, 31) },
        { id: "ev_daily_company", cat: "daily", name: "Company Effectiveness", getNext: () => getNextOccurrence(18, 0) },
        
        // Weekly
        { id: "ev_weekly_lotto", cat: "weekly", name: "Lotteries", getNext: () => getNextOccurrence(10, 0, 0) },
        { id: "ev_weekly_news", cat: "weekly", name: "Newspaper Bazaar", getNext: () => getNextOccurrence(14, 0, 0) },
        { id: "ev_weekly_company", cat: "weekly", name: "Company Star", getNext: () => getNextOccurrence(18, 0, 0) },
        
        // Monthly
        { id: "ev_monthly_sub", cat: "monthly", name: "Subscriber Bonuses", getNext: () => getNextOccurrence(5, 15, null, 1) },

        // Regeneration
        { id: "ev_regen_energy", cat: "regen", name: "Energy (+5)", getNext: () => getNextInterval(10) },
        { id: "ev_regen_nerve", cat: "regen", name: "Nerve (+1)", getNext: () => getNextInterval(5) },
        { id: "ev_regen_happy", cat: "regen", name: "Happy Reset (15m)", getNext: () => getNextInterval(15) }
    ];

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // ==========================================
    // 3. DOM INJECTION & UI COMPONENTS
    // ==========================================
    let clockEl = null;
    let clockDataEl = null;

    const injectCSS = () => {
        const css = `
            #torn-clock-widget {
                position: fixed;
                z-index: 9999999;
                background: rgba(0, 0, 0, 0.85);
                color: #fff;
                border: 1px solid #444;
                border-radius: 6px;
                padding: 10px;
                font-family: Arial, sans-serif;
                width: 220px;
                user-select: none;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                max-height: 80vh;
                display: flex;
                flex-direction: column;
            }
            #torn-clock-header {
                cursor: grab;
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                border-bottom: 1px solid #555;
                padding-bottom: 5px;
                margin-bottom: 5px;
                background: #222;
                border-radius: 4px 4px 0 0;
                position: relative;
            }
            #torn-clock-header:active { cursor: grabbing; }
            #torn-clock-collapse-btn {
                position: absolute;
                right: 5px;
                top: -2px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                color: #888;
                padding: 0 5px;
            }
            #torn-clock-collapse-btn:hover { color: #fff; }
            #torn-clock-data {
                font-size: 14px;
                flex-grow: 1;
                overflow-y: auto;
            }
            .torn-clock-main-time { font-size: 16px; font-weight: bold; text-align: center; color: #fff; }
            .torn-clock-cat-title { font-size: 12px; font-weight: bold; color: #888; margin: 8px 0 4px 0; text-transform: uppercase; text-align: center; }
            .torn-clock-event-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
            .torn-clock-event-name { color: #ccc; }
            .torn-clock-event-time { color: #4CAF50; font-family: monospace; font-size: 13px; font-weight: bold; }
            .torn-clock-hr { border: 0; border-top: 1px solid #444; margin: 8px 0; }
            
            .torn-clock-settings-panel {
                display: none;
                margin-top: 10px;
                font-size: 11px;
                border-top: 1px solid #555;
                padding-top: 5px;
                max-height: 250px;
                overflow-y: auto;
            }
            .torn-clock-settings-panel label { display: block; margin-bottom: 4px; cursor: pointer; color: #ccc; }
            .torn-clock-settings-cat { font-weight: bold; color: #fff; margin-top: 8px; border-bottom: 1px solid #444; padding-bottom: 2px; }
            .torn-clock-settings-item { margin-left: 10px; }
            .torn-clock-toggle { cursor: pointer; color: #888; font-size: 11px; text-decoration: underline; text-align: center; display: block; margin-top: 8px;}
            
            /* Support & Debug Module Styles */
            #thawookie-support-module {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 8px;
                align-items: center;
                position: relative;
            }
            .tw-support-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px 12px;
                color: #fff !important;
                text-decoration: none !important;
                border-radius: 6px;
                font-size: 11px;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                transition: transform 0.2s ease;
                border: 1px solid #555;
                cursor: pointer;
                width: 90%;
            }
            .tw-support-btn:active { transform: scale(0.95); }
            .tw-bmc { background-color: #FFDD00; color: #000 !important; border-color: #FFDD00; }
            .tw-torn-tip { background-color: #8ab63d; border-color: #6a8c2f; }
            
            /* Subtle Debug Button Styling */
            .tw-debug { 
                background-color: transparent !important; 
                border: none !important; 
                box-shadow: none !important; 
                padding: 2px !important; 
                width: auto !important; 
                font-size: 14px !important; 
                opacity: 0.4; 
                transition: opacity 0.2s ease;
            }
            .tw-debug:hover { opacity: 1; }

            /* Scrollbar styling for panels */
            #torn-clock-widget ::-webkit-scrollbar { width: 4px; }
            #torn-clock-widget ::-webkit-scrollbar-thumb { background: #666; border-radius: 2px; }
        `;
        if (typeof GM_addStyle !== "undefined") {
            GM_addStyle(css);
        } else {
            const style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);
        }
    };

    const renderClockUI = () => {
        if (document.getElementById("torn-clock-widget")) return;

        MyDebug.log('[UI] Rendering core clock widget DOM elements');

        clockEl = document.createElement("div");
        clockEl.id = "torn-clock-widget";
        clockEl.style.top = `${State.pos.top}px`;
        clockEl.style.left = `${State.pos.left}px`;

        // Generate dynamic settings HTML
        let settingsHtml = `
            <label><input type="checkbox" id="tc-toggle-tct" ${State.useLocalTime ? 'checked' : ''}> Use Local Time</label>
            <label>Offset (hrs): <input type="number" id="tc-offset" value="${State.localOffset}" style="width:40px; background:#333; color:#fff; border:1px solid #555;"></label>
        `;

        Categories.forEach(cat => {
            settingsHtml += `
                <div class="torn-clock-settings-cat">
                    <label><input type="checkbox" data-cat="${cat.id}" ${State[`cat_${cat.id}`] ? 'checked' : ''}> ${cat.name} (All)</label>
                </div>
            `;
            const catEvents = EventDictionary.filter(e => e.cat === cat.id);
            catEvents.forEach(ev => {
                settingsHtml += `
                    <div class="torn-clock-settings-item">
                        <label><input type="checkbox" data-ev="${ev.id}" ${State[ev.id] ? 'checked' : ''}> ${ev.name}</label>
                    </div>
                `;
            });
        });

        // Inject Version, Support Module, and subtle Debug UI at the bottom
        settingsHtml += `
            <div style="display: flex; justify-content: center; align-items: center; color: #888; font-size: 10px; margin-top: 15px; border-top: 1px solid #444; padding-top: 10px; gap: 8px;">
                <span>v${SCRIPT_VERSION}</span>
                <button id="tw-debug-toggle" class="tw-support-btn tw-debug" title="Open Debug Console">🪲</button>
            </div>
            <div id="thawookie-support-module">
                <a href="https://www.torn.com/item.php" target="_blank" rel="noopener noreferrer" class="tw-support-btn tw-torn-tip" title='Opens Items — search "Xanax", tap Send, enter ThaWookie [2954173]'>💊 Send a Xanax Tip</a>
                <a href="https://www.buymeacoffee.com/bittick1c" target="_blank" rel="noopener noreferrer" class="tw-support-btn tw-bmc">☕ Buy Me a Coffee</a>
            </div>
        `;

        clockEl.innerHTML = `
            <div id="torn-clock-header">
                <span style="pointer-events:none;">drag | Torn Clock</span>
                <span id="torn-clock-collapse-btn" title="Toggle Collapse">${State.isCollapsed ? '+' : '-'}</span>
            </div>
            <div id="torn-clock-data">Loading...</div>
            <a class="torn-clock-toggle" id="torn-clock-settings-btn" style="display: ${State.isCollapsed ? 'none' : 'block'};">Settings</a>
            <div class="torn-clock-settings-panel" id="torn-clock-settings">
                ${settingsHtml}
            </div>
        `;

        document.body.appendChild(clockEl);
        clockDataEl = document.getElementById("torn-clock-data");

        initDrag();
        initInteractions();
    };

    // ==========================================
    // 4. DRAG & INTERACTION BINDINGS
    // ==========================================
    const initDrag = () => {
        const header = document.getElementById("torn-clock-header");
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault(); 
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let newLeft = initialLeft + (clientX - startX);
            let newTop = initialTop + (clientY - startY);
            
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - clockEl.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - clockEl.offsetHeight));

            clockEl.style.left = `${newLeft}px`;
            clockEl.style.top = `${newTop}px`;
        };

        const onEnd = () => {
            if (isDragging) {
                isDragging = false;
                State.pos = { top: parseInt(clockEl.style.top), left: parseInt(clockEl.style.left) };
                saveState();
                MyDebug.log(`[UI] Widget position updated to Left:${State.pos.left}, Top:${State.pos.top}`);
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onEnd);
                document.removeEventListener("touchmove", onMove);
                document.removeEventListener("touchend", onEnd);
            }
        };

        const onStart = (e) => {
            if (e.target.id === "torn-clock-collapse-btn") return;
            
            isDragging = true;
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            initialLeft = parseInt(clockEl.style.left) || 0;
            initialTop = parseInt(clockEl.style.top) || 0;

            document.addEventListener("mousemove", onMove, { passive: false });
            document.addEventListener("mouseup", onEnd);
            document.addEventListener("touchmove", onMove, { passive: false });
            document.addEventListener("touchend", onEnd);
        };

        header.addEventListener("mousedown", onStart);
        header.addEventListener("touchstart", onStart, { passive: true });
    };

    const initInteractions = () => {
        const settingsBtn = document.getElementById("torn-clock-settings-btn");
        const settingsPanel = document.getElementById("torn-clock-settings");
        const collapseBtn = document.getElementById("torn-clock-collapse-btn");
        
        // Subtle Debugger Interaction
        document.getElementById("tw-debug-toggle").addEventListener("click", () => {
            MyDebug.toggleView();
        });

        collapseBtn.addEventListener("click", () => {
            State.isCollapsed = !State.isCollapsed;
            collapseBtn.textContent = State.isCollapsed ? '+' : '-';
            settingsBtn.style.display = State.isCollapsed ? 'none' : 'block';
            
            if (State.isCollapsed) {
                settingsPanel.style.display = "none";
            }
            
            MyDebug.log(`[UI] Widget collapse state toggled to: ${State.isCollapsed}`);
            saveState();
            updateClock();
        });

        settingsBtn.addEventListener("click", () => {
            settingsPanel.style.display = settingsPanel.style.display === "block" ? "none" : "block";
            updateClock();
        });

        document.getElementById("tc-toggle-tct").addEventListener("change", (e) => {
            State.useLocalTime = e.target.checked;
            saveState();
            updateClock();
        });

        document.getElementById("tc-offset").addEventListener("input", (e) => {
            State.localOffset = parseFloat(e.target.value) || 0;
            saveState();
            updateClock();
        });

        clockEl.querySelectorAll('input[data-cat]').forEach(chk => {
            chk.addEventListener("change", (e) => {
                const catId = e.target.getAttribute("data-cat");
                State[`cat_${catId}`] = e.target.checked;
                saveState();
                updateClock();
            });
        });

        clockEl.querySelectorAll('input[data-ev]').forEach(chk => {
            chk.addEventListener("change", (e) => {
                const evId = e.target.getAttribute("data-ev");
                State[evId] = e.target.checked;
                saveState();
                updateClock();
            });
        });
    };

    // ==========================================
    // 5. OBSERVERS & CLOCK TICK
    // ==========================================
    const updateClock = () => {
        if (!clockDataEl) return;
        
        const now = getTCTDate();
        let displayHour = now.getUTCHours();
        
        if (State.useLocalTime) {
            displayHour = (displayHour + State.localOffset + 24) % 24;
        }

        const clockTimeStr = `${displayHour.toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} ${State.useLocalTime ? 'Local' : 'TCT'}`;

        let html = `<div class="torn-clock-main-time" style="${State.isCollapsed ? 'margin-bottom: 0;' : 'margin-bottom: 10px;'}">${clockTimeStr}</div>`;
        
        if (!State.isCollapsed) {
            let activeCategoriesCount = 0;

            Categories.forEach((cat) => {
                if (!State[`cat_${cat.id}`]) return;

                const activeEvents = EventDictionary.filter(ev => ev.cat === cat.id && State[ev.id]);
                
                if (activeEvents.length > 0) {
                    if (activeCategoriesCount > 0) {
                        html += `<hr class="torn-clock-hr">`;
                    }
                    
                    html += `<div class="torn-clock-cat-title">${cat.name}</div>`;
                    
                    activeEvents.forEach(ev => {
                        const nextTime = ev.getNext();
                        const diff = nextTime - now;
                        html += `
                            <div class="torn-clock-event-row">
                                <span class="torn-clock-event-name">${ev.name}</span>
                                <span class="torn-clock-event-time">${formatTime(diff)}</span>
                            </div>
                        `;
                    });
                    
                    activeCategoriesCount++;
                }
            });

            if (activeCategoriesCount === 0) {
                html += `<div style="text-align:center; color: #888; font-size:12px; margin-top:10px;">No events tracked</div>`;
            }
        }

        clockDataEl.innerHTML = html;
    };

    const observer = new MutationObserver(() => {
        if (document.body && !document.getElementById("torn-clock-widget")) {
            MyDebug.log('[DOM] Widget missing during React state mutation. Re-injecting...');
            renderClockUI();
            updateClock();
        }
    });

    // ==========================================
    // 6. INITIALIZATION
    // ==========================================
    const init = () => {
        injectCSS();
        
        // Immediate DOM check to fix rendering issues on fast-loading PC browsers
        if (document.body && !document.getElementById("torn-clock-widget")) {
            renderClockUI();
            updateClock();
        }
        
        observer.observe(document.documentElement, { childList: true, subtree: true });
        setInterval(updateClock, 1000);
        MyDebug.log('[Lifecycle] Initialization complete. Observer bound.');
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
