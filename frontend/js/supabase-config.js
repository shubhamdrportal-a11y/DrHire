// ── Supabase Client Init ─────────────────────────────────────────
const SUPABASE_URL = 'https://ugoakhzbxkasrruwtnen.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s1QhSJb45xNT-LwFUu34GA_08EjVfKI';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
