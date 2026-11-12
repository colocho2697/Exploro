const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyC-nH4VgbG66zwEXNme017vPrRh20Sa40U';

// Mapeo de búsqueda optimizado para encontrar el Place ID exacto en Google Maps
const PLACES_TO_FETCH = [
  // TURISMO - HONDURAS
  { slug: 'cristo-el-picacho-tegucigalpa', query: 'Cristo del Picacho Tegucigalpa' },
  { slug: 'cerro-juana-lainez-tegucigalpa', query: 'Parque Cerro Juana Lainez Tegucigalpa' },
  { slug: 'basilica-suyapa-tegucigalpa', query: 'Basílica de Nuestra Señora de Suyapa Tegucigalpa' },
  { slug: 'museo-identidad-nacional-tegucigalpa', query: 'Museo para la Identidad Nacional Tegucigalpa' },
  { slug: 'plaza-morazan-catedral-tegucigalpa', query: 'Catedral San Miguel Arcángel Plaza Morazán Tegucigalpa' },
  { slug: 'bosque-el-hatillo-tegucigalpa', query: 'Parque Nacional La Tigra El Hatillo Tegucigalpa' },
  { slug: 'santa-lucia-pueblo-colonial', query: 'Laguna de Santa Lucía Francisco Morazán Honduras' },
  { slug: 'parque-arqueologico-copan', query: 'Parque Arqueológico Copán Ruinas Honduras' },
  { slug: 'west-bay-beach-roatan', query: 'West Bay Beach Roatan Honduras' },

  // ACTIVIDADES - HONDURAS & US
  { slug: 'caminata-cerro-juana-lainez-tegucigalpa', query: 'Cerro Juana Lainez senderos Tegucigalpa' },
  { slug: 'senderismo-hatillo-tegucigalpa', query: 'Senderos El Picacho El Hatillo Tegucigalpa' },
  { slug: 'sendero-merendon-sps', query: 'Sendero Coca Cola Merendón San Pedro Sula' },
  { slug: 'kayak-lady-bird-lake-austin', query: 'Lady Bird Lake Austin Texas' },

  // ENTRETENIMIENTO - HONDURAS & US
  { slug: 'cinemark-vip-multiplaza-tegucigalpa', query: 'Cinemark Multiplaza Tegucigalpa' },
  { slug: 'teatro-manuel-bonilla-tegucigalpa', query: 'Teatro Nacional Manuel Bonilla Tegucigalpa' },
  { slug: 'comedy-cellar-nyc', query: 'Comedy Cellar MacDougal Street New York' },

  // EVENTOS - HONDURAS
  { slug: 'feria-gastronomica-palmira-tegucigalpa', query: 'Centro Cultural de España en Tegucigalpa CCET' },

  // COMPRAS - HONDURAS
  { slug: 'mall-multiplaza-tegucigalpa', query: 'Mall Multiplaza Tegucigalpa' },
  { slug: 'mercado-guamilito-sps', query: 'Mercado Guamilito San Pedro Sula' },
  { slug: 'artesanias-lencas-palmira-tegucigalpa', query: 'Galería de Artesanías Colonia Palmira Tegucigalpa' },

  // COMIDA - SAN PEDRO SULA & US
  { slug: 'casas-viejas-sps', query: 'Restaurante Casas Viejas San Pedro Sula' },
  { slug: 'l-industrie-pizzeria-nyc', query: 'L\'Industrie Pizzeria West Village New York' },
  { slug: 'lou-malnatis-river-north', query: 'Lou Malnati\'s Pizzeria River North Chicago' },
  { slug: 'franklin-barbecue-austin', query: 'Franklin Barbecue Austin Texas' },
  { slug: 'sanguich-de-miami-calle-ocho', query: 'Sanguich de Miami Calle Ocho Miami' },

  // TURISMO - US
  { slug: 'art-institute-of-chicago', query: 'Art Institute of Chicago' },
  { slug: 'baker-beach-san-francisco', query: 'Baker Beach San Francisco' },
  { slug: 'barton-springs-austin', query: 'Barton Springs Pool Austin' },
  { slug: 'brooklyn-bridge-park-pier-1', query: 'Brooklyn Bridge Park Pier 1 Viewpoint' },
  { slug: 'griffith-observatory-la', query: 'Griffith Observatory Los Angeles' },
  { slug: 'lake-eola-park-orlando', query: 'Lake Eola Park Orlando Florida' },
  { slug: 'wynwood-walls-miami', query: 'Wynwood Walls Miami Florida' },
];

