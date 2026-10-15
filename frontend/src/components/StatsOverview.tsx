import React from 'react';
import { ShieldCheck, Lock, Award, FileCode2, ExternalLink } from 'lucide-react';
import { formatGen, formatAddress } from '../utils/formatters';
import { ProtocolStats } from '../config/genlayer';

interface StatsOverviewProps {
  stats: ProtocolStats;
  contractAddress: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, contractAddress }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Escrow Locked */}
      <div className="relative overflow-hidden bg-[#0F172A] border border-cyan-500/20 rounded-2xl p-5 shadow-lg group hover:border-cyan-500/40 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-cyan-400 font-semibold tracking-wider">
            Total Bounty Escrow
          </span>
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            {formatGen(stats.total_bounty_locked)}
          </span>
          <span className="text-xs font-mono text-cyan-400 font-medium">GEN</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-mono">
          Locked in GenLayer Intelligent Escrow
        </p>
      </div>

      {/* Total Bounties Created */}
      <div className="relative overflow-hidden bg-[#0F172A] border border-emerald-500/20 rounded-2xl p-5 shadow-lg group hover:border-emerald-500/40 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
            Audits & Programs
          </span>
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
            <FileCode2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            {stats.total_bounties}
          </span>
          <span className="text-xs font-mono text-slate-400">Cases</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-mono">
          Smart contract scopes registered
        </p>
      </div>

      {/* Audits Settled */}
      <div className="relative overflow-hidden bg-[#0F172A] border border-amber-500/20 rounded-2xl p-5 shadow-lg group hover:border-amber-500/40 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
            Settled & Disbursed
          </span>
          <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            {stats.total_audits_settled}
          </span>
          <span className="text-xs font-mono text-amber-400 font-medium">Settled</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-mono">
          Adjudicated via AI Consensus
        </p>
      </div>

      {/* Contract Verification State */}
      <div className="relative overflow-hidden bg-[#0F172A] border border-indigo-500/20 rounded-2xl p-5 shadow-lg group hover:border-indigo-500/40 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase text-indigo-400 font-semibold tracking-wider">
            Network Status
          </span>
          <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-mono font-bold text-white tracking-tight truncate">
            {formatAddress(contractAddress, 5)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified On-Chain
          </span>
          <a
            href={`https://studio.genlayer.com`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
          >
            Studio <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
