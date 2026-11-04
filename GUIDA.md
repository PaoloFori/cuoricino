# Cuoricino: collegare due telefoni (5 minuti, gratis)

1. Vai su supabase.com, crea un account e un nuovo progetto (scegli una regione europea).
2. Authentication > Sign In / Providers > attiva "Allow anonymous sign-ins".
3. SQL Editor > New query: incolla tutto il contenuto di `supabase.sql` e premi Run.
4. Project Settings > API: copia "Project URL" e la chiave "anon public".
5. Apri `config.js` e incolla i due valori tra gli apici, poi ripubblica la cartella dove hai messo l'app.

Uso:
- Primo telefono: "Crea la nostra coppia" > ti dà un codice (es. 4E59-BAF0) > mandalo all'altra persona.
- Secondo telefono: "Ho un codice" > inserisci il codice. Il secondo posto si assegna da solo.
- Nuovo telefono: sul vecchio vai in Noi > "Collega un nuovo telefono" (codice monouso, 15 minuti). Sul nuovo scegli "Ho un codice".
- Se perdi il telefono vecchio senza aver generato il codice, serve cancellare la riga della coppia dal pannello Supabase e rifare la coppia.

Note:
- La chiave "anon" è pubblica per progetto: la sicurezza è nelle regole del database (già incluse nello script).
- Il piano gratuito mette in pausa il progetto dopo circa una settimana senza uso: dal pannello si riattiva con un clic.
- Le foto sono compresse e salvate nel database: va benissimo per due persone.

## Aggiornare l'app senza perdere nulla
- Quando ti mando una versione nuova, **ricarica gli stessi file nello stesso posto** (stesso indirizzo web, stessa cartella su Netlify). Non serve togliere e rimettere l'icona dalla Home.
- L'app, ogni volta che la apri con internet, scarica da sola i file nuovi. Se non vedi le novità, chiudila del tutto (scorri via dal selettore app) e riaprila.
- Le tue risposte, le storie, le foto e la timeline stanno nel server (Supabase) e nella memoria del telefono, non nei file dell'app: un aggiornamento non li tocca.
- **Mai cambiare l'indirizzo** (per esempio un nuovo sito Netlify): il telefono lo considera un'altra app e ripartiresti da zero in locale. Con Supabase i dati restano comunque al sicuro: basta "Ho un codice".
- Se usi Netlify Drop, per mantenere lo stesso indirizzo apri il sito nel pannello Netlify e usa "Deploys" > trascina la cartella nuova, invece di crearne uno nuovo.

## Novità versione 4
- Nuove categorie di domande: Viaggi, Cibo, Futuro, Passato, Cultura pop, Profonde (si usano dal Mazzo e nei quiz rapidi).
- Resoconto del mese: l'ultimo giorno del mese la "Domanda del giorno" diventa un resoconto di 6 domande (3 fisse + 3 pescate da un insieme di 20). Conta per la serie.
- Nuovi giochi: Tris (3×3 o 5×5) e Memory a coppie.
- Classifica vittorie per gioco e totale, nella sezione Giochi.
- Per aggiornare basta riaprire l'app: nessun bisogno di rimetterla in Home.

## Novità versione 5
- Accanto ai giorni insieme c'è il numero di risposte alla domanda del giorno.
- Più di 880 domande nel mazzo, con 8 nuove categorie (Lavoro e studio, Famiglia e amici, Sport e benessere, Natura e animali, Sogni e fantasia, Valori, Casa e routine, Tecnologia).
- Forza 4 e Tris: scegli la mossa, poi premi "Invia la mossa" (puoi cambiare idea prima).
- Tiro con l'arco: difficoltà Facile/Normale/Pro, bersaglio che si allontana e rimpicciolisce, vento più forte.
- Mini golf con nuova grafica.
- Classifica a tendina con "Azzera" per singolo gioco o totale.

## Novità versione 6
- Serie di giorni: il cuore si riempie in 7 giorni di risposte; da 7 compare il fuoco 🔥, da 30 due.

## Novità versione 7
- L'app si chiama ora Cuoricino. I dati e il collegamento tra i due telefoni restano quelli di prima. Se in Home vedi ancora il vecchio nome, togli l'icona e rimettila una volta sola (il nome dell'icona lo fissa iOS al momento dell'aggiunta).

