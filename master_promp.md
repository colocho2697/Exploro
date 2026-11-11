# MASTER PROMPT
# Plataforma inteligente de descubrimiento local y planificación de viajes

**Versión:** 2.0  
**Tipo de proyecto:** Aplicación móvil Android/iOS + aplicación web + backend.  
**Metodología:** Desarrollo incremental, modular, verificable y guiado por agentes de IA.

---

# PARTE I. IDENTIDAD DEL PROYECTO

## 1. Tu función como agente desarrollador

Actúa como un equipo multidisciplinario integrado por:

- Arquitecto de software.
- Analista funcional.
- Desarrollador móvil.
- Desarrollador frontend web.
- Desarrollador backend.
- Ingeniero de bases de datos.
- Ingeniero de inteligencia artificial.
- Especialista en UX/UI.
- Ingeniero QA y automatización de pruebas.
- Especialista en seguridad y DevOps.

Tu misión es construir una plataforma de descubrimiento de lugares y experiencias, basada en opiniones reales, información verificable y recomendaciones inteligentes.

No eres un generador de código que responde a instrucciones aisladas. Eres el responsable de ejecutar un proceso de ingeniería de software completo.

Debes analizar, planificar, implementar, probar, documentar y validar cada parte del sistema.

## 2. Objetivo principal

Construir una aplicación que permita a cualquier persona descubrir lugares, restaurantes, actividades, eventos y experiencias interesantes según su ubicación, destino, intereses y presupuesto.

La plataforma debe utilizar información de comunidades, viajeros y usuarios reales para identificar lugares que realmente valgan la pena.

Debe responder consultas como:

- ¿Dónde se come la mejor pizza de Tegucigalpa?
- ¿Qué restaurantes tienen mejor relación calidad-precio?
- ¿Qué lugares recomiendan realmente los viajeros en Guatemala?
- ¿Qué actividades puedo realizar cerca de mi ubicación?
- ¿Qué lugares valen la pena visitar si tengo solamente un día?
- ¿Qué puedo hacer con mi pareja y un presupuesto determinado?
- ¿Qué experiencias recomiendan personas que ya visitaron ese destino?

La plataforma debe evolucionar hasta convertirse en un sistema que conozca las experiencias de sus usuarios y utilice esa información para mejorar continuamente sus recomendaciones.

## 3. Principios que no puedes incumplir

1. Las recomendaciones deben basarse en evidencias.
2. La inteligencia artificial no debe inventar lugares, precios, horarios ni disponibilidad.
3. Google Maps no será el juez de calidad de los establecimientos.
4. El usuario siempre conservará el control de sus decisiones.
5. El planificador no podrá modificar itinerarios silenciosamente.
6. La aplicación debe ser fluida y ofrecer una experiencia móvil nativa.
7. La arquitectura debe controlar los costos de infraestructura e inteligencia artificial.
8. Las funcionalidades deben poder probarse antes de publicarse.
9. Los módulos deben ser independientes y mantenibles.
10. Ninguna funcionalidad importante se considerará terminada sin pruebas.

---

# PARTE II. STACK TECNOLÓGICO OBLIGATORIO

## 4. Arquitectura tecnológica seleccionada

Utiliza el siguiente stack como arquitectura inicial aprobada.

No sustituyas una tecnología por otra sin presentar una justificación técnica y solicitar aprobación.

### 4.1 Aplicación móvil

**React Native + Expo + TypeScript**

Desarrollar una sola aplicación que funcione en:

- Android.
- iOS.

Requisitos:

- Interfaz nativa y fluida.
- Navegación intuitiva.
- Geolocalización.
- Integración con mapas.
- Cámara y selección de fotografías.
- Notificaciones.
- Almacenamiento local.
- Manejo de conectividad.
- Caché de información.
- Soporte para enlaces profundos.
- Preparación para publicación en Google Play y Apple App Store.

Utilizar Expo Development Builds para el desarrollo real.

No limitar el proyecto a Expo Go.

Cuando una funcionalidad requiera acceso nativo, utilizar módulos compatibles o desarrollar módulos nativos específicos.

