import React from 'react';
import { Eye, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Hash, ExternalLink, Clock } from 'lucide-react';
import { AuditBountyData } from '../config/genlayer';
import { formatAddress, formatGen, formatTimestamp, formatHash } from '../utils/formatters';

interface AuditInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: AuditBountyData | null;
}

export const AuditInspectorModal: React.FC<AuditInspectorModalProps> = ({
  isOpen,
  onClose,
  bounty,
}) => {
  if (!isOpen || !bounty) return null;

  const isConfirmed = bounty.verdict === 'VULNERABILITY_CONFIRMED_FULL';
  const isPartial = bounty.verdict === 'PARTIAL_SEVERITY_PAYOUT';
  const isRejected = bounty.verdict === 'CLAIM_REJECTED_INVALID';
  const isUnresolved = bounty.verdict.startsWith('UNRESOLVED_') || bounty.status === 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
              isConfirmed
                ? 'bg-red-950/80 border-red-500/50 text-red-400'
                : isPartial
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                : isRejected
                ? 'bg-slate-900 border-slate-700 text-slate-400'
                : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-400'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                <span>AI Security Jury Findings</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                  Case #{bounty.bounty_id}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Evaluated via GenLayer Intelligent Consensus (`gl.nondet.web.render` + LLM)
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

        {/* Verdict Banner */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isConfirmed
            ? 'bg-red-950/40 border-red-500/40 text-red-200'
            : isPartial
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : isRejected
            ? 'bg-slate-900/80 border-slate-700 text-slate-300'
            : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
        }`}>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider block font-semibold opacity-75">
              Consensus Adjudication Verdict
            </span>
            <div className="font-display font-bold text-lg sm:text-xl flex items-center gap-2 mt-0.5">
              {isConfirmed && <CheckCircle2 className="w-5 h-5 text-red-400" />}
              {isPartial && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {isRejected && <XCircle className="w-5 h-5 text-rose-400" />}
              <span>{bounty.verdict || 'PENDING EVALUATION'}</span>
            </div>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
            <span className="text-[10px] font-mono text-slate-400 block">Jury Confidence</span>
            <span className="text-xl font-mono font-bold text-white">{bounty.confidence}%</span>
          </div>
        </div>

        {/* Exploitability & Reproducibility Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase">Exploitability Severity</span>
              <span className="text-sm font-mono font-bold text-red-400">{bounty.severity_score}/100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                style={{ width: `${Math.min(100, bounty.severity_score)}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block">
              Financial impact, state-theft, and drain capability
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase">PoC Reproducibility</span>
              <span className="text-sm font-mono font-bold text-cyan-400">{bounty.reproducibility_score}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, bounty.reproducibility_score)}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block">
              Automated trigger reliability in sandbox runtime
            </span>
          </div>
        </div>

        {/* Rationale / Audit Justification */}
        <div className="space-y-1.5 p-4 rounded-xl bg-slate-950 border border-cyan-900/30">
          <span className="text-xs font-mono uppercase text-cyan-400 font-semibold tracking-wider block">
            Jury Rationale & Technical Analysis
          </span>
          <p className="text-sm font-mono text-slate-200 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            {bounty.reason || 'No evaluation rationale recorded yet.'}
          </p>
        </div>

        {/* Cryptographic Snapshot & Evidence */}
        <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
          <span className="text-[11px] uppercase text-slate-400 font-semibold tracking-wider block flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            Cryptographic Integrity Proofs
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Committed Report SHA-256</span>
              <span className="text-xs text-emerald-400 font-bold break-all">
                {bounty.report_evidence_hash || 'Pending submission'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Execution Evidence Digest</span>
              <span className="text-xs text-cyan-400 font-bold break-all">
                {bounty.evidence_hash || 'Pending evaluation'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            {bounty.report_url && (
              <a
                href={bounty.report_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                View Vulnerability Report <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {bounty.poc_script_url && (
              <a
                href={bounty.poc_script_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                View PoC Exploit Script <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Stakeholder Addresses */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
          <div>
            <span className="block text-slate-500">Protocol Team:</span>
            <span className="text-slate-300">{formatAddress(bounty.protocol_team)}</span>
          </div>
          <div>
            <span className="block text-slate-500">Security Researcher:</span>
            <span className="text-slate-300">{formatAddress(bounty.security_researcher)}</span>
          </div>
          <div>
            <span className="block text-slate-500">Dispute Initiator:</span>
            <span className="text-slate-300">{formatAddress(bounty.dispute_initiator)}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold"
          >
            Close Findings
          </button>
        </div>
      </div>
    </div>
  );
};
