import React, { useState } from 'react';
import { Terminal, Shield, Zap, Info, Loader2 } from 'lucide-react';
import { createAuditBounty } from '../config/genlayer';

interface QuickDemoBarProps {
  contractAddress: string;
  account: string;
  onRefresh: () => void;
}

export const QuickDemoBar: React.FC<QuickDemoBarProps> = ({
  contractAddress,
  account,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);

  const handleQuickCreate = async (repo: string, genAmount: string) => {
    if (!account) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      await createAuditBounty(contractAddress, account, repo, 6000, genAmount);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert(`Launch failed: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0F172A] border border-cyan-500/20 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-display font-bold text-sm text-white">
            Quick Audit War Room Scenarios (1-Click Test)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            For Judges & Builders
          </span>
        </div>
      </div>

      <p className="text-xs font-mono text-slate-400 leading-relaxed">
        Choose a target scenario below to instantly launch an on-chain audit escrow on GenLayer Studionet, then submit PoCs and watch the AI Security Jury evaluate the exploit on-chain:
      </p>

      <div className="flex flex-wrap gap-2.5 pt-1">
        <button
          onClick={() => handleQuickCreate('https://github.com/defi-protocol/lending-pool-v2', '0.2')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 text-xs font-mono text-emerald-300 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-emerald-400" />}
          <span>Launch Lending Pool Bounty (0.2 GEN)</span>
        </button>

        <button
          onClick={() => handleQuickCreate('https://github.com/amm-protocol/constant-product-pool', '0.15')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-cyan-400" />}
          <span>Launch DEX AMM Bounty (0.15 GEN)</span>
        </button>

        <button
          onClick={() => handleQuickCreate('https://github.com/bridge-core/teleport-bridge', '0.1')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-400 text-xs font-mono text-purple-300 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-purple-400" />}
          <span>Launch Cross-chain Bridge Bounty (0.1 GEN)</span>
        </button>
      </div>
    </div>
  );
};