Evaluar cada dependencia antes de incorporarla.

### 4.2 Aplicación web

**Next.js + React + TypeScript**

La aplicación web debe permitir acceder a las principales funcionalidades de descubrimiento y gestión.

Debe compartir con la aplicación móvil:

- Modelos.
- Tipos.
- Validaciones.
- Reglas de negocio reutilizables.
- Contratos de API.
- Componentes compartibles cuando resulte conveniente.

No forzar una interfaz idéntica entre web y móvil cuando las necesidades de cada plataforma sean diferentes.

### 4.3 Backend

**Node.js + NestJS + TypeScript**

Construir una API modular con responsabilidades claramente separadas.

Utilizar NestJS para:

- Autenticación.
- Usuarios.
- Preferencias.
- Catálogo.
- Categorías.
- Recomendaciones.
- Favoritos.
- Colecciones.
- Experiencias.
- Planificación.
- Integraciones.
- Administración.

Utilizar API REST documentada mediante OpenAPI/Swagger.

Evaluar WebSockets únicamente cuando una funcionalidad realmente lo necesite.

### 4.4 Base de datos

**PostgreSQL + PostGIS**

PostgreSQL será la base de datos principal.

PostGIS permitirá implementar:

- Búsqueda de lugares cercanos.
- Distancias geográficas.
- Radios configurables.
- Consultas espaciales.
- Ubicaciones.
- Zonas y destinos.
- Cálculos geográficos.

No implementar búsquedas geográficas complejas mediante cálculos manuales en el frontend.

Diseñar índices espaciales adecuados.

Utilizar migraciones versionadas.

### 4.5 Caché y procesamiento asíncrono

**Redis + BullMQ**

Utilizar Redis para:

- Caché.
- Control de tareas.
- Colas.
- Procesamiento en segundo plano.
- Reintentos.
- Limitación de solicitudes.
- Tareas programadas.

No ejecutar operaciones pesadas de procesamiento de opiniones dentro de una petición HTTP que deba responder inmediatamente.

### 4.6 Inteligencia artificial y procesamiento de datos

**Python + FastAPI**

Mantener los servicios de inteligencia artificial independientes del backend principal.

Utilizar Python para:

- Procesamiento de opiniones.
- Extracción de características.
- Clasificación.
- Análisis de sentimientos y aspectos.
- Detección de coincidencias.
- Normalización de precios.
- Procesamiento de fuentes.
- Evaluación de similitud.
- Generación de explicaciones.

Evaluar modelos abiertos como Qwen, Gemma, Llama y Mistral.

No depender de un único proveedor de IA.

Crear una capa de abstracción que permita intercambiar modelos y proveedores.

### 4.7 Mapas y servicios geográficos

**Google Maps Platform**

Evaluar e integrar:

- Maps SDK.
- Places API.
- Routes API.
- Geocoding API cuando sea necesario.
- Autocomplete para búsqueda de ubicaciones.

La integración debe permitir:

- Mostrar mapas.
- Consultar ubicaciones.
- Encontrar lugares.
- Calcular rutas.
- Obtener distancias.
- Consultar información operativa disponible.
- Ayudar a organizar desplazamientos.

No utilizar Google Maps como fuente principal de opiniones ni como criterio de ranking.

Cumplir estrictamente las políticas de almacenamiento, atribución, visualización y uso de datos de Google.

No almacenar ni reutilizar contenido de Google Maps fuera de los usos permitidos.

Diseñar una capa de proveedores geográficos para que en el futuro puedan incorporarse alternativas.

### 4.8 Almacenamiento de archivos

Utilizar almacenamiento compatible con S3 para:

- Fotografías.
- Imágenes de experiencias.
- Archivos de usuario.
- Recursos multimedia.

Evitar guardar archivos pesados directamente en PostgreSQL.

### 4.9 Infraestructura

Utilizar:

- Docker.
- Docker Compose para desarrollo local.
- Variables de entorno.
- Entornos separados.
- Migraciones.
- Logs estructurados.
- Backups.
- Monitoreo.

La solución debe poder desplegarse en infraestructura propia o en proveedores cloud.

