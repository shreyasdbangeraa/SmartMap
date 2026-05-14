import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { MapContainer, TileLayer, Polyline, useMap, Marker, Popup, Tooltip, CircleMarker } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, 
  Map as MapIcon, 
  Search, 
  Clock, 
  MoveHorizontal,
  Loader2,
  AlertCircle,
  Menu,
  Bookmark,
  History,
  MapPin,
  X,
  LocateFixed,
  Target
} from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const API_BASE = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : 'https://smartmap-backend-s4ml.onrender.com/api');

// Component to fly map to new bounds or center
function ChangeView({ bounds, center }) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds, { padding: [50, 50] });
  } else if (center) {
    map.setView(center, 4);
  }
  return null;
}

function App() {
  const [startAddr, setStartAddr] = useState('');
  const [destAddr, setDestAddr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [tagPosition, setTagPosition] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [allRoutes, setAllRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [flyToUser, setFlyToUser] = useState(false);

  // Live GPS Tracking
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleLocateMe = () => {
    if (userLocation) {
      setFlyToUser(true);
      // Reset after a moment so it can be triggered again
      setTimeout(() => setFlyToUser(false), 500);
    } else {
      alert("Locating you... Please ensure location permissions are enabled.");
    }
  };

  const handleFindRoute = async () => {
    if (!startAddr || !destAddr) {
      setError("Please enter both starting and destination addresses.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Handle "Your Location" by passing actual coordinates
      let finalStart = startAddr;
      let finalDest = destAddr;

      if (startAddr === "Your Location" && userLocation) {
        finalStart = `${userLocation[0]},${userLocation[1]}`;
      }
      if (destAddr === "Your Location" && userLocation) {
        finalDest = `${userLocation[0]},${userLocation[1]}`;
      }

      const res = await fetch(`${API_BASE}/find-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          start_address: finalStart, 
          destination_address: finalDest,
          avoid_tolls: avoidTolls
        })
      });

      if (!res.ok) {
        if (res.status === 502) {
          throw new Error("Backend server is starting up. Please try again in 5 seconds.");
        }
      }

      const data = await res.json();
      console.log("Route Data Received:", data);
      
      if (res.ok) {
        setAllRoutes(data.routes);
        setSelectedRouteIndex(0);
        setRoute(data.routes[0]); // Keep for backward compatibility/legacy components
        setIsDropdownOpen(false); // Hide dropdown on success
        if (data.routes[0].coordinates.length > 0) {
          setMapBounds(data.routes[0].coordinates);
        }
      } else {
        setError(data.detail || 'Route calculation failed');
      }
    } catch (err) {
      setError(err.message || 'Backend server is not responding.');
    } finally {
      setLoading(false);
    }
  };

  const currentRoute = allRoutes[selectedRouteIndex] || route;

  return (
    <div className="app-container">
      {/* Narrow Left Nav */}
      <nav className="left-nav">
        <div className="nav-top-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <Menu size={24} />
        </div>
        
        <div className="nav-item">
          <Navigation size={22} color="var(--primary)" />
          <span>Ask Maps</span>
        </div>
        
        <div className="nav-item">
          <Bookmark size={22} />
          <span>Saved</span>
        </div>
        
        <div className="nav-item">
          <History size={22} />
          <span>Recents</span>
        </div>

        <div className="nav-spacer" />
        
        <div className="nav-item">
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%', 
            background: '#1a73e8', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 500
          }}>
            S
          </div>
        </div>
      </nav>

      {/* Floating Search & Routing */}
      <div className="search-container">
        <div className="search-bar">
          <div className="search-btn-icon" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <Menu size={20} />
          </div>
          <input 
            placeholder="Search Smart Map" 
            value={destAddr}
            onFocus={() => setIsDropdownOpen(true)}
            readOnly
          />
          <div className="search-btn-icon">
            <Search size={20} />
          </div>
          <div className="nav-arrow-btn" onClick={handleFindRoute}>
            <Navigation size={18} fill="white" />
          </div>
        </div>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="routing-card"
            >
              <div className="routing-tabs">
                <Navigation size={18} className="routing-tab-icon" />
                <MapIcon 
                  size={18} 
                  className={`routing-tab-icon ${showTraffic ? 'active-tab' : ''}`} 
                  onClick={() => setShowTraffic(!showTraffic)}
                  color={showTraffic ? 'var(--primary)' : 'currentColor'}
                  fill={showTraffic ? 'rgba(26, 115, 232, 0.1)' : 'none'}
                />
                <MoveHorizontal 
                  size={18} 
                  className={`routing-tab-icon ${avoidTolls ? 'active-tab' : ''}`} 
                  onClick={() => setAvoidTolls(!avoidTolls)}
                  color={avoidTolls ? '#f4b400' : 'currentColor'}
                />
                <History size={18} className="routing-tab-icon" />
                <Search size={18} className="routing-tab-icon" />
                <div style={{ marginLeft: 'auto' }}>
                  <X size={18} className="routing-tab-icon" onClick={() => setIsDropdownOpen(false)} />
                </div>
              </div>

              <div className="routing-inputs">
                <div className="input-group">
                  <div className="route-dot" />
                  <input 
                    placeholder="Enter starting point" 
                    value={startAddr}
                    onChange={(e) => setStartAddr(e.target.value)}
                    style={{ paddingRight: '36px' }}
                  />
                  <div 
                    className="use-my-location-icon" 
                    title="Use my location"
                    onClick={() => {
                      if (userLocation) {
                        setStartAddr("Your Location");
                      } else {
                        alert("Locating you... please wait.");
                      }
                    }}
                  >
                    <Target size={16} color={startAddr === "Your Location" ? "var(--primary)" : "#5f6368"} />
                  </div>
                </div>
                <div className="input-group">
                  <MapPin size={18} className="route-pin" />
                  <input 
                    placeholder="Enter destination" 
                    value={destAddr}
                    onChange={(e) => setDestAddr(e.target.value)}
                  />
                </div>
                
                {/* Toll Toggle Option */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
                  <input 
                    type="checkbox" 
                    id="avoidTolls" 
                    checked={avoidTolls} 
                    onChange={(e) => setAvoidTolls(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <label htmlFor="avoidTolls" style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Avoid Toll Roads
                  </label>
                </div>
              </div>

              {error && (
                <div style={{ padding: '0 16px', color: '#d93025', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <button className="find-route-btn" onClick={handleFindRoute} disabled={loading}>
                {loading ? "Searching..." : "Find Route"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trip Information Panel */}
      <AnimatePresence>
        {currentRoute && !isDropdownOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="trip-info-card"
          >
            <div className="trip-info-header">
              <span className="trip-info-label">{currentRoute.summary || 'Trip Information'}</span>
              {selectedRouteIndex === 0 && <span className="optimal-badge">OPTIMAL</span>}
            </div>
            
            <div className="trip-main-stat">
              <Clock size={18} color="#188038" />
              <span className="trip-time">
                {currentRoute.est_time_min > 60 ? `${Math.round(currentRoute.est_time_min / 60)} hr ${Math.round(currentRoute.est_time_min % 60)} min` : `${currentRoute.est_time_min} min`}
              </span>
            </div>

            <div className="trip-sub-stat" style={{ marginBottom: 8 }}>
              {currentRoute.distance_km} km • via {currentRoute.summary || 'shortest path'}
            </div>

            {/* Toll Status Badge */}
            {currentRoute.has_toll && (
              <div style={{ 
                background: '#fef7e0', 
                color: '#b06000', 
                padding: '8px 12px', 
                borderRadius: '8px', 
                fontSize: '12px', 
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginBottom: 8,
                border: '1px solid #ffe168'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} />
                  <span>Toll road detected</span>
                </div>
                <div style={{ fontSize: '14px', color: '#1f1f1f', fontWeight: 700 }}>
                  Est. Toll: ₹{currentRoute.toll_price}
                </div>
              </div>
            )}

            {avoidTolls && (
              <div style={{ 
                background: '#e6f4ea', 
                color: '#137333', 
                padding: '6px 10px', 
                borderRadius: '6px', 
                fontSize: '11px', 
                fontWeight: 600,
                marginBottom: 8
              }}>
                ✓ Avoiding all toll roads
              </div>
            )}

            {showTraffic && (
              <div className="traffic-legend">
                <div className="legend-item">
                  <div className="legend-line" style={{ background: '#0047ff' }} />
                  <span>Low</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ background: '#ffa500' }} />
                  <span>Moderate</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ background: '#ff0000' }} />
                  <span>Heavy</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map View */}
      <main className="map-view">
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          scrollWheelZoom={true}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            attribution='&copy; Google Maps'
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
          <ChangeView bounds={mapBounds} center={flyToUser ? userLocation : null} />
          
          {/* User Live Location Marker */}
          {userLocation && (
            <Marker 
              position={userLocation} 
              zIndexOffset={1000}
              icon={L.divIcon({
                className: 'user-location-wrapper',
                html: `<div class="user-location-dot">
                         <div class="user-location-pulse"></div>
                       </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            />
          )}

          {allRoutes.map((r, rIdx) => {
            const isSelected = rIdx === selectedRouteIndex;
            const midPoint = r.coordinates[Math.floor(r.coordinates.length / 2)];
            
            return (
              <React.Fragment key={r.id}>
                {/* Base Route Line */}
                <Polyline 
                  positions={r.coordinates} 
                  eventHandlers={{ click: () => setSelectedRouteIndex(rIdx) }}
                  pathOptions={{ 
                    color: isSelected ? '#00084d' : '#70757a', 
                    weight: isSelected ? 10 : 6, 
                    opacity: isSelected ? 0.6 : 0.4, 
                    lineJoin: 'round' 
                  }} 
                />

                {/* Selected Route Traffic Segments */}
                {isSelected && (
                  showTraffic && r.segments ? r.segments.map((seg, sIdx) => (
                    <Polyline 
                      key={`seg-${sIdx}`}
                      positions={seg.coords} 
                      pathOptions={{ 
                        color: seg.traffic === 'high' ? '#ff0000' : seg.traffic === 'medium' ? '#ffa500' : '#0047ff',
                        weight: 6, opacity: 1, lineJoin: 'round'
                      }} 
                    />
                  )) : (
                    <Polyline 
                      positions={r.coordinates} 
                      pathOptions={{ color: '#0047ff', weight: 6, opacity: 1, lineJoin: 'round' }} 
                    />
                  )
                )}

                {/* Route Floating Tag */}
                <Marker 
                  position={midPoint} 
                  eventHandlers={{ click: () => setSelectedRouteIndex(rIdx) }}
                  icon={L.divIcon({
                    className: 'custom-time-tag-wrapper',
                    html: `<div class="google-time-tag ${isSelected ? 'active-tag' : 'alt-tag'}">
                             <div class="time-text">
                                ${r.est_time_min >= 60 ? `${Math.floor(r.est_time_min / 60)}h ${Math.round(r.est_time_min % 60)}m` : `${Math.round(r.est_time_min)}m`}
                             </div>
                             ${!r.has_toll ? '<div class="toll-label">No tolls</div>' : ''}
                           </div>`,
                    iconSize: [80, 42],
                    iconAnchor: [40, 42]
                  })}
                />
              </React.Fragment>
            );
          })}

          {currentRoute && (
            <>
              <CircleMarker center={allRoutes[0].coordinates[0]} radius={8} pathOptions={{ color: 'white', fillColor: '#0047ff', fillOpacity: 1, weight: 2 }} />
              <Marker position={allRoutes[0].coordinates[allRoutes[0].coordinates.length - 1]} icon={redIcon} />
            </>
          )}
        </MapContainer>

        {/* Floating Locate Button */}
        <button className="locate-btn" onClick={handleLocateMe} title="Show my location">
          <LocateFixed size={24} color={userLocation ? "var(--primary)" : "#5f6368"} />
        </button>
      </main>
      <Analytics />
    </div>
  );
}

export default App;
