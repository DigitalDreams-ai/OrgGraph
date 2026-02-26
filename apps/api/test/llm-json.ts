import assert from 'node:assert/strict';
import { extractJsonObject, parseLlmJsonResponse } from '../src/modules/llm/llm-json';

function run(): void {
  const fenced = '```json\n{"answer":"A","reasoning_summary":"B","citations_used":["ev_1"]}\n```';
  const extracted = extractJsonObject(fenced);
  assert.match(extracted, /"answer"/);

  const parsed = parseLlmJsonResponse(
    '{"answer":"Result","reasoning_summary":"Grounded","citations_used":["ev_1","ev_1","ev_2"]}',
    'openai',
    'gpt-test'
  );
  assert.equal(parsed.answer, 'Result');
  assert.equal(parsed.reasoningSummary, 'Grounded');
  assert.deepEqual(parsed.citationsUsed, ['ev_1', 'ev_2']);

  const numericCitations = parseLlmJsonResponse(
    '{"answer":"Result","reasoning_summary":"Grounded","citations_used":[1,"[2]"]}',
    'anthropic',
    'claude-test'
  );
  assert.deepEqual(numericCitations.citationsUsed, ['1', '[2]']);

  let missingAnswer: unknown;
  try {
    parseLlmJsonResponse('{"reasoning_summary":"x","citations_used":[]}', 'anthropic', 'claude-test');
  } catch (error) {
    missingAnswer = error;
  }
  assert.ok(missingAnswer instanceof Error);

  let invalidJson: unknown;
  try {
    parseLlmJsonResponse('not-json', 'openai', 'gpt-test');
  } catch (error) {
    invalidJson = error;
  }
  assert.ok(invalidJson instanceof Error);

  console.log('llm json test passed');
}

run();