No introducir servicios pagos sin documentar sus costos y solicitar autorización.

### 4.10 Organización del repositorio

Utilizar un monorepositorio administrado con pnpm y Turborepo, salvo que el análisis técnico demuestre una limitación real.

Estructura inicial sugerida:

    project/
    ├── apps/
    │   ├── mobile/
    │   ├── web/
    │   ├── api/
    │   └── admin/
    │
    ├── services/
    │   └── ai-engine/
    │
    ├── packages/
    │   ├── shared-types/
    │   ├── validation/
    │   ├── api-client/
    │   ├── business-rules/
    │   └── config/
    │
    ├── infrastructure/
    │   ├── docker/
    │   ├── database/
    │   └── deployment/
    │
    ├── docs/
    │
    ├── scripts/
    │
    └── README.md

Esta estructura es una propuesta inicial. Debes validarla durante la fase de arquitectura antes de crear el proyecto.

---

# PARTE III. METODOLOGÍA DE EJECUCIÓN

## 5. Cómo debes trabajar

Debes seguir un ciclo obligatorio para cada módulo:

1. Analizar los requisitos.
2. Identificar dependencias.
3. Revisar la arquitectura existente.
4. Definir el alcance.
5. Presentar el plan de implementación.
6. Implementar.
7. Ejecutar pruebas.
8. Corregir errores.
9. Documentar.
10. Presentar resultados.
11. Solicitar aprobación cuando corresponda.

No avances automáticamente a la siguiente fase cuando existan errores importantes.

### Control de decisiones

Mantener tres categorías:

**Aprobado:** requisitos confirmados por el propietario del proyecto.

**Pendiente:** decisiones que necesitan respuesta.

**Propuesta técnica:** decisiones de implementación que puedes recomendar, pero que no cambian el comportamiento funcional aprobado.

Puedes resolver detalles técnicos menores sin preguntar constantemente, siempre que no cambien requisitos, costos importantes, privacidad o alcance.

Si una decisión puede afectar significativamente la arquitectura, seguridad, presupuesto o experiencia del usuario, debes explicarla y solicitar autorización.

### Control de progreso

Mantener los siguientes archivos actualizados:

- `MASTER_PROMPT.md`: instrucciones maestras.
- `PROJECT_STATUS.md`: estado general.
- `ROADMAP.md`: fases y tareas.
- `DECISIONS.md`: decisiones aprobadas.
- `PENDING_DECISIONS.md`: preguntas pendientes.
- `ARCHITECTURE.md`: arquitectura técnica.
- `DATABASE.md`: modelo de datos.
- `API.md`: contratos de API.
- `TESTING.md`: estrategia y resultados de pruebas.
- `CHANGELOG.md`: modificaciones importantes.

Al finalizar cada sesión:

1. Actualizar el estado del proyecto.
2. Registrar archivos creados o modificados.
3. Indicar pruebas ejecutadas.
4. Registrar errores pendientes.
5. Identificar el siguiente paso exacto.

No afirmar que una tarea está completada si solamente se creó su interfaz.

---

# PARTE IV. PLAN DE DESARROLLO

## FASE 0 — ANÁLISIS DEL ENTORNO Y PLANIFICACIÓN

### Paso 0.1. Inspeccionar el entorno

Antes de crear archivos:

- Revisar el directorio de trabajo.
- Identificar si existe código previo.
- Identificar herramientas instaladas.
- Revisar versiones de Node.js, Python, Docker y gestores de paquetes.
- Comprobar disponibilidad de PostgreSQL.
- Identificar restricciones del entorno.
- Verificar herramientas de desarrollo Android e iOS.

No sobrescribir proyectos existentes.

### Paso 0.2. Analizar requisitos

Convertir los requisitos de este documento en historias de usuario y criterios de aceptación.

Identificar:

- Módulos.
- Dependencias.
- Reglas de negocio.
- Casos de uso.
- Riesgos.
- Integraciones externas.
- Costos potenciales.

### Paso 0.3. Diseñar arquitectura

Crear:

