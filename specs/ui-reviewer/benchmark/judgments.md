# Candidati: difetti di UI del prototipo company-onboarding

Questo file raccoglie i possibili difetti di UI del prototipo servito a `http://localhost:3104/prototypes/company-onboarding`. Le voci vengono da più fonti; quando due fonti descrivevano lo stesso guasto sullo stesso elemento o stato, sono state unite in una sola voce. Ogni voce è riscritta nello stesso formato e l'ordine è casuale. La provenienza di ciascuna è in una mappa sigillata, che non serve per giudicare.

## Come arrivare alle schermate

- **Prima schermata** («Incolla la pagina LinkedIn dell'azienda»): l'URL del prototipo, all'apertura.
- **Scenario Netflix:** incolla `https://www.linkedin.com/company/netflix` e premi «Continua».
- **Scenario con dati parziali:** incolla `https://www.linkedin.com/company/rossi-digital-parziale` e premi «Continua».
- **Scenario d'errore:** incolla `https://www.linkedin.com/company/rossi-digital-errore` e premi «Continua».
- **Percorso manuale:** dalla prima schermata premi «Non è su LinkedIn». Seguono «Come si chiama la tua azienda?», «Dove inviamo le fatture?», «La tua Partita IVA», «Racconta l'azienda», «Ultimi dettagli» e un riepilogo da controllare.
- **Revisione:** la schermata «Ecco la tua azienda», dopo la lettura della pagina. **Creazione:** «Stiamo creando la tua azienda», dopo «Crea la mia azienda». **Schermata finale:** «Il biglietto da visita della tua azienda è pronto».

## Come giudicare

Nella riga **Giudizio** di ogni voce scrivi uno di questi:

- `reale`: un difetto di UI reale;
- `non è un difetto`;
- `fuori ambito (UX)` oppure `fuori ambito (motion)`, secondo le regole citate sotto;
- `non so`.

Dopo il giudizio puoi aggiungere una nota breve.

Le categorie (`specs/ui-reviewer/RESEARCH-ui-reviewer.md`, parte D, punto 5):

> The maintainer judges each candidate as one of:
> - a real UI defect;
> - not a defect;
> - out of scope: UX or motion, by the split rule of `benchmark/ux-split.md`;
> - can't tell.
>
> Defects the maintainer notices while judging join the pool, as found by the judge.

La regola UX / UI (`specs/project-config-and-flow-modes/benchmark/ux-split.md`):

> **Rule: classify each defect by what the person loses.**
> - **UX:** the person loses the task, their work or data, an information, or control. This covers flows, outcomes and states, recovery, leaving and interrupting, and what the words mean. It also covers task-level accessibility: where focus goes after an action, and whether an outcome is announced.
> - **UI:** the person loses appearance or feel. This covers placement and geometry, widths and wrapping, motion, contrast, focus-ring visibility, target size, accessible-name markup, and browser- or device-specific rendering.

Il confine con il motion (`specs/ui-reviewer/SPEC.md`, § Ownership):

> if it changes while an animation or transition runs on the surface, it is motion; an instant re-layout with nothing animating is UI.

I difetti che noti mentre giudichi vanno in fondo, nella sezione «Difetti aggiunti dal giudice», nello stesso formato e numerati G01, G02, …

## Candidati

### C01
- **Dove:** Schermata finale, scheda dell'azienda: logo seguito dal nome dell'azienda.
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** L'immagine del logo ha come nome il nome dell'azienda, che il testo accanto ripete subito: il nome si sente due volte.
- **Come verificarlo:** Nei DevTools (pannello Accessibilità) ispeziona il logo e il testo che lo segue.
- **Giudizio:** reale

### C02
- **Dove:** Schermata finale: scheda dell'azienda e badge «Attiva» rispetto all'intestazione con il logo.
- **Condizione:** Telefono basso, ad esempio 320×568 e 375×812; anche con riduzione del movimento.
- **Cosa non va:** A riposo la scheda sale oltre il bordo dell'intestazione e il badge «Attiva» arriva a toccare il logo.
- **Come verificarlo:** Completa il flusso a 375×812 e guarda la parte alta della scheda.
- **Giudizio:** reale

### C03
- **Dove:** Revisione, scenario Netflix: riga «Descrizione» chiusa.
- **Condizione:** Tutte le larghezze, desktop compreso.
- **Cosa non va:** La riga chiusa mostra una sola riga del testo, tagliata con i puntini: della descrizione si legge solo l'inizio della prima frase senza aprirla.
- **Come verificarlo:** A 1280 px guarda la riga «Descrizione» chiusa.
- **Giudizio:** reale

### C04
- **Dove:** Bordo dei campi di testo, dei menu a tendina e dell'area di testo: prima schermata, righe aperte della revisione, percorso manuale.
- **Condizione:** Tutte le larghezze; campi a riposo.
- **Cosa non va:** Il bordo grigio chiaro che delimita i campi ha contrasto sotto 3:1 contro il bianco, quindi il contorno del campo si distingue a fatica.
- **Come verificarlo:** Misura il colore del bordo del campo URL contro lo sfondo bianco.
- **Giudizio:** reale

### C05
- **Dove:** Menu a tendina: righe «Settore» e «Paese della Partita IVA» aperte in revisione, «Paese» in «La tua Partita IVA», «Settore» e «Dimensione» in «Racconta l'azienda», «Modalità di lavoro» in «Ultimi dettagli».
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** Il menu prende il nome solo dal valore o dal segnaposto («Entertainment Providers», «IT», «Seleziona…») e non dall'etichetta visibile; in «Racconta l'azienda» due menu si chiamano entrambi «Seleziona…».
- **Come verificarlo:** Nei DevTools (pannello Accessibilità) ispeziona il nome dei due menu di «Racconta l'azienda».
- **Giudizio:** reale

### C06
- **Dove:** Testi grigio chiaro: contatore dei passi in alto («1 / 2», «n / 6»), «Facoltativa» e «Da aggiungere» nelle righe della revisione, «premi Invio ↵» accanto ai pulsanti.
- **Condizione:** Tutte le larghezze; «premi Invio ↵» compare solo su schermi larghi.
- **Cosa non va:** Questi testi hanno contrasto sotto 4.5:1 sul bianco, e ancora meno sulle righe evidenziate in giallo.
- **Come verificarlo:** Misura il contrasto del contatore e di «Da aggiungere» nello scenario con dati parziali.
- **Giudizio:** reale

### C07
- **Dove:** Percorso manuale, «La tua Partita IVA»: campo «Numero».
- **Condizione:** 320 px.
- **Cosa non va:** La colonna del numero è troppo stretta per una Partita IVA di 11 cifre: numero e segnaposto si vedono tagliati.
- **Come verificarlo:** A 320 px digita `11111111111` e guarda se il numero si vede per intero.
- **Giudizio:** reale

### C08
- **Dove:** Revisione: righe con l'icona LinkedIn davanti al valore.
- **Condizione:** Qualsiasi larghezza, ad esempio 1280 px.
- **Cosa non va:** L'etichetta non sta sulla stessa linea di base del valore e scende leggermente più in basso; anche l'altezza delle righe varia tra i due elenchi.
- **Come verificarlo:** Ingrandisci una riga con l'icona e confronta la base dei due testi.
- **Giudizio:** reale

### C09
- **Dove:** Revisione: righe chiuse dell'elenco.
- **Condizione:** Desktop, mouse.
- **Cosa non va:** Passando sopra una riga il cursore resta la freccia e la riga non cambia aspetto, quindi non si capisce che è cliccabile; l'unico indizio è la piccola matita.
- **Come verificarlo:** A 1280 px passa il mouse sopra le righe dello scenario Netflix.
- **Giudizio:** reale

### C10
- **Dove:** Revisione, scenario Netflix: ultima riga «Partita IVA», aperta in fondo alla pagina.
- **Condizione:** Telefono piccolo (iPhone SE, Safari), tastiera virtuale.
- **Cosa non va:** Aprendo l'ultima riga il campo riceve il focus e la tastiera virtuale potrebbe coprire il campo, il suo messaggio e «Crea la mia azienda».
- **Come verificarlo:** Su iPhone SE scorri in fondo e tocca «Partita IVA»: campo e messaggio devono restare sopra la tastiera.
- **Giudizio:** reale

### C11
- **Dove:** Schermata finale, scheda dell'azienda: casella «Dimensione» con il valore in persone.
- **Condizione:** Telefono con «1000+ persone» o «10-50 persone»; a ogni larghezza, desktop compreso, con valori lunghi come «501-1000 persone».
- **Cosa non va:** Il valore della dimensione va a capo, si sovrappone all'etichetta «Dimensione» ed esce dallo spazio riservato alla casella.
- **Come verificarlo:** Nel percorso manuale scegli la dimensione «501-1000», completa e guarda la scheda a 1280 px; poi lo scenario Netflix a 320 px.
- **Giudizio:** reale

### C12
- **Dove:** Testi d'aiuto sotto i campi: «È la pagina dell'azienda, non il tuo profilo personale.» nella prima schermata, «L'abbiamo precompilata con la tua email: cambiala se serve.» nel percorso manuale, i suggerimenti sotto le righe aperte della revisione.
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** I testi d'aiuto non sono collegati ai rispettivi campi, quindi non vengono letti quando il campo riceve il focus.
- **Come verificarlo:** Porta il focus su un campo e controlla nei DevTools (pannello Accessibilità) che non abbia una descrizione.
- **Giudizio:** reale

### C13
- **Dove:** Revisione, scenario con dati parziali: riga «Indirizzo di fatturazione» aperta, pulsante «Parti dalla sede trovata su LinkedIn (Milano, Italia)».
- **Condizione:** 320 px.
- **Cosa non va:** Il testo del pulsante va a capo e si centra, mentre il resto della riga è allineato a sinistra.
- **Come verificarlo:** A 320 px apri la riga e guarda il pulsante.
- **Giudizio:** reale

### C14
- **Dove:** Revisione: righe da confermare o da completare evidenziate in giallo, che il sottotitolo nomina («conferma le righe in giallo»); nello scenario con dati parziali, la riga vuota «Indirizzo di fatturazione».
- **Condizione:** Tutte le larghezze.
- **Cosa non va:** Il fondo giallo delle righe è quasi indistinguibile dal bianco, sotto 3:1, quindi le «righe in giallo» non si riconoscono; la riga vuota obbligatoria non ha nemmeno la pillola e resta segnalata solo da quel fondo e da un testo grigio chiaro.
- **Come verificarlo:** Apri lo scenario con dati parziali e cerca a occhio quali righe sono «in giallo».
- **Giudizio:** reale

### C15
- **Dove:** Revisione, scenario Netflix: righe chiuse da confermare, come «Settore», «Sede principale», «Indirizzo di fatturazione», «Paese della Partita IVA»; lo stesso nel riepilogo del percorso manuale.
- **Condizione:** Telefono, ad esempio 320, 360 e 375 px.
- **Cosa non va:** Etichetta, pillola «da confermare» e matita occupano la riga e il valore da confermare si riduce a pochi caratteri o sparisce del tutto; alle larghezze più strette la matita esce dal bordo dell'elenco e la pagina scorre in orizzontale.
- **Come verificarlo:** A 320 px apri la revisione Netflix, guarda le righe «da confermare» e prova a scorrere la pagina di lato.
- **Giudizio:** reale

### C16
- **Dove:** Revisione, elenco dati: una riga aperta in modifica (ad esempio «Nome azienda») e il pulsante di modifica di una riga più in basso (ad esempio «Sito web»).
- **Condizione:** Desktop, mouse; solo se la riga cliccata sta sotto quella aperta.
- **Cosa non va:** Con una riga aperta, un clic su una riga sottostante chiude quella aperta ma non apre quella cliccata: la chiusura fa risalire le righe sotto il puntatore e il clic va perso.
- **Come verificarlo:** Apri «Nome azienda», poi clicca una volta su «Sito web»: la prima si chiude, la seconda resta chiusa e le righe si spostano.
- **Giudizio:** reale

### C17
- **Dove:** Revisione: badge «9 dati da LinkedIn» accanto al titolo.
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** Il badge viene letto «LinkedIn 9 dati da LinkedIn»: l'icona ha un nome suo che ripete la parola già presente nel testo.
- **Come verificarlo:** Nei DevTools (pannello Accessibilità) ispeziona il contenuto letto del badge.
- **Giudizio:** reale

### C18
- **Dove:** Revisione: pulsanti delle righe chiuse, ad esempio «Sede principale» e «Partita IVA».
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** Ogni riga si annuncia solo come «Modifica <etichetta>»: il valore, lo stato «da confermare» e l'eventuale messaggio d'errore sotto la riga non fanno parte di ciò che viene letto.
- **Come verificarlo:** Nei DevTools (pannello Accessibilità) ispeziona il nome di «Modifica Sede principale»; con P.IVA `11111111111` controlla se il messaggio sotto «Partita IVA» è collegato al pulsante.
- **Giudizio:** reale

### C19
- **Dove:** Prima schermata, scenario d'errore: avviso «Non riusciamo a leggere questa pagina».
- **Condizione:** Desktop.
- **Cosa non va:** L'avviso chiede di controllare l'URL ma non offre un collegamento rapido per riaprire LinkedIn e copiare il link giusto della pagina aziendale.
- **Come verificarlo:** Incolla l'URL d'errore, premi «Continua» e guarda quali azioni offre l'avviso.
- **Giudizio:** reale

### C20
- **Dove:** Pulsanti in fondo alle schermate: «Non è su LinkedIn» nella prima schermata, «Cambia link» e «Crea la mia azienda» in revisione, la riga dei pulsanti in «Come si chiama la tua azienda?».
- **Condizione:** Larghezze molto strette, ad esempio 280 e 300 px; con lo zoom del browser al 125% anche un po' più larghe.
- **Cosa non va:** Le etichette dei pulsanti vanno a capo su due righe e il testo esce dall'altezza del pulsante; con lo zoom la riga dei pulsanti sborda e la pagina scorre in orizzontale.
- **Come verificarlo:** A 280 px guarda i pulsanti in fondo alla prima schermata e alla revisione; ripeti a 300 px con zoom al 125%.
- **Giudizio:** reale

### C21
- **Dove:** Prima schermata: segnaposto del campo «URL della pagina aziendale».
- **Condizione:** 375 px e più stretto.
- **Cosa non va:** Il segnaposto con l'URL d'esempio è più lungo del campo e viene tagliato, perdendo proprio la parte con il nome dell'azienda («rossi-digital»).
- **Come verificarlo:** A 375 px guarda il campo vuoto.
- **Giudizio:** reale

### C22
- **Dove:** Percorso manuale: campi obbligatori come «Nome azienda *», «Email di fatturazione *», «Indirizzo di fatturazione *».
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** L'obbligatorietà è espressa solo con l'asterisco, che viene letto dentro il nome del campo («Nome azienda *»), mentre il campo non è marcato come obbligatorio.
- **Come verificarlo:** Nei DevTools (pannello Accessibilità) ispeziona nome e proprietà «required» di «Nome azienda».
- **Giudizio:** reale

### C23
- **Dove:** Revisione, scenario Netflix: riga «Descrizione» aperta in modifica.
- **Condizione:** Tutte le larghezze.
- **Cosa non va:** La descrizione, che può essere lunga anche più frasi, si modifica in un campo a riga singola invece che in un'area di testo: se ne vede solo un tratto alla volta.
- **Come verificarlo:** Premi la riga «Descrizione» e guarda il controllo che si apre e quanta parte del testo mostra.
- **Giudizio:** reale

### C24
- **Dove:** Schermata di creazione «Stiamo creando la tua azienda»: voci dell'elenco dei passi non ancora attive, come «Pubblichiamo il profilo per i freelance».
- **Condizione:** Qualsiasi larghezza, anche con riduzione del movimento.
- **Cosa non va:** Le voci in attesa sono così attenuate che il loro testo resta sotto 4.5:1 contro lo sfondo.
- **Come verificarlo:** Durante la creazione misura il contrasto di una voce in attesa.
- **Giudizio:** reale

### C25
- **Dove:** Testi e riempimenti nel blu primario: pulsanti pieni come «Continua», «Crea la mia azienda» e «Vai alla dashboard», anche in hover; «Cerca i freelance»; badge «N dati da LinkedIn»; suggerimento «Parti dalla sede…».
- **Condizione:** Tutte le larghezze, tema chiaro.
- **Cosa non va:** Il contrasto tra testo e sfondo di questi elementi resta sotto 4.5:1, e il pulsante pieno in hover scende ancora.
- **Come verificarlo:** Misura il contrasto di questi testi con il selettore colore dei DevTools o un contrast checker.
- **Giudizio:** reale

### C26
- **Dove:** Revisione: indicatore di focus sui pulsanti delle righe chiuse; lo stesso sul suggerimento e sui link del piè di pagina.
- **Condizione:** Tastiera; ad esempio 375 px.
- **Cosa non va:** Questi elementi usano il contorno predefinito del browser, diverso dall'anello degli altri controlli, che aderisce alla fascia cliccabile e si sovrappone alla prima lettera dell'etichetta.
- **Come verificarlo:** Premi Tab fino a una riga della revisione e guarda il contorno attorno all'etichetta.
- **Giudizio:** reale

### C27
- **Dove:** Schermata finale, scheda dell'azienda: riga dei tag, ad esempio «Dal 2015», «Full remote», «rossidigital.it».
- **Condizione:** 320 px.
- **Cosa non va:** I tag vanno a capo ed escono dalla loro fascia, finendo sopra la linea divisoria che sta sotto.
- **Come verificarlo:** Nel percorso manuale compila sito, anno di fondazione e modalità di lavoro, completa a 320 px e guarda la scheda.
- **Giudizio:** reale

### C28
- **Dove:** Tutte le schermate del flusso: piè di pagina globale con «Termini e condizioni», «Privacy», «Accessibilità», «Cookie policy».
- **Condizione:** Desktop e telefono.
- **Cosa non va:** Il flusso occupa già tutta l'altezza dello schermo e il piè di pagina viene dopo, quindi ogni schermata scorre anche quando il contenuto ci starebbe.
- **Come verificarlo:** A 1280×900 apri la prima schermata e prova a scorrere.
- **Giudizio:** reale

### C29
- **Dove:** Revisione, scenario con dati parziali: riga «Indirizzo di fatturazione» aperta, con il pulsante «Parti dalla sede trovata su LinkedIn (Milano, Italia)».
- **Condizione:** Tastiera; qualsiasi larghezza.
- **Cosa non va:** Premendo Tab dal campo aperto la riga si chiude, il pulsante di suggerimento scompare e il focus non passa al controllo successivo: il suggerimento non si raggiunge da tastiera.
- **Come verificarlo:** Apri la riga, premi Tab una volta e guarda dove si trova il focus e se il pulsante è ancora visibile.
- **Giudizio:** reale

### C30
- **Dove:** Campi in tutto il flusso: «Nome azienda *» e «Sito web (facoltativo)» in «Come si chiama la tua azienda?», righe aperte della revisione, aree di testo e menu.
- **Condizione:** Tutte le larghezze.
- **Cosa non va:** I campi hanno altezze, dimensioni del testo e margini interni diversi tra loro, anche nella stessa schermata, dove un campo alto è impilato su uno più basso.
- **Come verificarlo:** Confronta i due campi di «Come si chiama la tua azienda?».
- **Giudizio:** reale

### C31
- **Dove:** Campi con testo piccolo: campi e menu delle righe aperte in revisione, «Sito web (facoltativo)», «Sede principale» e «Anno di fondazione» in «Ultimi dettagli», area di testo in «Racconta l'azienda».
- **Condizione:** iPhone, Safari.
- **Cosa non va:** Questi campi hanno il testo sotto i 16 px, e Safari su iPhone ingrandisce la pagina quando uno di essi riceve il focus.
- **Come verificarlo:** Su iPhone apri una riga in revisione e guarda se la pagina si ingrandisce.
- **Giudizio:** reale

### C32
- **Dove:** Tutta la pagina: elemento `<html>`.
- **Condizione:** Lettore di schermo, traduzione e sillabazione del browser; qualsiasi larghezza.
- **Cosa non va:** La pagina dichiara la lingua inglese mentre i testi sono in italiano, quindi un lettore di schermo legge l'italiano con la pronuncia inglese.
- **Come verificarlo:** Nei DevTools ispeziona l'attributo `lang` dell'elemento `<html>`.
- **Giudizio:** reale

### C33
- **Dove:** Revisione: righe chiuse dell'elenco, ad esempio «Sito web»; lo stesso nel riepilogo del percorso manuale.
- **Condizione:** Mouse e tocco; qualsiasi larghezza.
- **Cosa non va:** Solo la fascia centrale della riga risponde: un clic o un tocco sul margine sopra, sotto o a sinistra, pur dentro la riga, non la apre.
- **Come verificarlo:** Clicca vicino al bordo superiore della riga «Sito web», poi al centro, e confronta.
- **Giudizio:** reale

### C34
- **Dove:** Revisione, scenario Netflix: riga «Sede principale» chiusa, con «da confermare».
- **Condizione:** Desktop.
- **Cosa non va:** L'azienda ha più sedi, ma la riga chiusa non fa capire che si può scegliere quale sia la principale: la scelta diventa visibile solo dopo aver premuto la riga per modificarla.
- **Come verificarlo:** Guarda la riga chiusa, poi premila e confronta ciò che compare.
- **Giudizio:** reale

### C35
- **Dove:** Schermata di caricamento «Stiamo leggendo la pagina aziendale», dopo «Continua» con un URL valido.
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** L'unico titolo della schermata è di terzo livello: manca un titolo principale, a differenza delle altre schermate.
- **Come verificarlo:** Durante il caricamento ispeziona nei DevTools il livello del titolo.
- **Giudizio:** reale

### C36
- **Dove:** Schermata finale, scheda dell'azienda; sia dallo scenario Netflix sia dal percorso manuale.
- **Condizione:** Larghezze strette, ad esempio 280 e 320 px.
- **Cosa non va:** La scheda dell'azienda è più larga dello schermo: scheda e testo vengono tagliati a destra e la pagina scorre in orizzontale.
- **Come verificarlo:** Completa il flusso a 320 px e prova a scorrere la schermata finale di lato.
- **Giudizio:** reale

### C37
- **Dove:** Revisione, scenario con dati parziali: riga «Indirizzo di fatturazione» aperta, pulsante «Parti dalla sede trovata su LinkedIn (Milano, Italia)».
- **Condizione:** iPhone, Safari, tocco.
- **Cosa non va:** Toccando il suggerimento il campo potrebbe perdere il focus prima che il tocco arrivi, chiudendo la riga: il tocco andrebbe perso e il campo non verrebbe compilato.
- **Come verificarlo:** Su iPhone apri la riga e tocca il suggerimento: il campo deve leggere «Milano, Italia» e la riga restare aperta.
- **Giudizio:** reale

### C38
- **Dove:** Revisione, scenario Netflix: blocco «Logo e copertina» sopra l'elenco dati.
- **Condizione:** Desktop.
- **Cosa non va:** Logo e immagine di copertina sono mostrati, anche come segnaposto, ma in revisione non c'è modo di modificarli, e manca una decisione esplicita che giustifichi questa scelta.
- **Come verificarlo:** Apri la revisione e cerca un modo per cambiare logo o copertina.
- **Giudizio:** reale

### C39
- **Dove:** Passaggio dalla revisione alla schermata di creazione e poi alla schermata finale.
- **Condizione:** 375×812 dopo aver scorso fino al pulsante finale; anche a 1280×900.
- **Cosa non va:** La nuova schermata si apre già scorsa verso il basso, con l'intestazione e la parte alta della scheda fuori vista.
- **Come verificarlo:** A 375 px scorri la revisione fino a «Crea la mia azienda», premilo e guarda la cima della schermata che segue.
- **Giudizio:** reale

### C40
- **Dove:** Prima schermata: campo «URL della pagina aziendale».
- **Condizione:** iPhone, Safari, tastiera virtuale.
- **Cosa non va:** Il campo riceve il focus all'apertura, quindi su telefono la tastiera potrebbe aprirsi subito e coprire il testo e i pulsanti «Non è su LinkedIn» e «Continua».
- **Come verificarlo:** Su iPhone apri `/prototypes/company-onboarding` senza toccare nulla: guarda se la tastiera è aperta e se i due pulsanti sono visibili.
- **Giudizio:** reale

### C41
- **Dove:** Revisione, scenario Netflix: intestazione con il titolo «Ecco la tua azienda» e il badge «9 dati da LinkedIn».
- **Condizione:** Telefono, ad esempio 320, 375 e 414 px.
- **Cosa non va:** Il titolo va a capo e anche il testo del badge va a capo dentro la pillola, che diventa un blocco su due righe.
- **Come verificarlo:** A 375 px apri la revisione e guarda la riga del titolo.
- **Giudizio:** reale

### C42
- **Dove:** Percorso manuale, «La tua Partita IVA»: menu «Paese» e campo «Numero» affiancati.
- **Condizione:** Ad esempio 320 px.
- **Cosa non va:** Menu e campo affiancati hanno altezze diverse, quindi i loro bordi inferiori non sono allineati.
- **Come verificarlo:** Guarda la coppia di controlli affiancati e confronta i bordi inferiori.
- **Giudizio:** reale

### C43
- **Dove:** Testi rossi d'errore: avvisi «Non riusciamo a leggere questa pagina» (scenario d'errore) e «Non abbiamo creato l'azienda» (revisione con P.IVA `11111111111`, dopo «Crea la mia azienda»), messaggio sotto la riga «Partita IVA», asterisco dei campi obbligatori.
- **Condizione:** Tutte le larghezze.
- **Cosa non va:** Il testo rosso resta sotto 4.5:1 sul proprio sfondo, rosato negli avvisi e bianco altrove.
- **Come verificarlo:** Apri lo scenario d'errore e misura il contrasto del titolo e del testo dell'avviso.
- **Giudizio:** reale

