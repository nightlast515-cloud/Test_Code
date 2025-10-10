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

    function displayClocks() {
        clockContainer.innerHTML = '';
        countries.forEach(country => {
            const now = new Date();

            const timeOptions = {
                timeZone: country.timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };

            const dateOptions = {
                timeZone: country.timezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };

            const timeString = now.toLocaleTimeString('en-US', timeOptions);
            const dateString = now.toLocaleDateString('en-US', dateOptions);

            const clockElement = document.createElement('div');
            clockElement.classList.add('clock');

            clockElement.innerHTML = `
                <h2>${country.name}</h2>
                <div class="time">${timeString}</div>
                <div class="date">${dateString}</div>
            `;

            clockContainer.appendChild(clockElement);
        });
    }

    displayClocks();
    setInterval(displayClocks, 1000);
});