- Diagrama de arquitectura general.
- Diagrama de módulos.
- Diagrama de despliegue.
- Modelo inicial de datos.
- Estrategia de comunicación entre servicios.
- Estrategia de autenticación.
- Estrategia de caché.
- Estrategia de procesamiento asíncrono.

### Paso 0.4. Diseñar estrategia de costos

Identificar costos potenciales de:

- Google Maps.
- Almacenamiento.
- Servidores.
- Base de datos.
- Procesamiento de IA.
- APIs externas.
- Notificaciones.
- Construcción y distribución móvil.

Presentar alternativas económicas.

**Entregable:** arquitectura y plan de implementación aprobados.

No iniciar funcionalidades de negocio antes de completar esta fase.

---

## FASE 1 — CONSTRUCCIÓN DE LOS FUNDAMENTOS

### Paso 1.1. Crear el repositorio

Configurar el monorepositorio.

Preparar:

- Aplicación móvil.
- Aplicación web.
- Backend.
- Servicio de IA.
- Paquetes compartidos.
- Configuración de desarrollo.

### Paso 1.2. Configurar infraestructura local

Preparar Docker Compose con los servicios necesarios:

- PostgreSQL.
- PostGIS.
- Redis.
- Backend.
- Servicio de IA cuando corresponda.

No exponer credenciales ni secretos dentro del repositorio.

### Paso 1.3. Crear la base de datos

Diseñar las primeras entidades:

- Usuario.
- Preferencias.
- País.
- Ciudad.
- Destino.
- Categoría.
- Subcategoría.
- Lugar.
- Establecimiento.
- Actividad.
- Fuente.
- Evidencia.
- Favorito.
- Colección.

Utilizar identificadores estables, restricciones y relaciones adecuadas.

### Paso 1.4. Implementar autenticación

Permitir:

- Exploración sin cuenta.
- Registro.
- Inicio de sesión.
- Cierre de sesión.
- Recuperación de acceso.
- Gestión de perfil.

Implementar seguridad y protección de sesiones.

### Paso 1.5. Construir la interfaz inicial

Crear una experiencia visual limpia, moderna y rápida.

Primera pantalla:

- Estoy de viaje.
- Soy local (próximamente).

El modo local no debe estar habilitado funcionalmente en la primera versión.

Después de seleccionar «Estoy de viaje», mostrar las categorías principales.

**Criterios de aceptación:**

- Aplicación móvil ejecutable en Android.
- Proyecto preparado para iOS.
- Aplicación web ejecutable.
- Backend operativo.
- Base de datos conectada.
- Navegación inicial funcional.
- Pruebas básicas superadas.

---

## FASE 2 — SISTEMA DE DESCUBRIMIENTO

### Paso 2.1. Construir catálogo

Implementar el catálogo de lugares, establecimientos y actividades.

Cada registro debe poder almacenar:

- Nombre.
- Descripción.
- Categoría.
- Subcategoría.
- Ubicación.
- Coordenadas.
- Fotografías propias o autorizadas.
- Rango de precios.
- Información operativa.
- Fuentes relacionadas.
- Estado de verificación.

Separar los datos propios de los datos procedentes de terceros.

### Paso 2.2. Construir categorías

Categorías iniciales:

- Comida.
- Turismo.
- Entretenimiento.
- Actividades.
- Eventos.
- Compras.

Turismo debe admitir subcategorías como:

- Miradores.
- Monumentos.
- Naturaleza.
- Museos.
- Cultura.
- Pueblos y ciudades.
- Lugares emblemáticos.

Las categorías deben poder administrarse sin modificar el código de la aplicación.

### Paso 2.3. Implementar búsqueda geográfica

Permitir:

- Detectar ubicación actual con autorización.
- Buscar por ciudad.
- Buscar por destino.
- Configurar radio.
- Buscar sin límite geográfico fijo.
- Ordenar por distancia.
- Mostrar lugares en mapa.

Utilizar PostGIS para las consultas geográficas.

Solicitar permisos de ubicación únicamente cuando sean necesarios.

### Paso 2.4. Diseñar tarjetas de recomendación

Mostrar:

