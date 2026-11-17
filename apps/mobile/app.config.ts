/**
 * Configuración de Expo (Android + iOS) preparada para Development Builds
 * y publicación futura en Google Play y Apple App Store.
 * Política de Costo Cero ($0.00): Mapas Open Source (MapLibre GL + OpenFreeMap).
 */
export default {
  expo: {
    name: 'Exploro',
    slug: 'exploro',
    owner: 'edwin297',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'exploro',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0b1120',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.exploro.app',
      icon: './assets/icon.png',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Exploro utiliza tu ubicación únicamente cuando buscas lugares y experiencias cercanas a ti.',
        NSCameraUsageDescription:
          'Exploro utiliza la cámara para capturar fotografías de tus experiencias o verificar visitas por código QR.',
      },
    },
    android: {
      package: 'com.exploro.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0b1120',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
      ],
    },
    extra: {
      eas: {
        projectId: 'ea157787-288e-44db-96bc-7889beadbd63',
      },
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL ??
        'http://192.168.61.21:4000/api/v1',
      mapStyleUrl:
        process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
        'https://tiles.openfreemap.org/styles/liberty',
      costPolicy: 'ZERO_COST',
    },
  },
};

