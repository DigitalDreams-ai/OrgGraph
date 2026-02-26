import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaContextService } from './meta-context.service';

@Module({
  controllers: [MetaController],
  providers: [MetaContextService],
  exports: [MetaContextService]
})
export class MetaModule {}
