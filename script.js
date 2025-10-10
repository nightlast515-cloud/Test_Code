document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const themeSwitcher = document.getElementById('theme-switcher');
    const clockContainer = document.getElementById('clock-container');
    const citySearchInput = document.getElementById('city-search-input');
    const addClockButton = document.getElementById('add-clock-button');
    const citySuggestions = document.getElementById('city-suggestions');

    // --- STATE MANAGEMENT ---
    let activeClocks = [];
    let clockUpdateInterval;

    // --- DATA MODEL for Market Hours ---
    const marketHours = {
        'America/New_York': [{ open: '09:30', close: '16:00' }], // NYSE
        'Europe/London': [{ open: '08:00', close: '16:30' }], // LSE
        'Asia/Tokyo': [ // TSE
            { open: '09:00', close: '11:30' },
            { open: '12:30', close: '15:00' }
        ],
        'Asia/Hong_Kong': [ // HKEX
            { open: '09:30', close: '12:00' },
            { open: '13:00', close: '16:00' }
        ]
    };

    // --- CORE FUNCTIONS ---
    function loadClocks() {
        const savedClocks = JSON.parse(localStorage.getItem('activeClocks'));
        if (savedClocks && savedClocks.length > 0) {
            activeClocks = savedClocks;
        } else {
            activeClocks = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Asia/Hong_Kong'];
        }
    }

    function saveClocks() {
        localStorage.setItem('activeClocks', JSON.stringify(activeClocks));
    }

    function addClock(timezone) {
        if (!timezone || !moment.tz.zone(timezone)) {
            alert('Invalid timezone. Please select a valid one from the list.');
            return;
        }
        if (activeClocks.includes(timezone)) {
            alert(`${timezone.replace(/_/g, ' ')} is already on your dashboard.`);
            return;
        }
        activeClocks.push(timezone);
        saveClocks();
        renderClocks();
    }

    function removeClock(timezone) {
        activeClocks = activeClocks.filter(tz => tz !== timezone);
        saveClocks();
        renderClocks();
    }

    function populateSuggestions() {
        const allTimezones = moment.tz.names();
        citySuggestions.innerHTML = allTimezones.map(tz => `<option value="${tz}"></option>`).join('');
    }

    // --- RENDERING & UI ---
    function renderClocks() {
        clockContainer.innerHTML = '';
        activeClocks.forEach(timezone => {
            const countryCode = moment.tz.zone(timezone)?.countries()[0]?.toLowerCase() || 'xx';
            const displayName = timezone.replace(/_/g, ' ').split('/').pop();
            const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');

            const clockElement = document.createElement('div');
            clockElement.classList.add('clock');
            clockElement.setAttribute('data-timezone', timezone);

            clockElement.innerHTML = `
                <button class="remove-clock-button" title="Remove Clock">&times;</button>
                <div class="country-header">
                    <img src="https://flagsapi.com/${countryCode.toUpperCase()}/shiny/32.png" alt="" class="flag">
                    <h2>${displayName}</h2>
                    <span id="day-night-${timezoneId}" class="day-night-icon"></span>
                </div>
                <canvas id="analog-${timezoneId}" class="analog-clock" width="150" height="150"></canvas>
                <div id="digital-time-${timezoneId}" class="time"></div>
                <div class="date-tz-container">
                    <span id="digital-date-${timezoneId}" class="date"></span>
                    <span id="timezone-${timezoneId}" class="timezone"></span>
                </div>
                <div class="activity-timeline-container">
                    <div id="timeline-bar-container-${timezoneId}"></div>
                    <div class="current-time-marker" id="timeline-marker-${timezoneId}"></div>
                </div>
                <div class="market-status" id="market-status-${timezoneId}"></div>
            `;
            clockContainer.appendChild(clockElement);
        });
        // Draw the timeline bars once on render
        activeClocks.forEach(drawTimelineBars);
        updateAllClockDisplays();
    }

    function updateAllClockDisplays() {
        const now = new Date();
        activeClocks.forEach(timezone => {
            const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
            const momentDate = moment(now).tz(timezone);

            document.getElementById(`digital-time-${timezoneId}`).innerText = momentDate.format('h:mm:ss A');
            document.getElementById(`digital-date-${timezoneId}`).innerText = momentDate.format('dddd, MMMM D, YYYY');
            document.getElementById(`timezone-${timezoneId}`).innerText = momentDate.format('z');

            const localHour = momentDate.hour();
            const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="day-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
            const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="night-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
            document.getElementById(`day-night-${timezoneId}`).innerHTML = (localHour >= 6 && localHour < 18) ? sunIcon : moonIcon;

            drawAnalogClock(document.getElementById(`analog-${timezoneId}`), momentDate);
            updateActivityTimeline(timezone, momentDate);
        });
    }

    // --- ACTIVITY TIMELINE LOGIC ---
    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function drawTimelineBars(timezone) {
        const sessions = marketHours[timezone];
        const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
        const container = document.getElementById(`timeline-bar-container-${timezoneId}`);
        if (!sessions || !container) return;

        container.innerHTML = ''; // Clear old bars
        sessions.forEach(session => {
            const openMin = timeToMinutes(session.open);
            const closeMin = timeToMinutes(session.close);
            const startPercent = (openMin / 1440) * 100;
            const widthPercent = ((closeMin - openMin) / 1440) * 100;

            const bar = document.createElement('div');
            bar.className = 'activity-timeline-bar';
            bar.style.left = `${startPercent}%`;
            bar.style.width = `${widthPercent}%`;
            container.appendChild(bar);
        });
    }

    function getMarketStatus(timezone, now) {
        const sessions = marketHours[timezone];
        if (!sessions) return { text: '', class: '' };

        // Handle weekends
        const dayOfWeek = now.day();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return { text: 'Market Closed', class: 'closed' };
        }

        const nowInMinutes = now.hour() * 60 + now.minute();

        // Check if currently in an open session
        for (const session of sessions) {
            const openMin = timeToMinutes(session.open);
            const closeMin = timeToMinutes(session.close);
            if (nowInMinutes >= openMin && nowInMinutes < closeMin) {
                const closeTime = now.clone().hour(session.close.split(':')[0]).minute(session.close.split(':')[1]).second(0);
                const diff = moment.duration(closeTime.diff(now));
                return { text: `Closes in ${diff.hours()}h ${Math.ceil(diff.minutes())}m`, class: 'open' };
            }
        }

        // If not open, find the next opening time
        let nextOpenSession = null;
        for (const session of sessions) {
            const openMin = timeToMinutes(session.open);
            if (nowInMinutes < openMin) {
                nextOpenSession = session;
                break;
            }
        }

        let openTime;
        if (nextOpenSession) { // Opens later today
            openTime = now.clone().hour(nextOpenSession.open.split(':')[0]).minute(nextOpenSession.open.split(':')[1]).second(0);
        } else { // Opens on the next trading day
            let nextDay = now.clone().add(1, 'day');
            while (nextDay.day() === 0 || nextDay.day() === 6) { // Skip weekends
                nextDay.add(1, 'day');
            }
            const nextOpenTimeStr = sessions[0].open;
            openTime = nextDay.hour(nextOpenTimeStr.split(':')[0]).minute(nextOpenTimeStr.split(':')[1]).second(0);
        }

        const diff = moment.duration(openTime.diff(now));
        return { text: `Opens in ${Math.floor(diff.asHours())}h ${Math.ceil(diff.minutes()) % 60}m`, class: 'closed' };
    }

    function updateActivityTimeline(timezone, momentDate) {
        const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
        const marker = document.getElementById(`timeline-marker-${timezoneId}`);
        const statusEl = document.getElementById(`market-status-${timezoneId}`);

        const minutesIntoDay = momentDate.hour() * 60 + momentDate.minute();
        marker.style.left = `${(minutesIntoDay / 1440) * 100}%`;

        const status = getMarketStatus(timezone, momentDate);
        statusEl.textContent = status.text;
        statusEl.className = `market-status ${status.class}`;
    }

    // --- ANALOG CLOCK DRAWING ---
    function drawAnalogClock(canvas, momentDate) {
        if (!canvas) return;
        const style = getComputedStyle(document.body);
        const colors = {
            face: style.getPropertyValue('--analog-face-bg'), border: style.getPropertyValue('--analog-border-color'),
            centerDot: style.getPropertyValue('--analog-center-dot'), numbers: style.getPropertyValue('--analog-number-color'),
            hands: style.getPropertyValue('--analog-hand-color'), accent: style.getPropertyValue('--accent-color')
        };
        const ctx = canvas.getContext('2d');
        const radius = canvas.height / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(radius, radius);

        const hour = momentDate.hour() % 12;
        const minute = momentDate.minute();
        const second = momentDate.second();

        ctx.beginPath(); ctx.arc(0, 0, radius * 0.95, 0, 2 * Math.PI); ctx.fillStyle = colors.face; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.95, 0, 2 * Math.PI); ctx.strokeStyle = colors.border; ctx.lineWidth = radius * 0.05; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.05, 0, 2 * Math.PI); ctx.fillStyle = colors.centerDot; ctx.fill();

        ctx.font = radius * 0.15 + "px arial"; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillStyle = colors.numbers;
        for (let num = 1; num < 13; num++) {
            let ang = num * Math.PI / 6;
            ctx.rotate(ang); ctx.translate(0, -radius * 0.8); ctx.rotate(-ang); ctx.fillText(num.toString(), 0, 0);
            ctx.rotate(ang); ctx.translate(0, radius * 0.8); ctx.rotate(-ang);
        }

        const hourAngle = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
        drawHand(ctx, hourAngle, radius * 0.5, radius * 0.07, colors.hands);
        const minuteAngle = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
        drawHand(ctx, minuteAngle, radius * 0.75, radius * 0.07, colors.hands);
        const secondAngle = (second * Math.PI / 30);
        drawHand(ctx, secondAngle, radius * 0.85, radius * 0.02, colors.accent);

        ctx.translate(-radius, -radius);
    }

    function drawHand(ctx, pos, length, width, color) {
        ctx.beginPath(); ctx.lineWidth = width; ctx.lineCap = "round"; ctx.strokeStyle = color;
        ctx.moveTo(0, 0); ctx.rotate(pos); ctx.lineTo(0, -length); ctx.stroke(); ctx.rotate(-pos);
    }

    // --- THEME LOGIC ---
    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeSwitcher.checked = theme === 'dark';
        activeClocks.forEach(drawTimelineBars);
        updateAllClockDisplays();
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
        themeSwitcher.addEventListener('change', () => setTheme(themeSwitcher.checked ? 'dark' : 'light'));
    }

    // --- INITIALIZATION ---
    function init() {
        initTheme();
        populateSuggestions();
        loadClocks();
        renderClocks();

        addClockButton.addEventListener('click', () => { addClock(citySearchInput.value); citySearchInput.value = ''; });
        citySearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { addClock(citySearchInput.value); citySearchInput.value = ''; } });
        clockContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-clock-button')) {
                const clockElement = e.target.closest('.clock');
                removeClock(clockElement.getAttribute('data-timezone'));
            }
        });

        if (clockUpdateInterval) clearInterval(clockUpdateInterval);
        clockUpdateInterval = setInterval(updateAllClockDisplays, 1000);
    }

    init();
});