export const rankToName = (val) => {
    if (val === 14) return 'Assi';
    if (val === 13) return 'Re (K)';
    if (val === 12) return 'Donne (Q)';
    if (val === 11) return 'Fanti (J)';
    return String(val);
};

export const evaluate5CardPoker = (cards5) => {
    if (!cards5 || cards5.length < 5) return { score: 0, label: 'In attesa...' };
    const sorted = [...cards5].sort((a, b) => b.value - a.value);
    const values = sorted.map(c => c.value);
    const suits = sorted.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);

    let isStraight = false;
    let straightHigh = values[0];
    const uniqueVals = [...new Set(values)];
    if (uniqueVals.length === 5) {
        if (values[0] - values[4] === 4) isStraight = true;
        else if (values[0] === 14 && values[1] === 5 && values[4] === 2) { isStraight = true; straightHigh = 5; }
        else if (values[0] === 14 && values[1] === 10 && values[4] === 7) { isStraight = true; straightHigh = 10; }
    }

    const counts = {};
    for (const v of values) counts[v] = (counts[v] || 0) + 1;
    const groups = Object.entries(counts)
        .map(([val, count]) => ({ val: Number(val), count }))
        .sort((a, b) => b.count - a.count || b.val - a.val);

    const encodeTie = (arr) => arr.reduce((acc, v, idx) => acc + v * Math.pow(15, 4 - idx), 0);

    if (isStraight && isFlush) return { score: 8e7 + straightHigh, label: straightHigh === 14 ? 'Scala Reale!' : 'Scala Colore' };
    if (groups[0].count === 4) return { score: 7e7 + encodeTie([groups[0].val, groups[1].val]), label: `Poker di ${rankToName(groups[0].val)}` };
    if (groups[0].count === 3 && groups[1].count === 2) return { score: 6e7 + encodeTie([groups[0].val, groups[1].val]), label: `Full (${rankToName(groups[0].val)} e ${rankToName(groups[1].val)})` };
    if (isFlush) return { score: 5e7 + encodeTie(values), label: 'Colore' };
    if (isStraight) return { score: 4e7 + straightHigh, label: 'Scala' };
    if (groups[0].count === 3) return { score: 3e7 + encodeTie(groups.map(g => g.val)), label: `Tris di ${rankToName(groups[0].val)}` };
    if (groups[0].count === 2 && groups[1].count === 2) return { score: 2e7 + encodeTie(groups.map(g => g.val)), label: `Doppia Coppia (${rankToName(groups[0].val)} e ${rankToName(groups[1].val)})` };
    if (groups[0].count === 2) return { score: 1e7 + encodeTie(groups.map(g => g.val)), label: `Coppia di ${rankToName(groups[0].val)}` };
    return { score: encodeTie(values), label: `Carta Alta ${rankToName(values[0])}` };
};

export const evaluateBestPokerHand = (allCards) => {
    if (!allCards || allCards.length === 0) return { score: 0, label: '' };
    if (allCards.length < 5) {
        if (allCards.length === 2) {
            if (allCards[0].value === allCards[1].value) return { score: 100 + allCards[0].value, label: `Coppia di ${rankToName(allCards[0].value)}` };
            const hi = Math.max(allCards[0].value, allCards[1].value);
            return { score: hi, label: `Carta Alta ${rankToName(hi)}` };
        }
        return { score: 0, label: 'In corso...' };
    }
    if (allCards.length === 5) return evaluate5CardPoker(allCards);

    let best = { score: -1, label: '' };
    const n = allCards.length;
    const pick = (start, chosen) => {
        if (chosen.length === 5) {
            const res = evaluate5CardPoker(chosen);
            if (res.score > best.score) best = res;
            return;
        }
        for (let i = start; i < n; i++) {
            chosen.push(allCards[i]);
            pick(i + 1, chosen);
            chosen.pop();
        }
    };
    pick(0, []);
    return best;
};
