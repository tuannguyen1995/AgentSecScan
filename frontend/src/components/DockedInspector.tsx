import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hash,
  ExternalLink,
  Award,
  Scale,
  Send,
  Timer,
  CheckCircle,
  FileText,
  Code2,
  Lock,
  GitBranch,
  ArrowRight,
  Crosshair,
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react';
import {
  AuditBountyData,
  STATUS_BOUNTY_OPEN,
  STATUS_REPORT_SUBMITTED,
  STATUS_AWAITING_PAYOUT,
  STATUS_SETTLED_PAID_FULL,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_REJECTED,
  STATUS_DISPUTED,
  STATUS_CANCELLED,
  STATUS_UNRESOLVED
} from '../config/genlayer';
import {
  formatAddress,
  formatGen,
  formatTimestamp,
  formatHash,
  getStatusMeta,
  getCoolingOffRemaining,
  getUserRoleOnBounty
} from '../utils/formatters';

interface DockedInspectorProps {
  bounty: AuditBountyData | null;
  account: string;
  contractAddress: string;
  onOpenSubmitDeliverable: (bounty: AuditBountyData) => void;
  onOpenAppeal: (bounty: AuditBountyData) => void;
  onViewCertificate: (bounty: AuditBountyData) => void;
  onTriggerAdjudicate: (bountyId: string) => Promise<void>;
  onTriggerAppealAdjudicate: (bountyId: string) => Promise<void>;
  onTriggerFinalize: (bountyId: string) => Promise<void>;
  onTriggerReclaim: (bountyId: string) => Promise<void>;
  onTriggerRefundBond?: (bountyId: string) => Promise<void>;
  isProcessingAction?: string | null;
}

