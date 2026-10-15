# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting Vulnerabilities

AgentSecScan is dedicated to securing Web3 protocols through decentralized consensus and economic alignment.
If you discover a security vulnerability within AgentSecScan contracts or frontend dApp:

1. **Submit on AgentSecScan Court**: The most direct and rewarding path is to submit the finding as an audit deliverable on our live contract deployed on GenLayer Studionet (`0xe991eb664f0e4551545929600b8cfe0Fc8EB9941`).
2. **Direct Disclosure**: Alternatively, email `security@agentsecscan.io` or open a confidential security advisory on GitHub.

### Vulnerability Evaluation Standards
All reports are cross-examined using standard criteria (Immunefi / OWASP for Smart Contracts):
- **Critical/High Flaw**: Re-entrancy, price manipulation, unauthorized fund drainage, state corruption.
- **Medium/Low Flaw**: Precision loss, gas griefing, non-critical access control deviations.
- **Invalid / Spam**: Theoretical bugs without reproducible PoCs.
