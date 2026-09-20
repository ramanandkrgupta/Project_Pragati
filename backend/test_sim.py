import requests, json
url = "http://localhost:8000/api/v1/predict/simulate"
payload = {
    "original_cost": 3500,
    "revised_cost": 4500,
    "expenditure": 3200,
    "physical_progress": 42,
    "timeline_extension_months": 18,
    "sector": "Highways"
}
resp = requests.post(url, json=payload)
print(json.dumps(resp.json(), indent=2))
