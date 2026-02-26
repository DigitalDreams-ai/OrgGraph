import { Module } from '@nestjs/common';
import { EvidenceModule } from '../evidence/evidence.module';
import { GraphModule } from '../graph/graph.module';
import { ApexClassParserService } from './apex-class-parser.service';
import { ApexTriggerParserService } from './apex-trigger-parser.service';
import { ConnectedAppParserService } from './connected-app-parser.service';
import { CustomObjectParserService } from './custom-object-parser.service';
import { CustomPermissionParserService } from './custom-permission-parser.service';
import { FlowParserService } from './flow-parser.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { OntologyConstraintsService } from './ontology-constraints.service';
import { PermissionSetGroupParserService } from './permission-set-group-parser.service';
import { PermissionsParserService } from './permissions-parser.service';
import { SemanticDriftPolicyService } from './semantic-drift-policy.service';
import { StagedUiMetadataParserService } from './staged-ui-metadata-parser.service';

@Module({
  imports: [GraphModule, EvidenceModule],
  providers: [
    IngestionService,
    PermissionsParserService,
    ApexTriggerParserService,
    ApexClassParserService,
    FlowParserService,
    CustomObjectParserService,
    PermissionSetGroupParserService,
    CustomPermissionParserService,
    ConnectedAppParserService,
    StagedUiMetadataParserService,
    OntologyConstraintsService,
    SemanticDriftPolicyService
  ],
  controllers: [IngestionController],
  exports: [
    IngestionService,
    PermissionsParserService,
    ApexTriggerParserService,
    ApexClassParserService,
    FlowParserService,
    CustomObjectParserService,
    PermissionSetGroupParserService,
    CustomPermissionParserService,
    ConnectedAppParserService,
    StagedUiMetadataParserService,
    OntologyConstraintsService,
    SemanticDriftPolicyService
  ]
})
export class IngestionModule {}
