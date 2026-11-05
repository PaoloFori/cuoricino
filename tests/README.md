# Test di Cuoricino

Servono Node 20 (cifratura), Docker (database) e Python 3 con `websocket-client` e `cryptography`, più Google Chrome (prova a due telefoni).

- `node tests/crypto.test.js` : la cifratura (tutti i tipi di documento, nessun testo in chiaro, valori legati al documento e al campo, scambi e manomissioni, chiave sbagliata, PIN, PIN dimenticato, cambio chiave).
- `tests/db/run.sh` : lo schema di `supabase.sql` su un vero Postgres: un estraneo non legge né scrive, il codice non entra a coppia completa, la revoca dei telefoni, la cancellazione.
- `python3 tests/e2e/run.py` : due telefoni (due Chrome) contro un finto server: la coppia, la chiave, il blocco senza chiave, foto/testi/nomi/partite cifrati sul server, la migrazione dei dati vecchi, il blocco con PIN (anche automatico), il cambio chiave (con decifrazione indipendente fuori dall'app), nessuna richiesta a siti esterni, la cancellazione e che le regole di sicurezza del browser (CSP) non blocchino nulla.

Cosa NON provano: il servizio Supabase vero (qui è simulato, e il database è un Postgres normale con `auth.uid()` finto), un telefono vero, le notifiche push.
