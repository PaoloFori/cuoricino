# Cuoricino 💗

L'app a due per coppie: quiz, ricordi, storie e giochi.

Autore: Paolo Fori.

## Dove andare
**Cuoricino:** https://paolofori.github.io/cuoricino

## Come si usa
1. Apri il link dal telefono.
2. Il primo dei due sceglie **Crea la nostra coppia**, scrive il proprio nome e riceve un codice **e la chiave di cifratura**. Salva la chiave (vedi sotto).
3. L'altra persona sceglie **Ho un codice**, lo inserisce, incolla la chiave che le hai passato e scrive il proprio nome.
4. I due profili si uniscono da soli nella sezione **Noi**.

### Aggiungere l'app alla Home
- **iPhone:** apri il link in Safari, tocca Condividi, poi "Aggiungi a Home".
- **Android:** apri il link in Chrome, tocca il menu, poi "Aggiungi a schermata Home".

## I giochi
Si trovano nella sezione **Giochi**. Si gioca a turno, ognuno dal proprio telefono, e c'è una classifica delle vittorie per ogni gioco e in totale (con "Azzera"). Quasi tutti hanno **quattro livelli di difficoltà** (Facile, Normale, Difficile, Esperto): cambiano la griglia, la velocità, la grandezza del bersaglio o della buca, il vento e gli ostacoli.

| Gioco | Com'è |
|---|---|
| ❓ **20 domande** | Uno pensa a qualcosa, l'altro ha solo domande sì/no per indovinare. |
| 🔴 **Forza 4** | Dischi che cadono, righe da quattro. Griglia grande e modalità Pop out. Scegli la mossa e premi "Invia la mossa". |
| 🚢 **Battaglia navale** | Piazza la flotta (tocca una nave per spostarla), prendi la mira e fuoco. Più flotte e regole. |
| 🕵️ **Indovina chi** | Scopri la carta segreta con le domande giuste. |
| 🏹 **Tiro con l'arco** | Il mirino segue il dito: tendi l'arco, tieni conto del vento e colpisci il centro. Difficoltà Facile, Normale, Pro. |
| ⭕ **Tris** | Il classico tre in fila, anche in versione grande 5×5. |
| 🃏 **Memory a coppie** | Gira le carte e trova le coppie: ogni coppia ti dà un altro turno. |
| ⛳ **Mini golf** | Campi casuali, ostacoli e bumper. Lo stesso percorso per tutti e due. |
| 🐦 **Flappy cuore** | Tocca per battere le ali e passa tra i tubi. Stessi tubi per tutti e due: vince chi ne supera di più. |
| 🔷 **Cuore Dash** | Il cuore corre da solo: tocca per saltare spine, blocchi e buche. Stesso percorso per tutti e due: vince chi va più lontano. |

Le partite restano salvate: puoi uscire con "← Indietro" e giocarne più d'una insieme. Ogni giorno c'è una **Sfida del giorno** con regole a caso, e su ogni gioco "🎲 A sorpresa".

Oltre ai giochi ci sono i **quiz**: la domanda del giorno, il mazzo con più di mille domande divise per categoria, quiz a tema e il resoconto di fine mese. I contenuti **Hot 18+** si sbloccano solo se dicono sì tutti e due.

## Cifratura delle foto e dei messaggi 🔒
**Quasi tutto** (foto, messaggi, risposte, note, posizione, partite, nomi, punteggi) viene **cifrato sul telefono** prima di andare sul server: sul server si vede solo materiale illeggibile. La chiave non va mai al server. Restano visibili soltanto etichette tecniche, le date di scrittura e il posto A/B.

**Coppia nuova:** la cifratura è già attiva. Alla creazione compare la chiave: **copiala e salvala** (gestore di password o nota privata) e passala all'altra persona in un messaggio privato o a voce.

**Coppia già in uso: cosa succede quando si preme "Attiva la cifratura"** (in **Noi**, scheda "Cifratura 🔓 non attiva"):
1. L'app crea una chiave nuova sul tuo telefono e la mostra: **copiala e salvala subito**.
2. Cifra da sola le foto e i dati già salvati sul server (compaiono messaggi "Cifro i dati già salvati… N"). Aspetta che finisca.
3. La scheda diventa "Cifratura 🔒 attiva". Da lì puoi rivedere la chiave con "Mostra la chiave".
4. L'altro telefono, appena riaperto l'app, mostra una schermata che chiede la chiave: va incollata (la scrivi tu a mano o la mandi in un messaggio privato). Senza, non apre nulla.
5. Sull'altro telefono, dopo aver inserito la chiave, premi in **Noi** "Cifra i dati già salvati" per cifrare anche le sue risposte vecchie.

**Attenzione:** se perdi la chiave su tutti i telefoni, foto e messaggi **non si riaprono più** (nemmeno da noi). Teniamene una copia al sicuro.

**Blocco con PIN 🔐:** in **Noi → Blocco con PIN** scegli un PIN (almeno 6 caratteri, meglio una frase). La chiave viene chiusa nel telefono: senza PIN chi lo prende non apre i vostri dati. L'app si blocca da sola quando la lasci (subito, dopo 1, 5 o 15 minuti) e nell'elenco delle app aperte il contenuto non si vede. Se dimentichi il PIN lo reimposti con la chiave di cifratura.

**Cambiare la chiave:** in **Noi → Cifratura → Cambia la chiave**. Serve se pensi che la chiave sia stata vista da qualcuno o dopo aver perso un telefono. Tutto viene ricifrato (circa un minuto: tieni l'app aperta). L'altro telefono si ferma, poi chiede la chiave nuova da incollare.

**Telefono perso o sostituito:** in **Noi → Collegamento tra telefoni** premi "Ho perso un telefono: scollega i vecchi". I telefoni che non sono più tuoi non leggono più nulla dal server.

**Cancellare tutto dal server:** in **Noi → Privacy e dati** c'è "Cancella tutti i dati dal server" (doppia conferma, per entrambi).

## Aggiornare l'app (per chi gestisce il progetto)
1. **Supabase** → SQL Editor → incolla di nuovo tutto [supabase.sql](supabase.sql) e premi **Run** (è sicuro rifarlo: aggiorna le funzioni senza toccare i dati).
2. **GitHub**: fai un solo `git push`. Aspetta circa un minuto che in **Actions** diventi verde.
3. Su ogni telefono **chiudi del tutto l'app e riaprila**: scarica da sola i file nuovi.
4. Solo la prima volta: attiva la cifratura (vedi sopra) e le notifiche (vedi sotto).

Se cambi la funzione `push` o le notifiche, rifai anche il passaggio descritto in [GUIDA.md](GUIDA.md) ("Attivare le notifiche").

## Notifiche 🔔
In **Noi → Avvisi** attivi le notifiche: alle 8 il promemoria delle attività, alle 20 il sollecito se non le hai fatte, un avviso quando l'altro le fa e quando in un gioco tocca a te. Su iPhone serve iOS 16.4 o più recente e l'app aggiunta alla schermata Home. La configurazione del server è in [GUIDA.md](GUIDA.md).

## Prove automatiche
La cartella [tests/](tests/) contiene le prove di cifratura, database e due telefoni: vedi [tests/README.md](tests/README.md).

Per la configurazione del server vedi [GUIDA.md](GUIDA.md).
