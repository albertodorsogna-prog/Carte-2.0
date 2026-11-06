import React from 'react';

export default function PlayingCard({ card, hidden = false, size = 'md', selected = false, onClick = null, badge = null, disabled = false }) {
    const sizeClasses = {
        xs: 'w-7 h-10 text-[9px] rounded',
        sm: 'w-11 h-16 text-xs rounded-md',
        md: 'w-14 h-22 sm:w-16 sm:h-24 text-sm rounded-lg',
        lg: 'w-16 h-24 md:w-20 md:h-28 text-base rounded-xl'
    }[size] || 'w-14 h-22 text-sm rounded-lg';

    if (hidden || !card) {
        return (
            <div className={`${sizeClasses} card-back-rustic border border-amber-400/80 flex items-center justify-center select-none card-anim relative`}>
                <div className="w-3/4 h-3/4 border border-amber-300/40 rounded-sm flex items-center justify-center">
                    <span className="text-amber-200/80 text-[9px] font-rustic">⚜️</span>
                </div>
            </div>
        );
    }

    const isNap = card.deckStyle === 'NAP';

    return (
        <div
            onClick={!disabled ? onClick : undefined}
            className={`${sizeClasses} ${isNap ? 'nap-card-bg border-amber-700' : 'bg-white border-slate-300'} ${card.color} border-2 ${
                selected ? 'border-yellow-400 -translate-y-3 ring-2 ring-yellow-400 z-20' : ''
            } ${disabled ? 'opacity-45 cursor-not-allowed' : onClick ? 'cursor-pointer hover:-translate-y-1.5' : ''} shadow-md flex flex-col justify-between p-1.5 select-none transition-all duration-200 card-anim relative`}
        >
            {(badge || card.isSettebello || card.isMatta) && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-black text-[8px] px-1.5 py-0.5 rounded uppercase whitespace-nowrap z-30 border border-black/30">
                    {badge || (card.isSettebello ? '7 BELLO' : card.isMatta ? 'MATTA' : '')}
                </div>
            )}

            <div className="font-black leading-none flex items-center justify-between w-full">
                <span>{card.rank}</span>
                <span className="text-[0.9em]">{card.symbol}</span>
            </div>

            <div className="self-center flex flex-col items-center justify-center my-auto leading-none">
                {isNap ? (
                    <>
                        <span className="text-lg sm:text-2xl">{card.figureIcon || card.symbol}</span>
                        {size !== 'xs' && (
                            <span className="text-[8px] font-bold uppercase tracking-tighter opacity-75 mt-0.5">
                                {card.suitName}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-xl sm:text-2xl">{card.symbol}</span>
                )}
            </div>

            <div className="font-black leading-none self-end rotate-180 hidden sm:flex items-center gap-0.5">
                <span>{card.rank}</span>
            </div>
        </div>
    );
}
