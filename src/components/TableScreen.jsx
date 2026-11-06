import React, { useState, useEffect, useMemo } from 'react';
import PlayingCard from './PlayingCard.jsx';
import ManageModal from './ManageModal.jsx';
import { LUPUS_ROLES_INFO } from '../constants/lupusRoles.js';
import { formatMoney, roundCents } from '../engine/cardEvaluators.js';
import { isWolfTeam } from '../engine/lupusEngine.js';

const getPos = (index, total, radiusX, radiusY) => {
    const angle = (index / total) * 2 * Math.PI + Math.PI / 2;
    return { x: Math.cos(angle) * radiusX, y: Math.sin(angle) * radiusY };
};

export default function TableScreen({
    gameState,
    isHost,
    myPeerId,
    myName,
    connectionStatus,
    currentGameMeta,
    getStat,
    sendActionToHost,
    onStartHand,
    onAwardPot,
    onAutoShowdown,
    onKick,
    onAddLocalPlayer,
    onReconnect,
    onOpenRules,
    onBackToLobby,
    onUpdateLupusConfig
}) {
    // ---- stato puramente di interfaccia ----
    const [viewedPlayerId, setViewedPlayerId] = useState(null);
    const [autoFollowTurn, setAutoFollowTurn] = useState(true);
    const [newLocalPlayerName, setNewLocalPlayerName] = useState('');
    const [hideMyRoleCard, setHideMyRoleCard] = useState(false);
    const [betInput, setBetInput] = useState('');
    const [selectedHandIndices, setSelectedHandIndices] = useState([]);
    const [selectedTableCardIds, setSelectedTableCardIds] = useState([]);
    const [copySuccess, setCopySuccess] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);

    const activePerspectiveId = useMemo(() => {
        if (!isHost) return myPeerId;
        const turnP = gameState.players[gameState.turnIndex];
        if (autoFollowTurn && turnP?.isLocalSim && gameState.gameId !== 'LUPUS') {
            return turnP.id;
        }
        if (viewedPlayerId && gameState.players.some(p => p.id === viewedPlayerId)) {
            return viewedPlayerId;
        }
        return myPeerId;
    }, [isHost, myPeerId, viewedPlayerId, autoFollowTurn, gameState.turnIndex, gameState.players, gameState.gameId]);

    useEffect(() => {
        setSelectedHandIndices([]);
        setSelectedTableCardIds([]);
    }, [activePerspectiveId, gameState.handNumber, gameState.phase, gameState.gameId]);

    const copyRoomCode = () => {
        const el = document.createElement('textarea');
        el.value = gameState.roomCode;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const selectPlayerView = (playerId) => {
        if (isHost) {
            setAutoFollowTurn(false);
            setViewedPlayerId(playerId);
        }
    };

    const handleAddLocalPlayer = () => {
        onAddLocalPlayer(newLocalPlayerName);
        setNewLocalPlayerName('');
    };

    // ---- valori derivati ----
    const turnPlayer = gameState.players[gameState.turnIndex] || {};
    const perspectivePlayer = gameState.players.find(p => p.id === activePerspectiveId) || gameState.players[0] || {};
    const isMyTurn = turnPlayer.id === perspectivePlayer.id && gameState.phase !== 'WAITING' && gameState.phase !== 'SHOWDOWN';

    const tableHighBet = Math.max(...gameState.players.map(p => p.currentBet || 0), 0);
    const amountToCall = perspectivePlayer.currentBet !== undefined
        ? Math.max(0, roundCents(tableHighBet - perspectivePlayer.currentBet))
        : 0;
    const canCheck = amountToCall <= 0.005;

    const isLupusGame = gameState.gameId === 'LUPUS';
    const lupusSubPhase = gameState.lupusState?.subPhase || 'WAITING';
    const myLupusRole = LUPUS_ROLES_INFO[perspectivePlayer.lupusRole] || LUPUS_ROLES_INFO.CONTADINO;

    return (
        <div className="flex flex-col items-center justify-between min-h-screen p-2 md:p-4 overflow-x-hidden select-none">

            {/* ====================== BARRA SUPERIORE ====================== */}
            <div className="w-full max-w-6xl z-30 space-y-1.5">
                <div className="wood-panel px-3 py-2 rounded-2xl flex flex-wrap justify-between items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-base md:text-lg font-rustic font-black text-amber-400">
                                    {currentGameMeta.name}
                                </span>
                                <span className="bg-stone-950 text-yellow-400 border border-amber-500/40 text-xs font-mono-num px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                                    Stanza: <strong>{gameState.roomCode}</strong>
                                    <button onClick={copyRoomCode} className="hover:text-white underline text-[10px]">
                                        {copySuccess ? 'Copiato!' : 'Copia'}
                                    </button>
                                </span>
                            </div>
                            <div className="text-[11px] text-amber-200/70">
                                {currentGameMeta.badge} • Giocatori: <strong>{gameState.players.length}</strong> • <span className="text-emerald-400">{connectionStatus}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {!isHost && (
                            <button
                                onClick={onReconnect}
                                className="bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                                title="Sincronizza con l'Oste"
                            >
                                🔄 Riconnetti
                            </button>
                        )}

                        <button
                            onClick={onOpenRules}
                            className="bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1"
                        >
                            📖 Regole
                        </button>

                        {isHost && (
                            <>
                                <button
                                    disabled={gameState.players.length < 2}
                                    onClick={() => onStartHand()}
                                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-black font-black px-3 py-1.5 rounded-xl text-xs transition"
                                >
                                    🔄 {gameState.handNumber === 0 ? (isLupusGame ? 'ASSEGNA RUOLI E INIZIA' : 'DAI LE CARTE') : (isLupusGame ? 'NUOVA PARTITA LUPUS' : 'NUOVA MANO')}
                                </button>

                                {currentGameMeta.category === 'POKER' && gameState.pot > 0 && (
                                    <button
                                        onClick={onAutoShowdown}
                                        className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                                    >
                                        🏆 Calcola Vincitore
                                    </button>
                                )}
                            </>
                        )}

                        <button
                            onClick={() => setShowManageModal(true)}
                            className="bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-700/50 px-3 py-1.5 rounded-xl text-xs font-bold"
                        >
                            ⚙️ Giochi & Stanza ({gameState.players.length})
                        </button>
                    </div>
                </div>

                {/* Riepilogo punteggi e giocatori */}
                <div className="bg-stone-950/90 border border-amber-900/50 px-3 py-1.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-amber-300/80 font-bold">📊 Giocatori:</span>
                        {gameState.players.map((p) => (
                            <div
                                key={p.id}
                                className={`inline-flex items-center rounded-lg border overflow-hidden ${
                                    activePerspectiveId === p.id
                                        ? 'bg-amber-500 text-black border-amber-300 font-black'
                                        : 'bg-stone-900 text-amber-100 border-stone-700'
                                }`}
                            >
                                <button
                                    onClick={() => selectPlayerView(p.id)}
                                    className="px-2 py-0.5 hover:opacity-80 flex items-center gap-1.5"
                                >
                                    <span>{p.name}</span>
                                    <span className={`text-[10px] font-mono-num px-1 rounded ${activePerspectiveId === p.id ? 'bg-black/20 text-black' : 'bg-black/40 text-amber-400'}`}>
                                        {getStat(p)}
                                    </span>
                                </button>
                                {isHost && p.id !== myPeerId && (
                                    <button
                                        onClick={() => onKick(p.id)}
                                        title={`Espelli ${p.name} dalla stanza`}
                                        className="bg-red-700 hover:bg-red-600 text-white px-1.5 py-0.5 font-black text-[10px]"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {isHost && (
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                placeholder="Nome amico test..."
                                value={newLocalPlayerName}
                                onChange={(e) => setNewLocalPlayerName(e.target.value)}
                                className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-0.5 text-white w-28 text-xs outline-none focus:border-amber-500"
                            />
                            <button
                                onClick={handleAddLocalPlayer}
                                className="bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-lg font-bold text-[11px]"
                            >
                                + Test
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ====================== TAVOLO CENTRALE ====================== */}
            <div className="relative w-[340px] h-[360px] sm:w-[600px] sm:h-[440px] md:w-[780px] md:h-[480px] flex items-center justify-center my-5 shrink-0">

                <div
                    className={`absolute inset-0 rounded-full wood-rim transition-all duration-700 ${
                        isLupusGame
                            ? lupusSubPhase === 'NIGHT'
                                ? 'lupus-night-surface'
                                : 'lupus-day-surface'
                            : 'felt-surface'
                    }`}
                >
                    <div className="absolute inset-3 border-2 border-dashed border-amber-400/20 rounded-full pointer-events-none"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center px-4 max-w-full">
                    {gameState.players.length < 2 ? (
                        <div className="bg-stone-950/90 border-2 border-amber-500/60 p-4 sm:p-5 rounded-2xl text-center max-w-sm space-y-2.5">
                            <div className="text-amber-400 font-rustic font-black text-base sm:text-lg">
                                🍷 Sei solo tu nella stanza!
                            </div>
                            <p className="text-xs text-amber-100/80 leading-relaxed">
                                Fai inserire ai tuoi amici il Codice Stanza <strong className="text-yellow-400 font-mono-num text-sm">{gameState.roomCode}</strong> e premere <strong>ENTRA</strong>, oppure aggiungi giocatori di test:
                            </p>
                            <div className="flex justify-center gap-2 pt-1">
                                <button
                                    onClick={copyRoomCode}
                                    className="bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-600/50 px-3 py-1.5 rounded-xl text-xs font-bold"
                                >
                                    📋 {copySuccess ? 'Copiato!' : `Copia ${gameState.roomCode}`}
                                </button>
                                {isHost && (
                                    <button
                                        onClick={handleAddLocalPlayer}
                                        className="bg-amber-500 hover:bg-amber-400 text-black font-black px-3 py-1.5 rounded-xl text-xs"
                                    >
                                        + Aggiungi Giocatore Test
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* --- CENTRO LUPUS --- */}
                            {isLupusGame && (
                                <div className="bg-black/65 border border-amber-500/50 px-4 py-3 rounded-2xl max-w-[300px] sm:max-w-[440px] text-center space-y-2">
                                    {gameState.phase === 'WAITING' ? (
                                        <>
                                            <div className="text-lg font-rustic font-black text-amber-400">
                                                🐺 Villaggio di Lupus in Tabula
                                            </div>
                                            <p className="text-xs text-amber-100/80">
                                                Giocatori pronti: <strong>{gameState.players.length}</strong>. Lupi: <strong>{gameState.lupusConfig.wolvesCount}</strong> {gameState.lupusConfig.hasLycanthrope ? '+ Licantropo 🐺🌑' : ''}.
                                            </p>
                                            {isHost && (
                                                <button
                                                    onClick={() => onStartHand('LUPUS')}
                                                    className="bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-2 rounded-xl text-xs"
                                                >
                                                    🐺 DISTRIBUISCI I RUOLI SEGRETI E INIZIA LA NOTTE!
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-2xl">
                                                    {lupusSubPhase === 'NIGHT' ? '🌙' : lupusSubPhase === 'GAME_OVER' ? '🏆' : '☀️'}
                                                </span>
                                                <span className="text-base sm:text-xl font-rustic font-black text-amber-300">
                                                    {lupusSubPhase === 'NIGHT'
                                                        ? `NOTTE #${gameState.lupusState.dayNumber}`
                                                        : lupusSubPhase === 'DAY_BALLOT'
                                                        ? `BALLOTTAGGIO GIORNO #${gameState.lupusState.dayNumber}`
                                                        : lupusSubPhase === 'GAME_OVER'
                                                        ? 'PARTITA CONCLUSA!'
                                                        : `GIORNO #${gameState.lupusState.dayNumber} — VOTAZIONE GENERALE`}
                                                </span>
                                            </div>

                                            {gameState.lupusState.lastNightReport && (
                                                <div className="text-xs bg-stone-900/90 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-200 font-semibold">
                                                    {gameState.lupusState.lastNightReport}
                                                </div>
                                            )}

                                            {gameState.lupusState.lastLynchReport && (
                                                <div className="text-xs bg-red-950/80 border border-red-500/40 px-3 py-1.5 rounded-xl text-red-200 font-semibold">
                                                    {gameState.lupusState.lastLynchReport}
                                                </div>
                                            )}

                                            {gameState.lupusState.winnerBanner && (
                                                <div className="text-xs sm:text-sm bg-amber-500 text-black font-black px-3 py-2 rounded-xl">
                                                    {gameState.lupusState.winnerBanner}
                                                </div>
                                            )}

                                            {isHost && lupusSubPhase === 'NIGHT' && (
                                                <div className="pt-1">
                                                    <button
                                                        onClick={() => sendActionToHost({ type: 'LUPUS_RESOLVE_NIGHT' })}
                                                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black px-4 py-1.5 rounded-xl text-xs"
                                                    >
                                                        ☀️ CONCLUDI LA NOTTE E ANNUNCIA L'ALBA
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* --- CENTRO POKER --- */}
                            {currentGameMeta.category === 'POKER' && (
                                <>
                                    <div className="bg-black/55 px-5 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-2 mb-2">
                                        <span className="text-amber-400 font-black">PIATTO:</span>
                                        <span className="text-2xl md:text-3xl font-mono-num font-black text-white">
                                            {formatMoney(gameState.pot)}
                                        </span>
                                    </div>
                                    {gameState.gameId === 'TEXAS' && (
                                        <div className="flex items-center justify-center gap-1.5 my-1">
                                            {[0, 1, 2, 3, 4].map(slot => {
                                                const c = gameState.communityCards[slot];
                                                return c ? (
                                                    <PlayingCard key={c.uid} card={c} size="sm" />
                                                ) : (
                                                    <div key={slot} className="w-10 h-14 rounded-md border border-dashed border-amber-300/30 bg-black/20 flex items-center justify-center text-[9px] text-amber-200/40 font-bold">
                                                        {slot < 3 ? 'FLOP' : slot === 3 ? 'TURN' : 'RIVER'}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* --- CENTRO SCOPA --- */}
                            {gameState.gameId === 'SCOPA' && (
                                <div className="flex flex-col items-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 mb-1">
                                        Carte a Terra ({gameState.communityCards.length}) • Mazzo: {gameState.deck.length}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[340px] min-h-[68px]">
                                        {gameState.communityCards.length > 0 ? (
                                            gameState.communityCards.map(tc => {
                                                const isSel = selectedTableCardIds.includes(tc.uid);
                                                return (
                                                    <PlayingCard
                                                        key={tc.uid}
                                                        card={tc}
                                                        size="sm"
                                                        selected={isSel}
                                                        badge={isSel ? 'PRESA' : null}
                                                        onClick={() => {
                                                            if (isSel) setSelectedTableCardIds(selectedTableCardIds.filter(id => id !== tc.uid));
                                                            else setSelectedTableCardIds([...selectedTableCardIds, tc.uid]);
                                                        }}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <div className="text-xs text-amber-200/60 italic py-3">Tavolo pulito!</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- CENTRO BRISCOLA & TRESSETTE --- */}
                            {(gameState.gameId === 'BRISCOLA' || gameState.gameId === 'TRESSETTE') && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    {gameState.gameId === 'BRISCOLA' && gameState.briscolaCard && (
                                        <div className="flex flex-col items-center bg-black/35 px-3 py-1.5 rounded-xl border border-amber-500/30">
                                            <span className="text-[9px] font-black uppercase text-amber-300 mb-1">
                                                Briscola: {gameState.briscolaCard.suitName} {gameState.briscolaCard.symbol}
                                            </span>
                                            <PlayingCard card={gameState.briscolaCard} size="xs" />
                                            <span className="text-[9px] text-amber-200/70 mt-1">Mazzo: {gameState.deck.length}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 min-h-[72px] bg-black/25 px-4 py-2 rounded-xl border border-white/10">
                                        {gameState.trickCards.length > 0 ? (
                                            gameState.trickCards.map((tk, idx) => (
                                                <div key={idx} className="flex flex-col items-center">
                                                    <PlayingCard card={tk.card} size="sm" />
                                                    <span className="text-[10px] font-bold text-amber-200 mt-1">{tk.playerName}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-xs text-amber-200/60 italic">
                                                In attesa della prima carta del giro...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- CENTRO ZOMPACAVALLO --- */}
                            {gameState.gameId === 'ZOMPACAVALLO' && (
                                <div className="flex items-center gap-4">
                                    <div
                                        onClick={() => isMyTurn && sendActionToHost({ type: 'ZOMPA_DRAW', playerId: perspectivePlayer.id })}
                                        className="flex flex-col items-center cursor-pointer group"
                                    >
                                        <PlayingCard hidden={true} size="sm" />
                                        <span className="text-[10px] font-bold text-amber-300 mt-1 group-hover:underline">
                                            Pesca ({gameState.deck.length})
                                        </span>
                                    </div>
                                    {gameState.discardPile.length > 0 && (
                                        <div className="flex flex-col items-center">
                                            <PlayingCard card={gameState.discardPile[gameState.discardPile.length - 1]} size="sm" />
                                            <span className="text-[10px] font-bold text-amber-200 mt-1">
                                                Scarto ({gameState.discardPile[gameState.discardPile.length - 1].suitName})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- CENTRO SCALA 40 / MACHIAVELLI / BURRACO / RAMINO --- */}
                            {['SCALA40', 'MACHIAVELLI', 'BURRACO', 'RAMINO'].includes(gameState.gameId) && (
                                <div className="flex flex-col items-center gap-2 max-w-[460px]">
                                    <div className="flex items-center gap-3">
                                        <button
                                            disabled={!isMyTurn}
                                            onClick={() => sendActionToHost({ type: 'RUMMY_DRAW_DECK', playerId: perspectivePlayer.id })}
                                            className="bg-stone-900/90 hover:bg-stone-800 disabled:opacity-50 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                                        >
                                            🎴 Tallone ({gameState.deck.length})
                                        </button>

                                        <button
                                            disabled={!isMyTurn || gameState.discardPile.length === 0}
                                            onClick={() => sendActionToHost({ type: 'RUMMY_DRAW_DISCARD', playerId: perspectivePlayer.id })}
                                            className="bg-stone-900/90 hover:bg-stone-800 disabled:opacity-50 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                                        >
                                            📥 {gameState.gameId === 'BURRACO' ? `Prendi Scarti (${gameState.discardPile.length})` : `Scarto: ${gameState.discardPile[gameState.discardPile.length - 1]?.rank || '-'}${gameState.discardPile[gameState.discardPile.length - 1]?.symbol || ''}`}
                                        </button>

                                        {gameState.gameId === 'BURRACO' && (
                                            <span className="bg-amber-950/90 border border-amber-500/40 px-2.5 py-1 rounded-xl text-[10px] font-bold text-amber-300">
                                                📦 Pozzetti: {gameState.pozzetti.filter(pz => pz.length > 0).length}/2
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center gap-2 max-h-[125px] overflow-y-auto p-1">
                                        {gameState.tableMelds.map((meld) => (
                                            <div
                                                key={meld.id}
                                                className="bg-black/45 border border-amber-500/30 rounded-xl px-2 py-1 flex flex-col items-center"
                                            >
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <span className="text-[9px] font-bold text-amber-300">
                                                        {meld.ownerName} ({meld.points} pt) {meld.isBurraco ? '🔥 BURRACO' : ''}
                                                    </span>
                                                    {isMyTurn && selectedHandIndices.length > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                sendActionToHost({
                                                                    type: 'RUMMY_ATTACH',
                                                                    playerId: perspectivePlayer.id,
                                                                    meldId: meld.id,
                                                                    indices: selectedHandIndices
                                                                });
                                                                setSelectedHandIndices([]);
                                                            }}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded"
                                                        >
                                                            +Attacca
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex -space-x-1.5">
                                                    {meld.cards.map(mc => (
                                                        <PlayingCard
                                                            key={mc.uid}
                                                            card={mc}
                                                            size="xs"
                                                            onClick={
                                                                gameState.gameId === 'MACHIAVELLI' && isMyTurn
                                                                    ? () => sendActionToHost({ type: 'MACHIAVELLI_TAKE_TABLE_CARD', playerId: perspectivePlayer.id, meldId: meld.id, cardUid: mc.uid })
                                                                    : null
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isLupusGame && (
                                <div className="text-amber-200 text-[11px] min-h-[22px] text-center max-w-[260px] sm:max-w-[360px] font-semibold bg-black/35 px-2.5 py-0.5 rounded-lg border border-amber-500/20 mt-1.5 pointer-events-none">
                                    {gameState.notification}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ---- Postazioni giocatori ---- */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="relative w-full h-full pointer-events-none">
                        {gameState.players.map((p, i) => {
                            const isMobile = window.innerWidth < 640;
                            const rX = isMobile ? 142 : window.innerWidth < 768 ? 260 : 348;
                            const rY = isMobile ? 150 : window.innerWidth < 768 ? 190 : 210;
                            const { x, y } = getPos(i, gameState.players.length, rX, rY);

                            const isTurn = !isLupusGame && i === gameState.turnIndex && gameState.phase !== 'WAITING' && gameState.phase !== 'SHOWDOWN';
                            const isDealer = !isLupusGame && i === gameState.dealerIndex;
                            const isViewingThis = p.id === activePerspectiveId;
                            const shouldReveal = p.showCards || isViewingThis || gameState.phase === 'SHOWDOWN';

                            const viewerIsWolfTeam = isWolfTeam(perspectivePlayer.lupusRole);
                            const targetIsWolfTeam = isWolfTeam(p.lupusRole);
                            const canSeeLupusRole = isLupusGame && gameState.phase !== 'WAITING' && (isViewingThis || p.showCards || gameState.phase === 'SHOWDOWN' || (viewerIsWolfTeam && targetIsWolfTeam));

                            const pRoleObj = LUPUS_ROLES_INFO[p.lupusRole] || LUPUS_ROLES_INFO.CONTADINO;
                            const dayVotesAgainst = isLupusGame
                                ? Object.values(gameState.lupusState?.dayVotes || {}).filter(v => v === p.id).length
                                : 0;

                            return (
                                <div
                                    key={p.id}
                                    className={`absolute flex flex-col items-center transition-all duration-300 pointer-events-none ${
                                        p.isFolded || p.isBusted || (isLupusGame && !p.isAlive) ? 'opacity-45 grayscale' : ''
                                    } ${isTurn ? 'scale-105 z-40' : 'z-30'} ${p.justWon ? 'winner-anim z-50' : ''}`}
                                    style={{
                                        transform: `translate(${x}px, ${y}px)`,
                                        left: '50%',
                                        top: '50%',
                                        marginLeft: '-36px',
                                        marginTop: '-34px',
                                        width: '72px'
                                    }}
                                >
                                    {!isLupusGame && p.cards && p.cards.length > 0 && p.cards.length <= 3 && (
                                        <div className="flex -space-x-2 mb-0.5 relative z-20 pointer-events-none">
                                            {p.cards.map((c, cIdx) => (
                                                <PlayingCard key={c.uid || cIdx} card={c} hidden={!shouldReveal} size="xs" />
                                            ))}
                                        </div>
                                    )}

                                    <div
                                        onClick={() => selectPlayerView(p.id)}
                                        className={`pointer-events-auto cursor-pointer relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center bg-stone-900 ${
                                            p.justWon
                                                ? 'border-green-400 bg-green-900'
                                                : isTurn
                                                ? 'border-amber-400 ring-2 ring-amber-400/50'
                                                : isViewingThis
                                                ? 'border-sky-400'
                                                : 'border-amber-700'
                                        }`}
                                    >
                                        <span className="text-sm">
                                            {isLupusGame && !p.isAlive
                                                ? '💀'
                                                : canSeeLupusRole && !hideMyRoleCard
                                                ? pRoleObj.icon
                                                : '👤'}
                                        </span>

                                        {isDealer && (
                                            <div className="absolute -top-1 -right-1 px-1 py-0.2 bg-amber-400 text-black rounded-full font-black text-[8px] border border-black">
                                                {['SETTE_MEZZO', 'BLACKJACK'].includes(gameState.gameId) ? 'B' : 'D'}
                                            </div>
                                        )}

                                        {isLupusGame && dayVotesAgainst > 0 && (
                                            <div className="absolute -bottom-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full border border-white">
                                                🔥{dayVotesAgainst}
                                            </div>
                                        )}

                                        {isHost && p.id !== myPeerId && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onKick(p.id);
                                                }}
                                                title={`Rimuovi ${p.name} dalla stanza`}
                                                className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center font-black text-[9px] border border-white z-50"
                                            >
                                                ✕
                                            </button>
                                        )}

                                        {p.currentBet > 0 && (
                                            <div className="absolute -bottom-2 bg-blue-600 text-white text-[8px] font-mono-num font-bold px-1.5 py-0.2 rounded-full border border-blue-300">
                                                {formatMoney(p.currentBet)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-1 bg-stone-950/85 px-2 py-0.5 rounded-md text-center border border-amber-600/30 pointer-events-none">
                                        <div className="font-bold text-[10px] text-amber-100 truncate max-w-[68px] leading-tight">
                                            {p.name}
                                        </div>
                                    </div>

                                    {isHost && currentGameMeta.category === 'POKER' && gameState.pot > 0 && !p.isFolded && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAwardPot(i);
                                            }}
                                            className="pointer-events-auto mt-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-emerald-300"
                                        >
                                            🏆 VINCE
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ====================== PANNELLO INFERIORE ====================== */}
            <div className="w-full max-w-5xl wood-panel p-3 md:p-4 rounded-2xl z-30">

                {isLupusGame ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-800/40 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-200/80">
                                    Stai giocando come: <strong className="text-amber-400 text-sm">{perspectivePlayer.name}</strong>
                                </span>
                                {!perspectivePlayer.isAlive && gameState.phase !== 'WAITING' && (
                                    <span className="bg-red-900 text-red-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                        💀 SEI STATO ELIMINATO
                                    </span>
                                )}
                            </div>

                            {gameState.phase !== 'WAITING' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setHideMyRoleCard(!hideMyRoleCard)}
                                        className="bg-stone-900 hover:bg-stone-800 text-amber-200 border border-stone-700 px-3 py-1 rounded-lg text-xs font-bold"
                                    >
                                        {hideMyRoleCard ? '👁️ Mostra il mio Ruolo Segreto' : '🙈 Nascondi Ruolo (Anti-Sbirciata)'}
                                    </button>
                                    <button
                                        onClick={() => sendActionToHost({ type: 'TOGGLE_SHOW_CARDS', playerId: perspectivePlayer.id })}
                                        className="bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-600/40 px-3 py-1 rounded-lg text-xs font-bold"
                                    >
                                        {perspectivePlayer.showCards ? 'Copri Ruolo a Tutti' : 'Rivela Ruolo al Tavolo'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {gameState.phase === 'WAITING' ? (
                            <div className="text-center py-4 text-xs text-amber-200/70">
                                In attesa che l'Oste avvii la partita di Lupus in Tabula...
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className={`p-4 rounded-2xl border-2 bg-gradient-to-br ${hideMyRoleCard ? 'from-stone-900 to-stone-950 border-stone-700' : myLupusRole.color} flex flex-col justify-between`}>
                                    {hideMyRoleCard ? (
                                        <div className="my-auto text-center py-6">
                                            <div className="text-3xl mb-2">🙈</div>
                                            <div className="font-rustic font-black text-sm text-amber-300">Ruolo Coperto</div>
                                            <p className="text-[11px] text-amber-200/60 mt-1">
                                                Tocca "Mostra il mio Ruolo Segreto" in alto a destra per vederlo.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                                                        IL TUO RUOLO SEGRETO
                                                    </span>
                                                    <span className="text-2xl">{myLupusRole.icon}</span>
                                                </div>
                                                <h4 className="text-xl font-rustic font-black mt-1">{myLupusRole.name}</h4>
                                                <p className="text-xs leading-relaxed opacity-90 mt-2">{myLupusRole.desc}</p>
                                            </div>

                                            {isWolfTeam(perspectivePlayer.lupusRole) && (
                                                <div className="mt-3 pt-2 border-t border-white/15 text-[11px]">
                                                    <span className="font-black text-red-300">🐺 Branco dei Lupi: </span>
                                                    {gameState.players
                                                        .filter(pl => isWolfTeam(pl.lupusRole))
                                                        .map(pl => `${pl.name} (${pl.lupusRole === 'LICANTROPO' ? 'Licantropo' : 'Lupo'})`)
                                                        .join(', ')}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="md:col-span-2 bg-stone-950/90 border border-amber-800/50 rounded-2xl p-4">
                                    {lupusSubPhase === 'NIGHT' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                                                <span className="text-sm font-rustic font-black text-indigo-300">
                                                    🌙 Azioni Segrete della Notte #{gameState.lupusState.dayNumber}
                                                </span>
                                                {isHost && (
                                                    <span className="text-[11px] text-amber-300/80">
                                                        Oste: quando i ruoli notturni hanno scelto, premi "☀️ Concludi la Notte" al centro.
                                                    </span>
                                                )}
                                            </div>

                                            {!perspectivePlayer.isAlive ? (
                                                <div className="text-xs text-stone-400 italic py-4 text-center">
                                                    Sei stato eliminato e osservi la notte in silenzio...
                                                </div>
                                            ) : isWolfTeam(perspectivePlayer.lupusRole) ? (
                                                <div className="space-y-2.5 bg-red-950/40 border border-red-500/40 p-3.5 rounded-xl">
                                                    <div className="text-xs font-black uppercase text-red-300">
                                                        🐺 Votazione Interna dei Lupi — Scegliete chi sbranare stanotte:
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {gameState.players
                                                            .filter(pl => pl.isAlive && !isWolfTeam(pl.lupusRole))
                                                            .map(target => {
                                                                const myVote = gameState.lupusState.wolfVotes?.[perspectivePlayer.id] === target.id;
                                                                const wolfVoters = Object.entries(gameState.lupusState.wolfVotes || {})
                                                                    .filter(([, tId]) => tId === target.id)
                                                                    .map(([wId]) => gameState.players.find(p => p.id === wId)?.name)
                                                                    .filter(Boolean);

                                                                return (
                                                                    <button
                                                                        key={target.id}
                                                                        onClick={() =>
                                                                            sendActionToHost({
                                                                                type: 'LUPUS_WOLF_VOTE',
                                                                                playerId: perspectivePlayer.id,
                                                                                targetId: target.id
                                                                            })
                                                                        }
                                                                        className={`p-2.5 rounded-xl border text-left transition ${
                                                                            myVote
                                                                                ? 'bg-red-600 text-white border-red-300 font-black'
                                                                                : 'bg-stone-900 text-red-100 border-stone-700 hover:bg-stone-800'
                                                                        }`}
                                                                    >
                                                                        <div className="text-xs font-bold">🎯 {target.name}</div>
                                                                        {wolfVoters.length > 0 && (
                                                                            <div className="text-[10px] text-amber-300 mt-1">
                                                                                Votato da: {wolfVoters.join(', ')}
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            ) : perspectivePlayer.lupusRole === 'VEGGENTE' ? (
                                                <div className="space-y-3 bg-indigo-950/50 border border-sky-400/50 p-3.5 rounded-xl">
                                                    <div className="text-xs font-black uppercase text-sky-300">
                                                        🔮 Sfera di Cristallo del Veggente — Chiedi chi è il Lupo:
                                                    </div>

                                                    {!gameState.lupusState.seerResult ? (
                                                        <>
                                                            <p className="text-xs text-sky-100/80">
                                                                Seleziona un giocatore vivo da scrutare questa notte:
                                                            </p>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                {gameState.players
                                                                    .filter(pl => pl.isAlive && pl.id !== perspectivePlayer.id)
                                                                    .map(target => (
                                                                        <button
                                                                            key={target.id}
                                                                            onClick={() =>
                                                                                sendActionToHost({
                                                                                    type: 'LUPUS_SEER_ASK',
                                                                                    playerId: perspectivePlayer.id,
                                                                                    targetId: target.id
                                                                                })
                                                                            }
                                                                            className="p-2.5 rounded-xl bg-stone-900 hover:bg-sky-900/70 text-sky-100 border border-sky-500/40 text-xs font-bold text-left transition"
                                                                        >
                                                                            🔮 Indaga su <strong>{target.name}</strong>
                                                                        </button>
                                                                    ))}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div
                                                            className={`p-4 rounded-2xl border-2 text-center space-y-2 ${
                                                                gameState.lupusState.seerResult.isWolfAppearing
                                                                    ? 'bg-red-950/90 border-red-400 text-red-100'
                                                                    : 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
                                                            }`}
                                                        >
                                                            <div className="text-[11px] font-black uppercase tracking-widest opacity-80">
                                                                🔮 Responso Segreto della Sfera di Cristallo
                                                            </div>
                                                            <div className="text-lg sm:text-xl font-rustic font-black">
                                                                Hai chiesto di: <span className="underline">{gameState.lupusState.seerResult.targetName}</span>
                                                            </div>
                                                            <div className="text-base sm:text-lg font-black py-1.5 px-4 rounded-xl bg-black/40 inline-block">
                                                                {gameState.lupusState.seerResult.isWolfAppearing
                                                                    ? '🐺 SÌ! È UN LUPO MANNARO!'
                                                                    : '😇 NO! NON È UN LUPO!'}
                                                            </div>
                                                            <p className="text-[10px] opacity-75">
                                                                (Ricorda: se in partita è attivo il Licantropo 🐺🌑, anch'esso appare alla tua vista come "NON È UN LUPO").
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : perspectivePlayer.lupusRole === 'GUARDIA' ? (
                                                <div className="space-y-2.5 bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-xl">
                                                    <div className="text-xs font-black uppercase text-emerald-300">
                                                        🛡️ Ronda della Guardia — Scegli chi difendere dall'attacco dei Lupi:
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {gameState.players
                                                            .filter(pl => pl.isAlive)
                                                            .map(target => {
                                                                const isProtected = gameState.lupusState.guardTargetId === target.id;
                                                                return (
                                                                    <button
                                                                        key={target.id}
                                                                        onClick={() =>
                                                                            sendActionToHost({
                                                                                type: 'LUPUS_GUARD_PROTECT',
                                                                                playerId: perspectivePlayer.id,
                                                                                targetId: target.id
                                                                            })
                                                                        }
                                                                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                                                                            isProtected
                                                                                ? 'bg-emerald-600 text-white border-emerald-300 font-black'
                                                                                : 'bg-stone-900 text-emerald-100 border-stone-700 hover:bg-stone-800'
                                                                        }`}
                                                                    >
                                                                        🛡️ Difendi {target.name} {isProtected ? '✓' : ''}
                                                                    </button>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 space-y-1">
                                                    <div className="text-2xl">😴</div>
                                                    <div className="text-xs font-bold text-amber-200">
                                                        Il tuo personaggio dorme durante la notte...
                                                    </div>
                                                    <p className="text-[11px] text-amber-200/60">
                                                        Attendi l'alba per partecipare alla Votazione Generale del Giorno!
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(lupusSubPhase === 'DAY_DISCUSSION' || lupusSubPhase === 'DAY_BALLOT') && (
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-800/40 pb-2">
                                                <div>
                                                    <h4 className="text-sm sm:text-base font-rustic font-black text-amber-400">
                                                        ⚖️ {lupusSubPhase === 'DAY_BALLOT' ? 'BALLOTTAGGIO DECISIVO DEL VILLAGGIO' : 'TABELLONE DELLA VOTAZIONE GENERALE'}
                                                    </h4>
                                                    <p className="text-[11px] text-amber-200/75">
                                                        {lupusSubPhase === 'DAY_BALLOT'
                                                            ? 'Parità nel primo scrutinio! Votate chi eliminare tra i candidati finiti al ballottaggio:'
                                                            : 'Ogni giocatore vivo vota chi mandare al rogo oggi (attenzione al Matto 🤪!):'}
                                                    </p>
                                                </div>

                                                {isHost && (
                                                    <button
                                                        onClick={() => sendActionToHost({ type: 'LUPUS_FORCE_RESOLVE_DAY' })}
                                                        className="bg-red-700 hover:bg-red-600 text-white font-black px-3 py-1.5 rounded-xl text-xs border border-red-400"
                                                    >
                                                        🔥 Chiudi Urne e Applica Verdetto
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-1">
                                                {gameState.players
                                                    .filter(pl => {
                                                        if (!pl.isAlive) return false;
                                                        if (lupusSubPhase === 'DAY_BALLOT') {
                                                            return (gameState.lupusState.ballotCandidates || []).includes(pl.id);
                                                        }
                                                        return true;
                                                    })
                                                    .map(candidate => {
                                                        const votersForCandidate = Object.entries(gameState.lupusState.dayVotes || {})
                                                            .filter(([, targetId]) => targetId === candidate.id)
                                                            .map(([voterId]) => gameState.players.find(p => p.id === voterId)?.name)
                                                            .filter(Boolean);

                                                        const myVotedTarget = gameState.lupusState.dayVotes?.[perspectivePlayer.id];
                                                        const isMyChoice = myVotedTarget === candidate.id;

                                                        return (
                                                            <div
                                                                key={candidate.id}
                                                                className={`p-2.5 rounded-xl border flex flex-col justify-between transition ${
                                                                    isMyChoice
                                                                        ? 'bg-red-950/80 border-red-400 ring-2 ring-red-400/40'
                                                                        : 'bg-stone-900/90 border-stone-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div>
                                                                        <span className="font-bold text-xs text-white">{candidate.name}</span>
                                                                        <span className="ml-2 bg-red-600/30 border border-red-500/40 text-red-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                                            {votersForCandidate.length} voti
                                                                        </span>
                                                                    </div>

                                                                    {perspectivePlayer.isAlive && (
                                                                        <button
                                                                            onClick={() =>
                                                                                sendActionToHost({
                                                                                    type: 'LUPUS_DAY_VOTE',
                                                                                    playerId: perspectivePlayer.id,
                                                                                    targetId: candidate.id
                                                                                })
                                                                            }
                                                                            className={`px-3 py-1 rounded-lg text-[11px] font-black transition ${
                                                                                isMyChoice
                                                                                    ? 'bg-red-500 text-white'
                                                                                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                                                                            }`}
                                                                        >
                                                                            {isMyChoice ? '✓ Votato' : '🔥 Vota'}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="text-[10px] text-amber-200/75 mt-1.5">
                                                                    {votersForCandidate.length > 0
                                                                        ? `Accusato da: ${votersForCandidate.join(', ')}`
                                                                        : 'Nessun voto ricevuto finora'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800 text-xs">
                                                {perspectivePlayer.isAlive && (
                                                    <button
                                                        onClick={() =>
                                                            sendActionToHost({
                                                                type: 'LUPUS_DAY_VOTE',
                                                                playerId: perspectivePlayer.id,
                                                                targetId: 'SKIP'
                                                            })
                                                        }
                                                        className={`px-3 py-1.5 rounded-xl font-bold border ${
                                                            gameState.lupusState.dayVotes?.[perspectivePlayer.id] === 'SKIP'
                                                                ? 'bg-stone-700 text-white border-amber-400'
                                                                : 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'
                                                        }`}
                                                    >
                                                        🏳️ Astieniti
                                                    </button>
                                                )}

                                                <div className="text-[11px] text-amber-200/80">
                                                    Hanno votato:{' '}
                                                    <strong>
                                                        {Object.keys(gameState.lupusState.dayVotes || {}).length} /{' '}
                                                        {gameState.players.filter(p => p.isAlive).length}
                                                    </strong>{' '}
                                                    vivi
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {lupusSubPhase === 'GAME_OVER' && (
                                        <div className="space-y-3 text-center py-3">
                                            <div className="text-lg font-rustic font-black text-amber-400">
                                                {gameState.lupusState.winnerBanner}
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {gameState.players.map(pl => {
                                                    const rInfo = LUPUS_ROLES_INFO[pl.lupusRole] || LUPUS_ROLES_INFO.CONTADINO;
                                                    return (
                                                        <span
                                                            key={pl.id}
                                                            className="bg-stone-900 border border-amber-600/40 px-3 py-1 rounded-xl text-xs font-bold"
                                                        >
                                                            {pl.name}: {rInfo.icon} {rInfo.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 border-b border-amber-800/40 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-200/80">
                                    Postazione di: <strong className="text-amber-400 text-sm">{perspectivePlayer.name || myName}</strong>
                                </span>
                                {isMyTurn && (
                                    <span className="bg-amber-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                                        È IL TUO TURNO!
                                    </span>
                                )}
                            </div>

                            {gameState.gameId === 'SETTE_MEZZO' && perspectivePlayer.cards?.some(c => c.isMatta) && (
                                <div className="flex flex-wrap items-center gap-1 bg-amber-950/90 border border-amber-400 px-2.5 py-1 rounded-xl">
                                    <span className="text-[10px] font-black text-amber-300 mr-1">☀️ VALORE RE DI DENARI (MATTA):</span>
                                    {['AUTO', 1, 2, 3, 4, 5, 6, 7, 0.5].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => sendActionToHost({ type: 'SET_MATTA_VALUE', playerId: perspectivePlayer.id, value: val })}
                                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                                perspectivePlayer.mattaValue === val ? 'bg-amber-400 text-black' : 'bg-stone-800 text-amber-200'
                                            }`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                {perspectivePlayer.cards && perspectivePlayer.cards.length > 3 && (
                                    <>
                                        <button
                                            onClick={() => sendActionToHost({ type: 'SORT_HAND', playerId: perspectivePlayer.id, mode: 'VALUE' })}
                                            className="bg-stone-900 hover:bg-stone-800 text-amber-200 border border-stone-700 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                        >
                                            🔢 Ordina Valore
                                        </button>
                                        <button
                                            onClick={() => sendActionToHost({ type: 'SORT_HAND', playerId: perspectivePlayer.id, mode: 'SUIT' })}
                                            className="bg-stone-900 hover:bg-stone-800 text-amber-200 border border-stone-700 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                        >
                                            ♠️ Ordina Seme
                                        </button>
                                    </>
                                )}
                                {perspectivePlayer.cards && perspectivePlayer.cards.length > 0 && (
                                    <button
                                        onClick={() => sendActionToHost({ type: 'TOGGLE_SHOW_CARDS', playerId: perspectivePlayer.id })}
                                        className={`px-3 py-1 rounded-lg text-[11px] font-black border transition ${
                                            perspectivePlayer.showCards
                                                ? 'bg-amber-400 text-black border-amber-200'
                                                : 'bg-stone-900 hover:bg-stone-800 text-amber-200 border-amber-700/50'
                                        }`}
                                    >
                                        {perspectivePlayer.showCards ? '🙈 Copri Carte' : '👁️ Gira / Mostra Carte'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 my-2 min-h-[96px] bg-stone-950/70 p-3 rounded-xl border border-amber-900/40">
                            {perspectivePlayer.cards && perspectivePlayer.cards.length > 0 ? (
                                perspectivePlayer.cards.map((card, idx) => {
                                    const isSelected = selectedHandIndices.includes(idx);
                                    const mustFollowLeadSuit =
                                        gameState.gameId === 'TRESSETTE' &&
                                        gameState.trickCards.length > 0 &&
                                        perspectivePlayer.cards.some(c => c.suit === gameState.leadSuit);
                                    const isDisabledBySuit = mustFollowLeadSuit && card.suit !== gameState.leadSuit;

                                    let cardBadge = null;
                                    if (isSelected) cardBadge = gameState.phase === 'DRAW' ? 'CAMBIA' : 'SELEZ.';
                                    else if (mustFollowLeadSuit && card.suit === gameState.leadSuit) cardBadge = 'SEME!';
                                    else if (gameState.gameId === 'BURRACO' && card.isPinella) cardBadge = 'PINELLA';

                                    return (
                                        <PlayingCard
                                            key={card.uid || idx}
                                            card={card}
                                            size="md"
                                            selected={isSelected}
                                            disabled={isDisabledBySuit}
                                            badge={cardBadge}
                                            onClick={() => {
                                                if (gameState.gameId === 'SCOPA' && isMyTurn) {
                                                    sendActionToHost({
                                                        type: 'SCOPA_PLAY',
                                                        playerId: perspectivePlayer.id,
                                                        cardIndex: idx,
                                                        selectedTableUids: selectedTableCardIds
                                                    });
                                                    setSelectedTableCardIds([]);
                                                } else if ((gameState.gameId === 'BRISCOLA' || gameState.gameId === 'TRESSETTE') && isMyTurn) {
                                                    sendActionToHost({ type: 'TRICK_PLAY', playerId: perspectivePlayer.id, cardIndex: idx });
                                                } else if (gameState.gameId === 'ZOMPACAVALLO' && isMyTurn) {
                                                    sendActionToHost({ type: 'ZOMPA_PLAY', playerId: perspectivePlayer.id, cardIndex: idx });
                                                } else {
                                                    if (isSelected) {
                                                        setSelectedHandIndices(selectedHandIndices.filter(i => i !== idx));
                                                    } else {
                                                        setSelectedHandIndices([...selectedHandIndices, idx]);
                                                    }
                                                }
                                            }}
                                        />
                                    );
                                })
                            ) : (
                                <div className="text-xs text-amber-200/50 italic py-4">
                                    {gameState.players.length < 2
                                        ? 'In attesa che almeno un amico entri nella stanza...'
                                        : 'Premi "🔄 DAI LE CARTE" in alto per distribuire la nuova mano!'}
                                </div>
                            )}
                        </div>

                        {currentGameMeta.category === 'POKER' && (
                            gameState.phase === 'DRAW' ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-purple-950/60 border border-purple-400/40 p-3 rounded-xl">
                                    <span className="text-xs text-purple-200">
                                        <strong>Fase Cambio Carte (Poker Italiano):</strong> Tocca le tue carte sopra (max 4) e conferma.
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={!isMyTurn}
                                            onClick={() => sendActionToHost({ type: 'POKER_DRAW', playerId: perspectivePlayer.id, indices: [] })}
                                            className="bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs"
                                        >
                                            ✋ SERVITO (0 Carte)
                                        </button>
                                        <button
                                            disabled={!isMyTurn || selectedHandIndices.length === 0}
                                            onClick={() => {
                                                sendActionToHost({ type: 'POKER_DRAW', playerId: perspectivePlayer.id, indices: selectedHandIndices });
                                                setSelectedHandIndices([]);
                                            }}
                                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black px-5 py-2 rounded-xl text-xs"
                                        >
                                            🔄 CAMBIA {selectedHandIndices.length} CARTE
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            type="number"
                                            step="0.10"
                                            placeholder="Importo €..."
                                            value={betInput}
                                            onChange={(e) => setBetInput(e.target.value)}
                                            className="flex-1 min-w-[110px] bg-stone-950 border border-amber-700/60 rounded-xl px-3 py-2 text-white font-mono-num text-sm outline-none"
                                        />
                                        <button
                                            onClick={() => setBetInput(String(roundCents(amountToCall + gameState.bigBlind)))}
                                            className="bg-stone-800 hover:bg-stone-700 text-amber-200 px-3 py-2 rounded-xl font-mono-num text-xs font-bold"
                                        >
                                            +{formatMoney(gameState.bigBlind)}
                                        </button>
                                        <button
                                            onClick={() => setBetInput(String(roundCents(perspectivePlayer.chips || 0)))}
                                            className="bg-amber-900/80 hover:bg-amber-800 text-amber-200 px-3 py-2 rounded-xl font-mono-num text-xs font-bold"
                                        >
                                            ALL-IN
                                        </button>
                                        <button
                                            disabled={!isMyTurn}
                                            onClick={() => {
                                                sendActionToHost({ type: 'POKER_BET', playerId: perspectivePlayer.id, amount: betInput });
                                                setBetInput('');
                                            }}
                                            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black px-4 py-2 rounded-xl text-xs uppercase"
                                        >
                                            Punta / Rilancia
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            disabled={!isMyTurn}
                                            onClick={() => sendActionToHost({ type: 'POKER_FOLD', playerId: perspectivePlayer.id })}
                                            className="bg-red-900/80 hover:bg-red-800 disabled:opacity-40 text-red-100 rounded-xl py-2.5 font-black text-xs sm:text-sm border border-red-700"
                                        >
                                            FOLD (PASSA)
                                        </button>
                                        {canCheck ? (
                                            <button
                                                disabled={!isMyTurn}
                                                onClick={() => sendActionToHost({ type: 'POKER_BET', playerId: perspectivePlayer.id, amount: 0 })}
                                                className="bg-sky-900/80 hover:bg-sky-800 disabled:opacity-40 text-sky-100 rounded-xl py-2.5 font-black text-xs sm:text-sm border border-sky-700"
                                            >
                                                CHECK (BUSSO)
                                            </button>
                                        ) : (
                                            <button
                                                disabled={!isMyTurn}
                                                onClick={() => sendActionToHost({ type: 'POKER_BET', playerId: perspectivePlayer.id, amount: amountToCall })}
                                                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl py-2.5 font-black text-xs sm:text-sm border border-emerald-500"
                                            >
                                                VEDI ({formatMoney(amountToCall)})
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        )}

                        {(gameState.gameId === 'SETTE_MEZZO' || gameState.gameId === 'BLACKJACK') && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    disabled={!isMyTurn || perspectivePlayer.isBusted}
                                    onClick={() => sendActionToHost({ type: 'BANK_HIT', playerId: perspectivePlayer.id })}
                                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black py-3 rounded-xl text-sm"
                                >
                                    ➕ CHIEDI CARTA
                                </button>
                                <button
                                    disabled={!isMyTurn}
                                    onClick={() => sendActionToHost({ type: 'BANK_STAND', playerId: perspectivePlayer.id })}
                                    className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm"
                                >
                                    ✋ STAI (CONFERMA PUNTO)
                                </button>
                            </div>
                        )}

                        {['SCALA40', 'MACHIAVELLI', 'BURRACO', 'RAMINO'].includes(gameState.gameId) && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        disabled={!isMyTurn}
                                        onClick={() => sendActionToHost({ type: 'RUMMY_DRAW_DECK', playerId: perspectivePlayer.id })}
                                        className="bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-200 border border-amber-600/40 px-3 py-2 rounded-xl text-xs font-bold"
                                    >
                                        🎴 Pesca da Tallone
                                    </button>
                                    <button
                                        disabled={!isMyTurn || gameState.discardPile.length === 0}
                                        onClick={() => sendActionToHost({ type: 'RUMMY_DRAW_DISCARD', playerId: perspectivePlayer.id })}
                                        className="bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-emerald-300 border border-emerald-600/40 px-3 py-2 rounded-xl text-xs font-bold"
                                    >
                                        📥 {gameState.gameId === 'BURRACO' ? 'Raccogli Scarti' : 'Pesca Scarto'}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        disabled={!isMyTurn || selectedHandIndices.length < 3}
                                        onClick={() => {
                                            sendActionToHost({
                                                type: 'RUMMY_MELD',
                                                playerId: perspectivePlayer.id,
                                                indices: selectedHandIndices
                                            });
                                            setSelectedHandIndices([]);
                                        }}
                                        className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-black px-4 py-2 rounded-xl text-xs"
                                    >
                                        ➕ Cala Combinazione ({selectedHandIndices.length})
                                    </button>

                                    <button
                                        disabled={!isMyTurn || selectedHandIndices.length !== 1}
                                        onClick={() => {
                                            sendActionToHost({
                                                type: 'RUMMY_DISCARD',
                                                playerId: perspectivePlayer.id,
                                                cardIndex: selectedHandIndices[0]
                                            });
                                            setSelectedHandIndices([]);
                                        }}
                                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black px-4 py-2 rounded-xl text-xs"
                                    >
                                        📤 Scarta Carta Selezionata e Passa
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showManageModal && (
                <ManageModal
                    gameState={gameState}
                    isHost={isHost}
                    myPeerId={myPeerId}
                    currentGameMeta={currentGameMeta}
                    getStat={getStat}
                    onClose={() => setShowManageModal(false)}
                    onKick={onKick}
                    onRebuy={(playerId) => sendActionToHost({ type: 'REBUY_PLAYER', playerId })}
                    onUpdateLupusConfig={onUpdateLupusConfig}
                    onSwitchGame={onStartHand}
                    onBackToLobby={onBackToLobby}
                />
            )}
        </div>
    );
}
