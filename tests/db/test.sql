\set ON_ERROR_STOP on
\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'
\set u3 '33333333-3333-3333-3333-333333333333'
\set u4 '44444444-4444-4444-4444-444444444444'
create temp table t(k text primary key, v text); grant all on t to authenticated;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;
create or replace function pg_temp.expect_err(q text, label text) returns void language plpgsql as $$
begin begin execute q; raise notice 'FAIL  % (doveva dare errore)', label; exception when others then raise notice 'PASS  % [%]', label, sqlerrm; end; end $$;
create or replace function pg_temp.expect_count(q text, expected int, label text) returns void language plpgsql as $$
declare n int; begin execute 'select count(*) from (' || q || ') x' into n;
 if n = expected then raise notice 'PASS  %', label; else raise notice 'FAIL  % (trovate %, attese %)', label, n, expected; end if; end $$;

create or replace function pg_temp.expect_rows(q text, expected int, label text) returns void language plpgsql as $$
declare n int; begin execute q; get diagnostics n = row_count;
 if n = expected then raise notice 'PASS  %', label; else raise notice 'FAIL  % (righe toccate %, attese %)', label, n, expected; end if; end $$;

-- u1 crea la coppia
set role authenticated; select pg_temp.as_user(:'u1');
insert into t select 'cid', (create_couple()->>'id');
insert into t select 'code', (select code from couples where id = (select v::uuid from t where k='cid')) where false;
reset role;
insert into t select 'code', code from couples;
set role authenticated; select pg_temp.as_user(:'u1');
-- u1 scrive nel suo spazio
insert into docs(couple,path,data) select v::uuid,'answers/A','{"k1":"e3:xx"}' from t where k='cid';
insert into docs(couple,path,data) select v::uuid,'slots/'||:'u1','{"s":"A"}' from t where k='cid';
select pg_temp.expect_count('select 1 from docs',2,'u1 legge i propri 2 documenti');
-- estraneo u3
select pg_temp.as_user(:'u3');
select pg_temp.expect_count('select 1 from docs',0,'ESTRANEO: non legge nessun documento');
select pg_temp.expect_count('select 1 from members',0,'ESTRANEO: non vede i membri');
select pg_temp.expect_count('select 1 from couples',0,'ESTRANEO: non vede nemmeno il codice della coppia');
select pg_temp.expect_count('select 1 from push_subs',0,'ESTRANEO: non vede le iscrizioni alle notifiche');
select pg_temp.expect_err('insert into docs(couple,path,data) select v::uuid,''answers/X'',''{}'' from t where k=''cid''','ESTRANEO: non può scrivere nella coppia');
select pg_temp.expect_err('insert into members(couple,uid) select v::uuid,'''||:'u3'||'''::uuid from t where k=''cid''','ESTRANEO: non può aggiungersi ai membri');
select pg_temp.expect_rows('update docs set data=''{"k1":"hack"}''',0,'ESTRANEO: non può modificare documenti');
select pg_temp.expect_rows('update couples set code=''AAAAAAAA''',0,'ESTRANEO: non può cambiare il codice');
select pg_temp.expect_err('select join_couple(''ZZZZZZZZ'')','ESTRANEO: codice sbagliato rifiutato');
select pg_temp.expect_err('select make_device_code()','ESTRANEO: non può generare codici nuovo telefono');
select pg_temp.expect_err('select save_push(''{"endpoint":"x"}''::jsonb)','ESTRANEO: non può registrare notifiche');
select pg_temp.expect_err('select delete_couple()','ESTRANEO: non può cancellare la coppia');
-- u2 entra col codice
select pg_temp.as_user(:'u2');
reset role; create temp table c as select code from couples; grant all on c to authenticated; set role authenticated; select pg_temp.as_user(:'u2');
select pg_temp.expect_count('select 1 from (select join_couple((select code from c))) j',1,'u2 entra con il codice');
select pg_temp.expect_count('select 1 from docs',2,'u2 (membro) legge i documenti della coppia');
insert into docs(couple,path,data) select v::uuid,'slots/'||:'u2','{"s":"B"}' from t where k='cid';
select pg_temp.expect_rows('delete from docs',0,'MEMBRO: non può cancellare davvero i documenti (solo contrassegnarli)');
-- coppia completa: u3 col codice giusto non entra
select pg_temp.as_user(:'u3');
select pg_temp.expect_err('select join_couple((select code from c))','ESTRANEO: con il codice giusto ma a coppia completa NON entra');
-- nuovo telefono di u1
select pg_temp.as_user(:'u1');
insert into t select 'dev', make_device_code();
reset role; create temp table dv as select v as code from t where k='dev'; grant all on dv to authenticated; set role authenticated;
select pg_temp.as_user(:'u3');
select pg_temp.expect_err('select join_couple(''ZZZZ0000'')','ESTRANEO: indovinare un codice a caso fallisce');
select pg_temp.as_user(:'u4');
select pg_temp.expect_count('select 1 from (select join_couple((select code from dv))) j',1,'NUOVO TELEFONO: entra con il codice monouso');
select pg_temp.expect_err('select join_couple((select code from dv))','il codice monouso non si può riusare');
-- u1 scollega i vecchi telefoni (u4 non ha un profilo scelto, u2 sì)
select pg_temp.as_user(:'u1');
select pg_temp.expect_count('select 1 from (select revoke_old_devices()) r where revoke_old_devices is null',0,'revoke_old_devices parte');
reset role; select 'membri dopo revoca: '||count(*) as info from members;
set role authenticated; select pg_temp.as_user(:'u4');
select pg_temp.expect_count('select 1 from docs',0,'TELEFONO SCOLLEGATO: non legge più nulla');
select pg_temp.expect_err('insert into docs(couple,path,data) select v::uuid,''chat/x'',''{}'' from t where k=''cid''','TELEFONO SCOLLEGATO: non può più scrivere');
select pg_temp.as_user(:'u2');
select pg_temp.expect_count('select 1 from docs',3,'u2 (il partner) continua a leggere dopo la revoca');
-- notifiche
select pg_temp.as_user(:'u1');
select pg_temp.expect_count('select 1 from (select save_push(''{"endpoint":"https://x","keys":{}}''::jsonb)) s',1,'u1 registra le notifiche');
reset role; select 'iscrizioni: '||count(*) from push_subs; set role authenticated;
-- cancellazione totale
select pg_temp.as_user(:'u1');
select delete_couple();
select pg_temp.as_user(:'u2');
select pg_temp.expect_count('select 1 from docs',0,'CANCELLAZIONE: i documenti sono spariti per tutti');
reset role;
select 'righe rimaste: couples='||(select count(*) from couples)||' members='||(select count(*) from members)||' docs='||(select count(*) from docs)||' push='||(select count(*) from push_subs) as finale;
