# 🛡️ AgentSecScan

> **Autonomous Smart Contract Security Audit Escrow & Vulnerability Disclosure Court on GenLayer**

[![GenLayer Studionet](https://img.shields.io/badge/GenLayer-Studionet%20(61999)-06B6D4?style=for-the-badge&logo=ethereum)](https://studio.genlayer.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)
[![Tests: Passing](https://img.shields.io/badge/Tests-7%2F7%20Passing-10B981?style=for-the-badge)](tests/)

---

## ⚡ The One-Line Pitch
> *"Traditional EVM smart contracts cannot inspect Git repositories, run Proof-of-Concept exploit scripts, or compute AST severity. Without GenLayer's Intelligent Contracts and non-deterministic web/LLM consensus, decentralized, trustless vulnerability disclosure and bug bounty escrow is fundamentally impossible."*

---

## 🔍 The Real-World Problem

Every year, Web3 protocols (DeFi, Bridges, L2 rollups) pay tens of millions of dollars in bug bounties and security audits. Yet, both protocols and researchers face severe coordination failure:

1. **Protocol Downplaying & Bounty Denial**: An independent auditor discovers a critical re-entrancy flaw and submits a private disclosure. The protocol team secretly patches the vulnerability and downplays the finding to "Informational" to avoid paying the $100,000 bounty.
2. **Spam & Fake PoC Flood**: Bug bounty programs are flooded with automated AI hallucinated reports and unreproducible PoCs that waste weeks of engineering time.
3. **EVM Determinism Barrier**: Ethereum/Solidity contracts are strictly deterministic and cannot:
   - Fetch external audit reports or GitHub source files.
   - Verify cryptographic commitments against live URLs.
   - Execute or simulate exploit PoCs to determine true severity.

---

## 💡 The AgentSecScan Solution on GenLayer

**AgentSecScan** transforms bug bounties and security audits into an autonomous, economically aligned court on **GenLayer Studionet**:

- **Funded Escrow (`create_audit_bounty`)**: Protocol teams lock GEN bounty rewards on-chain, binding the codebase repository and commit scope.
- **Cryptographic Deliverable Commitment (`submit_audit_deliverable`)**: Whitehat researchers submit vulnerability reports and reproducible PoC scripts along with a **SHA-256 content commitment hash**.
- **On-Chain AI Security Jury (`adjudicate_security_audit`)**:
  - Fetches the report and PoC script via `gl.nondet.web.render`.
  - Verifies the SHA-256 commitment hash (aborts to protected `STATUS_UNRESOLVED` if modified).
  - Evaluates exploitability against **Immunefi / OWASP** rubrics using `gl.vm.run_nondet` semantic consensus.
  - Generates an objective verdict:
    - **`VULNERABILITY_CONFIRMED_FULL`** (100% payout to researcher).
    - **`PARTIAL_SEVERITY_PAYOUT`** (40% to researcher, 60% refund to protocol).
    - **`CLAIM_REJECTED_INVALID`** (0% payout, 100% refund to protocol).
- **24-Block Dispute Cooling-Off Window (`appeal_verdict`)**: A 24-block (~72 second) window permits either party to appeal to the Supreme Security Council by staking a **10% dispute bond** with supplemental Foundry debug traces.
- **Retryable Appeals & Bond Refund Guarantee (`refund_dispute_bond`)**: If an appeal cannot be resolved due to unreachable endpoints or parse errors (`APPEAL_UNRESOLVED_*`), the staked bond is strictly protected: the appeal remains retryable once connectivity is restored, and the appellant can alternatively withdraw 100% of their staked bond with zero risk of stranded capital.
- **Pull-Payment Safeguard (`claim_payout`)**: Safe disbursement buffer eliminating lost funds and re-entrancy risks.

---

## 🌐 Live Studionet Deployment

| Property | Value |
|---|---|
| **Network** | GenLayer Studionet |
| **Chain ID** | `61999` (Hex: `0xF22F`) |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Contract Address** | `0xe6B4F9E6dB77B6DdCAc6726de739d7A6C50EDAF4` |
| **Live Web3 dApp (Primary)** | [https://agentsecscan.vercel.app](https://agentsecscan.vercel.app) |
| **Live Web3 dApp (Mirror)** | [https://agentsecscan-frontend.vercel.app](https://agentsecscan-frontend.vercel.app) |

---

## 📁 Repository Structure

```
AgentSecScan/
├── contracts/
│   └── contract.py             # GenLayer Intelligent Contract (Storage, Consensus, Court)
├── tests/
│   ├── conftest.py             # Mock GenVM simulator fixture
│   └── test_agentsecscan.py    # 5 comprehensive pytest test suites
├── scripts/
│   └── deploy_studionet.py     # Automated deployment script for GenLayer Studionet
├── frontend/                   # Web3 Security Audit War Room (React 18 + Vite + TS + Tailwind)
│   ├── src/
│   │   ├── config/genlayer.ts  # Viem & genlayer-js Studionet client configuration
│   │   ├── components/         # Navbar, StatsOverview, BountyCard, Modals, etc.
│   │   └── App.tsx             # Main dashboard application
│   ├── package.json
│   └── vite.config.ts
├── deployment.json             # Authoritative Studionet deployment receipt
├── ARCHITECTURE.md             # In-depth architectural specification
├── CHANGELOG.md                # Release versioning history
├── SECURITY.md                 # Vulnerability disclosure policy
└── LICENSE                     # MIT License
```

---

## 🚀 Getting Started & Local Development

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- MetaMask wallet connected to GenLayer Studionet

### 2. Contract Testing
```bash
# Run the complete test suite
pytest -v
```

### 3. Deploying to Studionet
```bash
# Deploys contract.py to GenLayer Studionet and writes deployment.json
python scripts/deploy_studionet.py
```

### 4. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to interact with the live War Room dApp.

---

## 🔒 Security & Edge-Case Engineering

- **Canary Defense Token (`CANARY_AGENT_SEC_SCAN_V1`)**: Protects the validator LLM against prompt injection attacks embedded inside untrusted code submissions.
- **Tamper-Evident SHA-256 Commitments**: Ensures researchers cannot alter reports after initial submission.
- **Double-Payout Protection**: `escrow_amount` is zeroed out atomically during settlement before native token transfer.
- **Fail-Safe Unresolved State**: HTTP 404s or parse errors abort directly to `STATUS_UNRESOLVED`, strictly preventing premature or erroneous fund disbursements.
