import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  ActivityAlternativeOptionDTO,
  FlexibilityMinutes,
  TripDTO,
  TripDayDTO,
  TripItemDTO,
  TripReorganizationImpactDTO,
} from '@exploro/shared-types';
import {
  ApplyReorganizationInput,
  AssistedPlanRequestInput,
  CreateTripInput,
  CreateTripItemInput,
  ReorderTripItemsInput,
  UpdateTripInput,
  UpdateTripItemInput,
} from '@exploro/validation';
import {
  classifyActivityAlternatives,
  DayItemSchedule,
  detectReorganizationImpact,
  ScheduleCandidateInput,
  verifyProximityForVisit,
} from '@exploro/business-rules';

interface TripRow {
  id: string;
  user_id: string;
  destination_id: string | null;
  city_slug: string | null;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  budget_tier: string;
  travel_styles: string[];
  flexibility_minutes: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TripDayRow {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  title: string | null;
  theme: string | null;
}

interface TripItemRow {
  id: string;
  trip_day_id: string;
  place_id: string;
  place_name?: string;
  place_slug?: string;
  category_slug?: string;
  lat?: number;
  lng?: number;
  overall_score?: string | number;
  activity_id: string | null;
  order_index: number;
  custom_title: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  transit_minutes_from_prev: number;
  transit_distance_meters_from_prev: number;
  estimated_cost: string;
  notes: string | null;
  status: string;
}

@Injectable()
export class TripsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  /**
   * Paso 6.1: Crear viaje manual
   */
  public async createTrip(
    userId: string,
    dto: CreateTripInput
  ): Promise<TripDTO> {
    const res = await this.db.query<TripRow>(
      `INSERT INTO trips (
        user_id, destination_id, city_slug, title, description,
        start_date, end_date, budget_tier, travel_styles, flexibility_minutes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT')
      RETURNING *`,
      [
        userId,
        dto.destinationId ?? null,
        dto.citySlug ?? null,
        dto.title,
        dto.description ?? null,
        dto.startDate,
        dto.endDate,
        dto.budgetTier ?? 'MEDIUM',
        dto.travelStyles ?? [],
        dto.flexibilityMinutes ?? 15,
      ]
    );

    const trip = res.rows[0];

    // Crear días automáticamente entre startDate y endDate
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const dayCount = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1
    );

