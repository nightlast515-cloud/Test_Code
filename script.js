document.addEventListener('DOMContentLoaded', () => {
    const clockContainer = document.getElementById('clock-container');

    const countries = [
        { name: 'USA (New York)', timezone: 'America/New_York', code: 'us' },
        { name: 'UK (London)', timezone: 'Europe/London', code: 'gb' },
        { name: 'Japan (Tokyo)', timezone: 'Asia/Tokyo', code: 'jp' },
        { name: 'China (Shanghai)', timezone: 'Asia/Shanghai', code: 'cn' },
        { name: 'India (Mumbai)', timezone: 'Asia/Kolkata', code: 'in' },
        { name: 'Brazil (São Paulo)', timezone: 'America/Sao_Paulo', code: 'br' },
        { name: 'Russia (Moscow)', timezone: 'Europe/Moscow', code: 'ru' },
        { name: 'Australia (Sydney)', timezone: 'Australia/Sydney', code: 'au' },
        { name: 'Nigeria (Lagos)', timezone: 'Africa/Lagos', code: 'ng' },
        { name: 'Egypt (Cairo)', timezone: 'Africa/Cairo', code: 'eg' }
    ];

    function initClocks() {
        clockContainer.innerHTML = '';
        countries.forEach(country => {
            const clockElement = document.createElement('div');
            clockElement.classList.add('clock');
            const countryId = country.name.replace(/[^a-zA-Z0-9]/g, '-');

            clockElement.innerHTML = `
                <div class="country-header">
                    <img src="https://flagsapi.com/${country.code.toUpperCase()}/shiny/32.png" alt="${country.name} flag" class="flag">
                    <h2>${country.name}</h2>
                    <span id="day-night-${countryId}" class="day-night-icon"></span>
                </div>
                <canvas id="analog-${countryId}" class="analog-clock" width="150" height="150"></canvas>
                <div id="digital-time-${countryId}" class="time"></div>
                <div class="date-tz-container">
                    <span id="digital-date-${countryId}" class="date"></span>
                    <span id="timezone-${countryId}" class="timezone"></span>
                </div>
            `;
            clockContainer.appendChild(clockElement);
        });
    }

    function drawClock(canvas, timezone) {
        const ctx = canvas.getContext('2d');
        const radius = canvas.height / 2;
        ctx.translate(radius, radius);
        const clockRadius = radius * 0.90;

        const now = new Date();
        const timeParts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
        }).formatToParts(now);

        let hour = parseInt(timeParts.find(p => p.type === 'hour').value);
        const minute = parseInt(timeParts.find(p => p.type === 'minute').value);
        const second = parseInt(timeParts.find(p => p.type === 'second').value);
        hour = hour % 12;

        drawFace(ctx, clockRadius);
        drawNumbers(ctx, clockRadius);
        drawTime(ctx, clockRadius, hour, minute, second);

        ctx.translate(-radius, -radius);
    }

    function drawFace(ctx, radius) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        const grad = ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.05);
        grad.addColorStop(0, '#333');
        grad.addColorStop(0.5, 'white');
        grad.addColorStop(1, '#333');
        ctx.strokeStyle = grad;
        ctx.lineWidth = radius * 0.1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.05, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
    }

    function drawNumbers(ctx, radius) {
        ctx.font = radius * 0.15 + "px arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        for (let num = 1; num < 13; num++) {
            let ang = num * Math.PI / 6;
            ctx.rotate(ang);
            ctx.translate(0, -radius * 0.85);
            ctx.rotate(-ang);
            ctx.fillText(num.toString(), 0, 0);
            ctx.rotate(ang);
            ctx.translate(0, radius * 0.85);
            ctx.rotate(-ang);
        }
    }

    function drawTime(ctx, radius, hour, minute, second) {
        let hourAngle = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
        drawHand(ctx, hourAngle, radius * 0.5, radius * 0.07, '#333');
        let minuteAngle = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
        drawHand(ctx, minuteAngle, radius * 0.8, radius * 0.07, '#333');
        let secondAngle = (second * Math.PI / 30);
        drawHand(ctx, secondAngle, radius * 0.9, radius * 0.02, '#007BFF');
    }

    function drawHand(ctx, pos, length, width, color) {
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        ctx.moveTo(0, 0);
        ctx.rotate(pos);
        ctx.lineTo(0, -length);
        ctx.stroke();
        ctx.rotate(-pos);
    }

    function updateClocks() {
        const now = new Date();
        countries.forEach(country => {
            const countryId = country.name.replace(/[^a-zA-Z0-9]/g, '-');
            const timezone = country.timezone;

            // Get local hour for day/night icon
            const localHour = parseInt(new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                hour12: false
            }).format(now));

            const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="day-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
            const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="night-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

            const dayNightIconContainer = document.getElementById(`day-night-${countryId}`);
            dayNightIconContainer.innerHTML = (localHour >= 6 && localHour < 18) ? sunIcon : moonIcon;

            // Get timezone abbreviation
            const timeZoneName = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                timeZoneName: 'short'
            }).formatToParts(now).find(part => part.type === 'timeZoneName').value;
            document.getElementById(`timezone-${countryId}`).innerText = timeZoneName;

            // Update digital clock
            const timeString = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const dateString = now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById(`digital-time-${countryId}`).innerText = timeString;
            document.getElementById(`digital-date-${countryId}`).innerText = dateString;

            // Update analog clock
            const canvas = document.getElementById(`analog-${countryId}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawClock(canvas, timezone);
            }
        });
    }

    initClocks();
    updateClocks();
    setInterval(updateClocks, 1000);
});