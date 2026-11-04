-- Cuoricino: pianificazione delle notifiche delle 8:00 e delle 20:00 (ora italiana).
-- Prima: dopo aver messo in funzione "push" (vedi GUIDA.md), sostituisci PASTE_CRON_SECRET con il valore di CRON_SECRET
-- che trovi in push-secrets.txt. Poi incolla tutto nell'SQL Editor e premi Run.
-- Ogni ora la funzione controlla l'ora italiana: alle 8 manda il buongiorno, alle 20 il sollecito a chi non ha finito.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('cuoricino-tick') where exists (select 1 from cron.job where jobname = 'cuoricino-tick');

select cron.schedule(
  'cuoricino-tick',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://apcetxglxilpyvrjjrai.supabase.co/functions/v1/push',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'PASTE_CRON_SECRET'),
       body := '{"type":"tick"}'::jsonb
     ) $$
);
