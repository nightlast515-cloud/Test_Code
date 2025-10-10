document.addEventListener('DOMContentLoaded', () => {
    const clockContainer = document.getElementById('clock-container');

    const countries = [
        { name: 'USA (New York)', timezone: 'America/New_York' },
        { name: 'UK (London)', timezone: 'Europe/London' },
        { name: 'Japan (Tokyo)', timezone: 'Asia/Tokyo' },
        { name: 'China (Shanghai)', timezone: 'Asia/Shanghai' },
        { name: 'India (Mumbai)', timezone: 'Asia/Kolkata' },
        { name: 'Brazil (São Paulo)', timezone: 'America/Sao_Paulo' },
        { name: 'Russia (Moscow)', timezone: 'Europe/Moscow' },
        { name: 'Australia (Sydney)', timezone: 'Australia/Sydney' },
        { name: 'Nigeria (Lagos)', timezone: 'Africa/Lagos' },
        { name: 'Egypt (Cairo)', timezone: 'Africa/Cairo' }
    ];

    function initClocks() {
        clockContainer.innerHTML = '';
        countries.forEach(country => {
            const clockElement = document.createElement('div');
            clockElement.classList.add('clock');
            const countryId = country.name.replace(/[^a-zA-Z0-9]/g, '-');

            clockElement.innerHTML = `
                <h2>${country.name}</h2>
                <canvas id="analog-${countryId}" class="analog-clock" width="150" height="150"></canvas>
                <div id="digital-time-${countryId}" class="time"></div>
                <div id="digital-date-${countryId}" class="date"></div>
            `;
            clockContainer.appendChild(clockElement);
        });
    }

    function drawClock(canvas, timezone) {
        const ctx = canvas.getContext('2d');
        const radius = canvas.height / 2;
        ctx.translate(radius, radius);
        const clockRadius = radius * 0.90;

        // Get current time in the specified timezone
        const now = new Date();
        const timeParts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        }).formatToParts(now);

        let hour = parseInt(timeParts.find(p => p.type === 'hour').value);
        const minute = parseInt(timeParts.find(p => p.type === 'minute').value);
        const second = parseInt(timeParts.find(p => p.type === 'second').value);
        hour = hour % 12; // convert to 12-hour format for the analog clock

        drawFace(ctx, clockRadius);
        drawNumbers(ctx, clockRadius);
        drawTime(ctx, clockRadius, hour, minute, second);

        ctx.translate(-radius, -radius); // Reset translation
    }

    function drawFace(ctx, radius) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Draw clock border
        const grad = ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.05);
        grad.addColorStop(0, '#333');
        grad.addColorStop(0.5, 'white');
        grad.addColorStop(1, '#333');
        ctx.strokeStyle = grad;
        ctx.lineWidth = radius * 0.1;
        ctx.stroke();

        // Center dot
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
        // Hour hand
        let hourAngle = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
        drawHand(ctx, hourAngle, radius * 0.5, radius * 0.07, '#333');
        // Minute hand
        let minuteAngle = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
        drawHand(ctx, minuteAngle, radius * 0.8, radius * 0.07, '#333');
        // Second hand
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

            // Update digital clock
            const timeString = now.toLocaleTimeString('en-US', { timeZone: country.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const dateString = now.toLocaleDateString('en-US', { timeZone: country.timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById(`digital-time-${countryId}`).innerText = timeString;
            document.getElementById(`digital-date-${countryId}`).innerText = dateString;

            // Update analog clock
            const canvas = document.getElementById(`analog-${countryId}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawClock(canvas, country.timezone);
            }
        });
    }

    initClocks();
    updateClocks();
    setInterval(updateClocks, 1000);
});