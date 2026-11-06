import React from 'react';
import { GAMES_CATALOG } from '../constants/gamesCatalog.js';

const CATEGORY_GROUPS = [
    { cat: 'RUOLI', label: '🐺 Giochi di Ruolo (1)' },
    { cat: 'POKER', label: '🎰 Poker Club (2)' },
    { cat: 'NAPOLETANE', label: '☀️ Carte Napoletane (5)' },
    { cat: 'FRANCESI', label: '♠️ Carte Francesi (5)' }
];

export default function RulesModal({ show, onClose, selectedGameId, onSelectGame, currentGameId, canSwitchGame, onSwitchGame }) {
    if (!show) return null;
    const selectedRuleGame = GAMES_CATALOG[selectedGameId] || GAMES_CATALOG.SCOPA;

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50">
            <div className="wood-panel rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border-2 border-amber-600/60">
                <div className="bg-amber-950/80 px-5 py-4 border-b border-amber-700/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-rustic font-black text-amber-400">
                            📖 Il Grande Libro delle Regole (13 Giochi)
                        </h2>
                        <p className="text-xs text-amber-200/70">
                            Seleziona un gioco qui sotto per leggere le regole complete e come giocarlo sull'app.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-amber-900/80 hover:bg-amber-800 text-amber-200 w-9 h-9 rounded-xl font-black text-lg border border-amber-600/40"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    <div className="md:w-64 bg-stone-950/70 p-3 overflow-y-auto border-b md:border-b-0 md:border-r border-amber-800/40 space-y-3 shrink-0">
                        {CATEGORY_GROUPS.map(group => (
                            <div key={group.cat}>
                                <div className="text-[10px] font-black uppercase tracking-wider text-amber-500/80 mb-1 px-1">
                                    {group.label}
                                </div>
                                <div className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
                                    {Object.values(GAMES_CATALOG)
                                        .filter(g => g.category === group.cat)
                                        .map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => onSelectGame(g.id)}
                                                className={`px-3 py-2 rounded-xl text-left text-xs font-bold whitespace-nowrap md:whitespace-normal transition border ${
                                                    selectedGameId === g.id
                                                        ? 'bg-amber-500 text-black border-amber-300 shadow'
                                                        : 'bg-stone-900/90 text-amber-100/80 border-stone-800 hover:bg-stone-800'
                                                }`}
                                            >
                                                <div>{g.name}</div>
                                                <div className="text-[10px] opacity-75">{g.badge}</div>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-stone-900/50 text-amber-100">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-700/40 pb-3">
                            <div>
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    {selectedRuleGame.badge}
                                </span>
                                <h3 className="text-2xl font-rustic font-black text-amber-400 mt-1">
                                    {selectedRuleGame.name}
                                </h3>
                                <p className="text-xs text-amber-200/80">{selectedRuleGame.shortDesc}</p>
                            </div>

                            {canSwitchGame && currentGameId !== selectedRuleGame.id && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onSwitchGame(selectedRuleGame.id);
                                    }}
                                    className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs px-4 py-2 rounded-xl shadow hover:from-amber-400"
                                >
                                    ▶️ Passa a {selectedRuleGame.name}
                                </button>
                            )}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="bg-stone-950/80 p-3.5 rounded-xl border border-amber-800/40">
                                <div className="text-xs font-black uppercase text-amber-400 mb-1">🃏 Carte / Ruoli</div>
                                <p className="text-xs leading-relaxed text-amber-100/90">{selectedRuleGame.rules.deck}</p>
                            </div>
                            <div className="bg-stone-950/80 p-3.5 rounded-xl border border-amber-800/40">
                                <div className="text-xs font-black uppercase text-emerald-400 mb-1">🎯 Obiettivo</div>
                                <p className="text-xs leading-relaxed whitespace-pre-line text-amber-100/90">{selectedRuleGame.rules.goal}</p>
                            </div>
                        </div>

                        <div className="bg-stone-950/80 p-4 rounded-xl border border-amber-800/40">
                            <div className="text-xs font-black uppercase text-yellow-400 mb-1.5">⚖️ Regole Speciali & Gerarchia</div>
                            <p className="text-xs leading-relaxed whitespace-pre-line text-amber-100/90">
                                {selectedRuleGame.rules.values}
                            </p>
                        </div>

                        <div className="bg-stone-950/80 p-4 rounded-xl border border-amber-800/40">
                            <div className="text-xs font-black uppercase text-sky-400 mb-1.5">🔄 Svolgimento del Turno</div>
                            <p className="text-xs leading-relaxed whitespace-pre-line text-amber-100/90">
                                {selectedRuleGame.rules.turn}
                            </p>
                        </div>

                        <div className="bg-amber-950/60 p-4 rounded-xl border border-amber-500/40">
                            <div className="text-xs font-black uppercase text-amber-300 mb-1.5">📱 Guida Rapida all'Interfaccia</div>
                            <p className="text-xs leading-relaxed whitespace-pre-line text-amber-100">
                                {selectedRuleGame.rules.appGuide}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-stone-950 px-5 py-3 border-t border-amber-800/40 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-2 rounded-xl text-xs"
                    >
                        Chiudi Regolamento
                    </button>
                </div>
            </div>
        </div>
    );
}
