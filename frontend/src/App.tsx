import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  PlusCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Code2,
  Lock,
  Scale,
  Cpu,
  Layers,
  ArrowRight,
  AlertCircle,
  Award,
  Sparkles,
  Terminal,
  Crosshair,
  Coins,
  Settings,
  HelpCircle,
  X,
  UserCheck,
  Building,
  CheckCircle2
} from 'lucide-react';
import {
  DEFAULT_CONTRACT_ADDRESS,
  getSavedContractAddress,
  saveContractAddress,
  fetchStats,
  fetchAllBounties,
  fetchClaimableBalance,
  fetchStudionetBalance,
  ensureStudionet,
  adjudicateSecurityAudit,
  adjudicateAppeal,
  refundDisputeBond,
  finalizeSettlement,
  cancelOrReclaim,
  claimPayout,
  AuditBountyData,
  ProtocolStats,
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_ID_HEX,
  STUDIONET_RPC_URL,
  STATUS_DISPUTED,
  STATUS_AWAITING_PAYOUT
} from './config/genlayer';
import { Sidebar, ViewMode } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { DockedInspector } from './components/DockedInspector';
import { AppellateCourtView } from './components/AppellateCourtView';
import { AuditorRegistryView } from './components/AuditorRegistryView';
import { VulnerabilityMatrix } from './components/VulnerabilityMatrix';
import { BountyCard } from './components/BountyCard';
import { CreateBountyModal } from './components/CreateBountyModal';
import { SubmitDeliverableModal } from './components/SubmitDeliverableModal';
import { AuditInspectorModal } from './components/AuditInspectorModal';
import { AppealModal } from './components/AppealModal';
import { HolographicCertificateModal } from './components/HolographicCertificateModal';
import { ConsensusTerminalModal } from './components/ConsensusTerminalModal';
import { QuickDemoBar } from './components/QuickDemoBar';
import { formatAddress, formatGen } from './utils/formatters';

