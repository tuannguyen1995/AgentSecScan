import React from 'react';
import {
  Wallet,
  PlusCircle,
  Coins,
  RefreshCw,
  ExternalLink,
  Shield,
  Zap,
  Lock,
  Award,
  AlertTriangle
} from 'lucide-react';
import { formatAddress, formatGen } from '../utils/formatters';
import { STUDIONET_CHAIN_ID, ensureStudionet } from '../config/genlayer';

interface HeaderBarProps {
  account: string;
  balance: string;
  claimableBalance: string;
  totalLocked: string;
  settledCount: number;
  totalBounties: number;
  onConnect: () => void;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onClaimPayout: () => void;
  isConnecting: boolean;
  isRefreshing: boolean;
  isClaiming: boolean;
  networkCorrect: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  account,
  balance,
  claimableBalance,
  totalLocked,
  settledCount,
  totalBounties,
  onConnect,
  onRefresh,
  onOpenCreate,
  onClaimPayout,
  isConnecting,
  isRefreshing,
  isClaiming,
  networkCorrect,
}) => {
  const hasClaimable = BigInt(claimableBalance || '0') > 0n;

  const handleSwitchNetwork = async () => {
    try {
      await ensureStudionet();
    } catch (e: any) {
      alert(`Network switch error: ${e.message}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-[#070A12]/95 backdrop-blur-xl border-b border-cyan-900/30">
      {/* Real-time Ticker Tape Marquee */}
      <div className="bg-[#04060C] border-b border-slate-900 px-4 py-1.5 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-6 text-[10px] font-mono text-slate-400 animate-marquee inline-flex">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            GENLAYER ON-CHAIN COURT ACTIVE
          </span>
          <span>•</span>
          <span>CONSENSUS: gl.nondet.web.render + gl.vm.run_nondet AST EVALUATION</span>
          <span>•</span>
          <span className="text-emerald-400">ESCROW ESCROW LOCK: {formatGen(totalLocked)} GEN</span>
          <span>•</span>
          <span>IMMUNEFI / OWASP TAXONOMY ENFORCED</span>
          <span>•</span>
          <span className="text-amber-400">DISPUTE COOLING WINDOW: 24 BLOCKS (~72s) WITH 10% BOND</span>
          <span>•</span>
          <span className="text-purple-400">CANARY DEFENSE: CANARY_AGENT_SEC_SCAN_V1 ARMORED</span>
        </div>
      </div>

      {/* Main Command Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between py-3 gap-4">
        {/* Executive Stats Summary Badges */}
        <div className="hidden md:flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950 border border-cyan-500/30 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <div className="text-xs font-mono">
              <span className="text-slate-400 text-[10px] block leading-none">Escrow TVL</span>
              <strong className="text-white font-bold">{formatGen(totalLocked)} GEN</strong>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <div className="text-xs font-mono">
              <span className="text-slate-400 text-[10px] block leading-none">Settled Audits</span>
              <strong className="text-emerald-400 font-bold">{settledCount} Cases</strong>
            </div>
          </div>
        </div>

        {/* Action Controls & Wallet */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh On-Chain State"
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Pull Payout Quick Action if claimable balance exists */}
          {hasClaimable && (
            <button
              onClick={onClaimPayout}
              disabled={isClaiming}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>Withdraw {formatGen(claimableBalance)} GEN</span>
            </button>
          )}

          {/* New Bounty CTA Button */}
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Launch New Bounty</span>
            <span className="sm:hidden">Launch</span>
          </button>

          {/* Network Switcher Pill if incorrect */}
          {!networkCorrect && (
            <button
              onClick={handleSwitchNetwork}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-300 text-xs font-mono font-bold animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Switch Chain</span>
            </button>
          )}

          {/* Wallet Connector */}
          {account ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-sm">
              <div className="text-right">
                <div className="text-xs font-mono text-cyan-400 font-bold leading-tight">
                  {balance} <span className="text-[10px] text-slate-400 font-normal">GEN</span>
                </div>
                <div className="text-[10px] font-mono text-slate-300 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {formatAddress(account)}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/50 text-cyan-300 font-bold text-xs font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"
            >
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
