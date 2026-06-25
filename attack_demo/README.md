# Attack Simulation Demo

This directory contains scripts to demonstrate various cyber attack scenarios on the voting system and how the system responds to them.

## ⚠️ WARNING

**These scripts are for EDUCATIONAL and DEMONSTRATION purposes ONLY!**

- Never use these scripts against systems you don't own or have explicit permission to test
- These demonstrations show how attacks work and how security measures protect the system
- Running these scripts may temporarily impact server performance

## Prerequisites

Install required Python packages:

```bash
pip install requests colorama
```

## Usage

### Full Attack Demonstration

Run the complete attack simulation with all phases:

```bash
python attack_simulator.py
```

This will demonstrate:
1. **Initial Health Check** - Verify server is online
2. **SQL Injection Attempts** - Show how the system blocks SQL injection
3. **Brute Force Attack** - Demonstrate rate limiting protection
4. **Unauthorized Access** - Show authentication requirements
5. **DDoS Attack** - Simulate distributed denial of service (optional)
6. **System Shutdown** - Demonstrate what happens when system fails

### Make Sure the Backend is Running

Before running the attack demo, ensure your backend server is running:

```bash
cd backend
python app.py
```

The server should be running on `http://localhost:8000`

## Attack Phases Explained

### Phase 1: SQL Injection
- **What it is**: Attempts to inject malicious SQL code into database queries
- **How system defends**: Input validation and parameterized queries
- **Expected result**: All injection attempts should be blocked

### Phase 2: Brute Force Attack
- **What it is**: Automated attempts to guess valid wallet addresses
- **How system defends**: Rate limiting and account lockout
- **Expected result**: System should detect and block rapid attempts

### Phase 3: Unauthorized Access
- **What it is**: Attempts to access admin endpoints without authentication
- **How system defends**: JWT token validation and role-based access control
- **Expected result**: 401 Unauthorized responses

### Phase 4: DDoS Attack
- **What it is**: Overwhelming the server with massive amounts of requests
- **How system defends**: Rate limiting, load balancing (in production)
- **Expected result**: Server may slow down or become temporarily unavailable

### Phase 5: System Shutdown
- **What it is**: Demonstration of cascading failures under severe attack
- **How system responds**: Graceful degradation and service suspension
- **Expected result**: System shuts down to protect data integrity

## Understanding the Output

The script uses color-coded output:
- 🔵 **CYAN**: Informational messages
- 🟢 **GREEN**: Successful defensive measures
- 🔴 **RED**: Errors or vulnerabilities detected
- 🟡 **YELLOW**: Attack actions
- 🟣 **MAGENTA**: System defense responses

## Attack Metrics

During DDoS simulation, you'll see:
- **Requests**: Total number of attack requests sent
- **RPS**: Requests per second (attack intensity)
- **Success**: Requests that got through (server still responding)
- **Failed**: Requests blocked or timed out

## Security Lessons

This demonstration teaches:

1. **Input Validation** - Never trust user input
2. **Authentication** - Protect sensitive endpoints
3. **Rate Limiting** - Prevent brute force attacks
4. **Error Handling** - Don't reveal system internals
5. **Monitoring** - Detect abnormal patterns
6. **Resilience** - Graceful failure under attack

## Customization

You can modify attack parameters in `attack_simulator.py`:

```python
# DDoS settings
simulator.simulate_ddos_attack(
    num_threads=30,  # Number of concurrent attackers
    duration=20      # Attack duration in seconds
)

# Brute force settings
simulator.simulate_brute_force_attack(
    num_attempts=20  # Number of login attempts
)
```

## Important Notes

- The DDoS simulation may cause high CPU usage
- Your server logs will show many error messages (this is expected)
- The system should recover automatically after attacks stop
- In production, additional protections like WAF, CDN, and DDoS mitigation would be in place

## Cleanup

After running the demo:
1. Check that your server is still responsive
2. Review the audit logs in the database
3. Check the attack alerts in the admin panel

## Production Considerations

In a production environment, you would have:
- Web Application Firewall (WAF)
- DDoS protection services (Cloudflare, AWS Shield)
- Intrusion Detection Systems (IDS)
- Automated threat response
- Distributed architecture with load balancing
- Rate limiting at multiple levels
- IP blacklisting
- CAPTCHA for suspicious activity

## Educational Purpose

This demo is designed to:
- Show why security measures are important
- Demonstrate common attack vectors
- Illustrate how defense mechanisms work
- Highlight the need for multi-layered security
- Teach defensive programming practices

Remember: **Security is not optional - it's essential!**
