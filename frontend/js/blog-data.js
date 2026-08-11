// ── Shared static blog dataset ──────────────────────────────────
const DC_BLOG_POSTS = [
  {
    slug: 'how-to-choose-the-right-hospital',
    title: 'How to Choose the Right Hospital as a Practicing Doctor',
    category: 'Career Advice',
    icon: 'fa-hospital-user',
    author: 'Dr. Neha Sharma',
    date: 'July 28, 2026',
    excerpt: 'Salary is only one piece of the puzzle. Here is what to actually evaluate before signing an offer letter — from case-mix and support staff to growth pathways.',
    content: [
      'Choosing where to practice is one of the biggest decisions in a doctor\'s career, and it goes far beyond the number on the offer letter.',
      'Look closely at the case-mix a hospital sees. A high-volume, low-complexity setup builds speed; a tertiary-care centre builds depth. Both are valuable, but they shape your skillset very differently over five years.',
      'Support infrastructure matters just as much: nursing ratios, availability of diagnostics, and how quickly you can escalate a critical case all affect both patient outcomes and your own stress levels.',
      'Finally, ask about growth pathways — fellowship sponsorship, leadership tracks, and whether senior consultants are approachable mentors or distant figures.'
    ]
  },
  {
    slug: 'emergency-hiring-what-hospitals-need-to-know',
    title: 'Emergency Hiring: What Hospitals Need to Know Before a Crisis Hits',
    category: 'For Hospitals',
    icon: 'fa-bolt',
    author: 'Doctors Coat Team',
    date: 'July 15, 2026',
    excerpt: 'Staffing shortages rarely arrive with warning. Here is how hospitals can build a rapid-response hiring plan before they need one.',
    content: [
      'A sudden resignation, a seasonal surge, or an unplanned leave can leave a department dangerously understaffed overnight.',
      'The hospitals that recover fastest are the ones with a pre-vetted talent pipeline already in place, rather than starting the search from zero.',
      'Pre-verification of credentials — degrees, licenses, and prior employment — is the single biggest bottleneck in emergency hiring. Handling this in advance, through a recruitment partner, can cut placement time from weeks to under 48 hours.',
      'A clear, written escalation protocol for urgent roles also helps HR and department heads move in lockstep instead of duplicating effort.'
    ]
  },
  {
    slug: 'life-after-mbbs-first-job-guide',
    title: 'Life After MBBS: A First-Job Guide for New Graduates',
    category: 'Career Advice',
    icon: 'fa-user-graduate',
    author: 'Dr. Anjali Kapoor',
    date: 'June 30, 2026',
    excerpt: 'Your first posting shapes your clinical instincts more than any exam. Here is how to pick well, negotiate fairly, and set yourself up for the years ahead.',
    content: [
      'Fresh out of MBBS, the number of postings on offer can feel overwhelming — and the temptation is to simply take the first one that pays reasonably.',
      'Instead, weigh patient volume, the quality of senior supervision, and whether the role leaves room to prepare for postgraduate entrance exams if that is part of your plan.',
      'Do not be afraid to ask about on-call frequency and leave policy during the interview; these details affect day-to-day life far more than the base salary line.',
      'A first job is rarely a permanent one — treat it as a foundation for the clinical judgment you will carry for the rest of your career.'
    ]
  },
  {
    slug: 'reducing-doctor-attrition-hospital-strategies',
    title: '5 Strategies Hospitals Use to Reduce Doctor Attrition',
    category: 'For Hospitals',
    icon: 'fa-chart-line',
    author: 'Doctors Coat Team',
    date: 'June 10, 2026',
    excerpt: 'Replacing a doctor costs far more than recruiting one. These are the retention levers hospitals consistently underuse.',
    content: [
      'Doctor attrition is expensive — not just in recruitment cost, but in lost institutional knowledge and disrupted patient continuity.',
      'Hospitals that retain talent well tend to invest early in structured onboarding, rather than treating a new hire\'s first month as a sink-or-swim exercise.',
      'Transparent, predictable on-call rosters reduce burnout more reliably than one-off wellness initiatives.',
      'Finally, regular, low-pressure check-ins with department heads catch dissatisfaction months before it turns into a resignation letter.'
    ]
  },
  {
    slug: 'building-a-standout-doctor-cv',
    title: 'Building a Standout CV as a Medical Professional in India',
    category: 'Career Advice',
    icon: 'fa-file-medical',
    author: 'Dr. Rohan Verma',
    date: 'May 22, 2026',
    excerpt: 'Most doctor CVs read like a list of degrees. Here is how to structure yours so it actually gets shortlisted.',
    content: [
      'A hospital HR team may spend under a minute on a first CV screen — so structure and clarity matter more than exhaustive detail.',
      'Lead with your specialization, years of relevant experience, and any high-acuity or high-volume exposure that is directly relevant to the role.',
      'Quantify where possible: number of surgeries performed, patients managed per shift, or specific procedures you are certified in.',
      'Keep administrative and academic achievements in a separate, secondary section so your clinical strengths are the first thing a recruiter sees.'
    ]
  },
  {
    slug: 'telemedicine-and-the-future-of-rural-healthcare',
    title: 'Telemedicine and the Future of Rural Healthcare Staffing in India',
    category: 'Industry Trends',
    icon: 'fa-satellite-dish',
    author: 'Doctors Coat Team',
    date: 'May 4, 2026',
    excerpt: 'Rural postings are notoriously hard to staff. Telemedicine is starting to change what "coverage" actually means.',
    content: [
      'Rural and semi-urban facilities have long struggled to attract specialists willing to relocate full-time.',
      'Hybrid models — where a resident MBBS doctor is supported remotely by a specialist via telemedicine — are increasingly being used to bridge this gap without compromising care quality.',
      'For doctors, this opens a new category of part-time, remote-consulting roles that were not previously available.',
      'For hospitals, it means staffing plans can now blend on-site and remote coverage rather than treating them as separate problems.'
    ]
  }
];
