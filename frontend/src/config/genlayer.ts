import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { formatGen, parseGenToWei } from '../utils/formatters';

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = '0xf22f'; // 61999 in hex
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIO_URL = 'https://studio.genlayer.com';

// Authoritative Intelligent Contract deployed on GenLayer Studionet
export const DEFAULT_CONTRACT_ADDRESS = '0xe991eb664f0e4551545929600b8cfe0Fc8EB9941';

export function getSavedContractAddress(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agentsecscan_contract_address');
      if (
        stored &&
        stored.trim().startsWith('0x') &&
        stored.trim().length === 42
      ) {
        return stored.trim();
      }
    } catch (e) {
      // ignore
    }
  }
  return DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agentsecscan_contract_address', address.trim());
  }
}

/**
 * Fetch real on-chain GEN balance directly from Studionet RPC endpoint
 */
export async function fetchStudionetBalance(address: string): Promise<string> {
  if (!address) return '0.000';

  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });
    const json = await res.json();
    if (json && json.result !== undefined && json.result !== null) {
      return formatGen(json.result);
    }
  } catch (err) {
    console.warn('Direct Studionet RPC eth_getBalance error:', err);
  }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const balHex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      if (balHex) {
        return formatGen(balHex);
      }
    } catch (e) {
      console.warn('MetaMask eth_getBalance fallback error:', e);
    }
  }

  return '0.000';
}

export const STATUS_BOUNTY_OPEN = 0;
export const STATUS_REPORT_SUBMITTED = 1;
export const STATUS_AWAITING_PAYOUT = 2;
export const STATUS_SETTLED_PAID_FULL = 3;
export const STATUS_SETTLED_PARTIAL = 4;
export const STATUS_SETTLED_REJECTED = 5;
export const STATUS_DISPUTED = 6;
export const STATUS_CANCELLED = 7;
export const STATUS_UNRESOLVED = 8;

export interface AuditBountyData {
  bounty_id: string;
  protocol_team: string;
  security_researcher: string;
  dispute_initiator: string;
  escrow_amount: string;
  dispute_bond: string;
  scope_repository: string;
  vulnerability_title: string;
  report_url: string;
  report_evidence_hash: string;
  poc_script_url: string;
  evidence_hash: string;
  status: number;
  verdict: string;
  original_verdict: string;
  reason: string;
  confidence: number;
  severity_score: number;
  reproducibility_score: number;
  created_at_time: string;
  expires_at_time: string;
  audit_completed_time: string;
  supplemental_evidence_url?: string;
  appeal_prior_verdict?: string;
}

export interface ProtocolStats {
  total_bounties: number;
  total_bounty_locked: string;
  total_audits_settled: number;
  owner?: string;
}

/**
 * Get GenLayer client configured with Studionet
 */
export function getGenLayerClient(accountAddress?: string) {
  const config: any = {
    chain: studionet,
    endpoint: STUDIONET_RPC_URL,
  };

  if (typeof window !== 'undefined' && (window as any).ethereum && accountAddress) {
    config.provider = (window as any).ethereum;
    config.account = accountAddress as `0x${string}`;
  }

  return createClient(config);
}

/**
 * Switch or add GenLayer Studionet chain in MetaMask (Chain ID: 61999)
 */
export async function ensureStudionet(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to use AgentSecScan.');
  }

  const ethereum = (window as any).ethereum;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError: any) {
    if (
      switchError.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      switchError?.message?.includes('Unrecognized chain') ||
      switchError?.message?.includes('wallet_addEthereumChain')
    ) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: STUDIONET_CHAIN_ID_HEX,
              chainName: 'GenLayer Studionet',
              nativeCurrency: {
                name: 'GEN',
                symbol: 'GEN',
                decimals: 18,
              },
              rpcUrls: [STUDIONET_RPC_URL],
              blockExplorerUrls: ['https://explorer-studio.genlayer.com'],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Studionet chain to MetaMask:', addError);
        throw addError;
      }
    }
    console.error('Failed to switch to Studionet chain:', switchError);
    throw switchError;
  }
}

/**
 * Fetch aggregated protocol statistics
 */
export async function fetchStats(contractAddress: string): Promise<ProtocolStats> {
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return {
      total_bounties: 0,
      total_bounty_locked: '0',
      total_audits_settled: 0,
    };
  }

  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_stats',
      args: [],
    });

    if (typeof raw === 'string') {
      return JSON.parse(raw);
    }
    return raw as unknown as ProtocolStats;
  } catch (err) {
    console.warn('fetchStats error:', err);
    return {
      total_bounties: 0,
      total_bounty_locked: '0',
      total_audits_settled: 0,
    };
  }
}