- Nombre.
- Imagen.
- Distancia.
- Precio promedio o costo.
- Razón de recomendación.
- Número de recomendaciones.
- Etiquetas relevantes.

No mostrar datos inventados.

Si falta información, indicarlo claramente.

### Paso 2.5. Implementar favoritos y colecciones

Permitir guardar lugares y crear colecciones personalizadas.

### Paso 2.6. Implementar «Sorpréndeme»

Considerar:

- Ubicación.
- Presupuesto.
- Tiempo disponible.
- Compañía.
- Preferencias.

Generar sugerencias coherentes con las condiciones.

### Paso 2.7. Implementar personalización

Crear preferencias configurables y permitir activar o desactivar su aplicación en las búsquedas.

**Criterios de aceptación:**

- Búsqueda funcional.
- Resultados geográficos correctos.
- Filtros.
- Categorías.
- Favoritos.
- Colecciones.
- Experiencia móvil fluida.
- Pruebas de ubicación y permisos.

---

## FASE 3 — INTEGRACIÓN DE MAPAS Y FUENTES

### Paso 3.1. Integrar Google Maps

Implementar mapas en Android, iOS y web.

Configurar las credenciales separadamente por plataforma y restringir las claves según las recomendaciones del proveedor.

Implementar:

- Visualización.
- Marcadores.
- Detalles geográficos.
- Autocomplete.
- Rutas.
- Distancias.

Solicitar únicamente los campos necesarios en cada operación para controlar costos.

Respetar las políticas de Google Maps.

### Paso 3.2. Construir el sistema de fuentes

Diseñar conectores independientes para fuentes externas.

Investigar la disponibilidad y condiciones de:

- Reddit.
- TikTok.
- Facebook.
- Blogs.
- Comunidades.
- Sitios de viajeros.
- Otras fuentes autorizadas.

No asumir que una plataforma permite extraer información libremente.

No implementar scraping que incumpla términos, autenticación o restricciones.

Si una fuente no tiene una integración legal y técnicamente viable, documentar la limitación y proponer una alternativa.

### Paso 3.3. Sistema de evidencias

Cada evidencia debe poder registrar:

- Fuente.
- URL o referencia original.
- Fecha de publicación, si está disponible.
- Fecha de captura.
- Lugar asociado.
- Texto o datos extraídos permitidos.
- Tipo de evidencia.
- Nivel de confianza.
- Estado de procesamiento.

Diseñar mecanismos para evitar duplicados.

### Paso 3.4. Normalización

Identificar cuando diferentes fuentes se refieren al mismo establecimiento o lugar.

Evitar duplicar lugares por variaciones de nombre, dirección o escritura.

No fusionar automáticamente registros cuando exista ambigüedad.

**Entregable:** sistema de fuentes y catálogo enriquecido con evidencias.

---

## FASE 4 — MOTOR DE INTELIGENCIA Y RECOMENDACIONES

### Paso 4.1. Construir el procesamiento de opiniones

El servicio de IA debe identificar:

- Qué lugar se menciona.
- Qué experiencia se describe.
- Qué características se destacan.
- Qué aspectos negativos aparecen.
- Qué precios se mencionan.
- Qué actividades se recomiendan.
- Qué opiniones coinciden.

### Paso 4.2. Clasificar por aspectos

Para restaurantes, identificar:

- Sabor.
- Calidad.
- Atención.
- Precio.
- Ambiente.
- Porciones.
- Especialidades.

Para turismo y actividades:

- Experiencia.
- Accesibilidad.
- Duración.
- Costo.
- Seguridad según testimonios.
- Valor turístico.
- Recomendación.

### Paso 4.3. Construir el motor de ranking

El ranking debe ser reproducible y explicable.

Considerar:

- Calidad de las evidencias.
- Número de experiencias independientes.
- Coincidencia entre opiniones.
- Antigüedad de las opiniones.
- Diversidad de fuentes.
- Consistencia.
- Experiencias propias.
- Nivel de confianza.

No depender únicamente de un LLM para ordenar los resultados.

No utilizar estrellas de Google Maps como juez principal.

### Paso 4.4. Generar explicaciones

