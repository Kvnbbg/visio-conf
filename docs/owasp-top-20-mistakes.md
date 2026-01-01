# Top 20 Developer Mistakes: OWASP-Aligned Pentest Checklist

This checklist reframes common developer mistakes into a practical black-box pentest workflow, explicitly mapped to the current OWASP taxonomy.

## OWASP Top 10 Mapping (2021 vs 2025)

### OWASP Top 10:2021 (baseline mapping)
- **A01**: Broken Access Control
- **A02**: Cryptographic Failures
- **A03**: Injection
- **A04**: Insecure Design
- **A05**: Security Misconfiguration
- **A06**: Vulnerable and Outdated Components
- **A07**: Identification & Authentication Failures
- **A08**: Software & Data Integrity Failures
- **A09**: Security Logging & Monitoring Failures
- **A10**: Server-Side Request Forgery (SSRF)

### OWASP Top 10:2025 (latest OWASP site structure/RC)
- **A01**: Broken Access Control
- **A02**: Security Misconfiguration
- **A03**: Software Supply Chain Failures
- **A04**: Cryptographic Failures
- **A05**: Injection
- **A06**: Insecure Design
- **A07**: Authentication Failures
- **A08**: Software or Data Integrity Failures
- **A09**: Security Logging & Alerting Failures
- **A10**: Mishandling of Exceptional Conditions

Operationally, the same mistakes still map cleanly, but a modern report should explicitly call out **Supply Chain Failures** and **Exceptional Conditions** when relevant.

## Top 20 Developer Mistakes (pentester framing + OWASP mapping)

1) **Permitting invalid data into the database**  
   **Pentest signal:** missing server-side validation; inconsistent states; odd edge-case behavior.  
   **Maps to:** Injection / Insecure Design / Security Misconfiguration (depends on symptom).

2) **Treating security as “somewhere else” (trust boundaries ignored)**  
   **Pentest signal:** authorization assumed upstream; missing object/action checks; service-to-service trust.  
   **Maps to:** Broken Access Control / Insecure Design.

3) **Homegrown security methods (crypto/auth)**  
   **Pentest signal:** bespoke token formats; nonstandard signing/encryption; ad-hoc password hashing.  
   **Maps to:** Cryptographic Failures / Authentication Failures.

4) **Security as a last step**  
   **Pentest signal:** systemic issues across modules; repeated patterns; no consistent controls.  
   **Maps to:** Insecure Design.

5) **Plain-text password storage**  
   **Pentest signal:** breach impact is catastrophic; reuse cascade.  
   **Maps to:** Cryptographic Failures / Authentication Failures.

6) **Weak passwords**  
   **Pentest signal:** account takeover via spraying/stuffing (if in scope); weak policy/reset flows.  
   **Maps to:** Authentication Failures.

7) **Storing unencrypted data at rest**  
   **Pentest signal:** PII/secrets visible in DB/backups/exports; over-privileged reads.  
   **Maps to:** Cryptographic Failures.

8) **Over-reliance on client-side controls**  
   **Pentest signal:** “disabled button” security; client-side role flags; hidden fields deciding price/role.  
   **Maps to:** Broken Access Control / Insecure Design.

9) **Optimism bias (“users won’t do that”)**  
   **Pentest signal:** missing abuse-case design; no rate limits; predictable identifiers; weak anti-automation.  
   **Maps to:** Insecure Design / Authentication Failures.

10) **Permitting variables via URL path names**  
    **Pentest signal:** IDOR/BOLA patterns; object IDs swapped; path-based authorization missing.  
    **Maps to:** Broken Access Control.

11) **Trusting third-party code blindly**  
    **Pentest signal:** vulnerable dependencies; risky plugins; weak update governance.  
    **Maps to:** Vulnerable/Outdated Components (2021) and **Software Supply Chain Failures** (2025).

12) **Hard-coded backdoor accounts**  
    **Pentest signal:** undocumented privileged users; default creds; hidden admin routes.  
    **Maps to:** Authentication Failures / Broken Access Control.

13) **Unverified injections (SQL, NoSQL, template, etc.)**  
    **Pentest signal:** injection sinks in query/filters/search; data-dependent behavior; server errors.  
    **Maps to:** Injection.

14) **Remote File Inclusion (RFI)**  
    **Pentest signal:** dynamic include of remote resources; template/include parameters; risky interpreters.  
    **Maps to:** Injection / Security Misconfiguration (often both).

15) **Insecure data handling (logs/exports/debug dumps)**  
    **Pentest signal:** secrets in logs; verbose errors; PII in URLs; unsafe tenant isolation.  
    **Maps to:** Security Misconfiguration / Logging Failures / Broken Access Control.

16) **Failing to encrypt data properly**  
    **Pentest signal:** weak modes; bad key management; TLS gaps; broken at-rest protection.  
    **Maps to:** Cryptographic Failures.

17) **Not using secure cryptographic systems**  
    **Pentest signal:** nonstandard primitives; poor entropy; missing rotation.  
    **Maps to:** Cryptographic Failures.

18) **Ignoring “layer 8” (people/process)**  
    **Pentest signal:** weak operational controls; poor secrets hygiene; risky admin workflows.  
    **Maps to:** Security Misconfiguration / Authentication Failures / Logging Failures.

19) **Failure to log/monitor user actions**  
    **Pentest signal:** no audit trails; no alerts on sensitive ops; no traceability.  
    **Maps to:** Security Logging & Monitoring Failures (2021) / Logging & Alerting Failures (2025).

20) **WAF misconfigurations**  
    **Pentest signal:** bypassable rules; false sense of security; blocks normal traffic.  
    **Maps to:** Security Misconfiguration (and sometimes **Exceptional Conditions** in 2025).

## Black-Box Workflow (evidence-driven)

1. **Surface mapping:** identify auth boundaries, roles, tenant model, and high-value actions (money, exports, admin).
2. **Abuse-case testing:** per action, test “same user / different user / no auth / lower role” patterns.
3. **Input handling:** test each input class (path, query, body, headers, file upload, template/lang selectors) against injection, file inclusion, SSRF-style fetches, and deserialization-like behavior.
4. **Observability:** verify logging/alerting and that sensitive operations are attributable (user/action/object/time).
