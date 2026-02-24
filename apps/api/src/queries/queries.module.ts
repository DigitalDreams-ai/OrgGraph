import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { QueriesController } from './queries.controller';
import { QueriesService } from './queries.service';

@Module({
  imports: [GraphModule],
  providers: [QueriesService],
  controllers: [QueriesController]
})
export class QueriesModule {}
