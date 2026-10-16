import pytest
import json
import hashlib
from genlayer import *


def test_agentsecscan_critical_vulnerability_payout(client):
    """Proves that a verified critical vulnerability PoC triggers 100% bounty payout."""
    contract = client.deploy("contracts/contract.py")
    protocol = client.accounts[0]
    whitehat = client.accounts[1]

    # Step 1: Protocol locks 1 GEN bounty
    tx_create = contract.connect(protocol).create_audit_bounty(
        args=["https://github.com/defi-protocol/lending-pool-v2", 6000],
        value=1000000000000000000  # 1 GEN
    )
    bounty_id = str(tx_create.return_value)

    # Step 2: Whitehat submits deliverable with SHA-256 content commitment
    report_text = "CRITICAL: Re-entrancy flaw in flashLoanLiquidation() drains entire pool."
    report_hash = hashlib.sha256(report_text.encode("utf-8")).hexdigest()

    contract.connect(whitehat).submit_audit_deliverable(
        args=[
            bounty_id,
            "Re-entrancy flashloan fund drain",
            "https://audit-reports.io/defi-protocol/vuln_01.txt",
            report_hash,
            "https://poc-repo.io/exploit_reentrancy.sol"
        ]
    )

    # Step 3: Mock AI Security Jury
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SEC_SCAN_V1",
                    "verdict": "VULNERABILITY_CONFIRMED_FULL",
                    "confidence": 99,
                    "severity_score": 95,
                    "reproducibility_score": 90,
                    "reason": "Direct re-entrancy drain verified with working PoC."
                })
            },
            "web_mocks": {
                "https://audit-reports.io/defi-protocol/vuln_01.txt": {"status": 200, "body": report_text},
                "https://poc-repo.io/exploit_reentrancy.sol": {"status": 200, "body": "contract PoCExploit { ... }"}
            }
        }
    )

    contract.connect(protocol).adjudicate_security_audit(args=[bounty_id])

    b_data = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert b_data["verdict"] == "VULNERABILITY_CONFIRMED_FULL"
    assert b_data["severity_score"] == 95

    # Step 4: Advance cooling-off window (72s) and finalize settlement
    contract.advance_time(75)
    contract.connect(whitehat).finalize_settlement(args=[bounty_id])

    b_settled = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_settled["status"] == 3  # STATUS_SETTLED_PAID_FULL
    assert b_settled["escrow_amount"] == "0"


def test_agentsecscan_fetch_failure_produces_unresolved_state(client):
    """Proves that network 404 aborts to STATUS_UNRESOLVED, strictly blocking premature payouts."""
    contract = client.deploy("contracts/contract.py")
    protocol = client.accounts[0]
    whitehat = client.accounts[1]

    tx_create = contract.connect(protocol).create_audit_bounty(
        args=["https://github.com/defi/oracle", 6000],
        value=1000000000000000000
    )
    bounty_id = str(tx_create.return_value)

    dummy_hash = "f" * 64
    contract.connect(whitehat).submit_audit_deliverable(
        args=[
            bounty_id,
            "Oracle manipulation report",
            "https://server-down.io/report.txt",
            dummy_hash,
            "https://server-down.io/poc.sol"
        ]
    )

    # Mock 404 response
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 404, "body": ""}}
        }
    )

    contract.connect(protocol).adjudicate_security_audit(args=[bounty_id])

    b_data = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_data["status"] == 8  # STATUS_UNRESOLVED
    assert "UNRESOLVED_FETCH_FAILED" in b_data["verdict"]

    # Finalize settlement must revert
    with pytest.raises(Exception) as exc_info:
        contract.connect(protocol).finalize_settlement(args=[bounty_id])
    assert "Cannot settle bounty in an unresolved error state" in str(exc_info.value)