### C44
- **Dove:** Revisione: riga «Partita IVA» aperta mentre si digita il numero.
- **Condizione:** Qualsiasi larghezza; nulla si anima.
- **Cosa non va:** Poco dopo l'ultimo tasto compare un messaggio sotto il campo che spinge di colpo verso il basso tutto ciò che segue, compreso «Crea la mia azienda», senza che l'utente abbia fatto nulla in quel momento.
- **Come verificarlo:** Apri «Partita IVA», digita una cifra e osserva la posizione della nota e del pulsante finale prima e dopo la pausa.
- **Giudizio:** reale

### C45
- **Dove:** Contenuto sotto l'intestazione con il logo, in revisione e nella prima schermata.
- **Condizione:** Telefono per la revisione; finestra bassa in orizzontale, ad esempio 812×375, per la prima schermata.
- **Cosa non va:** Quando il contenuto è più alto dello schermo parte esattamente dal bordo inferiore dell'intestazione, senza alcuno spazio.
- **Come verificarlo:** A 375 px apri la revisione Netflix e guarda il primo elemento sotto l'intestazione.
- **Giudizio:** reale

### C46
- **Dove:** Percorso manuale, «Racconta l'azienda»: area di testo della descrizione (`#f-description`).
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** L'area di testo non ha un'etichetta: il suo nome viene dal segnaposto «Sviluppiamo piattaforme e-commerce per il retail italiano…», che sparisce appena si scrive.
- **Come verificarlo:** Nei DevTools (pannello Accessibilità) ispeziona il nome dell'area di testo.
- **Giudizio:** reale

