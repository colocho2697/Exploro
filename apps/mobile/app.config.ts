/**
 * Configuración de Expo (Android + iOS) preparada para Development Builds
 * y publicación futura en Google Play y Apple App Store.
 * Política de Costo Cero ($0.00): Mapas Open Source (MapLibre GL + OpenFreeMap).
 */
export default {
  expo: {
    name: 'Exploro',
    slug: 'exploro',
    version: '0.1.0',
    orientation: 'portrait',
    scheme: 'exploro',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.exploro.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Exploro utiliza tu ubicación únicamente cuando buscas lugares y experiencias cercanas a ti.',
        NSCameraUsageDescription:
          'Exploro utiliza la cámara para capturar fotografías de tus experiencias o verificar visitas por código QR.',
      },
    },
    android: {
      package: 'com.exploro.app',
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
      ],
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
      mapStyleUrl:
        process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
        'https://tiles.openfreemap.org/styles/liberty',
      costPolicy: 'ZERO_COST',
    },
  },
};

