import requests

def test_post_api_settings_aws_save_credentials():
    base_url = "http://localhost:5000"
    endpoint = "/api/settings/aws"
    url = base_url + endpoint
    timeout = 30

    # Example valid JWT token for authentication (replace with actual token if available)
    jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.token"

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "accessKeyId": "AKIAEXAMPLEACCESSKEY",
        "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "region": "us-west-2"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}. Response: {response.text}"

    try:
        json_response = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(json_response, dict), "Response JSON is not an object"

test_post_api_settings_aws_save_credentials()