import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Coordinates, PlaceCardDTO, RouteSummary } from '@exploro/shared-types';

const WebViewComponent = WebView as unknown as React.ComponentType<any>;
import { GOOGLE_PLACES_API_KEY } from '../format';
import { useLanguage } from '../i18n';
import { BackpackerLoader } from './BackpackerLoader';

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

const DEFAULT_CENTER: Coordinates = { lat: 14.0885, lng: -87.1815 };
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function MapView({
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
  const { locale, t } = useLanguage();
  const webViewRef = useRef<WebView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchCityQuery, setSearchCityQuery] = useState('');
  const [searchingCity, setSearchingCity] = useState(false);

  const centerPoint = userLocation ?? fallbackCenter ?? DEFAULT_CENTER;

  const handleGlobalSearch = async (): Promise<void> => {
    const query = searchCityQuery.trim();
    if (!query || searchingCity) return;
    setSearchingCity(true);

    const applyFoundCoordinates = (coords: Coordinates) => {
      onSelectCoordinates?.(coords);
      setSearchCityQuery('');
    };

    try {
      // 1. OpenStreetMap Nominatim: Geocodificación global a costo cero ($0.00)
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { Accept: 'application/json' } }
      );
      if (osmRes.ok) {
        const osmData = (await osmRes.json()) as Array<{ lat: string; lon: string }>;
        if (osmData.length > 0 && osmData[0]?.lat && osmData[0]?.lon) {
          applyFoundCoordinates({
            lat: parseFloat(osmData[0].lat),
            lng: parseFloat(osmData[0].lon),
          });
          return;
        }
      }

      // 2. Foursquare Places Search API: Búsqueda comercial directa
      const fsqApiKey =
        process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY ||
        '5MRFYO1STFOMOG4IRIWQK11DVXH1NPVSM532QMKYZMRPEIBL';
      const fsqRes = await fetch(
        `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${fsqApiKey}`,
            'X-Places-Api-Version': '2025-06-17',
            Accept: 'application/json',
          },
        }
      );
      if (fsqRes.ok) {
        const fsqData = (await fsqRes.json()) as {
          results?: Array<{ latitude: number; longitude: number }>;
        };
        const p = fsqData.results?.[0];
        if (p?.latitude !== undefined && p?.longitude !== undefined) {
          applyFoundCoordinates({ lat: p.latitude, lng: p.longitude });
          return;
        }
      }

      // 3. Fallback a Google solo si EXPO_PUBLIC_PLACES_PROVIDER === 'google'
      if (process.env.EXPO_PUBLIC_PLACES_PROVIDER === 'google') {
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
            languageCode: locale,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            places?: Array<{
              location?: { latitude: number; longitude: number };
            }>;
          };
          const p = data.places?.[0];
          if (
            p?.location?.latitude !== undefined &&
            p?.location?.longitude !== undefined
          ) {
            applyFoundCoordinates({
              lat: p.location.latitude,
              lng: p.location.longitude,
            });
          }
        }
      }
    } catch {
      // Silencioso
    } finally {
      setSearchingCity(false);
    }
  };

  const mapHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; }
    .maplibregl-popup-content { border-radius: 12px; padding: 10px 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.16); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const CATEGORY_COLORS = {
      comida: '#f97316',
      turismo: '#0ea5e9',
      actividades: '#10b981',
      entretenimiento: '#8b5cf6',
      eventos: '#ec4899',
      compras: '#eab308'
    };

    function createGeoJSONCircle(center, radiusInKm, points) {
      points = points || 64;
      const lng = center[0], lat = center[1];
      const coords = [];
      const distanceX = radiusInKm / (111.32 * Math.cos((lat * Math.PI) / 180));
      const distanceY = radiusInKm / 110.574;
      for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        coords.push([lng + distanceX * Math.cos(theta), lat + distanceY * Math.sin(theta)]);
      }
      coords.push(coords[0]);
      return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {}
      };
    }

    let markers = [];
    let centerMarker = null;
    let isLoaded = false;

    const map = new maplibregl.Map({
      container: 'map',
      style: '${MAP_STYLE_URL}',
      center: [${centerPoint.lng}, ${centerPoint.lat}],
      zoom: 12,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', function() {
      isLoaded = true;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
      }
    });

    map.on('click', function(e) {
      const target = e.originalEvent && e.originalEvent.target;
      if (target && (target.closest('.maplibregl-marker') || target.closest('.maplibregl-popup'))) {
        return;
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SELECT_COORDS',
          coords: { lat: e.lngLat.lat, lng: e.lngLat.lng }
        }));
      }
    });

    window.updateExploroMap = function(payload) {
      if (!isLoaded) return;
      const places = payload.places || [];
      const center = payload.center;
      const radiusKm = payload.radiusKm || 5;
      const unbounded = Boolean(payload.unbounded);

      markers.forEach(function(m) { m.remove(); });
      markers = [];
      if (centerMarker) {
        centerMarker.remove();
        centerMarker = null;
      }

      const bounds = new maplibregl.LngLatBounds();

      try {
        if (center && radiusKm && !unbounded) {
          const circleData = createGeoJSONCircle([center.lng, center.lat], radiusKm);
          circleData.geometry.coordinates[0].forEach(function(pt) { bounds.extend(pt); });
          const src = map.getSource('search-radius-src');
          if (src) {
            src.setData(circleData);
          } else {
            map.addSource('search-radius-src', { type: 'geojson', data: circleData });
            map.addLayer({
              id: 'search-radius-fill',
              type: 'fill',
              source: 'search-radius-src',
              paint: { 'fill-color': '#10b981', 'fill-opacity': 0.14 }
            });
            map.addLayer({
              id: 'search-radius-stroke',
              type: 'line',
              source: 'search-radius-src',
              paint: { 'line-color': '#059669', 'line-width': 2.5, 'line-dasharray': [3, 2] }
            });
          }
        } else {
          if (map.getLayer('search-radius-fill')) map.removeLayer('search-radius-fill');
          if (map.getLayer('search-radius-stroke')) map.removeLayer('search-radius-stroke');
          if (map.getSource('search-radius-src')) map.removeSource('search-radius-src');
        }
      } catch (e) {}

      if (center) {
        const centerEl = document.createElement('div');
        centerEl.innerHTML = '<div style="position:relative;display:flex;align-items:center;justify-content:center;">' +
          '<div style="position:absolute;width:38px;height:38px;border-radius:50%;background:rgba(16,185,129,0.28);border:1.5px solid rgba(16,185,129,0.5);"></div>' +
          '<div style="width:20px;height:20px;border-radius:50%;background:#10b981;border:3px solid #ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:900;">📍</div>' +
          '</div>';
        centerMarker = new maplibregl.Marker({ element: centerEl, draggable: true })
          .setLngLat([center.lng, center.lat])
          .addTo(map);
        centerMarker.on('dragend', function() {
          const ll = centerMarker.getLngLat();
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SELECT_COORDS',
              coords: { lat: ll.lat, lng: ll.lng }
            }));
          }
        });
        bounds.extend([center.lng, center.lat]);
      }

      places.forEach(function(place, idx) {
        const rankNum = idx + 1;
        const color = CATEGORY_COLORS[place.categorySlug] || '#0ea5e9';
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = String(rankNum);
        el.style.cssText = 'width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:' + color + ';color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;box-shadow:0 2px 6px rgba(0,0,0,0.45);';
        el.addEventListener('click', function(ev) {
          ev.stopPropagation();
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SELECT_PLACE',
              slug: place.slug
            }));
          }
        });
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([place.coordinates.lng, place.coordinates.lat])
          .addTo(map);
        markers.push(m);
        bounds.extend([place.coordinates.lng, place.coordinates.lat]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 45, maxZoom: 14, duration: 500 });
      }
    };
  </script>
