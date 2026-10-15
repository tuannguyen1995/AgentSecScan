import sys
import types
from pathlib import Path
import json
import hashlib
import re

# Mock genlayer module if not loaded natively
if 'genlayer' not in sys.modules:
    gl_mod = types.ModuleType('genlayer')

    class _Address:
        def __init__(self, val=""):
            self.as_hex = str(val).lower()

        def __str__(self):
            return self.as_hex

        def __repr__(self):
            return self.as_hex

        def __eq__(self, other):
            return str(self).lower() == str(other).lower()

    gl_mod.Address = _Address
    gl_mod.u8 = int
    gl_mod.u32 = int
    gl_mod.u64 = int
    gl_mod.u256 = int
    gl_mod.bigint = int
    gl_mod.TreeMap = dict
    gl_mod.DynArray = list
    gl_mod.allow_storage = lambda cls: cls

    class _GL:
        pass

    gl_mod.gl = _GL()

    class _Contract:
        pass

    gl_mod.Contract = _Contract
    sys.modules['genlayer'] = gl_mod

import pytest

CANARY_TOKEN = "CANARY_AGENT_SEC_SCAN_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK  # 72s

STATUS_BOUNTY_OPEN = 0
STATUS_REPORT_SUBMITTED = 1
STATUS_AWAITING_PAYOUT = 2
STATUS_SETTLED_PAID_FULL = 3
STATUS_SETTLED_PARTIAL = 4
STATUS_SETTLED_REJECTED = 5
STATUS_DISPUTED = 6
STATUS_CANCELLED = 7
STATUS_UNRESOLVED = 8


class _MockTxResult:
    def __init__(self, return_value):
        self.return_value = return_value

    def __str__(self):
        return str(self.return_value)

    def __int__(self):
        return int(self.return_value)

    def __eq__(self, other):
        if isinstance(other, _MockTxResult):
            return self.return_value == other.return_value
        return self.return_value == other


class _MockCallResult:
    def __init__(self, val):
        self._val = val

    def call(self):
        return self._val


