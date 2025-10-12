document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const clockList = document.getElementById('clock-list');
    const cityInput = document.getElementById('city-input');
    const addCityBtn = document.getElementById('add-city-btn');
    const citySuggestions = document.getElementById('city-suggestions');

    // --- STATE MANAGEMENT ---
    let activeCities = [];

    // --- INITIALIZATION ---
    function init() {
        loadState();
        populateSuggestions();
        renderClocks();

        addCityBtn.addEventListener('click', handleAddCity);
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddCity();
        });

        setInterval(updateClocks, 1000);
    }

    // --- DATA & STATE ---
    function loadState() {
        const savedCities = JSON.parse(localStorage.getItem('activeCities'));
        activeCities = (savedCities && savedCities.length > 0) ? savedCities : ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
    }

    function saveState() {
        localStorage.setItem('activeCities', JSON.stringify(activeCities));
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

    // --- RENDERING & UI ---
    function renderClocks() {
        clockList.innerHTML = '';
        activeCities.forEach(timezone => {
            const displayName = timezone.replace(/_/g, ' ').split('/').pop();

            const clockItem = document.createElement('div');
            clockItem.className = 'clock-item';
            clockItem.dataset.timezone = timezone;

            clockItem.innerHTML = `
                <canvas class="analog-clock" width="100" height="100"></canvas>
                <div class="city-info">
                    <h2>${displayName}</h2>
                </div>
                <div class="time-info">
                    <div class="time"></div>
                    <div class="date"></div>
                </div>
            `;
            clockList.appendChild(clockItem);
        });
        updateClocks();
    }

    function updateClocks() {
        document.querySelectorAll('.clock-item').forEach(item => {
            const timezone = item.dataset.timezone;
            const now = moment().tz(timezone);
            item.querySelector('.time').textContent = now.format('h:mm:ss A');
            item.querySelector('.date').textContent = now.format('dddd, MMMM D, YYYY');

            const canvas = item.querySelector('.analog-clock');
            const ctx = canvas.getContext('2d');
            const radius = canvas.height / 2;
            ctx.save();
            ctx.translate(radius, radius);
            drawAnalogClock(ctx, radius, now);
            ctx.restore();
        });
    }

    function drawAnalogClock(ctx, radius, now) {
        ctx.clearRect(-radius, -radius, radius * 2, radius * 2);

        // Draw clock face
        ctx.beginPath();
        ctx.arc(0, 0, radius - 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.closePath();

        // Draw center point
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
        ctx.closePath();

        // Draw clock numbers
        ctx.font = radius * 0.15 + "px arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        for (let num = 1; num <= 12; num++) {
            let ang = num * Math.PI / 6;
            ctx.rotate(ang);
            ctx.translate(0, -radius * 0.85);
            ctx.rotate(-ang);
            ctx.fillText(num.toString(), 0, 0);
            ctx.rotate(ang);
            ctx.translate(0, radius * 0.85);
            ctx.rotate(-ang);
        }


        // Draw clock hands
        const hour = now.hours() % 12;
        const minute = now.minutes();
        const second = now.seconds();

        // Hour
        let hourAngle = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
        drawHand(ctx, hourAngle, radius * 0.5, 4);

        // Minute
        let minuteAngle = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
        drawHand(ctx, minuteAngle, radius * 0.8, 3);

        // Second
        let secondAngle = (second * Math.PI / 30);
        drawHand(ctx, secondAngle, radius * 0.9, 2);
    }

    function drawHand(ctx, pos, length, width) {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.moveTo(0,0);
        ctx.rotate(pos);
        ctx.lineTo(0, -length);
        ctx.stroke();
        ctx.restore();
    }

    init();
});