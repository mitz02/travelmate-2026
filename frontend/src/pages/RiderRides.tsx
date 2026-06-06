import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { MapPin, Calendar, CheckCircle2, Clock3, Search, ChevronRight, Phone } from 'lucide-react';
import { CallModal } from '../components/ui/CallModal';
import Map, { Marker, NavigationControl as MapboxNavControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '../services/api';

const FALLBACK_MAPBOX_TOKEN= import.meta.env.VITE_MAPBOX_TOKEN;

interface Ride {
  id: string;
  driverName: string;
  status: 'completed' | 'upcoming' | 'active';
  date: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
}

const dummyRides: Ride[] = [
  {
    id: 'r1',
    driverName: 'John Doe',
    status: 'completed',
    date: '2023-10-01 10:00 AM',
    pickup: { lat: 6.5244, lng: 3.3792, address: 'Lagos Island' },
    dropoff: { lat: 6.4281, lng: 3.4219, address: 'Victoria Island' }
  },
  {
    id: 'r2',
    driverName: 'Sarah Smith',
    status: 'upcoming',
    date: '2023-10-05 02:00 PM',
    pickup: { lat: 6.5000, lng: 3.3500, address: 'Surulere' },
    dropoff: { lat: 6.6000, lng: 3.3300, address: 'Ikeja' }
  },
  {
    id: 'r3',
    driverName: 'Michael Chuks',
    status: 'completed',
    date: '2023-09-28 09:15 AM',
    pickup: { lat: 6.5833, lng: 3.3333, address: 'Agege' },
    dropoff: { lat: 6.5244, lng: 3.3792, address: 'Lagos Island' }
  }
];

export const RiderRides: React.FC = () => {
  const [mapboxToken, setMapboxToken] = useState<string>(FALLBACK_MAPBOX_TOKEN);
  const [isTokenFetched, setIsTokenFetched] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: 3.3792,
    latitude: 6.5244,
    zoom: 10.5,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Ride[]>([]);
  const [callState, setCallState] = useState({ isOpen: false, channel: '', otherName: '' });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/config');
        if (res.data?.MAPBOX_ACCESS_TOKEN) setMapboxToken(res.data.MAPBOX_ACCESS_TOKEN);
      } catch (err) {
        console.error('Failed to fetch config', err);
      } finally {
        setIsTokenFetched(true);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      // Simulate database autosuggestion query
      const query = searchQuery.toLowerCase();
      const matches = dummyRides.filter(ride => 
        ride.driverName.toLowerCase().includes(query) ||
        ride.pickup.address.toLowerCase().includes(query) ||
        ride.dropoff.address.toLowerCase().includes(query) ||
        ride.status.toLowerCase().includes(query)
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleSuggestionClick = (ride: Ride) => {
    setSearchQuery(ride.dropoff.address);
    setSuggestions([]);
    setViewState(prev => ({ ...prev, longitude: ride.dropoff.lng, latitude: ride.dropoff.lat, zoom: 14 }));
  };

  return (
    <DashboardLayout noPadding>
      <div className="flex flex-col w-full h-[calc(100vh-72px)] bg-slate-100 overflow-hidden">
        
        {/* Top Section: Full Width Map */}
        <div className="flex-1 relative w-full h-full z-0 bg-slate-200">
          
          {/* Floating Search Bar with Autocomplete */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xl shadow-lg border border-white/50 rounded-full p-1.5 flex items-center gap-2 pointer-events-auto w-full transition-shadow hover:shadow-xl relative">
              <div className="flex-1 flex items-center gap-2 pl-3">
                <Search size={18} className="text-primary/60" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search states, locations or drivers..." 
                  className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 w-full placeholder:text-gray-400" 
                />
              </div>
              <Button className="rounded-full px-6 py-2.5 h-auto text-sm font-bold shadow-md shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all">
                Search
              </Button>
            </div>
            
            {/* Autocomplete Dropdown Suggestions */}
            {suggestions.length > 0 && (
              <div className="pointer-events-auto absolute top-full left-4 right-4 mt-2 bg-white/95 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-2xl overflow-hidden animate-slide-up z-20">
                <div className="px-4 py-2 bg-slate-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Suggested Rides
                </div>
                {suggestions.map(ride => (
                  <div 
                    key={`sug-${ride.id}`} 
                    onClick={() => handleSuggestionClick(ride)}
                    className="flex items-center gap-3 p-3 hover:bg-indigo-50/50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {ride.driverName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{ride.dropoff.address}</h4>
                      <p className="text-xs text-gray-500 truncate flex gap-2">
                        <span>From: {ride.pickup.address}</span>
                        <span className="text-gray-300">•</span>
                        <span>{ride.driverName}</span>
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {isTokenFetched && mapboxToken && mapboxToken.length > 0 && (
            <Map
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={mapboxToken}
              style={{ width: '100%', height: '100%' }}
            >
              <MapboxNavControl position="bottom-right" />

              {/* Render all rides on the map */}
              {dummyRides.map(ride => (
                <React.Fragment key={ride.id}>
                  {/* Pickup Marker */}
                  <Marker longitude={ride.pickup.lng} latitude={ride.pickup.lat} anchor="bottom">
                    <div className="relative flex flex-col items-center group cursor-pointer hover:z-50">
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none transform -translate-y-1 group-hover:translate-y-0">
                        Pickup: {ride.pickup.address}
                      </div>
                      <div className="bg-white p-1 rounded-full shadow-md border border-gray-100 group-hover:scale-110 transition-transform">
                        <MapPin size={22} className="text-primary fill-primary/10" />
                      </div>
                    </div>
                  </Marker>
                  
                  {/* Dropoff Marker */}
                  <Marker longitude={ride.dropoff.lng} latitude={ride.dropoff.lat} anchor="bottom">
                    <div className="relative flex flex-col items-center group cursor-pointer hover:z-50">
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none transform -translate-y-1 group-hover:translate-y-0">
                        Dropoff: {ride.dropoff.address}
                      </div>
                      <div className="bg-white p-1 rounded-full shadow-md border border-gray-100 group-hover:scale-110 transition-transform">
                        <MapPin size={22} className="text-indigo-500 fill-indigo-500/10" />
                      </div>
                    </div>
                  </Marker>
                </React.Fragment>
              ))}
            </Map>
          )}

          {!mapboxToken && !import.meta.env.VITE_MAPBOX_TOKEN && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md px-6 py-5 rounded-2xl shadow-xl border border-red-100 text-sm text-center flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <MapPin className="text-red-500" size={24} />
              </div>
              <div>
                <strong className="text-red-700 block text-base mb-1">Missing Mapbox Token</strong>
                <span className="text-gray-500 text-xs">Please configure it in System Settings or frontend/.env.</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Section: Rides Horizontal List (Compact & Sleek) */}
        <div className="w-full bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-20 flex flex-col flex-shrink-0 relative">
          <div className="px-6 pt-5 pb-1">
            <h2 className="text-xl font-black bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 drop-shadow-sm">
              My Rides
            </h2>
          </div>
          
          <div className="flex overflow-x-auto gap-4 px-6 pb-5 pt-3 dashboard-scroll snap-x scroll-smooth items-center">
            {dummyRides.map((ride, idx) => (
              <div 
                key={ride.id} 
                className="snap-center min-w-[280px] max-w-[280px] bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group animate-fade-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`h-1 w-full ${ride.status === 'completed' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : ride.status === 'upcoming' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}></div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                        {ride.driverName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-gray-900 leading-none">{ride.driverName}</h3>
                        <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 mt-1 uppercase tracking-wide">
                          <Calendar size={10} className="text-indigo-400"/> {ride.date.split(' ')[0]}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm
                      ${ride.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                        ride.status === 'upcoming' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                        'bg-amber-50 text-amber-700 border border-amber-100'}`}
                    >
                      {ride.status === 'completed' ? <CheckCircle2 size={10}/> : <Clock3 size={10}/>}
                      {ride.status}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-100 flex flex-col gap-2 group-hover:bg-indigo-50/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 truncate">{ride.pickup.address}</p>
                    </div>
                    <div className="ml-2 border-l-2 border-dashed border-gray-200 h-2 my-[-4px]"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 truncate">{ride.dropoff.address}</p>
                    </div>
                  </div>

                  {ride.status !== 'completed' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCallState({ isOpen: true, channel: `ride_${ride.id}`, otherName: ride.driverName });
                      }}
                      className="mt-3 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-2 rounded-lg flex justify-center items-center gap-2 transition-colors"
                    >
                      <Phone size={14} /> Call Driver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>

      <CallModal 
        isOpen={callState.isOpen}
        onClose={() => setCallState(prev => ({ ...prev, isOpen: false }))}
        channel={callState.channel}
        otherParticipantName={callState.otherName}
      />
    </DashboardLayout>
  );
};
