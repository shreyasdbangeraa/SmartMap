import requests
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.geocoder import AddressGeocoder

def debug_route():
    geocoder = AddressGeocoder()
    start_addr = "Mumbai, India"
    dest_addr = "Pune, India"
    
    print(f"Geocoding {start_addr}...")
    start_result = geocoder.geocode(start_addr)
    print(f"Result: {start_result}")
    
    print(f"Geocoding {dest_addr}...")
    dest_result = geocoder.geocode(dest_addr)
    print(f"Result: {dest_result}")
    
    if not start_result or not dest_result:
        print("Geocoding failed.")
        return

    start_lat, start_lon, _ = start_result
    dest_lat, dest_lon, _ = dest_result
    
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson"
    print(f"Querying OSRM: {osrm_url}")
    
    headers = {'User-Agent': 'AI-Route-Planner-App/1.0'}
    response = requests.get(osrm_url, headers=headers)
    print(f"OSRM Response Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("OSRM Data keys:", data.keys())
        if data.get("code") == "Ok":
            route = data["routes"][0]
            print("Distance:", route["distance"])
            print("Duration:", route["duration"])
            print("First few coords:", route["geometry"]["coordinates"][:3])
        else:
            print("OSRM Error:", data.get("code"))
    else:
        print("OSRM Failed:", response.text)

if __name__ == "__main__":
    debug_route()
