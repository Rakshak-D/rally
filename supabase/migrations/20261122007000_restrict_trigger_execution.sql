-- Trigger-only routines must never be exposed as direct authenticated RPCs.
-- PostgreSQL executes existing triggers without requiring caller EXECUTE privileges.
revoke execute on function public.prevent_challenge_overlap() from public, anon, authenticated;
revoke execute on function public.enforce_checkin_integrity() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
