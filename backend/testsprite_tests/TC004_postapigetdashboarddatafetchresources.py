import requests

def test_post_api_get_dashboard_data_fetch_resources():
    base_url = "http://localhost:5000"
    endpoint = "/api/get-dashboard-data"
    url = base_url + endpoint
    timeout = 30

    # Replace these with valid AWS credentials for testing
    aws_credentials = {
        "accessKeyId": "VALID_ACCESS_KEY_ID",
        "secretAccessKey": "VALID_SECRET_ACCESS_KEY",
        "region": "us-east-1"
    }

    headers = {
        "Content-Type": "application/json"
    }

    response = None
    try:
        response = requests.post(url, json=aws_credentials, headers=headers, timeout=timeout)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        data = response.json()
        # Validate presence of keys that indicate active resources and cost payload
        assert "activeResources" in data or "resources" in data, "Response missing active resources data"
        assert "cost" in data or "costs" in data, "Response missing cost data"
        # Optional: Validate types if schema known
        # eg: assert isinstance(data.get("activeResources", data.get("resources", None)), list)
        # eg: assert isinstance(data.get("cost", data.get("costs", None)), dict)
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_get_dashboard_data_fetch_resources()