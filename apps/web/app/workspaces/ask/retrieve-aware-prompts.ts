'use client';

import type { MetadataSelection } from '../browser/types';

export interface RetrieveAwarePromptGroups {
  groundedPrompts: string[];
  followUpPrompts: string[];
}

type ComponentPromptFamily = {
  type: string;
  prefix: string;
  limit: number;
};

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

const COMPONENT_USAGE_PROMPT_FAMILIES: ComponentPromptFamily[] = [
  { type: 'Flow', prefix: 'Flow', limit: 3 },
  { type: 'Layout', prefix: 'Layout', limit: 3 },
  { type: 'ApexClass', prefix: 'Apex Class', limit: 3 },
  { type: 'ApexTrigger', prefix: 'Apex Trigger', limit: 3 },
  { type: 'CustomObject', prefix: 'Custom Object', limit: 3 },
  { type: 'CustomField', prefix: 'Custom Field', limit: 4 },
  { type: 'EmailTemplate', prefix: 'Email Template', limit: 3 },
  { type: 'CustomTab', prefix: 'Custom Tab', limit: 3 },
  { type: 'ConnectedApp', prefix: 'Connected App', limit: 3 },
  { type: 'PermissionSetGroup', prefix: 'Permission Set Group', limit: 3 },
  { type: 'CustomPermission', prefix: 'Custom Permission', limit: 3 }
];

export function buildRetrieveAwarePromptGroups(
  latestRetrieveSelections: MetadataSelection[]
): RetrieveAwarePromptGroups {
  const flowMembers = collectMembers(latestRetrieveSelections, 'Flow').slice(0, 3);
  const objectMembers = collectMembers(latestRetrieveSelections, 'CustomObject').slice(0, 3);
  const fieldMembers = collectMembers(latestRetrieveSelections, 'CustomField').slice(0, 4);
  const componentUsagePrompts = COMPONENT_USAGE_PROMPT_FAMILIES.flatMap((family) =>
    collectMembers(latestRetrieveSelections, family.type)
      .slice(0, family.limit)
      .map(
        (memberName) =>
          `Based only on the latest retrieve, where is ${family.prefix} ${memberName} used?`
      )
  );

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
    ),
    ...componentUsagePrompts
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
