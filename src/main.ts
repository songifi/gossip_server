// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Global request size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Example: Increase limit for upload routes
  app.use('/upload', express.json({ limit: '50mb' }));
  app.use('/upload', express.urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(3000);
}
bootstrap();

// Example usage on routes (e.g., auth.controller.ts)
// import { Controller, Post } from '@nestjs/common';
// import { Throttle } from '@nestjs/throttler';
//
// @Controller('auth')
// export class AuthController {
//   @Post('login')
//   @Throttle(5, 60) // 5 requests per minute
//   login() {
//     return { message: 'Login endpoint with rate limiting' };
//   }
// }

// @Controller('messages')
// export class MessageController {
//   @Post('send')
//   @Throttle(60, 60)
//   sendMessage() {
//     return { message: 'Message sent' };
//   }
// }