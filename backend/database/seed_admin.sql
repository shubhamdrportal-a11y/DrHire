-- ============================================================
-- seed_admin.sql
-- Creates the initial admin account.
-- Password: Admin@DRHire2026  (change immediately after first login)
-- Run AFTER schema.sql
-- ============================================================

USE drhire;

INSERT INTO users (email, password_hash, role, status)
VALUES (
    'admin@drhire.in',
    -- bcrypt hash of "Admin@DRHire2026"
    '$2y$12$eVMaJxGr4t5w3RlN6F7oeu9PqGkXzChWD8RkV1jT2yYqBtEsMo1mO',
    'admin',
    'active'
)
ON DUPLICATE KEY UPDATE email = email;

-- Log the seed action
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
SELECT id, 'admin_seeded', 'user', id, '127.0.0.1'
FROM users WHERE email = 'admin@drhire.in';
