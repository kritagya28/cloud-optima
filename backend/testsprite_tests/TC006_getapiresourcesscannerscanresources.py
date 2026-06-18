import requests

BASE_URL = "http://localhost:5000"
TOKEN = "your_valid_jwt_token_here"  # Replace with valid JWT token

def test_getapiresourcesscannerscanresources():
    url = f"{BASE_URL}/api/resources/scanner"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_data = response.json()
        # Assert presence of scan results and optimization recommendations fields
        assert isinstance(json_data, dict), "Response is not a JSON object"
        # The exact keys are not defined, but likely presence of keys such as 'scanResults', 'recommendations'
        assert "scanResults" in json_data or "results" in json_data or "data" in json_data, "No scan results found in response"
        assert "optimizationRecommendations" in json_data or "recommendations" in json_data, "No optimization recommendations found in response"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_getapiresourcesscannerscanresources()