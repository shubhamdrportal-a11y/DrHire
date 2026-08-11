// ── Service Details page (reusable layout) ──────────────────────
(function () {
  const root = document.getElementById('serviceDetailRoot');
  if (!root) return;

  const SERVICES = {
    'doctor-recruitment': {
      icon: 'fa-user-doctor', title: 'Doctor Recruitment',
      intro: 'We source, screen, and place verified MBBS, MD, and specialist doctors with top-tier hospitals across India — matching clinical skill and career goals with the right opportunity, fast.',
      benefits: ['Access to a pre-verified pool of practising doctors', 'Specialty-matched shortlisting, not generic resumes', 'Placements typically completed within 48–72 hours', 'Zero cost to doctors, always'],
      features: [
        { icon: 'fa-shield-halved', title: 'Credential Verification', text: 'Every degree, license, and prior employment claim is checked before a profile goes live.' },
        { icon: 'fa-filter', title: 'Specialty Matching', text: 'Candidates are matched by specialization, experience band, and location preference.' },
        { icon: 'fa-bolt', title: 'Fast Turnaround', text: 'Most roles receive qualified candidate shortlists within 48 hours of posting.' },
      ],
      stats: [['1200+', 'Doctors Placed'], ['500+', 'Partner Hospitals'], ['48hr', 'Avg. Shortlist Time']],
    },
    'hospital-hiring': {
      icon: 'fa-hospital-user', title: 'Hospital Hiring',
      intro: 'Hospitals post vacancies once and we deliver pre-screened, credential-verified candidates directly to your HR team — cutting recruitment cycles from months to days.',
      benefits: ['Dedicated recruitment coordinator for your account', 'Candidates arrive pre-verified and interview-ready', 'Bulk hiring support for new departments or facilities', 'Transparent pricing with no hidden placement fees'],
      features: [
        { icon: 'fa-clipboard-list', title: 'Structured Intake', text: 'We capture exact role requirements — specialty, seniority, shift pattern — before sourcing begins.' },
        { icon: 'fa-people-arrows', title: 'HR-Ready Shortlists', text: 'Candidates are pre-screened so your HR team interviews only relevant, qualified profiles.' },
        { icon: 'fa-headset', title: 'Ongoing Support', text: 'A dedicated coordinator manages the process end-to-end, from sourcing to offer.' },
      ],
      stats: [['500+', 'Hospitals Onboarded'], ['24-48hr', 'First Shortlist'], ['98%', 'Client Retention']],
    },
    'medical-staffing': {
      icon: 'fa-people-group', title: 'Medical Staffing',
      intro: 'Temporary, contract, and permanent staffing solutions tailored to the dynamic needs of healthcare facilities — covering seasonal surges, leave gaps, and long-term growth.',
      benefits: ['Flexible engagement models: temporary, contract, or permanent', 'Rapid backfill for unplanned leave or attrition', 'Compliance-ready contracts and documentation', 'Scales from single roles to full department staffing'],
      features: [
        { icon: 'fa-calendar-days', title: 'Flexible Contracts', text: 'Short-term, contract, or permanent placements structured around your operational needs.' },
        { icon: 'fa-rotate', title: 'Rapid Backfill', text: 'Pre-vetted standby candidates reduce gaps caused by sudden leave or attrition.' },
        { icon: 'fa-file-signature', title: 'Compliance Handled', text: 'Documentation and onboarding paperwork are prepared in line with hospital policy.' },
      ],
      stats: [['300+', 'Staffing Placements'], ['15+', 'States Covered'], ['24hr', 'Emergency Response']],
    },
    'career-guidance': {
      icon: 'fa-compass', title: 'Career Guidance',
      intro: 'Expert counselling on specializations, fellowships, and career pathways for medical graduates and practising professionals looking to make their next move.',
      benefits: ['One-on-one career counselling with recruitment experts', 'Guidance on choosing specializations and fellowships', 'Market insight on demand, salary bands, and locations', 'Free for all doctors and medical students'],
      features: [
        { icon: 'fa-user-tie', title: '1:1 Counselling', text: 'Personalised sessions covering specialization choice, timing, and career sequencing.' },
        { icon: 'fa-chart-simple', title: 'Market Insight', text: 'Up-to-date data on demand, compensation bands, and location trends by specialty.' },
        { icon: 'fa-road', title: 'Pathway Planning', text: 'A clear roadmap from your current stage to your target specialization or role.' },
      ],
      stats: [['2000+', 'Doctors Counselled'], ['30+', 'Specializations Covered'], ['Free', 'Always']],
    },
    'resume-support': {
      icon: 'fa-file-medical', title: 'Resume Support',
      intro: 'Professional CV building and optimization for doctors — crafted to meet the expectations of top hospitals and highlight the experience that matters most.',
      benefits: ['CVs written by recruiters who screen doctor profiles daily', 'Formatting tailored to hospital HR expectations', 'Emphasis on quantifiable clinical achievements', 'Fast turnaround, typically within 48 hours'],
      features: [
        { icon: 'fa-pen-nib', title: 'Recruiter-Written', text: 'Drafted by the same team that screens candidate profiles for partner hospitals.' },
        { icon: 'fa-list-check', title: 'Impact-Focused', text: 'Highlights procedures, patient volumes, and outcomes rather than generic duties.' },
        { icon: 'fa-clock', title: '48-Hour Turnaround', text: 'Most CVs are reviewed, rewritten, and returned within two business days.' },
      ],
      stats: [['1500+', 'CVs Reviewed'], ['48hr', 'Turnaround Time'], ['Free', 'For Registered Doctors']],
    },
    'emergency-hiring': {
      icon: 'fa-bolt', title: 'Emergency Hiring',
      intro: 'Urgent staffing solutions delivered within 24–48 hours for hospitals facing critical workforce shortages — because patient care cannot wait for a standard hiring cycle.',
      benefits: ['Priority access to our pre-verified doctor pool', 'Dedicated emergency-hiring coordinator', 'Same-day candidate shortlists for critical roles', 'Available across all major specialties'],
      features: [
        { icon: 'fa-triangle-exclamation', title: 'Priority Sourcing', text: 'Urgent roles are escalated to the top of our matching queue immediately.' },
        { icon: 'fa-user-check', title: 'Pre-Verified Pool', text: 'Candidates are already credential-checked, removing the biggest bottleneck in fast hiring.' },
        { icon: 'fa-phone-volume', title: 'Direct Coordination', text: 'A dedicated coordinator manages communication between hospital and candidate directly.' },
      ],
      stats: [['24-48hr', 'Placement Window'], ['100+', 'Emergency Placements'], ['24/7', 'Coordinator Access']],
    },
  };

  const SLUG_ORDER = Object.keys(SERVICES);
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('service') && SERVICES[params.get('service')] ? params.get('service') : SLUG_ORDER[0];
  const svc = SERVICES[slug];

  document.title = `${svc.title} – Doctors Coat Services`;

  document.getElementById('serviceNavStrip').innerHTML = SLUG_ORDER.map(s => `
    <a class="service-nav-pill ${s === slug ? 'active' : ''}" href="service-details.html?service=${s}">${SERVICES[s].title}</a>
  `).join('');

  document.getElementById('serviceHeader').innerHTML = `
    <span class="section-tag"><i class="fa-solid ${svc.icon}"></i> Our Services</span>
    <h1>${svc.title}</h1>
    <p>${svc.intro}</p>
  `;

  root.innerHTML = `
    <section class="section" style="padding-top:0">
      <div class="section-header">
        <span class="section-tag">Key Benefits</span>
        <h2>Why This Service Works</h2>
      </div>
      <div class="value-grid">
        ${svc.benefits.map(b => `<div class="value-card"><i class="fa-solid fa-circle-check"></i><p style="color:var(--text);font-size:.92rem;line-height:1.7">${b}</p></div>`).join('')}
      </div>
    </section>

    <section class="section why">
      <div class="section-header">
        <span class="section-tag">Features</span>
        <h2>What's Included</h2>
      </div>
      <div class="why-grid">
        ${svc.features.map(f => `<div class="why-card"><div class="why-icon"><i class="fa-solid ${f.icon}"></i></div><h3>${f.title}</h3><p>${f.text}</p></div>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <span class="section-tag">How It Works</span>
        <h2>Our Process</h2>
      </div>
      <div class="process-grid">
        <div class="process-step"><div class="step-num">1</div><h3>Share Requirements</h3><p>Tell us the role, specialty, and timeline via our contact or hire form.</p></div>
        <div class="process-step"><div class="step-num">2</div><h3>We Match & Verify</h3><p>Our team shortlists pre-verified candidates matched to your exact needs.</p></div>
        <div class="process-step"><div class="step-num">3</div><h3>You Interview</h3><p>Review shortlists and interview candidates directly, with our support throughout.</p></div>
        <div class="process-step"><div class="step-num">4</div><h3>Onboard & Go Live</h3><p>We assist with documentation and onboarding until the candidate is placed.</p></div>
      </div>
    </section>

    <section class="section why">
      <div class="section-header">
        <span class="section-tag">By the Numbers</span>
        <h2>Track Record</h2>
      </div>
      <div class="stat-grid">
        ${svc.stats.map(([num, label]) => `<div class="stat-box"><div class="stat-num">${num}</div><div class="stat-label">${label}</div></div>`).join('')}
      </div>
    </section>
  `;
})();
