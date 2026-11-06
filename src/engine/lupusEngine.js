import { LUPUS_ROLES_INFO } from '../constants/lupusRoles.js';
import { shuffleArray } from './deckGenerator.js';

// Motore puro di Lupus in Tabula: ogni funzione riceve lo stato di gioco
// e restituisce un NUOVO stato (oppure null se l'azione non è valida).

export const DEFAULT_LUPUS_CONFIG = {
    wolvesCount: 1,
    hasLycanthrope: true,
    hasSeer: true,
    hasGuard: true,
    hasJester: true
};

export const isWolfTeam = (role) => role === 'LUPO' || role === 'LICANTROPO';

export const createInitialLupusState = (overrides = {}) => ({
    dayNumber: 1,
    subPhase: 'WAITING',
    wolfVotes: {},
    seerTargetId: null,
    seerResult: null,
    guardTargetId: null,
    dayVotes: {},
    ballotCandidates: [],
    lastNightReport: '',
    lastLynchReport: '',
    winnerTeam: null,
    winnerBanner: '',
    ...overrides
});

// ---------------------------------------------------------------- AVVIO
export const assignLupusRoles = (players, cfgInput) => {
    const pCount = players.length;
    const cfg = cfgInput || DEFAULT_LUPUS_CONFIG;
    const rolePool = [];

    const wolvesToAssign = Math.max(1, Math.min(cfg.wolvesCount || 1, Math.floor(pCount / 2)));
    for (let i = 0; i < wolvesToAssign; i++) rolePool.push('LUPO');

    if (cfg.hasLycanthrope && rolePool.length < pCount - 1) rolePool.push('LICANTROPO');
    if (cfg.hasSeer && rolePool.length < pCount) rolePool.push('VEGGENTE');
    if (cfg.hasGuard && rolePool.length < pCount) rolePool.push('GUARDIA');
    if (cfg.hasJester && rolePool.length < pCount) rolePool.push('MATTO');

    while (rolePool.length < pCount) rolePool.push('CONTADINO');

    const shuffled = shuffleArray(rolePool);
    return players.map((p, idx) => ({
        ...p,
        lupusRole: shuffled[idx],
        isAlive: true,
        justWon: false,
        showCards: false,
        cards: []
    }));
};

export const startLupusGame = (state) => ({
    ...state,
    gameId: 'LUPUS',
    handNumber: state.handNumber + 1,
    phase: 'LUPUS_NIGHT',
    players: assignLupusRoles(state.players, state.lupusConfig),
    lupusState: createInitialLupusState({ subPhase: 'NIGHT' }),
    notification: '🌙 NOTTE #1: Il villaggio dorme... Lupi, Veggente e Guardia compiono le loro scelte segrete!'
});

// ---------------------------------------------------------------- VITTORIA
export const checkLupusWinCondition = (playersList) => {
    const alive = playersList.filter(p => p.isAlive);
    const aliveWolves = alive.filter(p => isWolfTeam(p.lupusRole));
    const aliveNonWolves = alive.filter(p => !isWolfTeam(p.lupusRole));

    if (aliveWolves.length === 0) {
        return {
            winnerTeam: 'VILLAGE',
            winnerBanner: '🎉 IL VILLAGGIO HA VINTO! Tutti i Lupi (e il Licantropo) sono stati smascherati!'
        };
    }
    if (aliveWolves.length >= aliveNonWolves.length) {
        return {
            winnerTeam: 'WOLVES',
            winnerBanner: '🐺 I LUPI MANNARI HANNO VINTO! Hanno raggiunto la parità numerica con gli abitanti del villaggio!'
        };
    }
    return null;
};

// ---------------------------------------------------------------- AZIONI NOTTURNE
export const applyWolfVote = (state, playerId, targetId) => {
    const voter = state.players.find(p => p.id === playerId);
    if (!voter || !voter.isAlive || !isWolfTeam(voter.lupusRole)) return null;
    return {
        ...state,
        lupusState: {
            ...state.lupusState,
            wolfVotes: { ...(state.lupusState.wolfVotes || {}), [playerId]: targetId }
        }
    };
};

