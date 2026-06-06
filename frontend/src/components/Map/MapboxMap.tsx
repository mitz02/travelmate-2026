import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

// Ensure Mapbox CSS is loaded (optional, can be added globally)
import "mapbox-gl/dist/mapbox-gl.css";

const MapboxMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.warn("Mapbox token not provided");
      return;
    }
    mapboxgl.accessToken = token;
    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0], // placeholder, will be set to user location
      zoom: 12,
    });

    // Add user location marker when geolocation is available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current?.setCenter([longitude, latitude]);
        new mapboxgl.Marker({ color: "#10B981" })
          .setLngLat([longitude, latitude])
          .addTo(mapInstance.current!);
      });
    }

    // Clean up on unmount
    return () => {
      mapInstance.current?.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="w-full h-80 bg-slate-100 dark:bg-slate-800 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48cGF0aCBkPSJNMCAwdjQwTTAgMTBoNDBNMCAyMGg0ME0wIDMwaDQwTTEwIDB2NDBNMjAgMHY0ME0zMCAwdjQwIiBzdHJva2U9InJnYmEoMCwwLDAsMC4wNykiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-center rounded-xl"
    />
  );
};

export default MapboxMap;