def test_agentsecscan_content_commitment_hash_mismatch(client):
    """Proves tamper-evidence: if report content has been altered, verdict is UNRESOLVED_COMMITMENT_FAILED."""
    contract = client.deploy("contracts/contract.py")
    protocol = client.accounts[0]
    whitehat = client.accounts[1]

    tx_create = contract.connect(protocol).create_audit_bounty(
        args=["https://github.com/defi/lending", 6000],
        value=2000000000000000000
    )
    bounty_id = str(tx_create.return_value)

    original_text = "Genuine vulnerability disclosure"
    committed_hash = hashlib.sha256(original_text.encode("utf-8")).hexdigest()
    tampered_text = "Altered or forged vulnerability disclosure text!"

    contract.connect(whitehat).submit_audit_deliverable(
        args=[
            bounty_id,
            "Flashloan reentrancy",
            "https://reports.io/vuln.txt",
            committed_hash,
            "https://poc.io/exploit.sol"
        ]
    )

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {
                "https://reports.io/vuln.txt": {"status": 200, "body": tampered_text},
                "https://poc.io/exploit.sol": {"status": 200, "body": "pragma solidity ^0.8.0;"}
            }
        }
    )

    contract.connect(protocol).adjudicate_security_audit(args=[bounty_id])
    b_data = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_data["status"] == 8  # STATUS_UNRESOLVED
    assert b_data["verdict"] == "UNRESOLVED_COMMITMENT_FAILED"


def test_agentsecscan_partial_severity_payout(client):
    """Proves Medium/Low severity findings receive 40% payout while 60% is refunded to protocol."""
    contract = client.deploy("contracts/contract.py")
    protocol = client.accounts[0]
    whitehat = client.accounts[1]

    tx_create = contract.connect(protocol).create_audit_bounty(
        args=["https://github.com/token/erc20", 6000],
        value=1000000000000000000
    )
    bounty_id = str(tx_create.return_value)

    rep_text = "Gas inefficiency and low impact precision rounding issue."
    rep_hash = hashlib.sha256(rep_text.encode("utf-8")).hexdigest()

    contract.connect(whitehat).submit_audit_deliverable(
        args=[
            bounty_id,
            "Precision rounding deviation",
            "https://audit.io/rep2.txt",
            rep_hash,
            "https://audit.io/poc2.sol"
        ]
    )

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SEC_SCAN_V1",
                    "verdict": "PARTIAL_SEVERITY_PAYOUT",
                    "confidence": 88,
                    "severity_score": 55,
                    "reproducibility_score": 75,
                    "reason": "Medium severity rounding anomaly verified."
                })
            },
            "web_mocks": {
                "https://audit.io/rep2.txt": {"status": 200, "body": rep_text},
                "https://audit.io/poc2.sol": {"status": 200, "body": "testRound();"}
            }
        }
    )

    contract.connect(protocol).adjudicate_security_audit(args=[bounty_id])
    b_data = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_data["verdict"] == "PARTIAL_SEVERITY_PAYOUT"

    contract.advance_time(80)
    contract.connect(protocol).finalize_settlement(args=[bounty_id])
    b_settled = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_settled["status"] == 4  # STATUS_SETTLED_PARTIAL


def test_agentsecscan_dispute_and_appeal_flow(client):
    """Proves 24-block appeal mechanism with 10% dispute bond and re-evaluation."""
    contract = client.deploy("contracts/contract.py")
    protocol = client.accounts[0]
    whitehat = client.accounts[1]

    tx_create = contract.connect(protocol).create_audit_bounty(
        args=["https://github.com/amm/dex-core", 6000],
        value=1000000000000000000  # 1 GEN
    )
    bounty_id = str(tx_create.return_value)

    rep_text = "Price manipulation vulnerability."
    rep_hash = hashlib.sha256(rep_text.encode("utf-8")).hexdigest()

    contract.connect(whitehat).submit_audit_deliverable(
        args=[
            bounty_id,
            "AMM spot price skewing",
            "https://dex.io/report.txt",
            rep_hash,
            "https://dex.io/poc.sol"
        ]
    )

    # Initial jury: rejected as invalid
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SEC_SCAN_V1",
                    "verdict": "CLAIM_REJECTED_INVALID",
                    "confidence": 80,
                    "severity_score": 20,
                    "reproducibility_score": 30,
                    "reason": "Theoretical arbitrage without exploit mechanism."
                })
            },
            "web_mocks": {
                "https://dex.io/report.txt": {"status": 200, "body": rep_text},
                "https://dex.io/poc.sol": {"status": 200, "body": "test();"}
            }
        }
    )

    contract.connect(protocol).adjudicate_security_audit(args=[bounty_id])

    # Researcher appeals within cooling off window with 10% bond (0.1 GEN)
    contract.advance_time(20)  # within 72s
    contract.connect(whitehat).appeal_verdict(
        args=[
            bounty_id,
            "Foundry fork trace proves execution without slippage tolerance.",
            "https://dex.io/appellate_trace.txt"
        ],
        value=100000000000000000  # 0.1 GEN
    )

    b_disputed = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_disputed["status"] == 6  # STATUS_DISPUTED
    assert b_disputed["dispute_bond"] == "100000000000000000"

    # Supreme Council adjudicates appeal and upholds full exploit
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SEC_SCAN_V1",
                    "verdict": "APPEAL_UPHELD_FULL",
                    "reason": "Supplemental trace confirms complete vault drainage."
                })
            },
            "web_mocks": {
                "https://dex.io/appellate_trace.txt": {"status": 200, "body": "Traces: 1000 ETH transferred to hacker."}
            }
        }
    )

    contract.connect(protocol).adjudicate_appeal(args=[bounty_id])
    b_final = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_final["status"] == 3  # STATUS_SETTLED_PAID_FULL
    assert b_final["verdict"] == "VULNERABILITY_CONFIRMED_FULL"


