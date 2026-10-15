export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return '0x0000...0000';
  }
  const clean = address.trim();
  if (clean.length <= chars * 2 + 2) return clean;
  return `${clean.slice(0, chars + 2)}...${clean.slice(-chars)}`;
}

export function formatGen(wei: string | number | bigint): string {
  try {
    const rawStr = String(wei).trim();
    if (!rawStr || rawStr === '0') return '0.000';
    let valBig = BigInt(0);
    if (rawStr.startsWith('0x') || rawStr.startsWith('0X')) {
      valBig = BigInt(rawStr);
    } else {
      valBig = BigInt(rawStr);
    }
    const divisor = BigInt(10 ** 15); // for 3 decimals
    const genTimes1000 = valBig / divisor;
    const num = Number(genTimes1000) / 1000;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 4,
    });
  } catch (err) {
    return '0.000';
  }
}

export function parseGenToWei(genAmount: string | number): bigint {
  try {
    const num = parseFloat(String(genAmount));
    if (isNaN(num) || num <= 0) return 0n;
    const fixed = num.toFixed(6);
    const parts = fixed.split('.');
    const whole = BigInt(parts[0]) * 10n ** 18n;
    const frac = BigInt(parts[1]) * 10n ** 12n;
    return whole + frac;
  } catch {
    return 0n;
  }
}

export function formatTimestamp(ts: string | number): string {
  if (!ts || String(ts) === '0') return 'N/A';
  const num = Number(ts);
  if (isNaN(num) || num <= 0) return 'N/A';
  const date = new Date(num < 10000000000 ? num * 1000 : num);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatHash(hash: string, chars: number = 6): string {
  if (!hash) return 'N/A';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export function getStatusMeta(status: number): {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  description: string;
} {
  switch (status) {
    case 0:
      return {
        label: 'BOUNTY OPEN',
        badgeBg: 'bg-cyan-950/70',
        badgeText: 'text-cyan-400',
        borderColor: 'border-cyan-500/40',
        description: 'Funded escrow waiting for security researcher vulnerability disclosure & PoC.',
      };
    case 1:
      return {
        label: 'DELIVERABLE SUBMITTED',
        badgeBg: 'bg-indigo-950/70',
        badgeText: 'text-indigo-400',
        borderColor: 'border-indigo-500/40',
        description: 'PoC & report submitted. Ready for AI Security Jury evaluation.',
      };
    case 2:
      return {
        label: 'AWAITING PAYOUT',
        badgeBg: 'bg-amber-950/70',
        badgeText: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        description: 'Verdict rendered. 24-block (~72s) dispute cooling-off window is active.',
      };
    case 3:
      return {
        label: 'SETTLED: FULL PAYOUT',
        badgeBg: 'bg-emerald-950/70',
        badgeText: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        description: 'Critical flaw verified! 100% bounty reward disbursed to security researcher.',
      };
    case 4:
      return {
        label: 'SETTLED: PARTIAL (40/60)',
        badgeBg: 'bg-amber-950/70',
        badgeText: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        description: 'Medium/Low severity verified: 40% paid to researcher, 60% refunded to protocol.',
      };
    case 5:
      return {
        label: 'SETTLED: REJECTED',
        badgeBg: 'bg-rose-950/70',
        badgeText: 'text-rose-400',
        borderColor: 'border-rose-500/40',
        description: 'Invalid / spam PoC rejected. 100% escrow refunded to protocol team.',
      };
    case 6:
      return {
        label: 'DISPUTED (APPEAL ACTIVE)',
        badgeBg: 'bg-purple-950/70',
        badgeText: 'text-purple-400',
        borderColor: 'border-purple-500/40',
        description: 'Appeal filed with 10% staked bond. Supreme Appellate Council re-evaluating trace.',
      };
    case 7:
      return {
        label: 'CANCELLED & RECLAIMED',
        badgeBg: 'bg-slate-900',
        badgeText: 'text-slate-400',
        borderColor: 'border-slate-700',
        description: 'Bounty expired unfulfilled. Escrow reclaimed by protocol team.',
      };
    case 8:
      return {
        label: 'UNRESOLVED (PROTECTED)',
        badgeBg: 'bg-red-950/70',
        badgeText: 'text-red-400',
        borderColor: 'border-red-500/40',
        description: 'Fetch/Commitment failed. Escrow locked securely without settling.',
      };
    default:
      return {
        label: 'UNKNOWN',
        badgeBg: 'bg-slate-800',
        badgeText: 'text-slate-400',
        borderColor: 'border-slate-700',
        description: 'Unknown state.',
      };
  }
}

/**
 * Calculates cooling-off challenge window (24 blocks ≈ 72s)
 */
export function getCoolingOffRemaining(auditCompletedTime: string | number): {
  isCooling: boolean;
  secondsRemaining: number;
  percentage: number;
  formattedText: string;
} {
  const completed = Number(auditCompletedTime || 0);
  if (completed <= 0) {
    return { isCooling: false, secondsRemaining: 0, percentage: 0, formattedText: 'N/A' };
  }

  const COOLING_WINDOW_SECS = 72;
  const now = Math.floor(Date.now() / 1000);
  const deadline = completed + COOLING_WINDOW_SECS;
  const diff = deadline - now;

  if (diff > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((diff / COOLING_WINDOW_SECS) * 100)));
    return {
      isCooling: true,
      secondsRemaining: diff,
      percentage: pct,
      formattedText: `${diff}s remaining (~${Math.ceil(diff / 3)} blocks)`,
    };
  }

  return {
    isCooling: false,
    secondsRemaining: 0,
    percentage: 0,
    formattedText: 'Challenge window closed (Ready for settlement)',
  };
}

