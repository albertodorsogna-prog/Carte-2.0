import React, { useState, useEffect, useRef } from 'react';

import { GAMES_CATALOG } from './constants/gamesCatalog.js';
import { STORAGE_HOST_KEY, STORAGE_PEER_ID_KEY } from './constants/networkConfig.js';

import { createDeckForGame, shuffleArray } from './engine/deckGenerator.js';
import {
    formatMoney,
    roundCents,
    evaluateSetteMezzo,
    evaluateBlackjack,
    getBriscolaPoints,
    getBriscolaStrength,
    getTressetteThirds,
    getTressetteStrength,
    calculateMeldPoints,
    computeScopaBreakdown
} from './engine/cardEvaluators.js';
import { evaluateBestPokerHand } from './engine/pokerEvaluator.js';
import * as Lupus from './engine/lupusEngine.js';

import { NetworkManager } from './services/networkManager.js';

import LobbyScreen from './components/LobbyScreen.jsx';
import TableScreen from './components/TableScreen.jsx';
import RulesModal from './components/RulesModal.jsx';

// ============================================================================
// FACTORY DI STATO
// ============================================================================
const createPlayer = ({ id, name, isHostPlayer = false, isLocalSim = false, chips, isFolded = false }) => ({
    id,
    name,
    isHostPlayer,
    isLocalSim,
    chips: roundCents(chips),
    currentBet: 0,
    isFolded,
    isActive: true,
    justWon: false,
    cards: [],
    showCards: false,
    hasActed: false,
    drawStatus: null,
    capturedCards: [],
    scopaCount: 0,
    scorePoints: 0,
    scoreThirds: 0,
    hasTakenPozzetto: false,
    mattaValue: 'AUTO',
    hasStood: false,
    isBusted: false,
    lupusRole: 'CONTADINO',
    isAlive: true
});

const createInitialGameState = () => ({
    roomCode: 'OSTE1',
    gameId: 'SCOPA',
    shortDeck: false,
    startChips: 10.00,
    smallBlind: 0.10,
    bigBlind: 0.20,
    handNumber: 0,
    phase: 'WAITING',
    pot: 0,
    dealerIndex: 0,
    turnIndex: 0,
    deck: [],
    discardPile: [],
    communityCards: [],
    trickCards: [],
    briscolaCard: null,
    briscolaSuit: null,
    leadSuit: null,
    pozzetti: [[], []],
    tableMelds: [],
    lupusConfig: { ...Lupus.DEFAULT_LUPUS_CONFIG },
    lupusState: Lupus.createInitialLupusState(),
    notification: 'Crea la stanza e invita i tuoi amici col Codice Stanza!',
    players: []
});

// ============================================================================
// LOGICA POKER (pura)
// ============================================================================
const findNextActivePokerIndex = (playersList, fromIndex) => {
    const len = playersList.length;
    if (len === 0) return 0;
    let idx = (fromIndex + 1) % len;
    let loops = 0;
    while ((playersList[idx].isFolded || !playersList[idx].isActive || playersList[idx].chips <= 0) && loops < len) {
        idx = (idx + 1) % len;
        loops++;
    }
    return idx;
};

const moveToNextPokerStreet = (state, prefixMsg = '') => {
    const deck = [...state.deck];
    const resetPlayers = state.players.map(p => ({ ...p, currentBet: 0, hasActed: false }));
    const firstActor = findNextActivePokerIndex(resetPlayers, state.dealerIndex);
    const sep = prefixMsg ? `${prefixMsg} • ` : '';

    if (state.gameId === 'TEXAS') {
        if (state.phase === 'PREFLOP') {
            return { ...state, deck, players: resetPlayers, communityCards: deck.splice(0, 3), phase: 'FLOP', turnIndex: firstActor, notification: `${sep}FLOP servito (3 carte comuni)!` };
        }
        if (state.phase === 'FLOP') {
            return { ...state, deck, players: resetPlayers, communityCards: [...state.communityCards, ...deck.splice(0, 1)], phase: 'TURN', turnIndex: firstActor, notification: `${sep}TURN servito (4ª carta)!` };
        }
        if (state.phase === 'TURN') {
            return { ...state, deck, players: resetPlayers, communityCards: [...state.communityCards, ...deck.splice(0, 1)], phase: 'RIVER', turnIndex: firstActor, notification: `${sep}RIVER servito (5ª carta)!` };
        }
        return {
            ...state,
            players: resetPlayers.map(p => (!p.isFolded ? { ...p, showCards: true } : p)),
            phase: 'SHOWDOWN',
            notification: `${sep}SHOWDOWN! Carte scoperte: premi "Calcola Vincitore" o assegna il piatto.`
        };
    }

    if (state.phase === 'BET_1') {
        return { ...state, players: resetPlayers, phase: 'DRAW', turnIndex: firstActor, notification: `${sep}FASE CAMBIO CARTE! Tocca fino a 4 carte da cambiare o premi "Servito".` };
    }
    if (state.phase === 'DRAW') {
        return { ...state, players: resetPlayers, phase: 'BET_2', turnIndex: firstActor, notification: `${sep}Cambio carte completato! Ultimo giro di puntate.` };
    }
    return {
        ...state,
        players: resetPlayers.map(p => (!p.isFolded ? { ...p, showCards: true } : p)),
        phase: 'SHOWDOWN',
        notification: `${sep}SHOWDOWN! Confronta i punti o premi "Calcola Vincitore".`
    };
};

const advancePokerTurn = (state, actingIdx, msg) => {
    const activeNonFolded = state.players.filter(p => !p.isFolded && p.isActive);
    if (activeNonFolded.length === 1) {
        return {
            ...state,
            phase: 'SHOWDOWN',
            notification: `${msg} — Tutti gli altri hanno passato! ${activeNonFolded[0].name} vince il piatto.`
        };
    }
    const highBet = Math.max(...state.players.map(p => p.currentBet), 0);
    const allMatched = activeNonFolded.every(p => p.chips === 0 || (p.hasActed && Math.abs(p.currentBet - highBet) < 0.005));
    if (!allMatched) {
        return { ...state, turnIndex: findNextActivePokerIndex(state.players, actingIdx), notification: msg };
    }
    return moveToNextPokerStreet(state, msg);
};