export const applySeerAsk = (state, playerId, targetId) => {
    const seer = state.players.find(p => p.id === playerId);
    const target = state.players.find(p => p.id === targetId);
    if (!seer || !seer.isAlive || seer.lupusRole !== 'VEGGENTE' || !target) return null;

    // Il Licantropo appare come "NON UN LUPO" al Veggente
    const isWolfAppearing = target.lupusRole === 'LUPO';
    return {
        ...state,
        lupusState: {
            ...state.lupusState,
            seerTargetId: target.id,
            seerResult: { targetId: target.id, targetName: target.name, isWolfAppearing }
        }
    };
};

export const applyGuardProtect = (state, playerId, targetId) => {
    const guard = state.players.find(p => p.id === playerId);
    if (!guard || !guard.isAlive || guard.lupusRole !== 'GUARDIA') return null;
    return {
        ...state,
        lupusState: { ...state.lupusState, guardTargetId: targetId }
    };
};

// ---------------------------------------------------------------- HELPER DI TRANSIZIONE
const gameOverState = (state, players, lsPatch, notification) => ({
    ...state,
    phase: 'SHOWDOWN',
    players: players.map(p => ({ ...p, showCards: true })),
    lupusState: { ...state.lupusState, subPhase: 'GAME_OVER', ...lsPatch },
    notification
});

const nextNightState = (state, players, lastLynchReport, buildNotification) => {
    const ls = state.lupusState;
    const nextDay = (ls.dayNumber || 1) + 1;
    return {
        ...state,
        phase: 'LUPUS_NIGHT',
        players,
        lupusState: {
            ...ls,
            dayNumber: nextDay,
            subPhase: 'NIGHT',
            wolfVotes: {},
            seerTargetId: null,
            seerResult: null,
            guardTargetId: null,
            dayVotes: {},
            ballotCandidates: [],
            lastLynchReport
        },
        notification: buildNotification(nextDay)
    };
};

