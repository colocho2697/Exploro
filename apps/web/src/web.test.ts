import { describe, expect, it } from 'vitest';
import {
  canAccessMode,
  getInitialModeDescriptors,
} from '@exploro/business-rules';
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  computeMultiSourceScore,
  DEFAULT_RADIUS_KM,
  formatCleanPrice,
  formatDistanceKm,
  formatDistanceUS,
  getPlacePhotoDetails,
  getPlacePhotoGallery,
  milesToKm,
  parseRecommendationReason,
  RADIUS_OPTIONS_MI,
} from './lib/format';
import {
  DICTIONARIES,
  resolveLocaleTag,
  SUPPORTED_LOCALES,
} from './i18n';


describe('@exploro/web — Reglas de la Pantalla Inicial (Paso 1.5)', () => {
  it('presenta únicamente «Estoy de viaje» habilitado y «Soy local (próximamente)» deshabilitado', () => {
    const modes = getInitialModeDescriptors(false);
    expect(modes).toHaveLength(2);
    expect(modes[0]?.label).toBe('Estoy de viaje');
    expect(modes[0]?.enabled).toBe(true);
    expect(modes[1]?.label).toBe('Soy local');
    expect(modes[1]?.enabled).toBe(false);
    expect(modes[1]?.badgeText).toBe('Próximamente');
  });

  it('impide avanzar al modo local en la primera versión', () => {
    expect(canAccessMode('LOCAL', false).allowed).toBe(false);
    expect(canAccessMode('TRAVELER', false).allowed).toBe(true);
  });
});

