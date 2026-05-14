from geopy.geocoders import Nominatim
from geopy.exc import GeopyError

class AddressGeocoder:
    def __init__(self, user_agent="smart_route_planner"):
        self.geolocator = Nominatim(user_agent=user_agent)

    def geocode(self, address):
        """
        Converts an address string to (latitude, longitude, full_name).
        Handles both text addresses and coordinate strings like "lat, lon".
        """
        try:
            # Check if input is "lat, lon" (e.g. from GPS)
            if "," in address:
                parts = [p.strip() for p in address.split(",")]
                if len(parts) == 2:
                    try:
                        lat = float(parts[0])
                        lon = float(parts[1])
                        # Basic coordinate validation
                        if -90 <= lat <= 90 and -180 <= lon <= 180:
                            return (lat, lon, "Your Current Location")
                    except ValueError:
                        pass

            location = self.geolocator.geocode(address)
            if location:
                return (location.latitude, location.longitude, location.address)
            else:
                print(f"Could not find address: {address}")
                return None
        except GeopyError as e:
            print(f"Geocoding error: {e}")
            return None

if __name__ == "__main__":
    # Quick test
    geo = AddressGeocoder()
    addr = "Stevens Institute of Technology, Hoboken, NJ"
    result = geo.geocode(addr)
    
    if result:
        lat, lon, name = result
        print(f"Address: {name}")
        print(f"Coordinates: ({lat}, {lon})")
