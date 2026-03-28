# Security & Responsible Disclosure

**Version:** 1.0  
**Effective Date:** {{EFFECTIVE_DATE}}  
**Last Updated:** {{LAST_UPDATED}}

---

## 1. Our Security Commitment

{{LEGAL_ENTITY_NAME}} ("ReadyCheck AI," "we," "us") is committed to safeguarding the confidentiality, integrity, and availability of our platform, user data, and infrastructure. We implement layered security controls and follow a privacy-by-design approach across our engineering lifecycle.

## 2. Security Overview

### 2.1 Technical Controls
- Encryption in transit (TLS 1.2+) and at rest (AES-256)
- Strong password hashing (Argon2/bcrypt) for credentials managed by identity providers
- Role-based access control (RBAC) and least-privilege principles
- API authentication with signed tokens; short-lived sessions with refresh rotation
- Web security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
- Input validation and output encoding; SSRF/XSS/SQLi protections
- WAF and rate limiting on sensitive endpoints
- Continuous logging, anomaly detection, and alerting

### 2.2 Organizational Controls
- Secure SDLC, code reviews, and dependency scanning
- Background checks for employees in sensitive roles
- Mandatory security awareness and privacy training
- Segregation of duties and change management procedures
- Incident response playbooks with tabletop exercises

### 2.3 Platform Integrity (Assessment-Specific)
- Honor code monitoring (tab-switch detection, copy/paste blocking)
- Proctoring session controls and browser focus tracking
- Session attestation and device fingerprinting for certification exams
- Anti-cheat analytics and anomaly detection

## 3. Infrastructure and Third Parties

### 3.1 Hosting & Data Storage
- Cloud infrastructure with industry certifications ({{CLOUD_CERTIFICATIONS}})
- Regional data centers to support data residency where applicable
- Regular backups with encrypted, access-controlled storage

### 3.2 Sub-processors
- Supabase (managed Postgres & auth)
- Razorpay (payments)
- Additional vendors for email, analytics, and support
- Full list: {{SUBPROCESSOR_LIST_URL}} (updated regularly)

## 4. Responsible Disclosure Program

We value the contributions of security researchers and welcome responsible disclosure of vulnerabilities.

### 4.1 Scope
- Web apps on domains owned by ReadyCheck AI (e.g., `readycheck.ai`)
- Public APIs and documented endpoints
- Mobile/web clients officially distributed by ReadyCheck AI

Out of scope (non-exhaustive):
- Third-party platforms outside our control
- Denial of Service (DoS/DDoS) and volumetric attacks
- Spam, social engineering, or phishing against employees or customers
- Clickjacking on pages without sensitive actions
- Missing SPF/DMARC/DKIM records without exploitable impact

### 4.2 Reporting Guidelines
- Email: {{SECURITY_EMAIL}} with subject "Security Report: {{SHORT_SUMMARY}}"
- Include detailed steps to reproduce, affected endpoints, logs/POCs, and potential impact
- Do not access or exfiltrate more data than necessary to demonstrate the issue
- Avoid privacy violations, service disruption, or data destruction
- Give us reasonable time to investigate and remediate before public disclosure

### 4.3 Researcher Commitments
- Comply with applicable laws and this policy
- Make a good-faith effort to avoid privacy and availability impacts
- Keep information confidential until we confirm remediation or provide written approval

### 4.4 Our Commitments
- Acknowledge receipt within 2 business days
- Provide status updates at least weekly during investigation
- Work to remediate validated issues promptly based on severity
- Offer public thanks (Hall of Fame) where appropriate; no-penalty safe harbor for good-faith research

### 4.5 Safe Harbor
If you comply with this policy and applicable laws, we will not initiate legal action against you for security research. This safe harbor does not cover actions that are malicious, disruptive, or violate privacy.

## 5. Incident Response

### 5.1 Detection & Triage
- 24/7 monitoring with alerting for critical anomalies
- Defined severity levels and escalation paths
- Rapid triage to validate and scope incidents

### 5.2 Containment & Eradication
- Immediate containment actions and access revocation where needed
- Forensic analysis to determine root cause
- Patch, configuration, or control updates to prevent recurrence

### 5.3 Communication
- Customer notifications for material incidents affecting data confidentiality, integrity, or availability
- Regulatory notifications as required by law (e.g., DPDP/GDPR) within statutory timelines
- Post-incident report summarizing impact and remediation

## 6. Data Protection & Privacy

- DPDP (India) aligned program with Grievance Officer; GDPR/UK GDPR addenda where applicable
- Privacy by design/default in product features and data flows
- Data minimization, retention limits, and anonymization where feasible
- Cross-border transfer safeguards (SCCs/IDTA, TIAs)

Contact Privacy: {{PRIVACY_EMAIL}}  
Grievance Officer / DPO: {{DPO_NAME}}

## 7. Customer Responsibilities

- Maintain the confidentiality of credentials and API keys
- Use supported browsers/devices and keep them updated
- Configure strong passwords and MFA where available
- Manage user roles and access in your organization
- Report suspected account compromise immediately

## 8. Cryptography Standards

- TLS 1.2+ with modern ciphers; HSTS enabled on production domains
- AES-256 for data-at-rest encryption (database and object storage)
- Signed JWTs with short TTLs and refresh rotation
- Hashing using bcrypt/Argon2 for credential materials (if applicable)

## 9. Compliance & Certifications

- SOC 2 / ISO 27001 roadmaps; audit reports available under NDA where applicable
- Vendor due diligence on critical sub-processors
- Regular penetration tests by independent third parties

## 10. Contact & Updates

- Security: {{SECURITY_EMAIL}}  
- Abuse/Fraud: {{ABUSE_EMAIL}}  
- General Support: {{SUPPORT_EMAIL}}

We update this page as our security program evolves. Material changes will be communicated via email or service notices at least 30 days in advance where required.

---

*Last Updated: {{LAST_UPDATED}}*  
*© {{CURRENT_YEAR}} {{LEGAL_ENTITY_NAME}}. All rights reserved.*
