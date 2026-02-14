import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();

  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port);
  console.log(`Nest server is running on http://localhost:${port}`);
}

bootstrap();
