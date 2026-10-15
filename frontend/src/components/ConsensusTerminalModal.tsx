import React, { useEffect, useState } from 'react';
import { Terminal, Cpu, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';

interface ConsensusTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bountyId: string;
  status: 'running' | 'success' | 'error';
  errorMessage?: string;
  txHash?: string;
}

export const ConsensusTerminalModal: React.FC<ConsensusTerminalModalProps> = ({
  isOpen,
  onClose,
  title,
  bountyId,
  status,
  errorMessage,
  txHash,
}) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setLogs([]);
      return;
    }

    const initialLogs = [
      `[00:00.01] INITIATING: Dispatching transaction to GenLayer Studionet (Chain 61999)...`,
      `[00:00.35] BROADCAST: Transaction hash signed by MetaMask account.`,
      `[00:01.12] NONDET_ORACLE: gl.nondet.web.render reading public audit report & PoC script...`,
      `[00:02.40] INTEGRITY: SHA-256 cryptographic content commitment validation underway...`,
      `[00:03.15] GENVM_MAGISTRATE: Chief Security Auditor examining AST and re-entrancy drain vectors...`,
      `[00:04.22] CONSENSUS_VOTE: Multi-validator semantic consensus evaluation against Immunefi rubric...`,
    ];

    setLogs(initialLogs);

    if (status === 'success') {
      const timer = setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          `[00:05.10] CONSENSUS_AGREED: Multi-validator agreement validated (canary token verified).`,
          `[00:05.80] STATE_FINALIZED: On-chain state transition recorded successfully!`,
        ]);
      }, 500);
      return () => clearTimeout(timer);
    }

    if (status === 'error' && errorMessage) {
      const timer = setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          `[ERROR] Execution halted: ${errorMessage}`,
        ]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, status, errorMessage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#090D16] border border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="font-mono font-bold text-sm text-cyan-300 uppercase tracking-wider">
              GenLayer Consensual Execution Terminal
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
              Case #{bountyId}
            </span>
            {status !== 'running' && (
              <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
          {status === 'running' && (
            <>
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              <div className="text-xs font-mono">
                <span className="text-cyan-300 font-semibold">{title}</span>
                <span className="text-slate-400 block mt-0.5">
                  Validators are cross-examining PoC execution in sandboxed GenVM consensus...
                </span>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs font-mono">
                <span className="text-emerald-300 font-semibold">Consensus Reached & Finalized!</span>
                <span className="text-slate-400 block mt-0.5">
                  State transition successfully executed and sealed on Studionet.
                </span>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs font-mono">
                <span className="text-rose-300 font-semibold">Consensus Execution Failed</span>
                <span className="text-slate-400 block mt-0.5">{errorMessage}</span>
              </div>
            </>
          )}
        </div>

        {/* Monospace Log Feed */}
        <div className="p-4 rounded-xl bg-black/90 border border-slate-800 font-mono text-xs text-slate-300 h-52 overflow-y-auto space-y-1.5 scrollbar-thin">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`${
                log.includes('[ERROR]')
                  ? 'text-rose-400'
                  : log.includes('CONSENSUS_AGREED') || log.includes('STATE_FINALIZED')
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-300'
              }`}
            >
              {log}
            </div>
          ))}
          {status === 'running' && (
            <div className="flex items-center gap-1.5 text-cyan-400 animate-pulse pt-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Waiting for validator consensus blocks...</span>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <div>
            {txHash && (
              <span className="text-slate-500">
                TX: <code className="text-cyan-400">{txHash.slice(0, 16)}...</code>
              </span>
            )}
          </div>
          {status !== 'running' && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors"
            >
              Close Console
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
