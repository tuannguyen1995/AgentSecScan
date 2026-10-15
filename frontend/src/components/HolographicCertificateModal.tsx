import React, { useState } from 'react';
import { Award, Download, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { AuditBountyData } from '../config/genlayer';
import { generateHolographicCertificateSvg } from '../utils/formatters';

interface HolographicCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounty: AuditBountyData | null;
  contractAddress: string;
}

export const HolographicCertificateModal: React.FC<HolographicCertificateModalProps> = ({
  isOpen,
  onClose,
  bounty,
  contractAddress,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !bounty) return null;

  const svgContent = generateHolographicCertificateSvg(bounty, contractAddress);

  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('Failed to copy SVG code.');
    }
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AgentSecScan_Certificate_Case_${bounty.bounty_id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl bg-[#0F172A] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.2)] space-y-6 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                <span>Holographic Audit Certificate</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                  On-Chain Verified
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Cryptographically bound audit verdict rendered by GenLayer Intelligent Consensus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Live SVG Preview */}
        <div
          className="w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black/50 p-2"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />

        {/* Certificate metadata */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>GenLayer Studionet On-Chain Seal (Chain ID: 61999)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This certificate is dynamically compiled directly from GenVM contract storage. It embeds the exact evidence snapshot hash <code>{bounty.evidence_hash || '0x...'}</code>, severity metrics, and consensus payout resolution.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <a
            href="https://studio.genlayer.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
          >
            Verify on GenLayer Studio <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySvg}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied SVG!' : 'Copy SVG Code'}</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <Download className="w-4 h-4" />
              <span>Download .SVG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