export type RoleType = 'PROTOCOL_TEAM' | 'SECURITY_RESEARCHER' | 'DISPUTE_APPELLANT' | 'PUBLIC_OBSERVER';

export interface UserRoleInfo {
  role: RoleType;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  iconName: string;
  canSubmitDeliverable: boolean;
  canAdjudicateAudit: boolean;
  canAppeal: boolean;
  canAdjudicateAppeal: boolean;
  canFinalize: boolean;
  canReclaim: boolean;
  restrictionNote?: string;
}

/**
 * Derives comprehensive role-based access permissions on a specific bounty
 */
export function getUserRoleOnBounty(
  userAddress: string | null | undefined,
  bounty: {
    protocol_team: string;
    security_researcher: string;
    dispute_initiator: string;
    status: number;
    audit_completed_time: string | number;
    expires_at_time: string | number;
  }
): UserRoleInfo {
  if (!userAddress) {
    return {
      role: 'PUBLIC_OBSERVER',
      label: 'GUEST / DISCONNECTED',
      badgeBg: 'bg-slate-900',
      badgeText: 'text-slate-400',
      borderColor: 'border-slate-800',
      iconName: 'Eye',
      canSubmitDeliverable: false,
      canAdjudicateAudit: false,
      canAppeal: false,
      canAdjudicateAppeal: false,
      canFinalize: false,
      canReclaim: false,
      restrictionNote: 'Connect MetaMask wallet on GenLayer Studionet to execute on-chain operations.',
    };
  }

  const u = userAddress.toLowerCase();
  const protocol = bounty.protocol_team.toLowerCase();
  const researcher = bounty.security_researcher?.toLowerCase();
  const appellant = bounty.dispute_initiator?.toLowerCase();

  const isProtocol = u === protocol;
  const isResearcher = researcher && u === researcher && researcher !== '0x0000000000000000000000000000000000000000';
  const isAppellant = appellant && u === appellant && appellant !== '0x0000000000000000000000000000000000000000';

  if (isProtocol) {
    return {
      role: 'PROTOCOL_TEAM',
      label: 'SPONSORING PROTOCOL',
      badgeBg: 'bg-cyan-950/90',
      badgeText: 'text-cyan-300',
      borderColor: 'border-cyan-500/60',
      iconName: 'Building',
      canSubmitDeliverable: false, // Explicit contract rule: cannot submit to own bounty
      canAdjudicateAudit: true,
      canAppeal: true,
      canAdjudicateAppeal: true,
      canFinalize: true,
      canReclaim: true,
      restrictionNote: 'Sponsoring DAO. Prohibited from submitting reports to your own bounty.',
    };
  }

  if (isResearcher) {
    return {
      role: 'SECURITY_RESEARCHER',
      label: 'WHITEHAT RESEARCHER',
      badgeBg: 'bg-emerald-950/90',
      badgeText: 'text-emerald-300',
      borderColor: 'border-emerald-500/60',
      iconName: 'Shield',
      canSubmitDeliverable: false, // Already submitted
      canAdjudicateAudit: true,
      canAppeal: true,
      canAdjudicateAppeal: true,
      canFinalize: true,
      canReclaim: false,
      restrictionNote: 'Registered auditor for this deliverable. You hold claim to verified bounty disbursements.',
    };
  }

  if (isAppellant) {
    return {
      role: 'DISPUTE_APPELLANT',
      label: 'APPELLANT (BOND STAKED)',
      badgeBg: 'bg-purple-950/90',
      badgeText: 'text-purple-300',
      borderColor: 'border-purple-500/60',
      iconName: 'Scale',
      canSubmitDeliverable: false,
      canAdjudicateAudit: false,
      canAppeal: false,
      canAdjudicateAppeal: true,
      canFinalize: false,
      canReclaim: false,
      restrictionNote: 'Appellant with 10% bond locked. Supreme Court review active.',
    };
  }

  // General whitehat/observer who hasn't submitted yet
  return {
    role: 'PUBLIC_OBSERVER',
    label: 'EXTERNAL WHITEHAT / AUDITOR',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-slate-300',
    borderColor: 'border-slate-700',
    iconName: 'UserCheck',
    canSubmitDeliverable: bounty.status === 0, // Can submit report if open!
    canAdjudicateAudit: false,
    canAppeal: false,
    canAdjudicateAppeal: false,
    canFinalize: false,
    canReclaim: false,
    restrictionNote: bounty.status === 0
      ? 'Eligible to claim this bounty by submitting vulnerability report and PoC.'
      : 'Viewing public audit disclosure record.',
  };
}

