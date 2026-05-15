import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowRight, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface Etf {
    ticker: string;
    name: string;
    sector: string;
}

interface SectorDrilldownProps {
    sector: { symbol: string; name: string; score: number; phase: string };
    etfs: Etf[];
    onClose: () => void;
}

export default function SectorDrilldown({ sector, etfs, onClose }: SectorDrilldownProps) {
    const sectorEtfs = etfs.filter(e => e.sector.toLowerCase().includes(sector.name.split(' ')[0].toLowerCase())).slice(0, 5);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-[#0A0A0A] border border-[#2A2A2A] w-full max-w-2xl rounded-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-[#141414] p-6 border-b border-[#2A2A2A] flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Sector Intelligence</span>
                            <div className="w-1 h-1 rounded-full bg-green-500"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">{sector.name} ({sector.symbol})</h2>
                        <p className="text-xs text-[#666]">Desglose de activos institucionales y métricas de liderazgo.</p>
                    </div>
                    <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-4 rounded-sm">
                            <span className="text-[10px] font-bold text-[#444] uppercase mb-1 block">Rotation Score</span>
                            <span className="text-2xl font-mono font-bold text-orange-500">{sector.score}</span>
                        </div>
                        <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-4 rounded-sm">
                            <span className="text-[10px] font-bold text-[#444] uppercase mb-1 block">Current Phase</span>
                            <span className="text-lg font-bold text-white uppercase">{sector.phase}</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Principales ETFs en el Sector
                        </h3>
                        <div className="space-y-2">
                            {sectorEtfs.length > 0 ? (
                                sectorEtfs.map((etf, i) => (
                                    <div key={etf.ticker} className="flex items-center justify-between p-3 bg-[#0F0F0F] border border-[#1A1A1A] hover:border-orange-500/50 transition-all rounded-sm cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-mono text-[#333]">0{i + 1}</span>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors">{etf.ticker}</p>
                                                <p className="text-[10px] text-[#444]">{etf.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <ArrowRight className="w-4 h-4 text-[#222]" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-[#444] italic">No hay ETFs específicos registrados para este sector.</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#1A1A1A]">
                         <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-sm text-xs uppercase tracking-widest transition-all">
                             Generar Reporte IA del Sector
                         </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
