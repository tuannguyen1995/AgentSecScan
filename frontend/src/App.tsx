import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  PlusCircle,
  Search,
  Filter,
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
  Coins
} from 'lucide-react';
import {
  DEFAULT_CONTRACT_ADDRESS,
  getSavedContractAddress,
  fetchStats,
  fetchAllBounties,
  fetchClaimableBalance,
  fetchStudionetBalance,
  ensureStudionet,
  adjudicateSecurityAudit,
  adjudicateAppeal,
  finalizeSettlement,
  cancelOrReclaim,
  AuditBountyData,
  ProtocolStats,
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_ID_HEX,
  STUDIONET_RPC_URL
} from './config/genlayer';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { BountyCard } from './components/BountyCard';
import { CreateBountyModal } from './components/CreateBountyModal';
import { SubmitDeliverableModal } from './components/SubmitDeliverableModal';
import { AuditInspectorModal } from './components/AuditInspectorModal';
import { AppealModal } from './components/AppealModal';
import { PullPayoutButton } from './components/PullPayoutButton';
import { QuickDemoBar } from './components/QuickDemoBar';
import { VulnerabilityMatrix } from './components/VulnerabilityMatrix';
import { HolographicCertificateModal } from './components/HolographicCertificateModal';
import { ConsensusTerminalModal } from './components/ConsensusTerminalModal';

