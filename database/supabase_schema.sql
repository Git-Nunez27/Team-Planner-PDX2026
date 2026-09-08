-- Run this script once in Supabase Dashboard > SQL Editor > New query.
-- The app stores one shared snapshot so employees, plans, and approval history
-- remain consistent across devices.

create table if not exists public.app_state (
	id smallint primary key check (id = 1),
	data jsonb not null default '{"employees": [], "plans": [], "history": []}'::jsonb,
	updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Public app state read" on public.app_state;
create policy "Public app state read"
	on public.app_state for select
	to anon
	using (true);

drop policy if exists "Public app state write" on public.app_state;
create policy "Public app state write"
	on public.app_state for insert
	to anon
	with check (id = 1);

drop policy if exists "Public app state update" on public.app_state;
create policy "Public app state update"
	on public.app_state for update
	to anon
	using (id = 1)
	with check (id = 1);
