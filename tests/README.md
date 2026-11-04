# Test di Cuoricino

Servono Node 20 (cifratura), Docker (database) e Python 3 con `websocket-client` e Google Chrome (prova a due telefoni).

- `node tests/crypto.test.js` : la cifratura (round trip, nessun testo in chiaro, chiave sbagliata, dato manomesso).
- `tests/db/run.sh` : lo schema di `supabase.sql` su un vero Postgres: un estraneo non legge né scrive, il codice non entra a coppia completa, la revoca dei telefoni, la cancellazione.
- `python3 tests/e2e/run.py` : due telefoni (due Chrome) contro un finto server: la coppia, la chiave, il blocco senza chiave, foto e testi che sul server risultano cifrati, la migrazione dei dati vecchi, la cancellazione, e che le regole di sicurezza del browser (CSP) non blocchino nulla.

Cosa NON provano: il servizio Supabase vero (qui è simulato, e il database è un Postgres normale con `auth.uid()` finto), un telefono vero, le notifiche push.
