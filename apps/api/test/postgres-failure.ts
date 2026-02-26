import assert from 'node:assert/strict';
import { AppConfigService } from '../src/config/app-config.service';
import { GraphService } from '../src/modules/graph/graph.service';

async function run(): Promise<void> {
  process.env.GRAPH_BACKEND = 'postgres';
  process.env.DATABASE_URL = 'postgres://orgumented:orgumented@127.0.0.1:1/orgumented';

  const config = new AppConfigService();
  const graph = new GraphService(config);

  let failed = false;
  try {
    await graph.getCounts();
  } catch {
    failed = true;
  } finally {
    await graph.onModuleDestroy();
  }

  assert.equal(failed, true, 'postgres backend should surface db connection failure');
  console.log('postgres failure-path test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

