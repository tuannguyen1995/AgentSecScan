import React, { useState } from 'react';
import { Send, FileText, Code2, Hash, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { submitAuditDeliverable, AuditBountyData } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface SubmitDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: AuditBountyData | null;
  contractAddress: string;
  account: string;
  onSuccess: () => void;
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  isOpen,
  onClose,
  bounty,
  contractAddress,
  account,
  onSuccess,
}) => {
  const [title, setTitle] = useState('Re-entrancy flashloan fund drain in liquidation pool');
  const [reportUrl, setReportUrl] = useState('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/flashloan_vuln.md');
  const [rawTextForHash, setRawTextForHash] = useState('CRITICAL: Re-entrancy flaw in flashLoanLiquidation() drains entire pool.');
  const [reportHash, setReportHash] = useState('e82daeb7be08960fa22d866a2b85d3f23908f293cf09ae8420e7a2b96e95bfba');
  const [pocUrl, setPocUrl] = useState('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/exploit_reentrancy.sol');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !bounty) return null;

  const handleComputeHash = async () => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(rawTextForHash);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setReportHash(hashHex);
    } catch (e: any) {
      alert(`Hash error: ${e.message}`);
    }
  };

  const handleApplyPreset = async (presetType: 'reentrancy' | 'rounding' | 'spam') => {
    if (presetType === 'reentrancy') {
      setTitle('Re-entrancy flashloan fund drain in liquidation pool');
      setReportUrl('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/flashloan_vuln.md');
      setPocUrl('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/exploit_reentrancy.sol');
      const text = 'CRITICAL: Re-entrancy flaw in flashLoanLiquidation() drains entire pool.';
      setRawTextForHash(text);
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      setReportHash(hashHex);
    } else if (presetType === 'rounding') {
      setTitle('Precision loss in fee calculation leads to token accumulation');
      setReportUrl('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/rounding_slip.md');
      setPocUrl('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/poc_rounding.sol');
      const text = 'MEDIUM: Precision loss in fee computation allows slight balance diversion.';
      setRawTextForHash(text);
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      setReportHash(hashHex);
    } else {
      setTitle('Theoretical Denial of Service in external logger');
      setReportUrl('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/spam_report.md');
      setPocUrl('https://raw.githubusercontent.com/immunefi-team/vault-reports/main/spam_poc.sol');
      const text = 'INFORMATIONAL: Out of gas on theoretical 100k loop with admin privileges.';
      setRawTextForHash(text);
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      setReportHash(hashHex);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!account) {
      setError('Please connect your MetaMask wallet first.');
      return;
    }

    if (account.toLowerCase() === bounty.protocol_team.toLowerCase()) {
      setError('Protocol team cannot submit reports to their own bounty (Role Violation).');
      return;
    }

    if (!title.trim() || title.trim().length < 5) {
      setError('Detailed vulnerability title (>= 5 chars) is required.');
      return;
    }

    if (!reportUrl.startsWith('http://') && !reportUrl.startsWith('https://')) {
      setError('Valid public report URL (http/https) required.');
      return;
    }

    if (!pocUrl.startsWith('http://') && !pocUrl.startsWith('https://')) {
      setError('Valid public PoC exploit script URL (http/https) required.');
      return;
    }

    const cleanHash = reportHash.trim().toLowerCase();
    if (cleanHash.length !== 64 || !/^[0-9a-f]{64}$/.test(cleanHash)) {
      setError('Valid 64-character hex SHA-256 content commitment hash required.');
      return;
    }

    try {
      setLoading(true);
      await submitAuditDeliverable(
        contractAddress,
        account,
        bounty.bounty_id,
        title.trim(),
        reportUrl.trim(),
        cleanHash,
        pocUrl.trim()
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submit deliverable failed:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0F172A] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                Submit Vulnerability & PoC
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Bounty #{bounty.bounty_id} • Escrow: {formatGen(bounty.escrow_amount)} GEN
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

        {/* Bounty Scope Summary */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Scope Repository: </span>
          <span className="text-cyan-300 font-semibold">{bounty.scope_repository}</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Deliverable Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Quick Whitehat Deliverable Presets
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset('reentrancy')}
              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 hover:border-emerald-500 text-emerald-300 font-mono transition-all"
            >
              Critical Flashloan Drain (100% Payout)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('rounding')}
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-700/60 hover:border-amber-500 text-amber-300 font-mono transition-all"
            >
              Medium Rounding Drift (40% Payout)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('spam')}
              className="text-xs px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-700/60 hover:border-rose-500 text-rose-300 font-mono transition-all"
            >
              Invalid / Spam PoC (Rejected)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300">Vulnerability Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Re-entrancy flashloan fund drain"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Public Audit Report URL</span>
              <span className="text-[10px] text-slate-400">Markdown / PDF / Text</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={reportUrl}
                onChange={(e) => setReportUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Cryptographic SHA-256 Content Commitment */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-cyan-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-cyan-300 font-semibold flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                <span>SHA-256 Report Content Commitment</span>
              </label>
              <button
                type="button"
                onClick={handleComputeHash}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900"
              >
                Compute Hash from Text
              </button>
            </div>

            <textarea
              rows={2}
              value={rawTextForHash}
              onChange={(e) => setRawTextForHash(e.target.value)}
              placeholder="Paste raw vulnerability report text here to verify SHA-256 hash..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none"
            />

            <input
              type="text"
              required
              value={reportHash}
              onChange={(e) => setReportHash(e.target.value)}
              placeholder="64-character lowercase hex SHA-256"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 font-mono">
              The AI Security Jury will hash the rendered endpoint and abort with UNRESOLVED_COMMITMENT_FAILED if text is altered.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Reproducible Proof-of-Concept Exploit Script URL</span>
              <span className="text-[10px] text-slate-400">Foundry / Hardhat / Solidity</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={pocUrl}
                onChange={(e) => setPocUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <Code2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Deliverable...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Deliverable on Studionet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
