-- Cuoricino: schema per Supabase. Incolla tutto nell'SQL Editor e premi Run.
-- Prima: Authentication > Sign In / Providers > attiva "Allow anonymous sign-ins".

create extension if not exists pgcrypto;

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  device_code text,
  device_exp timestamptz,
  created_at timestamptz default now()
);
create table if not exists members (
  couple uuid references couples(id) on delete cascade,
  uid uuid not null,
  primary key (couple, uid)
);
create table if not exists docs (
  couple uuid references couples(id) on delete cascade,
  path text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (couple, path)
);
create index if not exists docs_sync on docs (couple, updated_at);

create or replace function touch() returns trigger language plpgsql as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
drop trigger if exists docs_touch on docs;
create trigger docs_touch before insert or update on docs for each row execute function touch();

alter table couples enable row level security;
alter table members enable row level security;
alter table docs enable row level security;

drop policy if exists members_self on members;
create policy members_self on members for select using (uid = auth.uid());

drop policy if exists docs_read on docs;
create policy docs_read on docs for select using (exists (select 1 from members m where m.couple = docs.couple and m.uid = auth.uid()));
drop policy if exists docs_ins on docs;
create policy docs_ins on docs for insert with check (exists (select 1 from members m where m.couple = docs.couple and m.uid = auth.uid()));
drop policy if exists docs_upd on docs;
create policy docs_upd on docs for update using (exists (select 1 from members m where m.couple = docs.couple and m.uid = auth.uid()))
  with check (exists (select 1 from members m where m.couple = docs.couple and m.uid = auth.uid()));

create or replace function create_couple() returns json language plpgsql security definer set search_path = public as $$
declare c text; id uuid;
begin
  if auth.uid() is null then raise exception 'non autenticato'; end if;
  loop
    c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from couples where code = c or device_code = c);
  end loop;
  insert into couples(code) values (c) returning couples.id into id;
  insert into members(couple, uid) values (id, auth.uid());
  return json_build_object('id', id, 'code', c);
end $$;

create or replace function join_couple(c text) returns json language plpgsql security definer set search_path = public as $$
declare r couples%rowtype; n int;
begin
  if auth.uid() is null then raise exception 'non autenticato'; end if;
  c := upper(c);
  select * into r from couples where device_code = c and device_exp > now();
  if found then
    update couples set device_code = null, device_exp = null where id = r.id;
  else
    select * into r from couples where code = c;
    if not found then raise exception 'codice non valido'; end if;
    select count(*) into n from members where couple = r.id and uid <> auth.uid();
    if n >= 2 then raise exception 'coppia già completa: usa un codice nuovo telefono'; end if;
  end if;
  insert into members(couple, uid) values (r.id, auth.uid()) on conflict do nothing;
  return json_build_object('id', r.id, 'code', r.code);
end $$;

create or replace function make_device_code() returns text language plpgsql security definer set search_path = public as $$
declare cid uuid; c text;
begin
  select couple into cid from members where uid = auth.uid() limit 1;
  if cid is null then raise exception 'nessuna coppia'; end if;
  loop
    c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from couples where code = c or device_code = c);
  end loop;
  update couples set device_code = c, device_exp = now() + interval '15 minutes' where id = cid;
  return c;
end $$;

grant execute on function create_couple() to authenticated;
grant execute on function join_couple(text) to authenticated;
grant execute on function make_device_code() to authenticated;