### C47
- **Dove:** Indicatore di focus dei controlli comuni (pulsanti, campi di testo, menu a tendina, area di testo) in tutte le schermate.
- **Condizione:** Tastiera; sfondo bianco.
- **Cosa non va:** L'anello di focus è sottile e azzurro chiaro, sotto 3:1 contro il bianco: si fa fatica a capire quale controllo ha il focus.
- **Come verificarlo:** Nella prima schermata premi Tab e guarda l'indicatore attorno al campo URL e ai pulsanti.
- **Giudizio:** reale

### C48
- **Dove:** Prima schermata, scenario d'errore: campo «URL della pagina aziendale» (`#li-company-url`) con l'avviso sotto.
- **Condizione:** Lettore di schermo; qualsiasi larghezza.
- **Cosa non va:** Quando compare l'errore il campo non risulta non valido e non è collegato all'avviso: chi torna sul campo con un lettore di schermo non sa che è in errore né perché.
- **Come verificarlo:** Dopo l'errore ispeziona nei DevTools gli attributi del campo (`aria-invalid`, `aria-describedby`).
- **Giudizio:** reale

### C49
- **Dove:** Schermata di caricamento «Stiamo leggendo la pagina aziendale»: ultima riga di stato «Prepariamo la descrizione dell'azienda…».
- **Condizione:** 320×568.
- **Cosa non va:** L'ultima riga di stato finisce appena sotto il bordo inferiore dello schermo.
- **Come verificarlo:** A 320×568 incolla un URL valido, premi «Continua» e guarda la schermata di caricamento.
- **Giudizio:** reale

### C50
- **Dove:** Pulsanti senza bordo a inizio riga: «Non è su LinkedIn», «Cambia link», «Indietro».
- **Condizione:** Qualsiasi larghezza, ad esempio 1280 px.
- **Cosa non va:** Il testo di questi pulsanti parte più a destra del margine a cui sono allineati etichette e campi della colonna.
- **Come verificarlo:** Confronta l'inizio di «Non è su LinkedIn» con l'inizio dell'etichetta «URL della pagina aziendale».
- **Giudizio:** reale

## Difetti aggiunti dal giudice

Stesso formato delle voci sopra (Dove, Condizione, Cosa non va, Come verificarlo), numerati G01, G02, …

_(vuota)_

## Nota del giudice

Giudizio dato in blocco il 2026-10-10, con le parole del maintainer: "Non sono nè uno UI ne uno UX designer, al momento non ti so rispondere, prendiamoli tutti per buon. Mi sembrano tutti difetti. Procediamo". Ogni candidato è quindi `reale`; nessun candidato è stato giudicato singolarmente, nessuno è stato messo fuori ambito, e nessun difetto è stato aggiunto dal giudice.
