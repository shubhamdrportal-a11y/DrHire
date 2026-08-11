const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname);

// Inject theme script & CSS
function injectTheme(html) {
    let result = html;
    
    // Add light-theme CSS variables if not present
    if (!result.includes('body.light-theme')) {
        const bodyTag = result.match(/body\s*\{[^}]+\}/);
        if (bodyTag) {
            const lightThemeCss = `\n        body.light-theme {--bg:#f8fafc; --bg2:#ffffff; --bg3:#f1f5f9; --card:#ffffff; --card2:#f8fafc; --border:rgba(0,0,0,0.08); --text:#0f172a; --text2:#475569; --text3:#64748b;}`;
            result = result.replace(bodyTag[0], bodyTag[0] + lightThemeCss);
        }
    }
    
    // Add theme.js if not present
    if (!result.includes('<script src="../js/theme.js"></script>')) {
        result = result.replace('<body>', '<body>\n<script src="../js/theme.js"></script>');
    }
    
    return result;
}

// Admin pages
const adminLinks = [
    { name: 'Users', url: 'dashboard-admin-users.html', icon: 'fa-users' },
    { name: 'Doctors', url: 'dashboard-admin-doctors.html', icon: 'fa-user-doctor' },
    { name: 'Hospitals', url: 'dashboard-admin-hospitals.html', icon: 'fa-hospital' },
    { name: 'Appointments', url: 'dashboard-admin-appointments.html', icon: 'fa-calendar-check' },
    { name: 'Job Listings', url: 'dashboard-admin-jobs.html', icon: 'fa-briefcase-medical' },
    { name: 'Reports', url: 'dashboard-admin-reports.html', icon: 'fa-file-lines' },
    { name: 'Analytics', url: 'dashboard-admin-analytics.html', icon: 'fa-chart-bar' },
    { name: 'Settings', url: 'dashboard-admin-settings.html', icon: 'fa-gear' }
];

const adminSettingsContent = `
<div class="dash-card">
    <div class="dash-card-header">
        <div class="dash-card-title"><i class="fa-solid fa-palette"></i> Appearance</div>
    </div>
    <div style="padding: 24px;">
        <h3 style="margin-bottom:16px;">Theme Preference</h3>
        <p style="color:var(--text2);font-size:0.9rem;margin-bottom:20px;">Choose between Dark Mode and Light Mode.</p>
        <div style="display:flex;gap:16px;">
            <button onclick="setTheme('dark')" class="qa-btn" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:10px 24px;border-radius:8px;cursor:pointer;">
                <i class="fa-solid fa-moon"></i> Dark Mode
            </button>
            <button onclick="setTheme('light')" class="qa-btn" style="background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;padding:10px 24px;border-radius:8px;cursor:pointer;">
                <i class="fa-solid fa-sun"></i> Light Mode
            </button>
        </div>
        <script>
            function setTheme(mode) {
                if(mode === 'light') {
                    document.body.classList.add('light-theme');
                    localStorage.setItem('drhire-theme', 'light');
                } else {
                    document.body.classList.remove('light-theme');
                    localStorage.setItem('drhire-theme', 'dark');
                }
            }
        </script>
    </div>
</div>
`;

