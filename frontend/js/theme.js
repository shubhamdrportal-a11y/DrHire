// theme.js - Global Theme Management for Dashboards

function initTheme() {
    const savedTheme = localStorage.getItem('drhire-theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    if (isLight) {
        document.body.classList.remove('light-theme');
        localStorage.setItem('drhire-theme', 'dark');
    } else {
        document.body.classList.add('light-theme');
        localStorage.setItem('drhire-theme', 'light');
    }
}

// Run immediately to prevent FOUC
initTheme();
