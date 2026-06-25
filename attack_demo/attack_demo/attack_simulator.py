"""
Attack Simulation Demo Script
Demonstrates various attack scenarios and how the system responds
WARNING: This is for demonstration purposes only!
"""

import requests
import time
import threading
import random
from datetime import datetime
from colorama import Fore, Style, init

# Initialize colorama for colored terminal output
init(autoreset=True)

BASE_URL = "http://localhost:8000"


class AttackSimulator:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.attack_active = False
        self.request_count = 0
        self.failed_requests = 0
        self.successful_requests = 0

    def print_header(self):
        """Print attack demo header"""
        print(f"\n{Fore.RED}{'='*70}")
        print(f"{Fore.RED}  VOTING SYSTEM ATTACK SIMULATION DEMO")
        print(f"{Fore.RED}  WARNING: For Educational Purposes Only!")
        print(f"{Fore.RED}{'='*70}\n")

    def print_status(self, message, status="INFO"):
        """Print colored status message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        if status == "INFO":
            print(f"{Fore.CYAN}[{timestamp}] [INFO] {message}")
        elif status == "SUCCESS":
            print(f"{Fore.GREEN}[{timestamp}] [SUCCESS] {message}")
        elif status == "ERROR":
            print(f"{Fore.RED}[{timestamp}] [ERROR] {message}")
        elif status == "ATTACK":
            print(f"{Fore.YELLOW}[{timestamp}] [ATTACK] {message}")
        elif status == "DEFEND":
            print(f"{Fore.MAGENTA}[{timestamp}] [DEFEND] {message}")

    def check_server_status(self):
        """Check if server is responsive"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.print_status("Server is ONLINE and responding", "SUCCESS")
                return True
            else:
                self.print_status(f"Server returned status code: {response.status_code}", "ERROR")
                return False
        except requests.exceptions.RequestException as e:
            self.print_status(f"Server is OFFLINE or unreachable: {str(e)}", "ERROR")
            return False

    def ddos_attack_worker(self, thread_id):
        """Worker function for DDoS simulation"""
        while self.attack_active:
            try:
                # Random endpoint attacks
                endpoints = [
                    "/health",
                    "/api/auth/register",
                    "/api/auth/login/request-otp",
                    "/api/admin/voters",
                    "/",
                ]
                endpoint = random.choice(endpoints)

                response = requests.get(f"{self.base_url}{endpoint}", timeout=1)
                self.request_count += 1

                if response.status_code < 500:
                    self.successful_requests += 1
                else:
                    self.failed_requests += 1

            except requests.exceptions.RequestException:
                self.failed_requests += 1
            except Exception as e:
                self.failed_requests += 1

    def simulate_ddos_attack(self, num_threads=50, duration=30):
        """
        Simulate a DDoS (Distributed Denial of Service) attack
        Args:
            num_threads: Number of concurrent attack threads
            duration: Duration of attack in seconds
        """
        self.print_status(f"Initiating DDoS attack with {num_threads} threads for {duration} seconds", "ATTACK")
        self.print_status("This will flood the server with requests...", "ATTACK")

        self.attack_active = True
        self.request_count = 0
        self.failed_requests = 0
        self.successful_requests = 0

        # Start attack threads
        threads = []
        for i in range(num_threads):
            thread = threading.Thread(target=self.ddos_attack_worker, args=(i,))
            thread.daemon = True
            thread.start()
            threads.append(thread)

        # Monitor attack progress
        start_time = time.time()
        try:
            while time.time() - start_time < duration:
                time.sleep(2)
                elapsed = int(time.time() - start_time)
                rps = self.request_count / elapsed if elapsed > 0 else 0
                self.print_status(
                    f"Attack progress: {elapsed}/{duration}s | "
                    f"Requests: {self.request_count} | "
                    f"RPS: {rps:.1f} | "
                    f"Success: {self.successful_requests} | "
                    f"Failed: {self.failed_requests}",
                    "ATTACK"
                )

                # Check if server is still responsive
                if elapsed % 10 == 0:
                    if not self.check_server_status():
                        self.print_status("SERVER HAS GONE DOWN DUE TO ATTACK!", "ERROR")
                        break

        except KeyboardInterrupt:
            self.print_status("Attack interrupted by user", "INFO")
        finally:
            self.attack_active = False

        # Wait for threads to finish
        time.sleep(2)

        # Print attack summary
        self.print_attack_summary()

    def print_attack_summary(self):
        """Print summary of attack results"""
        print(f"\n{Fore.YELLOW}{'='*70}")
        print(f"{Fore.YELLOW}  ATTACK SUMMARY")
        print(f"{Fore.YELLOW}{'='*70}")
        print(f"{Fore.CYAN}Total Requests Sent: {self.request_count}")
        print(f"{Fore.GREEN}Successful Requests: {self.successful_requests}")
        print(f"{Fore.RED}Failed Requests: {self.failed_requests}")
        print(f"{Fore.YELLOW}{'='*70}\n")

    def simulate_sql_injection_attempt(self):
        """Simulate SQL injection attack attempts"""
        self.print_status("Attempting SQL Injection attacks...", "ATTACK")

        injection_payloads = [
            "' OR '1'='1",
            "admin' --",
            "' UNION SELECT * FROM voters--",
            "1' AND 1=1--",
            "'; DROP TABLE voters;--"
        ]

        for payload in injection_payloads:
            try:
                response = requests.post(
                    f"{self.base_url}/api/auth/login/verify",
                    json={
                        "wallet_address": payload,
                        "otp_code": payload
                    },
                    timeout=5
                )
                if response.status_code == 400 or response.status_code == 404:
                    self.print_status(f"SQL Injection blocked: {payload[:30]}...", "DEFEND")
                else:
                    self.print_status(f"Potential vulnerability with: {payload[:30]}...", "ERROR")
            except Exception as e:
                self.print_status(f"Injection attempt failed: {str(e)[:50]}", "DEFEND")

    def simulate_brute_force_attack(self, num_attempts=20):
        """Simulate brute force login attempts"""
        self.print_status(f"Attempting brute force attack with {num_attempts} login attempts", "ATTACK")

        fake_wallets = [f"0x{''.join(random.choices('0123456789abcdef', k=40))}" for _ in range(num_attempts)]

        for i, wallet in enumerate(fake_wallets, 1):
            try:
                response = requests.post(
                    f"{self.base_url}/api/auth/login/request-otp",
                    json={"wallet_address": wallet},
                    timeout=5
                )

                if response.status_code == 404:
                    self.print_status(f"Attempt {i}: Wallet not found (Expected)", "DEFEND")
                elif response.status_code == 429:
                    self.print_status(f"Attempt {i}: RATE LIMITED - System defending!", "DEFEND")
                    break
                else:
                    self.print_status(f"Attempt {i}: Status {response.status_code}", "ATTACK")

                time.sleep(0.5)

            except Exception as e:
                self.print_status(f"Brute force attempt {i} failed", "DEFEND")

    def simulate_data_breach_attempt(self):
        """Simulate unauthorized data access attempts"""
        self.print_status("Attempting unauthorized data access...", "ATTACK")

        endpoints = [
            "/api/admin/voters",
            "/api/admin/audit-logs",
            "/api/admin/alerts"
        ]

        for endpoint in endpoints:
            try:
                # Attempt without authentication
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code == 401:
                    self.print_status(f"Access to {endpoint} blocked - Authentication required", "DEFEND")
                elif response.status_code == 200:
                    self.print_status(f"WARNING: Unauthorized access to {endpoint} successful!", "ERROR")
                else:
                    self.print_status(f"{endpoint}: Status {response.status_code}", "INFO")
            except Exception as e:
                self.print_status(f"Access attempt to {endpoint} failed", "DEFEND")

    def shutdown_demo(self):
        """Demonstrate gradual system shutdown under attack"""
        self.print_status("Demonstrating system shutdown scenario...", "ATTACK")

        print(f"\n{Fore.RED}Simulating catastrophic attack scenario...")
        print(f"{Fore.RED}System components failing one by one...\n")

        components = [
            ("API Gateway", 2),
            ("Authentication Service", 2),
            ("Database Connection Pool", 3),
            ("Blockchain Node Connection", 2),
            ("Frontend Server", 2),
            ("Backend Application Server", 3)
        ]

        for component, delay in components:
            time.sleep(delay)
            self.print_status(f"{component} - CRITICAL FAILURE", "ERROR")
            print(f"{Fore.RED}  └─ Component unresponsive")
            print(f"{Fore.RED}  └─ Error rate: 100%")
            print(f"{Fore.RED}  └─ Status: OFFLINE\n")

        time.sleep(2)
        print(f"\n{Fore.RED}{'='*70}")
        print(f"{Fore.RED}  SYSTEM SHUTDOWN COMPLETE")
        print(f"{Fore.RED}  All services are OFFLINE")
        print(f"{Fore.RED}  Voting temporarily suspended for security")
        print(f"{Fore.RED}{'='*70}\n")

    def run_full_attack_demo(self):
        """Run complete attack demonstration"""
        self.print_header()

        print(f"{Fore.CYAN}This demo will simulate various attack scenarios:\n")
        print("1. Initial server health check")
        print("2. SQL Injection attempts")
        print("3. Brute force login attacks")
        print("4. Unauthorized data access attempts")
        print("5. DDoS attack simulation")
        print("6. System shutdown demonstration\n")

        input(f"{Fore.YELLOW}Press Enter to begin the attack simulation...")

        # 1. Check server status
        print(f"\n{Fore.MAGENTA}--- PHASE 1: Initial Server Health Check ---")
        self.check_server_status()
        time.sleep(2)

        # 2. SQL Injection
        print(f"\n{Fore.MAGENTA}--- PHASE 2: SQL Injection Attempts ---")
        self.simulate_sql_injection_attempt()
        time.sleep(2)

        # 3. Brute Force
        print(f"\n{Fore.MAGENTA}--- PHASE 3: Brute Force Attack ---")
        self.simulate_brute_force_attack(15)
        time.sleep(2)

        # 4. Data Breach
        print(f"\n{Fore.MAGENTA}--- PHASE 4: Unauthorized Access Attempts ---")
        self.simulate_data_breach_attempt()
        time.sleep(2)

        # 5. DDoS Attack
        print(f"\n{Fore.MAGENTA}--- PHASE 5: DDoS Attack ---")
        print(f"{Fore.YELLOW}WARNING: This will heavily load the server!")
        proceed = input(f"{Fore.YELLOW}Proceed with DDoS simulation? (yes/no): ")
        if proceed.lower() == 'yes':
            self.simulate_ddos_attack(num_threads=30, duration=20)
        else:
            self.print_status("DDoS attack skipped", "INFO")
        time.sleep(2)

        # 6. Shutdown Demo
        print(f"\n{Fore.MAGENTA}--- PHASE 6: System Shutdown Demonstration ---")
        self.shutdown_demo()

        # Final status check
        print(f"\n{Fore.MAGENTA}--- POST-ATTACK: Server Status Check ---")
        self.check_server_status()

        print(f"\n{Fore.GREEN}{'='*70}")
        print(f"{Fore.GREEN}  ATTACK DEMONSTRATION COMPLETE")
        print(f"{Fore.GREEN}{'='*70}\n")


if __name__ == "__main__":
    simulator = AttackSimulator()
    simulator.run_full_attack_demo()
