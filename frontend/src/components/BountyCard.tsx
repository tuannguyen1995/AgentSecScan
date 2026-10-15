import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import {
  AuditBountyData,
  adjudicateSecurityAudit,
  adjudicateAppeal,
  finalizeSettlement,
  cancelOrReclaim,
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
  getStatusMeta
} from '../utils/formatters';

interface BountyCardProps {
  bounty: AuditBountyData;
  contractAddress: string;
  account: string;
  onOpenSubmitDeliverable: (bounty: AuditBountyData) => void;
  onOpenAuditInspector: (bounty: AuditBountyData) => void;
  onOpenAppeal: (bounty: AuditBountyData) => void;
  onRefresh: () => void;
}

export const BountyCard: React.FC<BountyCardProps> = ({
  bounty,
  contractAddress,
  account,
  onOpenSubmitDeliverable,
  onOpenAuditInspector,
  onOpenAppeal,
  onRefresh,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const meta = getStatusMeta(bounty.status);
  const isProtocol = account && account.toLowerCase() === bounty.protocol_team.toLowerCase();
  const isResearcher = account && bounty.security_researcher && account.toLowerCase() === bounty.security_researcher.toLowerCase();

  const handleAdjudicateAudit = async () => {
    if (!account) return alert('Please connect wallet');
    try {
      setActionLoading('adjudicate');
      setActionError(null);
      await adjudicateSecurityAudit(contractAddress, account, bounty.bounty_id);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      setActionError(e?.message || 'AI Jury Adjudication failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjudicateAppeal = async () => {
    if (!account) return alert('Please connect wallet');
    try {
      setActionLoading('appeal_adjudicate');
      setActionError(null);
      await adjudicateAppeal(contractAddress, account, bounty.bounty_id);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      setActionError(e?.message || 'Appellate Adjudication failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalizeSettlement = async () => {
    if (!account) return alert('Please connect wallet');
    try {
      setActionLoading('finalize');
      setActionError(null);
      await finalizeSettlement(contractAddress, account, bounty.bounty_id);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      setActionError(e?.message || 'Finalize settlement failed (cooling-off window may still be active).');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrReclaim = async () => {
    if (!account) return alert('Please connect wallet');
    try {
      setActionLoading('reclaim');
      setActionError(null);
      await cancelOrReclaim(contractAddress, account, bounty.bounty_id);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      setActionError(e?.message || 'Reclaim failed: Bounty still active or deliverables submitted.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-[#0F172A] border ${meta.borderColor} rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200 hover:shadow-2xl hover:border-cyan-500/50 space-y-4`}>
      {/* Top Bar: Case ID + Status Badge + Escrow */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
            BOUNTY #{bounty.bounty_id}
          </span>
          <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
            {meta.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Locked Escrow</span>
            <span className="font-display font-bold text-lg text-emerald-400">
              {formatGen(bounty.escrow_amount)} <span className="text-xs font-mono text-slate-400">GEN</span>
            </span>
          </div>
          {BigInt(bounty.dispute_bond || '0') > 0n && (
            <div className="text-right pl-3 border-l border-slate-800">
              <span className="text-[10px] font-mono text-purple-400 block">Dispute Bond</span>
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
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          <span>Codebase Scope:</span>
          <a
            href={bounty.scope_repository.startsWith('http') ? bounty.scope_repository : `https://${bounty.scope_repository}`}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 hover:underline truncate max-w-md flex items-center gap-1"
          >
            {bounty.scope_repository}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>

        {bounty.vulnerability_title && (
          <h3 className="font-display font-semibold text-base sm:text-lg text-white pt-1">
            {bounty.vulnerability_title}
          </h3>
        )}
      </div>

      {/* AI Security Scores if adjudicated */}
      {(bounty.status >= STATUS_AWAITING_PAYOUT || bounty.status === STATUS_UNRESOLVED) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block">Exploitability Severity</span>
            <span className={`font-bold ${bounty.severity_score >= 75 ? 'text-red-400' : bounty.severity_score >= 40 ? 'text-amber-400' : 'text-slate-400'}`}>
              {bounty.severity_score}/100
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">PoC Reproducibility</span>
            <span className="font-bold text-cyan-400">{bounty.reproducibility_score}%</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 block">Consensus Verdict</span>
            <span className="font-bold text-white truncate block" title={bounty.verdict}>
              {bounty.verdict || 'PENDING'}
            </span>
          </div>
        </div>
      )}

      {/* Reason snippet */}
      {bounty.reason && (
        <p className="text-xs font-mono text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 line-clamp-2">
          {bounty.reason}
        </p>
      )}

      {/* Error alert if action failed */}
      {actionError && (
        <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{actionError}</span>
        </div>
      )}

      {/* Stakeholders & Timestamps */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60 gap-2">
        <div className="flex items-center gap-3">
          <span>Protocol: <strong className="text-slate-300">{formatAddress(bounty.protocol_team)}</strong></span>
          {bounty.security_researcher && bounty.security_researcher !== '0x0000000000000000000000000000000000000000' && (
            <span>Researcher: <strong className="text-slate-300">{formatAddress(bounty.security_researcher)}</strong></span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimestamp(bounty.created_at_time)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {/* State 0: Bounty Open -> Submit deliverable or Reclaim */}
        {bounty.status === STATUS_BOUNTY_OPEN && (
          <>
            {isProtocol && (
              <button
                onClick={handleCancelOrReclaim}
                disabled={actionLoading === 'reclaim'}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                {actionLoading === 'reclaim' ? 'Reclaiming...' : 'Reclaim if Expired'}
              </button>
            )}
            <button
              onClick={() => onOpenSubmitDeliverable(bounty)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Vulnerability & PoC</span>
            </button>
          </>
        )}

        {/* State 1 or 8: Submitted / Unresolved -> Adjudicate Audit */}
        {(bounty.status === STATUS_REPORT_SUBMITTED || bounty.status === STATUS_UNRESOLVED) && (
          <button
            onClick={handleAdjudicateAudit}
            disabled={actionLoading === 'adjudicate'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] disabled:opacity-50"
          >
            {actionLoading === 'adjudicate' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Jury Adjudicating PoC...</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5" />
                <span>Run AI Security Jury Consensus</span>
              </>
            )}
          </button>
        )}

        {/* State 2: Awaiting Payout (Cooling off window) */}
        {bounty.status === STATUS_AWAITING_PAYOUT && (
          <>
            <button
              onClick={() => onOpenAuditInspector(bounty)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
            >
              Inspect AI Findings
            </button>
            <button
              onClick={() => onOpenAppeal(bounty)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-700/60 text-purple-300 text-xs font-mono font-medium transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>File Dispute (10% Bond)</span>
            </button>
            <button
              onClick={handleFinalizeSettlement}
              disabled={actionLoading === 'finalize'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all disabled:opacity-50"
            >
              {actionLoading === 'finalize' ? (
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

        {/* State 6: Disputed -> Adjudicate Appeal */}
        {bounty.status === STATUS_DISPUTED && (
          <>
            <button
              onClick={() => onOpenAuditInspector(bounty)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
            >
              Inspect Prior Verdict
            </button>
            <button
              onClick={handleAdjudicateAppeal}
              disabled={actionLoading === 'appeal_adjudicate'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
            >
              {actionLoading === 'appeal_adjudicate' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Supreme Council Reviewing...</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5" />
                  <span>Adjudicate Appeal with Bound Trace</span>
                </>
              )}
            </button>
          </>
        )}

        {/* State 3, 4, 5: Settled -> Inspect findings */}
        {(bounty.status === STATUS_SETTLED_PAID_FULL ||
          bounty.status === STATUS_SETTLED_PARTIAL ||
          bounty.status === STATUS_SETTLED_REJECTED) && (
          <button
            onClick={() => onOpenAuditInspector(bounty)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            <span>View Full Resolution & Proofs</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
};
