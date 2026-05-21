create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  short_id text unique not null default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  view_token text not null default encode(gen_random_bytes(18), 'hex'),
  name text not null,
  goal numeric not null default 0,
  monthly_due numeric not null default 0,
  currency text not null default 'IDR',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  amount numeric not null check (amount > 0),
  paid_month date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  role text not null check (role in ('admin', 'member', 'viewer')),
  token text unique not null default encode(gen_random_bytes(18), 'hex'),
  created_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.group_role(p_group_id uuid, p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select gm.role
  from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = p_user_id
  limit 1
$$;

create or replace function public.set_payment_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists payments_set_creator on public.payments;
create trigger payments_set_creator
before insert on public.payments
for each row execute function public.set_payment_creator();

alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.group_members enable row level security;
alter table public.payments enable row level security;
alter table public.group_invites enable row level security;

drop policy if exists "members can view groups" on public.groups;
create policy "members can view groups" on public.groups
for select using (public.group_role(id) is not null);

drop policy if exists "admins can update groups" on public.groups;
create policy "admins can update groups" on public.groups
for update using (public.group_role(id) = 'admin')
with check (public.group_role(id) = 'admin');

drop policy if exists "members can view member rows" on public.members;
create policy "members can view member rows" on public.members
for select using (public.group_role(group_id) is not null);

drop policy if exists "admins can insert members" on public.members;
create policy "admins can insert members" on public.members
for insert with check (public.group_role(group_id) = 'admin');

drop policy if exists "admins can update members" on public.members;
create policy "admins can update members" on public.members
for update using (public.group_role(group_id) = 'admin')
with check (public.group_role(group_id) = 'admin');

drop policy if exists "admins can delete members" on public.members;
create policy "admins can delete members" on public.members
for delete using (public.group_role(group_id) = 'admin');

drop policy if exists "users can view own membership or admin can view all" on public.group_members;
create policy "users can view own membership or admin can view all" on public.group_members
for select using (user_id = auth.uid() or public.group_role(group_id) = 'admin');

drop policy if exists "members can view payments" on public.payments;
create policy "members can view payments" on public.payments
for select using (public.group_role(group_id) is not null);

drop policy if exists "admins and members can insert payments" on public.payments;
create policy "admins and members can insert payments" on public.payments
for insert with check (
  public.group_role(group_id) = 'admin'
  or (
    public.group_role(group_id) = 'member'
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = payments.group_id
        and gm.user_id = auth.uid()
        and gm.member_id = payments.member_id
    )
  )
);

drop policy if exists "admins or payment creators can update payments" on public.payments;
create policy "admins or payment creators can update payments" on public.payments
for update using (public.group_role(group_id) = 'admin' or created_by = auth.uid())
with check (public.group_role(group_id) = 'admin' or created_by = auth.uid());

drop policy if exists "admins or payment creators can delete payments" on public.payments;
create policy "admins or payment creators can delete payments" on public.payments
for delete using (public.group_role(group_id) = 'admin' or created_by = auth.uid());

drop policy if exists "admins can view invites" on public.group_invites;
create policy "admins can view invites" on public.group_invites
for select using (public.group_role(group_id) = 'admin');

