from geopy.geocoders import Nominatim
from geopy.exc import GeopyError

class AddressGeocoder:
    def __init__(self, user_agent="smart_route_planner"):
        self.geolocator = Nominatim(user_agent=user_agent)

    def geocode(self, address):
        """
        Converts an address string to (latitude, longitude, full_name).
        """
        try:
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