describe('@exploro/web — Formato para EE. UU. (Fase 2)', () => {
  it('convierte millas a kilómetros para la API', () => {
    expect(milesToKm(1)).toBe(1.609);
    expect(milesToKm(10)).toBe(16.093);
    expect(RADIUS_OPTIONS_MI.map(milesToKm).every((km) => km >= 0.5 && km <= 500)).toBe(true);
  });

  it('muestra distancias en pies o millas y nunca inventa una distancia', () => {
    expect(formatDistanceUS(null)).toBeNull();
    expect(formatDistanceUS(-5)).toBeNull();
    expect(formatDistanceUS(30)).toBe('98 ft');
    expect(formatDistanceUS(1609.344)).toBe('1.0 mi');
    expect(formatDistanceUS(40_233.6)).toBe('25 mi');
  });

  it('usa 5 km a la redonda por defecto y genera enlaces directos de Waze y Google Maps ($0.00)', () => {
    expect(DEFAULT_RADIUS_KM).toBe(5);
    expect(formatDistanceKm(420)).toBe('420 m');
    expect(formatDistanceKm(1800)).toBe('1.8 km');
    expect(buildWazeUrl(14.0868, -87.1848)).toBe(
      'https://waze.com/ul?ll=14.0868,-87.1848&navigate=yes'
    );
    expect(buildGoogleMapsUrl(14.0868, -87.1848)).toContain(
      'destination=14.0868,-87.1848'
    );

    const parsed = parseRecommendationReason(
      'Lo elegiría para: comer algo informal. | ⚠️ Ojo: hay críticas sobre mantenimiento del local.'
    );
    expect(parsed.choiceReason).toBe('Lo elegiría para: comer algo informal.');
    expect(parsed.caveat).toBe('Ojo: hay críticas sobre mantenimiento del local.');

    const score = computeMultiSourceScore({
      slug: 'el-morito-la-hacienda-tegucigalpa',
      tags: ['★ 4.8 (14,204 reseñas)', 'Qué Plan Tegus', 'Reddit r/Honduras'],
      recommendationReason: 'Lo elegiría para: una buena comida en pareja o familia.',
      recommendationCount: 6,
      confidenceLevel: 'HIGH',
    });
    expect(score.mapsStars).toBe(4.8);
    expect(score.mapsPoints).toBeGreaterThanOrEqual(40);
    expect(score.redditPoints).toBeGreaterThanOrEqual(25);
    expect(score.socialPoints).toBeGreaterThanOrEqual(20);
    expect(score.totalScore).toBeGreaterThanOrEqual(90);

    const gallery = getPlacePhotoGallery({
      slug: 'el-morito-la-hacienda-tegucigalpa',
      categorySlug: 'comida',
      imageUrl: null,
    });
    expect(gallery.length).toBeGreaterThanOrEqual(4);

    // Verificación de fotos reales de Google Places con atribución de autor
    const photoDetails = getPlacePhotoDetails({
      slug: 'el-morito-la-hacienda-tegucigalpa',
      categorySlug: 'comida',
      imageUrl: null,
    });
    expect(photoDetails[0]?.isVerifiedReal).toBe(true);
    expect(photoDetails[0]?.authorName).toBe('Mario Silva');
    expect(photoDetails[0]?.url).toContain('https://places.googleapis.com/v1/');

    // Verificación de URL con origen explícito y nombre comercial en Tegucigalpa
    const routeUrl = buildGoogleMapsUrl(14.0869, -87.1743, {
      name: '1. El Morito – La Hacienda',
      addressText: 'Boulevard La Hacienda',
      cityName: 'Tegucigalpa',
      origin: 'Colonia Florencia Norte, Tegucigalpa, Honduras',
    });
    expect(routeUrl).toContain('origin=Colonia%20Florencia%20Norte%2C%20Tegucigalpa%2C%20Honduras');
    expect(routeUrl).toContain('destination=El%20Morito%20%E2%80%93%20La%20Hacienda%2C%20Boulevard%20La%20Hacienda%2C%20Tegucigalpa%2C%20Honduras');
  });

  it('soporta transcreación nativa en 7 idiomas (ES, EN, PT, FR, DE, ZH, RU) y detección de idioma del navegador', () => {
    expect(SUPPORTED_LOCALES.map((l) => l.code)).toEqual([
      'es',
      'en',
      'pt',
      'fr',
      'de',
      'zh',
      'ru',
    ]);

    // Detección de etiquetas BCP-47 regionales
    expect(resolveLocaleTag('en-US')).toBe('en');
    expect(resolveLocaleTag('pt-BR')).toBe('pt');
    expect(resolveLocaleTag('fr-FR')).toBe('fr');
    expect(resolveLocaleTag('de-DE')).toBe('de');
    expect(resolveLocaleTag('zh-Hans-CN')).toBe('zh');
    expect(resolveLocaleTag('ru-RU')).toBe('ru');
    expect(resolveLocaleTag('es-HN')).toBe('es');
    expect(resolveLocaleTag('ja-JP')).toBeNull();

    // Adaptación semántica de razones de recomendación sin alterar la base de datos
    const rawReason =
      'Lo elegiría para: disfrutar de una propuesta gastronómica sobresaliente • Respaldo: 4.8★ | ⚠️ Ojo: Alta demanda en horas pico.';
    const ctx = { categorySlug: 'comida', cityName: 'Buenos Aires', mapsStars: 4.8 };

    const enReason = parseRecommendationReason(rawReason, 'en', ctx);
    expect(enReason.choiceReason).toContain('Why it stands out:');
    expect(enReason.choiceReason).toContain('Buenos Aires');
    expect(enReason.caveat).toContain('peak hours');

    const deReason = parseRecommendationReason(rawReason, 'de', ctx);
    expect(deReason.choiceReason).toContain('Darum lohnt es sich:');

    const zhReason = parseRecommendationReason(rawReason, 'zh', ctx);
    expect(zhReason.choiceReason).toContain('推荐理由：');

    const ruReason = parseRecommendationReason(rawReason, 'ru', ctx);
    expect(ruReason.choiceReason).toContain('Почему стоит пойти:');

    // Formateo nativo de precios y reseñas en todos los idiomas
    for (const loc of SUPPORTED_LOCALES) {
      expect(DICTIONARIES[loc.code].categories.comida.length).toBeGreaterThan(0);
      expect(formatCleanPrice(0, 0, 'USD', 'FREE', loc.code)).toBe(
        DICTIONARIES[loc.code].card.free
      );
    }
  });

  it('procesa galerías oficiales de Foursquare Places con CDN Fastly sin llamadas a Google Maps ($0.00)', () => {
    const fsqPhotos = [
      'https://fastly.4sqi.net/img/general/800x600/123_abc.jpg',
      'https://fastly.4sqi.net/img/general/800x600/456_def.jpg',
    ];

    const photoDetails = getPlacePhotoDetails({
      slug: 'lugar-con-fotos-fsq',
      categorySlug: 'comida',
      imageUrl: fsqPhotos[0]!,
      tags: [`fsq_photos:${JSON.stringify(fsqPhotos)}`],
    });

    expect(photoDetails.length).toBe(2);
    expect(photoDetails[0]?.isVerifiedReal).toBe(true);
    expect(photoDetails[0]?.authorName).toBe('Foursquare Places');
    expect(photoDetails[0]?.url).toBe(fsqPhotos[0]);
    expect(photoDetails[0]?.url).not.toContain('places.googleapis.com');
  });

  it('omite las fotos de Google Places cuando NEXT_PUBLIC_PLACES_PROVIDER es foursquare para evitar cobros', () => {
    const prevEnv = process.env.NEXT_PUBLIC_PLACES_PROVIDER;
    process.env.NEXT_PUBLIC_PLACES_PROVIDER = 'foursquare';

    try {
      const photoDetails = getPlacePhotoDetails({
        slug: 'el-morito-la-hacienda-tegucigalpa',
        categorySlug: 'comida',
        imageUrl: null,
      });

      // Debe caer a fotos referenciales seguras sin consultar la API de Google Maps
      expect(photoDetails[0]?.url).not.toContain('places.googleapis.com');
      expect(photoDetails[0]?.url).toContain('images.unsplash.com');
    } finally {
      process.env.NEXT_PUBLIC_PLACES_PROVIDER = prevEnv;
    }
  });
});

