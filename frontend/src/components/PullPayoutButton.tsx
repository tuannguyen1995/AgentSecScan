import React, { useState } from 'react';
import { Coins, Loader2, CheckCircle2 } from 'lucide-react';
import { claimPayout } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface PullPayoutButtonProps {
  contractAddress: string;
  account: string;
  claimableBalance: string;
  onSuccess: () => void;
}

export const PullPayoutButton: React.FC<PullPayoutButtonProps> = ({
  contractAddress,
  account,
  claimableBalance,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const hasBalance = BigInt(claimableBalance || '0') > 0n;

  if (!hasBalance && !claimed) return null;

  const handleClaim = async () => {
    if (!account) return;
    try {
      setLoading(true);
      await claimPayout(contractAddress, account);
      setClaimed(true);
      onSuccess();
    } catch (err: any) {
      console.error('Claim payout failed:', err);
      alert(`Claim failed: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <span>Pull-Payment Safety Buffer Available</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700">
              Buffered Balance
            </span>
          </h4>
          <p className="text-xs font-mono text-slate-300">
            You have <span className="text-emerald-400 font-bold">{formatGen(claimableBalance)} GEN</span> safely buffered in the protocol escrow.
          </p>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={loading || !hasBalance}
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 shrink-0"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Claiming Disbursement...</span>
          </>
        ) : (
          <>
            <Coins className="w-4 h-4" />
            <span>Withdraw {formatGen(claimableBalance)} GEN</span>
          </>
        )}
      </button>
    </div>
  );
};
