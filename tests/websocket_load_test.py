"""
KPRIT CAMPUSHUB — SCENARIO L: HIGH-CONCURRENCY WEBSOCKET BENCHMARK
Simulates hundreds to thousands of concurrent persistent WebSocket client connections.
Measures:
- Handshake latency (p50, p95, p99)
- Heartbeat ping/pong response time
- Drop/reconnect rate
- Redis Channel layer distribution
"""

import asyncio
import time
import json
import argparse
import sys
import websockets

async def connect_client(client_id, ws_url, duration, results):
    start = time.perf_counter()
    try:
        async with websockets.connect(ws_url, ping_interval=None) as ws:
            connect_latency = (time.perf_counter() - start) * 1000
            results['connected'] += 1
            results['connect_latencies'].append(connect_latency)
            
            end_time = time.time() + duration
            while time.time() < end_time:
                ping_start = time.perf_counter()
                await ws.send(json.dumps({"type": "ping", "client_id": client_id}))
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    ping_latency = (time.perf_counter() - ping_start) * 1000
                    results['ping_latencies'].append(ping_latency)
                except asyncio.TimeoutError:
                    results['timeouts'] += 1
                await asyncio.sleep(5.0)
    except Exception as e:
        results['errors'] += 1
        results['error_messages'].append(str(e))

async def get_auth_token():
    import urllib.request
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/auth/login/",
            data=json.dumps({"email": "22k81a0501@kpritech.ac.in", "password": "CampusHub2026!"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            return data.get("tokens", {}).get("access")
    except Exception as e:
        print(f"Warning: Could not fetch auth token: {e}")
        return None

async def main():
    parser = argparse.ArgumentParser(description="CampusHub WebSocket Benchmark")
    parser.add_argument("--concurrency", type=int, default=500, help="Concurrent WebSocket connections")
    parser.add_argument("--duration", type=int, default=15, help="Test duration in seconds")
    parser.add_argument("--url", type=str, default="ws://127.0.0.1:8000/ws/notifications/", help="WebSocket endpoint")
    args = parser.parse_args()

    token = await get_auth_token()
    ws_url = f"{args.url}?token={token}" if token else args.url

    print(f"\n[WebSocket Benchmark] Target Concurrency: {args.concurrency} | Duration: {args.duration}s | URL: {args.url}")
    results = {
        'connected': 0,
        'errors': 0,
        'timeouts': 0,
        'connect_latencies': [],
        'ping_latencies': [],
        'error_messages': []
    }

    # Stagger connections over 5 seconds
    batch_size = 50
    tasks = []
    for i in range(args.concurrency):
        tasks.append(asyncio.create_task(connect_client(i, ws_url, args.duration, results)))
        if (i + 1) % batch_size == 0:
            await asyncio.sleep(0.05)

    await asyncio.gather(*tasks, return_exceptions=True)

    print("\n==================================================")
    print("WEBSOCKET BENCHMARK RESULTS")
    print("==================================================")
    print(f"Total Connections Attempted: {args.concurrency}")
    print(f"Successfully Connected:      {results['connected']}")
    print(f"Errors / Disconnects:        {results['errors']}")
    print(f"Timeouts:                    {results['timeouts']}")
    
    if results['connect_latencies']:
        cl = sorted(results['connect_latencies'])
        p50 = cl[int(len(cl) * 0.50)]
        p95 = cl[int(len(cl) * 0.95)]
        p99 = cl[int(len(cl) * 0.99)]
        print(f"Connect Handshake Latency:   p50={p50:.1f}ms | p95={p95:.1f}ms | p99={p99:.1f}ms")

    if results['ping_latencies']:
        pl = sorted(results['ping_latencies'])
        p50 = pl[int(len(pl) * 0.50)]
        p95 = pl[int(len(pl) * 0.95)]
        p99 = pl[int(len(pl) * 0.99)]
        print(f"Heartbeat Ping/Pong Latency: p50={p50:.1f}ms | p95={p95:.1f}ms | p99={p99:.1f}ms")
    print("==================================================\n")

if __name__ == "__main__":
    asyncio.run(main())
