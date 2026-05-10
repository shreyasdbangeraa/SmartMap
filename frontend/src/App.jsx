import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, Marker, Popup, Tooltip, CircleMarker } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, 
  Map as MapIcon, 
  Search, 
  Clock, 
  MoveHorizontal,
  Loader2,
  AlertCircle
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

const API_BASE = import.meta.env.VITE_API_URL || 'https://smartmap-backend-s4ml.onrender.com/api';

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
  const [isFormExpanded, setIsFormExpanded] = useState(true);

  const handleFindRoute = async () => {
    if (!startAddr || !destAddr) {
      setError("Please enter both starting and destination addresses.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/find-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          start_address: startAddr, 
          destination_address: destAddr 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRoute(data);
        setIsFormExpanded(false); // Auto-hide form on mobile
        if (data.coordinates.length > 0) {
          setMapBounds(data.coordinates);
          setTagPosition(data.coordinates[Math.floor(data.coordinates.length / 2)]);
        }
      } else {
        setError(data.detail || 'Route calculation failed');
      }
    } catch (err) {
      setError('Backend server is not responding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -400 }}
        animate={{ x: 0 }}
        className="sidebar"
      >
        <div className="top-bubble">
          <div className="logo-section">
            <div className="logo-icon-wrapper">
              <Navigation className="logo-icon" size={32} color="var(--primary)" />
            </div>
            <div className="logo-text">
              <h1>Smart Map</h1>
              <p>Anywhere to Anywhere</p>
            </div>
          </div>

          <AnimatePresence>
            {isFormExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
                className="form-sections"
              >
                <div className="form-section">
                  <label className="section-label">
                    <span className="label-number">1</span>
                    Route Details
                  </label>
                  <div className="route-inputs">
                    <div className="route-connector" />
                    <div className="input-wrapper">
                      <div className="dot-start" />
                      <input 
                        value={startAddr}
                        onChange={(e) => setStartAddr(e.target.value)}
                        placeholder="Starting address (e.g. New York, USA)"
                      />
                    </div>
                    <div className="input-wrapper">
                      <div className="dot-end" />
                      <input 
                        value={destAddr}
                        onChange={(e) => setDestAddr(e.target.value)}
                        placeholder="Destination address (e.g. Los Angeles, USA)"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleFindRoute}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Find Shortest Path"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mobile-drag-handle" onClick={() => setIsFormExpanded(!isFormExpanded)}>
            <div className="drag-pill" />
          </div>
        </div>

        {/* Dynamic Panels */}
        <div className="dynamic-panel-container">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="error-alert"
              >
                <AlertCircle className="error-icon" size={20} />
                <p className="error-text">{error}</p>
              </motion.div>
            ) : route ? (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="stats-panel"
              >
                <div className="stats-header">
                  <span className="stats-label">Trip Stats</span>
                  <div className="optimal-badge">OPTIMAL</div>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-icon-label">
                      <MoveHorizontal size={12} />
                      <span>DISTANCE</span>
                    </div>
                    <span className="stat-value">{route.distance_km} km</span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon-label">
                      <Clock size={12} />
                      <span>EST. TIME</span>
                    </div>
                    <span className="stat-value">{route.est_time_min > 60 ? `${Math.round(route.est_time_min / 60)} hr ${Math.round(route.est_time_min % 60)} min` : `${route.est_time_min} min`}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="empty-stats">
                <Search size={32} color="var(--text-muted)" />
                <p>Plan a route anywhere in the world</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Map View */}
      <main className="map-view">
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            attribution='&copy; Google Maps'
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
          <ChangeView bounds={mapBounds} />
          {route && (
            <>
              <Polyline 
                positions={route.coordinates} 
                eventHandlers={{ click: (e) => setTagPosition([e.latlng.lat, e.latlng.lng]) }}
                pathOptions={{ 
                  color: '#1a73e8', 
                  weight: 6, 
                  opacity: 0.9,
                  lineJoin: 'round'
                }} 
              />
              <CircleMarker 
                center={route.start_coords} 
                radius={8} 
                pathOptions={{ color: 'white', fillColor: '#1a73e8', fillOpacity: 1, weight: 2 }}
              >
                <Popup>{route.start_name}</Popup>
              </CircleMarker>

              <Marker position={route.dest_coords} icon={redIcon}>
                <Popup>{route.dest_name}</Popup>
              </Marker>

              {/* Movable Route Time Tag */}
              {tagPosition && (
                <Marker 
                  position={tagPosition} 
                  icon={L.divIcon({
                    className: 'custom-time-tag-wrapper',
                    html: `<div class="google-time-tag">
                             <div class="time-text">${route.est_time_min >= 60 ? `${Math.floor(route.est_time_min / 60)} hr ${Math.round(route.est_time_min % 60)} min` : `${route.est_time_min.toFixed(1)} min`}</div>
                           </div>`,
                    iconSize: [80, 36],
                    iconAnchor: [40, 42]
                  })}
                />
              )}
            </>
          )}
        </MapContainer>
      </main>
    </div>
  );
}

export default App;
