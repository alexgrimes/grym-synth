export interface BaseGraphNode {
  id: string;
  name: string;
  [key: string]: any;
}

export interface BaseGraphLink {
  source: string | BaseGraphNode;
  target: string | BaseGraphNode;  // Changed from BaseGraphLink to BaseGraphNode
  [key: string]: any;
}

export interface GraphData<
  NodeType extends BaseGraphNode = BaseGraphNode,
  LinkType extends BaseGraphLink = BaseGraphLink
> {
  nodes: NodeType[];
  links: LinkType[];
}

export interface CanvasContext extends CanvasRenderingContext2D {
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}