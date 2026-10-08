-- pwnctual's database, on Supabase. Paste this whole file into the Supabase dashboard's
-- SQL Editor and run it. Safe to re-run: it only creates what's missing and resets the rules.
--
-- The site talks to this straight from the browser with the project's public (anon) key,
-- so the row level security rules below are what keep people to their own data.

-- ------------------------------------------------------------------ tables

-- One per account. The login is your GitHub username (with -2, -3... added if it's taken).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  login text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_login_check;
alter table public.profiles add constraint profiles_login_check check (login ~ '^[A-Za-z0-9_-]{1,39}$');

-- Challenges people say they finished (honor system, nothing is checked).
create table if not exists public.solves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[A-Za-z0-9_-]{1,64}$'),
  solved_at timestamptz not null default now(),
  primary key (user_id, slug)
);

-- ------------------------------------------------------------------ who can do what

alter table public.profiles enable row level security;
alter table public.solves enable row level security;

-- Everyone can read profiles and solves: they make up the leaderboard and profile pages.
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "solves are public" on public.solves;
create policy "solves are public" on public.solves for select using (true);

-- Profiles are created by the trigger below, never by the browser, and can't be edited from it.
drop policy if exists "rename yourself" on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;

-- You can mark and unmark your own challenges.
drop policy if exists "mark your own" on public.solves;
create policy "mark your own" on public.solves for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "unmark your own" on public.solves;
create policy "unmark your own" on public.solves for delete to authenticated
  using ((select auth.uid()) = user_id);
revoke update on public.solves from anon, authenticated;

-- ------------------------------------------------------------------ new accounts get a profile

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text := left(regexp_replace(coalesce(new.raw_user_meta_data ->> 'user_name', ''), '[^A-Za-z0-9_-]', '', 'g'), 32);
  candidate text;
  n int := 1;
begin
  if base = '' then base := 'hacker'; end if;
  candidate := base;
  loop
    begin
      insert into public.profiles (id, login) values (new.id, candidate);
      exit;
    exception when unique_violation then
      -- someone already has that login (e.g. a GitHub user who renamed): add a number
      n := n + 1;
      candidate := base || '-' || n;
    end;
  end loop;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ leaderboard

-- Top 100 by challenges finished; ties go to whoever got there first. The site passes
-- the slugs of the challenges that exist today, so removed or made-up ones don't count.
create or replace function public.leaderboard(known text[])
returns table (login text, score bigint, last_solved timestamptz)
language sql stable set search_path = '' as $$
  select p.login, count(*), max(s.solved_at)
  from public.solves s join public.profiles p on p.id = s.user_id
  where s.slug = any (known)
  group by p.id, p.login
  order by count(*) desc, max(s.solved_at) asc
  limit 100
$$;
