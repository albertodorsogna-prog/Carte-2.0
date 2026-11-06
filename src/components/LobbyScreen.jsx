import React from 'react';
import { GAMES_CATALOG } from '../constants/gamesCatalog.js';

const LOBBY_SECTIONS = [
    { cat: 'RUOLI', title: '🐺 Ruoli Segreti & Votazioni del Villaggio' },
    { cat: 'NAPOLETANE', title: '☀️ Carte Napoletane (Mazzo da 40)' },
    { cat: 'FRANCESI', title: '♠️ Carte Francesi / Scala 40 (52 / 108 Carte)' },
    { cat: 'POKER', title: '🎰 Poker Club (Con Fiches e Puntate)' }
];

export default function LobbyScreen({
    savedHostBackup,
    onRestoreBackup,
    onClearBackup,
    myName,
    setMyName,
    joinCodeInput,
    setJoinCodeInput,
    isJoining,
    connectionStatus,
    lobbyError,
    kickedMessage,
    onDismissError,
    onJoin,
    onCreate,
    gameState,
    setGameState,
    currentGameMeta,
    onOpenRules
}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="wood-panel p-6 md:p-8 rounded-3xl w-full max-w-3xl border-2 border-amber-700/60">

                {savedHostBackup && savedHostBackup.state && (
                    <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-2 border-amber-400 p-4 rounded-2xl mb-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                                🛡️ Controllo da Oste Anti-Ricaricamento
                            </div>
                            <div className="text-xs text-amber-100 mt-0.5">
                                Trovata partita in corso nella stanza <strong className="text-yellow-400 font-mono-num">{savedHostBackup.state.roomCode}</strong> ({GAMES_CATALOG[savedHostBackup.state.gameId]?.name} • {savedHostBackup.state.players?.length || 1} giocatori).
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={onRestoreBackup}
                                className="bg-amber-400 hover:bg-amber-300 text-black font-black px-4 py-2 rounded-xl text-xs shadow-lg"
                            >
                                🔄 RIPRISTINA PARTITA
                            </button>
                            <button
                                onClick={onClearBackup}
                                className="bg-stone-800 hover:bg-stone-700 text-amber-200/80 px-2.5 py-2 rounded-xl text-xs font-bold"
                                title="Elimina salvataggio"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-full">
                        🍷 OSTERIA DELLE CARTE, POKER & LUPUS • CLOUD + P2P
                    </span>
                    <button
                        onClick={onOpenRules}
                        className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition"
                    >
                        📖 Foglio delle Regole (13 Giochi)
                    </button>
                </div>

                <h1 className="text-2xl sm:text-4xl font-rustic font-black text-amber-400 tracking-wide">
                    L'Osteria delle Carte & Lupus
                </h1>
                <p className="text-amber-200/70 text-xs sm:text-sm mb-4">
                    Connessione ibrida <strong>Cloud WebSocket + P2P</strong> compatibile con tutte le reti 4G/5G e Wi-Fi.
                </p>

                {(lobbyError || kickedMessage) && (
                    <div className="bg-red-950/90 border-2 border-red-500 text-red-200 px-4 py-3 rounded-xl mb-4 text-xs sm:text-sm font-bold flex items-center justify-between">
                        <span>⚠️ {lobbyError || kickedMessage}</span>
                        <button onClick={onDismissError} className="text-red-300 hover:text-white font-black ml-3">
                            ✕
                        </button>
                    </div>
                )}

                <div className="mb-5">
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-1.5">
                        Il Tuo Nome Unico al Tavolo (Non sono ammessi due nomi uguali)
                    </label>
                    <input
                        type="text"
                        value={myName}
                        onChange={(e) => setMyName(e.target.value)}
                        placeholder="Es. Alberto"
                        className="w-full bg-stone-950 border border-amber-700/60 text-white font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>

                <div className="bg-emerald-950/35 border-2 border-emerald-600/50 p-4 rounded-2xl mb-5">
                    <div className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
                        📲 Hai il Codice di un amico? Entra subito nella sua stanza:
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Inserisci Codice Stanza (es. OSTE1)"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                            className="flex-1 bg-stone-950 border border-emerald-500/60 rounded-xl px-4 py-3 text-white font-mono-num uppercase tracking-widest focus:ring-2 focus:ring-emerald-400 outline-none text-base"
                        />
                        <button
                            disabled={isJoining}
                            onClick={onJoin}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black px-7 py-3 rounded-xl shadow-lg transition active:scale-95 text-sm sm:text-base"
                        >
                            {isJoining ? '⏳ CONNESSIONE...' : '🚀 ENTRA NELLA STANZA'}
                        </button>
                    </div>
                    {isJoining && (
                        <div className="text-xs text-emerald-300 font-semibold mt-2 animate-pulse">
                            🔄 {connectionStatus}
                        </div>
                    )}
                </div>

                <div className="bg-stone-950/80 p-4 rounded-2xl border border-amber-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                            Oppure Crea Tu la Stanza (Scegli uno dei 13 Giochi):
                        </span>
                        <button onClick={onOpenRules} className="text-xs text-amber-400 underline hover:text-amber-300 font-bold">
                            Regole di {currentGameMeta.name} →
                        </button>
                    </div>

                    {LOBBY_SECTIONS.map(section => (
                        <div key={section.cat}>
                            <div className="text-[11px] font-bold text-amber-200/70 mb-1.5">{section.title}</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                {Object.values(GAMES_CATALOG)
                                    .filter(g => g.category === section.cat)
                                    .map(g => (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => setGameState({ ...gameState, gameId: g.id })}
                                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                                                gameState.gameId === g.id
                                                    ? 'bg-amber-500/25 border-amber-400 text-white ring-2 ring-amber-400/40'
                                                    : 'bg-stone-900/90 border-stone-800 text-amber-100/70 hover:bg-stone-800'
                                            }`}
                                        >
                                            <div className="font-bold text-xs leading-tight">{g.name}</div>
                                            <div className="text-[10px] opacity-75 mt-1">{g.badge}</div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    ))}

                    {gameState.gameId === 'LUPUS' && (
                        <div className="bg-indigo-950/40 border border-indigo-500/40 p-3.5 rounded-xl space-y-2.5">
                            <div className="text-xs font-black text-indigo-300 uppercase">
                                🐺 Impostazioni Partita Lupus in Tabula
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-amber-200 font-bold">Numero di Lupi:</span>
                                    {[1, 2, 3, 4].map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() =>
                                                setGameState({
                                                    ...gameState,
                                                    lupusConfig: { ...gameState.lupusConfig, wolvesCount: n }
                                                })
                                            }
                                            className={`w-7 h-7 rounded-lg font-black ${
                                                gameState.lupusConfig.wolvesCount === n
                                                    ? 'bg-red-600 text-white border border-red-300'
                                                    : 'bg-stone-900 text-amber-200 border border-stone-700'
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>

                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-purple-200">
                                    <input
                                        type="checkbox"
                                        checked={gameState.lupusConfig.hasLycanthrope}
                                        onChange={(e) =>
                                            setGameState({
                                                ...gameState,
                                                lupusConfig: { ...gameState.lupusConfig, hasLycanthrope: e.target.checked }
                                            })
                                        }
                                        className="accent-purple-500"
                                    />
                                    🐺🌑 Includi Licantropo (Invisibile al Veggente)
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-yellow-200">
                                    <input
                                        type="checkbox"
                                        checked={gameState.lupusConfig.hasJester}
                                        onChange={(e) =>
                                            setGameState({
                                                ...gameState,
                                                lupusConfig: { ...gameState.lupusConfig, hasJester: e.target.checked }
                                            })
                                        }
                                        className="accent-yellow-400"
                                    />
                                    🤪 Includi Il Matto
                                </label>
                            </div>
                        </div>
                    )}

                    {currentGameMeta.category === 'POKER' && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800">
                            <div>
                                <label className="block text-[10px] text-amber-200/70 mb-1">Buy-In (€)</label>
                                <input
                                    type="number"
                                    step="0.50"
                                    value={gameState.startChips}
                                    onChange={(e) => setGameState({ ...gameState, startChips: parseFloat(e.target.value) || 10 })}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-amber-200/70 mb-1">Piccolo Buio (€)</label>
                                <input
                                    type="number"
                                    step="0.05"
                                    value={gameState.smallBlind}
                                    onChange={(e) => setGameState({ ...gameState, smallBlind: parseFloat(e.target.value) || 0.10 })}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-amber-200/70 mb-1">Grande Buio (€)</label>
                                <input
                                    type="number"
                                    step="0.05"
                                    value={gameState.bigBlind}
                                    onChange={(e) => setGameState({ ...gameState, bigBlind: parseFloat(e.target.value) || 0.20 })}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-white"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onCreate}
                        className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black py-3.5 rounded-xl shadow-lg transform transition active:scale-95 text-sm sm:text-base"
                    >
                        🍷 CREA NUOVA STANZA DA OSTE
                    </button>
                </div>
            </div>
        </div>
    );
}
