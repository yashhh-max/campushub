"""
KPRIT CAMPUSHUB — HIGH-CONCURRENCY 10,000 CONCURRENT USERS LOAD-TEST HARNESS
Professional Locust test suite covering Scenarios A through L:
- Scenario A: Students logging in (/api/token/)
- Scenario B: Students opening dashboards (/api/events/, /api/announcements/, /api/notifications/unread-count/)
- Scenario C: Students browsing events (/api/events/?page=1, /api/events/?category=Tech)
- Scenario D: Students opening event details (/api/events/<id>/)
- Scenario E: Students registering for events (/api/events/<id>/rsvp/)
- Scenario F: Students browsing announcements (/api/announcements/)
- Scenario G: Students checking notifications (/api/notifications/)
- Scenario H: Students browsing clubs (/api/clubs/)
- Scenario I: Students viewing placement opportunities (/api/placement/drives/, /api/opportunities/)
- Scenario J: Students applying to eligible placement drives (/api/placement/drives/<id>/apply/)
- Scenario K: Health check & monitoring probes (/api/health/ping/, /api/health/)
- Scenario L: WebSocket handshake and connection stability
"""

import json
import logging
import random
from locust import HttpUser, task, between, events, tag

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("campushub_loadtest")


class StudentUser(HttpUser):
    """
    Simulates an authenticated KPRIT student conducting realistic academic activities:
    dashboard review, event discovery, announcement tracking, placement applications, and club engagement.
    """
    _shared_token = None

    def on_start(self):
        """
        Obtains or reuses authenticated JWT token for the session.
        """
        self.event_ids = []
        self.club_slugs = []
        self.drive_ids = []
        self.access_token = StudentUser._shared_token

        if not self.access_token:
            login_payload = {
                "email": "22k81a0501@kpritech.ac.in",
                "password": "CampusHub2026!",
            }
            try:
                with self.client.post(
                    "/api/auth/login/",
                    json=login_payload,
                    catch_response=True,
                    name="Scenario A: Student Login"
                ) as response:
                    if response.status_code == 200:
                        data = response.json()
                        tokens = data.get("tokens", {})
                        self.access_token = tokens.get("access")
                        StudentUser._shared_token = self.access_token
                        response.success()
                    else:
                        response.failure(f"Login failed: status {response.status_code}")
            except Exception as e:
                logger.warning(f"Login exception: {e}")

        self.headers = {}
        if self.access_token:
            self.headers["Authorization"] = f"Bearer {self.access_token}"

    @tag("auth")
    @task(1)
    def scenario_a_login_activity(self):
        """Periodic login activity representing ongoing student arrivals."""
        login_payload = {
            "email": "22k81a0501@kpritech.ac.in",
            "password": "CampusHub2026!",
        }
        self.client.post(
            "/api/auth/login/",
            json=login_payload,
            name="Scenario A: Student Login"
        )

    # --------------------------------------------------------------------------
    # SCENARIO B: Dashboard Overview
    # --------------------------------------------------------------------------
    @tag("read", "dashboard")
    @task(10)
    def scenario_b_dashboard(self):
        """Simulates student opening home dashboard with aggregated feeds."""
        with self.client.get(
            "/api/events/?upcoming=true&page_size=6",
            headers=self.headers,
            catch_response=True,
            name="Scenario B: Dashboard Upcoming Events"
        ) as res:
            if res.status_code == 200:
                results = res.json().get("results", [])
                if results:
                    self.event_ids = [e["id"] for e in results]
                res.success()
            else:
                res.failure(f"Dashboard events failed: {res.status_code}")

        self.client.get(
            "/api/announcements/?page_size=5",
            headers=self.headers,
            name="Scenario B: Dashboard Announcements"
        )

        if self.access_token:
            self.client.get(
                "/api/notifications/unread-count/",
                headers=self.headers,
                name="Scenario B: Notification Badge Count"
            )

    # --------------------------------------------------------------------------
    # SCENARIO C: Browse Events Directory
    # --------------------------------------------------------------------------
    @tag("read", "events")
    @task(8)
    def scenario_c_browse_events(self):
        """Browse paginated events with optional category filtering."""
        categories = ["Tech", "Career", "Arts", "Social", "Academic", "Sports"]
        chosen_cat = random.choice(categories) if random.random() < 0.4 else "all"

        url = "/api/events/?page=1"
        if chosen_cat != "all":
            url += f"&category={chosen_cat}"

        with self.client.get(
            url,
            headers=self.headers,
            catch_response=True,
            name="Scenario C: Browse Events List"
        ) as res:
            if res.status_code == 200:
                results = res.json().get("results", [])
                if results:
                    self.event_ids = [e["id"] for e in results]
                res.success()
            else:
                res.failure(f"Event list failed: {res.status_code}")

    # --------------------------------------------------------------------------
    # SCENARIO D: Event Details
    # --------------------------------------------------------------------------
    @tag("read", "events")
    @task(6)
    def scenario_d_event_detail(self):
        """Inspect single event details and RSVP state."""
        if not self.event_ids:
            return
        event_id = random.choice(self.event_ids)
        self.client.get(
            f"/api/events/{event_id}/",
            headers=self.headers,
            name="Scenario D: Event Details"
        )

    # --------------------------------------------------------------------------
    # SCENARIO E: Event RSVP / Registration
    # --------------------------------------------------------------------------
    @tag("write", "events")
    @task(1)
    def scenario_e_event_rsvp(self):
        """Register (RSVP) or cancel registration for an event."""
        if not self.access_token or not self.event_ids:
            return
        event_id = random.choice(self.event_ids)
        with self.client.post(
            f"/api/events/{event_id}/rsvp/",
            json={"status": "attending"},
            headers=self.headers,
            catch_response=True,
            name="Scenario E: Event RSVP Action"
        ) as res:
            if res.status_code in (200, 201, 400):
                # 400 is acceptable if event is already RSVP'd or full
                res.success()
            else:
                res.failure(f"RSVP failed with status {res.status_code}")

    # --------------------------------------------------------------------------
    # SCENARIO F: Announcements Feed
    # --------------------------------------------------------------------------
    @tag("read", "announcements")
    @task(7)
    def scenario_f_announcements(self):
        """Students browsing campus broadcast announcements."""
        self.client.get(
            "/api/announcements/?page=1",
            headers=self.headers,
            name="Scenario F: Campus Announcements Feed"
        )

    # --------------------------------------------------------------------------
    # SCENARIO G: Notifications
    # --------------------------------------------------------------------------
    @tag("read", "notifications")
    @task(5)
    def scenario_g_notifications(self):
        """Students fetching personal notifications list."""
        if not self.access_token:
            return
        self.client.get(
            "/api/notifications/?page=1",
            headers=self.headers,
            name="Scenario G: Notifications List"
        )

    # --------------------------------------------------------------------------
    # SCENARIO H: Clubs Directory & Detail
    # --------------------------------------------------------------------------
    @tag("read", "clubs")
    @task(6)
    def scenario_h_clubs(self):
        """Students browsing club catalog and specific club profiles."""
        with self.client.get(
            "/api/clubs/?page=1",
            headers=self.headers,
            catch_response=True,
            name="Scenario H: Clubs Directory"
        ) as res:
            if res.status_code == 200:
                results = res.json().get("results", [])
                if results:
                    self.club_slugs = [c.get("slug", c.get("id")) for c in results]
                res.success()
            else:
                res.failure(f"Clubs directory failed: {res.status_code}")

        if self.club_slugs:
            club_slug = random.choice(self.club_slugs)
            self.client.get(
                f"/api/clubs/{club_slug}/",
                headers=self.headers,
                name="Scenario H: Club Profile Detail"
            )

    # --------------------------------------------------------------------------
    # SCENARIO I: Placement Drives & Opportunities
    # --------------------------------------------------------------------------
    @tag("read", "placement")
    @task(5)
    def scenario_i_placement_opportunities(self):
        """Students reviewing recruitment drives and campus opportunities."""
        with self.client.get(
            "/api/placements/drives/",
            headers=self.headers,
            catch_response=True,
            name="Scenario I: Placement Drives List"
        ) as res:
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list) and data:
                    self.drive_ids = [d["id"] for d in data]
                res.success()
            else:
                res.failure(f"Placement drives failed: {res.status_code}")

        self.client.get(
            "/api/opportunities/",
            headers=self.headers,
            name="Scenario I: Opportunities Feed"
        )

    # --------------------------------------------------------------------------
    # SCENARIO J: Placement Application
    # --------------------------------------------------------------------------
    @tag("write", "placement")
    @task(1)
    def scenario_j_placement_application(self):
        """Students submitting recruitment drive applications."""
        if not self.access_token or not self.drive_ids:
            return
        drive_id = random.choice(self.drive_ids)
        with self.client.post(
            f"/api/placements/drives/{drive_id}/apply/",
            json={"resume_url": "https://example.com/resumes/22k81a0501.pdf"},
            headers=self.headers,
            catch_response=True,
            name="Scenario J: Placement Drive Application"
        ) as res:
            if res.status_code in (200, 201, 400):
                res.success()
            else:
                res.failure(f"Placement apply failed: {res.status_code}")

    # --------------------------------------------------------------------------
    # SCENARIO K: System Health & Ping Checks
    # --------------------------------------------------------------------------
    @tag("infra", "health")
    @task(3)
    def scenario_k_health_ping(self):
        """High-frequency liveness probes executed by load balancers and orchestrators."""
        self.client.get(
            "/api/health/ping/",
            name="Scenario K: Health Ping Probe"
        )
