import React, { useState } from 'react';
import {
  Award,
  Shield,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Coins,
  Search,
  Filter,
  UserCheck,
  Building,
  Target,
  Sparkles,
  Terminal,
  FileCheck2
} from 'lucide-react';
import { AuditBountyData } from '../config/genlayer';
import { formatAddress, formatGen } from '../utils/formatters';

interface AuditorRegistryViewProps {
  bounties: AuditBountyData[];
  onInspectBounty: (bounty: AuditBountyData) => void;
  onViewCertificate: (bounty: AuditBountyData) => void;
}

interface ResearcherStat {
  address: string;
  totalSettledEarnedGen: number;
  totalSubmissions: number;
  confirmedCount: number;
  partialCount: number;
  rejectedCount: number;
  activeReviews: number;
  bounties: AuditBountyData[];
}

interface ProtocolStat {
  address: string;
  totalDepositedGen: number;
  bountiesCreated: number;
  auditsSettled: number;
  bounties: AuditBountyData[];
}

export const AuditorRegistryView: React.FC<AuditorRegistryViewProps> = ({
  bounties,
  onInspectBounty,
  onViewCertificate,
}) => {
  const [activeTab, setActiveTab] = useState<'researchers' | 'protocols'>('researchers');
  const [searchTerm, setSearchTerm] = useState('');

  // Aggregate Researchers
  const researchersMap = new Map<string, ResearcherStat>();
  const protocolsMap = new Map<string, ProtocolStat>();

  bounties.forEach((b) => {
    // Researcher stats
    const rAddr = b.security_researcher?.toLowerCase();
    if (rAddr && rAddr !== '0x0000000000000000000000000000000000000000') {
      const existing = researchersMap.get(rAddr) || {
        address: rAddr,
        totalSettledEarnedGen: 0,
        totalSubmissions: 0,
        confirmedCount: 0,
        partialCount: 0,
        rejectedCount: 0,
        activeReviews: 0,
        bounties: [],
      };

      existing.totalSubmissions += 1;
      existing.bounties.push(b);

      const escrowNum = parseFloat(formatGen(b.escrow_amount).replace(/,/g, '')) || 0;
      if (b.status === 3) {
        // FULL
        existing.confirmedCount += 1;
        existing.totalSettledEarnedGen += escrowNum;
      } else if (b.status === 4) {
        // PARTIAL 40%
        existing.partialCount += 1;
        existing.totalSettledEarnedGen += escrowNum * 0.4;
      } else if (b.status === 5) {
        existing.rejectedCount += 1;
      } else if (b.status === 1 || b.status === 2 || b.status === 6) {
        existing.activeReviews += 1;
      }

      researchersMap.set(rAddr, existing);
    }

    // Protocol stats
    const pAddr = b.protocol_team?.toLowerCase();
    if (pAddr && pAddr !== '0x0000000000000000000000000000000000000000') {
      const existing = protocolsMap.get(pAddr) || {
        address: pAddr,
        totalDepositedGen: 0,
        bountiesCreated: 0,
        auditsSettled: 0,
        bounties: [],
      };

      existing.bountiesCreated += 1;
      existing.totalDepositedGen += parseFloat(formatGen(b.escrow_amount).replace(/,/g, '')) || 0;
      if (b.status === 3 || b.status === 4 || b.status === 5) {
        existing.auditsSettled += 1;
      }
      existing.bounties.push(b);
      protocolsMap.set(pAddr, existing);
    }
  });

  const researchers = Array.from(researchersMap.values()).filter(
    (r) =>
      r.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bounties.some((b) => b.scope_repository.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const protocols = Array.from(protocolsMap.values()).filter(
    (p) =>
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bounties.some((b) => b.scope_repository.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#070D1E] via-[#0A1633] to-[#040813] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verifiable On-Chain Security Reputation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-wide">
              Hall of Whitehats & Protocol Registry
            </h1>
            <p className="text-sm font-mono text-slate-400 max-w-2xl leading-relaxed">
              Every audit finding, PoC verification score, and escrow settlement is permanently archived on GenLayer Studionet consensus. Cryptographic meritocracy with zero centralized bias.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[120px]">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Whitehats</span>
              <span className="text-2xl font-mono font-bold text-cyan-400">{researchersMap.size}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[120px]">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Protocols</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">{protocolsMap.size}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Navigation & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Toggle View */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('researchers')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'researchers'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Whitehat Researchers ({researchersMap.size})</span>
          </button>
          <button
            onClick={() => setActiveTab('protocols')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'protocols'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Protocol Sponsors ({protocolsMap.size})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search address or repo..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Grid View */}
      {activeTab === 'researchers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {researchers.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 space-y-3">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-mono text-slate-400 font-semibold">No whitehat researchers recorded yet.</p>
              <p className="text-xs font-mono text-slate-500">
                Auditors will automatically be registered when they submit vulnerability deliverables to open escrows.
              </p>
            </div>
          ) : (
            researchers.map((r, idx) => {
              const successRate =
                r.totalSubmissions > 0
                  ? Math.round(((r.confirmedCount + r.partialCount) / r.totalSubmissions) * 100)
                  : 0;

              return (
                <div
                  key={r.address}
                  className="rounded-3xl bg-[#080D1D] border border-cyan-900/40 p-5 space-y-4 hover:border-cyan-500/60 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/50 flex items-center justify-center font-mono font-bold text-xs text-cyan-300">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                            {formatAddress(r.address)}
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 block">Verified Security Whitehat</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-500 block">Bounty Earned</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          {r.totalSettledEarnedGen.toFixed(3)} GEN
                        </span>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Jury Verification Rate</span>
                        <span className="text-cyan-400 font-bold">{successRate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${successRate}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono text-center">
                        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-1 text-emerald-400">
                          <span className="block font-bold">{r.confirmedCount}</span>
                          <span className="text-[9px] text-slate-400">Critical</span>
                        </div>
                        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-1 text-amber-400">
                          <span className="block font-bold">{r.partialCount}</span>
                          <span className="text-[9px] text-slate-400">Partial</span>
                        </div>
                        <div className="bg-rose-950/40 border border-rose-800/40 rounded-lg p-1 text-rose-400">
                          <span className="block font-bold">{r.rejectedCount}</span>
                          <span className="text-[9px] text-slate-400">Invalid</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Audits */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                        Audited Targets ({r.bounties.length})
                      </span>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {r.bounties.map((b) => (
                          <div
                            key={b.bounty_id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] font-mono"
                          >
                            <span className="text-slate-300 truncate max-w-[140px]">{b.scope_repository}</span>
                            <div className="flex items-center gap-1.5">
                              {b.status === 3 && (
                                <button
                                  onClick={() => onViewCertificate(b)}
                                  title="View Holographic Certificate"
                                  className="text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60"
                                >
                                  Cert
                                </button>
                              )}
                              <button
                                onClick={() => onInspectBounty(b)}
                                className="text-[10px] text-slate-400 hover:text-white"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {protocols.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 space-y-3">
              <Building className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-mono text-slate-400 font-semibold">No protocols registered yet.</p>
              <p className="text-xs font-mono text-slate-500">
                Protocols appear here once they create audit escrows on GenLayer Studionet.
              </p>
            </div>
          ) : (
            protocols.map((p, idx) => (
              <div
                key={p.address}
                className="rounded-3xl bg-[#080D1D] border border-emerald-900/40 p-5 space-y-4 hover:border-emerald-500/60 transition-all shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-mono font-bold text-xs text-emerald-300">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          {formatAddress(p.address)}
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 block">Sponsoring Protocol / DAO</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-500 block">Total Escrow</span>
                      <span className="text-sm font-mono font-bold text-cyan-400">
                        {p.totalDepositedGen.toFixed(3)} GEN
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Bounties Created</span>
                      <span className="font-bold text-white text-base">{p.bountiesCreated}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Settled Audits</span>
                      <span className="font-bold text-emerald-400 text-base">{p.auditsSettled}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                      Protected Repositories
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {p.bounties.map((b) => (
                        <div
                          key={b.bounty_id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] font-mono"
                        >
                          <span className="text-slate-300 truncate max-w-[140px]">{b.scope_repository}</span>
                          <button
                            onClick={() => onInspectBounty(b)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300"
                          >
                            Inspect
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
