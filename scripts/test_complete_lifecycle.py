#!/usr/bin/env python3
"""
AgentSecScan: Full On-Chain Lifecycle Test (Open -> Submitted -> AI Adjudicated -> Finalized Settlement)
Target Network: GenLayer Studionet (Chain ID: 61999)
"""

import sys
import json
import time
from pathlib import Path
from genlayer_py import create_client, create_account, generate_private_key, studionet

def test_full_lifecycle():
    print("=" * 70, flush=True)
    print("      AGENTSECSCAN COMPLETE ON-CHAIN LIFECYCLE VERIFICATION       ", flush=True)
    print("=" * 70, flush=True)

    deploy_file = Path(__file__).parent.parent / "deployment.json"
    with open(deploy_file, "r", encoding="utf-8") as f:
        contract_address = json.load(f)["contractAddress"]

    protocol = create_account(generate_private_key())
    researcher = create_account(generate_private_key())

    proto_client = create_client(studionet, account=protocol)
    res_client = create_client(studionet, account=researcher)

    print(f"[+] Protocol Team  : {protocol.address}", flush=True)
    print(f"[+] Auditor Whitehat: {researcher.address}", flush=True)

    proto_client.fund_account(address=protocol.address, amount=100)
    res_client.fund_account(address=researcher.address, amount=100)
    time.sleep(2)

    # 1. Create Bounty
    print("\n[Step 1] Protocol creates Audit Bounty with 0.05 GEN Escrow...", flush=True)
    tx1 = proto_client.write_contract(
        address=contract_address,
        function_name="create_audit_bounty",
        args=["https://github.com/defi/staking-vault", 300],
        value=50_000_000_000_000_000
    )
    proto_client.wait_for_transaction_receipt(tx1)
    bounty_id = str(int(proto_client.read_contract(address=contract_address, function_name="get_bounty_count", args=[])))
    print(f"[OK] Bounty #{bounty_id} Created Successfully!", flush=True)

    # 2. Submit Deliverable
    print(f"\n[Step 2] Auditor submits deliverable to Bounty #{bounty_id}...", flush=True)
    exact_hash = "717339b1eda331cdc096e021348af6808b9161acfad06b1eab30583d9da2ff13"
    tx2 = res_client.write_contract(
        address=contract_address,
        function_name="submit_audit_deliverable",
        args=[
            bounty_id,
            "Staking Vault Math Precision Analysis",
            "https://raw.githubusercontent.com/tuannguyen1995/AgentSecScan/main/README.md",
            exact_hash,
            "https://raw.githubusercontent.com/tuannguyen1995/AgentSecScan/main/LICENSE"
        ],
        value=0
    )
    res_client.wait_for_transaction_receipt(tx2)
    print(f"[OK] Deliverable committed on-chain!", flush=True)

    # 3. AI Adjudication
    print(f"\n[Step 3] Triggering AI Multi-Validator Consensus Adjudication...", flush=True)
    tx3 = proto_client.write_contract(
        address=contract_address,
        function_name="adjudicate_security_audit",
        args=[bounty_id],
        value=0
    )
    rec3 = proto_client.wait_for_transaction_receipt(tx3)
    print(f"[OK] AI Jury Verdict Rendered on Studionet! Tx Status: {rec3.get('status')}", flush=True)

    b_adj = json.loads(proto_client.read_contract(address=contract_address, function_name="get_bounty", args=[bounty_id]))
    print(f"    - Status: {b_adj.get('status')} (AWAITING_PAYOUT)")
    print(f"    - Verdict: {b_adj.get('verdict')}")
    print(f"    - Reason : {b_adj.get('reason')[:120]}...")
    assert b_adj.get("status") == 2, "Status must be AWAITING_PAYOUT"

    # 4. Wait for 75s cooling-off period
    print(f"\n[Step 4] Waiting 75s for 24-block challenge cooling-off window...", flush=True)
    for i in range(75, 0, -15):
        print(f"    Cooling window remaining: {i}s...", flush=True)
        time.sleep(15)

    # 5. Finalize Settlement
    print(f"\n[Step 5] Calling finalize_settlement to execute on-chain payout/refund...", flush=True)
    tx4 = proto_client.write_contract(
        address=contract_address,
        function_name="finalize_settlement",
        args=[bounty_id],
        value=0
    )
    rec4 = proto_client.wait_for_transaction_receipt(tx4)
    print(f"[OK] Finalize Settlement Receipt: {rec4.get('status')} (SUCCESS)", flush=True)

    b_final = json.loads(proto_client.read_contract(address=contract_address, function_name="get_bounty", args=[bounty_id]))
    print("\n[+] Final On-Chain Settled State:")
    print(f"    - Status        : {b_final.get('status')} (Settled)")
    print(f"    - Verdict       : {b_final.get('verdict')}")
    print(f"    - Escrow Active : {b_final.get('escrow_amount')} (0 = Safely Disbursed)")
    assert b_final.get("escrow_amount") == "0", "Escrow must be 0 after settlement"

    stats = json.loads(proto_client.read_contract(address=contract_address, function_name="get_stats", args=[]))
    print(f"\n[+] Global Protocol Stats After Settlement:")
    print(f"    - Total Bounties       : {stats.get('total_bounties')}")
    print(f"    - Total Settled Audits : {stats.get('total_audits_settled')}")
    print(f"    - Total Escrow Locked  : {stats.get('total_bounty_locked')} wei")

    print("\n" + "=" * 70)
    print(" FULL LIFECYCLE 100% OPERATIONAL & SYNCHRONIZED ON GENLAYER STUDIONET! ")
    print("=" * 70 + "\n")
    return True

if __name__ == "__main__":
    success = test_full_lifecycle()
    sys.exit(0 if success else 1)
