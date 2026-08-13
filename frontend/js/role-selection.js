/**
 * role-selection.js
 * Handles UI interactions for selecting a role during Login and Registration.
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const roleCards = document.querySelectorAll('.role-card');
        const continueBtn = document.getElementById('roleSelectContinue');
        const msgEl = document.getElementById('roleSelectMsg');
        const changeRoleBtn = document.getElementById('changeRoleBtn');
        const changeRoleBtnAdmin = document.getElementById('changeRoleBtnAdmin');

        const stepSelect = document.getElementById('step-role-select');
        const stepForm = document.getElementById('step-auth-form');

        const roleIndicatorName = document.getElementById('roleIndicatorName');
        const roleIndicatorIcon = document.getElementById('roleIndicatorIconEl');

        const isRegisterPage = document.getElementById('registerFormMain') !== null;

        let selectedRole = null;

        // Icons mapping
        const icons = {
            admin: 'fa-shield-halved',
            doctor: 'fa-user-doctor',
            hospital: 'fa-hospital',
            staff: 'fa-user'
        };

        const displayNames = {
            admin: 'Admin',
            doctor: 'Doctor',
            hospital: 'Hospital',
            staff: 'User'
        };

        // 1. Role Card Selection
        roleCards.forEach(card => {
            card.addEventListener('click', () => {
                roleCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedRole = card.dataset.role;

                if (msgEl) {
                    msgEl.style.display = 'none';
                }
            });
        });

        // 2. Continue Button
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                if (!selectedRole) {
                    if (msgEl) {
                        msgEl.textContent = 'Please select a role to continue.';
                        msgEl.style.display = 'block';
                    }
                    return;
                }

                sessionStorage.setItem('drhire-selected-role', selectedRole);
                showAuthForm(selectedRole);
            });
        }

        // 3. Change Role Button
        if (changeRoleBtn) {
            changeRoleBtn.addEventListener('click', () => {
                sessionStorage.removeItem('drhire-selected-role');
                stepForm.classList.remove('active');
                stepSelect.classList.add('active');
            });
        }
        
        if (changeRoleBtnAdmin) {
            // Already handled inline in register.html, but let's keep it clean here if needed
            changeRoleBtnAdmin.addEventListener('click', () => {
                sessionStorage.removeItem('drhire-selected-role');
                stepForm.classList.remove('active');
                stepSelect.classList.add('active');
            });
        }

        // Initialize if role is already selected in sessionStorage or URL
        const urlParams = new URLSearchParams(window.location.search);
        let storedRole = urlParams.get('role') || sessionStorage.getItem('drhire-selected-role');
        
        if (storedRole) {
            // Validate role
            if (!['admin', 'doctor', 'hospital', 'staff'].includes(storedRole)) {
                storedRole = null;
            }
        }

        if (storedRole) {
            sessionStorage.setItem('drhire-selected-role', storedRole);
            showAuthForm(storedRole);
            
            // Pre-select the card
            roleCards.forEach(c => {
                if (c.dataset.role === storedRole) c.classList.add('active');
                else c.classList.remove('active');
            });
            selectedRole = storedRole;
        } else {
            // Show role selection by default
            if (stepSelect) stepSelect.classList.add('active');
        }


        // Helper: Transition to Auth Form
        function showAuthForm(role) {
            if (stepSelect) stepSelect.classList.remove('active');
            if (stepForm) stepForm.classList.add('active');

            if (roleIndicatorName) roleIndicatorName.textContent = displayNames[role] || role;
            if (roleIndicatorIcon) roleIndicatorIcon.className = 'fa-solid ' + (icons[role] || 'fa-user');

            if (isRegisterPage) {
                // Admin restriction block
                const adminBlock = document.getElementById('adminAccessBlock');
                const normalForm = document.getElementById('normalAuthForm');
                
                if (role === 'admin') {
                    if (adminBlock) adminBlock.style.display = 'block';
                    if (normalForm) normalForm.style.display = 'none';
                } else {
                    if (adminBlock) adminBlock.style.display = 'none';
                    if (normalForm) normalForm.style.display = 'block';

                    // Toggle specific fields
                    const fieldsDoctor = document.getElementById('fields-doctor');
                    const fieldsHospital = document.getElementById('fields-hospital');
                    const fieldsStaff = document.getElementById('fields-staff');

                    if (fieldsDoctor) fieldsDoctor.style.display = role === 'doctor' ? 'block' : 'none';
                    if (fieldsHospital) fieldsHospital.style.display = role === 'hospital' ? 'block' : 'none';
                    if (fieldsStaff) fieldsStaff.style.display = role === 'staff' ? 'block' : 'none';
                }
            }
        }
    });
})();
