'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Coordinates, PlaceCardDTO, RouteSummary } from '@exploro/shared-types';
import { MAP_STYLE_URL } from '../lib/api';
import { buildGoogleMapsUrl, buildWazeUrl } from '../lib/format';

interface Props {
  places: PlaceCardDTO[];
  userLocation: Coordinates | null;
  fallbackCenter: Coordinates | null;
  activeRoute?: RouteSummary | null;
  radiusKm?: number;
  unbounded?: boolean;
  onSelectPlace: (slug: string) => void;
  onSelectCoordinates?: (coords: Coordinates) => void;
  onRadiusChange?: (radiusKm: number) => void;
  onResetToGps?: () => void;
}

const US_CENTER: Coordinates = { lat: 39.5, lng: -98.35 };

const GOOGLE_PLACES_API_KEY =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  'AIzaSyC-nH4VgbG66zwEXNme017vPrRh20Sa40U';

const CATEGORY_COLORS: Record<string, string> = {
  comida: '#f97316',
  turismo: '#0ea5e9',
  actividades: '#10b981',
  entretenimiento: '#8b5cf6',
  eventos: '#ec4899',
  compras: '#eab308',
};

/** Genera un polígono GeoJSON circular para el radio estilo Facebook Marketplace */
function createGeoJSONCircle(
  center: [number, number],
  radiusInKm: number,
  points = 64
) {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const distanceX = radiusInKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]!);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

