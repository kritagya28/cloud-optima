import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_gethealthapihealthcheck():
    url = f"{BASE_URL}/health"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to /health failed: {e}"
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        data = response.json()
        assert isinstance(data, dict), "Response JSON is not an object as expected"
    except ValueError:
        assert False, "Response is not valid JSON"

test_gethealthapihealthcheck()