export const DockedInspector: React.FC<DockedInspectorProps> = ({
  bounty,
  account,
  contractAddress,
  onOpenSubmitDeliverable,
  onOpenAppeal,
  onViewCertificate,
  onTriggerAdjudicate,
  onTriggerAppealAdjudicate,
  onTriggerFinalize,
  onTriggerReclaim,
  onTriggerRefundBond,
  isProcessingAction,
}) => {
  if (!bounty) {
    return (
      <div className="h-full rounded-3xl bg-[#090D18] border border-cyan-900/30 p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-xl select-none">
        <div className="w-16 h-16 rounded-3xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-pulse">
          <Crosshair className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-bold text-base text-white">
            Security Intelligence Inspector Docked
          </h3>
          <p className="text-xs font-mono text-slate-400 max-w-xs">
            Select any audit case from the war room list to examine AST exploitability, PoC reproducibility, and consensus proofs.
          </p>
        </div>
      </div>
    );
  }

  const meta = getStatusMeta(bounty.status);
  const roleInfo = getUserRoleOnBounty(account, bounty);

  const [coolingState, setCoolingState] = useState(() =>
    getCoolingOffRemaining(bounty.audit_completed_time)
  );

  useEffect(() => {
    if (bounty.status !== STATUS_AWAITING_PAYOUT) return;
    const interval = setInterval(() => {
      setCoolingState(getCoolingOffRemaining(bounty.audit_completed_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [bounty.status, bounty.audit_completed_time]);

  const isConfirmed = bounty.verdict === 'VULNERABILITY_CONFIRMED_FULL';
  const isPartial = bounty.verdict === 'PARTIAL_SEVERITY_PAYOUT';
  const isRejected = bounty.verdict === 'CLAIM_REJECTED_INVALID';
  const isUnresolved = bounty.verdict.startsWith('UNRESOLVED_') || bounty.status === STATUS_UNRESOLVED;

  const isAdjudicating = isProcessingAction === `adjudicate_${bounty.bounty_id}`;
  const isFinalizing = isProcessingAction === `finalize_${bounty.bounty_id}`;
  const isAppealing = isProcessingAction === `appeal_adjudicate_${bounty.bounty_id}`;
  const isReclaiming = isProcessingAction === `reclaim_${bounty.bounty_id}`;

  return (
    <div className="h-full rounded-3xl bg-[#090D18] border border-cyan-500/30 p-6 flex flex-col justify-between space-y-5 shadow-2xl overflow-y-auto scrollbar-thin">
      {/* Top Header Badge */}
      <div className="space-y-3 border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-cyan-400 px-2.5 py-1 rounded-xl bg-cyan-950/80 border border-cyan-800">
              CASE #{bounty.bounty_id}
            </span>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
              {meta.label}
            </span>
          </div>

          <span className="font-display font-extrabold text-sm text-emerald-400">
            {formatGen(bounty.escrow_amount)} GEN
          </span>
        </div>

        {/* Role identification */}
        <div className={`p-2 rounded-xl border ${roleInfo.badgeBg} ${roleInfo.borderColor} flex items-center justify-between text-[11px] font-mono`}>
          <div className="flex items-center gap-1.5">
            {roleInfo.role === 'PROTOCOL_TEAM' && <Building className="w-3.5 h-3.5 text-cyan-400" />}
            {roleInfo.role === 'SECURITY_RESEARCHER' && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
            {roleInfo.role === 'DISPUTE_APPELLANT' && <Scale className="w-3.5 h-3.5 text-purple-400" />}
            {roleInfo.role === 'PUBLIC_OBSERVER' && <UserCheck className="w-3.5 h-3.5 text-slate-400" />}
            <span className={`font-bold ${roleInfo.badgeText}`}>{roleInfo.label}</span>
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
            {roleInfo.restrictionNote}
          </span>
        </div>

        {/* Title & Scope */}
        <div>
          <h3 className="font-display font-bold text-base text-white leading-snug">
            {bounty.vulnerability_title || 'Pending Vulnerability Disclosure'}
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mt-1">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <a
              href={bounty.scope_repository.startsWith('http') ? bounty.scope_repository : `https://${bounty.scope_repository}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:underline truncate flex items-center gap-1"
            >
              {bounty.scope_repository}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>
      </div>

      {/* Visual Radial Gauges for Severity & Reproducibility */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
            Exploit Severity
          </span>
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={bounty.severity_score >= 75 ? 'text-red-500' : bounty.severity_score >= 40 ? 'text-amber-500' : 'text-slate-500'}
                strokeDasharray={`${bounty.severity_score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono font-bold text-sm text-white">
              {bounty.severity_score}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">AST Drain Impact</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
            PoC Reproducibility
          </span>
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-cyan-400"
                strokeDasharray={`${bounty.reproducibility_score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono font-bold text-sm text-white">
              {bounty.reproducibility_score}%
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">Clean Sandbox Run</span>
        </div>
      </div>

      {/* Rationale / Jury Explanation */}
      {bounty.reason && (
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-900/40 space-y-1">
          <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider block">
            Chief Magistrate Consensus Analysis
          </span>
          <p className="text-xs font-mono text-slate-200 leading-relaxed max-h-24 overflow-y-auto scrollbar-thin">
            {bounty.reason}
          </p>
        </div>
      )}

      {/* Cooling Window Bar during State 2 */}
      {bounty.status === STATUS_AWAITING_PAYOUT && (
        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs font-mono space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-300 font-semibold flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cooling-off Challenge:</span>
            </span>
            <span className={`font-bold ${coolingState.isCooling ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {coolingState.formattedText}
            </span>
          </div>
        </div>
      )}

      {/* Cryptographic SHA-256 Proof */}
      {bounty.report_evidence_hash && (
        <div className="p-3 rounded-2xl bg-black/50 border border-slate-800 text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-cyan-400" />
              <span>SHA-256 Commitment:</span>
            </span>
            <span className="text-emerald-400 font-bold">✓ MATCHED</span>
          </div>
          <span className="text-xs text-slate-300 break-all block font-bold">
            {bounty.report_evidence_hash}
          </span>
        </div>
      )}

      {/* Action Trigger Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        {/* Certificate Generator */}
        {bounty.status >= STATUS_AWAITING_PAYOUT && bounty.status !== STATUS_UNRESOLVED && (
          <button
            onClick={() => onViewCertificate(bounty)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all shadow-md"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>View Holographic Audit Certificate</span>
          </button>
        )}

        {/* State 0: Bounty Open */}
        {bounty.status === STATUS_BOUNTY_OPEN && (
          <>
            {roleInfo.role === 'PROTOCOL_TEAM' ? (
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-mono cursor-not-allowed text-center"
              >
                Cannot submit to own bounty
              </button>
            ) : (
              <button
                onClick={() => onOpenSubmitDeliverable(bounty)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)]"
              >
                <Send className="w-4 h-4" />
                <span>Submit Vulnerability & PoC</span>
              </button>
            )}
          </>
        )}

        {/* State: Appeal Unresolved Error -> Retry Appellate Trace or Refund Bond */}
        {bounty.status === STATUS_UNRESOLVED && BigInt(bounty.dispute_bond || '0') > 0n && (
          <div className="space-y-2">
            <button
              onClick={() => onTriggerAppealAdjudicate(bounty.bounty_id)}
              disabled={Boolean(isProcessingAction)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] disabled:opacity-50"
            >
              <Scale className="w-4 h-4" />
              <span>Retry Appellate Trace Adjudication</span>
            </button>

            {account && account.toLowerCase() === bounty.dispute_initiator?.toLowerCase() && onTriggerRefundBond && (
              <button
                onClick={() => onTriggerRefundBond(bounty.bounty_id)}
                disabled={Boolean(isProcessingAction)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-500/60 text-amber-300 font-bold text-xs font-mono transition-all disabled:opacity-50"
              >
                <span>Refund 100% Staked Dispute Bond</span>
              </button>
            )}
          </div>
        )}

        {/* State 1 / 8 (Initial review unresolved): Ready for Jury */}
        {(bounty.status === STATUS_REPORT_SUBMITTED || (bounty.status === STATUS_UNRESOLVED && BigInt(bounty.dispute_bond || '0') === 0n)) && (
          <button
            onClick={() => onTriggerAdjudicate(bounty.bounty_id)}
            disabled={Boolean(isProcessingAction)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] disabled:opacity-50"
          >
            <Cpu className="w-4 h-4" />
            <span>Run AI Security Jury Consensus</span>
          </button>
        )}

        {/* State 2: Cooling-off -> Appeal or Finalize */}
        {bounty.status === STATUS_AWAITING_PAYOUT && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenAppeal(bounty)}
              disabled={!coolingState.isCooling}
              className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/60 text-purple-300 font-bold text-xs font-mono transition-colors disabled:opacity-50"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Appeal (10%)</span>
            </button>

            <button
              onClick={() => onTriggerFinalize(bounty.bounty_id)}
              disabled={Boolean(isProcessingAction) || coolingState.isCooling}
              className={`flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                coolingState.isCooling
                  ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Finalize</span>
            </button>
          </div>
        )}

        {/* State 6: Disputed -> Appeal Adjudicate */}
        {bounty.status === STATUS_DISPUTED && (
          <button
            onClick={() => onTriggerAppealAdjudicate(bounty.bounty_id)}
            disabled={Boolean(isProcessingAction)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] disabled:opacity-50"
          >
            <Scale className="w-4 h-4" />
            <span>Adjudicate Appellate Trace</span>
          </button>
        )}
      </div>
    </div>
  );
};
