# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json

CANARY_TOKEN = "CANARY_AGENT_SEC_SCAN_V1"

# Time & Cooling-Off Parameters
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = bigint(COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK)  # 72 seconds
DEFAULT_AUDIT_EXPIRY_SECONDS = bigint(86400 * 7)                      # 7 days

# Lifecycle Statuses
STATUS_BOUNTY_OPEN = u8(0)         # Protocol funded security audit / bug bounty escrow
STATUS_REPORT_SUBMITTED = u8(1)    # Whitehat submitted vulnerability report & PoC
STATUS_AWAITING_PAYOUT = u8(2)     # AI security jury rendered verdict, cooling-off active
STATUS_SETTLED_PAID_FULL = u8(3)   # Critical flaw verified, 100% bounty paid to researcher
STATUS_SETTLED_PARTIAL = u8(4)     # Medium/Low flaw verified, 40% paid to researcher, 60% refunded
STATUS_SETTLED_REJECTED = u8(5)    # Invalid report / unverified PoC, 100% refunded to protocol
STATUS_DISPUTED = u8(6)            # Under appellate review with 10% staked bond
STATUS_CANCELLED = u8(7)           # Expired unfulfilled, escrow reclaimed by protocol
STATUS_UNRESOLVED = u8(8)          # Fetch/parse/canary failure (retryable & refundable protected state)


class ContractError(Exception):
    """Domain-specific error for AgentSecScan protocol."""
    pass


def _addr_str(addr: Address) -> str:
    """Safely format an Address instance into a lowercase hex string."""
    try:
        return addr.as_hex.lower()
    except Exception:
        return str(addr).lower()


def _get_sender() -> Address:
    """Safely obtain transaction sender across GenVM runtime versions."""
    try:
        return gl.message.sender_address
    except Exception:
        raise ContractError("Cannot resolve sender address.")


def _pay_native(recipient: Address, amount: bigint) -> None:
    """Safely transfers native GEN tokens with canonical u256 cast."""
    if amount <= bigint(0):
        return
    gl.get_contract_at(recipient).emit_transfer(value=u256(int(amount)))


def _is_valid_sha256(h: str) -> bool:
    """Validate that a string is a genuine 64-character lowercase hex SHA-256 hash."""
    if not isinstance(h, str):
        return False
    h_clean = h.strip().lower()
    return len(h_clean) == 64 and all(c in "0123456789abcdef" for c in h_clean)


@allow_storage
@dataclass
class AuditBounty:
    bounty_id: str
    protocol_team: Address         # Sponsoring Protocol / DAO
    security_researcher: Address   # Whitehat / Auditor
    dispute_initiator: Address     # Appellant who staked bond
    escrow_amount: bigint          # Locked bounty / audit reward
    dispute_bond: bigint           # 10% appeal stake
    scope_repository: str          # Target codebase repository or commit hash
    vulnerability_title: str       # Short title of report
    report_url: str                # Public audit report URL
    report_evidence_hash: str      # SHA-256 hash of report text
    poc_script_url: str            # Reproducible Proof-of-Concept exploit script URL
    evidence_hash: str             # Cryptographic snapshot hash
    status: u8
    verdict: str
    original_verdict: str          # Preserved pre-appeal verdict
    reason: str
    confidence: u8
    severity_score: u8             # 0-100: Exploitability and financial impact score
    reproducibility_score: u8      # 0-100: PoC reproducibility percentage
    created_at_time: bigint        # Trusted Unix timestamp when bounty created
    expires_at_time: bigint        # Trusted Unix timestamp deadline for submission
    audit_completed_time: bigint   # Trusted Unix timestamp when AI jury rendered verdict
    supplemental_evidence_url: str # Bound appellate evidence URL
    appeal_prior_verdict: str      # Verdict recorded before appeal was filed