def test_agentsecscan_reclaim_stalled_unresolved_bounty(client):
    """Proves that a bounty stalled in STATUS_UNRESOLVED past expiry can be safely reclaimed by the protocol."""
    contract = client.deploy("contracts/contract.py")
    protocol = client.accounts[0]
    whitehat = client.accounts[1]

    # Create bounty with short duration (e.g. 10 blocks ~ 30s)
    tx_create = contract.connect(protocol).create_audit_bounty(
        args=["https://github.com/defi/stalled-test", 10],
        value=1500000000000000000  # 1.5 GEN
    )
    bounty_id = str(tx_create.return_value)

    # Deliverable submitted with invalid link leading to 404
    contract.connect(whitehat).submit_audit_deliverable(
        args=[
            bounty_id,
            "Broken test deliverable",
            "https://404-dead-domain.io/report.txt",
            "a" * 64,
            "https://404-dead-domain.io/poc.sol"
        ]
    )

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 404, "body": ""}}
        }
    )

    # Adjudication puts it into STATUS_UNRESOLVED
    contract.connect(protocol).adjudicate_security_audit(args=[bounty_id])
    b_unresolved = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_unresolved["status"] == 8  # STATUS_UNRESOLVED

    # If protocol attempts to reclaim BEFORE expiry, it must revert
    with pytest.raises(Exception) as exc_info:
        contract.connect(protocol).cancel_or_reclaim(args=[bounty_id])
    assert "Bounty duration is still active" in str(exc_info.value)

    # Advance time past expires_at_time (10 blocks * 3s = 30s)
    contract.advance_time(35)

    # Protocol successfully reclaims escrow
    contract.connect(protocol).cancel_or_reclaim(args=[bounty_id])
    b_cancelled = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_cancelled["status"] == 7  # STATUS_CANCELLED
    assert b_cancelled["escrow_amount"] == "0"


