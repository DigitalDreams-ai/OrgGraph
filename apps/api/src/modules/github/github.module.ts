import { Module } from '@nestjs/common';
import { AskModule } from '../ask/ask.module';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  imports: [AskModule],
  providers: [GithubService],
  controllers: [GithubController]
})
export class GithubModule {}
