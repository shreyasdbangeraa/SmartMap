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
    avoid_tolls: bool = False

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

        # 2. Query OSRM API for the route with alternatives
        exclude_param = "&exclude=tolls" if request.avoid_tolls else ""
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson&alternatives=true{exclude_param}"
        
        headers = { 'User-Agent': 'AI-Route-Planner-App/1.0' }
        response = requests.get(osrm_url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to retrieve route from OSRM.")
            
        data = response.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(status_code=404, detail="No route found between these points.")
            
        all_routes_data = []
        import random
        
        for idx, osrm_route in enumerate(data["routes"]):
            # OSRM returns coordinates as [lon, lat], Leaflet expects [lat, lon]
            geojson_coords = osrm_route["geometry"]["coordinates"]
            leaflet_coords = [[lat, lon] for lon, lat in geojson_coords]
            
            distance_meters = osrm_route["distance"]
            duration_seconds = osrm_route["duration"]

            # Simulate Toll detection for each alternative
            # Usually, if avoid_tolls is True, none will have tolls
            has_toll = False
            toll_price = 0
            
            if not request.avoid_tolls:
                # Primary route (idx 0) follows keyword logic
                # Alternatives might have different toll status
                if idx == 0:
                    toll_keywords = ["mumbai", "bangalore", "delhi", "expressway", "toll", "nh"]
                    addr_text = (start_full_name + dest_full_name).lower()
                    is_toll_prone = any(kw in addr_text for kw in toll_keywords)
                    if is_toll_prone and distance_meters > 50000:
                        has_toll = random.random() < 0.9
                else:
                    # Alternative routes have a 20% chance of tolls if they are long
                    has_toll = random.random() < 0.2 if distance_meters > 100000 else False
                
                if has_toll:
                    dist_km = distance_meters / 1000
                    toll_price = 40 + (int(dist_km / 100) * 45) + (random.randint(0, 5) * 10)

            # 3. Simulate Traffic Intensity for this route
            segments = []
            chunk_size = max(2, len(leaflet_coords) // 12)
            random.seed(int(distance_meters) + idx) # Unique traffic for each alternative
            
            for i in range(0, len(leaflet_coords), chunk_size):
                chunk = leaflet_coords[i:i + chunk_size + 1]
                if len(chunk) < 2: continue
                    
                rand = random.random()
                if rand < 0.6: level = "low"
                elif rand < 0.85: level = "medium"
                else: level = "high"
                    
                segments.append({ "coords": chunk, "traffic": level })

            all_routes_data.append({
                "id": idx,
                "distance_km": round(distance_meters / 1000, 2),
                "est_time_min": round(duration_seconds / 60, 1),
                "coordinates": leaflet_coords,
                "segments": segments,
                "has_toll": has_toll,
                "toll_price": toll_price,
                "summary": osrm_route.get("summary", f"Route {idx + 1}")
            })

        # Return primary route at top level for compatibility, and all routes in list
        primary = all_routes_data[0]
        return {
            "status": "success",
            "start_name": start_full_name,
            "dest_name": dest_full_name,
            "start_coords": [start_lat, start_lon],
            "dest_coords": [dest_lat, dest_lon],
            "routes": all_routes_data,
            "avoid_tolls": request.avoid_tolls,
            # Legacy fields for primary route
            "distance_km": primary["distance_km"],
            "est_time_min": primary["est_time_min"],
            "coordinates": primary["coordinates"],
            "segments": primary["segments"],
            "has_toll": primary["has_toll"],
            "toll_price": primary["toll_price"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Backend error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