export const App: React.FC = () => {
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
  const [networkCorrect, setNetworkCorrect] = useState(true);

  // Active action in flight
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'review' | 'settled'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBountyForDeliverable, setSelectedBountyForDeliverable] = useState<AuditBountyData | null>(null);
  const [selectedBountyForInspector, setSelectedBountyForInspector] = useState<AuditBountyData | null>(null);
  const [selectedBountyForAppeal, setSelectedBountyForAppeal] = useState<AuditBountyData | null>(null);
  const [selectedBountyForCertificate, setSelectedBountyForCertificate] = useState<AuditBountyData | null>(null);

  // Consensus Terminal state
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTitle, setTerminalTitle] = useState('');
  const [terminalBountyId, setTerminalBountyId] = useState('');
  const [terminalStatus, setTerminalStatus] = useState<'running' | 'success' | 'error'>('running');
  const [terminalError, setTerminalError] = useState<string | undefined>(undefined);
  const [terminalTxHash, setTerminalTxHash] = useState<string | undefined>(undefined);

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
      const [statsData, bountiesData] = await Promise.all([
        fetchStats(contractAddress),
        fetchAllBounties(contractAddress),
      ]);
      setStats(statsData);
      setBounties(bountiesData);

      if (account) {
        await loadBalances(account);
      }
    } catch (e) {
      console.error('Failed loading contract data:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [contractAddress, account]);

  // Check network on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;

      const checkChain = async () => {
        try {
          const currentChain = await eth.request({ method: 'eth_chainId' });
          const matches = currentChain?.toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase();
          setNetworkCorrect(matches);
        } catch (e) {
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

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Action: Trigger AI Security Jury Adjudication with live terminal
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

  // Filtered bounties
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

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        account={account}
        balance={balance}
        contractAddress={contractAddress}
        onConnect={connectWallet}
        onRefresh={loadData}
        onContractAddressChange={(newAddr) => {
          setContractAddress(newAddr);
        }}
        isConnecting={isConnecting}
        isRefreshing={isRefreshing}
        networkCorrect={networkCorrect}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#070A12] to-[#0F172A] border border-cyan-500/30 p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Autonomous Smart Contract Security Audit Escrow</span>
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
              Decentralized <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400">Security Audit Court</span> & Bug Bounty Escrow
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Traditional EVM cannot read GitHub repositories, compile exploit PoCs, or verify SHA-256 deliverable commitments. <strong>AgentSecScan</strong> leverages GenLayer’s Intelligent Consensus to cross-examine AST exploitability, test reproducible PoCs on-chain, and settle bug bounty disbursements without trusting either protocol teams or researchers.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm font-mono transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Launch New Audit Bounty</span>
              </button>

              <a
                href="https://studio.genlayer.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white font-mono text-sm transition-all"
              >
                <span>GenLayer Studio</span>
                <ExternalLink className="w-4 h-4 text-cyan-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Pull Payment Recovery Bar */}
        <PullPayoutButton
          contractAddress={contractAddress}
          account={account}
          claimableBalance={claimableBalance}
          onSuccess={loadData}
        />

        {/* Aggregated Protocol Stats */}
        <StatsOverview stats={stats} contractAddress={contractAddress} />

        {/* 2D Interactive Vulnerability Radar Matrix */}
        <VulnerabilityMatrix
          bounties={bounties}
          onSelectBounty={(b) => setSelectedBountyForInspector(b)}
        />

        {/* Quick Demo Bar for Evaluators */}
        <QuickDemoBar
          contractAddress={contractAddress}
          account={account}
          onRefresh={loadData}
        />

        {/* Bounties War Room Section */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-white flex items-center gap-2">
                <span>Security Audit War Room</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  {filteredBounties.length} Programs Active
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                100% on-chain audit escrows & vulnerability disclosures on GenLayer Studionet
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${activeTab === 'all' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                All ({bounties.length})
              </button>
              <button
                onClick={() => setActiveTab('open')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${activeTab === 'open' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Open ({bounties.filter(b => b.status === 0).length})
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${activeTab === 'review' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                In Review ({bounties.filter(b => b.status === 1 || b.status === 2 || b.status === 6 || b.status === 8).length})
              </button>
              <button
                onClick={() => setActiveTab('settled')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${activeTab === 'settled' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Settled ({bounties.filter(b => b.status === 3 || b.status === 4 || b.status === 5 || b.status === 7).length})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by codebase repository scope, vulnerability title, or bounty ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Cards Grid */}
          {filteredBounties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBounties.map((bounty) => (
                <BountyCard
                  key={bounty.bounty_id}
                  bounty={bounty}
                  contractAddress={contractAddress}
                  account={account}
                  onOpenSubmitDeliverable={(b) => setSelectedBountyForDeliverable(b)}
                  onOpenAuditInspector={(b) => setSelectedBountyForInspector(b)}
                  onOpenAppeal={(b) => setSelectedBountyForAppeal(b)}
                  onViewCertificate={(b) => setSelectedBountyForCertificate(b)}
                  onTriggerAdjudicate={handleTriggerAdjudicate}
                  onTriggerAppealAdjudicate={handleTriggerAppealAdjudicate}
                  onTriggerFinalize={handleTriggerFinalize}
                  onTriggerReclaim={handleTriggerReclaim}
                  isProcessingAction={processingAction}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <Shield className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="font-display font-semibold text-lg text-slate-300">
                No Security Audit Bounties Found
              </h3>
              <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">
                {searchQuery
                  ? 'No bounties matched your search query. Try clearing the filter.'
                  : 'Be the first protocol team to lock GEN escrow and invite world-class whitehat auditors.'}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Launch First Bounty</span>
              </button>
            </div>
          )}
        </div>

        {/* Architecture & How It Works Explainer */}
        <div className="bg-[#0F172A] border border-cyan-900/30 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-mono uppercase text-cyan-400 font-semibold tracking-wider">
              Under The Hood
            </span>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-white mt-1">
              How AgentSecScan Eliminates Bug Bounty Disputes
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
              Deterministic Web3 Smart Contracts cannot read external repos or run code. GenLayer makes it possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
                1
              </div>
              <h4 className="font-display font-bold text-white text-base">
                Escrow Locking & Scope Commitment
              </h4>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                Protocols lock native GEN into <code>create_audit_bounty</code> defining the repository scope. Researchers submit findings with a SHA-256 cryptographic report commitment preventing bait-and-switch.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                2
              </div>
              <h4 className="font-display font-bold text-white text-base">
                Autonomous AI Security Jury
              </h4>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                GenLayer validators execute <code>gl.nondet.web.render</code> to retrieve the report and PoC script. A sandboxed LLM extracts severity (0-100) & reproducibility (0-100%) with semantic consensus on the verdict.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 font-mono font-bold text-sm">
                3
              </div>
              <h4 className="font-display font-bold text-white text-base">
                24-Block Court & Pull Payment
              </h4>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                A 24-block (~72s) cooling window permits appeals with a 10% staked bond. Uncontested or upheld decisions trigger automatic disbursements or safe pull-payments with double-payout elimination.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#070A12] py-8 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-semibold">AgentSecScan Protocol</span>
            <span>• Deployed on GenLayer Studionet</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400">Chain ID: {STUDIONET_CHAIN_ID}</span>
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

      {/* Modals */}
      <CreateBountyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        contractAddress={contractAddress}
        account={account}
        onSuccess={loadData}
      />

      <SubmitDeliverableModal
        isOpen={Boolean(selectedBountyForDeliverable)}
        onClose={() => setSelectedBountyForDeliverable(null)}
        bounty={selectedBountyForDeliverable}
        contractAddress={contractAddress}
        account={account}
        onSuccess={loadData}
      />

      <AuditInspectorModal
        isOpen={Boolean(selectedBountyForInspector)}
        onClose={() => setSelectedBountyForInspector(null)}
        bounty={selectedBountyForInspector}
        onViewCertificate={(b) => setSelectedBountyForCertificate(b)}
      />

      <AppealModal
        isOpen={Boolean(selectedBountyForAppeal)}
        onClose={() => setSelectedBountyForAppeal(null)}
        bounty={selectedBountyForAppeal}
        contractAddress={contractAddress}
        account={account}
        onSuccess={loadData}
      />

      <HolographicCertificateModal
        isOpen={Boolean(selectedBountyForCertificate)}
        onClose={() => setSelectedBountyForCertificate(null)}
        bounty={selectedBountyForCertificate}
        contractAddress={contractAddress}
      />

      <ConsensusTerminalModal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        title={terminalTitle}
        bountyId={terminalBountyId}
        status={terminalStatus}
        errorMessage={terminalError}
        txHash={terminalTxHash}
      />
    </div>
  );
};

export default App;
