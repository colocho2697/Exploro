'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Coordinates, PlaceCardDTO } from '@exploro/shared-types';
import { MAP_STYLE_URL } from '../lib/api';

interface Props {
  places: PlaceCardDTO[];
  userLocation: Coordinates | null;
  fallbackCenter: Coordinates | null;
  onSelectPlace: (slug: string) => void;
}

const US_CENTER: Coordinates = { lat: 39.5, lng: -98.35 };

/** Mapa MapLibre GL con estilo OpenFreeMap (OpenStreetMap): sin API key ni costo. */
export default function MapView({
  places,
  userLocation,
  fallbackCenter,
  onSelectPlace,
}: Props): React.JSX.Element {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    try {
      const start = fallbackCenter ?? US_CENTER;
      const map = new maplibregl.Map({
        container: container.current,
        style: MAP_STYLE_URL,
        center: [start.lng, start.lat],
        zoom: fallbackCenter ? 10 : 3,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => setReady(true));
      map.on('error', () =>
        setError('No se pudo cargar el mapa base. El listado sigue disponible.')
      );
      mapRef.current = map;
    } catch {
      setError('Tu navegador no puede mostrar el mapa (WebGL no disponible). El listado sigue disponible.');
    }
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // El mapa se crea una sola vez; los marcadores se actualizan en el efecto siguiente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const bounds = new maplibregl.LngLatBounds();

    for (const place of places) {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `Ver ${place.name}`);
      el.style.cssText =
        'width:22px;height:22px;border-radius:50%;border:2px solid #fff;background:#0ea5e9;cursor:pointer;padding:0;';
      el.addEventListener('click', () => onSelectPlace(place.slug));
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([place.coordinates.lng, place.coordinates.lat])
        .setPopup(new maplibregl.Popup({ offset: 14 }).setText(place.name))
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([place.coordinates.lng, place.coordinates.lat]);
    }

    if (userLocation) {
      const me = new maplibregl.Marker({ color: '#10b981' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new maplibregl.Popup({ offset: 14 }).setText('Tu ubicación'))
        .addTo(map);
      markersRef.current.push(me);
      bounds.extend([userLocation.lng, userLocation.lat]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 500 });
    } else if (fallbackCenter) {
      map.flyTo({ center: [fallbackCenter.lng, fallbackCenter.lat], zoom: 10 });
    }
  }, [places, userLocation, fallbackCenter, ready, onSelectPlace]);

  if (error) {
    return <div role="alert" className="alert alert-warn">{error}</div>;
  }
  return <div ref={container} className="map-box" role="region" aria-label="Mapa de lugares" />;
}

