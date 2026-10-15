import React, { useState } from 'react';
import { PlusCircle, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { createAuditBounty } from '../config/genlayer';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: string;
  account: string;
  onSuccess: () => void;
}

export const CreateBountyModal: React.FC<CreateBountyModalProps> = ({
  isOpen,
  onClose,
  contractAddress,
  account,
  onSuccess,
}) => {
  const [scopeRepo, setScopeRepo] = useState('https://github.com/defi-protocol/lending-pool-v2');
  const [durationBlocks, setDurationBlocks] = useState('6000');
  const [escrowGen, setEscrowGen] = useState('0.5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!account) {
      setError('Please connect your MetaMask wallet first.');
      return;
    }

    if (!scopeRepo.trim() || scopeRepo.trim().length < 4) {
      setError('Valid codebase repository/commit scope is required.');
      return;
    }

    const genVal = parseFloat(escrowGen);
    if (isNaN(genVal) || genVal <= 0) {
      setError('Escrow deposit must be greater than 0 GEN.');
      return;
    }

    try {
      setLoading(true);
      await createAuditBounty(
        contractAddress,
        account,
        scopeRepo.trim(),
        parseInt(durationBlocks) || 6000,
        escrowGen.trim()
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create bounty failed:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (repo: string, gen: string) => {
    setScopeRepo(repo);
    setEscrowGen(gen);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0F172A] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                Open Security Audit Bounty
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Deposit GEN into GenLayer Escrow Court for smart contract auditing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
            Quick Scope Presets
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset('https://github.com/defi-protocol/lending-pool-v2', '0.5')}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 font-mono transition-all"
            >
              Lending Pool (0.5 GEN)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('https://github.com/amm-protocol/constant-product-pool', '1.0')}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 font-mono transition-all"
            >
              AMM DEX (1.0 GEN)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('https://github.com/crosschain-bridge/token-bridge-v1', '2.0')}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 font-mono transition-all"
            >
              Bridge (2.0 GEN)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Target Codebase Scope (Repository or Commit URL)</span>
              <span className="text-[10px] text-cyan-400">Public GitHub/GitLab</span>
            </label>
            <input
              type="text"
              required
              value={scopeRepo}
              onChange={(e) => setScopeRepo(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                <span>Coverage Duration (Blocks)</span>
                <span className="text-[10px] text-slate-400">~3s / block</span>
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={durationBlocks}
                onChange={(e) => setDurationBlocks(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <span className="text-[10px] font-mono text-slate-400">
                ≈ {Math.round((parseInt(durationBlocks || '0') * 3) / 3600)} hours
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                <span>Escrow Reward (GEN)</span>
                <span className="text-[10px] text-emerald-400">Locked in contract</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={escrowGen}
                onChange={(e) => setEscrowGen(e.target.value)}
                placeholder="1.0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <span className="text-[10px] font-mono text-slate-400">
                100% Critical | 40% Medium | 0% Spam
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300/90 text-xs font-mono space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Decentralized Escrow Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Upon submission of an audit report & PoC, GenLayer AI Security Jury cross-examines AST exploitability and reproduces the vulnerability before any funds are released. Unfulfilled bounties can be 100% reclaimed by the protocol after expiration.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs font-mono transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Escrow on Studionet...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Deposit {escrowGen} GEN & Launch Bounty</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
