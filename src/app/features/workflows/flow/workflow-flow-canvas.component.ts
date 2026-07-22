import {
  Component,
  input,
  output,
  viewChild,
  afterNextRender,
  Injector,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  EFConnectionBehavior,
  EFConnectionConnectableSide,
  EFConnectionType,
  EFMarkerType,
  FCanvasComponent,
  FCreateConnectionEvent,
  FFlowModule,
  FMoveNodesEvent,
  FSelectionChangeEvent,
} from '@foblex/flow';
import {
  STEP_TYPE_META,
  layoutNodesInOrder,
  stepSummary,
  stepTypeMeta,
  connectorInId,
  connectorOutId,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowLayoutDirection,
} from '../workflow-meta';
import { WorkflowStepType } from '../../../core/models/workflows.models';

@Component({
  selector: 'app-workflow-flow-canvas',
  standalone: true,
  imports: [FFlowModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './workflow-flow-canvas.component.html',
  styleUrl: './workflow-flow-canvas.component.scss',
})
export class WorkflowFlowCanvasComponent {
  private readonly injector = inject(Injector);
  private readonly positionOverlay = signal<Map<string, { x: number; y: number }>>(new Map());
  private lastStructureKey = '';

  readonly nodes = input.required<WorkflowFlowNode[]>();
  readonly edges = input.required<WorkflowFlowEdge[]>();
  readonly selectedId = input<string | null>(null);
  readonly editable = input(true);
  readonly compact = input(false);
  readonly layoutDirection = input<WorkflowLayoutDirection>('horizontal');

  readonly nodeSelect = output<string>();
  readonly positionsChange = output<Array<{ id: string; position: { x: number; y: number } }>>();
  readonly connectNodes = output<{ sourceNodeId: string; targetNodeId: string }>();
  readonly insertBetween = output<{ afterNodeId: string; type: WorkflowStepType }>();

  readonly stepTypes = STEP_TYPE_META;
  readonly pendingInsertAfter = signal<string | null>(null);
  /** Edge whose mid-line “+” is visible (only after clicking the connection). */
  readonly selectedEdgeId = signal<string | null>(null);

  readonly canvas = viewChild(FCanvasComponent);
  /** Bumps to remount <f-flow> so connections rebuild with new node positions. */
  readonly flowEpoch = signal(0);

  readonly connectionType = EFConnectionType.SEGMENT;
  readonly connectionBehavior = EFConnectionBehavior.FIXED;
  readonly sourceSide = EFConnectionConnectableSide.RIGHT;
  readonly targetSide = EFConnectionConnectableSide.LEFT;
  readonly markerEnd = EFMarkerType.END;
  readonly markerSelectedEnd = EFMarkerType.SELECTED_END;
  readonly connectorInId = connectorInId;
  readonly connectorOutId = connectorOutId;

  readonly viewNodes = computed(() => {
    const overlay = this.positionOverlay();
    return this.nodes().map((node) => {
      const position = overlay.get(node.id);
      return position ? { ...node, position } : node;
    });
  });

  /** Reverse map connector id → node id (encoding is one-way via flowSafeId). */
  private readonly connectorNodeMap = computed(() => {
    const map = new Map<string, string>();
    for (const node of this.nodes()) {
      map.set(connectorOutId(node.id), node.id);
      map.set(connectorInId(node.id), node.id);
    }
    return map;
  });

  constructor() {
    effect(() => {
      const structureKey = this.nodes()
        .map((n) => n.id)
        .join('|');
      if (structureKey !== this.lastStructureKey) {
        this.lastStructureKey = structureKey;
        this.positionOverlay.set(new Map());
        this.selectedEdgeId.set(null);
        this.flowEpoch.update((n) => n + 1);
      }
    });

    afterNextRender(() => {
      queueMicrotask(() => this.fit());
    }, { injector: this.injector });
  }

  fit(): void {
    this.canvas()?.fitToScreen({ x: 64, y: 64 }, true);
  }

  organize(): void {
    const laid = layoutNodesInOrder(this.nodes(), this.layoutDirection());
    this.positionOverlay.set(new Map(laid.map((item) => [item.id, item.position])));
    this.positionsChange.emit(laid);
    this.selectedEdgeId.set(null);
    // Remount flow: programmatic position updates don't always rewire edges.
    this.flowEpoch.update((n) => n + 1);
    queueMicrotask(() => {
      requestAnimationFrame(() => this.fit());
    });
  }

  onNodesRendered(): void {
    this.fit();
  }

  selectNode(id: string, event: Event): void {
    event.stopPropagation();
    this.selectedEdgeId.set(null);
    this.nodeSelect.emit(id);
  }

  onSelectionChange(event: FSelectionChangeEvent): void {
    if (!this.editable()) {
      this.selectedEdgeId.set(null);
      return;
    }
    const edgeId = event.connectionIds[0] ?? null;
    this.selectedEdgeId.set(edgeId);
  }

  onMoveNodes(event: FMoveNodesEvent): void {
    if (!this.editable()) return;
    const moved = event.nodes.map((n) => ({
      id: n.id,
      position: { x: n.position.x, y: n.position.y },
    }));
    if (!moved.length) return;

    this.positionOverlay.update((map) => {
      const next = new Map(map);
      for (const item of moved) next.set(item.id, item.position);
      return next;
    });
    this.positionsChange.emit(moved);
  }

  onCreateConnection(event: FCreateConnectionEvent): void {
    if (!this.editable()) return;
    const sourceId = event.sourceId;
    const targetId = event.targetId;
    if (!sourceId || !targetId) return;

    const sourceNodeId = this.connectorNodeMap().get(sourceId);
    const targetNodeId = this.connectorNodeMap().get(targetId);
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return;
    if (targetNodeId === 'trigger') return;

    this.connectNodes.emit({ sourceNodeId, targetNodeId });
    this.flowEpoch.update((n) => n + 1);
    queueMicrotask(() => {
      requestAnimationFrame(() => this.fit());
    });
  }

  confirmInsertBetween(type: WorkflowStepType, event: Event): void {
    event.stopPropagation();
    const afterNodeId = this.pendingInsertAfter();
    if (!afterNodeId || !this.editable()) return;
    this.insertBetween.emit({ afterNodeId, type });
    this.pendingInsertAfter.set(null);
    this.selectedEdgeId.set(null);
  }

  metaFor(node: WorkflowFlowNode) {
    if (node.kind === 'trigger') {
      return {
        label: 'Gatilho',
        icon: 'bolt',
        accent: '#6b2030',
        subtitle: node.trigger?.type ?? '—',
      };
    }
    const meta = stepTypeMeta(node.step?.type ?? '');
    return {
      label: meta.label,
      icon: meta.icon,
      accent: meta.accent,
      subtitle: node.step ? stepSummary(node.step) : '',
    };
  }
}
