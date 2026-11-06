import { GAMES_CATALOG } from '../constants/gamesCatalog.js';

export const NAP_SUITS = [
    { id: 'D', name: 'Denari', symbol: '☀️', color: 'text-amber-600' },
    { id: 'C', name: 'Coppe', symbol: '🏆', color: 'text-red-700' },
    { id: 'S', name: 'Spade', symbol: '⚔️', color: 'text-sky-800' },
    { id: 'B', name: 'Bastoni', symbol: '🪵', color: 'text-emerald-800' }
];

export const FRENCH_SUITS = [
    { id: 'S', symbol: '♠', name: 'Picche', color: 'text-slate-900' },
    { id: 'H', symbol: '♥', name: 'Cuori', color: 'text-red-600' },
    { id: 'D', symbol: '♦', name: 'Quadri', color: 'text-red-600' },
    { id: 'C', symbol: '♣', name: 'Fiori', color: 'text-slate-900' }
];

export const shuffleArray = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

export const createDeckForGame = (gameId, shortItalianPoker = false) => {
    const meta = GAMES_CATALOG[gameId] || GAMES_CATALOG.TEXAS;
    if (meta.deckType === 'ROLES') return [];

    if (meta.deckType === 'NAPOLETANE_40') {
        const deck = [];
        for (const s of NAP_SUITS) {
            for (let v = 1; v <= 10; v++) {
                let figureIcon = null;
                let rankLabel = String(v);
                if (v === 1) { rankLabel = 'A'; figureIcon = s.symbol; }
                if (v === 8) { rankLabel = '8'; figureIcon = '💃'; }
                if (v === 9) { rankLabel = '9'; figureIcon = '🐎'; }
                if (v === 10) { rankLabel = '10'; figureIcon = '👑'; }

                deck.push({
                    uid: `NAP_${v}${s.id}_${Math.random().toString(36).slice(2, 6)}`,
                    id: `${v}${s.id}`,
                    deckStyle: 'NAP',
                    rank: rankLabel,
                    value: v,
                    suit: s.id,
                    suitName: s.name,
                    symbol: s.symbol,
                    figureIcon,
                    color: s.color,
                    isSettebello: v === 7 && s.id === 'D',
                    isMatta: v === 10 && s.id === 'D'
                });
            }
        }
        return shuffleArray(deck);
    }

    const numDecks = meta.deckType === 'FRENCH_108' ? 2 : 1;
    const ranks = [
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
        { label: '5', value: 5 },
        { label: '6', value: 6 },
        { label: '7', value: 7 },
        { label: '8', value: 8 },
        { label: '9', value: 9 },
        { label: '10', value: 10 },
        { label: 'J', value: 11 },
        { label: 'Q', value: 12 },
        { label: 'K', value: 13 },
        { label: 'A', value: 14 }
    ].filter(r => !(gameId === 'POKER_ITA' && shortItalianPoker && r.value < 7));

    const deck = [];
    for (let d = 0; d < numDecks; d++) {
        for (const s of FRENCH_SUITS) {
            for (const r of ranks) {
                deck.push({
                    uid: `FR_${d}_${r.label}${s.id}_${Math.random().toString(36).slice(2, 6)}`,
                    id: `${r.label}${s.id}`,
                    deckStyle: 'FRENCH',
                    rank: r.label,
                    value: r.value,
                    suit: s.id,
                    suitName: s.name,
                    symbol: s.symbol,
                    color: s.color,
                    isPinella: r.value === 2,
                    isJoker: false
                });
            }
        }
    }

    if (meta.deckType === 'FRENCH_108') {
        for (let j = 1; j <= 4; j++) {
            deck.push({
                uid: `JOKER_${j}_${Math.random().toString(36).slice(2, 6)}`,
                id: `JOKER_${j}`,
                deckStyle: 'FRENCH',
                rank: 'JOK',
                value: 25,
                suit: 'J',
                suitName: 'Jolly',
                symbol: '🃏',
                color: j % 2 === 0 ? 'text-red-600' : 'text-purple-800',
                isPinella: false,
                isJoker: true
            });
        }
    }
    return shuffleArray(deck);
};
