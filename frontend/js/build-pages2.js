const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname);

// Doctor
const doctorLinks = [
    { name: 'Appointments', url: 'dashboard-doctor-appointments.html', icon: 'fa-calendar-check' },
    { name: 'Patients', url: 'dashboard-doctor-patients.html', icon: 'fa-users' },
    { name: 'Jobs', url: 'dashboard-doctor-jobs.html', icon: 'fa-briefcase-medical' },
    { name: 'Reports', url: 'dashboard-doctor-reports.html', icon: 'fa-chart-line' },
    { name: 'Profile', url: 'dashboard-doctor-profile.html', icon: 'fa-user-doctor' },
    { name: 'Settings', url: 'dashboard-doctor-settings.html', icon: 'fa-gear' }
];

const staffLinks = [
    { name: 'Find Doctor', url: 'dashboard-staff-find-doctor.html', icon: 'fa-magnifying-glass' },
    { name: 'Book Appointment', url: 'dashboard-staff-book-appointment.html', icon: 'fa-calendar-plus' },
    { name: 'My Bookings', url: 'dashboard-staff-appointments.html', icon: 'fa-calendar-check' },
    { name: 'Profile', url: 'dashboard-staff-profile.html', icon: 'fa-user' },
    { name: 'Settings', url: 'dashboard-staff-settings.html', icon: 'fa-gear' }
];

function injectTheme(html) {
    let result = html;
    if (!result.includes('body.light-theme')) {
        const bodyTag = result.match(/body\s*\{[^}]+\}/);
        if (bodyTag) {
            const lightThemeCss = `\n        body.light-theme {--bg:#f8fafc; --bg2:#ffffff; --bg3:#f1f5f9; --card:#ffffff; --card2:#f8fafc; --border:rgba(0,0,0,0.08); --text:#0f172a; --text2:#475569; --text3:#64748b;}`;
            result = result.replace(bodyTag[0], bodyTag[0] + lightThemeCss);
        }
    }
    if (!result.includes('<script src="../js/theme.js"></script>')) {
        result = result.replace('<body>', '<body>\n<script src="../js/theme.js"></script>');
    }
    return result;
}

const getSettingsContent = (mode) => `
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
    </div>
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
`;

