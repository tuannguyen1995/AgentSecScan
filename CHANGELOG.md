# Changelog

All notable changes to the **AgentSecScan** protocol and dApp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-15

### Added
- **Intelligent Contract (`contracts/contract.py`)**:
  - `create_audit_bounty`: Protocol escrow locking with codebase repository/commit scope.
  - `submit_audit_deliverable`: Whitehat report and reproducible PoC submission with 64-char hex SHA-256 content commitment.
  - `adjudicate_security_audit`: Multi-validator AI Security Jury consensus using `gl.nondet.web.render` and `gl.vm.run_nondet` semantic consensus with security canary token `CANARY_AGENT_SEC_SCAN_V1`.
  - Non-settling `STATUS_UNRESOLVED` error protection for fetch and commitment failures.
  - 24-block (~72s) cooling-off dispute window with 10% staked dispute bond.
  - `adjudicate_appeal`: Supreme Appellate Security Council re-evaluation against bound execution trace.
  - `finalize_settlement`: Uncontested automated payout execution with double-payout elimination.
  - `cancel_or_reclaim`: Protocol team escrow reclamation after expiration without deliverables.
  - Pull-payment fallback pattern: `_safe_transfer` and `claim_payout`.
  - Storage mapping using `TreeMap[str, AuditBounty]` and `DynArray[str]`.
- **Live Studionet Deployment**:
  - Deployed on GenLayer Studionet (Chain ID 61999) at address `0xe991eb664f0e4551545929600b8cfe0Fc8EB9941`.
  - Verification record recorded in `deployment.json`.
- **Test Suite (`tests/test_agentsecscan.py`)**:
  - Critical vulnerability payout test (100% bounty disbursement).
  - Fetch failure produces unresolved state and blocks finalize settlement.
  - SHA-256 report content commitment mismatch verification.
  - Partial severity payout (40% to researcher, 60% refund to protocol).
  - Dispute and appeal flow with 10% bond and appellate overturning.
- **Frontend War Room dApp (`frontend/`)**:
  - Web3 Security War Room theme (`#070A12`, `#0F172A`, cyan `#06B6D4`, emerald `#10B981`, crimson `#EF4444`).
  - MetaMask integration with automatic Studionet chain switching helper (`0xF22F`).
  - Real-time RPC balance and aggregated protocol statistics.
  - Interactive Bounty Cards with Severity meter and PoC reproducibility gauge.
  - Whitehat deliverable submission modal with client-side SHA-256 hash generator.
  - AI Security Jury Findings Inspector modal.
  - Appellate dispute portal with 10% bond calculation.
  - Pull-payment buffered balance withdrawal button.
  - Quick 1-click test scenarios for hackathon judges and evaluators.
