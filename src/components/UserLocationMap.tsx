import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Eye } from 'lucide-react';

interface LocationPoint {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
}

const UserLocationMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [showUsers, setShowUsers] = useState(true);
  const [userLocations, setUserLocations] = useState<LocationPoint[]>([]);
  const [visitorLocations, setVisitorLocations] = useState<LocationPoint[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Mapbox token from edge function secrets
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data?.token);
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
      }
    };
    fetchToken();
  }, []);

  // Fetch user locations from profiles table
  useEffect(() => {
    const fetchUserLocations = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('latitude, longitude, location')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!error && data) {
        const locations = data
          .filter((p) => p.latitude && p.longitude)
          .map((p) => ({
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            city: p.location?.split(',')[0]?.trim(),
            region: p.location?.split(',')[1]?.trim(),
          }));
        setUserLocations(locations);
      }
    };

    const fetchVisitorLocations = async () => {
      const { data, error } = await supabase
        .from('page_visits')
        .select('latitude, longitude, city, region, country')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        // Aggregate by unique lat/lng to avoid too many markers
        const uniqueLocations = new Map<string, LocationPoint & { count: number }>();
        data.forEach((v) => {
          const key = `${v.latitude},${v.longitude}`;
          if (uniqueLocations.has(key)) {
            uniqueLocations.get(key)!.count++;
          } else {
            uniqueLocations.set(key, {
              latitude: Number(v.latitude),
              longitude: Number(v.longitude),
              city: v.city || undefined,
              region: v.region || undefined,
              country: v.country || undefined,
              count: 1,
            });
          }
        });
        setVisitorLocations(Array.from(uniqueLocations.values()));
      }
      setLoading(false);
    };

    fetchUserLocations();
    fetchVisitorLocations();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      zoom: 1.5,
      center: [0, 20],
      pitch: 20,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.scrollZoom.disable();

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(30, 30, 40)',
        'high-color': 'rgb(50, 50, 70)',
        'horizon-blend': 0.1,
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update markers when data or toggle changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const locations = showUsers ? userLocations : visitorLocations;
    const color = showUsers ? '#10b981' : '#8b5cf6';

    locations.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = `0 0 10px ${color}`;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="color: black; padding: 4px;">
          <strong>${loc.city || 'Unknown'}</strong>
          ${loc.region ? `, ${loc.region}` : ''}
          ${loc.country ? `<br/>${loc.country}` : ''}
        </div>`
      );

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [showUsers, userLocations, visitorLocations, mapboxToken]);

  if (!mapboxToken && !loading) {
    return (
      <div className="rounded-lg bg-card border border-border p-6 text-center">
        <p className="text-muted-foreground">Mapbox token not configured</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold">Global User Distribution</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Eye className={`h-4 w-4 ${!showUsers ? 'text-purple-500' : 'text-muted-foreground'}`} />
            <Label htmlFor="map-toggle" className="text-sm cursor-pointer">
              Visitors
            </Label>
          </div>
          <Switch
            id="map-toggle"
            checked={showUsers}
            onCheckedChange={setShowUsers}
          />
          <div className="flex items-center gap-2">
            <Users className={`h-4 w-4 ${showUsers ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <Label htmlFor="map-toggle" className="text-sm cursor-pointer">
              Users
            </Label>
          </div>
        </div>
      </div>
      <div className="relative">
        <div ref={mapContainer} className="h-[400px] w-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: showUsers ? '#10b981' : '#8b5cf6' }}
            />
            <span>
              {showUsers
                ? `${userLocations.length} registered users`
                : `${visitorLocations.length} visitor locations`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLocationMap;