// ============================================================================
// COMPONENTE RADICE
// ============================================================================
export default function App() {
    const [screen, setScreen] = useState('LOBBY');
    const [myName, setMyName] = useState('Oste');

    const [myPeerId] = useState(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_PEER_ID_KEY);
            if (saved) return saved;
            const created = 'p_' + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem(STORAGE_PEER_ID_KEY, created);
            return created;
        } catch (e) {
            return 'p_' + Math.random().toString(36).substring(2, 9);
        }
    });

    const [roomCode, setRoomCode] = useState('');
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [isHost, setIsHost] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState('Pronto');
    const [isJoining, setIsJoining] = useState(false);
    const [lobbyError, setLobbyError] = useState('');
    const [kickedMessage, setKickedMessage] = useState('');

    const [savedHostBackup, setSavedHostBackup] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_HOST_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    });

    const [showRulesModal, setShowRulesModal] = useState(false);
    const [rulesTabGameId, setRulesTabGameId] = useState('SCOPA');

    const [gameState, setGameState] = useState(createInitialGameState);

    // Riferimenti
    const netRef = useRef(null);
    if (!netRef.current) netRef.current = new NetworkManager();
    const net = netRef.current;

    const screenRef = useRef(screen);
    screenRef.current = screen;
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    const hostHandlersRef = useRef({});

    const currentGameMeta = GAMES_CATALOG[gameState.gameId] || GAMES_CATALOG.SCOPA;

    // ============================================================================
    // PROTEZIONE ANTI-RICARICAMENTO + BACKUP DELL'OSTE
    // ============================================================================
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (screenRef.current === 'TABLE' && gameStateRef.current.players.length > 0) {
                e.preventDefault();
                e.returnValue = 'Sei sicuro di voler ricaricare o chiudere la pagina? Hai una partita in corso!';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => () => net.destroy(), [net]);

    useEffect(() => {
        if (isHost && screen === 'TABLE' && gameState.players.length > 0) {
            try {
                const backupPayload = {
                    savedAt: Date.now(),
                    hostName: myName,
                    hostPeerId: myPeerId,
                    state: gameState
                };
                localStorage.setItem(STORAGE_HOST_KEY, JSON.stringify(backupPayload));
                setSavedHostBackup(backupPayload);
            } catch (e) {}
        }
    }, [isHost, screen, gameState, myName, myPeerId]);

    const clearSavedHostBackup = () => {
        try { localStorage.removeItem(STORAGE_HOST_KEY); } catch (e) {}
        setSavedHostBackup(null);
    };

    // ============================================================================
    // RETE: BROADCAST E INVIO AZIONI
    // ============================================================================
    const broadcastState = (newState) => {
        setGameState(newState);
        gameStateRef.current = newState;
        net.broadcastState(newState.roomCode || roomCode, newState);
    };

    const sendActionToHost = (action) => {
        if (isHost) {
            processHostAction(action);
        } else {
            net.sendActionToHost(gameStateRef.current.roomCode || roomCode, action);
        }
    };

    const setupHostNetworkChannels = (code) => {
        net.startHost(code, {
            getState: () => gameStateRef.current,
            onJoinRequest: (id, name, reply) => hostHandlersRef.current.onJoinRequest(id, name, reply),
            onAction: (action) => hostHandlersRef.current.onAction(action),
            onStatus: setConnectionStatus
        });
    };

    const handleIncomingJoinRequest = (playerId, rawName, sendDirectReply) => {
        const current = { ...gameStateRef.current };
        const cleanName = (rawName || '').trim();

        if (!cleanName) {
            sendDirectReply({ type: 'JOIN_REJECTED', targetId: playerId, reason: 'Inserisci un nome valido prima di entrare nella stanza!' });
            return;
        }

        const existingById = current.players.find(p => p.id === playerId);
        if (existingById) {
            const duplicateOther = current.players.find(
                p => p.id !== playerId && p.name.trim().toLowerCase() === cleanName.toLowerCase()
            );
            if (duplicateOther) {
                sendDirectReply({
                    type: 'JOIN_REJECTED',
                    targetId: playerId,
                    reason: `Il nome "${cleanName}" è già utilizzato nella stanza! Scegli un nome diverso.`
                });
                return;
            }
            existingById.name = cleanName;
            sendDirectReply({ type: 'JOIN_ACCEPTED', targetId: playerId, state: current });
            broadcastState(current);
            return;
        }

        const nameAlreadyTaken = current.players.some(p => p.name.trim().toLowerCase() === cleanName.toLowerCase());
        if (nameAlreadyTaken) {
            sendDirectReply({
                type: 'JOIN_REJECTED',
                targetId: playerId,
                reason: `Il nome "${cleanName}" è già presente nella stanza! Cambia il tuo nome per entrare.`
            });
            return;
        }

        const newPlayer = createPlayer({
            id: playerId,
            name: cleanName,
            chips: current.startChips,
            isFolded: current.phase !== 'WAITING'
        });

        const updatedState = {
            ...current,
            players: [...current.players, newPlayer],
            notification: `🎉 ${cleanName} è entrato nella stanza!`
        };

        sendDirectReply({ type: 'JOIN_ACCEPTED', targetId: playerId, state: updatedState });
        broadcastState(updatedState);
    };

    // ============================================================================
    // LOBBY: CREA / RIPRISTINA / ENTRA
    // ============================================================================
    const handleCreateRoom = () => {
        const cleanName = myName.trim();
        if (!cleanName) {
            setLobbyError('Inserisci il tuo nome prima di creare la stanza!');
            return;
        }
        setLobbyError('');
        setKickedMessage('');

        const generatedCode = (roomCode.trim() || Math.random().toString(36).substring(2, 7)).toUpperCase();
        setRoomCode(generatedCode);
        setIsHost(true);

        const hostOnlyPlayer = createPlayer({
            id: myPeerId,
            name: cleanName,
            isHostPlayer: true,
            chips: gameState.startChips
        });

        const initialState = {
            ...gameState,
            roomCode: generatedCode,
            phase: 'WAITING',
            handNumber: 0,
            pot: 0,
            communityCards: [],
            trickCards: [],
            tableMelds: [],
            players: [hostOnlyPlayer],
            notification: `Stanza ${generatedCode} creata! Invita i tuoi amici col codice ${generatedCode}.`
        };

        setGameState(initialState);
        gameStateRef.current = initialState;
        setupHostNetworkChannels(generatedCode);
        setScreen('TABLE');
    };

    const handleRestoreSavedHostGame = () => {
        if (!savedHostBackup || !savedHostBackup.state) return;
        const restored = savedHostBackup.state;
        const code = restored.roomCode || 'OSTE1';

        const updatedPlayers = restored.players.map((p, idx) =>
            idx === 0 || p.isHostPlayer ? { ...p, id: myPeerId } : p
        );
        const finalRestored = {
            ...restored,
            players: updatedPlayers,
            notification: `🛡️ Partita dell'Oste ripristinata con successo (Codice: ${code})!`
        };

        setMyName(savedHostBackup.hostName || updatedPlayers[0]?.name || 'Oste');
        setRoomCode(code);
        setIsHost(true);
        setGameState(finalRestored);
        gameStateRef.current = finalRestored;

        setupHostNetworkChannels(code);
        setScreen('TABLE');
    };

    const handleJoinRoom = () => {
        const code = joinCodeInput.trim().toUpperCase();
        const cleanName = myName.trim();

        if (!cleanName) {
            setLobbyError('Inserisci il tuo nome prima di premere ENTRA!');
            return;
        }
        if (!code) {
            setLobbyError('Inserisci il Codice Stanza comunicato dall\'Oste!');
            return;
        }

        setLobbyError('');
        setKickedMessage('');
        setIsJoining(true);
        setRoomCode(code);
        setIsHost(false);
        setConnectionStatus(`Accesso alla stanza ${code}...`);

        let hasEntered = false;

        const finishJoinSuccess = (incomingState) => {
            if (hasEntered) return;
            hasEntered = true;
            net.stopJoin();
            setIsJoining(false);
            setLobbyError('');
            setGameState(incomingState);
            gameStateRef.current = incomingState;
            setConnectionStatus(`Connesso a ${code}`);
            setScreen('TABLE');
        };

        const finishJoinRejected = (reason) => {
            hasEntered = true;
            net.stopJoin();
            setIsJoining(false);
            setLobbyError(reason || 'Accesso rifiutato dalla stanza.');
            setConnectionStatus('Accesso rifiutato');
        };

        const handleIncomingSyncOrReply = (data) => {
            if (!data) return;
            if (data.type === 'JOIN_REJECTED' && data.targetId === myPeerId) {
                finishJoinRejected(data.reason);
                return;
            }
            if (data.type === 'JOIN_ACCEPTED' && data.targetId === myPeerId) {
                finishJoinSuccess(data.state);
                return;
            }
            if (data.type === 'KICKED' && data.targetId === myPeerId) {
                setKickedMessage('Sei stato rimosso dalla stanza dall\'Oste.');
                setScreen('LOBBY');
                setIsJoining(false);
                return;
            }
            if (data.type === 'SYNC_STATE' && data.state) {
                const amIInList = data.state.players.some(p => p.id === myPeerId);
                if (amIInList) {
                    finishJoinSuccess(data.state);
                    setGameState(data.state);
                    gameStateRef.current = data.state;
                } else if (screenRef.current === 'TABLE') {
                    setKickedMessage('Sei stato rimosso dalla stanza dall\'Oste.');
                    setScreen('LOBBY');
                }
            }
        };

        net.joinRoom(code, cleanName, myPeerId, {
            onMessage: handleIncomingSyncOrReply,
            onStatus: setConnectionStatus,
            onTimeout: () => {
                setIsJoining(false);
                setLobbyError(
                    `La stanza "${code}" non risponde. Controlla che il codice sia esatto e che l'Oste abbia il tavolo aperto.`
                );
            }
        });
    };

    const handleClientReconnect = () => {
        if (isHost) return;
        net.pingHost(gameStateRef.current.roomCode || roomCode, myPeerId);
    };

    // ============================================================================
    // GESTIONE GIOCATORI (OSTE)
    // ============================================================================
    const handleKickPlayer = (targetPlayerId) => {
        if (!isHost || targetPlayerId === myPeerId) return;
        const current = { ...gameStateRef.current };
        const targetPlayer = current.players.find(p => p.id === targetPlayerId);
        if (!targetPlayer) return;

        net.kickPlayer(current.roomCode || roomCode, targetPlayerId);

        const remainingPlayers = current.players.filter(p => p.id !== targetPlayerId);
        const safeDealerIdx = remainingPlayers.length > 0 ? current.dealerIndex % remainingPlayers.length : 0;
        const safeTurnIdx = remainingPlayers.length > 0 ? current.turnIndex % remainingPlayers.length : 0;
        const nextPhase = remainingPlayers.length < 2 ? 'WAITING' : current.phase;

        broadcastState({
            ...current,
            players: remainingPlayers,
            dealerIndex: safeDealerIdx,
            turnIndex: safeTurnIdx,
            phase: nextPhase,
            notification: `❌ ${targetPlayer.name} è stato rimosso dalla stanza dall'Oste.`
        });
    };

    const handleAddLocalTestPlayer = (rawName = '') => {
        if (!isHost) return;
        const current = { ...gameStateRef.current };
        const baseName = (rawName || '').trim() || `Amico ${current.players.length}`;
        let finalName = baseName;
        let counter = 2;
        while (current.players.some(p => p.name.trim().toLowerCase() === finalName.toLowerCase())) {
            finalName = `${baseName} ${counter}`;
            counter++;
        }

        const newPlayer = createPlayer({
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
            name: finalName,
            isLocalSim: true,
            chips: current.startChips,
            isFolded: current.phase !== 'WAITING'
        });

        broadcastState({
            ...current,
            players: [...current.players, newPlayer],
            notification: `👤 ${finalName} si è seduto al tavolo!`
        });
    };

    const handleUpdateLupusConfig = (partial) => {
        const current = gameStateRef.current;
        broadcastState({ ...current, lupusConfig: { ...current.lupusConfig, ...partial } });
    };

    // ============================================================================
    // DISTRIBUZIONE CARTE E AVVIO PARTITA
    // ============================================================================
    const startNewHand = (overrideGameId = null) => {
        if (!isHost) return;
        const current = { ...gameStateRef.current };
        const gId = overrideGameId || current.gameId;
        const gMeta = GAMES_CATALOG[gId] || GAMES_CATALOG.SCOPA;

        if (current.players.length < 2) {
            broadcastState({
                ...current,
                gameId: gId,
                phase: 'WAITING',
                notification: 'Servono almeno 2 giocatori al tavolo per iniziare! Invita gli amici col Codice Stanza o aggiungi giocatori di test.'
            });
            return;
        }

        if (gId === 'LUPUS') {
            broadcastState(Lupus.startLupusGame(current));
            return;
        }

        const deck = createDeckForGame(gId, current.shortDeck);
        const pCount = current.players.length;
        const nextDealer = current.handNumber === 0 ? 0 : (current.dealerIndex + 1) % pCount;
        const firstActor = (nextDealer + 1) % pCount;

        let communityCards = [];
        let discardPile = [];
        let briscolaCard = null;
        let briscolaSuit = null;
        let pozzetti = [[], []];
        let initialPot = 0;
        let startingPhase = 'PLAYING';
        let cardsPerPlayer = 3;

        if (gId === 'TEXAS') { cardsPerPlayer = 2; startingPhase = 'PREFLOP'; }
        else if (gId === 'POKER_ITA') { cardsPerPlayer = 5; startingPhase = 'BET_1'; }
        else if (gId === 'SCOPA') { cardsPerPlayer = 3; communityCards = deck.splice(0, 4); }
        else if (gId === 'BRISCOLA') {
            cardsPerPlayer = 3;
            briscolaCard = deck[deck.length - 1];
            briscolaSuit = briscolaCard.suit;
        }
        else if (gId === 'TRESSETTE') { cardsPerPlayer = Math.min(10, Math.floor(deck.length / pCount)); }
        else if (gId === 'ZOMPACAVALLO') { cardsPerPlayer = 5; discardPile = [deck.splice(0, 1)[0]]; }
        else if (gId === 'SETTE_MEZZO') { cardsPerPlayer = 1; }
        else if (gId === 'SCALA40' || gId === 'MACHIAVELLI') { cardsPerPlayer = 13; discardPile = [deck.splice(0, 1)[0]]; }
        else if (gId === 'BURRACO') {
            cardsPerPlayer = 11;
            pozzetti = [deck.splice(0, 11), deck.splice(0, 11)];
            discardPile = [deck.splice(0, 1)[0]];
        }
        else if (gId === 'RAMINO') { cardsPerPlayer = 10; discardPile = [deck.splice(0, 1)[0]]; }
        else if (gId === 'BLACKJACK') { cardsPerPlayer = 2; }

        const updatedPlayers = current.players.map((p) => {
            const dealt = deck.splice(0, cardsPerPlayer);
            return {
                ...p,
                currentBet: 0,
                isFolded: false,
                isActive: true,
                isAlive: true,
                justWon: false,
                cards: dealt,
                showCards: false,
                hasActed: false,
                drawStatus: null,
                capturedCards: [],
                scopaCount: 0,
                scorePoints: 0,
                scoreThirds: 0,
                hasTakenPozzetto: false,
                needDrawFirst: ['SCALA40', 'BURRACO', 'RAMINO'].includes(gId),
                mattaValue: 'AUTO',
                hasStood: false,
                isBusted: false
            };
        });

        let turnIdx = firstActor;

        if (gMeta.category === 'POKER') {
            const sbIdx = (nextDealer + 1) % pCount;
            const bbIdx = (sbIdx + 1) % pCount;
            const sbAmt = Math.min(roundCents(current.smallBlind), updatedPlayers[sbIdx].chips);
            updatedPlayers[sbIdx].chips = roundCents(updatedPlayers[sbIdx].chips - sbAmt);
            updatedPlayers[sbIdx].currentBet = sbAmt;

            const bbAmt = Math.min(roundCents(current.bigBlind), updatedPlayers[bbIdx].chips);
            updatedPlayers[bbIdx].chips = roundCents(updatedPlayers[bbIdx].chips - bbAmt);
            updatedPlayers[bbIdx].currentBet = bbAmt;

            initialPot = roundCents(sbAmt + bbAmt);
            turnIdx = (bbIdx + 1) % pCount;
        }

        broadcastState({
            ...current,
            gameId: gId,
            handNumber: current.handNumber + 1,
            phase: startingPhase,
            pot: initialPot,
            dealerIndex: nextDealer,
            turnIndex: turnIdx,
            deck,
            discardPile,
            communityCards,
            trickCards: [],
            briscolaCard,
            briscolaSuit,
            leadSuit: null,
            pozzetti,
            tableMelds: [],
            players: updatedPlayers,
            notification: `Mano #${current.handNumber + 1} di ${gMeta.name} iniziata! Tocca a ${updatedPlayers[turnIdx]?.name}.`
        });
    };

    // ============================================================================
    // MOTORE CENTRALE DELLE AZIONI SULL'HOST
    // ============================================================================
    const processHostAction = (action) => {
        const current = { ...gameStateRef.current };

        if (action.type === 'TOGGLE_SHOW_CARDS') {
            const updatedPlayers = current.players.map(p =>
                p.id === action.playerId ? { ...p, showCards: !p.showCards } : p
            );
            const pObj = updatedPlayers.find(p => p.id === action.playerId);
            broadcastState({
                ...current,
                players: updatedPlayers,
                notification: pObj?.showCards ? `👁️ ${pObj.name} ha mostrato le sue carte/ruolo al tavolo!` : `${pObj?.name} ha coperto le sue carte.`
            });
            return;
        }

        // ---------- LUPUS IN TABULA ----------
        if (action.type === 'LUPUS_WOLF_VOTE') {
            const next = Lupus.applyWolfVote(current, action.playerId, action.targetId);
            if (next) broadcastState(next);
            return;
        }
        if (action.type === 'LUPUS_SEER_ASK') {
            const next = Lupus.applySeerAsk(current, action.playerId, action.targetId);
            if (next) broadcastState(next);
            return;
        }
        if (action.type === 'LUPUS_GUARD_PROTECT') {
            const next = Lupus.applyGuardProtect(current, action.playerId, action.targetId);
            if (next) broadcastState(next);
            return;
        }
        if (action.type === 'LUPUS_RESOLVE_NIGHT') {
            broadcastState(Lupus.resolveLupusNight(current));
            return;
        }
        if (action.type === 'LUPUS_DAY_VOTE') {
            const next = Lupus.applyDayVote(current, action.playerId, action.targetId);
            if (next) broadcastState(next);
            return;
        }
        if (action.type === 'LUPUS_FORCE_RESOLVE_DAY') {
            broadcastState(Lupus.resolveLupusDayVote(current));
            return;
        }

        // ---------- UTILITÀ ----------
        if (action.type === 'SORT_HAND') {
            const updatedPlayers = current.players.map(p => {
                if (p.id !== action.playerId) return p;
                const sorted = [...p.cards].sort((a, b) => {
                    if (action.mode === 'SUIT') return a.suit.localeCompare(b.suit) || a.value - b.value;
                    return a.value - b.value || a.suit.localeCompare(b.suit);
                });
                return { ...p, cards: sorted };
            });
            broadcastState({ ...current, players: updatedPlayers });
            return;
        }

        if (action.type === 'REBUY_PLAYER') {
            const updatedPlayers = current.players.map(p =>
                p.id === action.playerId ? { ...p, chips: roundCents(p.chips + Number(current.startChips)) } : p
            );
            broadcastState({ ...current, players: updatedPlayers, notification: `Ricarica di ${formatMoney(current.startChips)} effettuata!` });
            return;
        }

        // ---------- POKER ----------
        if (action.type === 'POKER_BET') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            let amt = roundCents(parseFloat(action.amount));
            if (isNaN(amt) || amt < 0) return;
            if (amt > p.chips) amt = p.chips;

            const highBet = Math.max(...current.players.map(pl => pl.currentBet), 0);
            const afterBet = roundCents(p.currentBet + amt);
            const isAllIn = Math.abs(amt - p.chips) < 0.005;

            if (afterBet < highBet - 0.005 && !isAllIn) {
                const needed = roundCents(highBet - p.currentBet);
                broadcastState({ ...current, notification: `Puntata minima per vedere: ${formatMoney(needed)}!` });
                return;
            }

            const updatedPlayers = current.players.map((pl, i) =>
                i === idx ? { ...pl, chips: roundCents(pl.chips - amt), currentBet: afterBet, hasActed: true } : pl
            );
            const desc = amt === 0 ? `${p.name} fa Check` : isAllIn ? `${p.name} va ALL-IN (${formatMoney(afterBet)})!` : afterBet > highBet + 0.005 ? `${p.name} RILANCIA a ${formatMoney(afterBet)}!` : `${p.name} Vede (${formatMoney(amt)})`;

            broadcastState(advancePokerTurn({ ...current, players: updatedPlayers, pot: roundCents(current.pot + amt) }, idx, desc));
            return;
        }

        if (action.type === 'POKER_FOLD') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            const updatedPlayers = current.players.map((pl, i) => (i === idx ? { ...pl, isFolded: true, hasActed: true } : pl));
            broadcastState(advancePokerTurn({ ...current, players: updatedPlayers }, idx, `${p.name} passa (Fold)`));
            return;
        }

        if (action.type === 'POKER_DRAW') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || current.phase !== 'DRAW') return;
            const p = current.players[idx];
            const indices = action.indices || [];
            const deck = [...current.deck];
            const num = Math.min(indices.length, 4, deck.length);
            const kept = p.cards.filter((_, cIdx) => !indices.includes(cIdx));
            const drawn = deck.splice(0, num);
            const badge = num === 0 ? 'Servito!' : `Cambiato ${num}`;

            const updatedPlayers = current.players.map((pl, i) =>
                i === idx ? { ...pl, cards: [...kept, ...drawn], hasActed: true, drawStatus: badge } : pl
            );
            const allDone = updatedPlayers.filter(pl => !pl.isFolded && pl.isActive).every(pl => pl.hasActed);
            if (allDone) {
                broadcastState(moveToNextPokerStreet({ ...current, deck, players: updatedPlayers }, `${p.name}: ${badge}`));
            } else {
                const nextIdx = findNextActivePokerIndex(updatedPlayers, idx);
                broadcastState({ ...current, deck, players: updatedPlayers, turnIndex: nextIdx, notification: `${p.name}: ${badge}` });
            }
            return;
        }

        // ---------- SCOPA ----------
        if (action.type === 'SCOPA_PLAY') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            const card = p.cards[action.cardIndex];
            if (!card) return;

            let table = [...current.communityCards];
            let captured = [];

            const chosenOnTable = table.filter(tc => (action.selectedTableUids || []).includes(tc.uid));
            const chosenSum = chosenOnTable.reduce((s, c) => s + c.value, 0);
            const exactMatch = table.find(tc => tc.value === card.value);

            if (exactMatch) {
                captured = [exactMatch];
            } else if (chosenOnTable.length > 0 && chosenSum === card.value) {
                captured = chosenOnTable;
            } else {
                const findSubset = (arr, target) => {
                    let result = null;
                    const search = (start, curr, sum) => {
                        if (result) return;
                        if (sum === target && curr.length > 0) { result = [...curr]; return; }
                        if (sum > target) return;
                        for (let i = start; i < arr.length; i++) {
                            curr.push(arr[i]);
                            search(i + 1, curr, sum + arr[i].value);
                            curr.pop();
                        }
                    };
                    search(0, [], 0);
                    return result;
                };
                captured = findSubset(table, card.value) || [];
            }

            const newHand = p.cards.filter((_, cIdx) => cIdx !== action.cardIndex);
            let isScopa = false;
            let msg = '';

            if (captured.length > 0) {
                const capUids = captured.map(c => c.uid);
                table = table.filter(tc => !capUids.includes(tc.uid));
                if (table.length === 0 && (current.deck.length > 0 || current.players.some((pl, i) => (i === idx ? newHand.length > 0 : pl.cards.length > 0)))) {
                    isScopa = true;
                }
                msg = isScopa
                    ? `🧹 SCOPA DI ${p.name.toUpperCase()}! (+1 Punto!)`
                    : `${p.name} prende ${captured.map(c => c.rank + c.symbol).join(' + ')} con ${card.rank}${card.symbol}!`;
            } else {
                table.push(card);
                msg = `${p.name} cala ${card.rank}${card.symbol} sul tavolo.`;
            }

            const deck = [...current.deck];
            let updatedPlayers = current.players.map((pl, i) => {
                if (i !== idx) return pl;
                return {
                    ...pl,
                    cards: newHand,
                    capturedCards: captured.length > 0 ? [...pl.capturedCards, card, ...captured] : pl.capturedCards,
                    scopaCount: isScopa ? (pl.scopaCount || 0) + 1 : pl.scopaCount
                };
            });

            const lastCapturerIdx = captured.length > 0 ? idx : (current.lastCapturerIdx ?? idx);

            if (updatedPlayers.every(pl => pl.cards.length === 0)) {
                if (deck.length > 0) {
                    updatedPlayers = updatedPlayers.map(pl => ({ ...pl, cards: deck.splice(0, 3) }));
                    msg += ' • Nuove 3 carte servite!';
                } else {
                    if (table.length > 0) {
                        updatedPlayers[lastCapturerIdx].capturedCards = [
                            ...updatedPlayers[lastCapturerIdx].capturedCards,
                            ...table
                        ];
                        table = [];
                    }
                    const breakdown = computeScopaBreakdown(updatedPlayers);
                    const summaryText = breakdown.map(b => `${b.name}: ${b.finalTotal} pt (Carte:${b.totalCards}, Denari:${b.denariCount}, Scope:${b.scope})`).join(' | ');
                    broadcastState({
                        ...current,
                        deck: [],
                        communityCards: [],
                        players: updatedPlayers.map((pl, i) => ({ ...pl, scorePoints: breakdown[i]?.finalTotal || 0 })),
                        phase: 'SHOWDOWN',
                        notification: `🏆 Fine Scopa! ${summaryText}`
                    });
                    return;
                }
            }

            const nextTurn = (idx + 1) % updatedPlayers.length;
            broadcastState({
                ...current,
                deck,
                communityCards: table,
                lastCapturerIdx,
                players: updatedPlayers,
                turnIndex: nextTurn,
                notification: msg
            });
            return;
        }

        // ---------- BRISCOLA / TRESSETTE ----------
        if (action.type === 'TRICK_PLAY') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex || current.trickCards.length >= current.players.length) return;
            const p = current.players[idx];
            const card = p.cards[action.cardIndex];
            if (!card) return;

            let leadSuit = current.leadSuit;
            if (current.trickCards.length === 0) {
                leadSuit = card.suit;
            } else if (current.gameId === 'TRESSETTE') {
                const hasLeadSuit = p.cards.some(c => c.suit === leadSuit);
                if (hasLeadSuit && card.suit !== leadSuit) {
                    broadcastState({
                        ...current,
                        notification: `⚠️ A Tressette è obbligatorio rispondere al seme di mano (${leadSuit})!`
                    });
                    return;
                }
            }

            const newHand = p.cards.filter((_, cIdx) => cIdx !== action.cardIndex);
            const updatedTrick = [...current.trickCards, { playerId: p.id, playerName: p.name, playerIndex: idx, card }];
            const updatedPlayers = current.players.map((pl, i) => (i === idx ? { ...pl, cards: newHand } : pl));

            if (updatedTrick.length < updatedPlayers.length) {
                const nextIdx = (idx + 1) % updatedPlayers.length;
                broadcastState({
                    ...current,
                    leadSuit,
                    trickCards: updatedTrick,
                    players: updatedPlayers,
                    turnIndex: nextIdx,
                    notification: `${p.name} cala ${card.rank}${card.symbol}. Tocca a ${updatedPlayers[nextIdx].name}.`
                });
                return;
            }

            broadcastState({
                ...current,
                leadSuit,
                trickCards: updatedTrick,
                players: updatedPlayers,
                notification: `${p.name} cala ${card.rank}${card.symbol}. Calcolo presa...`
            });

            setTimeout(() => {
                const latest = { ...gameStateRef.current };
                const trick = latest.trickCards;
                if (!trick || trick.length === 0) return;

                let winnerPlay = trick[0];
                for (let i = 1; i < trick.length; i++) {
                    const cand = trick[i];
                    if (latest.gameId === 'BRISCOLA') {
                        const winIsBris = winnerPlay.card.suit === latest.briscolaSuit;
                        const candIsBris = cand.card.suit === latest.briscolaSuit;
                        if (candIsBris && !winIsBris) winnerPlay = cand;
                        else if (candIsBris && winIsBris && getBriscolaStrength(cand.card.value) > getBriscolaStrength(winnerPlay.card.value)) winnerPlay = cand;
                        else if (!candIsBris && !winIsBris && cand.card.suit === latest.leadSuit && getBriscolaStrength(cand.card.value) > getBriscolaStrength(winnerPlay.card.value)) winnerPlay = cand;
                    } else {
                        if (cand.card.suit === latest.leadSuit && getTressetteStrength(cand.card.value) > getTressetteStrength(winnerPlay.card.value)) {
                            winnerPlay = cand;
                        }
                    }
                }

                const winIdx = winnerPlay.playerIndex;
                const trickCardsOnly = trick.map(t => t.card);
                const brisPts = trickCardsOnly.reduce((s, c) => s + getBriscolaPoints(c.value), 0);
                const tresThirds = trickCardsOnly.reduce((s, c) => s + getTressetteThirds(c.value), 0);

                const deck = [...latest.deck];
                const postTrickPlayers = latest.players.map((pl, i) => {
                    if (i !== winIdx) return pl;
                    const newThirds = (pl.scoreThirds || 0) + tresThirds;
                    return {
                        ...pl,
                        capturedCards: [...pl.capturedCards, ...trickCardsOnly],
                        scorePoints: latest.gameId === 'BRISCOLA' ? (pl.scorePoints || 0) + brisPts : Math.floor(newThirds / 3),
                        scoreThirds: newThirds
                    };
                });

                if (latest.gameId === 'BRISCOLA' && deck.length > 0) {
                    for (let k = 0; k < postTrickPlayers.length; k++) {
                        const pIdx = (winIdx + k) % postTrickPlayers.length;
                        if (deck.length > 0) {
                            postTrickPlayers[pIdx].cards = [...postTrickPlayers[pIdx].cards, deck.splice(0, 1)[0]];
                        }
                    }
                }

                const isGameOver = postTrickPlayers.every(pl => pl.cards.length === 0);
                if (isGameOver && latest.gameId === 'TRESSETTE') {
                    postTrickPlayers[winIdx].scorePoints = (postTrickPlayers[winIdx].scorePoints || 0) + 1;
                }

                broadcastState({
                    ...latest,
                    deck,
                    trickCards: [],
                    leadSuit: null,
                    players: postTrickPlayers,
                    turnIndex: winIdx,
                    phase: isGameOver ? 'SHOWDOWN' : latest.phase,
                    notification: isGameOver
                        ? `🏆 Mano conclusa! Ultima presa a ${winnerPlay.playerName}.`
                        : `Presa di ${winnerPlay.playerName} con ${winnerPlay.card.rank}${winnerPlay.card.symbol}! Tocca a ${winnerPlay.playerName}.`
                });
            }, 1150);
            return;
        }

        // ---------- ZOMPACAVALLO ----------
        if (action.type === 'ZOMPA_PLAY') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            const card = p.cards[action.cardIndex];
            const topDiscard = current.discardPile[current.discardPile.length - 1];

            const isPlayable = !topDiscard || card.suit === topDiscard.suit || card.value === topDiscard.value || card.value === 1;
            if (!isPlayable) {
                broadcastState({ ...current, notification: `⚠️ Devi calare una carta dello stesso seme (${topDiscard.suitName}), dello stesso valore (${topDiscard.rank}) oppure un Asso!` });
                return;
            }

            const newHand = p.cards.filter((_, i) => i !== action.cardIndex);
            const deck = [...current.deck];
            const updatedPlayers = current.players.map((pl, i) => (i === idx ? { ...pl, cards: newHand } : pl));

            if (newHand.length === 0) {
                updatedPlayers[idx].justWon = true;
                broadcastState({
                    ...current,
                    players: updatedPlayers,
                    discardPile: [...current.discardPile, card],
                    phase: 'SHOWDOWN',
                    notification: `🏆 ${p.name} ha finito le carte e VINCE a Zompacavallo!`
                });
                return;
            }

            if (card.value === 9) {
                const victimIdx = (idx + 1) % updatedPlayers.length;
                if (deck.length > 0) {
                    updatedPlayers[victimIdx].cards = [...updatedPlayers[victimIdx].cards, deck.splice(0, 1)[0]];
                }
                const nextAfterSkip = (idx + 2) % updatedPlayers.length;
                broadcastState({
                    ...current,
                    deck,
                    players: updatedPlayers,
                    discardPile: [...current.discardPile, card],
                    turnIndex: nextAfterSkip,
                    notification: `🐎 ZOMPA CAVALLO! ${updatedPlayers[victimIdx].name} pesca 1 carta e SALTA IL TURNO! Tocca a ${updatedPlayers[nextAfterSkip].name}.`
                });
            } else {
                const nextIdx = (idx + 1) % updatedPlayers.length;
                broadcastState({
                    ...current,
                    deck,
                    players: updatedPlayers,
                    discardPile: [...current.discardPile, card],
                    turnIndex: nextIdx,
                    notification: `${p.name} cala ${card.rank}${card.symbol}. Tocca a ${updatedPlayers[nextIdx].name}.`
                });
            }
            return;
        }

        if (action.type === 'ZOMPA_DRAW') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            let deck = [...current.deck];
            if (deck.length === 0 && current.discardPile.length > 1) {
                const top = current.discardPile[current.discardPile.length - 1];
                deck = shuffleArray(current.discardPile.slice(0, -1));
                current.discardPile = [top];
            }
            const drawn = deck.splice(0, 1);
            const updatedPlayers = current.players.map((pl, i) => (i === idx ? { ...pl, cards: [...pl.cards, ...drawn] } : pl));
            const nextIdx = (idx + 1) % updatedPlayers.length;
            broadcastState({
                ...current,
                deck,
                players: updatedPlayers,
                turnIndex: nextIdx,
                notification: `${current.players[idx].name} pesca 1 carta e passa il turno.`
            });
            return;
        }

        // ---------- 7 E MEZZO / BLACKJACK ----------
        if (action.type === 'SET_MATTA_VALUE') {
            const updatedPlayers = current.players.map(p =>
                p.id === action.playerId ? { ...p, mattaValue: action.value } : p
            );
            broadcastState({
                ...current,
                players: updatedPlayers,
                notification: `☀️ Il Re di Denari (Matta) è stato impostato a valore ${action.value}!`
            });
            return;
        }

        if (action.type === 'BANK_HIT') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const deck = [...current.deck];
            if (deck.length === 0) return;
            const drawn = deck.splice(0, 1)[0];
            const p = current.players[idx];
            const newCards = [...p.cards, drawn];

            const evalResult = current.gameId === 'SETTE_MEZZO'
                ? evaluateSetteMezzo(newCards, p.mattaValue)
                : evaluateBlackjack(newCards);

            const updatedPlayers = current.players.map((pl, i) =>
                i === idx ? { ...pl, cards: newCards, isBusted: evalResult.busted, showCards: evalResult.busted ? true : pl.showCards } : pl
            );

            if (evalResult.busted) {
                const allDone = updatedPlayers.every(pl => pl.isBusted || pl.hasStood);
                const nextIdx = (idx + 1) % updatedPlayers.length;
                broadcastState({
                    ...current,
                    deck,
                    players: updatedPlayers,
                    turnIndex: nextIdx,
                    phase: allDone ? 'SHOWDOWN' : current.phase,
                    notification: `💥 ${p.name} ha pescato ${drawn.rank}${drawn.symbol} e HA SBALLATO (${evalResult.total})!`
                });
            } else {
                broadcastState({
                    ...current,
                    deck,
                    players: updatedPlayers,
                    notification: `${p.name} chiede carta e riceve ${drawn.rank}${drawn.symbol}.`
                });
            }
            return;
        }

        if (action.type === 'BANK_STAND') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            const updatedPlayers = current.players.map((pl, i) => (i === idx ? { ...pl, hasStood: true } : pl));
            const allDone = updatedPlayers.every(pl => pl.isBusted || pl.hasStood);
            const nextIdx = (idx + 1) % updatedPlayers.length;

            broadcastState({
                ...current,
                players: updatedPlayers.map(pl => (allDone ? { ...pl, showCards: true } : pl)),
                turnIndex: nextIdx,
                phase: allDone ? 'SHOWDOWN' : current.phase,
                notification: allDone
                    ? `🏆 Giro concluso! Tutte le carte sono scoperte: confronta i punteggi col Banco.`
                    : `✋ ${p.name} STA. Tocca a ${updatedPlayers[nextIdx].name}.`
            });
            return;
        }

        // ---------- SCALA 40 / MACHIAVELLI / BURRACO / RAMINO ----------
        if (action.type === 'RUMMY_DRAW_DECK') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const deck = [...current.deck];
            if (deck.length === 0) return;
            const card = deck.splice(0, 1)[0];
            const updatedPlayers = current.players.map((pl, i) =>
                i === idx ? { ...pl, cards: [...pl.cards, card], needDrawFirst: false } : pl
            );
            broadcastState({
                ...current,
                deck,
                players: updatedPlayers,
                notification: `${current.players[idx].name} ha pescato 1 carta dal Tallone.`
            });
            return;
        }

        if (action.type === 'RUMMY_DRAW_DISCARD') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex || current.discardPile.length === 0) return;
            let discard = [...current.discardPile];
            const taken = current.gameId === 'BURRACO' ? discard : [discard.pop()];
            if (current.gameId === 'BURRACO') discard = [];

            const updatedPlayers = current.players.map((pl, i) =>
                i === idx ? { ...pl, cards: [...pl.cards, ...taken], needDrawFirst: false } : pl
            );
            broadcastState({
                ...current,
                discardPile: discard,
                players: updatedPlayers,
                notification: current.gameId === 'BURRACO'
                    ? `${current.players[idx].name} ha raccolto tutto il Monte Scarti (${taken.length} carte)!`
                    : `${current.players[idx].name} ha pescato ${taken[0].rank}${taken[0].symbol} dagli Scarti.`
            });
            return;
        }

        if (action.type === 'RUMMY_MELD') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            const indices = action.indices || [];
            if (indices.length < 3) {
                broadcastState({ ...current, notification: '⚠️ Seleziona almeno 3 carte dalla tua mano per calare un Tris o una Scala!' });
                return;
            }

            const meldCards = indices.map(i => p.cards[i]).filter(Boolean).sort((a, b) => a.value - b.value);
            let remainingHand = p.cards.filter((_, i) => !indices.includes(i));
            const pts = calculateMeldPoints(meldCards);
            const isBurraco = current.gameId === 'BURRACO' && meldCards.length >= 7;

            const pozzetti = [...current.pozzetti];
            let pozzettoMsg = '';
            let hasTakenPozzetto = p.hasTakenPozzetto;

            if (current.gameId === 'BURRACO' && remainingHand.length === 0 && !hasTakenPozzetto && pozzetti.some(pz => pz.length > 0)) {
                const pzIdx = pozzetti[0].length > 0 ? 0 : 1;
                remainingHand = pozzetti[pzIdx];
                pozzetti[pzIdx] = [];
                hasTakenPozzetto = true;
                pozzettoMsg = ` 📦 ${p.name} ha preso il POZZETTO da 11 carte!`;
            }

            const newMeld = {
                id: 'meld_' + Date.now(),
                ownerId: p.id,
                ownerName: p.name,
                cards: meldCards,
                points: pts,
                isBurraco
            };

            const updatedPlayers = current.players.map((pl, i) =>
                i === idx
                    ? {
                          ...pl,
                          cards: remainingHand,
                          hasTakenPozzetto,
                          scorePoints: (pl.scorePoints || 0) + pts + (isBurraco ? 150 : 0)
                      }
                    : pl
            );

            broadcastState({
                ...current,
                pozzetti,
                tableMelds: [...current.tableMelds, newMeld],
                players: updatedPlayers,
                notification: `${p.name} cala una combinazione da ${pts} pt!${isBurraco ? ' 🔥 BURRACO!' : ''}${pozzettoMsg}`
            });
            return;
        }

        if (action.type === 'RUMMY_ATTACH') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            const indices = action.indices || [];
            if (indices.length === 0) return;

            const cardsToAttach = indices.map(i => p.cards[i]).filter(Boolean);
            const remainingHand = p.cards.filter((_, i) => !indices.includes(i));

            const updatedMelds = current.tableMelds.map(m => {
                if (m.id !== action.meldId) return m;
                const combined = [...m.cards, ...cardsToAttach].sort((a, b) => a.value - b.value);
                return {
                    ...m,
                    cards: combined,
                    points: calculateMeldPoints(combined),
                    isBurraco: current.gameId === 'BURRACO' && combined.length >= 7
                };
            });

            const updatedPlayers = current.players.map((pl, i) =>
                i === idx ? { ...pl, cards: remainingHand } : pl
            );

            broadcastState({
                ...current,
                tableMelds: updatedMelds,
                players: updatedPlayers,
                notification: `🔗 ${p.name} ha attaccato ${cardsToAttach.length} carta/e al gioco sul tavolo!`
            });
            return;
        }

        if (action.type === 'MACHIAVELLI_TAKE_TABLE_CARD') {
            if (current.gameId !== 'MACHIAVELLI') return;
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;

            let pickedCard = null;
            const updatedMelds = current.tableMelds
                .map(m => {
                    if (m.id !== action.meldId) return m;
                    const found = m.cards.find(c => c.uid === action.cardUid);
                    if (found) pickedCard = found;
                    return { ...m, cards: m.cards.filter(c => c.uid !== action.cardUid) };
                })
                .filter(m => m.cards.length > 0);

            if (!pickedCard) return;
            const updatedPlayers = current.players.map((pl, i) =>
                i === idx ? { ...pl, cards: [...pl.cards, pickedCard] } : pl
            );

            broadcastState({
                ...current,
                tableMelds: updatedMelds,
                players: updatedPlayers,
                notification: `🧠 Machiavelli: ${current.players[idx].name} ha prelevato ${pickedCard.rank}${pickedCard.symbol} dal tavolo per ricombinare i giochi!`
            });
            return;
        }

        if (action.type === 'RUMMY_DISCARD') {
            const idx = current.players.findIndex(p => p.id === action.playerId);
            if (idx === -1 || idx !== current.turnIndex) return;
            const p = current.players[idx];
            const card = p.cards[action.cardIndex];
            if (!card) return;

            let remainingHand = p.cards.filter((_, i) => i !== action.cardIndex);
            const pozzetti = [...current.pozzetti];
            let hasTakenPozzetto = p.hasTakenPozzetto;

            if (current.gameId === 'BURRACO' && remainingHand.length === 0 && !hasTakenPozzetto && pozzetti.some(pz => pz.length > 0)) {
                const pzIdx = pozzetti[0].length > 0 ? 0 : 1;
                remainingHand = pozzetti[pzIdx];
                pozzetti[pzIdx] = [];
                hasTakenPozzetto = true;
            }

            const hasClosed = remainingHand.length === 0;
            const nextIdx = (idx + 1) % current.players.length;
            const updatedPlayers = current.players.map((pl, i) => {
                if (i === idx) return { ...pl, cards: remainingHand, hasTakenPozzetto, justWon: hasClosed };
                if (i === nextIdx) return { ...pl, needDrawFirst: ['SCALA40', 'BURRACO', 'RAMINO'].includes(current.gameId) };
                return pl;
            });

            broadcastState({
                ...current,
                pozzetti,
                discardPile: [...current.discardPile, card],
                players: updatedPlayers,
                turnIndex: nextIdx,
                phase: hasClosed ? 'SHOWDOWN' : current.phase,
                notification: hasClosed
                    ? `🏆 CHIUSURA DI ${p.name.toUpperCase()}! Ha scartato l'ultima carta e vince la partita!`
                    : `${p.name} scarta ${card.rank}${card.symbol}. Tocca a ${updatedPlayers[nextIdx].name}.`
            });
            return;
        }
    };

    // ============================================================================
    // POKER: ASSEGNAZIONE PIATTO E SHOWDOWN
    // ============================================================================
    const handleAwardPot = (winnerIndex) => {
        if (!isHost) return;
        const current = { ...gameStateRef.current };
        const winAmount = roundCents(current.pot + current.players.reduce((s, p) => s + (p.currentBet || 0), 0));
        if (winAmount <= 0) return;

        const winnerName = current.players[winnerIndex].name;
        const updatedPlayers = current.players.map((p, idx) => ({
            ...p,
            chips: idx === winnerIndex ? roundCents(p.chips + winAmount) : p.chips,
            currentBet: 0,
            justWon: idx === winnerIndex
        }));

        broadcastState({
            ...current,
            players: updatedPlayers,
            pot: 0,
            phase: 'SHOWDOWN',
            notification: `🏆 ${winnerName} vince il piatto di ${formatMoney(winAmount)}!`
        });

        setTimeout(() => {
            const clean = gameStateRef.current.players.map(p => ({ ...p, justWon: false }));
            broadcastState({ ...gameStateRef.current, players: clean });
        }, 2500);
    };

    const handleAutoShowdownWinner = () => {
        if (!isHost) return;
        const current = { ...gameStateRef.current };
        const contenders = current.players
            .map((p, index) => ({
                player: p,
                index,
                eval: evaluateBestPokerHand([...(p.cards || []), ...(current.communityCards || [])])
            }))
            .filter(item => !item.player.isFolded && item.player.isActive && item.player.cards.length > 0);

        if (contenders.length === 0) return;
        contenders.sort((a, b) => b.eval.score - a.eval.score);
        const bestScore = contenders[0].eval.score;
        const winners = contenders.filter(c => c.eval.score === bestScore);

        const totalPot = roundCents(current.pot + current.players.reduce((s, p) => s + (p.currentBet || 0), 0));
        const share = roundCents(totalPot / winners.length);
        const winIdxList = winners.map(w => w.index);

        const updatedPlayers = current.players.map((p, idx) => ({
            ...p,
            showCards: !p.isFolded ? true : p.showCards,
            chips: winIdxList.includes(idx) ? roundCents(p.chips + share) : p.chips,
            currentBet: 0,
            justWon: winIdxList.includes(idx)
        }));

        const names = winners.map(w => `${w.player.name} (${w.eval.label})`).join(' & ');
        broadcastState({
            ...current,
            players: updatedPlayers,
            pot: 0,
            phase: 'SHOWDOWN',
            notification: `🏆 Vittoria per ${names} — Piatto: ${formatMoney(totalPot)}!`
        });
    };

    // Statistica compatta mostrata accanto al nome di ogni giocatore
    const getCompactTopBarStat = (p) => {
        if (gameState.gameId === 'LUPUS') return !p.isAlive ? '💀' : '🟢';
        if (currentGameMeta.category === 'POKER') return formatMoney(p.chips);
        if (gameState.gameId === 'SCOPA') return `Prese:${p.capturedCards?.length || 0} Scope:${p.scopaCount || 0}`;
        if (gameState.gameId === 'BRISCOLA' || gameState.gameId === 'TRESSETTE') return `${p.scorePoints || 0}pt`;
        return `${p.cards?.length || 0}🃏`;
    };

    // Gli handler di rete usano sempre l'ultima versione delle funzioni (niente closure obsolete)
    hostHandlersRef.current = {
        onJoinRequest: handleIncomingJoinRequest,
        onAction: processHostAction
    };

    const openRules = () => {
        setRulesTabGameId(gameState.gameId);
        setShowRulesModal(true);
    };

    // ============================================================================
    // RENDER
    // ============================================================================
    return (
        <>
            {screen === 'LOBBY' ? (
                <LobbyScreen
                    savedHostBackup={savedHostBackup}
                    onRestoreBackup={handleRestoreSavedHostGame}
                    onClearBackup={clearSavedHostBackup}
                    myName={myName}
                    setMyName={setMyName}
                    joinCodeInput={joinCodeInput}
                    setJoinCodeInput={setJoinCodeInput}
                    isJoining={isJoining}
                    connectionStatus={connectionStatus}
                    lobbyError={lobbyError}
                    kickedMessage={kickedMessage}
                    onDismissError={() => {
                        setLobbyError('');
                        setKickedMessage('');
                    }}
                    onJoin={handleJoinRoom}
                    onCreate={handleCreateRoom}
                    gameState={gameState}
                    setGameState={setGameState}
                    currentGameMeta={currentGameMeta}
                    onOpenRules={openRules}
                />
            ) : (
                <TableScreen
                    gameState={gameState}
                    isHost={isHost}
                    myPeerId={myPeerId}
                    myName={myName}
                    connectionStatus={connectionStatus}
                    currentGameMeta={currentGameMeta}
                    getStat={getCompactTopBarStat}
                    sendActionToHost={sendActionToHost}
                    onStartHand={startNewHand}
                    onAwardPot={handleAwardPot}
                    onAutoShowdown={handleAutoShowdownWinner}
                    onKick={handleKickPlayer}
                    onAddLocalPlayer={handleAddLocalTestPlayer}
                    onReconnect={handleClientReconnect}
                    onOpenRules={openRules}
                    onBackToLobby={() => setScreen('LOBBY')}
                    onUpdateLupusConfig={handleUpdateLupusConfig}
                />
            )}

            <RulesModal
                show={showRulesModal}
                onClose={() => setShowRulesModal(false)}
                selectedGameId={rulesTabGameId}
                onSelectGame={setRulesTabGameId}
                currentGameId={gameState.gameId}
                canSwitchGame={isHost && screen === 'TABLE'}
                onSwitchGame={startNewHand}
            />
        </>
    );
}