class Contract(gl.Contract):
    """
    AgentSecScan: Autonomous Smart Contract Security Audit Escrow & Vulnerability Disclosure Court
    Target Network: GenLayer studionet (Chain ID: 61999)
    """
    bounties: TreeMap[str, AuditBounty]
    bounty_ids: DynArray[str]
    total_bounty_locked: bigint
    total_audits_settled: u32
    bounty_counter: u64
    owner: Address

    def __init__(self):
        deployer = _get_sender()
        self.owner = deployer
        self.total_bounty_locked = bigint(0)
        self.total_audits_settled = u32(0)
        self.bounty_counter = u64(0)

    def _resolve_bid(self, bounty_id) -> str:
        return str(bounty_id).strip()

    def _get_current_timestamp(self) -> bigint:
        """Derives trusted Unix timestamp from consensus context (gl.message_raw['datetime'])."""
        import calendar
        from datetime import datetime, timezone
        try:
            if hasattr(gl, "message_raw") and isinstance(gl.message_raw, dict):
                raw_val = gl.message_raw.get("datetime", "")
                if raw_val:
                    dt_str = str(raw_val).strip().replace("Z", "+00:00")
                    dt = datetime.fromisoformat(dt_str)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    ts = calendar.timegm(dt.utctimetuple())
                    if ts > 0:
                        return bigint(ts)
        except Exception:
            pass
        return bigint(1760000000)

    # ── Public Write Methods ──────────────────────────────────────────

    @gl.public.write.payable
    def create_audit_bounty(
        self,
        scope_repository: str,
        duration_blocks: u32
    ) -> str:
        """Protocol team locks GEN bounty escrow for smart contract security auditing."""
        escrow = bigint(gl.message.value)
        if escrow <= bigint(0):
            raise ContractError("Bounty escrow deposit must be greater than 0 GEN.")

        clean_repo = str(scope_repository).strip()
        if len(clean_repo) < 4:
            raise ContractError("Valid codebase repository/commit scope required.")

        dur_secs = bigint(int(duration_blocks) * 3 if int(duration_blocks) > 0 else int(DEFAULT_AUDIT_EXPIRY_SECONDS))

        self.bounty_counter = self.bounty_counter + u64(1)
        bounty_id = str(self.bounty_counter)
        current_time = self._get_current_timestamp()
        expires_at = current_time + dur_secs
        creator = _get_sender()

        new_bounty = AuditBounty(
            bounty_id=bounty_id,
            protocol_team=creator,
            security_researcher=creator,  # Safely initialized; status 0 denotes unclaimed
            dispute_initiator=creator,
            escrow_amount=escrow,
            dispute_bond=bigint(0),
            scope_repository=clean_repo,
            vulnerability_title="",
            report_url="",
            report_evidence_hash="",
            poc_script_url="",
            evidence_hash="",
            status=STATUS_BOUNTY_OPEN,
            verdict="PENDING",
            original_verdict="PENDING",
            reason="Bounty escrow open. Awaiting security researcher report and PoC.",
            confidence=u8(0),
            severity_score=u8(0),
            reproducibility_score=u8(0),
            created_at_time=current_time,
            expires_at_time=expires_at,
            audit_completed_time=bigint(0),
            supplemental_evidence_url="",
            appeal_prior_verdict="",
        )

        self.bounties[bounty_id] = new_bounty
        self.bounty_ids.append(bounty_id)
        self.total_bounty_locked = self.total_bounty_locked + escrow
        return bounty_id

    @gl.public.write
    def submit_audit_deliverable(
        self,
        bounty_id: str,
        vulnerability_title: str,
        report_url: str,
        report_evidence_hash: str,
        poc_script_url: str
    ) -> None:
        """Security researcher claims bounty and submits vulnerability report with PoC."""
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b.status != STATUS_BOUNTY_OPEN:
            raise ContractError("Bounty is not open for report submission.")

        sender = _get_sender()
        if _addr_str(sender) == _addr_str(b.protocol_team):
            raise ContractError("Role Violation: Protocol team cannot submit reports to their own bounty.")

        current_time = self._get_current_timestamp()
        if current_time > b.expires_at_time:
            raise ContractError("Bounty coverage duration has expired.")

        clean_title = str(vulnerability_title).strip()
        clean_report = str(report_url).strip()
        clean_poc = str(poc_script_url).strip()
        clean_hash = str(report_evidence_hash).strip().lower()

        if len(clean_title) < 5:
            raise ContractError("Detailed vulnerability title required.")
        if not (clean_report.startswith("http://") or clean_report.startswith("https://")):
            raise ContractError("Valid public report URL required.")
        if not (clean_poc.startswith("http://") or clean_poc.startswith("https://")):
            raise ContractError("Valid public PoC exploit script URL required.")
        if not _is_valid_sha256(clean_hash):
            raise ContractError("Valid 64-character hex SHA-256 report content commitment required.")

        b.security_researcher = sender
        b.vulnerability_title = clean_title
        b.report_url = clean_report
        b.report_evidence_hash = clean_hash
        b.poc_script_url = clean_poc
        b.status = STATUS_REPORT_SUBMITTED
        b.reason = "Audit deliverable submitted. Ready for AI Security Jury evaluation."

    @gl.public.write
    def adjudicate_security_audit(self, bounty_id: str) -> None:
        """AI Security Jury cross-examines vulnerability report, severity, and PoC reproducibility."""
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b.status not in (STATUS_REPORT_SUBMITTED, STATUS_UNRESOLVED):
            raise ContractError("Bounty is not in submitted review status.")

        sender_str = _addr_str(_get_sender())
        if sender_str != _addr_str(b.protocol_team) and sender_str != _addr_str(b.security_researcher):
            raise ContractError("Permission Denied: Only protocol team or researcher can trigger audit.")

        report_url = b.report_url
        poc_url = b.poc_script_url
        scope = b.scope_repository
        title = b.vulnerability_title
        expected_hash = b.report_evidence_hash

        def leader_fn():
            import hashlib
            raw_report = ""
            raw_poc = ""
            try:
                raw_report = gl.nondet.web.render(report_url, mode="text")
            except Exception:
                pass
            try:
                raw_poc = gl.nondet.web.render(poc_url, mode="text")
            except Exception:
                pass

            if not raw_report or not raw_poc:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_FETCH_FAILED",
                    "confidence": 0,
                    "severity_score": 0,
                    "reproducibility_score": 0,
                    "reason": "Vulnerability report or PoC endpoint unreachable.",
                    "evidence_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                }

            computed_hash = hashlib.sha256(raw_report.encode("utf-8")).hexdigest()
            if computed_hash != expected_hash:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_COMMITMENT_FAILED",
                    "confidence": 0,
                    "severity_score": 0,
                    "reproducibility_score": 0,
                    "reason": "Report SHA-256 content commitment mismatch.",
                    "evidence_hash": computed_hash,
                }

            combined_payload = f"REPORT:\n{raw_report[:4000]}\n\nPOC_SCRIPT:\n{raw_poc[:4000]}"
            ev_hash = hashlib.sha256(combined_payload.encode("utf-8")).hexdigest()

            prompt = f"""You are the Chief Smart Contract Security Auditor on GenLayer.
Evaluate this vulnerability disclosure report and Proof-of-Concept against industry standards.

TARGET REPOSITORY SCOPE: {scope}
REPORTED TITLE: {title}

DISCLOSURE EVIDENCE:
<security_payload>
{combined_payload}
</security_payload>

EVALUATION RUBRIC:
1. Extract Severity Score (0-100) based on direct exploitability, fund-drain capability, or state-corruption.
2. Extract PoC Reproducibility Score (0-100%) verifying if the PoC triggers the bug.
3. Decision Matrix:
   - Critical/High Vulnerability (Severity >= 75 AND Reproducibility >= 80%):
     Output "VULNERABILITY_CONFIRMED_FULL" (100% bounty payout).
   - Medium/Low Vulnerability with partial impact (Severity 40-74 AND Reproducibility >= 50%):
     Output "PARTIAL_SEVERITY_PAYOUT" (40% bounty payout).
   - Invalid / Theoretical / Unreproducible / Spam report (Severity < 40 OR Reproducibility < 50%):
     Output "CLAIM_REJECTED_INVALID" (0% payout, full refund).

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON:
{{
  "canary": "{CANARY_TOKEN}",
  "verdict": "VULNERABILITY_CONFIRMED_FULL" | "PARTIAL_SEVERITY_PAYOUT" | "CLAIM_REJECTED_INVALID",
  "confidence": <0-100>,
  "severity_score": <0-100>,
  "reproducibility_score": <0-100>,
  "reason": "<detailed audit justification under 200 chars>"
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict) or str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "severity_score": 0,
                    "reproducibility_score": 0,
                    "reason": "AI validator parsing failed or canary mismatch.",
                    "evidence_hash": ev_hash,
                }

            v_raw = str(parsed.get("verdict", "")).upper().strip()
            if v_raw not in {"VULNERABILITY_CONFIRMED_FULL", "PARTIAL_SEVERITY_PAYOUT", "CLAIM_REJECTED_INVALID"}:
                v_raw = "UNRESOLVED_PARSE_FAILED"

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_raw,
                "confidence": max(0, min(100, int(parsed.get("confidence", 85)))),
                "severity_score": max(0, min(100, int(parsed.get("severity_score", 0)))),
                "reproducibility_score": max(0, min(100, int(parsed.get("reproducibility_score", 0)))),
                "reason": str(parsed.get("reason", "Security evaluation concluded."))[:200],
                "evidence_hash": ev_hash,
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)
        v_res = str(adjudication_res["verdict"])
        b.verdict = v_res
        b.reason = str(adjudication_res["reason"])
        b.confidence = u8(int(adjudication_res["confidence"]))
        b.severity_score = u8(int(adjudication_res["severity_score"]))
        b.reproducibility_score = u8(int(adjudication_res["reproducibility_score"]))
        if "evidence_hash" in adjudication_res and adjudication_res["evidence_hash"]:
            b.evidence_hash = str(adjudication_res["evidence_hash"])

        if v_res.startswith("UNRESOLVED_"):
            b.status = STATUS_UNRESOLVED
            b.audit_completed_time = bigint(0)
        else:
            b.original_verdict = v_res
            current_time = self._get_current_timestamp()
            b.status = STATUS_AWAITING_PAYOUT
            b.audit_completed_time = current_time

    @gl.public.write.payable
    def appeal_verdict(
        self,
        bounty_id: str,
        dispute_reason: str,
        supplemental_evidence_url: str
    ) -> None:
        """Protocol team or Researcher appeals within 24 blocks (~72s) with 10% dispute bond."""
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Can only appeal bounties in AWAITING_PAYOUT status.")

        sender = _get_sender()
        if _addr_str(sender) != _addr_str(b.protocol_team) and _addr_str(sender) != _addr_str(b.security_researcher):
            raise ContractError("Role Violation: Only protocol team or researcher can file an appeal.")

        current_time = self._get_current_timestamp()
        if current_time > (b.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Dispute cooling-off window ({int(COOLING_OFF_SECONDS)}s) has expired.")

        clean_url = str(supplemental_evidence_url).strip()
        if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
            raise ContractError("Valid public supplemental PoC / trace URL required.")

        required_bond = (b.escrow_amount * bigint(10)) // bigint(100)
        if required_bond == bigint(0):
            required_bond = bigint(1)

        staked = bigint(gl.message.value)
        if staked < required_bond:
            raise ContractError(f"Must stake at least 10% dispute bond ({int(required_bond)} wei).")

        clean_reason = str(dispute_reason).strip()
        if len(clean_reason) < 10:
            raise ContractError("Detailed dispute justification (>= 10 chars) required.")

        b.appeal_prior_verdict = b.verdict
        b.status = STATUS_DISPUTED
        b.dispute_initiator = sender
        b.dispute_bond = staked
        b.supplemental_evidence_url = clean_url
        b.reason = f"[DISPUTE by {_addr_str(sender)[:8]}]: {clean_reason} | Prior: {b.reason}"
        self.total_bounty_locked = self.total_bounty_locked + staked

    @gl.public.write
    def adjudicate_appeal(self, bounty_id: str, new_evidence_url: str = "") -> None:
        """
        Supreme Security Council re-evaluates strictly against bound supplemental execution trace.
        Allows appellant to update/retry the URL if previous attempt was UNRESOLVED.
        """
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b.status not in (STATUS_DISPUTED, STATUS_UNRESOLVED):
            raise ContractError("Bounty is not in DISPUTED or appellate UNRESOLVED status.")
        if b.dispute_bond <= bigint(0):
            raise ContractError("No active dispute bond staked for this appeal.")

        sender = _get_sender()
        sender_str = _addr_str(sender)
        if sender_str != _addr_str(b.protocol_team) and sender_str != _addr_str(b.security_researcher):
            raise ContractError("Permission Denied: Only protocol team or researcher can adjudicate appeal.")

        # Retry support: If appellant supplies an updated evidence URL, update it
        clean_new_url = str(new_evidence_url).strip()
        if clean_new_url:
            if sender_str != _addr_str(b.dispute_initiator):
                raise ContractError("Permission Denied: Only the dispute initiator can update the appeal evidence URL.")
            if not (clean_new_url.startswith("http://") or clean_new_url.startswith("https://")):
                raise ContractError("Valid public supplemental PoC / trace URL required.")
            b.supplemental_evidence_url = clean_new_url

        bound_url = b.supplemental_evidence_url
        appellant = b.dispute_initiator
        prior_verdict = b.appeal_prior_verdict
        is_protocol_appellant = (_addr_str(appellant) == _addr_str(b.protocol_team))

        def leader_fn():
            raw_supp = ""
            try:
                raw_supp = gl.nondet.web.render(bound_url, mode="text")
            except Exception:
                pass

            if not raw_supp:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "APPEAL_UNRESOLVED_FETCH_FAILED",
                    "reason": "Supplemental trace URL unreachable or empty.",
                }

            prompt = f"""You are the Supreme Appellate Security Arbiter on GenLayer.
