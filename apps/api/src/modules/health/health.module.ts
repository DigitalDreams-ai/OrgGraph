import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { GraphModule } from '../graph/graph.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule, GraphModule, EvidenceModule],
  controllers: [HealthController]
})
export class HealthModule {}