    const createdDays: TripDayDTO[] = [];
    for (let i = 1; i <= dayCount; i++) {
      const d = new Date(start.getTime() + (i - 1) * 86400000);
      const dateStr = d.toISOString().split('T')[0]!;
      const dayRes = await this.db.query<TripDayRow>(
        `INSERT INTO trip_days (trip_id, day_number, date, title)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [trip.id, i, dateStr, `Día ${i}`]
      );
      const dayRow = dayRes.rows[0];
      createdDays.push({
        id: dayRow.id,
        tripId: dayRow.trip_id,
        dayNumber: dayRow.day_number,
        date: dateStr,
        title: dayRow.title,
        items: [],
      });
    }

    return this.mapTripRow(trip, createdDays);
  }

  /**
   * Listar viajes del usuario
   */
  public async listTrips(userId: string): Promise<TripDTO[]> {
    const res = await this.db.query<TripRow>(
      `SELECT * FROM trips WHERE user_id = $1 ORDER BY start_date DESC`,
      [userId]
    );

    return res.rows.map((r) => this.mapTripRow(r));
  }

  /**
   * Obtener detalle completo de un viaje con sus días e ítems
   */
  public async getTripById(tripId: string, userId: string): Promise<TripDTO> {
    const tripRes = await this.db.query<TripRow>(
      `SELECT * FROM trips WHERE id = $1 AND user_id = $2`,
      [tripId, userId]
    );
    if (tripRes.rows.length === 0) {
      throw new NotFoundException('Viaje no encontrado.');
    }
    const trip = tripRes.rows[0];

    const daysRes = await this.db.query<TripDayRow>(
      `SELECT * FROM trip_days WHERE trip_id = $1 ORDER BY day_number ASC`,
      [tripId]
    );

    const days: TripDayDTO[] = [];
    let totalCost = 0;

    for (const d of daysRes.rows) {
      const itemsRes = await this.db.query<TripItemRow>(
        `SELECT ti.*, p.name as place_name, p.slug as place_slug, c.slug as category_slug,
                ST_Y(p.location::geometry) as lat, ST_X(p.location::geometry) as lng
         FROM trip_items ti
         JOIN places p ON p.id = ti.place_id
         JOIN categories c ON c.id = p.category_id
         WHERE ti.trip_day_id = $1
         ORDER BY ti.order_index ASC`,
        [d.id]
      );

      const items = itemsRes.rows.map((it) => {
        const cost = Number(it.estimated_cost ?? 0);
        totalCost += cost;
        return this.mapTripItemRow(it);
      });

      days.push({
        id: d.id,
        tripId: d.trip_id,
        dayNumber: d.day_number,
        date:
          (d.date as unknown) instanceof Date
            ? (d.date as unknown as Date).toISOString().slice(0, 10)
            : String(d.date).slice(0, 10),
        title: d.title,
        theme: d.theme,
        items,
      });
    }

    const mapped = this.mapTripRow(trip, days);
    mapped.totalEstimatedCost = Number(totalCost.toFixed(2));
    return mapped;
  }

  /**
   * Actualizar metadatos de un viaje
   */
  public async updateTrip(
    tripId: string,
    userId: string,
    dto: UpdateTripInput
  ): Promise<TripDTO> {
    await this.getTripById(tripId, userId);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.title) {
      fields.push(`title = $${idx++}`);
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description);
    }
    if (dto.status) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }
    if (dto.flexibilityMinutes !== undefined) {
      fields.push(`flexibility_minutes = $${idx++}`);
      values.push(dto.flexibilityMinutes);
    }
    if (dto.budgetTier) {
      fields.push(`budget_tier = $${idx++}`);
      values.push(dto.budgetTier);
    }

    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      values.push(tripId, userId);
      await this.db.query(
        `UPDATE trips SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++}`,
        values
      );
    }

    return this.getTripById(tripId, userId);
  }

  /**
   * Eliminar un viaje
   */
  public async deleteTrip(
    tripId: string,
    userId: string
  ): Promise<{ success: boolean; id: string }> {
    const res = await this.db.query(
      `DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id`,
      [tripId, userId]
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('Viaje no encontrado.');
    }
    return { success: true, id: tripId };
  }

  /**
   * Paso 6.1: Agregar actividad / lugar a un día específico
   */
  public async createTripItem(
    tripId: string,
    dayId: string,
    userId: string,
    dto: CreateTripItemInput
  ): Promise<TripItemDTO> {
    // Validar propiedad del viaje
    await this.getTripById(tripId, userId);

    // Verificar existencia del día
    const dayRes = await this.db.query<TripDayRow>(
      `SELECT * FROM trip_days WHERE id = $1 AND trip_id = $2`,
      [dayId, tripId]
    );
    if (dayRes.rows.length === 0) {
      throw new NotFoundException('Día de viaje no encontrado.');
    }

    // Verificar lugar
    const placeRes = await this.db.query<{
      id: string;
      name: string;
      avg_price_min: number | null;
      avg_price_max: number | null;
    }>('SELECT id, name, avg_price_min, avg_price_max FROM places WHERE id = $1', [
      dto.placeId,
    ]);
    if (placeRes.rows.length === 0) {
      throw new NotFoundException('Lugar no encontrado.');
    }
    const place = placeRes.rows[0];

    // Obtener orden y último ítem para calcular tránsito
    const lastItemRes = await this.db.query<{
      order_index: number;
      place_id: string;
      end_time: string | null;
    }>(
      `SELECT order_index, place_id, end_time FROM trip_items
       WHERE trip_day_id = $1 ORDER BY order_index DESC LIMIT 1`,
      [dayId]
    );

    const nextIndex =
      lastItemRes.rows.length > 0 ? lastItemRes.rows[0].order_index + 1 : 0;

    let transitMins = 0;
    let transitMeters = 0;

    if (lastItemRes.rows.length > 0) {
      transitMins = 15;
      transitMeters = 1000;
      const prevPlaceId = lastItemRes.rows[0].place_id;
      const distRes = await this.db.query<{ dist: string }>(
        `SELECT ROUND(ST_Distance(p1.location, p2.location)) as dist
         FROM places p1, places p2
         WHERE p1.id = $1 AND p2.id = $2`,
        [prevPlaceId, dto.placeId]
      );
      if (distRes.rows.length > 0 && distRes.rows[0].dist) {
        transitMeters = Number(distRes.rows[0].dist);
        transitMins = Math.max(10, Math.round(transitMeters / 80) + 5);
      }
    }

    const durationMins = dto.durationMinutes ?? 60;
    const startTime = dto.startTime ?? '10:00:00';
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = (h ?? 10) * 60 + (m ?? 0) + durationMins;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`;

    const estimatedCost = place.avg_price_min ?? 0.0;

    const insertRes = await this.db.query<TripItemRow>(
      `INSERT INTO trip_items (
        trip_day_id, place_id, activity_id, order_index, custom_title,
        start_time, end_time, duration_minutes, transit_minutes_from_prev,
        transit_distance_meters_from_prev, estimated_cost, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PLANNED')
      RETURNING *`,
      [
        dayId,
        dto.placeId,
        dto.activityId ?? null,
        nextIndex,
        dto.customTitle ?? place.name,
        startTime,
        endTime,
        durationMins,
        transitMins,
        transitMeters,
        estimatedCost,
        dto.notes ?? null,
      ]
    );

    return this.mapTripItemRow(insertRes.rows[0]);
  }