async function fetchPhotosForQuery(query) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'es',
        maxResultCount: 1,
      }),
    });
    if (!res.ok) {
      console.error(`Error HTTP ${res.status} para "${query}"`);
      return [];
    }
    const data = await res.json();
    const place = data.places?.[0];
    if (!place || !place.photos || place.photos.length === 0) {
      console.warn(`No se encontraron fotos para: "${query}"`);
      return [];
    }
    console.log(`✓ Encontrado: "${place.displayName?.text}" (${place.photos.length} fotos) para query "${query}"`);
    return place.photos.slice(0, 4).map((p) => {
      const author = p.authorAttributions?.[0];
      return {
        photoName: p.name,
        authorName: author?.displayName ?? 'Google Maps Contributor',
        authorUri: author?.uri ?? null,
      };
    });
  } catch (err) {
    console.error(`Fallo de red para "${query}":`, err.message);
    return [];
  }
}

async function main() {
  const existingPath = path.join(__dirname, '..', 'apps', 'web', 'src', 'lib', 'google-places-photos.ts');
  const existingContent = fs.readFileSync(existingPath, 'utf8');

  // Extraer las fotos existentes (como los 13 de comida de Tegucigalpa)
  const regex = /"([a-z0-9-]+)":\s*(\[\s*\{[\s\S]*?\}\s*\])/g;
  const database = {};
  let match;
  while ((match = regex.exec(existingContent)) !== null) {
    try {
      database[match[1]] = JSON.parse(match[2]);
    } catch (e) {
      // Ignorar parse error
    }
  }
  console.log(`Lugares cargados existentes: ${Object.keys(database).length}`);

  for (const item of PLACES_TO_FETCH) {
    if (database[item.slug] && database[item.slug].length > 0) {
      console.log(`Ya existe: ${item.slug}`);
      continue;
    }
    console.log(`Buscando fotos en Google Places para: ${item.slug} ("${item.query}")...`);
    const photos = await fetchPhotosForQuery(item.query);
    if (photos.length > 0) {
      database[item.slug] = photos;
    }
    // Pequeño delay de cortesía
    await new Promise((r) => setTimeout(r, 120));
  }

  // Generar archivo TypeScript
  const tsContent = `/**
 * Fotos reales y oficiales de Google Places API para todas las categorías:
 * - Comida (Restaurantes, Cafés, Bares, Pizzerías)
 * - Turismo (Miradores, Museos, Basílicas, Playas, Parques Arqueológicos)
 * - Actividades (Senderismo, Ciclismo, Kayak)
 * - Entretenimiento (Cines VIP, Teatros Nacionales, Stand-up)
 * - Eventos (Ferias gastronómicas y culturales)
 * - Compras (Galerías artesanales, Mercados tradicionales, Malls)
 *
 * Incluye nombres de recurso de foto y atribución obligatoria de autor (§ 3.2.3 TOS de Google Maps).
 */
export interface GooglePlacePhotoDef {
  photoName: string;
  authorName: string;
  authorUri: string | null;
}

export const GOOGLE_PLACES_PHOTOS: Record<string, GooglePlacePhotoDef[]> = ${JSON.stringify(database, null, 2)};
`;

  fs.writeFileSync(existingPath, tsContent, 'utf8');
  console.log(`\n🎉 Completado exitosamente. Total de lugares con fotos oficiales de Google Places: ${Object.keys(database).length}`);
}

main().catch(console.error);
