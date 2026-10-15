import React from 'react';
import { Scale, AlertCircle, ShieldAlert, FileCode2, ExternalLink, Timer, DollarSign, Cpu } from 'lucide-react';
import { AuditBountyData, STATUS_DISPUTED, STATUS_AWAITING_PAYOUT } from '../config/genlayer';
import { formatAddress, formatGen, formatTimestamp, getCoolingOffRemaining } from '../utils/formatters';

interface AppellateCourtViewProps {
  bounties: AuditBountyData[];
  account: string;
  onOpenAppeal: (bounty: AuditBountyData) => void;
  onTriggerAppealAdjudicate: (bountyId: string) => Promise<void>;
  onSelectBounty: (bounty: AuditBountyData) => void;
  isProcessingAction?: string | null;
}

export const AppellateCourtView: React.FC<AppellateCourtViewProps> = ({
  bounties,
  account,
  onOpenAppeal,
  onTriggerAppealAdjudicate,
  onSelectBounty,
  isProcessingAction,
}) => {
  const disputedBounties = bounties.filter((b) => b.status === STATUS_DISPUTED);
  const coolingBounties = bounties.filter((b) => b.status === STATUS_AWAITING_PAYOUT);

  return (
    <div className="space-y-6">
      {/* Court Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/60 via-[#0B0F1C] to-slate-900 border border-purple-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/60 text-purple-300 text-xs font-mono font-bold">
            <Scale className="w-3.5 h-3.5" />
            <span>Supreme Appellate Security Court Chamber</span>
          </div>

          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Decentralized Vulnerability Dispute Tribunal
          </h2>

          <p className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
            When a protocol team or security researcher disputes an initial AI Jury verdict, an appeal can be filed within the <strong>24-block (~72 second)</strong> cooling-off window. The appellant must stake a <strong>10% dispute bond</strong> and bind a reproducible Foundry execution trace. The Supreme Council then re-evaluates the case with absolute finality.
          </p>
        </div>
      </div>

      {/* Disputed Cases in Active Review */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-purple-400" />
          <span>Active Appellate Review Docket ({disputedBounties.length})</span>
        </h3>

        {disputedBounties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {disputedBounties.map((b) => {
              const isAppealing = isProcessingAction === `appeal_adjudicate_${b.bounty_id}`;
              return (
                <div
                  key={b.bounty_id}
                  className="p-5 rounded-3xl bg-[#0F172A] border border-purple-500/50 shadow-xl space-y-4 hover:border-purple-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-purple-300 px-3 py-1 rounded-xl bg-purple-950/90 border border-purple-700">
                      CASE #{b.bounty_id} • UNDER DISPUTE
                    </span>
                    <span className="font-mono text-xs text-purple-400 font-bold">
                      Staked Bond: {formatGen(b.dispute_bond)} GEN
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-base text-white">
                      {b.vulnerability_title || 'Disputed Vulnerability'}
                    </h4>
                    <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                      Scope: {b.scope_repository}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Appellant Rationale:
                    </span>
                    <p className="text-slate-200 leading-relaxed italic">
                      {b.reason}
                    </p>
                  </div>

                  {b.supplemental_evidence_url && (
                    <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400">Supplemental Trace:</span>
                      <a
                        href={b.supplemental_evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-bold truncate max-w-xs"
                      >
                        {b.supplemental_evidence_url.slice(0, 35)}... <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => onSelectBounty(b)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      Inspect Evidence
                    </button>

                    <button
                      onClick={() => onTriggerAppealAdjudicate(b.bounty_id)}
                      disabled={Boolean(isProcessingAction)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                    >
                      <Scale className="w-4 h-4" />
                      <span>{isAppealing ? 'Council Voting...' : 'Adjudicate Appellate Trace'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
            <Scale className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="font-display font-semibold text-base text-slate-300">
              No Cases Currently Under Dispute
            </h4>
            <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
              All rendered AI Jury determinations have either been accepted uncontested or are currently in their 72-second challenge window.
            </p>
          </div>
        )}
      </div>

      {/* Cases in Cooling-Off Window eligible for Appeal */}
      <div className="space-y-4 pt-4">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Timer className="w-5 h-5 text-amber-400" />
          <span>Active Challenge Windows (72s Cooling-Off Active)</span>
        </h3>

        {coolingBounties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coolingBounties.map((b) => {
              const cooling = getCoolingOffRemaining(b.audit_completed_time);
              return (
                <div
                  key={b.bounty_id}
                  className="p-5 rounded-3xl bg-[#0F172A] border border-amber-500/40 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-amber-300 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-700">
                      CASE #{b.bounty_id} • AWAITING PAYOUT
                    </span>
                    <span className="font-mono text-xs text-amber-400 font-bold">
                      {cooling.formattedText}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-white">
                    {b.vulnerability_title || b.scope_repository}
                  </h4>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Initial Verdict: <strong className="text-white">{b.verdict}</strong></span>
                    <span>Bounty: <strong className="text-emerald-400">{formatGen(b.escrow_amount)} GEN</strong></span>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => onSelectBounty(b)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                    >
                      Inspect Findings
                    </button>
                    <button
                      onClick={() => onOpenAppeal(b)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/60 text-purple-300 font-bold text-xs font-mono transition-colors"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Stake 10% Bond & File Appeal</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
            No bounties currently in cooling-off period.
          </div>
        )}
      </div>
    </div>
  );
};
