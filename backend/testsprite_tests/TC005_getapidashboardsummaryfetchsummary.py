import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Placeholder for a valid JWT token with access to /api/dashboard/summary
VALID_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZXhhbXBsZXVzZXIiLCJpYXQiOjE2MjYwMDAwMDB9.Qw5eJ7G1YOQ0lE7HJBkFxaGJZx7b5Ho8S08dt7iG5uo"

def test_get_api_dashboard_summary_fetch_summary():
    headers = {
        "Authorization": f"Bearer {VALID_JWT_TOKEN}"
    }
    url = f"{BASE_URL}/api/dashboard/summary"
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate expected keys for aggregated cost metrics and recommendation counts
    # Typical keys might include cost metrics and recommendations
    cost_keys = [
        "totalCost", "savingsPotential", "unblendedCost", "forecastedCost"
    ]
    recommendation_keys = [
        "recommendationCount", "ec2Recommendations", "s3Recommendations", "ebsRecommendations", "elasticIpRecommendations"
    ]

    # Check at least one aggregated cost metric is present and is numeric
    cost_metrics_present = any(k in json_data for k in cost_keys)
    assert cost_metrics_present, "Aggregated cost metrics missing in response"

    # Check recommendation counts are present and are integers >= 0
    rec_counts_present = any(k in json_data for k in recommendation_keys)
    assert rec_counts_present, "Recommendation counts missing in response"

    # Validate numeric types if present
    for key in cost_keys:
        if key in json_data:
            val = json_data[key]
            assert isinstance(val, (int, float)), f"Cost metric '{key}' must be numeric"

    for key in recommendation_keys:
        if key in json_data:
            val = json_data[key]
            assert isinstance(val, int) and val >= 0, f"Recommendation count '{key}' must be int >= 0"

test_get_api_dashboard_summary_fetch_summary()