import { Module } from '@nestjs/common';
import { AskModule } from '../ask/ask.module';
import { OrgModule } from '../org/org.module';
import { GithubController } from './github.controller';
import { GithubToolAdapterService } from './github-tool-adapter.service';
import { GithubService } from './github.service';

@Module({
  imports: [AskModule, OrgModule],
  providers: [GithubService, GithubToolAdapterService],
  controllers: [GithubController]
})
export class GithubModule {}