// ---------------------------------------------------------------- ALBA
export const resolveLupusNight = (state) => {
    const ls = state.lupusState;
    const players = state.players.map(p => ({ ...p }));

    const voteCounts = {};
    Object.values(ls.wolfVotes || {}).forEach(targetId => {
        if (targetId) voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let chosenVictimId = null;
    let maxWolfVotes = 0;
    Object.entries(voteCounts).forEach(([tId, cnt]) => {
        if (cnt > maxWolfVotes) {
            maxWolfVotes = cnt;
            chosenVictimId = tId;
        }
    });

    let nightReport = '☀️ È sorto il sole! Questa notte nessun abitante è stato sbranato.';
    if (chosenVictimId) {
        const victim = players.find(p => p.id === chosenVictimId);
        if (victim) {
            if (ls.guardTargetId && ls.guardTargetId === chosenVictimId) {
                nightReport = `🛡️ MIRACOLO NELLA NOTTE! I Lupi hanno attaccato ${victim.name}, ma LA GUARDIA l'ha protetto e nessuno è morto!`;
            } else {
                victim.isAlive = false;
                nightReport = `🩸 TRAGEDIA ALL'ALBA! Durante la notte i Lupi hanno sbranato ${victim.name}!`;
            }
        }
    }

    const winCheck = checkLupusWinCondition(players);
    if (winCheck) {
        return gameOverState(
            state,
            players,
            { lastNightReport: nightReport, winnerTeam: winCheck.winnerTeam, winnerBanner: winCheck.winnerBanner },
            `${nightReport} • ${winCheck.winnerBanner}`
        );
    }

    return {
        ...state,
        phase: 'LUPUS_DAY',
        players,
        lupusState: {
            ...ls,
            subPhase: 'DAY_DISCUSSION',
            dayVotes: {},
            ballotCandidates: [],
            lastNightReport: nightReport,
            lastLynchReport: ''
        },
        notification: `${nightReport} • Ora inizia la VOTAZIONE GENERALE del Villaggio!`
    };
};

// ---------------------------------------------------------------- VOTAZIONE DEL GIORNO
export const resolveLupusDayVote = (state) => {
    const ls = state.lupusState;
    const players = state.players.map(p => ({ ...p }));
    const tally = {};

    Object.values(ls.dayVotes || {}).forEach(targetId => {
        if (targetId && targetId !== 'SKIP') tally[targetId] = (tally[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    Object.values(tally).forEach(cnt => { if (cnt > maxVotes) maxVotes = cnt; });

    // Nessun voto valido: astensione generale
    if (maxVotes === 0) {
        return nextNightState(
            state,
            state.players,
            '⚖️ Il Villaggio si è astenuto: nessuno è stato eliminato al rogo.',
            (d) => `🌙 Calano le tenebre (Notte #${d})! Nessun eliminato al rogo.`
        );
    }

    const topIds = Object.keys(tally).filter(id => tally[id] === maxVotes);

    // Parità al primo scrutinio -> Ballottaggio
    if (topIds.length > 1 && ls.subPhase !== 'DAY_BALLOT') {
        const tiedNames = topIds
            .map(id => players.find(p => p.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        return {
            ...state,
            lupusState: {
                ...ls,
                subPhase: 'DAY_BALLOT',
                dayVotes: {},
                ballotCandidates: topIds,
                lastLynchReport: `⚖️ PARITÀ DI VOTI (${maxVotes})! Si va al BALLOTTAGGIO decisivo tra: ${tiedNames}!`
            },
            notification: `⚖️ BALLOTTAGGIO! Votate solo tra i candidati in parità: ${tiedNames}!`
        };
    }

    // Parità anche al ballottaggio -> nessuno muore
    if (topIds.length > 1 && ls.subPhase === 'DAY_BALLOT') {
        return nextNightState(
            state,
            state.players,
            '⚖️ Nuova parità anche al Ballottaggio! Nessuno viene mandato al rogo.',
            (d) => `🌙 Parità al ballottaggio: nessuno muore! Inizia la Notte #${d}.`
        );
    }

    // Eliminazione
    const eliminatedPlayer = players.find(p => p.id === topIds[0]);
    if (eliminatedPlayer) eliminatedPlayer.isAlive = false;

    const roleInfo = LUPUS_ROLES_INFO[eliminatedPlayer?.lupusRole] || LUPUS_ROLES_INFO.CONTADINO;
    const lynchMsg = `🔥 Il Villaggio ha votato (${maxVotes} voti): ${eliminatedPlayer?.name} è stato eliminato al rogo! Era: ${roleInfo.icon} ${roleInfo.name}!`;

    if (eliminatedPlayer?.lupusRole === 'MATTO') {
        const jesterBanner = `🤪 VITTORIA EPICA DEL MATTO! ${eliminatedPlayer.name} si è fatto eliminare nella Votazione Generale del Villaggio e VINCE LA PARTITA DA SOLO!`;
        eliminatedPlayer.justWon = true;
        return gameOverState(
            state,
            players,
            { lastLynchReport: lynchMsg, winnerTeam: 'JESTER', winnerBanner: jesterBanner },
            jesterBanner
        );
    }

    const winCheck = checkLupusWinCondition(players);
    if (winCheck) {
        return gameOverState(
            state,
            players,
            { lastLynchReport: lynchMsg, winnerTeam: winCheck.winnerTeam, winnerBanner: winCheck.winnerBanner },
            `${lynchMsg} • ${winCheck.winnerBanner}`
        );
    }

    return nextNightState(state, players, lynchMsg, (d) => `${lynchMsg} • 🌙 Ora scende la Notte #${d}!`);
};

// Registra un voto diurno; se tutti i vivi hanno votato risolve subito lo scrutinio.
export const applyDayVote = (state, playerId, targetId) => {
    const voter = state.players.find(p => p.id === playerId);
    if (!voter || !voter.isAlive) return null;

    const updatedVotes = { ...(state.lupusState.dayVotes || {}), [playerId]: targetId };
    const alivePlayers = state.players.filter(p => p.isAlive);
    const allAliveVoted = alivePlayers.every(p => updatedVotes[p.id]);

    const nextState = {
        ...state,
        lupusState: { ...state.lupusState, dayVotes: updatedVotes },
        notification: `🗳️ ${voter.name} ha espresso il suo voto (${Object.keys(updatedVotes).length}/${alivePlayers.length}).`
    };

    return allAliveVoted ? resolveLupusDayVote(nextState) : nextState;
};