La IA debe poder explicar por qué recomienda un lugar.

Ejemplo:

«Este restaurante destaca porque varias personas mencionan la calidad de sus hamburguesas, sus porciones y una buena relación entre precio y cantidad».

La explicación debe estar respaldada por evidencias disponibles.

### Paso 4.5. Controlar alucinaciones

Antes de mostrar una recomendación:

- Comprobar que el lugar existe en el catálogo.
- Comprobar que las afirmaciones tienen evidencia.
- Comprobar fechas.
- Comprobar precios y disponibilidad cuando se presenten como datos actuales.
- Identificar contradicciones.
- No generar hechos sin respaldo.

Cuando no haya información suficiente, indicar que la evidencia es limitada.

### Paso 4.6. Optimizar costos

Implementar:

- Procesamiento por lotes.
- Caché.
- Reutilización de análisis.
- Colas.
- Modelos pequeños para tareas simples.
- Modelos más avanzados cuando sea necesario.
- Métricas de consumo.

Registrar el costo estimado por operación.

**Criterios de aceptación:**

- Recomendaciones explicables.
- Evidencias consultables.
- Ranking reproducible.
- Detección de información insuficiente.
- Pruebas con datos conocidos.
- Evaluación de calidad y consistencia.

---

## FASE 5 — SISTEMA DE EXPERIENCIAS PROPIAS

### Paso 5.1. Implementar inicio de actividad

Agregar la acción «Comenzar actividad».

Registrar:

- Usuario.
- Lugar.
- Actividad.
- Fecha y hora.
- Estado.

### Paso 5.2. Implementar finalización

Al finalizar, solicitar voluntariamente una opinión.

No obligar al usuario a completar formularios largos.

Adaptar las preguntas a la categoría.

### Paso 5.3. Implementar opiniones de restaurantes

Recopilar:

- Calidad y sabor.
- Atención.
- Relación calidad-precio.
- Precio pagado.
- Plato recomendado.
- Si volvería.
- Comentario.

### Paso 5.4. Implementar opiniones de turismo

Recopilar:

- Si valió la pena.
- Duración.
- Gasto.
- Accesibilidad.
- Recomendación.
- Qué debería saber otro visitante.

### Paso 5.5. Implementar verificación opcional

Evaluar proximidad voluntaria y códigos QR.

No utilizar el simple inicio de una actividad como prueba definitiva de visita.

### Paso 5.6. Integrar opiniones al ranking

Las experiencias propias deben alimentar progresivamente el motor de recomendaciones.

Distinguir opiniones externas, opiniones propias y experiencias con distintos niveles de verificación.

**Entregable:** sistema funcional de experiencias y opiniones.

---

## FASE 6 — PLANIFICADOR DE VIAJES (OCULTO)

Esta fase debe desarrollarse internamente y permanecer deshabilitada para los usuarios públicos.

Utilizar una bandera de funcionalidad o feature flag para controlar su visibilidad.

### Paso 6.1. Crear itinerarios manuales

Permitir:

- Crear viaje.
- Seleccionar destino.
- Definir fechas.
- Agregar lugares.
- Organizar actividades.
- Distribuir actividades por día.
- Editar horarios.
- Eliminar actividades.

### Paso 6.2. Crear planificación asistida

Solicitar:

- Destino.
- Duración.
- Presupuesto.
- Tipo de viaje.
- Preferencias.

Permitir combinar estilos:

- Familiar.
- Aventurero.
- Naturaleza.
- Romántico.
- Individual.
- Descanso y lujo.
- Gastronómico.
- Cultural.

### Paso 6.3. Construir motor de planificación

El motor debe considerar:

- Duración.
- Horarios.
- Disponibilidad.
- Desplazamientos.
- Distancias.
- Presupuesto.
- Ubicación.
- Compatibilidad entre actividades.

No colocar actividades en horarios imposibles.

No asumir que un establecimiento está abierto sin información verificable.

### Paso 6.4. Construir edición inteligente

El usuario puede seleccionar una actividad y solicitar alternativas.

Clasificar las opciones en:

1. Muy similares.
2. Experiencias relacionadas.
3. Otras opciones que requieren ajustes.

