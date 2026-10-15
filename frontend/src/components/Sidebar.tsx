import React from 'react';
import {
  Shield,
  ShieldAlert,
  Crosshair,
  Scale,
  Award,
  Terminal,
  Activity,
  Cpu,
  ExternalLink,
  Layers,
  Settings,
  HelpCircle,
  Zap,
  Building,
  UserCheck
} from 'lucide-react';
import { STUDIONET_CHAIN_ID, STUDIONET_RPC_URL } from '../config/genlayer';
import { formatAddress } from '../utils/formatters';

export type ViewMode = 'war_room' | 'threat_radar' | 'appellate_court' | 'auditor_registry';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  contractAddress: string;
  account: string;
  balance: string;
  latency: number | null;
  onOpenSettings: () => void;
  onOpenRoleGuide: () => void;
  bountiesCount: number;
  disputedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  contractAddress,
  account,
  balance,
  latency,
  onOpenSettings,
  onOpenRoleGuide,
  bountiesCount,
  disputedCount,
}) => {
  return (
    <aside className="w-64 lg:w-72 bg-[#060A14] border-r border-cyan-900/30 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-cyan-900/30 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-emerald-500/10 to-transparent border border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-lg text-white tracking-wider">
                AGENT<span className="text-cyan-400">SEC</span>SCAN
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest font-semibold block">
              Autonomous Audit SOC
            </span>
          </div>
        </div>

        {/* Studionet Telemetry Pill */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${latency ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300 font-semibold">Studionet 0xF22F</span>
          </div>
          <span className="text-[10px] text-slate-500">{latency ? `${latency}ms` : 'Connecting...'}</span>
        </div>
      </div>

      {/* Navigation Desk */}
      <div className="p-4 space-y-1.5 flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
          Command Workspaces
        </div>

        {/* 1. War Room */}
        <button
          onClick={() => onSelectView('war_room')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs transition-all ${
            currentView === 'war_room'
              ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Audit War Room</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-bold">
            {bountiesCount}
          </span>
        </button>

        {/* 2. Threat Radar */}
        <button
          onClick={() => onSelectView('threat_radar')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs transition-all ${
            currentView === 'threat_radar'
              ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <span>Threat Radar (2D)</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Live Matrix</span>
        </button>

        {/* 3. Appellate Supreme Court */}
        <button
          onClick={() => onSelectView('appellate_court')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs transition-all ${
            currentView === 'appellate_court'
              ? 'bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-500/60 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)] font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <Scale className="w-4 h-4 text-purple-400" />
            <span>Appellate Court</span>
          </div>
          {disputedCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-900/80 border border-purple-500 text-purple-200 animate-pulse font-bold">
              {disputedCount} ACTIVE
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">Chamber</span>
          )}
        </button>

        {/* 4. Auditor Registry & Credentials */}
        <button
          onClick={() => onSelectView('auditor_registry')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs transition-all ${
            currentView === 'auditor_registry'
              ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Auditor Registry</span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold">Holographic</span>
        </button>

        <div className="pt-4 px-3 pb-2 text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
          Quick Tools
        </div>

        <button
          onClick={onOpenRoleGuide}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-mono text-xs text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span>Role Permissions Matrix</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-mono text-xs text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>Contract Settings</span>
        </button>
      </div>

      {/* Bottom User & Contract Status */}
      <div className="p-4 border-t border-cyan-900/30 bg-[#04070E] space-y-3">
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Intelligent Contract:</span>
            <a
              href={`https://studio.genlayer.com`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              Studio <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="text-cyan-300 font-bold text-[11px] truncate" title={contractAddress}>
            {formatAddress(contractAddress, 6)}
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-500 text-center">
          GenLayer Studionet • Consensus v1.0
        </div>
      </div>
    </aside>
  );
};
