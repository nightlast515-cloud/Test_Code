document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const clockList = document.getElementById('clock-list');
    const cityInput = document.getElementById('city-input');
    const addCityBtn = document.getElementById('add-city-btn');
    const citySuggestions = document.getElementById('city-suggestions');
    const holidayModal = document.getElementById('holiday-modal');
    const modalCityName = document.getElementById('modal-city-name');
    const holidayList = document.getElementById('holiday-list');
    const modalCloseBtn = document.querySelector('.modal-close-btn');
    const planMeetingBtn = document.getElementById('plan-meeting-btn');
    const schedulerContainer = document.getElementById('scheduler-container');

    // --- STATE MANAGEMENT ---
    let activeCities = [];
    let reminders = {}; // format: { timezone: "YYYY-MM-DDTHH:mm" }
    let isPlanning = false;

    // --- API KEYS ---
    const CALENDARIFIC_API_KEY = 'VTjPTMBTunsj3E3JpHAgFGXL5thPX9FV';

    // --- INITIALIZATION ---
    function init() {
        loadState();
        populateSuggestions();
        renderClocks();

        addCityBtn.addEventListener('click', handleAddCity);
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddCity();
        });

        planMeetingBtn.addEventListener('click', togglePlanningMode);

        modalCloseBtn.addEventListener('click', () => holidayModal.classList.add('hidden'));
        holidayModal.addEventListener('click', (e) => {
            if (e.target === holidayModal) holidayModal.classList.add('hidden');
        });

        setInterval(updateClocks, 1000);
    }

    // --- DATA & STATE ---
    function loadState() {
        const savedCities = JSON.parse(localStorage.getItem('activeCities'));
        activeCities = (savedCities && savedCities.length > 0) ? savedCities : ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];

        const savedReminders = JSON.parse(localStorage.getItem('reminders'));
        if (savedReminders) reminders = savedReminders;
    }

    function saveState() {
        localStorage.setItem('activeCities', JSON.stringify(activeCities));
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }

    function handleAddCity() {
        const timezone = cityInput.value;
        if (!timezone || !moment.tz.zone(timezone)) {
            alert('Invalid timezone. Please select a valid one from the list.');
            return;
        }
        if (activeCities.includes(timezone)) {
            alert(`${timezone} is already in the list.`);
            return;
        }
        activeCities.push(timezone);
        cityInput.value = '';
        saveState();
        renderClocks();
    }

    function populateSuggestions() {
        citySuggestions.innerHTML = moment.tz.names().map(tz => `<option value="${tz}"></option>`).join('');
    }

    function togglePlanningMode() {
        isPlanning = !isPlanning;
        schedulerContainer.classList.toggle('hidden', !isPlanning);
        planMeetingBtn.textContent = isPlanning ? 'Exit Planning Mode' : 'Plan a Meeting';
        planMeetingBtn.style.backgroundColor = isPlanning ? '#c0392b' : 'var(--primary-color)';

        document.querySelectorAll('.clock-item').forEach(item => {
            item.classList.toggle('planning-mode', isPlanning);
            item.querySelector('.select-checkbox').classList.toggle('hidden', !isPlanning);
        });

        if (!isPlanning) {
            // Clear the timeline when exiting planning mode
            document.getElementById('timeline-container').innerHTML = '';
        }
    }

    // --- RENDERING & UI ---
    function renderClocks() {
        clockList.innerHTML = '';
        activeCities.forEach(timezone => {
            const countryCode = moment.tz.zone(timezone)?.countries()[0] || '';
            const displayName = timezone.replace(/_/g, ' ').split('/').pop();

            const clockItem = document.createElement('div');
            clockItem.className = 'clock-item';
            clockItem.dataset.timezone = timezone;

            clockItem.innerHTML = `
                <input type="checkbox" class="select-checkbox hidden">
                <div class="city-info">
                    <h2>${displayName}</h2>
                    <span class="country">${countryCode}</span>
                </div>
                <div class="time-info">
                    <div class="time"></div>
                    <div class="date"></div>
                </div>
                <div class="actions">
                    <button class="holiday-btn">View Holidays</button>
                    <button class="reminder-btn">Set Reminder</button>
                    <div class="countdown"></div>
                </div>
            `;
            clockList.appendChild(clockItem);
        });
        addEventListenersToButtons();
        updateClocks();
    }

    function updateClocks() {
        document.querySelectorAll('.clock-item').forEach(item => {
            const timezone = item.dataset.timezone;
            const now = moment().tz(timezone);
            item.querySelector('.time').textContent = now.format('h:mm:ss A');
            item.querySelector('.date').textContent = now.format('dddd, MMMM D, YYYY');
            updateCountdown(item, timezone);
        });
    }

    function addEventListenersToButtons() {
        // Add listeners to checkboxes for timeline updates
        document.querySelectorAll('.select-checkbox').forEach(box => {
            box.addEventListener('change', renderTimeline);
        });

        document.querySelectorAll('.holiday-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timezone = e.target.closest('.clock-item').dataset.timezone;
                showHolidays(timezone);
            });
        });

        document.querySelectorAll('.reminder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timezone = e.target.closest('.clock-item').dataset.timezone;
                const newReminder = prompt('Enter reminder date and time (YYYY-MM-DD HH:mm)', reminders[timezone] ? reminders[timezone].replace('T', ' ') : '');
                if (newReminder) {
                    reminders[timezone] = newReminder.replace(' ', 'T');
                    saveState();
                    updateClocks();
                }
            });
        });
    }

    // --- FEATURES ---
    async function showHolidays(timezone) {
        const countryCode = moment.tz.zone(timezone)?.countries()[0];
        if (!countryCode) {
            alert('Could not determine country for this timezone.');
            return;
        }

        modalCityName.textContent = `Public Holidays in ${timezone.replace(/_/g, ' ')}`;
        holidayList.innerHTML = '<li>Loading...</li>';
        holidayModal.classList.remove('hidden');

        try {
            const year = new Date().getFullYear();
            const response = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=${countryCode}&year=${year}`);
            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const data = await response.json();

            if (data.response.holidays.length === 0) {
                holidayList.innerHTML = '<li>No holidays found for this year.</li>';
                return;
            }

            holidayList.innerHTML = data.response.holidays.map(h => `
                <li>
                    <strong>${h.name}</strong> - ${h.date.iso}
                </li>
            `).join('');

        } catch (error) {
            console.error('Failed to fetch holidays:', error);
            holidayList.innerHTML = '<li>Could not fetch holiday data. Please check your API key and network connection.</li>';
        }
    }

    function updateCountdown(clockItem, timezone) {
        const countdownEl = clockItem.querySelector('.countdown');
        if (reminders[timezone]) {
            const reminderTime = moment(reminders[timezone]);
            const now = moment();
            if (reminderTime.isAfter(now)) {
                const duration = moment.duration(reminderTime.diff(now));
                const days = Math.floor(duration.asDays());
                const hours = duration.hours();
                const minutes = duration.minutes();
                countdownEl.textContent = `Reminder in: ${days}d ${hours}h ${minutes}m`;
            } else {
                countdownEl.textContent = 'Reminder passed.';
            }
        } else {
            countdownEl.textContent = '';
        }
    }

    async function renderTimeline() {
        const timelineContainer = document.getElementById('timeline-container');
        const selectedTimezones = Array.from(document.querySelectorAll('.select-checkbox:checked'))
            .map(box => box.closest('.clock-item').dataset.timezone);

        if (selectedTimezones.length === 0) {
            timelineContainer.innerHTML = '<p>Select one or more cities to see the timeline.</p>';
            return;
        }

        timelineContainer.innerHTML = '<p>Loading scheduler...</p>';

        const holidayData = await fetchAllHolidays(selectedTimezones);

        let tableHTML = '<table class="timeline-table"><thead><tr><th class="city-name-cell">City</th>';
        const now = moment();
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                if (hour === 0) {
                    tableHTML += `<th colspan="24">${now.clone().add(day, 'days').format('ddd, MMM D')}</th>`;
                    break;
                }
            }
        }
        tableHTML += '</tr><tr><th class="city-name-cell">&nbsp;</th>';
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                tableHTML += `<th>${hour}</th>`;
            }
        }
        tableHTML += '</tr></thead><tbody>';

        const cityHourData = selectedTimezones.map(tz => {
            return Array.from({ length: 7 * 24 }, (_, i) => {
                const day = Math.floor(i / 24);
                const hour = i % 24;
                const localHour = now.clone().add(day, 'days').tz(tz).startOf('day').add(hour, 'hours').hour();
                return localHour >= 9 && localHour < 17;
            });
        });

        const overlapHours = Array.from({ length: 7 * 24 }, (_, i) => {
            return selectedTimezones.length > 0 && cityHourData.every(cityHours => cityHours[i]);
        });

        selectedTimezones.forEach((tz, cityIndex) => {
            const displayName = tz.replace(/_/g, ' ').split('/').pop();
            tableHTML += `<tr><td class="city-name-cell">${displayName}</td>`;
            const countryCode = moment.tz.zone(tz)?.countries()[0] || '';
            const cityHolidays = holidayData[countryCode] || [];

            for (let i = 0; i < 7 * 24; i++) {
                const day = Math.floor(i / 24);
                const hour = i % 24;
                const hourMoment = now.clone().add(day, 'days').tz(tz).startOf('day').add(hour, 'hours');
                let cellClass = 'hour-cell';

                if (cityHourData[cityIndex][i]) {
                    cellClass += ' business-hours';
                }
                if (overlapHours[i]) {
                    cellClass += ' overlap';
                }

                const isHoliday = cityHolidays.some(h => moment(h.date.iso).isSame(hourMoment, 'day'));
                if (isHoliday) {
                    cellClass = 'hour-cell conflict'; // Holiday overrides other styles
                }

                const reminderForHour = reminders[tz] && moment(reminders[tz]).isSame(hourMoment, 'hour');
                if (reminderForHour) {
                    cellClass += ' reminder';
                }

                tableHTML += `<td class="${cellClass}"></td>`;
            }
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        timelineContainer.innerHTML = tableHTML;
    }

    async function fetchAllHolidays(timezones) {
        const holidayData = {};
        const promises = timezones.map(async tz => {
            const countryCode = moment.tz.zone(tz)?.countries()[0];
            if (countryCode && !holidayData[countryCode]) {
                try {
                    const year = new Date().getFullYear();
                    const response = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=${countryCode}&year=${year}`);
                    if (!response.ok) return;
                    const data = await response.json();
                    holidayData[countryCode] = data.response.holidays;
                } catch (error) {
                    console.error(`Failed to fetch holidays for ${countryCode}:`, error);
                }
            }
        });
        await Promise.all(promises);
        return holidayData;
    }

    init();
});