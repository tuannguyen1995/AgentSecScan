import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  GitBranch,
  FileText,
  Clock,
  Coins,
  Send,
  Cpu,
  Scale,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle,
  Award,
  Timer,
  UserCheck,
  Building,
  Shield,
  Hash
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

interface BountyCardProps {
  bounty: AuditBountyData;
  contractAddress: string;
  account: string;
  onOpenSubmitDeliverable: (bounty: AuditBountyData) => void;
  onOpenAuditInspector: (bounty: AuditBountyData) => void;
  onOpenAppeal: (bounty: AuditBountyData) => void;
  onViewCertificate: (bounty: AuditBountyData) => void;
  onTriggerAdjudicate: (bountyId: string) => Promise<void>;
  onTriggerAppealAdjudicate: (bountyId: string) => Promise<void>;
  onTriggerFinalize: (bountyId: string) => Promise<void>;
  onTriggerReclaim: (bountyId: string) => Promise<void>;
  isProcessingAction?: string | null;
}

export const BountyCard: React.FC<BountyCardProps> = ({
  bounty,
  contractAddress,
  account,
  onOpenSubmitDeliverable,
  onOpenAuditInspector,
  onOpenAppeal,
  onViewCertificate,
  onTriggerAdjudicate,
  onTriggerAppealAdjudicate,
  onTriggerFinalize,
  onTriggerReclaim,
  isProcessingAction,
}) => {
  const meta = getStatusMeta(bounty.status);
  const roleInfo = getUserRoleOnBounty(account, bounty);

  // Live cooling-off countdown
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

  const isAdjudicating = isProcessingAction === `adjudicate_${bounty.bounty_id}`;
  const isFinalizing = isProcessingAction === `finalize_${bounty.bounty_id}`;
  const isAppealing = isProcessingAction === `appeal_adjudicate_${bounty.bounty_id}`;
  const isReclaiming = isProcessingAction === `reclaim_${bounty.bounty_id}`;

  return (
    <div
      className={`relative overflow-hidden bg-[#0F172A] border ${meta.borderColor} rounded-3xl p-5 sm:p-6 shadow-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/60 space-y-4`}
    >
      {/* Role Context Banner */}
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl border ${roleInfo.badgeBg} ${roleInfo.borderColor} text-[11px] font-mono`}>
        <div className="flex items-center gap-1.5">
          {roleInfo.role === 'PROTOCOL_TEAM' && <Building className="w-3.5 h-3.5 text-cyan-400" />}
          {roleInfo.role === 'SECURITY_RESEARCHER' && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
          {roleInfo.role === 'DISPUTE_APPELLANT' && <Scale className="w-3.5 h-3.5 text-purple-400" />}
          {roleInfo.role === 'PUBLIC_OBSERVER' && <UserCheck className="w-3.5 h-3.5 text-slate-400" />}
          <span className={`font-bold ${roleInfo.badgeText}`}>
            YOUR ROLE: {roleInfo.label}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 hidden sm:block truncate max-w-[200px]" title={roleInfo.restrictionNote}>
          {roleInfo.restrictionNote}
        </span>
      </div>

      {/* Top Bar: Case ID + Status Badge + Escrow */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-3 py-1 rounded-xl shadow-inner">
            CASE #{bounty.bounty_id}
          </span>
          <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
            {meta.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Locked Bounty Escrow</span>
            <span className="font-display font-extrabold text-lg text-emerald-400">
              {formatGen(bounty.escrow_amount)} <span className="text-xs font-mono text-slate-400">GEN</span>
            </span>
          </div>
          {BigInt(bounty.dispute_bond || '0') > 0n && (
            <div className="text-right pl-3 border-l border-slate-800">
              <span className="text-[10px] font-mono text-purple-400 block">Dispute Stake</span>
              <span className="font-display font-bold text-sm text-purple-300">
                {formatGen(bounty.dispute_bond)} GEN
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Codebase Repository Scope */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-500">Scope:</span>
          <a
            href={bounty.scope_repository.startsWith('http') ? bounty.scope_repository : `https://${bounty.scope_repository}`}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 hover:underline truncate max-w-sm flex items-center gap-1 font-semibold"
          >
            {bounty.scope_repository}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>

        {bounty.vulnerability_title && (
          <h3 className="font-display font-bold text-base sm:text-lg text-white pt-1">
            {bounty.vulnerability_title}
          </h3>
        )}
      </div>

      {/* AI Security Scores if evaluated */}
      {(bounty.status >= STATUS_AWAITING_PAYOUT || bounty.status === STATUS_UNRESOLVED) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block">Exploit Severity</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`font-bold text-sm ${bounty.severity_score >= 75 ? 'text-red-400' : bounty.severity_score >= 40 ? 'text-amber-400' : 'text-slate-400'}`}>
                {bounty.severity_score}/100
              </span>
              <span className="text-[10px] text-slate-500">
                {bounty.severity_score >= 75 ? 'Critical' : bounty.severity_score >= 40 ? 'Medium' : 'Low/None'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 block">PoC Reproducibility</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-bold text-sm text-cyan-400">{bounty.reproducibility_score}%</span>
              <span className="text-[10px] text-slate-500">Validated</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 block">Jury Determination</span>
            <span className="font-bold text-xs text-white truncate block mt-0.5" title={bounty.verdict}>
              {bounty.verdict || 'PENDING'}
            </span>
          </div>
        </div>
      )}

      {/* Live Cooling-Off Timer during State 2 (Awaiting Payout) */}
      {bounty.status === STATUS_AWAITING_PAYOUT && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-amber-300 font-semibold flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>24-Block Dispute Cooling-Off Window:</span>
            </span>
            <span className={`font-bold ${coolingState.isCooling ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {coolingState.formattedText}
            </span>
          </div>

          {coolingState.isCooling && (
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-cyan-400 rounded-full transition-all duration-1000"
                style={{ width: `${coolingState.percentage}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Reason snippet */}
      {bounty.reason && (
        <p className="text-xs font-mono text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 line-clamp-2 leading-relaxed">
          {bounty.reason}
        </p>
      )}

      {/* Cryptographic SHA-256 Stamp */}
      {bounty.report_evidence_hash && (
        <div className="flex items-center justify-between text-[11px] font-mono px-3 py-1.5 rounded-lg bg-black/40 border border-slate-800 text-slate-400">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3 text-cyan-400" />
            <span>SHA-256 Commitment:</span>
          </span>
          <span className="text-emerald-400 font-bold">{formatHash(bounty.report_evidence_hash, 8)}</span>
        </div>
      )}

      {/* Stakeholders & Timestamps */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60 gap-2">
        <div className="flex items-center gap-3">
          <span>Sponsor: <strong className="text-slate-300">{formatAddress(bounty.protocol_team)}</strong></span>
          {bounty.security_researcher && bounty.security_researcher !== '0x0000000000000000000000000000000000000000' && (
            <span>Auditor: <strong className="text-slate-300">{formatAddress(bounty.security_researcher)}</strong></span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimestamp(bounty.created_at_time)}</span>
        </div>
      </div>

      {/* Interactive Action Controls */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {/* Certificate Button (Available once adjudicated or settled) */}
        {bounty.status >= STATUS_AWAITING_PAYOUT && bounty.status !== STATUS_UNRESOLVED && (
          <button
            onClick={() => onViewCertificate(bounty)}
            title="Inspect SVG Holographic Audit Certificate"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-medium transition-all shadow-sm"
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Holographic Seal</span>
          </button>
        )}

        {/* State 0: Bounty Open */}
        {bounty.status === STATUS_BOUNTY_OPEN && (
          <>
            {roleInfo.role === 'PROTOCOL_TEAM' && (
              <button
                onClick={() => onTriggerReclaim(bounty.bounty_id)}
                disabled={Boolean(isProcessingAction)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                {isReclaiming ? 'Reclaiming...' : 'Reclaim if Expired'}
              </button>
            )}

            {roleInfo.role === 'PROTOCOL_TEAM' ? (
              <button
                disabled
                title="Protocol team cannot submit reports to their own bounty (Role Violation)"
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-mono cursor-not-allowed"
              >
                Submission Disabled for Sponsor
              </button>
            ) : (
              <button
                onClick={() => onOpenSubmitDeliverable(bounty)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Vulnerability & PoC</span>
              </button>
            )}
          </>
        )}

        {/* State 1 or 8: Submitted / Unresolved */}
        {(bounty.status === STATUS_REPORT_SUBMITTED || bounty.status === STATUS_UNRESOLVED) && (
          <button
            onClick={() => onTriggerAdjudicate(bounty.bounty_id)}
            disabled={Boolean(isProcessingAction)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white text-xs font-mono font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
          >
            {isAdjudicating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Jury Adjudicating On-Chain...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Run AI Security Jury Consensus</span>
              </>
            )}
          </button>
        )}

        {/* State 2: Awaiting Payout */}
        {bounty.status === STATUS_AWAITING_PAYOUT && (
          <>
            <button
              onClick={() => onOpenAuditInspector(bounty)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
            >
              Inspect Findings
            </button>

            {coolingState.isCooling ? (
              <button
                onClick={() => onOpenAppeal(bounty)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/60 text-purple-300 text-xs font-mono font-semibold transition-all shadow-md"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>File Dispute (10% Bond)</span>
              </button>
            ) : (
              <button
                disabled
                title="Challenge cooling-off window closed. Cannot file new appeal."
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-600 text-xs font-mono cursor-not-allowed"
              >
                Appeal Window Closed
              </button>
            )}

            <button
              onClick={() => onTriggerFinalize(bounty.bounty_id)}
              disabled={Boolean(isProcessingAction) || coolingState.isCooling}
              title={coolingState.isCooling ? `Cooling-off window active (${coolingState.secondsRemaining}s remaining)` : 'Finalize uncontested settlement'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                coolingState.isCooling
                  ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Settling...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Finalize Settlement</span>
                </>
              )}
            </button>
          </>
        )}

        {/* State 6: Disputed */}
        {bounty.status === STATUS_DISPUTED && (
          <>
            <button
              onClick={() => onOpenAuditInspector(bounty)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
            >
              Inspect Prior Verdict
            </button>
            <button
              onClick={() => onTriggerAppealAdjudicate(bounty.bounty_id)}
              disabled={Boolean(isProcessingAction)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-mono font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
            >
              {isAppealing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Appellate Review in Progress...</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5" />
                  <span>Adjudicate Appeal with Trace</span>
                </>
              )}
            </button>
          </>
        )}

        {/* Settled States (3, 4, 5) */}
        {(bounty.status === STATUS_SETTLED_PAID_FULL ||
          bounty.status === STATUS_SETTLED_PARTIAL ||
          bounty.status === STATUS_SETTLED_REJECTED) && (
          <button
            onClick={() => onOpenAuditInspector(bounty)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            <span>View Full Resolution & Proofs</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
};