  /**
   * Paso 6.1: Modificar actividad (horarios o notas)
   */
  public async updateTripItem(
    tripId: string,
    itemId: string,
    userId: string,
    dto: UpdateTripItemInput
  ): Promise<TripItemDTO> {
    await this.getTripById(tripId, userId);

    const itemRes = await this.db.query<TripItemRow>(
      `SELECT * FROM trip_items WHERE id = $1`,
      [itemId]
    );
    if (itemRes.rows.length === 0) {
      throw new NotFoundException('Actividad no encontrada.');
    }
    const current = itemRes.rows[0];

    const duration = dto.durationMinutes ?? current.duration_minutes;
    const startTime = dto.startTime ?? current.start_time ?? '10:00';
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = (h ?? 10) * 60 + (m ?? 0) + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`;

    const updateRes = await this.db.query<TripItemRow>(
      `UPDATE trip_items
       SET custom_title = COALESCE($1, custom_title),
           start_time = $2,
           end_time = $3,
           duration_minutes = $4,
           notes = COALESCE($5, notes),
           status = COALESCE($6, status)
       WHERE id = $7
       RETURNING *`,
      [
        dto.customTitle ?? null,
        startTime,
        endTime,
        duration,
        dto.notes ?? null,
        dto.status ?? null,
        itemId,
      ]
    );

    return this.mapTripItemRow(updateRes.rows[0]);
  }

  /**
   * Paso 6.1: Eliminar actividad del día
   */
  public async deleteTripItem(
    tripId: string,
    itemId: string,
    userId: string
  ): Promise<{ success: boolean; id: string }> {
    await this.getTripById(tripId, userId);

    const res = await this.db.query(
      `DELETE FROM trip_items WHERE id = $1 RETURNING id`,
      [itemId]
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('Actividad no encontrada.');
    }
    return { success: true, id: itemId };
  }

  /**
   * Paso 6.1: Reordenar actividades de un día
   */
  public async reorderTripItems(
    tripId: string,
    dayId: string,
    userId: string,
    dto: ReorderTripItemsInput
  ): Promise<TripItemDTO[]> {
    await this.getTripById(tripId, userId);

    // Evitar colisión de índice único durante la reordenación sumando 1000 temporalmente
    await this.db.query(
      `UPDATE trip_items SET order_index = order_index + 1000 WHERE trip_day_id = $1`,
      [dayId]
    );

    for (let i = 0; i < dto.itemIdsInOrder.length; i++) {
      const itId = dto.itemIdsInOrder[i];
      await this.db.query(
        `UPDATE trip_items SET order_index = $1 WHERE id = $2 AND trip_day_id = $3`,
        [i, itId, dayId]
      );
    }

    const itemsRes = await this.db.query<TripItemRow>(
      `SELECT * FROM trip_items WHERE trip_day_id = $1 ORDER BY order_index ASC`,
      [dayId]
    );
    return itemsRes.rows.map((r) => this.mapTripItemRow(r));
  }

  /**
   * Paso 6.2 y 6.3: Motor de Planificación Asistida Determinista
   */
  public async generateAssistedPlan(
    userId: string,
    dto: AssistedPlanRequestInput
  ): Promise<TripDTO> {
    // 1. Obtener candidatos de la ciudad ordenados por score determinista y cercanía
    const placesRes = await this.db.query<{
      id: string;
      name: string;
      slug: string;
      category_slug: string;
      subcategory_slug: string | null;
      lat: number;
      lng: number;
      overall_score: string;
      price_tier: string;
      avg_price_min: string | null;
      avg_price_max: string | null;
    }>(
      `SELECT p.id, p.name, p.slug, c.slug as category_slug, sub.slug as subcategory_slug,
              ST_Y(p.location::geometry) as lat, ST_X(p.location::geometry) as lng,
              ps.overall_score, p.price_tier, p.avg_price_min, p.avg_price_max
       FROM places p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN subcategories sub ON sub.id = p.subcategory_id
       LEFT JOIN cities ci ON ci.id = p.city_id
       LEFT JOIN place_scores ps ON ps.place_id = p.id
       WHERE (ci.slug = $1 OR p.city_id IN (SELECT id FROM cities WHERE slug = $1))
         AND p.is_active = TRUE
       ORDER BY ps.overall_score DESC NULLS LAST
       LIMIT 40`,
      [dto.citySlug]
    );

    if (placesRes.rows.length === 0) {
      throw new NotFoundException(
        `No hay suficientes lugares disponibles en el catálogo para ${dto.citySlug}.`
      );
    }

    // 2. Crear viaje base
    const trip = await this.createTrip(userId, {
      citySlug: dto.citySlug,
      title: dto.title ?? `Itinerario Asistido en ${dto.citySlug}`,
      startDate: dto.startDate,
      endDate: dto.endDate,
      budgetTier: dto.budgetTier,
      travelStyles: dto.travelStyles as any,
      flexibilityMinutes: dto.flexibilityMinutes,
    });

    const days = trip.days ?? [];
    const pool = [...placesRes.rows];

    // Separar comida y turismo
    const foodPlaces = pool.filter((p) => p.category_slug === 'comida');
    const tourismPlaces = pool.filter((p) => p.category_slug !== 'comida');

    // 3. Para cada día, armar una secuencia lógica: Mañana (Turismo), Almuerzo (Comida), Tarde (Turismo), Cena (Comida)
    for (const day of days) {
      const daySlots = [
        {
          place: tourismPlaces.shift() ?? pool.shift(),
          startTime: '09:30',
          duration: 90,
          label: 'Mañana cultural / naturaleza',
        },
        {
          place: foodPlaces.shift() ?? pool.shift(),
          startTime: '12:30',
          duration: 75,
          label: 'Almuerzo recomendado',
        },
        {
          place: tourismPlaces.shift() ?? pool.shift(),
          startTime: '14:30',
          duration: 120,
          label: 'Tarde de exploración',
        },
        {
          place: foodPlaces.shift() ?? pool.shift(),
          startTime: '19:30',
          duration: 90,
          label: 'Cena gastronómica',
        },
      ];

      for (const slot of daySlots) {
        if (!slot.place) continue;
        await this.createTripItem(trip.id, day.id, userId, {
          placeId: slot.place.id,
          customTitle: slot.place.name,
          startTime: slot.startTime,
          durationMinutes: slot.duration,
          notes: slot.label,
        });
      }
    }

    return this.getTripById(trip.id, userId);
  }

  /**
   * Paso 6.4: Clasificación de Alternativas en 3 Niveles
   */
  public async getActivityAlternatives(
    tripId: string,
    itemId: string,
    userId: string,
    flexibilityMinutes: FlexibilityMinutes = 15
  ): Promise<{
    verySimilar: ActivityAlternativeOptionDTO[];
    relatedExperiences: ActivityAlternativeOptionDTO[];
    requiresAdjustments: ActivityAlternativeOptionDTO[];
  }> {
    await this.getTripById(tripId, userId);

    // Obtener ítem y lugar actual
    const itemRes = await this.db.query<TripItemRow>(
      `SELECT ti.*, p.name as place_name, p.slug as place_slug, c.slug as category_slug,
              sub.slug as subcategory_slug,
              ST_Y(p.location::geometry) as lat, ST_X(p.location::geometry) as lng,
              ps.overall_score
       FROM trip_items ti
       JOIN places p ON p.id = ti.place_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN subcategories sub ON sub.id = p.subcategory_id
       LEFT JOIN place_scores ps ON ps.place_id = p.id
       WHERE ti.id = $1`,
      [itemId]
    );

    if (itemRes.rows.length === 0) {
      throw new NotFoundException('Actividad no encontrada.');
    }
    const current = itemRes.rows[0];

    const originalCandidate: ScheduleCandidateInput = {
      placeId: current.place_id,
      name: current.place_name ?? 'Lugar',
      slug: current.place_slug ?? 'lugar',
      categorySlug: current.category_slug ?? 'turismo',
      subcategorySlug: (current as any).subcategory_slug ?? undefined,
      lat: Number(current.lat),
      lng: Number(current.lng),
      overallScore: Number(current.overall_score ?? 80),
      priceTier: 'MEDIUM',
      estimatedCost: Number(current.estimated_cost ?? 0),
      estimatedDurationMins: current.duration_minutes,
    };

    // Obtener candidatos de la misma ciudad
    const candsRes = await this.db.query<{
      id: string;
      name: string;
      slug: string;
      category_slug: string;
      subcategory_slug: string | null;
      lat: number;
      lng: number;
      overall_score: string;
      price_tier: string;
      avg_price_min: string | null;
    }>(
      `SELECT p.id, p.name, p.slug, c.slug as category_slug, sub.slug as subcategory_slug,
              ST_Y(p.location::geometry) as lat, ST_X(p.location::geometry) as lng,
              ps.overall_score, p.price_tier, p.avg_price_min
       FROM places p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN subcategories sub ON sub.id = p.subcategory_id
       LEFT JOIN place_scores ps ON ps.place_id = p.id
       WHERE p.id <> $1 AND p.is_active = TRUE
       LIMIT 30`,
      [current.place_id]
    );

    const candidates: ScheduleCandidateInput[] = candsRes.rows.map((r) => ({
      placeId: r.id,
      name: r.name,
      slug: r.slug,
      categorySlug: r.category_slug,
      subcategorySlug: r.subcategory_slug ?? undefined,
      lat: Number(r.lat),
      lng: Number(r.lng),
      overallScore: Number(r.overall_score ?? 75),
      priceTier: r.price_tier as any,
      estimatedCost: Number(r.avg_price_min ?? 15),
      estimatedDurationMins: 60,
    }));

    const classified = classifyActivityAlternatives(
      originalCandidate,
      candidates,
      flexibilityMinutes
    );

    const mapToOption = (
      c: ScheduleCandidateInput,
      matchLevel: 'VERY_SIMILAR' | 'RELATED_EXPERIENCE' | 'REQUIRES_ADJUSTMENTS',
      explanation: string
    ): ActivityAlternativeOptionDTO => {
      const dist = verifyProximityForVisit(
        originalCandidate.lat,
        originalCandidate.lng,
        c.lat,
        c.lng,
        50000
      ).distanceMeters;

      return {
        placeId: c.placeId,
        placeName: c.name,
        placeSlug: c.slug,
        categorySlug: c.categorySlug,
        overallScore: c.overallScore,
        distanceMetersFromOriginal: dist,
        estimatedCost: c.estimatedCost,
        estimatedDurationMins: c.estimatedDurationMins,
        matchLevel,
        explanation,
        scheduleCompatible: true,
        transitMinutesDifference: Math.round(dist / 80),
      };
    };

    return {
      verySimilar: classified.verySimilar.map((c) =>
        mapToOption(
          c,
          'VERY_SIMILAR',
          'Misma categoría y proximidad cercana (< 2.5 km).'
        )
      ),
      relatedExperiences: classified.relatedExperiences.map((c) =>
        mapToOption(
          c,
          'RELATED_EXPERIENCE',
          'Experiencia complementaria en la misma zona de exploración.'
        )
      ),
      requiresAdjustments: classified.requiresAdjustments.map((c) =>
        mapToOption(
          c,
          'REQUIRES_ADJUSTMENTS',
          'Lugar interesante que requiere mayor tiempo de traslado o ajuste de horario.'
        )
      ),
    };
  }

  /**
   * Paso 6.6: Previsualización de Reorganización Inteligente
   */
  public async previewReorganization(
    tripId: string,
    itemId: string,
    userId: string,
    newStartTime: string,
    newDurationMinutes: number
  ): Promise<TripReorganizationImpactDTO> {
    await this.getTripById(tripId, userId);

    // Obtener ítem para conocer su dayId
    const itemRes = await this.db.query<TripItemRow>(
      `SELECT * FROM trip_items WHERE id = $1`,
      [itemId]
    );
    if (itemRes.rows.length === 0) {
      throw new NotFoundException('Actividad no encontrada.');
    }
    const dayId = itemRes.rows[0].trip_day_id;

    // Obtener todos los ítems del día ordenados
    const dayItemsRes = await this.db.query<TripItemRow>(
      `SELECT ti.*, p.name as place_name
       FROM trip_items ti
       JOIN places p ON p.id = ti.place_id
       WHERE ti.trip_day_id = $1
       ORDER BY ti.order_index ASC`,
      [dayId]
    );

    const schedule: DayItemSchedule[] = dayItemsRes.rows.map((it) => ({
      id: it.id,
      placeName: it.place_name ?? 'Actividad',
      startTime: it.start_time?.slice(0, 5) ?? '10:00',
      durationMinutes: it.duration_minutes,
      transitMinutesFromPrev: it.transit_minutes_from_prev,
    }));

    return detectReorganizationImpact({
      modifiedItemId: itemId,
      newStartTime,
      newDurationMinutes,
      currentItems: schedule,
      flexibilityMinutes: 15,
    });
  }

  /**
   * Paso 6.6: Aplicar Reorganización Aprobada por el Usuario
   */
  public async applyReorganization(
    tripId: string,
    userId: string,
    dto: ApplyReorganizationInput
  ): Promise<{ success: boolean; updatedCount: number }> {
    await this.getTripById(tripId, userId);

    let updatedCount = 0;
    for (const itId of dto.affectedItemIds) {
      const itRes = await this.db.query<TripItemRow>(
        `SELECT * FROM trip_items WHERE id = $1`,
        [itId]
      );
      if (itRes.rows.length > 0) {
        const it = itRes.rows[0];
        const [h, m] = (it.start_time ?? '10:00').split(':').map(Number);
        const newStartMins = (h ?? 10) * 60 + (m ?? 0) + dto.shiftMinutes;
        const newEndMins = newStartMins + it.duration_minutes;

        const newStartTime = `${String(Math.floor(newStartMins / 60)).padStart(2, '0')}:${String(newStartMins % 60).padStart(2, '0')}:00`;
        const newEndTime = `${String(Math.floor(newEndMins / 60)).padStart(2, '0')}:${String(newEndMins % 60).padStart(2, '0')}:00`;

        await this.db.query(
          `UPDATE trip_items SET start_time = $1, end_time = $2 WHERE id = $3`,
          [newStartTime, newEndTime, itId]
        );
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  }

  private mapTripRow(row: TripRow, days?: TripDayDTO[]): TripDTO {
    const formatDate = (val: unknown) => {
      if (!val) return '';
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      return String(val).slice(0, 10);
    };

    return {
      id: row.id,
      userId: row.user_id,
      destinationId: row.destination_id,
      citySlug: row.city_slug,
      title: row.title,
      description: row.description,
      startDate: formatDate(row.start_date),
      endDate: formatDate(row.end_date),
      budgetTier: row.budget_tier as any,
      travelStyles: (row.travel_styles ?? []) as any,
      flexibilityMinutes: row.flexibility_minutes as any,
      status: row.status as any,
      days,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTripItemRow(row: TripItemRow): TripItemDTO {
    return {
      id: row.id,
      tripDayId: row.trip_day_id,
      placeId: row.place_id,
      placeName: row.place_name,
      placeSlug: row.place_slug,
      categorySlug: row.category_slug,
      coordinates:
        row.lat !== undefined && row.lng !== undefined
          ? { lat: Number(row.lat), lng: Number(row.lng) }
          : undefined,
      activityId: row.activity_id,
      orderIndex: row.order_index,
      customTitle: row.custom_title,
      startTime: row.start_time?.slice(0, 5) ?? null,
      endTime: row.end_time?.slice(0, 5) ?? null,
      durationMinutes: row.duration_minutes,
      transitMinutesFromPrev: row.transit_minutes_from_prev,
      transitDistanceMetersFromPrev: row.transit_distance_meters_from_prev,
      estimatedCost: Number(row.estimated_cost ?? 0),
      notes: row.notes,
      status: row.status as any,
    };
  }
}