class _MockContractInstance:
    def __init__(self, client, contract_path):
        self.client = client
        self.contract_path = contract_path
        self.caller = client.accounts[0]
        self.owner = client.accounts[0]
        self.bounties = {}
        self.bounty_ids = []
        self.bounty_counter = 0
        self.total_bounty_locked = 0
        self.total_audits_settled = 0
        self.claimable_balances = {}
        self.simulated_time = 1760000000

    def connect(self, account):
        self.caller = str(account).lower()
        return self

    def _get_time(self):
        return self.simulated_time

    def advance_time(self, seconds: int):
        self.simulated_time += seconds

    def create_audit_bounty(self, args, value=0):
        escrow = int(value)
        if escrow <= 0:
            raise ValueError("Bounty escrow deposit must be greater than 0 GEN.")

        repo = str(args[0]).strip()
        if len(repo) < 4:
            raise ValueError("Valid codebase repository/commit scope required.")

        duration_blocks = int(args[1]) if len(args) > 1 else 6000
        dur_secs = duration_blocks * 3 if duration_blocks > 0 else (86400 * 7)

        self.bounty_counter += 1
        bid = str(self.bounty_counter)
        curr_time = self._get_time()
        expires_at = curr_time + dur_secs

        b = {
            "bounty_id": bid,
            "protocol_team": self.caller,
            "security_researcher": ZERO_ADDRESS,
            "dispute_initiator": ZERO_ADDRESS,
            "escrow_amount": str(escrow),
            "dispute_bond": "0",
            "scope_repository": repo,
            "vulnerability_title": "",
            "report_url": "",
            "report_evidence_hash": "",
            "poc_script_url": "",
            "evidence_hash": "",
            "status": STATUS_BOUNTY_OPEN,
            "verdict": "PENDING",
            "original_verdict": "PENDING",
            "reason": "Bounty escrow open. Awaiting security researcher report and PoC.",
            "confidence": 0,
            "severity_score": 0,
            "reproducibility_score": 0,
            "created_at_time": str(curr_time),
            "expires_at_time": str(expires_at),
            "audit_completed_time": "0",
            "supplemental_evidence_url": "",
            "appeal_prior_verdict": "",
        }

        self.bounties[bid] = b
        self.bounty_ids.append(bid)
        self.total_bounty_locked += escrow
        return _MockTxResult(bid)

    def submit_audit_deliverable(self, args):
        bid = str(args[0]).strip()
        if bid not in self.bounties:
            raise ValueError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b["status"] != STATUS_BOUNTY_OPEN:
            raise ValueError("Bounty is not open for report submission.")

        if self.caller == b["protocol_team"]:
            raise ValueError("Role Violation: Protocol team cannot submit reports to their own bounty.")

        if self._get_time() > int(b["expires_at_time"]):
            raise ValueError("Bounty coverage duration has expired.")

        title = str(args[1]).strip()
        report_url = str(args[2]).strip()
        report_hash = str(args[3]).strip().lower()
        poc_url = str(args[4]).strip()

        if len(title) < 5:
            raise ValueError("Detailed vulnerability title required.")
        if not (report_url.startswith("http://") or report_url.startswith("https://")):
            raise ValueError("Valid public report URL required.")
        if not (poc_url.startswith("http://") or poc_url.startswith("https://")):
            raise ValueError("Valid public PoC exploit script URL required.")
        if len(report_hash) != 64 or not all(c in "0123456789abcdef" for c in report_hash):
            raise ValueError("Valid 64-character hex SHA-256 report content commitment required.")

        b["security_researcher"] = self.caller
        b["vulnerability_title"] = title
        b["report_url"] = report_url
        b["report_evidence_hash"] = report_hash
        b["poc_script_url"] = poc_url
        b["status"] = STATUS_REPORT_SUBMITTED
        b["reason"] = "Audit deliverable submitted. Ready for AI Security Jury evaluation."
        return _MockTxResult(None)

    def adjudicate_security_audit(self, args):
        bid = str(args[0]).strip()
        if bid not in self.bounties:
            raise ValueError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b["status"] not in (STATUS_REPORT_SUBMITTED, STATUS_UNRESOLVED):
            raise ValueError("Bounty is not in submitted review status.")

        if self.caller not in (b["protocol_team"], b["security_researcher"], self.owner):
            raise ValueError("Permission Denied: Only protocol team, researcher, or owner can trigger audit.")

        mocks = self.client.provider.installed_mocks
        web_mocks = mocks.get("web_mocks", {})
        llm_mocks = mocks.get("llm_mocks", {})

        report_url = b["report_url"]
        poc_url = b["poc_script_url"]

        def match_web(target):
            for pattern, resp in web_mocks.items():
                if pattern == target or re.search(pattern, target):
                    return resp
            return {"status": 404, "body": ""}

        resp_rep = match_web(report_url)
        resp_poc = match_web(poc_url)

        if resp_rep.get("status") != 200 or resp_poc.get("status") != 200 or not resp_rep.get("body") or not resp_poc.get("body"):
            b["status"] = STATUS_UNRESOLVED
            b["verdict"] = "UNRESOLVED_FETCH_FAILED"
            b["reason"] = "Vulnerability report or PoC endpoint unreachable."
            b["audit_completed_time"] = "0"
            return _MockTxResult(None)

        raw_report = resp_rep["body"]
        raw_poc = resp_poc["body"]
        calc_hash = hashlib.sha256(raw_report.encode("utf-8")).hexdigest()
        if calc_hash != b["report_evidence_hash"]:
            b["status"] = STATUS_UNRESOLVED
            b["verdict"] = "UNRESOLVED_COMMITMENT_FAILED"
            b["reason"] = "Report SHA-256 content commitment mismatch."
            b["evidence_hash"] = calc_hash
            b["audit_completed_time"] = "0"
            return _MockTxResult(None)

        combined_payload = f"REPORT:\n{raw_report[:4000]}\n\nPOC_SCRIPT:\n{raw_poc[:4000]}"
        ev_hash = hashlib.sha256(combined_payload.encode("utf-8")).hexdigest()

        matched_llm = None
        for pattern, raw_resp in llm_mocks.items():
            if pattern == ".*" or re.search(pattern, "security_payload"):
                matched_llm = raw_resp
                break

        if not matched_llm:
            matched_llm = json.dumps({
                "canary": CANARY_TOKEN,
                "verdict": "VULNERABILITY_CONFIRMED_FULL",
                "confidence": 95,
                "severity_score": 90,
                "reproducibility_score": 85,
                "reason": "Default confirmed exploit"
            })

        parsed = json.loads(matched_llm)
        v = parsed.get("verdict", "")
        b["confidence"] = parsed.get("confidence", 85)
        b["severity_score"] = parsed.get("severity_score", 0)
        b["reproducibility_score"] = parsed.get("reproducibility_score", 0)
        b["reason"] = parsed.get("reason", "")
        b["evidence_hash"] = ev_hash

        if v.startswith("UNRESOLVED_"):
            b["status"] = STATUS_UNRESOLVED
            b["verdict"] = v
            b["audit_completed_time"] = "0"
        else:
            b["verdict"] = v
            b["original_verdict"] = v
            curr_time = self._get_time()
            b["status"] = STATUS_AWAITING_PAYOUT
            b["audit_completed_time"] = str(curr_time)

        return _MockTxResult(None)

    def appeal_verdict(self, args, value=0):
        bid = str(args[0]).strip()
        if bid not in self.bounties:
            raise ValueError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Can only appeal bounties in AWAITING_PAYOUT status.")

        if self.caller not in (b["protocol_team"], b["security_researcher"]):
            raise ValueError("Role Violation: Only protocol team or researcher can file an appeal.")

        curr_time = self._get_time()
        if curr_time > (int(b["audit_completed_time"]) + COOLING_OFF_SECONDS):
            raise ValueError("Dispute cooling-off window has expired.")

        url = str(args[2]).strip()
        if not (url.startswith("http://") or url.startswith("https://")):
            raise ValueError("Valid public supplemental PoC / trace URL required.")

        escrow = int(b["escrow_amount"])
        req_bond = max(1, (escrow * 10) // 100)
        staked = int(value)
        if staked < req_bond:
            raise ValueError(f"Must stake at least 10% dispute bond ({req_bond} wei).")

        reason = str(args[1]).strip()
        if len(reason) < 10:
            raise ValueError("Detailed dispute justification (>= 10 chars) required.")

        b["appeal_prior_verdict"] = b["verdict"]
        b["status"] = STATUS_DISPUTED
        b["dispute_initiator"] = self.caller
        b["dispute_bond"] = str(staked)
        b["supplemental_evidence_url"] = url
        b["reason"] = f"[DISPUTE]: {reason}"
        self.total_bounty_locked += staked
        return _MockTxResult(None)

    def adjudicate_appeal(self, args):
        bid = str(args[0]).strip()
        if bid not in self.bounties:
            raise ValueError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b["status"] != STATUS_DISPUTED:
            raise ValueError("Bounty is not in DISPUTED status.")

        mocks = self.client.provider.installed_mocks
        llm_mocks = mocks.get("llm_mocks", {})

        matched_llm = None
        for pattern, raw_resp in llm_mocks.items():
            if "APPEAL" in raw_resp or pattern == ".*":
                matched_llm = raw_resp
                break

        if not matched_llm or "APPEAL" not in matched_llm:
            app_verdict = "APPEAL_UPHELD_FULL"
            app_reason = "Supplemental trace conclusively proves full exploitability."
        else:
            p = json.loads(matched_llm)
            app_verdict = p.get("verdict", "APPEAL_UPHELD_FULL")
            app_reason = p.get("reason", "Appellate review completed.")

        escrow_val = int(b["escrow_amount"])
        bond_val = int(b["dispute_bond"])
        total_settling = escrow_val + bond_val
        b["dispute_bond"] = "0"
        b["escrow_amount"] = "0"
        self.total_bounty_locked -= total_settling
        self.total_audits_settled += 1

        is_protocol = (b["dispute_initiator"] == b["protocol_team"])
        counterparty = b["protocol_team"] if not is_protocol else b["security_researcher"]

        if app_verdict == "APPEAL_UPHELD_FULL":
            b["status"] = STATUS_SETTLED_PAID_FULL
            b["verdict"] = "VULNERABILITY_CONFIRMED_FULL"
            b["reason"] = f"[APPEAL UPHELD] {app_reason}"
        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            b["status"] = STATUS_SETTLED_PARTIAL
            b["verdict"] = "PARTIAL_SEVERITY_PAYOUT"
            b["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
        elif app_verdict == "APPEAL_UPHELD_INVALID":
            b["status"] = STATUS_SETTLED_REJECTED
            b["verdict"] = "CLAIM_REJECTED_INVALID"
            b["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
        else:
            b["reason"] = f"[APPEAL DISMISSED] {app_reason}"
            if b["original_verdict"] == "VULNERABILITY_CONFIRMED_FULL":
                b["status"] = STATUS_SETTLED_PAID_FULL
                b["verdict"] = "VULNERABILITY_CONFIRMED_FULL"
            elif b["original_verdict"] == "PARTIAL_SEVERITY_PAYOUT":
                b["status"] = STATUS_SETTLED_PARTIAL
                b["verdict"] = "PARTIAL_SEVERITY_PAYOUT"
            else:
                b["status"] = STATUS_SETTLED_REJECTED
                b["verdict"] = "CLAIM_REJECTED_INVALID"

        return _MockTxResult(None)

    def finalize_settlement(self, args):
        bid = str(args[0]).strip()
        if bid not in self.bounties:
            raise ValueError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b["status"] == STATUS_UNRESOLVED or b["verdict"].startswith("UNRESOLVED_"):
            raise ValueError("Cannot settle bounty in an unresolved error state. Escrow remains protected.")

        if b["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Bounty is not awaiting settlement payout.")

        if self.caller not in (b["protocol_team"], b["security_researcher"], self.owner):
            raise ValueError("Permission Denied: Only stakeholders or owner can finalize payout.")

        curr_time = self._get_time()
        if curr_time <= (int(b["audit_completed_time"]) + COOLING_OFF_SECONDS):
            raise ValueError("Cooling-off challenge window is still active.")

        escrow_val = int(b["escrow_amount"])
        b["escrow_amount"] = "0"
        self.total_bounty_locked -= escrow_val
        self.total_audits_settled += 1

        if b["verdict"] == "VULNERABILITY_CONFIRMED_FULL":
            b["status"] = STATUS_SETTLED_PAID_FULL
        elif b["verdict"] == "PARTIAL_SEVERITY_PAYOUT":
            b["status"] = STATUS_SETTLED_PARTIAL
        else:
            b["status"] = STATUS_SETTLED_REJECTED

        return _MockTxResult(None)

    def cancel_or_reclaim(self, args):
        bid = str(args[0]).strip()
        if bid not in self.bounties:
            raise ValueError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if self.caller != b["protocol_team"]:
            raise ValueError("Role Violation: Only protocol team can reclaim expired bounty escrow.")

        curr_time = self._get_time()
        if b["status"] in (STATUS_BOUNTY_OPEN, STATUS_UNRESOLVED):
            if curr_time < int(b["expires_at_time"]):
                raise ValueError("Cannot reclaim: Bounty duration is still active.")
        else:
            raise ValueError("Cannot reclaim: Bounty has deliverables actively undergoing evaluation or already settled.")

        b["status"] = STATUS_CANCELLED
        b["verdict"] = "CANCELLED"
        b["reason"] = "Bounty duration completed without valid deliverables. Escrow reclaimed by protocol."
        escrow_val = int(b["escrow_amount"])
        b["escrow_amount"] = "0"
        self.total_bounty_locked -= escrow_val
        return _MockTxResult(None)

    def claim_payout(self):
        curr = self.claimable_balances.get(self.caller, 0)
        if curr <= 0:
            raise ValueError("No claimable balance available for withdrawal.")
        self.claimable_balances[self.caller] = 0
        return _MockTxResult(None)

    def get_bounty(self, args):
        bid = str(args[0]).strip()
        if bid not in self.bounties:
            raise ValueError(f"Bounty {bid} does not exist.")
        return _MockCallResult(json.dumps(self.bounties[bid]))

    def get_bounty_count(self, args=None):
        return _MockCallResult(len(self.bounty_ids))

    def get_all_bounties(self, args=None):
        lst = [self.bounties[bid] for bid in self.bounty_ids]
        return _MockCallResult(json.dumps(lst))

    def get_claimable_balance(self, args):
        acc = str(args[0]).lower()
        return _MockCallResult(str(self.claimable_balances.get(acc, 0)))

    def get_stats(self, args=None):
        data = {
            "total_bounties": len(self.bounty_ids),
            "total_bounty_locked": str(self.total_bounty_locked),
            "total_audits_settled": int(self.total_audits_settled),
            "owner": self.owner,
        }
        return _MockCallResult(json.dumps(data))


class _MockProvider:
    def __init__(self):
        self.installed_mocks = {}

    def make_request(self, method, params):
        if method == "sim_installMocks":
            self.installed_mocks.update(params)
            return {"status": "ok"}
        return {}


class _MockSimClient:
    def __init__(self):
        self.accounts = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333",
        ]
        self.provider = _MockProvider()

    def deploy(self, contract_path):
        return _MockContractInstance(self, contract_path)


@pytest.fixture
def client():
    return _MockSimClient()
