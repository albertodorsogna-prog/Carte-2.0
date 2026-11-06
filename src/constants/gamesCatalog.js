export const GAMES_CATALOG = {
    TEXAS: {
        id: 'TEXAS',
        name: "Texas Hold'em",
        category: 'POKER',
        deckType: 'FRENCH_52',
        badge: '🤠 2 Carte + 5 Comuni',
        shortDesc: 'Il classico Poker texano con Flop, Turn, River e Fiches.',
        rules: {
            deck: 'Mazzo Francese da 52 carte + Fiches in Euro (€).',
            goal: 'Vincere il piatto formando la migliore combinazione di 5 carte (usando le 2 carte in mano e le 5 comuni sul tavolo) o facendo passare (Fold) tutti gli avversari.',
            values: 'Scala Reale > Scala Colore > Poker > Full > Colore > Scala > Tris > Doppia Coppia > Coppia > Carta Alta.',
            turn: '1) Piccolo Buio e Grande Buio automatici.\n2) Pre-Flop: 2 carte coperte e giro di puntate.\n3) Flop: 3 carte comuni.\n4) Turn: 4ª carta comune.\n5) River: 5ª carta comune e Showdown.',
            appGuide: 'Usa "FOLD", "CHECK / VEDI" o inserisci un importo per "PUNTA / RILANCIA". A fine mano il pulsante "Calcola Vincitore" assegna il piatto automaticamente!'
        }
    },
    POKER_ITA: {
        id: 'POKER_ITA',
        name: 'Poker Italiano (5 Carte)',
        category: 'POKER',
        deckType: 'FRENCH_52',
        badge: '🇮🇹 5 Carte + Cambio',
        shortDesc: 'Poker tradizionale italiano con 5 carte in mano e fase di cambio carte.',
        rules: {
            deck: 'Mazzo Francese da 52 carte.',
            goal: 'Ottenere il punto più alto con le proprie 5 carte in mano dopo il cambio.',
            values: 'Scala Reale > Scala Colore > Poker > Full > Colore > Scala > Tris > Doppia Coppia > Coppia > Carta Alta.',
            turn: '1) 5 carte coperte a testa.\n2) Primo giro di puntate.\n3) Fase Cambio Carte: scarta fino a 4 carte o dichiara "Servito".\n4) Ultimo giro di puntate e Showdown.',
            appGuide: 'Durante la "Fase Cambio Carte", tocca le carte da scartare e premi "Cambia Carte", oppure premi "✋ Servito".'
        }
    },
    SCOPA: {
        id: 'SCOPA',
        name: 'Scopa',
        category: 'NAPOLETANE',
        deckType: 'NAPOLETANE_40',
        badge: '🧹 40 Carte Napoletane',
        shortDesc: 'Prendi le carte dal tavolo per uguaglianza o somma e fai Scopa!',
        rules: {
            deck: 'Mazzo Napoletano da 40 carte (Denari ☀️, Coppe 🏆, Spade ⚔️, Bastoni 🪵).',
            goal: 'Raccogliere più carte possibili dal tavolo e fare punti di mazzo e Scope.',
            values: 'Punti di fine smazzata: Carte (+1), Denari (+1), Settebello 7☀️ (+1), Primiera (+1), più +1 punto per ogni Scopa.',
            turn: 'Si danno 3 carte a testa e 4 a terra. Al tuo turno giochi 1 carta: prendi per uguaglianza o per somma. Se pulisci il tavolo fai SCOPA!',
            appGuide: 'Se vuoi prendere una combinazione specifica dal tavolo, tocca prima le carte a terra e poi la carta della tua mano!'
        }
    },
    BRISCOLA: {
        id: 'BRISCOLA',
        name: 'Briscola',
        category: 'NAPOLETANE',
        deckType: 'NAPOLETANE_40',
        badge: '👑 Seme Comandante',
        shortDesc: '3 carte in mano, nessun obbligo di seme, vince chi supera i 60 punti.',
        rules: {
            deck: 'Mazzo Napoletano da 40 carte (120 punti totali).',
            goal: 'Totalizzare almeno 61 punti raccogliendo Asso (11 pt), Tre (10 pt) e Figure.',
            values: 'Asso (11 pt) > Tre (10 pt) > Re (4 pt) > Cavallo (3 pt) > Donna (2 pt) > 7, 6, 5, 4, 2 (0 pt).',
            turn: 'Si danno 3 carte a testa e si scopre la Briscola. Non c\'è obbligo di rispondere al seme. Vince la Briscola più alta o la carta più forte del seme di mano.',
            appGuide: 'Tocca una delle tue 3 carte per calarla al centro. Il tavolo calcola automaticamente chi prende e distribuisce la pescata!'
        }
    },
    TRESSETTE: {
        id: 'TRESSETTE',
        name: 'Tressette',
        category: 'NAPOLETANE',
        deckType: 'NAPOLETANE_40',
        badge: '⚔️ Obbligo di Seme',
        shortDesc: 'Obbligo rigoroso di rispondere al seme, il 3 e il 2 sono le carte più forti!',
        rules: {
            deck: 'Mazzo Napoletano da 40 carte.',
            goal: 'Fare più punti possibili vincendo le prese e l\'ultima presa ("Rete" = +1 pt).',
            values: 'Forza: 3 > 2 > Asso > Re > Cavallo > Donna > 7 > 6 > 5 > 4. L\'Asso vale 1 punto, mentre 3, 2 e Figure valgono 1/3 di punto.',
            turn: 'Obbligo rigoroso di rispondere al seme giocato dal primo di mano ("piombo"). Non esiste briscola.',
            appGuide: 'Le carte che rispettano il seme obbligatorio si illuminano col badge "SEME!".'
        }
    },
    ZOMPACAVALLO: {
        id: 'ZOMPACAVALLO',
        name: 'Zompacavallo',
        category: 'NAPOLETANE',
        deckType: 'NAPOLETANE_40',
        badge: '🐎 Salta Turno col 9!',
        shortDesc: 'Scarta per seme o valore e usa i Cavalli (9) per far saltare il turno e pescare!',
        rules: {
            deck: 'Mazzo Napoletano da 40 carte.',
            goal: 'Restare per primo senza carte in mano.',
            values: 'Cavallo (9 🐎): fa saltare il turno al giocatore successivo e gli fa pescare 1 carta! Asso (1): jolly giocabile su tutto.',
            turn: '5 carte a testa. Cala una carta dello stesso seme o valore dello scarto, oppure pesca dal mazzo.',
            appGuide: 'Tocca una carta compatibile per scartarla o premi sul Mazzo al centro per pescare.'
        }
    },
    SETTE_MEZZO: {
        id: 'SETTE_MEZZO',
        name: '7 e Mezzo',
        category: 'NAPOLETANE',
        deckType: 'NAPOLETANE_40',
        badge: '☀️ La Matta (Re Denari)',
        shortDesc: 'Sfida il Mazziere senza superare 7,5! Il Re di Denari vale quanto desideri.',
        rules: {
            deck: 'Mazzo Napoletano da 40 carte.',
            goal: 'Avvicinarsi a 7,5 senza sballare, battendo il Mazziere.',
            values: 'Carte 1-7 = valore intero. Figure (8,9,10) = 0,5 punti. RE DI DENARI (10☀️ La Matta) = vale 0,5 oppure qualsiasi valore intero da 1 a 7 a scelta!',
            turn: '1 carta a testa. A turno scegli "Chiedi Carta" o "Stai". Se superi 7,5 sballi.',
            appGuide: 'Quando hai il Re di Denari (10☀️), usa la barra dorata sopra le tue carte per scegliere quanto farlo valere (da 1 a 7 o 0.5)!'
        }
    },
    SCALA40: {
        id: 'SCALA40',
        name: 'Scala 40',
        category: 'FRANCESI',
        deckType: 'FRENCH_108',
        badge: '🃏 13 Carte • Tris & Scale',
        shortDesc: 'Pesca, componi Tris e Scale, attacca carte e chiudi scartando l\'ultima!',
        rules: {
            deck: '2 Mazzi Francesi + 4 Jolly (108 carte).',
            goal: 'Scartare tutte le 13 carte calando Tris/Poker e Scale.',
            values: 'Asso = 11 pt, Figure = 10 pt, Numeri = valore nominale, Jolly = 25 pt.',
            turn: 'Pesca dal Tallone o dagli Scarti, cala combinazioni di 3+ carte o attacca carte ai giochi a terra, e concludi scartando 1 carta.',
            appGuide: 'Seleziona 3+ carte e premi "➕ Cala Combinazione", poi seleziona 1 carta e premi "📤 Scarta e Passa".'
        }
    },
    MACHIAVELLI: {
        id: 'MACHIAVELLI',
        name: 'Machiavelli',
        category: 'FRANCESI',
        deckType: 'FRENCH_108',
        badge: '🧠 Scomponi i Giochi',
        shortDesc: 'Cala liberamente e preleva carte dalle combinazioni già sul tavolo per riorganizzarle!',
        rules: {
            deck: '2 Mazzi Francesi (108 carte).',
            goal: 'Restare senza carte in mano manipolando anche i giochi già presenti sul tavolo.',
            values: 'Tris e Scale di almeno 3 carte.',
            turn: 'Puoi calare nuove combinazioni, attaccare carte o toccare carte già sul tavolo per riprenderle in mano e ricomporre i giochi!',
            appGuide: 'Tocca qualsiasi carta nei giochi al centro del tavolo per prenderla in mano e creare nuovi incastri.'
        }
    },
    BURRACO: {
        id: 'BURRACO',
        name: 'Burraco',
        category: 'FRANCESI',
        deckType: 'FRENCH_108',
        badge: '📦 Pozzetti & Pinelle',
        shortDesc: '11 carte, Pinelle (tutti i 2) + Jolly, raccolta Monte Scarti e 2 Pozzetti!',
        rules: {
            deck: '2 Mazzi Francesi + 4 Jolly (108 carte). Tutti i "2" sono PINELLE.',
            goal: 'Fare Burraco (combinazioni da 7+ carte), prendere il Pozzetto da 11 carte e chiudere.',
            values: 'Gruppi da 7+ carte diventano 🔥 BURRACO (+150 pt bonus).',
            turn: 'Pesca 1 carta dal Tallone o raccogli TUTTO il Monte Scarti. Quando resti senza carte prendi in automatico il Pozzetto da 11 carte!',
            appGuide: 'Usa "📥 Raccogli Scarti" per prendere tutto il monte scarti in mano.'
        }
    },
    RAMINO: {
        id: 'RAMINO',
        name: 'Ramino',
        category: 'FRANCESI',
        deckType: 'FRENCH_108',
        badge: '⚡ 10 Carte Veloce',
        shortDesc: 'Ramino classico a 10 carte: pesca, cala tris e scale e chiudi!',
        rules: {
            deck: '2 Mazzi Francesi con Jolly (108 carte).',
            goal: 'Chiudere la mano con 10 carte sistemate in Tris e Scale.',
            values: 'Figure = 10 pt, Asso = 11 pt, Jolly = 25 pt.',
            turn: 'Ad ogni turno peschi 1 carta, cali eventuali giochi e scarti 1 carta.',
            appGuide: 'Usa i pulsanti "Ordina Valore" e "Ordina Seme" per organizzare rapidamente la mano.'
        }
    },
    BLACKJACK: {
        id: 'BLACKJACK',
        name: 'Blackjack 21',
        category: 'FRANCESI',
        deckType: 'FRENCH_52',
        badge: '🎰 Sfida il Banco a 21',
        shortDesc: 'Chiedi carta o Stai senza superare 21! Gli Assi valgono 1 oppure 11.',
        rules: {
            deck: 'Mazzo Francese da 52 carte.',
            goal: 'Avvicinarsi a 21 più del Banco senza sballare.',
            values: 'Figure = 10, Asso = 1 o 11 automatico, Numeri = valore nominale.',
            turn: '2 carte a testa. Scegli "➕ Chiedi Carta" o "✋ Stai".',
            appGuide: 'Il totale della mano viene calcolato in tempo reale sopra la tua postazione.'
        }
    },
    LUPUS: {
        id: 'LUPUS',
        name: 'Lupus in Tabula',
        category: 'RUOLI',
        deckType: 'ROLES',
        badge: '🐺 Ruoli Segreti & Votazioni',
        shortDesc: 'Notte e Giorno: Votazione interna dei Lupi, Licantropo, Veggente, Guardia, Matto e Rogo del Villaggio!',
        rules: {
            deck: 'Carte Ruolo Segrete: Lupi Mannari 🐺, Licantropo 🐺🌑, Veggente 🔮, Guardia 🛡️, Matto 🤪 e Contadini 🧑‍🌾.',
            goal: '• Contadini, Veggente e Guardia: eliminare tutti i Lupi (e il Licantropo).\n• Lupi e Licantropo: raggiungere o superare il numero dei buoni vivi.\n• Il Matto 🤪: farsi eliminare dal Villaggio durante la Votazione Generale del Giorno (se ci riesce, vince la partita da solo!).',
            values: '• LUPI MANNARI 🐺: di notte votano nella "Votazione Interna dei Lupi" chi sbranare.\n• LICANTROPO 🐺🌑: è alleato dei Lupi e vota con loro di notte, ma se il Veggente indaga su di lui, al Veggente viene risposto "NON È UN LUPO"!\n• VEGGENTE 🔮: ogni notte sceglie un giocatore e riceve una schermata segreta che rivela se è un Lupo oppure no.\n• GUARDIA 🛡️: ogni notte sceglie un giocatore da difendere; se i Lupi lo attaccano, nessuno muore.\n• MATTO 🤪: vince istantaneamente se viene mandato al rogo nella votazione del giorno.',
            turn: '1) NOTTE: Lupi (e Licantropo) votano la vittima nella loro votazione interna; il Veggente interroga la sfera e vede la schermata di risposta; la Guardia protegge un giocatore.\n2) ALBA: si scopre chi è stato sbranato (o se la Guardia ha salvato la vittima).\n3) GIORNO (VOTAZIONE GENERALE): tutti i vivi votano sul Tabellone chi mandare al rogo. In caso di parità parte il Ballottaggio automatico!',
            appGuide: 'Ogni giocatore vede la propria Carta Ruolo Segreta in basso. Di notte compaiono i comandi segreti solo per il tuo ruolo; di giorno tutti votano sul grande Tabellone della Votazione Generale!'
        }
    }
};
