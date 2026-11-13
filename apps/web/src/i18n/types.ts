export type SupportedLocale = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'zh' | 'ru';

export interface LocaleMetadata {
  code: SupportedLocale;
  label: string;
  shortLabel: string;
  flag: string;
  intlLocale: string;
}

export const SUPPORTED_LOCALES: LocaleMetadata[] = [
  { code: 'es', label: 'Español', shortLabel: 'ES', flag: '🇪🇸', intlLocale: 'es-419' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇺🇸', intlLocale: 'en-US' },
  { code: 'pt', label: 'Português', shortLabel: 'PT', flag: '🇧🇷', intlLocale: 'pt-BR' },
  { code: 'fr', label: 'Français', shortLabel: 'FR', flag: '🇫🇷', intlLocale: 'fr-FR' },
  { code: 'de', label: 'Deutsch', shortLabel: 'DE', flag: '🇩🇪', intlLocale: 'de-DE' },
  { code: 'zh', label: '中文', shortLabel: '中文', flag: '🇨🇳', intlLocale: 'zh-CN' },
  { code: 'ru', label: 'Русский', shortLabel: 'RU', flag: '🇷🇺', intlLocale: 'ru-RU' },
];

export interface NativeDictionary {
  header: {
    saved: (count: number) => string;
    logout: string;
    signIn: string;
    languageSelectorAria: string;
  };
  categories: Record<string, string>;
  subcategories: Record<string, string>;
  map: {
    searchPlaceholder: string;
    searchButton: string;
    gpsTooltip: string;
    mapAriaLabel: string;
    travelingTitle: string;
    travelingSubtitle: string;
    centerPinTitle: string;
    centerPinSubtitle: (radiusKm: number) => string;
    routeLabel: (target: string) => string;
    closeRoute: string;
    routeError: string;
  };
  discovery: {
    searchingNearby: string;
    recommendedCount: (count: number) => string;
    scoutingZone: string;
    scoutingSubtitle: string;
    emptyZone: (radiusKm: number) => string;
    expandRadius: (nextRadiusKm: number) => string;
    retry: string;
    close: string;
    connectionError: string;
  };
  card: {
    topPick: string;
    pointsSuffix: string;
    saveFavoriteAria: string;
    distanceAway: (dist: string) => string;
    mapsBadge: string;
    redditBadge: string;
    socialBadge: string;
    perPerson: string;
    viewDetails: string;
    free: string;
    fromPrice: (price: string) => string;
    priceVaries: string;
  };
  detail: {
    loadingTitle: string;
    loadingSubtitle: string;
    loadError: string;
    backAria: string;
    shareAria: string;
    photoPrevAria: string;
    photoNextAria: string;
    verifiedPhoto: (author: string) => string;
    illustrativePhoto: string;
    scoreBadge: (score: number) => string;
    verifiedRecommendation: (categoryName: string) => string;
    distanceFromYou: (dist: string) => string;
    verifiedLocationHint: string;
    exploroScoreTitle: (score: number) => string;
    redditCommunityLabel: string;
    socialGuidesLabel: string;
    caveatPrefix: string;
    whatPeopleSay: (count: number) => string;
    exploroTraveler: string;
    ownExperience: string;
    rateThisPlaceBtn: string;
    shareQuickReviewTitle: string;
    recommendedItemPlaceholder: string;
    commentPlaceholder: string;
    publishing: string;
    publish: string;
    cancel: string;
    loginToReview: string;
    reviewSubmitError: string;
    avgPerPerson: string;
    estimatedCost: string;
    directRouteAvailable: string;
    goNowBtn: string;
    orOpenIn: string;
    timeOfDay: Record<string, string>;
    sourceLabels: Record<string, string>;
    categorySubtitles: {
      comida: {
        line1: (city: string) => string;
        defaultLine2: string;
        highlightTitle: string;
      };
      turismo: {
        line1: (sub: string | null, city: string) => string;
        duration: (mins: number) => string;
        defaultDuration: string;
        bestTimePrefix: string;
        defaultTime: string;
        defaultAccess: string;
        highlightTitle: string;
      };
      entretenimiento: {
        line1: (city: string) => string;
        defaultLine2: string;
        highlightTitle: string;
      };
      actividades: {
        line1: (city: string) => string;
        duration: (mins: number) => string;
        defaultDuration: string;
        safeRoute: string;
        defaultNature: string;
        highlightTitle: string;
      };
      eventos: {
        line1: (city: string) => string;
        defaultLine2: string;
        highlightTitle: string;
      };
      compras: {
        line1: (city: string) => string;
        defaultLine2: string;
        highlightTitle: string;
      };
    };
  };
  semantic: {
    reviewsCount: (formattedCount: string) => string;
    sourcesSummaryDefault: string;
    communitySource: string;
    guidesAndSocialSource: string;
    socialSource: string;
    choiceReasonByCategory: {
      comida: (city: string, stars: number) => string;
      turismo: (city: string, stars: number) => string;
      entretenimiento: (city: string, stars: number) => string;
      actividades: (city: string, stars: number) => string;
      eventos: (city: string, stars: number) => string;
      compras: (city: string, stars: number) => string;
    };
    caveatHighDemand: string;
    caveatVerifyHours: string;
    caveatPeakTraffic: string;
    descriptionByCategory: {
      comida: (name: string, city: string, stars: number, reviews: string) => string;
      turismo: (name: string, city: string, stars: number, reviews: string) => string;
      entretenimiento: (name: string, city: string, stars: number, reviews: string) => string;
      actividades: (name: string, city: string, stars: number, reviews: string) => string;
      eventos: (name: string, city: string, stars: number, reviews: string) => string;
      compras: (name: string, city: string, stars: number, reviews: string) => string;
    };
  };
  auth: {
    dialogAria: string;
    signInTitle: string;
    signUpTitle: string;
    closeAria: string;
    hint: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    processing: string;
    signInSubmit: string;
    signUpSubmit: string;
    switchToSignUp: string;
    switchToSignIn: string;
    invalidData: string;
    requestError: string;
  };
  library: {
    asideAria: string;
    favoritesTab: (count: number) => string;
    collectionsTab: (count: number) => string;
    emptyFavorites: string;
    remove: string;
    newCollectionPlaceholder: string;
    create: string;
    allCollections: string;
    emptyCollection: string;
    noCollections: string;
    delete: string;
    confirmDeleteCollection: (name: string) => string;
  };
}