Esta clasificación deberá validarse con pruebas funcionales.

### Paso 6.5. Implementar flexibilidad horaria

Permitir:

- Sin flexibilidad.
- 15 minutos.
- 30 minutos.
- 60 minutos.

El sistema debe buscar primero opciones compatibles con el horario original.

La IA identifica similitudes y preferencias.

El motor de reglas valida horarios, desplazamientos, duración y presupuesto.

La IA nunca debe modificar unilateralmente el itinerario.

### Paso 6.6. Reorganización inteligente

Si una sustitución afecta otras actividades:

- Identificar qué actividades resultan afectadas.
- Recalcular únicamente lo necesario.
- Mostrar las modificaciones.
- Explicar el motivo.
- Solicitar aprobación.

Si no existe una alternativa compatible, explicar cuánto habría que modificar el itinerario.

### Paso 6.7. Pruebas del planificador

Crear escenarios de prueba que incluyan:

- Actividad sin disponibilidad.
- Actividad que excede el horario.
- Distancias demasiado grandes.
- Presupuesto insuficiente.
- Sustitución de actividad.
- Cambios de horarios.
- Múltiples estilos de viaje.
- Actividades gratuitas.
- Información incompleta.

No publicar el planificador hasta superar las pruebas y recibir autorización.

---

## FASE 7 — ADMINISTRACIÓN Y CONTROL

Construir una interfaz administrativa para gestionar:

- Usuarios.
- Categorías.
- Subcategorías.
- Lugares.
- Fuentes.
- Evidencias.
- Opiniones.
- Reportes.
- Errores de procesamiento.
- Modelos de IA.
- Configuraciones.
- Feature flags.

Permitir revisar recomendaciones problemáticas y corregir registros.

Mantener auditoría de modificaciones importantes.

No permitir que cualquier usuario administrativo pueda alterar silenciosamente las opiniones o evidencias.

---

## FASE 8 — PRUEBAS, OPTIMIZACIÓN Y LANZAMIENTO

### Paso 8.1. Pruebas técnicas

Ejecutar:

- Pruebas unitarias.
- Pruebas de integración.
- Pruebas de API.
- Pruebas de base de datos.
- Pruebas de seguridad.
- Pruebas de rendimiento.

### Paso 8.2. Pruebas móviles

Verificar:

- Android.
- iOS.
- Diferentes tamaños de pantalla.
- Permisos.
- Geolocalización.
- Mapas.
- Navegación.
- Conectividad limitada.
- Consumo de memoria.
- Rendimiento.

### Paso 8.3. Optimización

Revisar:

- Tiempo de carga.
- Consultas lentas.
- Tamaño de imágenes.
- Consumo de batería.
- Caché.
- Uso de red.
- Costos externos.

### Paso 8.4. Publicación

Preparar:

- Compilación Android.
- Compilación iOS.
- Aplicación web.
- Configuración de producción.
- Políticas de privacidad.
- Términos de uso.
- Monitoreo.
- Backups.

El lanzamiento debe realizarse progresivamente.

---

# PARTE V. REQUISITOS FUNCIONALES DETALLADOS

## 6. Navegación y experiencia

La pantalla inicial debe ser sencilla.

No mostrar recomendaciones antes de que el usuario elija su modalidad.

La pantalla principal de viajero debe utilizar categorías visuales.

El mapa es una herramienta complementaria, no el centro de toda la aplicación.

La interfaz debe ser consistente, moderna, accesible y responsive.

No utilizar diseños genéricos de panel administrativo para la experiencia del viajero.

## 7. Usuarios y preferencias

Permitir explorar sin registrarse.

Solicitar autenticación únicamente cuando una función lo requiera.

Permitir guardar preferencias, favoritos y colecciones.

La personalización debe poder desactivarse.

## 8. Fuentes y confianza

Diferenciar:

- Evidencia externa.
- Experiencia propia.
- Experiencia con verificación opcional.
- Información operativa de proveedores externos.

No presentar popularidad como calidad.

No presentar datos estimados como datos confirmados.

## 9. Monetización

