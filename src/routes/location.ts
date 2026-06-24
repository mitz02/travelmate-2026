import { Router } from 'express';

const router = Router();

router.get('/route', async (req, res) => {
  try {
    const { fromLng, fromLat, toLng, toLat } = req.query;
    const token = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      res.json({ route: { geometry: '' } });
      return;
    }
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${token}`;
    const resp = await fetch(url);
    const data: any = await resp.json();
    if (data.routes?.[0]) {
      res.json({ route: { geometry: data.routes[0].geometry } });
    } else {
      res.json({ route: { geometry: '' } });
    }
  } catch (e) {
    res.json({ route: { geometry: '' } });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const q = req.query.q as string;
    const token = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
    if (!q || !token) {
      res.json({ suggestions: [] });
      return;
    }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=NG&types=place,locality,neighborhood`;
    const resp = await fetch(url);
    const data: any = await resp.json();
    res.json({ results: data.features?.map((f: any) => ({
      placeName: f.place_name,
      lng: f.center?.[0] ?? 0,
      lat: f.center?.[1] ?? 0,
    })) || [] });
  } catch (e) {
    res.json({ suggestions: [] });
  }
});

export default router;