/**
 * Fetch all registered audit bounties
 */
export async function fetchAllBounties(contractAddress: string): Promise<AuditBountyData[]> {
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return [];
  }

  const client = getGenLayerClient();

  // 1. Fast path: get_all_bounties
  try {
    const rawAll = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_all_bounties',
      args: [],
    });

    if (rawAll) {
      const parsed = typeof rawAll === 'string' ? JSON.parse(rawAll) : rawAll;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('get_all_bounties failed, falling back to iterative get_bounty:', err);
  }

  // 2. Iterative fallback
  try {
    const countRaw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_bounty_count',
      args: [],
    });
    const count = Number(countRaw || 0);
    const bounties: AuditBountyData[] = [];

    for (let i = 1; i <= count; i++) {
      try {
        const bRaw = await client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: 'get_bounty',
          args: [String(i)],
        });
        if (bRaw) {
          const b = typeof bRaw === 'string' ? JSON.parse(bRaw) : bRaw;
          bounties.push(b);
        }
      } catch (e) {
        console.warn(`Failed reading bounty ${i}:`, e);
      }
    }
    return bounties;
  } catch (err) {
    console.warn('Iterative get_bounty error:', err);
    return [];
  }
}

/**
 * Fetch single bounty
 */
export async function fetchBounty(contractAddress: string, bountyId: string): Promise<AuditBountyData | null> {
  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_bounty',
      args: [bountyId],
    });
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as AuditBountyData);
  } catch (e) {
    console.error(`Failed to fetch bounty #${bountyId}:`, e);
    return null;
  }
}

/**
 * Fetch user's claimable disbursement balance (Pull-Payment safe pattern)
 */
export async function fetchClaimableBalance(contractAddress: string, account: string): Promise<string> {
  if (!contractAddress || !account) return '0';
  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_claimable_balance',
      args: [account],
    });
    return String(raw || '0');
  } catch (err) {
    console.warn('fetchClaimableBalance error:', err);
    return '0';
  }
}

/**
 * Protocol team locks GEN bounty escrow
 */
export async function createAuditBounty(
  contractAddress: string,
  userAddress: string,
  scopeRepository: string,
  durationBlocks: number,
  escrowGen: string
) {
  const client = getGenLayerClient(userAddress);
  const weiVal = parseGenToWei(escrowGen);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'create_audit_bounty',
    args: [scopeRepository, durationBlocks],
    value: weiVal,
  });
}

/**
 * Security researcher submits vulnerability report & PoC
 */
export async function submitAuditDeliverable(
  contractAddress: string,
  userAddress: string,
  bountyId: string,
  vulnerabilityTitle: string,
  reportUrl: string,
  reportEvidenceHash: string,
  pocScriptUrl: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'submit_audit_deliverable',
    args: [bountyId, vulnerabilityTitle, reportUrl, reportEvidenceHash, pocScriptUrl],
    value: 0n,
  });
}

/**
 * Trigger AI Security Jury evaluation
 */
export async function adjudicateSecurityAudit(
  contractAddress: string,
  userAddress: string,
  bountyId: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'adjudicate_security_audit',
    args: [bountyId],
    value: 0n,
  });
}

/**
 * Appeal verdict with 10% dispute bond
 */
export async function appealVerdict(
  contractAddress: string,
  userAddress: string,
  bountyId: string,
  disputeReason: string,
  supplementalEvidenceUrl: string,
  bondWei: bigint
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'appeal_verdict',
    args: [bountyId, disputeReason, supplementalEvidenceUrl],
    value: bondWei,
  });
}

/**
 * Supreme Security Council adjudicates appeal
 */
export async function adjudicateAppeal(
  contractAddress: string,
  userAddress: string,
  bountyId: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'adjudicate_appeal',
    args: [bountyId],
    value: 0n,
  });
}

/**
 * Execute uncontested settlement payout
 */
export async function finalizeSettlement(
  contractAddress: string,
  userAddress: string,
  bountyId: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'finalize_settlement',
    args: [bountyId],
    value: 0n,
  });
}

/**
 * Protocol team reclaims expired unfulfilled escrow
 */
export async function cancelOrReclaim(
  contractAddress: string,
  userAddress: string,
  bountyId: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'cancel_or_reclaim',
    args: [bountyId],
    value: 0n,
  });
}

/**
 * Pull-payment safety withdrawal
 */
export async function claimPayout(
  contractAddress: string,
  userAddress: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'claim_payout',
    args: [],
    value: 0n,
  });
}
