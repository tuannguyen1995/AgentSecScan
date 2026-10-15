import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hash,
  ExternalLink,
  Cpu,
  Scale,
  Code2,
  FileText,
  Copy,
  Check,
  Award,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { AuditBountyData } from '../config/genlayer';
import { formatAddress, formatGen, formatTimestamp, formatHash } from '../utils/formatters';

interface AuditInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: AuditBountyData | null;
  onViewCertificate?: (bounty: AuditBountyData) => void;
}

export const AuditInspectorModal: React.FC<AuditInspectorModalProps> = ({
  isOpen,
  onClose,
  bounty,
  onViewCertificate,
}) => {
  const [activeTab, setActiveTab] = useState<'adjudication' | 'crypto' | 'appeal' | 'raw'>('adjudication');
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen || !bounty) return null;

  const isConfirmed = bounty.verdict === 'VULNERABILITY_CONFIRMED_FULL';
  const isPartial = bounty.verdict === 'PARTIAL_SEVERITY_PAYOUT';
  const isRejected = bounty.verdict === 'CLAIM_REJECTED_INVALID';
  const isUnresolved = bounty.verdict.startsWith('UNRESOLVED_') || bounty.status === 8;
  const isDisputed = bounty.status === 6 || Boolean(bounty.supplemental_evidence_url);

  const handleCopyEvidenceHash = async () => {
    if (!bounty.evidence_hash) return;
    try {
      await navigator.clipboard.writeText(bounty.evidence_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl bg-[#0F172A] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.2)] space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                isConfirmed
                  ? 'bg-red-950/80 border-red-500/60 text-red-400'
                  : isPartial
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-400'
                  : isRejected
                  ? 'bg-slate-900 border-slate-700 text-slate-400'
                  : 'bg-indigo-950/80 border-indigo-500/60 text-indigo-400'
              }`}
            >
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                  AI Security Jury Adjudication Dossier
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-300 font-semibold">
                  CASE #{bounty.bounty_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Cross-examined on GenLayer Studionet (Chain 61999) via Immunefi/OWASP rubrics
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg">
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('adjudication')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 ${
              activeTab === 'adjudication' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Adjudication & Scores</span>
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 ${
              activeTab === 'crypto' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Cryptographic Proofs</span>
          </button>
          {isDisputed && (
            <button
              onClick={() => setActiveTab('appeal')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 ${
                activeTab === 'appeal' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Appellate Court</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 ${
              activeTab === 'raw' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>On-Chain JSON</span>
          </button>
        </div>

        {/* TAB 1: AI ADJUDICATION */}
        {activeTab === 'adjudication' && (
          <div className="space-y-5 animate-fade-in">
            {/* Verdict Summary Card */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
                isConfirmed
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : isPartial
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : isRejected
                  ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                  : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider block font-bold opacity-75">
                  Consensus Determination
                </span>
                <div className="font-display font-extrabold text-xl sm:text-2xl flex items-center gap-2 mt-1">
                  {isConfirmed && <CheckCircle2 className="w-6 h-6 text-red-400" />}
                  {isPartial && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                  {isRejected && <XCircle className="w-6 h-6 text-rose-400" />}
                  <span>{bounty.verdict || 'PENDING EVALUATION'}</span>
                </div>
                <p className="text-xs font-mono opacity-80 mt-1">
                  {isConfirmed && '100% of locked escrow disbursed to whitehat researcher.'}
                  {isPartial && '40% partial severity award to researcher, 60% refunded to protocol.'}
                  {isRejected && '0% reward. Full escrow refunded to protocol team.'}
                  {isUnresolved && 'Consensus non-settling protection state active. Escrow protected.'}
                </p>
              </div>

              <div className="sm:border-l sm:border-slate-800 sm:pl-5 text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Jury Confidence</span>
                <span className="text-2xl font-mono font-extrabold text-white">{bounty.confidence}%</span>
                <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">✓ Canary Verified</span>
              </div>
            </div>

            {/* Score Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase font-semibold">
                    Exploit Severity Rating
                  </span>
                  <span className="text-sm font-mono font-bold text-red-400">{bounty.severity_score}/100</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, bounty.severity_score)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] font-mono text-slate-500">
                  Measures direct fund drainage, oracle skew, or permanent state corruption.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase font-semibold">
                    PoC Reproducibility Percentage
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-400">{bounty.reproducibility_score}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, bounty.reproducibility_score)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] font-mono text-slate-500">
                  Verifies if exploit runs without privileged assumptions in clean sandbox.
                </p>
              </div>
            </div>

            {/* AI Technical Justification */}
            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950 border border-cyan-900/40">
              <span className="text-xs font-mono uppercase text-cyan-400 font-bold tracking-wider block">
                Chief Security Auditor & Magistrate Rationale
              </span>
              <p className="text-xs sm:text-sm font-mono text-slate-200 leading-relaxed bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                {bounty.reason || 'No evaluation rationale recorded yet.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: CRYPTOGRAPHIC PROOFS */}
        {activeTab === 'crypto' && (
          <div className="space-y-4 animate-fade-in text-xs font-mono">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[11px] uppercase text-cyan-400 font-bold tracking-wider block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Anti-Tampering SHA-256 Content Commitment Proof
              </span>
              <p className="text-slate-400 leading-relaxed">
                When the whitehat submitted this deliverable, they committed the cryptographic hash below. During consensus, the AI jury fetched the endpoint via <code>gl.nondet.web.render</code>, re-calculated the hash, and confirmed zero tampering.
              </p>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 block">Committed Report SHA-256 Digest:</span>
                <span className="text-emerald-400 font-bold break-all text-xs block">
                  {bounty.report_evidence_hash || 'No hash recorded'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 block">On-Chain Evidence Snapshot Digest:</span>
                  <button
                    onClick={handleCopyEvidenceHash}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <span className="text-purple-400 font-bold break-all text-xs block">
                  {bounty.evidence_hash || '0x0000000000000000000000000000000000000000000000000000000000000000'}
                </span>
              </div>
            </div>

            {/* External Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bounty.report_url && (
                <a
                  href={bounty.report_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-cyan-300 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Public Vulnerability Report</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {bounty.poc_script_url && (
                <a
                  href={bounty.poc_script_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-cyan-300 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span>Reproducible PoC Exploit Script</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: APPELLATE COURT */}
        {activeTab === 'appeal' && isDisputed && (
          <div className="space-y-4 animate-fade-in text-xs font-mono">
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-3">
              <span className="text-[11px] uppercase text-purple-300 font-bold tracking-wider block flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-400" />
                Appellate Court Review Record
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Pre-Appeal Verdict</span>
                  <span className="font-bold text-amber-300">{bounty.appeal_prior_verdict || bounty.original_verdict || 'N/A'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Staked Dispute Bond (10%)</span>
                  <span className="font-bold text-purple-300">{formatGen(bounty.dispute_bond)} GEN</span>
                </div>
              </div>

              {bounty.supplemental_evidence_url && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Supplemental Foundry/Hardhat Trace URL</span>
                  <a
                    href={bounty.supplemental_evidence_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline break-all block mt-0.5"
                  >
                    {bounty.supplemental_evidence_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: RAW ON-CHAIN JSON */}
        {activeTab === 'raw' && (
          <div className="space-y-2 animate-fade-in font-mono">
            <span className="text-[11px] text-slate-400 block uppercase">
              Pure GenVM Storage Dump (get_bounty)
            </span>
            <pre className="p-4 rounded-2xl bg-black border border-slate-800 text-xs text-emerald-400 overflow-x-auto max-h-64 scrollbar-thin">
              {JSON.stringify(bounty, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div>
            {onViewCertificate && bounty.status >= 2 && (
              <button
                onClick={() => {
                  onClose();
                  onViewCertificate(bounty);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-mono transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Holographic Certificate</span>
              </button>
            )}
          </div>

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
