// ==UserScript==
// @name         Torn Global Event Clock
// @namespace    https://github.com/ShavedW00kie/
// @version      1.2.2
// @description  Draggable global event countdown clock for Torn.com (Desktop & TornPDA) with granular toggles
// @author       ShavedW00kie (Torn: ThaWookie [2954173] )
// @homepageURL  https://github.com/ShavedW00kie
// @downloadURL  https://github.com/ShavedW00kie/Torn-Global-Event-Clock/raw/refs/heads/main/TornGlobalEventClock.user.js
// @updateURL    https://github.com/ShavedW00kie/Torn-Global-Event-Clock/raw/refs/heads/main/TornGlobalEventClock.user.js
// @match        https://*.torn.com/*
// @match        https://torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-start
// @connect      api.torn.com
// ==/UserScript==

(function () {
    "use strict";

    // ==========================================
    // 1. UNIVERSAL STORAGE MANAGER
    // ==========================================
    const Storage = {
        get: (key, defaultValue) => {
            if (typeof GM_getValue !== "undefined") {
                return GM_getValue(key, defaultValue);
            }
            try {
                const stored = localStorage.getItem(`TornClock_${key}`);
                return stored ? JSON.parse(stored) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        set: (key, value) => {
            if (typeof GM_setValue !== "undefined") {
                GM_setValue(key, value);
            } else {
                localStorage.setItem(`TornClock_${key}`, JSON.stringify(value));
            }
        }
    };

    // Default configuration state (All visible by default for new installations)
    const State = {
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
        ev_regen_happy: Storage.get("ev_regen_happy", true) // The 15m reset for happy jumps
    };

    const saveState = () => {
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
        // Hourly (XX:00, 15, 30, 45)
        { id: "ev_hourly_vendors", cat: "hourly", name: "Vendors / Territory", getNext: () => getNextInterval(15) },
        
        // Daily
        { id: "ev_daily_reset", cat: "daily", name: "Daily Reset", getNext: () => getNextOccurrence(0, 0) },
        { id: "ev_daily_virus", cat: "daily", name: "Virus Coding", getNext: () => getNextOccurrence(3, 25) },
        { id: "ev_daily_prop", cat: "daily", name: "Property/Stats", getNext: () => getNextOccurrence(3, 30) },
        { id: "ev_daily_addiction", cat: "daily", name: "Addiction Decay", getNext: () => getNextOccurrence(3, 31) },
        { id: "ev_daily_company", cat: "daily", name: "Company Effectiveness", getNext: () => getNextOccurrence(18, 0) },
        
        // Weekly (Sunday = 0)
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
            }
            #torn-clock-header:active { cursor: grabbing; }
            #torn-clock-data {
                font-size: 14px;
                flex-grow: 1;
                overflow-y: auto;
            }
            .torn-clock-main-time { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 10px; color: #fff; }
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
                max-height: 200px;
                overflow-y: auto;
            }
            .torn-clock-settings-panel label { display: block; margin-bottom: 4px; cursor: pointer; color: #ccc; }
            .torn-clock-settings-cat { font-weight: bold; color: #fff; margin-top: 8px; border-bottom: 1px solid #444; padding-bottom: 2px; }
            .torn-clock-settings-item { margin-left: 10px; }
            .torn-clock-toggle { cursor: pointer; color: #888; font-size: 11px; text-decoration: underline; text-align: center; display: block; margin-top: 8px;}
            
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

        clockEl.innerHTML = `
            <div id="torn-clock-header">drag | Torn Clock</div>
            <div id="torn-clock-data">Loading...</div>
            <a class="torn-clock-toggle" id="torn-clock-settings-btn">Settings</a>
            <div class="torn-clock-settings-panel" id="torn-clock-settings">
                ${settingsHtml}
            </div>
        `;

        document.body.appendChild(clockEl);
        clockDataEl = document.getElementById("torn-clock-data");

        initDrag();
        initSettings();
    };

    // ==========================================
    // 4. DRAG & EVENT BINDINGS
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
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onEnd);
                document.removeEventListener("touchmove", onMove);
                document.removeEventListener("touchend", onEnd);
            }
        };

        const onStart = (e) => {
            if (e.target !== header) return;
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

    const initSettings = () => {
        const settingsBtn = document.getElementById("torn-clock-settings-btn");
        const settingsPanel = document.getElementById("torn-clock-settings");

        settingsBtn.addEventListener("click", () => {
            settingsPanel.style.display = settingsPanel.style.display === "block" ? "none" : "block";
            updateClock(); // Force immediate redraw to fix height calculations
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

        // Category Toggles
        clockEl.querySelectorAll('input[data-cat]').forEach(chk => {
            chk.addEventListener("change", (e) => {
                const catId = e.target.getAttribute("data-cat");
                State[`cat_${catId}`] = e.target.checked;
                saveState();
                updateClock();
            });
        });

        // Event Toggles
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

        let html = `<div class="torn-clock-main-time">${clockTimeStr}</div>`;
        let activeCategoriesCount = 0;

        Categories.forEach((cat) => {
            // Check if category is enabled at a master level
            if (!State[`cat_${cat.id}`]) return;

            // Find all enabled individual events under this category
            const activeEvents = EventDictionary.filter(ev => ev.cat === cat.id && State[ev.id]);
            
            if (activeEvents.length > 0) {
                // Add separator if it's not the very first active category displayed
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

        clockDataEl.innerHTML = html;
    };

    const observer = new MutationObserver(() => {
        if (document.body && !document.getElementById("torn-clock-widget")) {
            renderClockUI();
            updateClock(); // Initial paint
        }
    });

    // ==========================================
    // 6. INITIALIZATION
    // ==========================================
    const init = () => {
        injectCSS();
        observer.observe(document.documentElement, { childList: true, subtree: true });
        setInterval(updateClock, 1000);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