/**
 * Generates pure SVG Holographic Security Audit Certificate
 */
export function generateHolographicCertificateSvg(
  bounty: {
    bounty_id: string;
    scope_repository: string;
    vulnerability_title: string;
    escrow_amount: string;
    verdict: string;
    severity_score: number;
    reproducibility_score: number;
    confidence: number;
    evidence_hash: string;
    protocol_team: string;
    security_researcher: string;
    audit_completed_time: string | number;
  },
  contractAddress: string
): string {
  const isFull = bounty.verdict === 'VULNERABILITY_CONFIRMED_FULL';
  const isPartial = bounty.verdict === 'PARTIAL_SEVERITY_PAYOUT';
  const accentColor = isFull ? '#EF4444' : isPartial ? '#F59E0B' : '#10B981';
  const timeStr = formatTimestamp(bounty.audit_completed_time);
  const genStr = formatGen(bounty.escrow_amount);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070A12" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="${accentColor}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="500" rx="20" fill="url(#bg)" stroke="url(#accent)" stroke-width="2" />

  <!-- Cyber Grid Pattern -->
  <g opacity="0.05" stroke="#06B6D4" stroke-width="1">
    <line x1="0" y1="100" x2="800" y2="100" />
    <line x1="0" y1="200" x2="800" y2="200" />
    <line x1="0" y1="300" x2="800" y2="300" />
    <line x1="0" y1="400" x2="800" y2="400" />
    <line x1="200" y1="0" x2="200" y2="500" />
    <line x1="400" y1="0" x2="400" y2="500" />
    <line x1="600" y1="0" x2="600" y2="500" />
  </g>

  <!-- Header Header Banner -->
  <rect x="30" y="30" width="740" height="60" rx="12" fill="#090D16" stroke="#1E293B" />
  <text x="50" y="65" font-family="'Space Grotesk', monospace" font-size="20" font-weight="bold" fill="#06B6D4" letter-spacing="2">
    AGENTSECSCAN // ON-CHAIN SECURITY AUDIT RESOLUTION
  </text>
  <text x="750" y="65" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="12" fill="#94A3B8">
    CASE #${bounty.bounty_id} • GENLAYER STUDIONET
  </text>

  <!-- Title & Scope -->
  <text x="50" y="130" font-family="'JetBrains Mono', monospace" font-size="12" fill="#64748B">CODEBASE SCOPE</text>
  <text x="50" y="152" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="bold" fill="#F8FAFC">
    ${bounty.scope_repository.slice(0, 70)}
  </text>

  <text x="50" y="190" font-family="'JetBrains Mono', monospace" font-size="12" fill="#64748B">VULNERABILITY CLASSIFICATION</text>
  <text x="50" y="212" font-family="'Space Grotesk', sans-serif" font-size="16" font-weight="bold" fill="#38BDF8">
    ${(bounty.vulnerability_title || 'General Codebase Audit').slice(0, 60)}
  </text>

  <!-- Metric Badges -->
  <rect x="50" y="240" width="210" height="70" rx="10" fill="#020617" stroke="#334155" />
  <text x="70" y="265" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94A3B8">EXPLOIT SEVERITY</text>
  <text x="70" y="295" font-family="'Space Grotesk', monospace" font-size="24" font-weight="bold" fill="${accentColor}">
    ${bounty.severity_score}/100
  </text>

  <rect x="280" y="240" width="210" height="70" rx="10" fill="#020617" stroke="#334155" />
  <text x="300" y="265" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94A3B8">POC REPRODUCIBILITY</text>
  <text x="300" y="295" font-family="'Space Grotesk', monospace" font-size="24" font-weight="bold" fill="#06B6D4">
    ${bounty.reproducibility_score}%
  </text>

  <rect x="510" y="240" width="240" height="70" rx="10" fill="#020617" stroke="#334155" />
  <text x="530" y="265" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94A3B8">VERDICT RESOLUTION</text>
  <text x="530" y="292" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="bold" fill="#10B981">
    ${bounty.verdict.slice(0, 24)}
  </text>

  <!-- Cryptographic Evidence Stamp -->
  <rect x="50" y="335" width="700" height="85" rx="10" fill="#030712" stroke="#1E293B" />
  <text x="70" y="360" font-family="'JetBrains Mono', monospace" font-size="10" fill="#64748B">EVIDENCE SNAPSHOT HASH (GENLAYER CONSENSUS)</text>
  <text x="70" y="380" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold" fill="#A855F7">
    ${bounty.evidence_hash || '0x0000000000000000000000000000000000000000000000000000000000000000'}
  </text>
  <text x="70" y="405" font-family="'JetBrains Mono', monospace" font-size="10" fill="#64748B">
    SPONSOR: ${formatAddress(bounty.protocol_team, 6)}  |  RESEARCHER: ${formatAddress(bounty.security_researcher, 6)}  |  BOUNTY: ${genStr} GEN
  </text>

  <!-- Footer Seal -->
  <text x="50" y="460" font-family="'JetBrains Mono', monospace" font-size="10" fill="#475569">
    INTELLIGENT CONTRACT: ${formatAddress(contractAddress, 8)}
  </text>
  <text x="750" y="460" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#10B981">
    ✓ DIGITALLY SEALED VIA GENVM ON STUDIONET (CHAIN ID: 61999)
  </text>
</svg>`;
}