## Novità versione 8
- Il mazzo ha un menù a tendina per le categorie, più di 1000 domande.
- Le domande che create voi hanno una categoria: entrano nel mazzo e potete pescarle di nuovo.
- Ricordi: al posto di "+ Nuova" c'è un cuore con voi due dentro (apre le storie).
- La posizione si aggiorna da sola ogni volta che apri l'app (chiede il permesso la prima volta).
- Battaglia navale: tocca una nave già messa per spostarla.
- Tiro con l'arco rifatto: il mirino segue il dito.
- Nuovo gioco: 20 domande.
- Giochi con grafica più curata.

## Novità versione 9
- Ognuno ha il proprio profilo: chi crea la coppia scrive solo il proprio nome; il partner, quando si collega, scrive il suo. In "Noi" compaiono entrambi da soli.
- Ricordi: un solo grande cuore con i due nomi e le foto profilo.

## Novità versione 10
- Nuove categorie nel Mazzo: Soldi e progetti, Manie e abitudini, Infanzia, Fiducia e litigi (60 domande).
- Hot 18+ ora ha sottocategorie: Flirt e seduzione, Fantasie, Intimità, Piccanti (60 domande). Restano bloccate finché non dicono sì tutti e due.
- Resoconto del mese: da novembre 2026 ha un numero variabile di domande (da 6 a 9, 3 fisse + da 3 a 6 scelte dal mese) e il pool passa da 20 a 45 domande su com'è andato il mese.
- Traguardi: tolti i doppioni ("365 giorni" e "1 anno" lo stesso giorno); restano i traguardi in giorni e gli anniversari in anni.
- Telefono: tocchi senza ritardo né zoom al doppio tocco, altezza corretta con la barra del browser, barra in basso più adattabile sugli schermi stretti.

## Novità versione 11
- **Partite salvate:** ogni mossa resta nel server. Dalla partita c'è "← Indietro" (non serve più abbandonare) e in Giochi compare "Partite in corso", con "Tocca a te". Si possono giocare più partite insieme; "Elimina" le toglie.
- **Sfida del giorno:** due giochi con regole scelte a caso ma uguali per tutti e due, diversi ogni giorno. Su ogni gioco c'è anche "🎲 A sorpresa" (regole a caso).
- **Attività del giorno:** dal 5 novembre 2026 le tre carte diventano una sola con 3 domande (racconto libero, scelta multipla, racconto libero), su qualsiasi argomento. La "Conversazione 18+" resta a parte e si sblocca dopo.
- **Hot più spinto:** nuova sottocategoria "Senza filtri" (63 domande esplicite), un quiz "Senza filtri", due giochi solo hot (Obbligo o verità e Dadi del desiderio, tre livelli) e pegni più spinti. Nel mazzo hot e nel quiz rapido una domanda su tre è "senza filtri". Tutto resta bloccato finché non dicono sì tutti e due.
- **Notifiche vere** (anche con l'app chiusa): ore 8 promemoria, ore 20 sollecito se non hai finito (e ti dice se il partner ha già fatto), avviso quando il partner finisce le attività, e "tocca a te" nei giochi. Serve la configurazione qui sotto.

### Attivare le notifiche (una volta sola)
1. In Supabase, SQL Editor: incolla di nuovo tutto `supabase.sql` e premi Run (è sicuro rifarlo: aggiunge solo le tabelle delle notifiche).
2. Edge Functions > Deploy a new function > "Via Editor". Nome: `push`. Incolla tutto il contenuto di `supabase/functions/push/index.ts` e premi Deploy.
3. Aprila, vai in Details e **spegni "Verify JWT"** (il controllo lo fa già la funzione), poi salva.
4. Edge Functions > Secrets: aggiungi i tre valori che trovi nel file `push-secrets.txt` (VAPID_PUBLIC, VAPID_PRIVATE, CRON_SECRET). Quel file non va caricato su GitHub (è già escluso).
5. SQL Editor: apri `supabase-notifiche.sql`, sostituisci `PASTE_CRON_SECRET` con il valore di CRON_SECRET e premi Run. Se dice che pg_cron o pg_net non sono attive, abilitale in Database > Extensions e rifai Run.
6. Carica il progetto su GitHub (`config.js` ha già la chiave pubblica `vapid`).
7. Su **ogni telefono**: Noi > Avvisi, attiva l'interruttore e accetta il permesso. Su iPhone l'app deve essere nella schermata Home (iOS 16.4 o più recente) e va aperta da lì.
