// Utilità numeriche / formattazione
export const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num);
};
export const roundCents = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

// 7 e Mezzo
export const evaluateSetteMezzo = (cards, mattaCustomVal = 'AUTO') => {
    if (!cards || cards.length === 0) return { total: 0, busted: false, isRoyal: false, hasMatta: false };
    let baseSum = 0;
    let hasMatta = false;
    for (const c of cards) {
        if (c.isMatta) hasMatta = true;
        else if (c.value >= 8) baseSum += 0.5;
        else baseSum += c.value;
    }

    let mattaVal = 0;
    if (hasMatta) {
        if (mattaCustomVal !== 'AUTO' && mattaCustomVal !== undefined && mattaCustomVal !== null) {
            mattaVal = Number(mattaCustomVal);
        } else {
            const candidates = [7, 6, 5, 4, 3, 2, 1, 0.5];
            mattaVal = 0.5;
            for (const cand of candidates) {
                if (baseSum + cand <= 7.5) {
                    mattaVal = cand;
                    break;
                }
            }
        }
    }

    const total = Math.round((baseSum + mattaVal) * 10) / 10;
    const isRoyal = cards.length === 2 && total === 7.5 && cards.every(c => c.suit === 'D');
    return { total, mattaVal, hasMatta, busted: total > 7.5, isRoyal };
};

// Blackjack
export const evaluateBlackjack = (cards) => {
    if (!cards || cards.length === 0) return { total: 0, busted: false, isBlackjack: false };
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        if (c.value === 14) { aces += 1; total += 11; }
        else if (c.value >= 10) total += 10;
        else total += c.value;
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    return { total, busted: total > 21, isBlackjack: cards.length === 2 && total === 21 };
};

// Briscola / Tressette
export const getBriscolaPoints = (val) => ({ 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 }[val] || 0);
export const getBriscolaStrength = (val) => ({ 1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 }[val] || 0);
export const getTressetteThirds = (val) => (val === 1 ? 3 : [2, 3, 8, 9, 10].includes(val) ? 1 : 0);
export const getTressetteStrength = (val) => ({ 3: 10, 2: 9, 1: 8, 10: 7, 9: 6, 8: 5, 7: 4, 6: 3, 5: 2, 4: 1 }[val] || 0);

// Scala 40 / Burraco / Ramino
export const calculateMeldPoints = (cards) => {
    if (!cards) return 0;
    return cards.reduce((sum, c) => {
        if (c.isJoker) return sum + 25;
        if (c.value === 14) return sum + 11;
        if (c.value >= 10) return sum + 10;
        return sum + c.value;
    }, 0);
};

// Scopa: conteggio finale
export const computeScopaBreakdown = (players) => {
    if (!players || players.length === 0) return [];
    const primieraTable = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 };

    const stats = players.map(p => {
        const cap = p.capturedCards || [];
        const denariCount = cap.filter(c => c.suit === 'D').length;
        const hasSettebello = cap.some(c => c.isSettebello);
        let primieraScore = 0;
        for (const s of ['D', 'C', 'S', 'B']) {
            const bestInSuit = Math.max(0, ...cap.filter(c => c.suit === s).map(c => primieraTable[c.value] || 0));
            primieraScore += bestInSuit;
        }
        return {
            id: p.id,
            name: p.name,
            totalCards: cap.length,
            denariCount,
            hasSettebello,
            primieraScore,
            scope: p.scopaCount || 0,
            bonusPoints: 0
        };
    });

    const awardUniqueMax = (key) => {
        const maxVal = Math.max(...stats.map(s => s[key]));
        if (maxVal <= 0) return;
        const leaders = stats.filter(s => s[key] === maxVal);
        if (leaders.length === 1) leaders[0].bonusPoints += 1;
    };

    awardUniqueMax('totalCards');
    awardUniqueMax('denariCount');
    awardUniqueMax('primieraScore');
    stats.forEach(s => {
        if (s.hasSettebello) s.bonusPoints += 1;
        s.finalTotal = s.scope + s.bonusPoints;
    });

    return stats;
};