Evaluate the bound supplemental Foundry/Hardhat execution trace for codebase: {b.scope_repository}:
PRIOR VERDICT: {prior_verdict}
APPELLANT: {'PROTOCOL_TEAM' if is_protocol_appellant else 'SECURITY_RESEARCHER'}

SUPPLEMENTAL DEBUG TRACE:
{raw_supp[:4000]}

DECISION CRITERIA:
- If supplemental trace conclusively proves full exploitability / state theft -> "APPEAL_UPHELD_FULL".
- If trace proves partial vulnerability / non-critical invariant breach -> "APPEAL_UPHELD_PARTIAL".
- If trace disproves vulnerability or confirms invalid PoC assumptions -> "APPEAL_UPHELD_INVALID".
- Otherwise -> "APPEAL_DISMISSED".

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON:
{{"canary": "{CANARY_TOKEN}", "verdict": "APPEAL_UPHELD_FULL"|"APPEAL_UPHELD_PARTIAL"|"APPEAL_UPHELD_INVALID"|"APPEAL_DISMISSED", "reason": "<rationale under 200 chars>"}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict) or str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {"canary": CANARY_TOKEN, "verdict": "APPEAL_UNRESOLVED_PARSE_FAILED", "reason": "Appellate parsing failure."}

            v_str = str(parsed.get("verdict", "")).upper().strip()
            if v_str not in {"APPEAL_UPHELD_FULL", "APPEAL_UPHELD_PARTIAL", "APPEAL_UPHELD_INVALID", "APPEAL_DISMISSED"}:
                v_str = "APPEAL_UNRESOLVED_PARSE_FAILED"

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_str,
                "reason": str(parsed.get("reason", "Appellate review completed."))[:200]
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        appeal_res = gl.vm.run_nondet(leader_fn, validator_fn)
        app_verdict = appeal_res["verdict"]
        app_reason = appeal_res["reason"]

        # Failure path: Retains retryable status and preserves bond accounting
        if app_verdict.startswith("APPEAL_UNRESOLVED_"):
            b.status = STATUS_UNRESOLVED
            b.verdict = app_verdict
            b.reason = f"[APPEAL UNRESOLVED] {app_reason}. Can be retried with updated URL or refunded via refund_dispute_bond."
            return

        escrow_val = b.escrow_amount
        bond_val = b.dispute_bond
        total_settling = escrow_val + bond_val
        b.dispute_bond = bigint(0)
        b.escrow_amount = bigint(0)

        self.total_bounty_locked = self.total_bounty_locked - total_settling
        self.total_audits_settled = self.total_audits_settled + u32(1)

        counterparty = b.protocol_team if not is_protocol_appellant else b.security_researcher

        if app_verdict == "APPEAL_UPHELD_FULL":
            b.status = STATUS_SETTLED_PAID_FULL
            b.verdict = "VULNERABILITY_CONFIRMED_FULL"
            b.reason = f"[APPEAL UPHELD] {app_reason}"
            _pay_native(b.security_researcher, escrow_val)
            _pay_native(appellant, bond_val)

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            b.status = STATUS_SETTLED_PARTIAL
            b.verdict = "PARTIAL_SEVERITY_PAYOUT"
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            b.reason = f"[APPEAL RESOLUTION] {app_reason}"
            _pay_native(b.security_researcher, payout)
            _pay_native(b.protocol_team, refund)
            _pay_native(appellant, bond_val)

        elif app_verdict == "APPEAL_UPHELD_INVALID":
            b.status = STATUS_SETTLED_REJECTED
            b.verdict = "CLAIM_REJECTED_INVALID"
            b.reason = f"[APPEAL RESOLUTION] {app_reason}"
            _pay_native(b.protocol_team, escrow_val)
            _pay_native(appellant, bond_val)

        else:
            # APPEAL_DISMISSED: Preserve original verdict and forfeit bond to counterparty
            b.reason = f"[APPEAL DISMISSED] {app_reason}"
            _pay_native(counterparty, bond_val)

            if b.original_verdict == "VULNERABILITY_CONFIRMED_FULL":
                b.status = STATUS_SETTLED_PAID_FULL
                b.verdict = "VULNERABILITY_CONFIRMED_FULL"
                _pay_native(b.security_researcher, escrow_val)
            elif b.original_verdict == "PARTIAL_SEVERITY_PAYOUT":
                b.status = STATUS_SETTLED_PARTIAL
                b.verdict = "PARTIAL_SEVERITY_PAYOUT"
                payout = (escrow_val * bigint(40)) // bigint(100)
                refund = escrow_val - payout
                _pay_native(b.security_researcher, payout)
                _pay_native(b.protocol_team, refund)
            else:
                b.status = STATUS_SETTLED_REJECTED
                b.verdict = "CLAIM_REJECTED_INVALID"
                _pay_native(b.protocol_team, escrow_val)

    @gl.public.write
    def refund_dispute_bond(self, bounty_id: str) -> None:
        """
        Allows appellant to safely refund 100% of their staked dispute bond if an appeal
        reached an unresolvable error state (fetch or parse failure).
        Consistent accounting: Updates stored bond, total locked, and restores prior settlement window.
        """
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        sender = _get_sender()
        if _addr_str(sender) != _addr_str(b.dispute_initiator):
            raise ContractError("Role Violation: Only dispute initiator can refund dispute bond.")

        if b.dispute_bond <= bigint(0):
            raise ContractError("No active dispute bond available to refund.")

        if b.status != STATUS_UNRESOLVED or not str(b.verdict).startswith("APPEAL_UNRESOLVED_"):
            raise ContractError("Dispute bond can only be refunded if appeal reached an unresolvable state.")

        bond_val = b.dispute_bond
        b.dispute_bond = bigint(0)
        self.total_bounty_locked = self.total_bounty_locked - bond_val

        current_time = self._get_current_timestamp()
        b.status = STATUS_AWAITING_PAYOUT
        b.verdict = b.appeal_prior_verdict if b.appeal_prior_verdict else b.original_verdict
        b.audit_completed_time = current_time
        b.reason = f"[APPEAL REFUNDED]: Dispute bond ({int(bond_val)} wei) refunded to appellant due to unresolvable appeal evidence. Prior verdict restored."
        _pay_native(sender, bond_val)

    @gl.public.write
    def finalize_settlement(self, bounty_id: str) -> None:
        """Executes uncontested settlement strictly after 24 blocks (~72s) cooling-off window."""
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if b.status == STATUS_UNRESOLVED or b.verdict.startswith("UNRESOLVED_") or b.verdict.startswith("APPEAL_UNRESOLVED_"):
            raise ContractError("Cannot settle bounty in an unresolved error state. Escrow remains protected.")

        if b.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Bounty is not awaiting settlement payout.")

        sender_str = _addr_str(_get_sender())
        if sender_str != _addr_str(b.protocol_team) and sender_str != _addr_str(b.security_researcher):
            raise ContractError("Permission Denied: Only protocol team or researcher can finalize payout.")

        current_time = self._get_current_timestamp()
        if current_time <= (b.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Cooling-off challenge window ({int(COOLING_OFF_SECONDS)}s) is still active.")

        escrow_val = b.escrow_amount
        b.escrow_amount = bigint(0)
        self.total_bounty_locked = self.total_bounty_locked - escrow_val
        self.total_audits_settled = self.total_audits_settled + u32(1)

        if b.verdict == "VULNERABILITY_CONFIRMED_FULL":
            b.status = STATUS_SETTLED_PAID_FULL
            _pay_native(b.security_researcher, escrow_val)
        elif b.verdict == "PARTIAL_SEVERITY_PAYOUT":
            b.status = STATUS_SETTLED_PARTIAL
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            _pay_native(b.security_researcher, payout)
            _pay_native(b.protocol_team, refund)
        else:
            b.status = STATUS_SETTLED_REJECTED
            _pay_native(b.protocol_team, escrow_val)

    @gl.public.write
    def cancel_or_reclaim(self, bounty_id: str) -> None:
        """Protocol team reclaims escrow if bounty expired without deliverables or stalled in unresolved state."""
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        if _addr_str(_get_sender()) != _addr_str(b.protocol_team):
            raise ContractError("Role Violation: Only protocol team can reclaim expired bounty escrow.")

        current_time = self._get_current_timestamp()

        # Allow reclaim if no deliverable submitted OR if stalled in UNRESOLVED and past expiry
        if b.status in (STATUS_BOUNTY_OPEN, STATUS_UNRESOLVED):
            if current_time < b.expires_at_time:
                raise ContractError(f"Cannot reclaim: Bounty duration is still active (expires at {int(b.expires_at_time)}).")
        else:
            raise ContractError("Cannot reclaim: Bounty has deliverables actively undergoing evaluation or already settled.")

        b.status = STATUS_CANCELLED
        b.verdict = "CANCELLED"
        b.reason = "Bounty duration completed without valid deliverables. Escrow reclaimed by protocol."

        if b.dispute_bond > bigint(0):
            bond_val = b.dispute_bond
            b.dispute_bond = bigint(0)
            self.total_bounty_locked = self.total_bounty_locked - bond_val
            _pay_native(b.dispute_initiator, bond_val)

        escrow_val = b.escrow_amount
        b.escrow_amount = bigint(0)
        self.total_bounty_locked = self.total_bounty_locked - escrow_val
        _pay_native(b.protocol_team, escrow_val)

    # ── Read-only Views ───────────────────────────────────────────────

    @gl.public.view
    def get_bounty(self, bounty_id: str) -> str:
        bid = self._resolve_bid(bounty_id)
        if bid not in self.bounties:
            raise ContractError(f"Bounty {bid} does not exist.")

        b = self.bounties[bid]
        data = {
            "bounty_id": b.bounty_id,
            "protocol_team": _addr_str(b.protocol_team),
            "security_researcher": _addr_str(b.security_researcher),
            "dispute_initiator": _addr_str(b.dispute_initiator),
            "escrow_amount": str(b.escrow_amount),
            "dispute_bond": str(b.dispute_bond),
            "scope_repository": b.scope_repository,
            "vulnerability_title": b.vulnerability_title,
            "report_url": b.report_url,
            "report_evidence_hash": b.report_evidence_hash,
            "poc_script_url": b.poc_script_url,
            "evidence_hash": b.evidence_hash,
            "status": int(b.status),
            "verdict": b.verdict,
            "original_verdict": b.original_verdict,
            "reason": b.reason,
            "confidence": int(b.confidence),
            "severity_score": int(b.severity_score),
            "reproducibility_score": int(b.reproducibility_score),
            "created_at_time": str(b.created_at_time),
            "expires_at_time": str(b.expires_at_time),
            "audit_completed_time": str(b.audit_completed_time),
            "supplemental_evidence_url": b.supplemental_evidence_url,
            "appeal_prior_verdict": b.appeal_prior_verdict,
        }
        return json.dumps(data)

    @gl.public.view
    def get_bounty_count(self) -> u64:
        return u64(len(self.bounty_ids))

    @gl.public.view
    def get_all_bounties(self) -> str:
        bounties_list = []
        for bid in self.bounty_ids:
            if bid in self.bounties:
                b = self.bounties[bid]
                bounties_list.append({
                    "bounty_id": b.bounty_id,
                    "protocol_team": _addr_str(b.protocol_team),
                    "security_researcher": _addr_str(b.security_researcher),
                    "dispute_initiator": _addr_str(b.dispute_initiator),
                    "escrow_amount": str(b.escrow_amount),
                    "dispute_bond": str(b.dispute_bond),
                    "scope_repository": b.scope_repository,
                    "vulnerability_title": b.vulnerability_title,
                    "report_url": b.report_url,
                    "report_evidence_hash": b.report_evidence_hash,
                    "poc_script_url": b.poc_script_url,
                    "evidence_hash": b.evidence_hash,
                    "status": int(b.status),
                    "verdict": b.verdict,
                    "original_verdict": b.original_verdict,
                    "reason": b.reason,
                    "confidence": int(b.confidence),
                    "severity_score": int(b.severity_score),
                    "reproducibility_score": int(b.reproducibility_score),
                    "created_at_time": str(b.created_at_time),
                    "expires_at_time": str(b.expires_at_time),
                    "audit_completed_time": str(b.audit_completed_time),
                    "supplemental_evidence_url": b.supplemental_evidence_url,
                    "appeal_prior_verdict": b.appeal_prior_verdict,
                })
        return json.dumps(bounties_list)

    @gl.public.view
    def get_stats(self) -> str:
        data = {
            "total_bounties": len(self.bounty_ids),
            "total_bounty_locked": str(self.total_bounty_locked),
            "total_audits_settled": int(self.total_audits_settled),
            "owner": _addr_str(self.owner),
        }
        return json.dumps(data)

    @gl.public.view
    def get_total_bounty_locked(self) -> str:
        return str(self.total_bounty_locked)
