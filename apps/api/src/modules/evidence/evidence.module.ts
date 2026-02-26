import { Module } from '@nestjs/common';
import { EvidenceStoreService } from './evidence-store.service';

@Module({
  providers: [EvidenceStoreService],
  exports: [EvidenceStoreService]
})
export class EvidenceModule {}
