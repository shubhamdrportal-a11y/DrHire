// ── Hire Doctors page form ──────────────────────────────────────
(function () {
  const form = document.getElementById('hireForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    const successBox = document.getElementById('hireFormSuccess');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…'; btn.disabled = true;

    const hospital = document.getElementById('hireHospital').value;
    const positions = document.getElementById('hirePositions').value;
    const urgency = document.getElementById('hireUrgency').value;
    const requirement = document.getElementById('hireMessage').value;

    const composedMessage = `Hospital/Facility: ${hospital}\nPositions needed: ${positions}\nUrgency: ${urgency}\n\nRequirement details:\n${requirement}`;

    const { error } = await db.from('contact_submissions').insert({
      name: document.getElementById('hireContactName').value,
      email: document.getElementById('hireEmail').value,
      phone: document.getElementById('hirePhone').value,
      role: 'Hospital / Clinic',
      specialization: document.getElementById('hireSpecialization').value,
      message: composedMessage,
    });

    btn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:8px"></i>Submit Requirement'; btn.disabled = false;

    if (error) {
      alert('Submission error: ' + error.message);
    } else {
      form.reset();
      successBox.style.display = 'block';
      form.style.display = 'none';
      setTimeout(() => { successBox.style.display = 'none'; form.style.display = 'block'; }, 8000);
    }
  });
})();