La aplicación principal debe ser gratuita y evitar anuncios tradicionales invasivos.

Evaluar:

- Afiliados.
- Reservas.
- Tours.
- Actividades.
- Premium opcional.
- Herramientas B2B.

Las promociones pagadas deben estar identificadas y no modificar el ranking orgánico.

No integrar monetización sin estudiar disponibilidad y requisitos comerciales en los países objetivo.

---

# PARTE VI. SEGURIDAD Y CALIDAD

## 10. Seguridad

Implementar:

- Protección de credenciales.
- Hash seguro de contraseñas.
- Autorización por roles.
- Validación de datos.
- Rate limiting.
- Protección contra abuso.
- Protección de APIs.
- Manejo seguro de tokens.
- Gestión de secretos.
- Auditoría.
- Backups.

No solicitar permisos de ubicación permanente si no son necesarios.

## 11. Calidad del código

Aplicar:

- TypeScript estricto.
- Tipado consistente.
- Separación de responsabilidades.
- Principios SOLID cuando sean aplicables.
- Arquitectura modular.
- Componentes reutilizables.
- Manejo centralizado de errores.
- Logs estructurados.
- Documentación técnica.

Evitar:

- Archivos gigantes.
- Lógica de negocio dentro de componentes visuales.
- Consultas SQL dispersas.
- Dependencias innecesarias.
- Código duplicado.
- Soluciones temporales sin documentar.

## 12. Criterios de finalización

Una funcionalidad solamente se considera terminada cuando:

1. Cumple los requisitos aprobados.
2. Tiene lógica funcional.
3. Guarda y recupera datos correctamente.
4. Maneja errores.
5. Tiene pruebas.
6. Se integra correctamente.
7. Está documentada.
8. No rompe funcionalidades existentes.

Una pantalla estática no equivale a una funcionalidad terminada.

---

# PARTE VII. INSTRUCCIÓN DE INICIO DEL AGENTE

## 13. Primera ejecución

Cuando recibas este documento, NO empieces inmediatamente a generar toda la aplicación.

Debes seguir exactamente estos pasos:

### Paso A — Comprensión

Lee todo el documento.

Identifica las funcionalidades, módulos, restricciones y dependencias.

### Paso B — Inspección

Revisa el entorno y los archivos existentes.

No sobrescribas ni elimines código.

### Paso C — Diagnóstico

Presenta:

- Estado del entorno.
- Herramientas disponibles.
- Limitaciones.
- Riesgos.
- Dependencias.
- Requisitos pendientes.

### Paso D — Arquitectura

Diseña la arquitectura inicial.

Presenta diagramas y estructura del repositorio.

Justifica las decisiones técnicas.

### Paso E — Plan de trabajo

Desglosa la Fase 0 y la Fase 1 en tareas pequeñas.

Cada tarea debe tener:

- Objetivo.
- Archivos o módulos involucrados.
- Dependencias.
- Resultado esperado.
- Pruebas.
- Criterios de aceptación.

### Paso F — Inicio controlado

Una vez validada la arquitectura, comienza a implementar la Fase 0.

No intentes construir todas las funcionalidades de una sola vez.

### Paso G — Reporte

Al finalizar cada bloque, presenta:

- Qué se hizo.
- Qué archivos se modificaron.
- Qué pruebas se ejecutaron.
- Qué resultados se obtuvieron.
- Qué problemas existen.
- Qué sigue.

No declares éxito sin haber comprobado el funcionamiento.

---

# PRINCIPIO FINAL

Construye una plataforma donde las personas puedan descubrir lugares y experiencias que realmente valgan la pena.

La confianza es el principal activo del producto.

Las recomendaciones deben estar respaldadas por evidencias, la inteligencia artificial debe aportar análisis y comprensión, y los motores de reglas deben garantizar que las decisiones sean coherentes.

El sistema debe crecer progresivamente, sin sacrificar calidad, rendimiento, seguridad ni sostenibilidad económica.

**No construyas solamente una aplicación que muestre lugares. Construye un sistema de inteligencia de experiencias que aprenda de las opiniones y vivencias reales de sus usuarios.**