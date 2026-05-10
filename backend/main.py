from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

from core.geocoder import AddressGeocoder

app = FastAPI(title="Global Route Planner API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

geocoder = AddressGeocoder()

class RouteRequest(BaseModel):
    start_address: str
    destination_address: str

@app.post("/api/find-route")
async def find_route(request: RouteRequest):
    try:
        # 1. Geocode Start and Destination
        start_result = geocoder.geocode(request.start_address)
        dest_result = geocoder.geocode(request.destination_address)

        if not start_result or not dest_result:
            raise HTTPException(status_code=404, detail="One or both addresses could not be found globally.")

        start_lat, start_lon, start_full_name = start_result
        dest_lat, dest_lon, dest_full_name = dest_result

        # 2. Query OSRM API for the route
        # OSRM expects coordinates in lon,lat format
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson"
        
        headers = {
            'User-Agent': 'AI-Route-Planner-App/1.0'
        }
        
        response = requests.get(osrm_url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to retrieve route from OSRM.")
            
        data = response.json()
        
        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(status_code=404, detail="No route found between these points via road network.")
            
        route = data["routes"][0]
        
        # OSRM returns coordinates as [lon, lat], Leaflet expects [lat, lon]
        geojson_coords = route["geometry"]["coordinates"]
        leaflet_coords = [[lat, lon] for lon, lat in geojson_coords]
        
        distance_meters = route["distance"]
        duration_seconds = route["duration"]

        return {
            "status": "success",
            "start_name": start_full_name,
            "dest_name": dest_full_name,
            "start_coords": [start_lat, start_lon],
            "dest_coords": [dest_lat, dest_lon],
            "distance_km": round(distance_meters / 1000, 2),
            "est_time_min": round(duration_seconds / 60, 1),
            "coordinates": leaflet_coords
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
