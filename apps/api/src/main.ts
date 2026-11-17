import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const prefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(prefix);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin encabezado Origin (apps móviles nativas como iOS y Android)
      // y peticiones desde la red local o web
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Exploro API')
    .setDescription(
      'API modular de descubrimiento local y planificación de viajes basada en evidencias verificables (Estados Unidos — Costo Cero).'
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(
    `[Exploro API] Operativa en http://localhost:${port}/${prefix} | Swagger: http://localhost:${port}/api/docs`
  );
}

if (require.main === module) {
  void bootstrap();
}

