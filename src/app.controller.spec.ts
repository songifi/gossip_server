import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsService } from './analytics/analytics.service'; // Adjust the path if necessary

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    // Create a mock for AnalyticsService
    const analyticsServiceMock = {
      // Add mock implementations for methods used by AppController
      trackEvent: jest.fn(),        // Example method, adjust as needed
      recordMessageSent: jest.fn(), // Example method, adjust as needed
    };

    // Set up the testing module with all required dependencies
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: AnalyticsService, useValue: analyticsServiceMock }, // Provide the mock
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});