// ==UserScript==
// @name         Torn Global Event Clock
// @namespace    https://github.com/ShavedW00kie/
// @version      1.2.0
// @description  Draggable global event countdown clock for Torn.com (Desktop & TornPDA)
// @author       ShavedW00kie
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

    // Default configuration state
    const State = {
        pos: Storage.get("pos", { top: 50, left: 50 }),
        useLocalTime: Storage.get("useLocalTime", false),
        localOffset: Storage.get("localOffset", 0), // e.g., -7 for GMT-7
        events: Storage.get("events", {
            hourly: true,
            daily: true,
            weekly: true,
            monthly: true,
            regenEnergy: true,
            regenNerve: true,
            regenHappy: true
        })
    };

    const saveState = () => {
        Storage.set("pos", State.pos);
        Storage.set("useLocalTime", State.useLocalTime);
        Storage.set("localOffset", State.localOffset);
        Storage.set("events", State.events);
    };

    // ==========================================
    // 2. TIME & EVENT PARSER LOGIC
    // ==========================================
    // TCT is strictly UTC.
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
        const nextTargetMin = Math.ceil((minutes + 1) / intervalMinutes) * intervalMinutes;
        let target = new Date(now.getTime());
        target.setUTCHours(now.getUTCHours(), nextTargetMin, 0, 0);
        return target;
    };

    const EventDictionary = [
        // Hourly (XX:00, 15, 30, 45)
        { id: "hourly", name: "Vendors / Territory", getNext: () => getNextInterval(15) },
        
        // Daily
        { id: "daily", name: "Daily Reset (Casino/City)", getNext: () => getNextOccurrence(0, 0) },
        { id: "daily", name: "Virus Coding", getNext: () => getNextOccurrence(3, 25) },
        { id: "daily", name: "Property/Stats Reset", getNext: () => getNextOccurrence(3, 30) },
        { id: "daily", name: "Natural Addiction Decay", getNext: () => getNextOccurrence(3, 31) },
        { id: "daily", name: "Company Effectiveness", getNext: () => getNextOccurrence(18, 0) },
        
        // Weekly (Sunday = 0)
        { id: "weekly", name: "Lotteries", getNext: () => getNextOccurrence(10, 0, 0) },
        { id: "weekly", name: "Newspaper Bazaar", getNext: () => getNextOccurrence(14, 0, 0) },
        { id: "weekly", name: "Company Star Rating", getNext: () => getNextOccurrence(18, 0, 0) },
        
        // Monthly
        { id: "monthly", name: "Subscriber Bonuses", getNext: () => getNextOccurrence(5, 15, null, 1) },

        // Regeneration
        { id: "regenEnergy", name: "Energy (+5)", getNext: () => getNextInterval(10) },
        { id: "regenNerve", name: "Nerve (+1)", getNext: () => getNextInterval(5) },
        { id: "regenHappy", name: "Happiness Soft-cap", getNext: () => getNextInterval(15) }
    ];

    const getNextEvent = () => {
        let closest = null;
        let minDiff = Infinity;
        const now = getTCTDate();

        EventDictionary.forEach(ev => {
            if (!State.events[ev.id]) return;
            const nextTime = ev.getNext();
            const diff = nextTime - now;
            if (diff > 0 && diff < minDiff) {
                minDiff = diff;
                closest = { name: ev.name, target: nextTime, diff };
            }
        });
        return closest;
    };

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
    let menuEl = null;

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
                width: 200px;
                user-select: none;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
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
                text-align: center;
            }
            .torn-clock-time { font-size: 24px; font-weight: bold; color: #4CAF50; margin: 5px 0; }
            .torn-clock-settings-panel {
                display: none;
                margin-top: 10px;
                font-size: 11px;
                border-top: 1px solid #555;
                padding-top: 5px;
            }
            .torn-clock-settings-panel label {
                display: block;
                margin-bottom: 4px;
                cursor: pointer;
            }
            .torn-clock-toggle { cursor: pointer; color: #888; font-size: 10px; text-decoration: underline; text-align: center; display: block; margin-top: 5px;}
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

        clockEl.innerHTML = `
            <div id="torn-clock-header">drag | Torn Clock</div>
            <div id="torn-clock-data">Loading...</div>
            <a class="torn-clock-toggle" id="torn-clock-settings-btn">Settings</a>
            <div class="torn-clock-settings-panel" id="torn-clock-settings">
                <label><input type="checkbox" id="tc-toggle-tct" ${State.useLocalTime ? 'checked' : ''}> Use Local Time</label>
                <label>Offset (hrs): <input type="number" id="tc-offset" value="${State.localOffset}" style="width:40px; background:#333; color:#fff; border:1px solid #555;"></label>
                <hr style="border: 0; border-top: 1px solid #555; margin: 5px 0;">
                <label><input type="checkbox" data-ev="hourly" ${State.events.hourly ? 'checked' : ''}> Hourly Events</label>
                <label><input type="checkbox" data-ev="daily" ${State.events.daily ? 'checked' : ''}> Daily Events</label>
                <label><input type="checkbox" data-ev="weekly" ${State.events.weekly ? 'checked' : ''}> Weekly Events</label>
                <label><input type="checkbox" data-ev="monthly" ${State.events.monthly ? 'checked' : ''}> Monthly Events</label>
                <label><input type="checkbox" data-ev="regenEnergy" ${State.events.regenEnergy ? 'checked' : ''}> Energy Regen</label>
                <label><input type="checkbox" data-ev="regenNerve" ${State.events.regenNerve ? 'checked' : ''}> Nerve Regen</label>
                <label><input type="checkbox" data-ev="regenHappy" ${State.events.regenHappy ? 'checked' : ''}> Happy Regen</label>
            </div>
        `;

        document.body.appendChild(clockEl);
        clockDataEl = document.getElementById("torn-clock-data");

        initDrag();
        initSettings();
    };

    // ==========================================
    // 4. DRAG & EVENT BINDINGS (DESKTOP + PDA)
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
            
            // Constrain to viewport
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
        });

        document.getElementById("tc-toggle-tct").addEventListener("change", (e) => {
            State.useLocalTime = e.target.checked;
            saveState();
        });

        document.getElementById("tc-offset").addEventListener("input", (e) => {
            State.localOffset = parseFloat(e.target.value) || 0;
            saveState();
        });

        const evToggles = clockEl.querySelectorAll('input[data-ev]');
        evToggles.forEach(chk => {
            chk.addEventListener("change", (e) => {
                const evKey = e.target.getAttribute("data-ev");
                State.events[evKey] = e.target.checked;
                saveState();
            });
        });
    };

    // ==========================================
    // 5. OBSERVERS & CLOCK TICK
    // ==========================================
    const updateClock = () => {
        if (!clockDataEl) return;
        
        // Base clock calculation
        const now = getTCTDate();
        let displayHour = now.getUTCHours();
        
        if (State.useLocalTime) {
            displayHour = (displayHour + State.localOffset + 24) % 24;
        }

        const clockTimeStr = `${displayHour.toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} ${State.useLocalTime ? 'Local' : 'TCT'}`;

        const nextEv = getNextEvent();
        
        let html = `<div>${clockTimeStr}</div>`;
        if (nextEv) {
            html += `<div style="margin-top: 8px; color: #aaa; font-size: 11px;">Next: ${nextEv.name}</div>
                     <div class="torn-clock-time">${formatTime(nextEv.diff)}</div>`;
        } else {
            html += `<div style="margin-top: 8px; color: #888;">No events tracked</div>`;
        }

        clockDataEl.innerHTML = html;
    };

    const observer = new MutationObserver((mutations) => {
        // Passively check if body is ready and UI needs injection
        if (document.body && !document.getElementById("torn-clock-widget")) {
            renderClockUI();
        }
    });

    // ==========================================
    // 6. INITIALIZATION
    // ==========================================
    const init = () => {
        injectCSS();
        
        // Start watching the DOM to safely inject UI outside of React unmount cycles
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // Tick loop (Strict constraint: ONLY used for the actual second-by-second countdown, not DOM loading)
        setInterval(updateClock, 1000);
    };

    // Wait for native head/body to begin forming before execution
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