function processDashboard(baseFile, links, prefix) {
    const baseHtml = fs.readFileSync(path.join(pagesDir, baseFile), 'utf8');
    let injectedHtml = injectTheme(baseHtml);
    
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
    
    fs.writeFileSync(path.join(pagesDir, baseFile), injectedHtml.replace(`href="${baseFile}" class="nav-link"`, `href="${baseFile}" class="nav-link active"`));

    links.forEach(link => {
        let pageHtml = injectedHtml;
        pageHtml = pageHtml.replace(`href="${link.url}" class="nav-link"`, `href="${link.url}" class="nav-link active"`);
        
        let content = '';
        if (link.name === 'Settings') {
            content = getSettingsContent();
        } else if (link.name === 'Appointments' && prefix === 'Doctor') {
            content = `
            <div class="dash-card">
                <div class="dash-card-header">
                    <div class="dash-card-title"><i class="fa-solid fa-calendar-check"></i> Appointments</div>
                    <div>
                        <button style="padding:5px 10px;background:var(--accent);color:#fff;border:none;border-radius:5px;cursor:pointer;">Today</button>
                        <button style="padding:5px 10px;background:none;color:var(--text2);border:1px solid var(--border);border-radius:5px;cursor:pointer;">Upcoming</button>
                        <button style="padding:5px 10px;background:none;color:var(--text2);border:1px solid var(--border);border-radius:5px;cursor:pointer;">Completed</button>
                    </div>
                </div>
                <div style="padding:0;">
                    <table class="dash-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                        <thead><tr style="text-align:left;border-bottom:1px solid var(--border);color:var(--text3);"><th style="padding:15px;">Patient</th><th>Contact</th><th>Date & Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:15px;color:var(--text);"><strong>Rahul Sharma</strong></td>
                                <td style="color:var(--text2);">+91 9876543210<br/><small>New Delhi</small></td>
                                <td style="color:var(--text2);">12 Aug 2026<br/>10:30 AM</td>
                                <td style="color:var(--text2);">Regular Checkup</td>
                                <td><span style="background:rgba(245,158,11,.1);color:#f59e0b;padding:3px 8px;border-radius:10px;font-size:0.75rem;">Pending</span></td>
                                <td><button style="background:rgba(14,165,233,.1);color:var(--accent);border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Confirm</button> <button style="background:rgba(239,68,68,.1);color:#ef4444;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Cancel</button></td>
                            </tr>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:15px;color:var(--text);"><strong>Priya Patel</strong></td>
                                <td style="color:var(--text2);">+91 8765432109<br/><small>Mumbai</small></td>
                                <td style="color:var(--text2);">12 Aug 2026<br/>11:45 AM</td>
                                <td style="color:var(--text2);">Fever & Cough</td>
                                <td><span style="background:rgba(6,182,212,.1);color:#06b6d4;padding:3px 8px;border-radius:10px;font-size:0.75rem;">Confirmed</span></td>
                                <td><button style="background:rgba(16,185,129,.1);color:#10b981;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Complete</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        } else if (link.name === 'Book Appointment' && prefix === 'Staff') {
            content = `
            <div class="dash-card">
                <div class="dash-card-header">
                    <div class="dash-card-title"><i class="fa-solid fa-calendar-plus"></i> Book Appointment</div>
                </div>
                <div style="padding:24px;">
                    <div style="background:var(--bg3);padding:15px;border-radius:8px;border:1px solid var(--border);margin-bottom:20px;display:flex;align-items:center;gap:15px;">
                        <div style="width:50px;height:50px;background:var(--grad);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;">AM</div>
                        <div><h4 style="margin:0;">Dr. A. Mehta</h4><p style="margin:0;color:var(--accent);font-size:0.85rem;">Cardiologist</p></div>
                    </div>
                    
                    <form onsubmit="event.preventDefault(); document.getElementById('bookingConfirm').style.display='block';">
                        <h4 style="margin-bottom:15px;color:var(--text2);">Patient Information</h4>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
                            <input type="text" placeholder="Full Name" required style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                            <input type="tel" placeholder="Phone Number" required style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                            <input type="text" placeholder="Address" style="grid-column:1/-1;width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                            <input type="number" placeholder="Age" required style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                            <select style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                                <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                        </div>
                        
                        <h4 style="margin-bottom:15px;color:var(--text2);">Appointment Information</h4>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
                            <input type="text" placeholder="Reason / Health Issue" required style="grid-column:1/-1;width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                            <input type="date" required style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                            <input type="time" required style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                            <textarea placeholder="Additional Notes" style="grid-column:1/-1;width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);height:80px;resize:none;"></textarea>
                        </div>
                        
                        <div style="display:flex;gap:10px;">
                            <button type="submit" style="background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;font-weight:bold;">Book Appointment</button>
                            <button type="button" style="background:none;color:var(--text2);border:1px solid var(--border);padding:10px 20px;border-radius:5px;cursor:pointer;">Cancel</button>
                        </div>
                    </form>
                    
                    <div id="bookingConfirm" style="display:none;margin-top:20px;padding:15px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:8px;color:#10b981;">
                        <i class="fa-solid fa-circle-check"></i> Appointment booked successfully! Confirmation sent to phone.
                    </div>
                </div>
            </div>`;
        } else if (link.name === 'Job Listings' && prefix === 'Hospital') {
            content = `
            <div class="dash-card">
                <div class="dash-card-header">
                    <div class="dash-card-title"><i class="fa-solid fa-briefcase-medical"></i> Job Listings</div>
                    <button style="background:var(--accent);color:#fff;border:none;padding:5px 15px;border-radius:50px;cursor:pointer;font-size:0.8rem;font-weight:bold;">+ Post a New Job</button>
                </div>
                <div style="padding:15px;display:flex;gap:10px;border-bottom:1px solid var(--border);">
                    <input type="text" placeholder="Search jobs..." style="flex:1;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                    <select style="padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);">
                        <option>All Statuses</option><option>Active</option><option>Expired</option>
                    </select>
                </div>
                <div style="padding:0;">
                    <table class="dash-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                        <thead><tr style="text-align:left;border-bottom:1px solid var(--border);color:var(--text3);"><th style="padding:15px;">Position</th><th>Applicants</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:15px;color:var(--text);"><strong>Cardiologist</strong><br/><small style="color:var(--text2);">Full-Time</small></td>
                                <td style="color:var(--text);">12</td>
                                <td><span style="background:rgba(16,185,129,.1);color:#10b981;padding:3px 8px;border-radius:10px;font-size:0.75rem;">Active</span></td>
                                <td>
                                    <button style="background:none;color:var(--text2);border:1px solid var(--border);padding:5px 10px;border-radius:5px;cursor:pointer;">View</button> 
                                    <button style="background:rgba(14,165,233,.1);color:var(--accent);border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Edit</button>
                                    <button style="background:rgba(239,68,68,.1);color:#ef4444;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Close</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        } else {
            content = `<div class="dash-card"><div class="dash-card-header"><div class="dash-card-title"><i class="fa-solid ${link.icon}"></i> ${link.name}</div></div><div style="padding:24px;"><p style="color:var(--text2)">Mock UI for ${link.name} (${prefix}). Forms/Tables go here.</p></div></div>`;
        }
        
        let contentRegex = /<div class="content">[\s\S]*?<\/div>\s*<\/div>\s*<(style|script)>/;
        let contentMatch = pageHtml.match(contentRegex);
        if(contentMatch) {
            pageHtml = pageHtml.replace(contentMatch[0], `<div class="content">\n${content}\n</div>\n</div>\n<${contentMatch[1]}>`);
        }
        pageHtml = pageHtml.replace(/<h1>.*?<\/h1>/, `<h1>${link.name}</h1>`);
        fs.writeFileSync(path.join(pagesDir, link.url), pageHtml);
    });
}

processDashboard('dashboard-doctor.html', doctorLinks, 'Doctor');
processDashboard('dashboard-staff.html', staffLinks, 'Staff');
processDashboard('dashboard-hospital.html', [
    { name: 'Doctors', url: 'dashboard-hospital-doctors.html', icon: 'fa-user-doctor' },
    { name: 'Job Listings', url: 'dashboard-hospital-jobs.html', icon: 'fa-briefcase-medical' },
    { name: 'Applications', url: 'dashboard-hospital-applications.html', icon: 'fa-file-user' },
    { name: 'Appointments', url: 'dashboard-hospital-appointments.html', icon: 'fa-calendar-check' },
    { name: 'Reports', url: 'dashboard-hospital-reports.html', icon: 'fa-chart-line' },
    { name: 'Hospital Profile', url: 'dashboard-hospital-profile.html', icon: 'fa-building-columns' },
    { name: 'Settings', url: 'dashboard-hospital-settings.html', icon: 'fa-gear' }
], 'Hospital');

console.log('Finished scaffolding pages with robust mock UIs.');