function processDashboard(baseFile, links, prefix) {
    const baseHtml = fs.readFileSync(path.join(pagesDir, baseFile), 'utf8');
    let injectedHtml = injectTheme(baseHtml);
    
    // Replace sidebar links
    let navRegex = /<nav class="sidebar-nav">[\s\S]*?<\/nav>/;
    let navMatch = injectedHtml.match(navRegex);
    if(navMatch) {
        let newNav = '<nav class="sidebar-nav">\n';
        newNav += `        <a href="${baseFile}" class="nav-link"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>\n`;
        links.forEach(link => {
            newNav += `        <a href="${link.url}" class="nav-link"><i class="fa-solid ${link.icon}"></i> ${link.name}</a>\n`;
        });
        newNav += '    </nav>';
        injectedHtml = injectedHtml.replace(navMatch[0], newNav);
    }
    
    // Ensure base file is updated
    let updatedBaseHtml = injectedHtml;
    // Set active link for dashboard
    updatedBaseHtml = updatedBaseHtml.replace(`href="${baseFile}" class="nav-link"`, `href="${baseFile}" class="nav-link active"`);
    fs.writeFileSync(path.join(pagesDir, baseFile), updatedBaseHtml);

    // Generate subpages
    links.forEach(link => {
        let pageHtml = injectedHtml;
        
        // Update active class
        pageHtml = pageHtml.replace(`href="${link.url}" class="nav-link"`, `href="${link.url}" class="nav-link active"`);
        
        // Generate content
        let content = `<div class="dash-card"><div class="dash-card-header"><div class="dash-card-title"><i class="fa-solid ${link.icon}"></i> ${link.name}</div></div><div style="padding:24px;"><p style="color:var(--text2)">This is the ${link.name} page for ${prefix}. (UI successfully scaffolded)</p></div></div>`;
        
        if (link.name === 'Settings') {
            content = adminSettingsContent;
        }
        
        // Replace content div
        let contentRegex = /<div class="content">[\s\S]*?<\/div>\s*<\/div>\s*<style>/;
        let contentMatch = pageHtml.match(contentRegex);
        if(contentMatch) {
            pageHtml = pageHtml.replace(contentMatch[0], `<div class="content">\n${content}\n</div>\n</div>\n<style>`);
        } else {
             // Try simpler regex
             let simpleContentRegex = /<div class="content">[\s\S]*?<\/div>\s*<\/div>\s*<script>/;
             let simpleMatch = pageHtml.match(simpleContentRegex);
             if(simpleMatch) {
                 pageHtml = pageHtml.replace(simpleMatch[0], `<div class="content">\n${content}\n</div>\n</div>\n<script>`);
             }
        }
        
        // Update header title
        pageHtml = pageHtml.replace(/<h1>.*?<\/h1>/, `<h1>${link.name}</h1>`);
        
        fs.writeFileSync(path.join(pagesDir, link.url), pageHtml);
    });
}

// 1. Admin
processDashboard('dashboard-admin.html', adminLinks, 'Admin');

// 2. Doctor
const doctorLinks = [
    { name: 'Appointments', url: 'dashboard-doctor-appointments.html', icon: 'fa-calendar-check' },
    { name: 'Patients', url: 'dashboard-doctor-patients.html', icon: 'fa-users' },
    { name: 'Jobs', url: 'dashboard-doctor-jobs.html', icon: 'fa-briefcase-medical' },
    { name: 'Reports', url: 'dashboard-doctor-reports.html', icon: 'fa-chart-line' },
    { name: 'Profile', url: 'dashboard-doctor-profile.html', icon: 'fa-user-doctor' },
    { name: 'Settings', url: 'dashboard-doctor-settings.html', icon: 'fa-gear' }
];
// processDashboard('dashboard-doctor.html', doctorLinks, 'Doctor'); // I need to verify doctor file structure first

// 3. Hospital
const hospitalLinks = [
    { name: 'Doctors', url: 'dashboard-hospital-doctors.html', icon: 'fa-user-doctor' },
    { name: 'Job Listings', url: 'dashboard-hospital-jobs.html', icon: 'fa-briefcase-medical' },
    { name: 'Applications', url: 'dashboard-hospital-applications.html', icon: 'fa-file-user' },
    { name: 'Appointments', url: 'dashboard-hospital-appointments.html', icon: 'fa-calendar-check' },
    { name: 'Reports', url: 'dashboard-hospital-reports.html', icon: 'fa-chart-line' },
    { name: 'Hospital Profile', url: 'dashboard-hospital-profile.html', icon: 'fa-building-columns' },
    { name: 'Settings', url: 'dashboard-hospital-settings.html', icon: 'fa-gear' }
];
processDashboard('dashboard-hospital.html', hospitalLinks, 'Hospital');

// 4. Staff
const staffLinks = [
    { name: 'Find Doctor', url: 'dashboard-staff-find-doctor.html', icon: 'fa-magnifying-glass' },
    { name: 'Book Appointment', url: 'dashboard-staff-book-appointment.html', icon: 'fa-calendar-plus' },
    { name: 'My Bookings', url: 'dashboard-staff-appointments.html', icon: 'fa-calendar-check' },
    { name: 'Profile', url: 'dashboard-staff-profile.html', icon: 'fa-user' },
    { name: 'Settings', url: 'dashboard-staff-settings.html', icon: 'fa-gear' }
];
// processDashboard('dashboard-staff.html', staffLinks, 'Staff/Student');

console.log('Pages generated successfully!');
