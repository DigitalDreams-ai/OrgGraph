'use client';

import type { MetadataSelection } from '../browser/types';

export interface RetrieveAwarePromptGroups {
  groundedPrompts: string[];
  followUpPrompts: string[];
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  ).sort((left, right) => left.localeCompare(right));
}

function collectMembers(selections: MetadataSelection[], type: string): string[] {
  return uniqueSorted(
    selections
      .filter((selection) => selection.type === type && Array.isArray(selection.members))
      .flatMap((selection) => selection.members ?? [])
  );
}

export function buildRetrieveAwarePromptGroups(
  latestRetrieveSelections: MetadataSelection[]
): RetrieveAwarePromptGroups {
  const flowMembers = collectMembers(latestRetrieveSelections, 'Flow').slice(0, 3);
  const objectMembers = collectMembers(latestRetrieveSelections, 'CustomObject').slice(0, 3);
  const fieldMembers = collectMembers(latestRetrieveSelections, 'CustomField').slice(0, 4);

  const groundedPrompts = uniqueSorted([
    ...flowMembers.map(
      (flowName) => `Based only on the latest retrieve, explain what Flow ${flowName} reads and writes.`
    ),
    ...fieldMembers.flatMap((fieldName) => [
      `Based only on the latest retrieve, what touches ${fieldName}?`,
      `Based only on the latest retrieve, what automations update ${fieldName}?`
    ]),
    ...objectMembers.map(
      (objectName) => `Based only on the latest retrieve, what runs on object ${objectName}?`
    )
  ]);

  const followUpPrompts = [
    ...fieldMembers.map((fieldName) => `Who can edit ${fieldName}?`),
    ...objectMembers.flatMap((objectName) => [
      `Who can edit object ${objectName}?`
    ])
  ];

  return {
    groundedPrompts: uniqueSorted(groundedPrompts),
    followUpPrompts: uniqueSorted(followUpPrompts).slice(0, 12)
  };
}