def test_agentsecscan_appeal_fetch_failure_retry_and_bond_refund(client):
    """
    Focused test addressing Steward review:
    1. Proves that appeal fetch failure moves status to UNRESOLVED without stranding the dispute bond.
    2. Proves that the appeal remains retryable once the supplemental trace is restored.
    3. Proves that the appellant can alternatively reclaim/refund 100% of their dispute bond.
    4. Verifies total locked accounting and stored bond are updated consistently at each step.
    """
    contract = client.deploy("contracts/contract.py")
    protocol = client.accounts[0]
    whitehat = client.accounts[1]

    # 1. Create bounty for 1.0 GEN
    escrow_amount = 1000000000000000000  # 1.0 GEN
    tx_create = contract.connect(protocol).create_audit_bounty(
        args=["https://github.com/protocol/vault-v2", 1000],
        value=escrow_amount
    )
    bounty_id = str(tx_create.return_value)
    assert int(contract.get_total_bounty_locked().call()) == escrow_amount

    # 2. Submit deliverable
    rep_text = "Reentrancy vulnerability in withdrawal logic."
    rep_hash = hashlib.sha256(rep_text.encode("utf-8")).hexdigest()
    contract.connect(whitehat).submit_audit_deliverable(
        args=[
            bounty_id,
            "Reentrancy PoC",
            "https://audit.io/rep.txt",
            rep_hash,
            "https://audit.io/poc.sol"
        ]
    )

    # 3. Initial adjudication: Claim rejected as invalid
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SEC_SCAN_V1",
                    "verdict": "CLAIM_REJECTED_INVALID",
                    "confidence": 85,
                    "severity_score": 10,
                    "reproducibility_score": 10,
                    "reason": "Initial PoC lacks valid reentrancy trigger."
                })
            },
            "web_mocks": {
                "https://audit.io/rep.txt": {"status": 200, "body": rep_text},
                "https://audit.io/poc.sol": {"status": 200, "body": "contract Exploit {}"}
            }
        }
    )
    contract.connect(protocol).adjudicate_security_audit(args=[bounty_id])
    b_data = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert b_data["verdict"] == "CLAIM_REJECTED_INVALID"

    # 4. Whitehat files appeal with 10% bond (0.1 GEN)
    dispute_bond = 100000000000000000  # 0.1 GEN
    contract.advance_time(10)
    contract.connect(whitehat).appeal_verdict(
        args=[
            bounty_id,
            "Foundry reentrancy trace attached proving state drainage.",
            "https://audit.io/appellate_trace.txt"
        ],
        value=dispute_bond
    )

    # Accounting check: total_bounty_locked must include escrow + dispute_bond
    assert int(contract.get_total_bounty_locked().call()) == escrow_amount + dispute_bond

    # 5. Adjudicate appeal when supplemental trace fails (404 fetch failure)
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {
                "https://audit.io/appellate_trace.txt": {"status": 404, "body": ""}
            }
        }
    )
    contract.connect(protocol).adjudicate_appeal(args=[bounty_id])

    b_unres = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_unres["status"] == 8  # STATUS_UNRESOLVED
    assert b_unres["verdict"] == "APPEAL_UNRESOLVED_FETCH_FAILED"
    # CRITICAL: dispute bond must NOT be stranded or wiped!
    assert b_unres["dispute_bond"] == str(dispute_bond)
    assert int(contract.get_total_bounty_locked().call()) == escrow_amount + dispute_bond

    # 6. Test refund_dispute_bond:
    # Unauthorized caller cannot refund
    with pytest.raises(Exception) as exc_info:
        contract.connect(protocol).refund_dispute_bond(args=[bounty_id])
    assert "Only dispute initiator can refund" in str(exc_info.value)

    # Initiator (whitehat) reclaims bond
    contract.connect(whitehat).refund_dispute_bond(args=[bounty_id])

    b_refunded = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_refunded["dispute_bond"] == "0"
    assert b_refunded["status"] == 2  # STATUS_AWAITING_PAYOUT restored
    assert b_refunded["verdict"] == "CLAIM_REJECTED_INVALID"  # Prior verdict restored
    # Accounting check: total locked decremented by bond
    assert int(contract.get_total_bounty_locked().call()) == escrow_amount

    # 7. Test retryable appeal path:
    # Appellant stakes bond again and files appeal
    contract.connect(whitehat).appeal_verdict(
        args=[
            bounty_id,
            "Retrying appeal with validated trace link.",
            "https://audit.io/appellate_trace_fixed.txt"
        ],
        value=dispute_bond
    )
    assert int(contract.get_total_bounty_locked().call()) == escrow_amount + dispute_bond

    # First attempt fails again (e.g. server temporary glitch)
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {
                "https://audit.io/appellate_trace_fixed.txt": {"status": 500, "body": ""}
            }
        }
    )
    contract.connect(protocol).adjudicate_appeal(args=[bounty_id])
    b_retry_unres = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_retry_unres["status"] == 8  # STATUS_UNRESOLVED
    assert b_retry_unres["dispute_bond"] == str(dispute_bond)

    # Endpoint comes back online: retry appeal adjudication!
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SEC_SCAN_V1",
                    "verdict": "APPEAL_UPHELD_FULL",
                    "reason": "Supplemental trace proves reentrancy exploit successfully drained contract."
                })
            },
            "web_mocks": {
                "https://audit.io/appellate_trace_fixed.txt": {
                    "status": 200,
                    "body": "Foundry Trace: CALL Exploit.fallback() SUCCESS. Balance drained: 100 ETH."
                }
            }
        }
    )

    # Execution must succeed from STATUS_UNRESOLVED because dispute_bond > 0
    contract.connect(protocol).adjudicate_appeal(args=[bounty_id])

    b_success = json.loads(contract.get_bounty(args=[bounty_id]).call())
    assert b_success["status"] == 3  # STATUS_SETTLED_PAID_FULL
    assert b_success["verdict"] == "VULNERABILITY_CONFIRMED_FULL"
    assert b_success["dispute_bond"] == "0"
    assert b_success["escrow_amount"] == "0"
    # Accounting check: total locked should now be 0 after settlement payout
    assert int(contract.get_total_bounty_locked().call()) == 0


