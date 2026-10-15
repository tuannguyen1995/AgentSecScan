import React, { useState } from 'react';
import { Shield, Wallet, ExternalLink, RefreshCw, Settings, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatAddress, formatGen } from '../utils/formatters';
import {
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_ID_HEX,
  STUDIONET_RPC_URL,
  ensureStudionet,
  saveContractAddress
} from '../config/genlayer';

interface NavbarProps {
  account: string;
  balance: string;
  contractAddress: string;
  onConnect: () => void;
  onRefresh: () => void;
  onContractAddressChange: (newAddr: string) => void;
  isConnecting: boolean;
  isRefreshing: boolean;
  networkCorrect: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  contractAddress,
  onConnect,
  onRefresh,
  onContractAddressChange,
  isConnecting,
  isRefreshing,
  networkCorrect,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempAddress, setTempAddress] = useState(contractAddress);

  const handleSaveContract = () => {
    if (tempAddress.trim().startsWith('0x') && tempAddress.trim().length === 42) {
      saveContractAddress(tempAddress.trim());
      onContractAddressChange(tempAddress.trim());
      setShowSettings(false);
    } else {
      alert('Please enter a valid 42-character hex address starting with 0x');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await ensureStudionet();
    } catch (e: any) {
      alert(`Network switch failed: ${e.message}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070A12]/90 backdrop-blur-md border-b border-cyan-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl tracking-wider text-white">
                AGENT<span className="text-cyan-400">SEC</span>SCAN
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase">
                v1.0 Studionet
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono hidden sm:block">
              Autonomous Smart Contract Security Audit Escrow & Vulnerability Court
            </p>
          </div>
        </div>

        {/* Network & Wallet Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh State */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh on-chain state"
            className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Network Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
            {networkCorrect ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300">Studionet ({STUDIONET_CHAIN_ID})</span>
              </>
            ) : (
              <button
                onClick={handleSwitchNetwork}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 underline"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Switch to 0xF22F</span>
              </button>
            )}
          </div>

          {/* Contract Config Modal trigger */}
          <button
            onClick={() => {
              setTempAddress(contractAddress);
              setShowSettings(true);
            }}
            title="Configure Contract Address"
            className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-400 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Wallet Button */}
          {account ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              <div className="text-right">
                <div className="text-xs font-mono text-cyan-400 font-medium">
                  {balance} <span className="text-[10px] text-slate-400">GEN</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {formatAddress(account)}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Contract Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0F172A] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                Intelligent Contract Address
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              The contract deployed on GenLayer Studionet (Chain ID 61999). You can inspect transactions or switch to another contract deployment.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Contract Address</label>
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={`https://studio.genlayer.com`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                Open GenLayer Studio <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContract}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
