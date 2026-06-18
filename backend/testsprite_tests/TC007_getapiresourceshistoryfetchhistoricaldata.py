import requests

def test_getapiresourceshistoryfetchhistoricaldata():
    base_url = "http://localhost:5000"
    url = f"{base_url}/api/resources/history"
    timeout = 30

    # Replace this placeholder token with a valid token for real testing
    token = "your_valid_auth_token_here"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Check that response contains historical cost trend data (at least keys present)
    # Since schema is not detailed, verify it's a non-empty dict/object
    assert isinstance(data, dict), "Response JSON is not an object/dict"
    assert len(data) > 0, "Response JSON is empty, expected historical cost trend data"

test_getapiresourceshistoryfetchhistoricaldata()
