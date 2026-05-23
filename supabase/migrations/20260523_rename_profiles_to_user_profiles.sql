-- ─────────────────────────────────────────────────────────────────
-- Rename `profiles` → `user_profiles`, arricchimento del mirror utente.
--
-- Contesto: gli utenti applicativi SONO gli utenti Supabase (`auth.users`,
-- gestita dal sistema). Il profilo app-facing vive in public.user_profiles
-- (mirror: display_name, avatar_url, locale). Il trigger handle_new_user lo
-- popolava male (solo display_name dalla chiave 'display_name' → prefisso email,
-- niente avatar) e gli utenti pre-trigger non erano stati backfillati.
--
-- 1. Rinomina la tabella (RLS policies, indici e FK seguono per OID).
-- 2. handle_new_user legge full_name/name/display_name + avatar_url/picture dai
--    metadata OAuth. Idempotente (on conflict do nothing): non sovrascrive gli
--    edit fatti dall'utente nell'app.
-- 3. Backfill dei profili esistenti da auth.users, riempiendo solo i campi
--    mancanti (coalesce) per non perdere dati.
-- ─────────────────────────────────────────────────────────────────

alter table public.profiles rename to user_profiles;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'display_name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

insert into public.user_profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'display_name', ''),
    split_part(u.email, '@', 1)
  ),
  coalesce(
    nullif(u.raw_user_meta_data->>'avatar_url', ''),
    nullif(u.raw_user_meta_data->>'picture', '')
  )
from auth.users u
on conflict (id) do update
  set display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
      avatar_url   = coalesce(public.user_profiles.avatar_url, excluded.avatar_url),
      updated_at   = now();
