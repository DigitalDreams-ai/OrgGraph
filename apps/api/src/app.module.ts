import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { GraphModule } from './graph/graph.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { QueriesModule } from './queries/queries.module';

@Controller()
class HealthController {
  @Get('/health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({
  imports: [ConfigModule, GraphModule, IngestionModule, QueriesModule],
  controllers: [HealthController]
})
export class AppModule {}