create or replace function public.create_default_tantrum_group()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  insert into public.groups (name, goal, monthly_due, currency, created_by)
  values ('Tantrum''s Money', 10000000, 50000, 'IDR', auth.uid())
  returning * into v_group;

  insert into public.group_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'admin');

  insert into public.members (group_id, name) values
    (v_group.id, 'Naylah Joestar'),
    (v_group.id, 'Arsyifa'),
    (v_group.id, 'Mila'),
    (v_group.id, 'Ditha'),
    (v_group.id, 'Dwi Kurnia'),
    (v_group.id, 'Vanka'),
    (v_group.id, 'Selvi'),
    (v_group.id, 'Salma'),
    (v_group.id, 'Zata');

  for v_member_id in select id from public.members where group_id = v_group.id and name = 'Arsyifa' loop
    insert into public.payments (group_id, member_id, created_by, amount, paid_month)
    select v_group.id, v_member_id, auth.uid(), 50000, make_date(2026, m, 1) from generate_series(1, 4) m;
  end loop;

  for v_member_id in select id from public.members where group_id = v_group.id and name in ('Mila', 'Selvi') loop
    insert into public.payments (group_id, member_id, created_by, amount, paid_month)
    select v_group.id, v_member_id, auth.uid(), 50000, make_date(2026, m, 1) from generate_series(1, 5) m;
  end loop;

  for v_member_id in select id from public.members where group_id = v_group.id and name in ('Ditha', 'Dwi Kurnia', 'Vanka') loop
    insert into public.payments (group_id, member_id, created_by, amount, paid_month)
    select v_group.id, v_member_id, auth.uid(), 50000, make_date(2026, m, 1) from generate_series(1, 3) m;
  end loop;

  for v_member_id in select id from public.members where group_id = v_group.id and name = 'Salma' loop
    insert into public.payments (group_id, member_id, created_by, amount, paid_month)
    select v_group.id, v_member_id, auth.uid(), 50000, make_date(2026, m, 1) from generate_series(1, 4) m;
    insert into public.payments (group_id, member_id, created_by, amount, paid_month)
    values (v_group.id, v_member_id, auth.uid(), 25000, date '2026-05-01');
  end loop;

  for v_member_id in select id from public.members where group_id = v_group.id and name = 'Zata' loop
    insert into public.payments (group_id, member_id, created_by, amount, paid_month)
    select v_group.id, v_member_id, auth.uid(), 50000, make_date(2026, m, 1) from generate_series(1, 4) m;
  end loop;

  return jsonb_build_object('id', v_group.id, 'short_id', v_group.short_id);
end;
$$;

create or replace function public.create_group_invite(p_group_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.group_invites;
begin
  if public.group_role(p_group_id) <> 'admin' then
    raise exception 'Admin access required';
  end if;
  if p_role not in ('admin', 'member', 'viewer') then
    raise exception 'Invalid role';
  end if;

  insert into public.group_invites (group_id, role, created_by)
  values (p_group_id, p_role, auth.uid())
  returning * into v_invite;

  return jsonb_build_object('token', v_invite.token, 'role', v_invite.role);
end;
$$;

create or replace function public.get_invite_info(p_short_id text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_invite public.group_invites;
begin
  select * into v_group from public.groups where short_id = p_short_id;
  select * into v_invite from public.group_invites
  where group_id = v_group.id and token = p_token and active = true;
  if v_group.id is null or v_invite.id is null then
    raise exception 'Invite not found';
  end if;

  return jsonb_build_object(
    'role', v_invite.role,
    'group_name', v_group.name,
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name), '[]'::jsonb)
      from public.members
      where group_id = v_group.id
    )
  );
end;
$$;

create or replace function public.join_group_with_invite(p_short_id text, p_token text, p_member_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_invite public.group_invites;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select * into v_group from public.groups where short_id = p_short_id;
  select * into v_invite from public.group_invites
  where group_id = v_group.id and token = p_token and active = true;
  if v_group.id is null or v_invite.id is null then
    raise exception 'Invite not found';
  end if;
  if v_invite.role = 'member' and p_member_id is null then
    raise exception 'Member invite requires a member selection';
  end if;

  insert into public.group_members (group_id, user_id, role, member_id)
  values (v_group.id, auth.uid(), v_invite.role, p_member_id)
  on conflict (group_id, user_id)
  do update set role = excluded.role, member_id = excluded.member_id;

  return jsonb_build_object('short_id', v_group.short_id, 'role', v_invite.role);
end;
$$;

create or replace function public.get_public_tracker(p_short_id text, p_view_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
begin
  select * into v_group
  from public.groups
  where short_id = p_short_id and view_token = p_view_token;
  if v_group.id is null then
    raise exception 'Tracker not found';
  end if;

  return jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'short_id', v_group.short_id,
      'name', v_group.name,
      'goal', v_group.goal,
      'monthly_due', v_group.monthly_due,
      'currency', v_group.currency,
      'view_token', v_group.view_token
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name), '[]'::jsonb)
      from public.members
      where group_id = v_group.id
    ),
    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'member_id', member_id,
        'created_by', created_by,
        'amount', amount,
        'paid_month', paid_month
      ) order by paid_month desc), '[]'::jsonb)
      from public.payments
      where group_id = v_group.id
    )
  );
end;
$$;
