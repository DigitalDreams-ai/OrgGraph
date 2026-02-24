import { Controller, Get, Module } from '@nestjs/common';

@Controller()
class HealthController {
  @Get('/health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({
  controllers: [HealthController]
})
export class AppModule {}
