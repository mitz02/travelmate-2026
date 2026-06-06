import axios from 'axios';
import { config } from '../config';

const MAPBOX_API = 'https://api.mapbox.com';

export interface GeocodeResult {
  placeName: string;
  lng: number;
  lat: number;
}

export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: string; // Polyline format
}

/**
 * Autocomplete/Search a location using Mapbox Geocoding API.
 */
export async function geocode(query: string): Promise<GeocodeResult[]> {
  if (!config.mapbox.accessToken) {
    throw new Error('Mapbox access token is not configured.');
  }

  const response = await axios.get(`${MAPBOX_API}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
    params: {
      access_token: config.mapbox.accessToken,
      autocomplete: true,
      limit: 5,
      // Optional: restrict to Nigeria if desired
      // country: 'ng' 
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.features.map((f: any) => ({
    placeName: f.place_name,
    lng: f.center[0],
    lat: f.center[1],
  }));
}

/**
 * Get route instructions (distance, duration, polyline) between two points.
 */
export async function getDirections(fromLng: number, fromLat: number, toLng: number, toLat: number): Promise<RouteResult | null> {
  if (!config.mapbox.accessToken) {
    throw new Error('Mapbox access token is not configured.');
  }

  const response = await axios.get(
    `${MAPBOX_API}/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}`,
    {
      params: {
        access_token: config.mapbox.accessToken,
        geometries: 'polyline',
        overview: 'full',
      },
    }
  );

  if (response.data.routes && response.data.routes.length > 0) {
    const route = response.data.routes[0];
    return {
      distance: route.distance, // meters
      duration: route.duration, // seconds
      geometry: route.geometry, // polyline
    };
  }

  return null;
}