/** Mapa MapLibre GL interactivo con radio dinámico estilo Facebook Marketplace */
export default function MapView({
  places,
  userLocation,
  fallbackCenter,
  activeRoute,
  radiusKm = 5,
  unbounded = false,
  onSelectPlace,
  onSelectCoordinates,
  onRadiusChange,
  onResetToGps,
}: Props): React.JSX.Element {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const centerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [searchCityQuery, setSearchCityQuery] = useState('');
  const [searchingCity, setSearchingCity] = useState(false);

  const onSelectCoordinatesRef = useRef(onSelectCoordinates);
  onSelectCoordinatesRef.current = onSelectCoordinates;

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchCityQuery.trim();
    if (!query || searchingCity) return;
    setSearchingCity(true);
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 1,
          languageCode: 'es',
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          places?: Array<{
            location?: { latitude: number; longitude: number };
            displayName?: { text: string };
            formattedAddress?: string;
          }>;
        };
        const p = data.places?.[0];
        if (
          p?.location?.latitude !== undefined &&
          p?.location?.longitude !== undefined
        ) {
          const coords: Coordinates = {
            lat: p.location.latitude,
            lng: p.location.longitude,
          };
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [coords.lng, coords.lat],
              zoom: 12,
              duration: 800,
            });
          }
          onSelectCoordinatesRef.current?.(coords);
          setSearchCityQuery('');
        }
      }
    } catch (err) {
      console.error('Error buscando destino:', err);
    } finally {
      setSearchingCity(false);
    }
  };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    try {
      const start = userLocation ?? fallbackCenter ?? US_CENTER;
      const map = new maplibregl.Map({
        container: container.current,
        style: MAP_STYLE_URL,
        center: [start.lng, start.lat],
        zoom: fallbackCenter || userLocation ? 11 : 4,
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
      centerMarkerRef.current?.remove();
      centerMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Manejador interactivo de clic en el mapa para mover el radio directamente
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.getCanvas().style.cursor = 'pointer';

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!onSelectCoordinatesRef.current) return;
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target?.closest('.maplibregl-marker') || target?.closest('.maplibregl-popup')) {
        return;
      }
      onSelectCoordinatesRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [ready]);

  // Actualización de marcadores, centro y círculo de radio
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    centerMarkerRef.current?.remove();
    centerMarkerRef.current = null;

    const bounds = new maplibregl.LngLatBounds();
    const centerPoint = userLocation ?? fallbackCenter;

    // 1. CÍRCULO TRANSLÚCIDO DE RADIO ESTILO FACEBOOK MARKETPLACE
    try {
      if (centerPoint && radiusKm && !unbounded) {
        const circleData = createGeoJSONCircle(
          [centerPoint.lng, centerPoint.lat],
          radiusKm
        );
        for (const pt of circleData.geometry.coordinates[0] ?? []) {
          bounds.extend(pt);
        }
        const source = map.getSource('search-radius-src') as maplibregl.GeoJSONSource | undefined;
        if (source) {
          source.setData(circleData as any);
        } else {
          map.addSource('search-radius-src', {
            type: 'geojson',
            data: circleData as any,
          });
          map.addLayer({
            id: 'search-radius-fill',
            type: 'fill',
            source: 'search-radius-src',
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.14,
            },
          });
          map.addLayer({
            id: 'search-radius-stroke',
            type: 'line',
            source: 'search-radius-src',
            paint: {
              'line-color': '#059669',
              'line-width': 2.5,
              'line-dasharray': [3, 2],
            },
          });
        }
      } else {
        if (map.getLayer('search-radius-fill')) map.removeLayer('search-radius-fill');
        if (map.getLayer('search-radius-stroke')) map.removeLayer('search-radius-stroke');
        if (map.getSource('search-radius-src')) map.removeSource('search-radius-src');
      }
    } catch {
      // Ignora errores puntuales de recarga de capas en WebGL
    }

    // 2. PIN CENTRAL DEL RADIO (Arrastrable y con pulsación)
    if (centerPoint) {
      const centerEl = document.createElement('div');
      centerEl.style.cursor = onSelectCoordinates ? 'grab' : 'default';
      centerEl.title = 'Arrastra o toca en el mapa para mover el radio';
      centerEl.innerHTML = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:38px;height:38px;border-radius:50%;background:rgba(16,185,129,0.28);border:1.5px solid rgba(16,185,129,0.5);"></div>
          <div style="width:20px;height:20px;border-radius:50%;background:#10b981;border:3px solid #ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:900;">📍</div>
        </div>
      `;

      const centerMarker = new maplibregl.Marker({
        element: centerEl,
        draggable: Boolean(onSelectCoordinates),
      })
        .setLngLat([centerPoint.lng, centerPoint.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setHTML(
            `<div style="font-size:12px;font-weight:700;color:#0f172a;padding:2px 4px;">
              📍 Centro de búsqueda (${radiusKm} km)
              <div style="font-size:11px;font-weight:500;color:#64748b;margin-top:2px;">Arrastra o haz clic en cualquier punto del mapa para mover</div>
            </div>`
          )
        )
        .addTo(map);

      if (onSelectCoordinates) {
        centerMarker.on('dragend', () => {
          const lngLat = centerMarker.getLngLat();
          onSelectCoordinates({ lat: lngLat.lat, lng: lngLat.lng });
        });
      }
      centerMarkerRef.current = centerMarker;
      bounds.extend([centerPoint.lng, centerPoint.lat]);
    }

    // 3. MARCADORES DE LUGARES ENCONTRADOS DENTRO DEL RADIO
    for (let idx = 0; idx < places.length; idx++) {
      const place = places[idx]!;
      const rankNum = idx + 1;
      const color = CATEGORY_COLORS[place.categorySlug] ?? '#0ea5e9';
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `Ver ${place.name}`);
      el.textContent = String(rankNum);
      el.style.cssText = `width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:${color};color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;box-shadow:0 2px 6px rgba(0,0,0,0.45);`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectPlace(place.slug);
      });

      const wazeUrl = buildWazeUrl(place.coordinates.lat, place.coordinates.lng, {
        name: place.name,
        cityName: place.cityName,
      });
      const gmapsUrl = buildGoogleMapsUrl(place.coordinates.lat, place.coordinates.lng, {
        name: place.name,
        addressText: place.addressText,
        cityName: place.cityName,
        origin: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([place.coordinates.lng, place.coordinates.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14 }).setHTML(
            `<div style="color:#0f172a;font-size:12px;line-height:1.35">
              <strong>#${rankNum} ${place.name}</strong><br/>
              <small>${place.addressText ?? place.cityName}</small>
              <div style="margin-top:6px;display:flex;gap:6px">
                <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" style="background:#0284c7;color:#fff;padding:3px 7px;border-radius:5px;text-decoration:none;font-weight:700;font-size:11px">🚗 Waze</a>
                <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" style="background:#059669;color:#fff;padding:3px 7px;border-radius:5px;text-decoration:none;font-weight:700;font-size:11px">🗺️ Maps</a>
              </div>
            </div>`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([place.coordinates.lng, place.coordinates.lat]);
    }

    // 4. RUTA ACTIVA SI EXISTE
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
      // Ignora error puntual de capas
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 500 });
    } else if (centerPoint) {
      map.flyTo({ center: [centerPoint.lng, centerPoint.lat], zoom: 11 });
    }
  }, [
    places,
    userLocation,
    fallbackCenter,
    activeRoute,
    radiusKm,
    unbounded,
    ready,
    onSelectPlace,
    onSelectCoordinates,
  ]);

  if (error) {
    return <div role="alert" className="alert alert-warn">{error}</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      {/* BARRA MINIMALISTA DE BÚSQUEDA Y RADIO */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '.45rem',
          background: '#ffffff',
          padding: '.5rem .65rem',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        {/* BUSCADOR MUNDIAL DE CIUDADES O DESTINOS */}
        <form
          onSubmit={handleGlobalSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flex: '1 1 200px',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={searchCityQuery}
              onChange={(e) => setSearchCityQuery(e.target.value)}
              placeholder="Buscar ciudad o zona (ej. Dallas, Madrid...)"
              style={{
                width: '100%',
                padding: '6px 12px 6px 30px',
                fontSize: '.8rem',
                borderRadius: 999,
                border: '1px solid #e2e8f0',
                outline: 'none',
                background: '#f8fafc',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '.78rem',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
          </div>
          {searchCityQuery.trim().length > 0 && (
            <button
              type="submit"
              disabled={searchingCity}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: '.76rem',
                fontWeight: 800,
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {searchingCity ? '…' : 'Ir'}
            </button>
          )}
        </form>

        {/* SELECTOR COMPACTO DE RADIO + GPS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', flexWrap: 'wrap' }}>
          {onRadiusChange &&
            [2, 5, 10, 20, 50].map((km) => {
              const active = !unbounded && radiusKm === km;
              return (
                <button
                  key={km}
                  type="button"
                  onClick={() => onRadiusChange(km)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 999,
                    fontSize: '.74rem',
                    fontWeight: 800,
                    border: active ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    background: active ? '#10b981' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {km} km
                </button>
              );
            })}

          {onResetToGps && (
            <button
              type="button"
              onClick={onResetToGps}
              title="Centrar en mi ubicación actual"
              aria-label="Centrar en mi ubicación actual"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '.82rem',
                background: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              🎯
            </button>
          )}
        </div>
      </div>

      {/* CONTENEDOR LIMPIO DEL MAPA */}
      <div
        ref={container}
        className="map-box"
        aria-label="Mapa interactivo con radio de búsqueda"
      />
    </div>
  );
}
