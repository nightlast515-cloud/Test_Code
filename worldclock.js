document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const themeSwitcher = document.getElementById('theme-switcher');
    const clockContainer = document.getElementById('clock-container');
    const citySearchInput = document.getElementById('city-search-input');
    const addClockButton = document.getElementById('add-clock-button');
    const citySuggestions = document.getElementById('city-suggestions');
    const planMeetingButton = document.getElementById('plan-meeting-button');
    const schedulerPanel = document.getElementById('scheduler-panel');
    const schedulerClockList = document.getElementById('scheduler-clock-list');
    const findTimesButton = document.getElementById('find-times-button');
    const schedulerResults = document.getElementById('scheduler-results');

    // --- STATE MANAGEMENT ---
    let activeClocks = [];
    let clockUpdateInterval = null;
    let reminders = {};

    // --- CORE FUNCTIONS ---
    function loadClocks() {
        const savedClocks = JSON.parse(localStorage.getItem('activeClocks'));
        activeClocks = (savedClocks && savedClocks.length > 0) ? savedClocks : ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
    }

    function saveClocks() {
        localStorage.setItem('activeClocks', JSON.stringify(activeClocks));
    }

    function addClock(timezone) {
        if (!timezone || !moment.tz.zone(timezone)) {
            alert('Invalid timezone. Please select a valid one from the list.');
            return;
        }
        if (activeClocks.includes(timezone)) return;
        activeClocks.push(timezone);
        saveClocks();
        renderClocks();
    }

    function removeClock(timezone) {
        activeClocks = activeClocks.filter(tz => tz !== timezone);
        delete reminders[timezone];
        saveClocks();
        saveReminders();
        renderClocks();
    }

    function loadReminders() {
        const savedReminders = JSON.parse(localStorage.getItem('reminders'));
        if (savedReminders) {
            reminders = savedReminders;
        }
    }

    function saveReminders() {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }

    function setReminder(timezone, eventName, time) {
        if (!eventName || !time) {
            alert('Please enter both an event name and a time.');
            return;
        }
        reminders[timezone] = { name: eventName, time: time };
        saveReminders();
        updateAllClockDisplays();
    }

    async function fetchAndDisplayHolidays(timezone) {
        const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
        const holidayListContainer = document.getElementById(`holiday-list-${timezoneId}`);
        const countryCode = moment.tz.zone(timezone)?.countries()[0];

        if (!countryCode) {
            holidayListContainer.innerHTML = '<p>Holiday data not available for this location.</p>';
            holidayListContainer.classList.toggle('hidden');
            return;
        }

        if (holidayListContainer.innerHTML !== '' && !holidayListContainer.classList.contains('hidden')) {
            holidayListContainer.classList.add('hidden');
            return;
        }

        try {
            holidayListContainer.innerHTML = '<p>Loading holidays...</p>';
            holidayListContainer.classList.remove('hidden');

            const year = new Date().getFullYear();
            const apiKey = 'VTjPTMBTunsj3E3JpHAgFGXL5thPX9FV';
            const response = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`);
            const data = await response.json();

            if (!data.response || !data.response.holidays || data.response.holidays.length === 0) {
                holidayListContainer.innerHTML = '<p>No public holidays found for this year.</p>';
                return;
            }

            let holidayHTML = '<ul>';
            data.response.holidays.forEach(holiday => {
                holidayHTML += `<li><strong>${moment(holiday.date.iso).format('MMM D')}:</strong> ${holiday.name}</li>`;
            });
            holidayHTML += '</ul>';
            holidayListContainer.innerHTML = holidayHTML;

        } catch (error) {
            console.error(`Failed to fetch holidays for ${countryCode}:`, error);
            holidayListContainer.innerHTML = '<p>Could not load holiday data.</p>';
        }
    }

    function populateSuggestions() {
        citySuggestions.innerHTML = moment.tz.names().map(tz => `<option value="${tz}"></option>`).join('');
    }

    function renderClocks() {
        clockContainer.innerHTML = '';
        activeClocks.forEach(timezone => {
            const countryCode = moment.tz.zone(timezone)?.countries()[0]?.toLowerCase() || 'xx';
            const displayName = timezone.replace(/_/g, ' ').split('/').pop();
            const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
            const clockElement = document.createElement('div');
            clockElement.className = 'clock';
            clockElement.dataset.timezone = timezone;
            clockElement.innerHTML = `
                <input type="checkbox" class="scheduler-checkbox" data-timezone="${timezone}">
                <button class="remove-clock-button" title="Remove Clock">&times;</button>
                <div class="country-header">
                    <img src="https://flagsapi.com/${countryCode.toUpperCase()}/shiny/32.png" alt="" class="flag">
                    <h2>${displayName}</h2>
                    <button class="holiday-button" title="View Holidays">📅</button>
                    <span id="day-night-${timezoneId}" class="day-night-icon"></span>
                </div>
                <canvas id="analog-${timezoneId}" class="analog-clock" width="150" height="150"></canvas>
                <div id="digital-time-${timezoneId}" class="time"></div>
                <div class="date-tz-container">
                    <span id="digital-date-${timezoneId}" class="date"></span>
                    <span id="timezone-${timezoneId}" class="timezone"></span>
                </div>
                <div class="event-banner" id="event-banner-${timezoneId}"></div>
                <div class="holiday-list-container hidden" id="holiday-list-${timezoneId}"></div>
                <div class="reminder-form">
                    <input type="text" class="reminder-input" placeholder="Event name...">
                    <input type="time" class="reminder-time">
                    <button class="set-reminder-button">Set</button>
                </div>
                <div class="reminder-countdown" id="reminder-countdown-${timezoneId}"></div>
            `;
            clockContainer.appendChild(clockElement);
        });
        updateAllClockDisplays();
    }

    function updateAllClockDisplays() {
        activeClocks.forEach(timezone => {
            const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
            const momentDate = moment().tz(timezone);
            const digitalTimeEl = document.getElementById(`digital-time-${timezoneId}`);
            if (!digitalTimeEl) return;
            digitalTimeEl.innerText = momentDate.format('h:mm:ss A');
            document.getElementById(`digital-date-${timezoneId}`).innerText = momentDate.format('dddd, MMMM D, YYYY');
            document.getElementById(`timezone-${timezoneId}`).innerText = momentDate.format('z');
            const localHour = momentDate.hour();
            const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="day-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
            const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="night-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
            document.getElementById(`day-night-${timezoneId}`).innerHTML = (localHour >= 6 && localHour < 18) ? sunIcon : moonIcon;
            drawAnalogClock(document.getElementById(`analog-${timezoneId}`), momentDate);
            updateEventBanner(timezone, momentDate);
            updateReminderCountdown(timezone, momentDate);
        });
    }

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
        ctx.font = `${radius * 0.15}px arial`; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillStyle = colors.numbers;
        for (let num = 1; num < 13; num++) {
            let ang = num * Math.PI / 6;
            ctx.rotate(ang); ctx.translate(0, -radius * 0.8); ctx.rotate(-ang); ctx.fillText(num.toString(), 0, 0);
            ctx.rotate(ang); ctx.translate(0, radius * 0.8); ctx.rotate(-ang);
        }
        const hourAngle = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
        drawHand(ctx, hourAngle, radius * 0.5, radius * 0.07, colors.hands);
        const minuteAngle = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
        drawHand(ctx, minuteAngle, radius * 0.75, radius * 0.07, colors.hands);
        const secondAngle = second * Math.PI / 30;
        drawHand(ctx, secondAngle, radius * 0.85, radius * 0.02, colors.accent);
        ctx.translate(-radius, -radius);
    }

    function drawHand(ctx, pos, length, width, color) {
        ctx.beginPath(); ctx.lineWidth = width; ctx.lineCap = "round"; ctx.strokeStyle = color;
        ctx.moveTo(0, 0); ctx.rotate(pos); ctx.lineTo(0, -length); ctx.stroke(); ctx.rotate(-pos);
    }

    function updateReminderCountdown(timezone, momentDate) {
        const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
        const countdownEl = document.getElementById(`reminder-countdown-${timezoneId}`);
        if (!countdownEl) return;

        const reminder = reminders[timezone];
        if (reminder) {
            const [hours, minutes] = reminder.time.split(':');
            const reminderTime = momentDate.clone().hour(hours).minute(minutes).second(0);

            if (momentDate.isAfter(reminderTime)) {
                countdownEl.textContent = `${reminder.name} has passed.`;
            } else {
                const diff = moment.duration(reminderTime.diff(momentDate));
                countdownEl.textContent = `${reminder.name} in ${diff.hours()}h ${diff.minutes()}m ${diff.seconds()}s`;
            }
        } else {
            countdownEl.textContent = '';
        }
    }

    async function updateEventBanner(timezone, momentDate) {
        const timezoneId = timezone.replace(/[^a-zA-Z0-9]/g, '-');
        const banner = document.getElementById(`event-banner-${timezoneId}`);
        if (!banner) return;

        // Check for public holiday
        const countryCode = moment.tz.zone(timezone)?.countries()[0];
        if (countryCode) {
            const year = momentDate.year();
            const apiKey = 'VTjPTMBTunsj3E3JpHAgFGXL5thPX9FV';
            const response = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}&month=${momentDate.month() + 1}&day=${momentDate.date()}`);
            const data = await response.json();
            if (data.response && data.response.holidays && data.response.holidays.length > 0) {
                banner.textContent = `Public Holiday: ${data.response.holidays[0].name}`;
                return;
            }
        }

        // Check for business hours
        const localHour = momentDate.hour();
        if (localHour < 9 || localHour >= 17) {
            banner.textContent = 'After Business Hours';
        } else {
            banner.textContent = 'Business Hours';
        }
    }

    function setTheme(theme) {
        document.body.dataset.theme = theme;
        localStorage.setItem('theme', theme);
        themeSwitcher.checked = theme === 'dark';
        updateAllClockDisplays();
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
        themeSwitcher.addEventListener('change', () => setTheme(themeSwitcher.checked ? 'dark' : 'light'));
    }

    function init() {
        initTheme();
        populateSuggestions();
        loadClocks();
        loadReminders();
        renderClocks();
        addClockButton.addEventListener('click', () => { addClock(citySearchInput.value); citySearchInput.value = ''; });
        citySearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { addClock(citySearchInput.value); citySearchInput.value = ''; } });
        clockContainer.addEventListener('click', (e) => {
            const clockElement = e.target.closest('.clock');
            if (!clockElement) return;

            if (e.target.classList.contains('remove-clock-button')) {
                removeClock(clockElement.dataset.timezone);
            }
            if (e.target.classList.contains('holiday-button')) {
                fetchAndDisplayHolidays(clockElement.dataset.timezone);
            }
            if (e.target.classList.contains('set-reminder-button')) {
                const reminderInput = clockElement.querySelector('.reminder-input');
                const reminderTime = clockElement.querySelector('.reminder-time');
                setReminder(clockElement.dataset.timezone, reminderInput.value, reminderTime.value);
            }
        });
        clockUpdateInterval = setInterval(updateAllClockDisplays, 1000);

        planMeetingButton.addEventListener('click', () => {
            schedulerPanel.classList.toggle('hidden');
            populateSchedulerClockList();
        });

        findTimesButton.addEventListener('click', () => {
            const selectedTimezones = Array.from(schedulerClockList.querySelectorAll('input:checked')).map(input => input.dataset.timezone);
            if (selectedTimezones.length < 2) {
                alert('Please select at least two cities to compare.');
                return;
            }
            findGoodMeetingTimes(selectedTimezones);
        });
    }

    function populateSchedulerClockList() {
        schedulerClockList.innerHTML = '';
        activeClocks.forEach(timezone => {
            const displayName = timezone.replace(/_/g, ' ').split('/').pop();
            const item = document.createElement('div');
            item.className = 'scheduler-clock-item';
            item.innerHTML = `
                <input type="checkbox" id="scheduler-${timezone}" data-timezone="${timezone}">
                <label for="scheduler-${timezone}">${displayName}</label>
            `;
            schedulerClockList.appendChild(item);
        });
    }

    function findGoodMeetingTimes(timezones) {
        const businessHours = { start: 9, end: 17 }; // 9 AM to 5 PM
        let bestSlots = [];

        // Check for every hour in a 24-hour period
        for (let i = 0; i < 24; i++) {
            const universalTime = moment.utc().hour(i).minute(0).second(0);
            let allGood = true;
            let slot = { universalTime: universalTime, localTimes: [] };

            for (const tz of timezones) {
                const localTime = universalTime.clone().tz(tz);
                const localHour = localTime.hour();

                if (localHour < businessHours.start || localHour >= businessHours.end) {
                    allGood = false;
                    break;
                }
                slot.localTimes.push({ timezone: tz, time: localTime.format('h A') });
            }

            if (allGood) {
                bestSlots.push(slot);
            }
        }

        displayMeetingResults(bestSlots);
    }

    function displayMeetingResults(slots) {
        if (slots.length === 0) {
            schedulerResults.innerHTML = '<p>No overlapping business hours found for the selected cities.</p>';
            return;
        }

        let html = '<h4>Good Meeting Times:</h4><ul>';
        slots.forEach(slot => {
            html += `<li>`;
            slot.localTimes.forEach(lt => {
                html += `<strong>${lt.timezone.split('/').pop().replace(/_/g, ' ')}:</strong> ${lt.time} | `;
            });
            html = html.slice(0, -2); // Remove trailing separator
            html += `</li>`;
        });
        html += '</ul>';
        schedulerResults.innerHTML = html;
    }

    init();
});