export const App: React.FC = () => {
  // Global View Navigation
  const [currentView, setCurrentView] = useState<ViewMode>('war_room');

  // Web3 & Contract State
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.000');
  const [contractAddress, setContractAddress] = useState<string>(getSavedContractAddress());
  const [stats, setStats] = useState<ProtocolStats>({
    total_bounties: 0,
    total_bounty_locked: '0',
    total_audits_settled: 0,
  });
  const [bounties, setBounties] = useState<AuditBountyData[]>([]);
  const [claimableBalance, setClaimableBalance] = useState<string>('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [networkCorrect, setNetworkCorrect] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);

  // Active Selected Bounty for Docked Inspector
  const [selectedBountyForDocked, setSelectedBountyForDocked] = useState<AuditBountyData | null>(null);

  // In-flight Action Lock
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // War Room Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'review' | 'settled'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBountyForDeliverable, setSelectedBountyForDeliverable] = useState<AuditBountyData | null>(null);
  const [selectedBountyForInspector, setSelectedBountyForInspector] = useState<AuditBountyData | null>(null);
  const [selectedBountyForAppeal, setSelectedBountyForAppeal] = useState<AuditBountyData | null>(null);
  const [selectedBountyForCertificate, setSelectedBountyForCertificate] = useState<AuditBountyData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRoleGuideOpen, setIsRoleGuideOpen] = useState(false);
  const [tempContractAddress, setTempContractAddress] = useState(contractAddress);

  // Consensus Terminal state
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTitle, setTerminalTitle] = useState('');
  const [terminalBountyId, setTerminalBountyId] = useState('');
  const [terminalStatus, setTerminalStatus] = useState<'running' | 'success' | 'error'>('running');
  const [terminalError, setTerminalError] = useState<string | undefined>(undefined);
  const [terminalTxHash, setTerminalTxHash] = useState<string | undefined>(undefined);

  // Ping Latency
  const measureLatency = async () => {
    const start = performance.now();
    try {
      await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      });
      const end = performance.now();
      setLatency(Math.round(end - start));
    } catch {
      setLatency(null);
    }
  };

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask is not detected. Please install MetaMask to interact with AgentSecScan on Studionet.');
      return;
    }

    try {
      setIsConnecting(true);
      await ensureStudionet();
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        loadBalances(accounts[0]);
      }
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      alert(`Wallet connection failed: ${err?.message || err}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadBalances = async (userAddr: string) => {
    if (!userAddr) return;
    const bal = await fetchStudionetBalance(userAddr);
    setBalance(bal);
    const claimable = await fetchClaimableBalance(contractAddress, userAddr);
    setClaimableBalance(claimable);
  };

  // Fetch all on-chain data
  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      measureLatency();
      const [statsData, bountiesData] = await Promise.all([
        fetchStats(contractAddress),
        fetchAllBounties(contractAddress),
      ]);
      setStats(statsData);
      setBounties(bountiesData);

      // Default selected docked bounty if none selected
      setSelectedBountyForDocked((prev) => {
        if (prev) {
          const updated = bountiesData.find((b) => b.bounty_id === prev.bounty_id);
          return updated || bountiesData[0] || null;
        }
        return bountiesData[0] || null;
      });

      if (account) {
        await loadBalances(account);
      }
    } catch (e) {
      console.error('Failed loading contract data:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [contractAddress, account]);

  // Network listener & auto-load
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;

      const checkChain = async () => {
        try {
          const currentChain = await eth.request({ method: 'eth_chainId' });
          const matches = currentChain?.toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase();
          setNetworkCorrect(matches);
        } catch {
          // ignore
        }
      };

      checkChain();

      const handleChainChanged = (chainId: string) => {
        const matches = chainId?.toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase();
        setNetworkCorrect(matches);
        loadData();
      };

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadBalances(accounts[0]);
        } else {
          setAccount('');
          setBalance('0.000');
          setClaimableBalance('0');
        }
      };

      eth.on('chainChanged', handleChainChanged);
      eth.on('accountsChanged', handleAccountsChanged);

      return () => {
        eth.removeListener('chainChanged', handleChainChanged);
        eth.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Action: Trigger AI Security Jury Adjudication
  const handleTriggerAdjudicate = async (bountyId: string) => {
    if (!account) return alert('Please connect wallet');

    try {
      setProcessingAction(`adjudicate_${bountyId}`);
      setTerminalBountyId(bountyId);
      setTerminalTitle('AI Security Jury Multi-Validator Consensus Adjudication');
      setTerminalStatus('running');
      setTerminalError(undefined);
      setTerminalTxHash(undefined);
      setTerminalOpen(true);

      const res = await adjudicateSecurityAudit(contractAddress, account, bountyId);
      const tx = typeof res === 'string' ? res : (res as any)?.hash || (res as any)?.transactionHash;
      if (tx) setTerminalTxHash(String(tx));

      setTerminalStatus('success');
      await loadData();
    } catch (err: any) {
      console.error('Adjudicate error:', err);
      setTerminalStatus('error');
      setTerminalError(err?.message || 'Transaction rejected or consensus error');
    } finally {
      setProcessingAction(null);
    }
  };

  // Action: Adjudicate Appeal
  const handleTriggerAppealAdjudicate = async (bountyId: string) => {
    if (!account) return alert('Please connect wallet');

    try {
      setProcessingAction(`appeal_adjudicate_${bountyId}`);
      setTerminalBountyId(bountyId);
      setTerminalTitle('Supreme Appellate Council Re-Evaluation with Bound Trace');
      setTerminalStatus('running');
      setTerminalError(undefined);
      setTerminalTxHash(undefined);
      setTerminalOpen(true);

      const res = await adjudicateAppeal(contractAddress, account, bountyId);
      const tx = typeof res === 'string' ? res : (res as any)?.hash || (res as any)?.transactionHash;
      if (tx) setTerminalTxHash(String(tx));

      setTerminalStatus('success');
      await loadData();
    } catch (err: any) {
      console.error('Appeal adjudicate error:', err);
      setTerminalStatus('error');
      setTerminalError(err?.message || 'Appellate transaction failed');
    } finally {
      setProcessingAction(null);
    }
  };

  // Action: Refund Staked Dispute Bond
  const handleTriggerRefundDisputeBond = async (bountyId: string) => {
    if (!account) return alert('Please connect wallet');

    try {
      setProcessingAction(`refund_bond_${bountyId}`);
      await refundDisputeBond(contractAddress, account, bountyId);
      await loadData();
      alert('Dispute bond refunded successfully! Prior verdict restored.');
    } catch (err: any) {
      console.error('Refund dispute bond error:', err);
      alert(`Refund dispute bond failed: ${err?.message || err}`);
    } finally {
      setProcessingAction(null);
    }
  };


  // Action: Finalize Settlement
  const handleTriggerFinalize = async (bountyId: string) => {
    if (!account) return alert('Please connect wallet');

    try {
      setProcessingAction(`finalize_${bountyId}`);
      await finalizeSettlement(contractAddress, account, bountyId);
      await loadData();
    } catch (err: any) {
      console.error('Finalize settlement error:', err);
      alert(`Finalize settlement failed: ${err?.message || err}`);
    } finally {
      setProcessingAction(null);
    }
  };

  // Action: Reclaim expired escrow
  const handleTriggerReclaim = async (bountyId: string) => {
    if (!account) return alert('Please connect wallet');

    try {
      setProcessingAction(`reclaim_${bountyId}`);
      await cancelOrReclaim(contractAddress, account, bountyId);
      await loadData();
    } catch (err: any) {
      console.error('Reclaim error:', err);
      alert(`Reclaim failed: ${err?.message || err}`);
    } finally {
      setProcessingAction(null);
    }
  };

  // Action: Pull Payout
  const handleClaimPullPayout = async () => {
    if (!account) return alert('Please connect wallet');
    try {
      setIsClaiming(true);
      await claimPayout(contractAddress, account);
      await loadData();
      alert('Pull-payment withdrawn successfully to your wallet!');
    } catch (err: any) {
      console.error('Claim payout error:', err);
      alert(`Pull payout failed: ${err?.message || err}`);
    } finally {
      setIsClaiming(false);
    }
  };

  // Filtered bounties for War Room feed
  const filteredBounties = bounties.filter((b) => {
    const matchesQuery =
      b.scope_repository.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.vulnerability_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bounty_id.includes(searchQuery);

    if (!matchesQuery) return false;

    if (activeTab === 'open') return b.status === 0;
    if (activeTab === 'review') return b.status === 1 || b.status === 2 || b.status === 6 || b.status === 8;
    if (activeTab === 'settled') return b.status === 3 || b.status === 4 || b.status === 5 || b.status === 7;

    return true;
  });

  const disputedCount = bounties.filter((b) => b.status === STATUS_DISPUTED).length;

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="flex flex-1 min-h-screen overflow-x-hidden">
        {/* Left Sticky High-Tech Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          contractAddress={contractAddress}
          account={account}
          balance={balance}
          latency={latency}
          onOpenSettings={() => {
            setTempContractAddress(contractAddress);
            setIsSettingsOpen(true);
          }}
          onOpenRoleGuide={() => setIsRoleGuideOpen(true)}
          bountiesCount={bounties.length}
          disputedCount={disputedCount}
        />

        {/* Main Central Operations Field */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#060914]">
          {/* Top Real-time HeaderBar with Ticker & Wallet Controls */}
          <HeaderBar
            account={account}
            balance={balance}
            claimableBalance={claimableBalance}
            totalLocked={stats.total_bounty_locked}
            settledCount={stats.total_audits_settled}
            totalBounties={stats.total_bounties}
            onConnect={connectWallet}
            onRefresh={loadData}
            onOpenCreate={() => setIsCreateOpen(true)}
            onClaimPayout={handleClaimPullPayout}
            isConnecting={isConnecting}
            isRefreshing={isRefreshing}
            isClaiming={isClaiming}
            networkCorrect={networkCorrect}
          />

          {/* Dynamic Workspace Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto space-y-6">
            {/* Quick Demo Simulation Bar (Always accessible for evaluator ease) */}
            <QuickDemoBar
              contractAddress={contractAddress}
              account={account}
              onRefresh={loadData}
            />

            {/* ── WORKSPACE VIEW 1: AUDIT WAR ROOM (DUAL-PANE SOC) ── */}
            {currentView === 'war_room' && (
              <div className="space-y-6">
                {/* War Room Header & Filter Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-950/80 border border-cyan-900/40 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                      <h2 className="text-xl font-display font-extrabold text-white tracking-wide">
                        Audit Operations War Room
                      </h2>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                        {filteredBounties.length} Scopes Active
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      Live on-chain escrows, SHA-256 deliverable commitments, and AI-validated vulnerability disclosures.
                    </p>
                  </div>

                  {/* Filter Pill Tabs */}
                  <div className="flex items-center p-1 rounded-2xl bg-[#0B1021] border border-slate-800 font-mono text-xs overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                        activeTab === 'all'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({bounties.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('open')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                        activeTab === 'open'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Open Escrow ({bounties.filter((b) => b.status === 0).length})
                    </button>
                    <button
                      onClick={() => setActiveTab('review')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                        activeTab === 'review'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Under Review ({bounties.filter((b) => [1, 2, 6, 8].includes(b.status)).length})
                    </button>
                    <button
                      onClick={() => setActiveTab('settled')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                        activeTab === 'settled'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Settled ({bounties.filter((b) => [3, 4, 5, 7].includes(b.status)).length})
                    </button>
                  </div>
                </div>

                {/* Dual-Pane Layout: Left 60% Bounties Feed, Right 40% Docked Inspector */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column (Feed) */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by codebase repo, vulnerability title, or bounty ID..."
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
                      />
                    </div>

                    {/* Cards List */}
                    {filteredBounties.length > 0 ? (
                      <div className="space-y-4">
                        {filteredBounties.map((bounty) => {
                          const isSelected = selectedBountyForDocked?.bounty_id === bounty.bounty_id;
                          return (
                            <div
                              key={bounty.bounty_id}
                              onClick={() => setSelectedBountyForDocked(bounty)}
                              className={`cursor-pointer transition-all duration-300 rounded-3xl ${
                                isSelected
                                  ? 'ring-2 ring-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.25)]'
                                  : 'hover:border-cyan-500/50'
                              }`}
                            >
                              <BountyCard
                                bounty={bounty}
                                contractAddress={contractAddress}
                                account={account}
                                onOpenSubmitDeliverable={(b) => setSelectedBountyForDeliverable(b)}
                                onOpenAuditInspector={(b) => setSelectedBountyForDocked(b)}
                                onOpenAppeal={(b) => setSelectedBountyForAppeal(b)}
                                onViewCertificate={(b) => setSelectedBountyForCertificate(b)}
                                onTriggerAdjudicate={handleTriggerAdjudicate}
                                onTriggerAppealAdjudicate={handleTriggerAppealAdjudicate}
                                onTriggerFinalize={handleTriggerFinalize}
                                onTriggerReclaim={handleTriggerReclaim}
                                isProcessingAction={processingAction}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-16 px-6 rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 space-y-3">
                        <Shield className="w-12 h-12 text-slate-600 mx-auto" />
                        <h3 className="font-display font-bold text-lg text-slate-300">
                          No Security Bounties Found
                        </h3>
                        <p className="text-xs text-slate-500 font-mono max-w-sm mx-auto">
                          {searchQuery
                            ? 'No programs matched your filter query. Clear search to view all.'
                            : 'Lock a GEN escrow to protect your smart contracts with decentralized AI audits.'}
                        </p>
                        <button
                          onClick={() => setIsCreateOpen(true)}
                          className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Launch First Bounty</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column (Docked Threat Inspector) */}
                  <div className="lg:col-span-5 sticky top-24">
                    <DockedInspector
                      bounty={selectedBountyForDocked}
                      account={account}
                      contractAddress={contractAddress}
                      onOpenSubmitDeliverable={(b) => setSelectedBountyForDeliverable(b)}
                      onOpenAppeal={(b) => setSelectedBountyForAppeal(b)}
                      onViewCertificate={(b) => setSelectedBountyForCertificate(b)}
                      onTriggerAdjudicate={handleTriggerAdjudicate}
                      onTriggerAppealAdjudicate={handleTriggerAppealAdjudicate}
                      onTriggerFinalize={handleTriggerFinalize}
                      onTriggerReclaim={handleTriggerReclaim}
                      onTriggerRefundBond={handleTriggerRefundDisputeBond}
                      isProcessingAction={processingAction}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── WORKSPACE VIEW 2: 2D THREAT RADAR & VULNERABILITY MATRIX ── */}
            {currentView === 'threat_radar' && (
              <div className="space-y-6">
                <VulnerabilityMatrix
                  bounties={bounties}
                  onSelectBounty={(b) => {
                    setSelectedBountyForDocked(b);
                    setCurrentView('war_room');
                  }}
                />

                {/* Detailed Vulnerability Breakdown Table */}
                <div className="rounded-3xl bg-[#080D1D] border border-cyan-900/30 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-cyan-400" />
                        <span>AST Exploitability Taxonomy Index</span>
                      </h3>
                      <p className="text-xs font-mono text-slate-400">
                        Classified according to Immunefi & OWASP Smart Contract Top 10 standards.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Bounty ID</th>
                          <th className="p-3">Repository Scope</th>
                          <th className="p-3">Vulnerability Category</th>
                          <th className="p-3">Severity</th>
                          <th className="p-3">Reproducibility</th>
                          <th className="p-3">AI Verdict</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {bounties.map((b) => (
                          <tr key={b.bounty_id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3 font-bold text-cyan-400">#{b.bounty_id}</td>
                            <td className="p-3 text-slate-300 font-semibold">{b.scope_repository}</td>
                            <td className="p-3 text-slate-400">{b.vulnerability_title || 'N/A'}</td>
                            <td className="p-3">
                              <span className="font-bold text-white">{b.severity_score}/100</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-emerald-400">{b.reproducibility_score}%</span>
                            </td>
                            <td className="p-3">
                              <span className="text-[11px] font-semibold text-slate-300">{b.verdict}</span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedBountyForDocked(b);
                                  setCurrentView('war_room');
                                }}
                                className="px-3 py-1 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 hover:text-white text-[11px] transition-colors"
                              >
                                Inspect In SOC
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── WORKSPACE VIEW 3: SUPREME APPELLATE COURT ── */}
            {currentView === 'appellate_court' && (
              <AppellateCourtView
                bounties={bounties}
                account={account}
                onOpenAppeal={(b) => setSelectedBountyForAppeal(b)}
                onTriggerAppealAdjudicate={handleTriggerAppealAdjudicate}
                onTriggerRefundBond={handleTriggerRefundDisputeBond}
                onSelectBounty={(b) => {
                  setSelectedBountyForDocked(b);
                  setCurrentView('war_room');
                }}
                isProcessingAction={processingAction}
              />
            )}

            {/* ── WORKSPACE VIEW 4: WHITEHAT & PROTOCOL REGISTRY ── */}
            {currentView === 'auditor_registry' && (
              <AuditorRegistryView
                bounties={bounties}
                onInspectBounty={(b) => {
                  setSelectedBountyForDocked(b);
                  setCurrentView('war_room');
                }}
                onViewCertificate={(b) => setSelectedBountyForCertificate(b)}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-900 bg-[#04060C] py-6 px-6 text-xs font-mono text-slate-500">
            <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 font-bold">AgentSecScan Protocol SOC</span>
                <span>• Live on GenLayer Studionet</span>
              </div>
              <div className="flex items-center gap-5">
                <span>Chain ID: {STUDIONET_CHAIN_ID}</span>
                <span className="text-slate-600">|</span>
                <a
                  href="https://studio.genlayer.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  GenLayer Studio <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* ── ALL MODALS ── */}

      {/* 1. Create Bounty Modal */}
      <CreateBountyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        contractAddress={contractAddress}
        account={account}
        onSuccess={loadData}
      />

      {/* 2. Submit Deliverable Modal */}
      <SubmitDeliverableModal
        isOpen={Boolean(selectedBountyForDeliverable)}
        onClose={() => setSelectedBountyForDeliverable(null)}
        bounty={selectedBountyForDeliverable}
        contractAddress={contractAddress}
        account={account}
        onSuccess={loadData}
      />

      {/* 3. Full Audit Inspector Modal (Alternative to Docked) */}
      <AuditInspectorModal
        isOpen={Boolean(selectedBountyForInspector)}
        onClose={() => setSelectedBountyForInspector(null)}
        bounty={selectedBountyForInspector}
        onViewCertificate={(b) => setSelectedBountyForCertificate(b)}
      />

      {/* 4. Appeal Modal */}
      <AppealModal
        isOpen={Boolean(selectedBountyForAppeal)}
        onClose={() => setSelectedBountyForAppeal(null)}
        bounty={selectedBountyForAppeal}
        contractAddress={contractAddress}
        account={account}
        onSuccess={loadData}
      />

      {/* 5. Holographic Certificate Modal */}
      <HolographicCertificateModal
        isOpen={Boolean(selectedBountyForCertificate)}
        onClose={() => setSelectedBountyForCertificate(null)}
        bounty={selectedBountyForCertificate}
        contractAddress={contractAddress}
      />

      {/* 6. Consensus Terminal Modal */}
      <ConsensusTerminalModal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        title={terminalTitle}
        bountyId={terminalBountyId}
        status={terminalStatus}
        errorMessage={terminalError}
        txHash={terminalTxHash}
      />

      {/* 7. Settings Modal (Contract Switcher) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B1021] border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-bold text-lg text-white">Protocol Configuration</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <label className="block text-slate-300 font-semibold">Contract Address</label>
              <input
                type="text"
                value={tempContractAddress}
                onChange={(e) => setTempContractAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Current active contract deployed on GenLayer Studionet (Chain ID 61999).
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setTempContractAddress(DEFAULT_CONTRACT_ADDRESS);
                  saveContractAddress(DEFAULT_CONTRACT_ADDRESS);
                  setContractAddress(DEFAULT_CONTRACT_ADDRESS);
                  setIsSettingsOpen(false);
                  loadData();
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white text-xs font-mono"
              >
                Reset Default
              </button>
              <button
                onClick={() => {
                  saveContractAddress(tempContractAddress);
                  setContractAddress(tempContractAddress);
                  setIsSettingsOpen(false);
                  loadData();
                }}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs font-mono hover:bg-cyan-400 shadow-lg"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Role Guide Modal (RBAC Permissions) */}
      {isRoleGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B1021] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-bold text-lg text-white">
                  On-Chain Role-Based Access Control (RBAC)
                </h3>
              </div>
              <button
                onClick={() => setIsRoleGuideOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Building className="w-4 h-4 text-cyan-400" />
                  <span>Sponsoring Protocol / DAO</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Locks GEN tokens into escrow, defines codebase repository scope. If an audit finding is contested, the protocol team can appeal within the 24-block (~72s) window or reclaim unfulfilled escrows after expiry.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Whitehat Security Researcher</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Submits audit report and reproducible PoC exploit script with cryptographic SHA-256 evidence snapshot. Receives 100% payout for critical verified flaws or 40% for medium findings.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <Scale className="w-4 h-4 text-purple-400" />
                  <span>Dispute Appellant & Supreme Court</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Either party may contest a jury verdict by staking a 10% dispute bond and submitting supplemental Foundry traces. If upheld, the bond is refunded and awards reallocated.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsRoleGuideOpen(false)}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-all shadow-lg"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