</body>
</html>`;
  }, []);

  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    const payload = {
      places: places.map((p) => ({
        slug: p.slug,
        name: p.name,
        categorySlug: p.categorySlug,
        addressText: p.addressText,
        cityName: p.cityName,
        coordinates: p.coordinates,
      })),
      center: centerPoint,
      radiusKm,
      unbounded,
      activeRoute: activeRoute ?? null,
    };
    const script = `if (window.updateExploroMap) { window.updateExploroMap(${JSON.stringify(
      payload
    )}); } true;`;
    webViewRef.current.injectJavaScript(script);
  }, [mapReady, places, centerPoint, radiusKm, unbounded, activeRoute]);

  const handleWebViewMessage = (event: WebViewMessageEvent): void => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        slug?: string;
        coords?: Coordinates;
        url?: string;
      };
      if (msg.type === 'READY') {
        setMapReady(true);
      } else if (msg.type === 'SELECT_PLACE' && msg.slug) {
        onSelectPlace(msg.slug);
      } else if (msg.type === 'SELECT_COORDS' && msg.coords) {
        onSelectCoordinates?.(msg.coords);
      } else if (msg.type === 'OPEN_URL' && msg.url) {
        void Linking.openURL(msg.url);
      }
    } catch {
      // Ignorar
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* BARRA MINIMALISTA DE BÚSQUEDA Y RADIO */}
      <View style={styles.toolbarCard}>
        {/* BUSCADOR MUNDIAL DE CIUDADES O DESTINOS */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={searchCityQuery}
              onChangeText={setSearchCityQuery}
              placeholder={t.map.searchPlaceholder}
              placeholderTextColor="#94a3b8"
              returnKeyType="search"
              onSubmitEditing={() => void handleGlobalSearch()}
              style={styles.searchInput}
            />
          </View>
          {searchCityQuery.trim().length > 0 && (
            <Pressable
              onPress={() => void handleGlobalSearch()}
              disabled={searchingCity}
              style={styles.searchBtn}
            >
              <Text style={styles.searchBtnText}>
                {searchingCity ? '…' : t.map.searchButton}
              </Text>
            </Pressable>
          )}
        </View>

        {/* SELECTOR COMPACTO DE RADIO + GPS */}
        <View style={styles.radiusRow}>
          {onRadiusChange &&
            [2, 5, 10, 20, 50].map((km) => {
              const active = !unbounded && radiusKm === km;
              return (
                <Pressable
                  key={km}
                  onPress={() => onRadiusChange(km)}
                  style={[
                    styles.radiusChip,
                    active ? styles.radiusChipActive : styles.radiusChipInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      active
                        ? styles.radiusChipTextActive
                        : styles.radiusChipTextInactive,
                    ]}
                  >
                    {km} km
                  </Text>
                </Pressable>
              );
            })}

          {onResetToGps && (
            <Pressable
              onPress={onResetToGps}
              accessibilityLabel={t.map.gpsTooltip}
              style={styles.gpsBtn}
            >
              <Text style={styles.gpsBtnIcon}>🎯</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* CONTENEDOR LIMPIO DEL MAPA */}
      <View style={styles.mapBox}>
        <WebViewComponent
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          style={styles.webview}
        />
        {searchingCity && (
          <View style={styles.loaderOverlay}>
            <BackpackerLoader
              size="small"
              compact
              message={t.map.travelingTitle}
              submessage={t.map.travelingSubtitle}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  toolbarCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchInputContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 2,
    fontSize: 13,
  },
  searchInput: {
    width: '100%',
    paddingVertical: 7,
    paddingLeft: 32,
    paddingRight: 12,
    fontSize: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  searchBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  searchBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  radiusChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  radiusChipActive: {
    borderWidth: 1.5,
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  radiusChipInactive: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  radiusChipTextActive: {
    color: '#ffffff',
  },
  radiusChipTextInactive: {
    color: '#475569',
  },
  gpsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 'auto',
  },
  gpsBtnIcon: {
    fontSize: 14,
  },
  mapBox: {
    height: 310,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 24,
    left: 20,
    right: 20,
    zIndex: 20,
  },
});
