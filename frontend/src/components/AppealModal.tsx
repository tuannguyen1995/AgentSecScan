import React, { useState } from 'react';
import { Scale, AlertCircle, Loader2, Link2, DollarSign } from 'lucide-react';
import { appealVerdict, AuditBountyData } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: AuditBountyData | null;
  contractAddress: string;
  account: string;
  onSuccess: () => void;
}

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  bounty,
  contractAddress,
  account,
  onSuccess,
}) => {
  const [reason, setReason] = useState('Foundry test fork trace confirms execution of flashloan without slippage.');
  const [supplementalUrl, setSupplementalUrl] = useState('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/appellate_trace.txt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !bounty) return null;

  // Calculate 10% dispute bond in wei
  const escrowWei = BigInt(bounty.escrow_amount || '0');
  let requiredBondWei = (escrowWei * 10n) / 100n;
  if (requiredBondWei === 0n) requiredBondWei = 1n;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!account) {
      setError('Please connect your MetaMask wallet first.');
      return;
    }

    const accLower = account.toLowerCase();
    const isProtocol = accLower === bounty.protocol_team.toLowerCase();
    const isResearcher = accLower === bounty.security_researcher.toLowerCase();

    if (!isProtocol && !isResearcher) {
      setError('Role Violation: Only protocol team or security researcher can file an appeal.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 10) {
      setError('Detailed dispute justification (>= 10 chars) is required.');
      return;
    }

    if (!supplementalUrl.startsWith('http://') && !supplementalUrl.startsWith('https://')) {
      setError('Valid public supplemental trace URL (http/https) required.');
      return;
    }

    try {
      setLoading(true);
      await appealVerdict(
        contractAddress,
        account,
        bounty.bounty_id,
        reason.trim(),
        supplementalUrl.trim(),
        requiredBondWei
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Appeal failed:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0F172A] border border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                File Appellate Dispute
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Bounty #{bounty.bounty_id} • 24-Block Cooling-Off Court Window
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

        {/* Bond Requirement Warning */}
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-300 font-semibold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Required 10% Dispute Bond:
            </span>
            <span className="text-purple-400 font-bold text-sm">
              {formatGen(requiredBondWei.toString())} GEN
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
            Filing an appeal locks this 10% bond. If the Supreme Appellate Council upholds your claim, the bond is returned in full. If the appeal is dismissed, the bond is forfeited to the counterparty.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300">
              Dispute Justification & Specific Errors in Initial Verdict
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the technical rationale and why the initial verdict should be overturned..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Supplemental Execution Trace / PoC URL</span>
              <span className="text-[10px] text-slate-400">Foundry/Hardhat Test Log</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={supplementalUrl}
                onChange={(e) => setSupplementalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-400 transition-colors"
              />
              <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Staking Bond & Submitting Appeal...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Stake {formatGen(requiredBondWei.toString())} GEN & File Appeal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
