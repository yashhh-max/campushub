"""
KPRIT CAMPUSHUB — GRADUATED LOAD TESTING ENGINE (PHASE 16)
Automates graduated load testing across user levels:
100 -> 250 -> 500 -> 1,000 -> 2,500 -> 5,000 -> 7,500 -> 10,000 concurrent users.
Measures real performance metrics and saves results to CSV & JSON for reporting.
"""

import os
import sys
import json
import time
import subprocess
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = BASE_DIR / "tests" / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

USER_LEVELS = [
    {"users": 100, "spawn_rate": 25, "duration": "15s"},
    {"users": 250, "spawn_rate": 50, "duration": "15s"},
    {"users": 500, "spawn_rate": 100, "duration": "15s"},
    {"users": 1000, "spawn_rate": 200, "duration": "15s"},
    {"users": 2500, "spawn_rate": 500, "duration": "15s"},
    {"users": 5000, "spawn_rate": 500, "duration": "15s"},
    {"users": 7500, "spawn_rate": 750, "duration": "15s"},
    {"users": 10000, "spawn_rate": 1000, "duration": "15s"},
]

def run_level(level, host="http://127.0.0.1:8000"):
    users = level["users"]
    spawn_rate = level["spawn_rate"]
    duration = level["duration"]
    csv_prefix = RESULTS_DIR / f"run_{users}"

    print(f"\n==================================================")
    print(f"RUNNING GRADUATED LOAD TEST: {users} CONCURRENT USERS")
    print(f"Spawn Rate: {spawn_rate}/s | Duration: {duration} | Target: {host}")
    print(f"==================================================")

    cmd = [
        sys.executable,
        "-m", "locust",
        "-f", str(BASE_DIR / "tests" / "load_test_10k.py"),
        "--headless",
        "-u", str(users),
        "-r", str(spawn_rate),
        "--run-time", duration,
        "--host", host,
        f"--csv={csv_prefix}",
        "--only-summary"
    ]

    start_time = time.time()
    try:
        proc = subprocess.run(cmd, cwd=str(BASE_DIR / "backend"), capture_output=True, text=True, timeout=120)
        output = proc.stdout + proc.stderr
    except subprocess.TimeoutExpired:
        print(f"Warning: Test at {users} users timed out.")
        return {"users": users, "status": "timeout", "error": "Process timed out"}

    # Parse stats CSV
    stats_file = RESULTS_DIR / f"run_{users}_stats.csv"
    record = {
        "users": users,
        "spawn_rate": spawn_rate,
        "duration": duration,
        "requests": 0,
        "failures": 0,
        "error_rate_pct": 0.0,
        "rps": 0.0,
        "avg_latency_ms": 0.0,
        "p50_ms": 0.0,
        "p95_ms": 0.0,
        "p99_ms": 0.0,
        "status": "PASS" if proc.returncode == 0 else "FAIL",
    }

    if stats_file.exists():
        with open(stats_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("Name") == "Aggregated":
                    try:
                        record["requests"] = int(row.get("Request Count", 0))
                        record["failures"] = int(row.get("Failure Count", 0))
                        if record["requests"] > 0:
                            record["error_rate_pct"] = round((record["failures"] / record["requests"]) * 100, 2)
                        record["rps"] = round(float(row.get("Requests/s", 0)), 2)
                        record["avg_latency_ms"] = round(float(row.get("Average Response Time", 0)), 2)
                        record["p50_ms"] = round(float(row.get("50%", 0)), 2)
                        record["p95_ms"] = round(float(row.get("95%", 0)), 2)
                        record["p99_ms"] = round(float(row.get("99%", 0)), 2)
                    except Exception as e:
                        print(f"Error parsing row: {e}")

    print(f"-> Completed {users} users: {record['requests']} requests, {record['failures']} failures ({record['error_rate_pct']}% error rate)")
    print(f"-> Throughput: {record['rps']} req/s | p50: {record['p50_ms']}ms | p95: {record['p95_ms']}ms | p99: {record['p99_ms']}ms")

    return record

def main():
    host = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    all_results = []

    print("\nStarting KPRIT CampusHub 10,000 Concurrent Users Benchmark Pipeline...")
    for lvl in USER_LEVELS:
        res = run_level(lvl, host)
        all_results.append(res)
        time.sleep(2)  # Cooldown between tests

    # Write summary json
    summary_path = RESULTS_DIR / "graduated_benchmark_results.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    print("\n\n" + "=" * 80)
    print("FINAL GRADUATED BENCHMARK SUMMARY (PHASE 16)")
    print("=" * 80)
    print(f"{'Users':<8} | {'Reqs':<8} | {'Fails':<6} | {'Error %':<8} | {'Req/s':<9} | {'p50 (ms)':<9} | {'p95 (ms)':<9} | {'p99 (ms)':<9} | {'Status':<6}")
    print("-" * 80)
    for r in all_results:
        print(f"{r['users']:<8} | {r.get('requests', 0):<8} | {r.get('failures', 0):<6} | {r.get('error_rate_pct', 0.0):<8} | {r.get('rps', 0.0):<9} | {r.get('p50_ms', 0.0):<9} | {r.get('p95_ms', 0.0):<9} | {r.get('p99_ms', 0.0):<9} | {r['status']:<6}")
    print("=" * 80 + "\n")
    print(f"Detailed logs and CSV datasets written to: {RESULTS_DIR}")

if __name__ == "__main__":
    main()
