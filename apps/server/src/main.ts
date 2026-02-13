import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port);
  console.log(`Nest server is running on http://localhost:${port}`);
}

bootstrap();
