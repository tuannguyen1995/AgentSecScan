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
  // If in seconds (< 10000000000), convert to ms
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
