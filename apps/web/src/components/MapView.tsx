'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Coordinates, PlaceCardDTO, RouteSummary } from '@exploro/shared-types';
import { MAP_STYLE_URL } from '../lib/api';

interface Props {
  places: PlaceCardDTO[];
  userLocation: Coordinates | null;
  fallbackCenter: Coordinates | null;
  activeRoute?: RouteSummary | null;
  onSelectPlace: (slug: string) => void;
}

const US_CENTER: Coordinates = { lat: 39.5, lng: -98.35 };

const CATEGORY_COLORS: Record<string, string> = {
  comida: '#f97316',
  turismo: '#0ea5e9',
  actividades: '#10b981',
  entretenimiento: '#8b5cf6',
  eventos: '#ec4899',
  compras: '#eab308',
};

/** Mapa MapLibre GL con estilo OpenFreeMap (OpenStreetMap): sin API key ni costo. */
export default function MapView({
  places,
  userLocation,
  fallbackCenter,
  activeRoute,
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
      const color = CATEGORY_COLORS[place.categorySlug] ?? '#0ea5e9';
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `Ver ${place.name}`);
      el.style.cssText = `width:22px;height:22px;border-radius:50%;border:2px solid #fff;background:${color};cursor:pointer;padding:0;box-shadow:0 2px 4px rgba(0,0,0,0.3);`;
      el.addEventListener('click', () => onSelectPlace(place.slug));
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([place.coordinates.lng, place.coordinates.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14 }).setHTML(
            `<strong>${place.name}</strong><br/><small>${place.categoryName} • ${place.cityName}</small>`
          )
        )
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

    // Dibujo de ruta activa si existe
    try {
      if (activeRoute?.geometryGeoJSON) {
        if (map.getSource('active-route-src')) {
          (map.getSource('active-route-src') as maplibregl.GeoJSONSource).setData(
            activeRoute.geometryGeoJSON as any
          );
        } else {
          map.addSource('active-route-src', {
            type: 'geojson',
            data: activeRoute.geometryGeoJSON as any,
          });
          map.addLayer({
            id: 'active-route-line',
            type: 'line',
            source: 'active-route-src',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#38bdf8',
              'line-width': 4,
              'line-opacity': 0.85,
            },
          });
        }

        const routeBounds = new maplibregl.LngLatBounds();
        for (const coord of activeRoute.geometryGeoJSON.coordinates) {
          routeBounds.extend(coord);
        }
        map.fitBounds(routeBounds, { padding: 60, maxZoom: 15, duration: 600 });
        return;
      } else {
        if (map.getLayer('active-route-line')) {
          map.removeLayer('active-route-line');
        }
        if (map.getSource('active-route-src')) {
          map.removeSource('active-route-src');
        }
      }
    } catch {
      // Ignora error puntual de capas en re-render
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 500 });
    } else if (fallbackCenter) {
      map.flyTo({ center: [fallbackCenter.lng, fallbackCenter.lat], zoom: 10 });
    }
  }, [places, userLocation, fallbackCenter, activeRoute, ready, onSelectPlace]);

  if (error) {
    return <div role="alert" className="alert alert-warn">{error}</div>;
  }

  return (
    <div
      ref={container}
      className="map-box"
      aria-label="Mapa de lugares verificados"
    />
  );
}
