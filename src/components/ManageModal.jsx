import React from 'react';
import { GAMES_CATALOG } from '../constants/gamesCatalog.js';
import { formatMoney } from '../engine/cardEvaluators.js';

export default function ManageModal({
    gameState,
    isHost,
    myPeerId,
    currentGameMeta,
    getStat,
    onClose,
    onKick,
    onRebuy,
    onUpdateLupusConfig,
    onSwitchGame,
    onBackToLobby
}) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="wood-panel rounded-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-amber-800/40 pb-2">
                    <h3 className="text-lg font-rustic font-black text-amber-400">
                        ⚙️ Gestione Stanza, 13 Giochi & Giocatori
                    </h3>
                    <button onClick={onClose} className="text-amber-300 font-black">✕</button>
                </div>

                <div className="space-y-2">
                    <div className="text-xs font-black uppercase text-amber-400">
                        Giocatori nella Stanza ({gameState.players.length})
                    </div>
                    {gameState.players.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-stone-950 px-3 py-2 rounded-xl border border-stone-800 text-xs">
                            <div>
                                <span className="font-bold text-white">{p.name}</span>
                                {p.id === myPeerId && <span className="ml-2 text-amber-400 text-[10px]">(Tu)</span>}
                                <span className="ml-2 text-amber-300 font-mono-num text-[11px]">{getStat(p)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {isHost && currentGameMeta.category === 'POKER' && (
                                    <button
                                        onClick={() => onRebuy(p.id)}
                                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded font-bold text-[10px]"
                                    >
                                        +{formatMoney(gameState.startChips)}
                                    </button>
                                )}
                                {isHost && p.id !== myPeerId && (
                                    <button
                                        onClick={() => onKick(p.id)}
                                        className="bg-red-700 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg font-black text-[10px]"
                                    >
                                        ❌ Espelli
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {isHost && (
                    <div className="space-y-3 pt-2 border-t border-amber-800/40">
                        <div className="text-xs font-black uppercase text-amber-400">
                            Opzioni Ruoli Lupus in Tabula:
                        </div>
                        <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span>Numero di Lupi Mannari:</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => onUpdateLupusConfig({ wolvesCount: n })}
                                            className={`w-6 h-6 rounded font-black ${
                                                gameState.lupusConfig.wolvesCount === n
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-stone-800 text-amber-200'
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span>🐺🌑 Includi Licantropo (Non visto dal Veggente):</span>
                                <input
                                    type="checkbox"
                                    checked={gameState.lupusConfig.hasLycanthrope}
                                    onChange={(e) => onUpdateLupusConfig({ hasLycanthrope: e.target.checked })}
                                />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span>🤪 Includi Il Matto (Vince se eliminato al rogo):</span>
                                <input
                                    type="checkbox"
                                    checked={gameState.lupusConfig.hasJester}
                                    onChange={(e) => onUpdateLupusConfig({ hasJester: e.target.checked })}
                                />
                            </label>
                        </div>

                        <div className="text-xs font-black uppercase text-amber-400">
                            Cambia Gioco sul Tavolo (13 Giochi Disponibili):
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {Object.values(GAMES_CATALOG).map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => {
                                        onSwitchGame(g.id);
                                        onClose();
                                    }}
                                    className={`p-2 rounded-xl border text-left text-xs font-bold ${
                                        gameState.gameId === g.id
                                            ? 'bg-amber-500 text-black border-amber-300'
                                            : 'bg-stone-950 text-amber-100 border-stone-800 hover:bg-stone-900'
                                    }`}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between pt-3 border-t border-amber-800/40">
                    <button
                        onClick={() => {
                            onClose();
                            onBackToLobby();
                        }}
                        className="text-xs text-red-400 hover:underline font-bold"
                    >
                        ← Torna alla Lobby Iniziale
                    </button>
                    <button onClick={onClose} className="bg-amber-500 text-black px-5 py-1.5 rounded-xl text-xs font-black">
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
}
