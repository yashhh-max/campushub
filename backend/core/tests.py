from django.test import TestCase, Client
from django.urls import reverse
import json


class HealthCheckTests(TestCase):
    """
    Automated test suite verifying the health and liveness probe endpoints.
    """

    def setUp(self):
        self.client = Client()

    def test_health_check_endpoint(self):
        """Verify /api/health/ returns 200 OK and expected JSON schema."""
        url = reverse('health-check')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("app"), "CampusHub API")
        self.assertEqual(data.get("version"), "1.0.0")
        self.assertEqual(data.get("database"), "connected")
        self.assertIn("database_engine", data)
        self.assertIn("uptime_seconds", data)
        self.assertIn("timestamp", data)
        self.assertGreaterEqual(data["uptime_seconds"], 0)

    def test_ping_endpoint(self):
        """Verify /api/health/ping/ returns 200 OK and pong status."""
        url = reverse('health-ping')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data.get("status"), "pong")
        self.assertEqual(data.get("service"), "campushub-api")
        self.assertIn("timestamp", data)

    def test_health_check_cors_headers(self):
        """Verify CORS headers respond correctly for allowed frontend origin."""
        url = reverse('health-check')
        response = self.client.get(url, HTTP_ORIGIN='http://localhost:3000')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"),
            "http://localhost:3000"
        )
