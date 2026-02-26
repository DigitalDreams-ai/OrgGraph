import type { NodeType, RelType } from '@orgumented/ontology';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  meta?: string;
}

export interface GraphEdge {
  id: string;
  srcId: string;
  dstId: string;
  rel: RelType;
  meta?: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PermPathStep {
  from: string;
  rel: RelType;
  to: string;
}

export interface PermPath {
  principal: string;
  object: string;
  path: PermPathStep[];
}

export interface AutomationHit {
  type: string;
  name: string;
  rel: string;
  target: string;
  meta?: string;
}

export interface ImpactHit {
  type: string;
  name: string;
  rel: string;
  target: string;
  meta?: string;
}
