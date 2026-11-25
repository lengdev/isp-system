import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Prisma } from '@prisma/client';

interface DmmfField {
  name: string;
  kind: 'scalar' | 'object' | 'enum' | 'unsupported';
  isList: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  hasDefaultValue: boolean;
  type: string;
  default?: unknown;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
}

interface DmmfModel {
  name: string;
  dbName: string | null;
  fields: DmmfField[];
  primaryKey: { name: string | null; fields: string[] } | null;
  uniqueFields: string[][];
}

interface DmmfEnum {
  name: string;
  values: { name: string; dbName: string | null }[];
}

interface RelationEdge {
  id: string;
  sourceModel: string;
  sourceField: string;
  targetModel: string;
  targetField: string;
  label: string;
  startArrow: 'ERmandOne' | 'ERzeroToOne' | 'ERoneToMany' | 'ERzeroToMany';
  endArrow: 'ERmandOne' | 'ERzeroToOne' | 'ERoneToMany' | 'ERzeroToMany';
  isSelf: boolean;
  isImplicitM2M: boolean;
}

interface DomainStyle {
  name: string;
  fill: string;
  stroke: string;
  headerFill: string;
  badgeText: string;
}

interface BoxRect {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PositionedNode extends BoxRect {
  model: DmmfModel;
  domain: string;
  rows: ColumnRow[];
}

interface ColumnRow {
  fieldName: string;
  markers: string;
  displayText: string;
  isPk: boolean;
  isFk: boolean;
  isUq: boolean;
}

const DOMAIN_DEFINITIONS: Array<{ style: DomainStyle; models: string[] }> = [
  {
    style: {
      name: 'Identity & Access',
      fill: '#EFF6FF',
      stroke: '#2563EB',
      headerFill: '#DBEAFE',
      badgeText: '#1E3A8A',
    },
    models: [
      'User',
      'Role',
      'Permission',
      'RolePermission',
      'UserRole',
      'UserPermission',
      'Feature',
      'FeaturePermission',
      'Session',
      'AuditLog',
    ],
  },
  {
    style: {
      name: 'CRM & Services',
      fill: '#F0FDF4',
      stroke: '#059669',
      headerFill: '#D1FAE5',
      badgeText: '#064E3B',
    },
    models: [
      'Customer',
      'Address',
      'Attachment',
      'Activity',
      'Package',
      'Subscription',
      'SubscriptionHistory',
    ],
  },
  {
    style: {
      name: 'Network',
      fill: '#ECFEFF',
      stroke: '#0891B2',
      headerFill: '#CFFAFE',
      badgeText: '#164E63',
    },
    models: [
      'Router',
      'RouterMetric',
      'NetworkDevice',
      'PPPoEProfile',
      'PPPoEAccount',
      'PPPoESession',
      'VLAN',
      'IPPool',
      'IPAddress',
      'ProvisionJob',
    ],
  },
  {
    style: {
      name: 'Billing & Payments',
      fill: '#FFFBEB',
      stroke: '#D97706',
      headerFill: '#FEF3C7',
      badgeText: '#78350F',
    },
    models: ['Invoice', 'InvoiceItem', 'Payment', 'PaymentAllocation', 'CreditNote'],
  },
  {
    style: {
      name: 'Inventory & Procurement',
      fill: '#F5F3FF',
      stroke: '#7C3AED',
      headerFill: '#EDE9FE',
      badgeText: '#4C1D95',
    },
    models: [
      'Product',
      'Category',
      'Warehouse',
      'StockBalance',
      'SerialNumber',
      'StockMovement',
      'Supplier',
      'PurchaseOrder',
      'PurchaseOrderItem',
      'GoodsReceivedNote',
      'SupplierInvoice',
    ],
  },
  {
    style: {
      name: 'Accounting',
      fill: '#FFF1F2',
      stroke: '#E11D48',
      headerFill: '#FFE4E6',
      badgeText: '#881337',
    },
    models: [
      'Account',
      'AccountingPeriod',
      'JournalEntry',
      'JournalLine',
      'Expense',
      'FixedAsset',
      'FixedAssetDepreciation',
    ],
  },
  {
    style: {
      name: 'Operations',
      fill: '#FFF7ED',
      stroke: '#EA580C',
      headerFill: '#FFEDD5',
      badgeText: '#7C2D12',
    },
    models: ['Installation', 'Technician', 'SupportTicket', 'TicketComment'],
  },
  {
    style: {
      name: 'Automation & Settings',
      fill: '#F8FAFC',
      stroke: '#475569',
      headerFill: '#E2E8F0',
      badgeText: '#0F172A',
    },
    models: ['Message', 'Notification', 'AutomationRule', 'CompanySetting'],
  },
];

const OTHER_DOMAIN_STYLE: DomainStyle = {
  name: 'Other',
  fill: '#FEFCE8',
  stroke: '#A16207',
  headerFill: '#FEF9C3',
  badgeText: '#713F12',
};

const HEADER_HEIGHT = 32;
const ROW_HEIGHT = 22;
const OVERVIEW_BOX_HEIGHT = 34;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getGitMetadata(): { commitHash: string; commitDate: string } {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const commitDate = execSync('git log -1 --format=%cd --date=short HEAD', { encoding: 'utf8' }).trim();
    return { commitHash: commitHash || 'unknown', commitDate: commitDate || 'unknown' };
  } catch {
    return { commitHash: 'unknown', commitDate: 'unknown' };
  }
}

function formatTableHeader(model: DmmfModel): string {
  if (model.dbName && model.dbName !== model.name) {
    return `${model.dbName} (${model.name})`;
  }
  return model.name;
}

function formatShortDefault(field: DmmfField): string {
  if (!field.hasDefaultValue || field.default === undefined || field.default === null) {
    return '';
  }
  if (typeof field.default === 'object' && !Array.isArray(field.default)) {
    const defObj = field.default as { name?: string; args?: unknown[] };
    const fnName = defObj.name || '';
    if (!fnName) return '';
    if (fnName.startsWith('uuid')) return ' = uuid()';
    if (fnName === 'now') return ' = now()';
    if (fnName === 'autoincrement') return ' = auto()';
    if (fnName === 'cuid') return ' = cuid()';
    const compact = ` = ${fnName}()`;
    return compact.length <= 18 ? compact : '';
  }
  if (typeof field.default === 'string') {
    const val = ` = "${field.default}"`;
    return val.length <= 18 ? val : '';
  }
  if (typeof field.default === 'number' || typeof field.default === 'boolean') {
    const val = ` = ${String(field.default)}`;
    return val.length <= 18 ? val : '';
  }
  return '';
}

function buildModelColumns(model: DmmfModel, fkFields: Set<string>): ColumnRow[] {
  const pkFields = new Set<string>(model.primaryKey?.fields ?? []);
  const singleUniqueFields = new Set<string>();
  for (const uf of model.uniqueFields) {
    if (uf.length === 1) {
      singleUniqueFields.add(uf[0]);
    }
  }

  return model.fields
    .filter((f) => f.kind === 'scalar' || f.kind === 'enum')
    .map((f) => {
      const isPk = f.isId || pkFields.has(f.name);
      const isFk = fkFields.has(f.name);
      const isUq = f.isUnique || singleUniqueFields.has(f.name);
      const tags: string[] = [];
      if (isPk) tags.push('PK');
      if (isFk) tags.push('FK');
      if (isUq && !isPk) tags.push('UQ');

      const markers = tags.join(',');
      const markerCol = markers.padEnd(6, ' ');
      const listSuffix = f.isList ? '[]' : '';
      const nullSuffix = !f.isRequired && !f.isList ? '?' : '';
      const defSuffix = formatShortDefault(f);
      const displayText = `${markerCol} ${f.name} : ${f.type}${listSuffix}${nullSuffix}${defSuffix}`;

      return {
        fieldName: f.name,
        markers,
        displayText,
        isPk,
        isFk,
        isUq,
      };
    });
}

function extractRelations(models: DmmfModel[]): {
  relations: RelationEdge[];
  fkFieldsByModel: Map<string, Set<string>>;
  unrenderable: string[];
} {
  const modelMap = new Map<string, DmmfModel>(models.map((m) => [m.name, m]));
  const fkFieldsByModel = new Map<string, Set<string>>();
  for (const m of models) {
    fkFieldsByModel.set(m.name, new Set<string>());
  }

  const relations: RelationEdge[] = [];
  const unrenderable: string[] = [];
  const seenImplicitM2M = new Set<string>();

  const sortedModels = [...models].sort((a, b) => a.name.localeCompare(b.name));

  for (const model of sortedModels) {
    const sortedFields = [...model.fields].sort((a, b) => a.name.localeCompare(b.name));
    for (const field of sortedFields) {
      if (field.kind !== 'object') continue;
      const targetModel = modelMap.get(field.type);
      if (!targetModel) {
        unrenderable.push(`${model.name}.${field.name} -> missing target model ${field.type}`);
        continue;
      }

      const fromFields = field.relationFromFields ?? [];
      const toFields = field.relationToFields ?? [];

      if (fromFields.length > 0) {
        for (const fkName of fromFields) {
          fkFieldsByModel.get(model.name)!.add(fkName);
        }

        const fkCol = fromFields.join(', ');
        const targetCol = toFields[0] || 'id';

        const inverseField = targetModel.fields.find(
          (tf) =>
            tf.kind === 'object' &&
            tf.relationName === field.relationName &&
            !(tf.relationFromFields && tf.relationFromFields.length > 0 && tf.name === field.name && model.name === targetModel.name)
        );

        const endArrow: RelationEdge['endArrow'] = field.isRequired ? 'ERmandOne' : 'ERzeroToOne';
        let startArrow: RelationEdge['startArrow'] = 'ERzeroToMany';
        if (inverseField && !inverseField.isList) {
          startArrow = inverseField.isRequired ? 'ERmandOne' : 'ERzeroToOne';
        }

        relations.push({
          id: `rel_${model.name}_${fromFields.join('_')}_to_${targetModel.name}_${targetCol}`,
          sourceModel: model.name,
          sourceField: fromFields[0],
          targetModel: targetModel.name,
          targetField: targetCol,
          label: fkCol,
          startArrow,
          endArrow,
          isSelf: model.name === targetModel.name,
          isImplicitM2M: false,
        });
      } else if (field.isList) {
        // Check for implicit M:N where neither side has relationFromFields
        const inverseField = targetModel.fields.find(
          (tf) => tf.kind === 'object' && tf.relationName === field.relationName
        );
        if (
          inverseField &&
          inverseField.isList &&
          (!inverseField.relationFromFields || inverseField.relationFromFields.length === 0)
        ) {
          const pairKey = [
            `${model.name}.${field.name}`,
            `${targetModel.name}.${inverseField.name}`,
          ]
            .sort()
            .join('::');
          if (!seenImplicitM2M.has(pairKey)) {
            seenImplicitM2M.add(pairKey);
            relations.push({
              id: `m2m_${model.name}_${field.name}_${targetModel.name}`,
              sourceModel: model.name,
              sourceField: field.name,
              targetModel: targetModel.name,
              targetField: inverseField.name,
              label: `many-to-many (${field.name} <-> ${inverseField.name})`,
              startArrow: 'ERzeroToMany',
              endArrow: 'ERzeroToMany',
              isSelf: model.name === targetModel.name,
              isImplicitM2M: true,
            });
          }
        }
      }
    }
  }

  return { relations, fkFieldsByModel, unrenderable };
}

function assignDomains(models: DmmfModel[]): {
  domainByModel: Map<string, string>;
  modelsByDomain: Map<string, DmmfModel[]>;
  otherModels: string[];
  styleByDomain: Map<string, DomainStyle>;
} {
  const domainByModel = new Map<string, string>();
  const modelsByDomain = new Map<string, DmmfModel[]>();
  const styleByDomain = new Map<string, DomainStyle>();
  const otherModels: string[] = [];

  for (const def of DOMAIN_DEFINITIONS) {
    modelsByDomain.set(def.style.name, []);
    styleByDomain.set(def.style.name, def.style);
  }
  modelsByDomain.set(OTHER_DOMAIN_STYLE.name, []);
  styleByDomain.set(OTHER_DOMAIN_STYLE.name, OTHER_DOMAIN_STYLE);

  const exactModelDomain = new Map<string, string>();
  for (const def of DOMAIN_DEFINITIONS) {
    for (const mName of def.models) {
      exactModelDomain.set(mName, def.style.name);
    }
  }

  const sortedModels = [...models].sort((a, b) => a.name.localeCompare(b.name));
  for (const model of sortedModels) {
    const domainName = exactModelDomain.get(model.name) ?? OTHER_DOMAIN_STYLE.name;
    if (domainName === OTHER_DOMAIN_STYLE.name) {
      otherModels.push(model.name);
    }
    domainByModel.set(model.name, domainName);
    modelsByDomain.get(domainName)!.push(model);
  }

  return { domainByModel, modelsByDomain, otherModels, styleByDomain };
}

/**
 * Deterministic layered graph layout (topological layering + barycenter ordering)
 * inside a group of nodes. Guarantees zero overlapping bounding boxes.
 */
function layoutLayeredGroup<T extends { name: string; w: number; h: number }>(
  nodes: T[],
  edges: Array<{ from: string; to: string }>,
  options: {
    originX: number;
    originY: number;
    hGap: number;
    vGap: number;
    maxColsPerRow?: number;
  }
): Map<string, { x: number; y: number; w: number; h: number }> {
  const nodeMap = new Map<string, T>(nodes.map((n) => [n.name, n]));
  const nodeNames = nodes.map((n) => n.name).sort((a, b) => a.localeCompare(b));

  // Build parent -> child adjacency (unique, no self-loops)
  const children = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();
  for (const name of nodeNames) {
    children.set(name, new Set());
    parents.set(name, new Set());
  }

  for (const e of edges) {
    if (e.from === e.to) continue;
    if (!nodeMap.has(e.from) || !nodeMap.has(e.to)) continue;
    // Direct edge from referenced parent (to) -> referencing child (from)
    children.get(e.to)!.add(e.from);
    parents.get(e.from)!.add(e.to);
  }

  // Kahn's topological layering with cycle fallback
  const inDegree = new Map<string, number>();
  const layerOf = new Map<string, number>();
  for (const name of nodeNames) {
    inDegree.set(name, parents.get(name)!.size);
    layerOf.set(name, 0);
  }

  const remaining = new Set(nodeNames);
  const topoOrder: string[] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining)
      .filter((n) => (inDegree.get(n) ?? 0) === 0)
      .sort((a, b) => a.localeCompare(b));

    const picked =
      ready.length > 0
        ? ready[0]
        : Array.from(remaining).sort((a, b) => {
            const degDiff = (inDegree.get(a) ?? 0) - (inDegree.get(b) ?? 0);
            return degDiff !== 0 ? degDiff : a.localeCompare(b);
          })[0];

    remaining.delete(picked);
    topoOrder.push(picked);

    for (const ch of children.get(picked)!) {
      if (!remaining.has(ch)) continue;
      inDegree.set(ch, Math.max(0, (inDegree.get(ch) ?? 1) - 1));
      const nextLayer = (layerOf.get(picked) ?? 0) + 1;
      if (nextLayer > (layerOf.get(ch) ?? 0)) {
        layerOf.set(ch, nextLayer);
      }
    }
  }

  // Group nodes by layer
  const rawLayers = new Map<number, string[]>();
  for (const name of topoOrder) {
    const l = layerOf.get(name) ?? 0;
    if (!rawLayers.has(l)) rawLayers.set(l, []);
    rawLayers.get(l)!.push(name);
  }

  // Wrap overly wide layers cleanly if maxColsPerRow is set
  const maxCols = options.maxColsPerRow ?? 4;
  const finalLayers: string[][] = [];
  const sortedLayerIndices = Array.from(rawLayers.keys()).sort((a, b) => a - b);

  for (const idx of sortedLayerIndices) {
    const group = rawLayers.get(idx)!.sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < group.length; i += maxCols) {
      finalLayers.push(group.slice(i, i + maxCols));
    }
  }

  // Barycenter crossing-reduction sweeps (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    for (let li = 1; li < finalLayers.length; li++) {
      const prevLayer = finalLayers[li - 1];
      const prevPos = new Map<string, number>();
      prevLayer.forEach((n, idx) => prevPos.set(n, idx));

      finalLayers[li].sort((a, b) => {
        const pa = Array.from(parents.get(a)!).filter((p) => prevPos.has(p));
        const pb = Array.from(parents.get(b)!).filter((p) => prevPos.has(p));
        const avgA = pa.length > 0 ? pa.reduce((s, p) => s + prevPos.get(p)!, 0) / pa.length : Number.MAX_SAFE_INTEGER;
        const avgB = pb.length > 0 ? pb.reduce((s, p) => s + prevPos.get(p)!, 0) / pb.length : Number.MAX_SAFE_INTEGER;
        if (avgA !== avgB) return avgA - avgB;
        return a.localeCompare(b);
      });
    }
  }

  // Compute exact non-overlapping coordinates centered per row
  const layerWidths = finalLayers.map((layer) =>
    layer.reduce((sum, name, idx) => sum + nodeMap.get(name)!.w + (idx > 0 ? options.hGap : 0), 0)
  );
  const maxLayerWidth = Math.max(0, ...layerWidths);

  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  let curY = options.originY;

  finalLayers.forEach((layer, li) => {
    const rowW = layerWidths[li];
    let curX = options.originX + Math.max(0, Math.round((maxLayerWidth - rowW) / 2));
    let maxRowH = 0;

    for (const name of layer) {
      const node = nodeMap.get(name)!;
      positions.set(name, { x: curX, y: curY, w: node.w, h: node.h });
      curX += node.w + options.hGap;
      if (node.h > maxRowH) maxRowH = node.h;
    }

    curY += maxRowH + options.vGap;
  });

  return positions;
}

function assertNoOverlaps(pageName: string, boxes: BoxRect[]): void {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
      const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
      if (overlapX && overlapY) {
        throw new Error(
          `Overlap detected on "${pageName}" between "${a.label}" (${a.x},${a.y},${a.w}x${a.h}) and "${b.label}" (${b.x},${b.y},${b.w}x${b.h})`
        );
      }
    }
  }
}

function buildOverviewDiagram(
  models: DmmfModel[],
  relations: RelationEdge[],
  domainByModel: Map<string, string>,
  modelsByDomain: Map<string, DmmfModel[]>,
  styleByDomain: Map<string, DomainStyle>
): { xml: string; entityBoxes: BoxRect[]; edgeCount: number } {
  const prefix = 'ov';
  const orderedDomainNames = [
    'Identity & Access',
    'CRM & Services',
    'Network',
    'Operations',
    'Billing & Payments',
    'Accounting',
    'Inventory & Procurement',
    'Automation & Settings',
    'Other',
  ].filter((d) => (modelsByDomain.get(d)?.length ?? 0) > 0);

  // Compute local layout inside each domain container
  interface DomainBlock {
    domain: string;
    style: DomainStyle;
    width: number;
    height: number;
    localPositions: Map<string, { x: number; y: number; w: number; h: number }>;
    models: DmmfModel[];
  }

  const blocks = new Map<string, DomainBlock>();
  const padX = 24;
  const padTop = 48;
  const padBottom = 24;

  for (const domainName of orderedDomainNames) {
    const domModels = modelsByDomain.get(domainName) ?? [];
    const domSet = new Set(domModels.map((m) => m.name));
    const nodes = domModels.map((m) => {
      const header = formatTableHeader(m);
      const w = Math.max(150, Math.min(240, header.length * 8 + 28));
      return { name: m.name, w, h: OVERVIEW_BOX_HEIGHT };
    });

    const intraEdges = relations
      .filter((r) => domSet.has(r.sourceModel) && domSet.has(r.targetModel))
      .map((r) => ({ from: r.sourceModel, to: r.targetModel }));

    const localPositions = layoutLayeredGroup(nodes, intraEdges, {
      originX: padX,
      originY: padTop,
      hGap: 26,
      vGap: 32,
      maxColsPerRow: 3,
    });

    let maxRight = padX + 180;
    let maxBottom = padTop + OVERVIEW_BOX_HEIGHT;
    for (const pos of localPositions.values()) {
      maxRight = Math.max(maxRight, pos.x + pos.w);
      maxBottom = Math.max(maxBottom, pos.y + pos.h);
    }

    blocks.set(domainName, {
      domain: domainName,
      style: styleByDomain.get(domainName)!,
      width: maxRight + padX,
      height: maxBottom + padBottom,
      localPositions,
      models: domModels,
    });
  }

  // Place domain containers on a 3-column grid
  const cols = 3;
  const gridGapX = 56;
  const gridGapY = 56;
  const colWidths = [0, 0, 0];
  const rowHeights: number[] = [];

  orderedDomainNames.forEach((d, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const blk = blocks.get(d)!;
    colWidths[col] = Math.max(colWidths[col], blk.width);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, blk.height);
  });

  const colX = [40, 40 + colWidths[0] + gridGapX, 40 + colWidths[0] + gridGapX + colWidths[1] + gridGapX];
  const rowY: number[] = [];
  let accY = 40;
  for (let r = 0; r < rowHeights.length; r++) {
    rowY.push(accY);
    accY += rowHeights[r] + gridGapY;
  }

  const cells: string[] = [];
  const entityBoxes: BoxRect[] = [];
  const cellIdByModel = new Map<string, string>();
  const globalPosByModel = new Map<string, BoxRect>();

  let maxCanvasW = 1600;
  let maxCanvasH = 1200;

  orderedDomainNames.forEach((domainName, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const blk = blocks.get(domainName)!;
    const containerX = colX[col];
    const containerY = rowY[row];
    const containerId = `${prefix}__dom_${idx}`;

    maxCanvasW = Math.max(maxCanvasW, containerX + blk.width + 60);
    maxCanvasH = Math.max(maxCanvasH, containerY + blk.height + 60);

    const containerStyle = `swimlane;startSize=34;rounded=1;arcSize=6;collapsible=0;fontStyle=1;fontSize=13;align=center;fillColor=${blk.style.fill};strokeColor=${blk.style.stroke};strokeWidth=1.5;fontColor=${blk.style.badgeText};`;
    cells.push(
      `        <mxCell id="${containerId}" value="${escapeXml(domainName)} (${blk.models.length})" style="${containerStyle}" vertex="1" parent="1">\n` +
        `          <mxGeometry x="${containerX}" y="${containerY}" width="${blk.width}" height="${blk.height}" as="geometry" />\n` +
        `        </mxCell>`
    );

    for (const model of blk.models) {
      const pos = blk.localPositions.get(model.name)!;
      const cellId = `${prefix}__tbl_${model.name}`;
      cellIdByModel.set(model.name, cellId);

      const globalBox: BoxRect = {
        id: cellId,
        label: model.name,
        x: containerX + pos.x,
        y: containerY + pos.y,
        w: pos.w,
        h: pos.h,
      };
      entityBoxes.push(globalBox);
      globalPosByModel.set(model.name, globalBox);

      const boxStyle = `rounded=1;whiteSpace=wrap;html=1;arcSize=10;fontStyle=1;fontSize=11;fillColor=${blk.style.headerFill};strokeColor=${blk.style.stroke};fontColor=#0F172A;strokeWidth=1.2;`;
      cells.push(
        `        <mxCell id="${cellId}" value="${escapeXml(formatTableHeader(model))}" style="${boxStyle}" vertex="1" parent="${containerId}">\n` +
          `          <mxGeometry x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" as="geometry" />\n` +
          `        </mxCell>`
      );
    }
  });

  assertNoOverlaps('Overview', entityBoxes);

  // Add all relation edges
  let edgeCount = 0;
  for (const rel of relations) {
    const sourceId = cellIdByModel.get(rel.sourceModel);
    const targetId = cellIdByModel.get(rel.targetModel);
    if (!sourceId || !targetId) continue;

    edgeCount++;
    const edgeId = `${prefix}__edge_${edgeCount}_${rel.sourceModel}_${rel.sourceField}`;
    const isCrossDomain = domainByModel.get(rel.sourceModel) !== domainByModel.get(rel.targetModel);
    const strokeColor = isCrossDomain ? '#64748B' : '#334155';
    const dashed = isCrossDomain ? ';dashed=1;dashPattern=6 3' : '';

    const edgeStyle =
      `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;` +
      `startArrow=${rel.startArrow};startFill=0;endArrow=${rel.endArrow};endFill=0;` +
      `strokeColor=${strokeColor};strokeWidth=1.1${dashed};fontSize=9;fontColor=#334155;labelBackgroundColor=#FFFFFF;`;

    if (rel.isSelf) {
      const box = globalPosByModel.get(rel.sourceModel)!;
      const wpX = box.x + box.w + 24;
      const wpY1 = box.y + 8;
      const wpY2 = box.y + box.h - 8;
      cells.push(
        `        <mxCell id="${edgeId}" value="${escapeXml(rel.label)}" style="${edgeStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">\n` +
          `          <mxGeometry relative="1" as="geometry">\n` +
          `            <Array as="points">\n` +
          `              <mxPoint x="${wpX}" y="${wpY1}" />\n` +
          `              <mxPoint x="${wpX}" y="${wpY2}" />\n` +
          `            </Array>\n` +
          `          </mxGeometry>\n` +
          `        </mxCell>`
      );
    } else {
      cells.push(
        `        <mxCell id="${edgeId}" value="${escapeXml(rel.label)}" style="${edgeStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">\n` +
          `          <mxGeometry relative="1" as="geometry" />\n` +
          `        </mxCell>`
      );
    }
  }

  const diagramXml =
    `  <diagram id="page_overview" name="Overview">\n` +
    `    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${maxCanvasW}" pageHeight="${maxCanvasH}" math="0" shadow="0">\n` +
    `      <root>\n` +
    `        <mxCell id="0" />\n` +
    `        <mxCell id="1" parent="0" />\n` +
    `${cells.join('\n')}\n` +
    `      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>`;

  return { xml: diagramXml, entityBoxes, edgeCount };
}

function buildDomainDiagram(
  domainName: string,
  domainIndex: number,
  domainModels: DmmfModel[],
  allModelsMap: Map<string, DmmfModel>,
  relations: RelationEdge[],
  fkFieldsByModel: Map<string, Set<string>>,
  domainByModel: Map<string, string>,
  style: DomainStyle
): { xml: string; entityBoxes: BoxRect[] } {
  const prefix = `d${domainIndex}`;
  const domSet = new Set(domainModels.map((m) => m.name));

  // Prepare full-column table nodes for this domain
  const preparedNodes = domainModels.map((model) => {
    const rows = buildModelColumns(model, fkFieldsByModel.get(model.name) ?? new Set());
    const headerText = formatTableHeader(model);
    const maxRowLen = rows.reduce((mx, r) => Math.max(mx, r.displayText.length), headerText.length);
    const w = Math.max(260, Math.min(440, Math.ceil(maxRowLen * 6.8) + 28));
    const h = HEADER_HEIGHT + Math.max(1, rows.length) * ROW_HEIGHT;
    return { name: model.name, model, rows, w, h };
  });

  const intraEdges = relations
    .filter((r) => domSet.has(r.sourceModel) && domSet.has(r.targetModel))
    .map((r) => ({ from: r.sourceModel, to: r.targetModel }));

  // Collect cross-domain relations touching this domain
  const incomingParents = new Set<string>(); // external targets referenced by this domain
  const outgoingChildren = new Set<string>(); // external sources referencing this domain
  const crossRelations: RelationEdge[] = [];

  for (const r of relations) {
    const srcIn = domSet.has(r.sourceModel);
    const tgtIn = domSet.has(r.targetModel);
    if (srcIn && !tgtIn) {
      incomingParents.add(r.targetModel);
      crossRelations.push(r);
    } else if (!srcIn && tgtIn) {
      outgoingChildren.add(r.sourceModel);
      crossRelations.push(r);
    }
  }

  // External tables that are only incoming parents sit on the left; children sit on the right
  const leftRefs = Array.from(incomingParents).sort((a, b) => a.localeCompare(b));
  const rightRefs = Array.from(outgoingChildren)
    .filter((m) => !incomingParents.has(m))
    .sort((a, b) => a.localeCompare(b));

  const refBoxWidth = 200;
  const refBoxHeight = 44;
  const refGapY = 24;
  const containerOffsetX = leftRefs.length > 0 ? 40 + refBoxWidth + 90 : 40;
  const containerPadX = 32;
  const containerPadTop = 52;
  const containerPadBottom = 32;

  const localPositions = layoutLayeredGroup(preparedNodes, intraEdges, {
    originX: containerPadX,
    originY: containerPadTop,
    hGap: 64,
    vGap: 56,
    maxColsPerRow: 3,
  });

  let containerW = 480;
  let containerH = 260;
  for (const pos of localPositions.values()) {
    containerW = Math.max(containerW, pos.x + pos.w + containerPadX);
    containerH = Math.max(containerH, pos.y + pos.h + containerPadBottom);
  }

  const cells: string[] = [];
  const entityBoxes: BoxRect[] = [];
  const rowCellByModelField = new Map<string, string>();
  const headerCellByModel = new Map<string, string>();
  const tablePosByModel = new Map<string, BoxRect>();

  // Main domain container
  const containerId = `${prefix}__container`;
  const containerY = 40;
  const containerStyle = `swimlane;startSize=36;rounded=1;arcSize=6;collapsible=0;fontStyle=1;fontSize=14;align=center;fillColor=${style.fill};strokeColor=${style.stroke};strokeWidth=1.5;fontColor=${style.badgeText};`;
  cells.push(
    `        <mxCell id="${containerId}" value="${escapeXml(domainName)} (${domainModels.length} models)" style="${containerStyle}" vertex="1" parent="1">\n` +
      `          <mxGeometry x="${containerOffsetX}" y="${containerY}" width="${containerW}" height="${containerH}" as="geometry" />\n` +
      `        </mxCell>`
  );

  // Render full column tables inside domain container
  for (const node of preparedNodes) {
    const pos = localPositions.get(node.name)!;
    const tableId = `${prefix}__tbl_${node.name}`;
    headerCellByModel.set(node.name, tableId);

    const globalTableBox: BoxRect = {
      id: tableId,
      label: node.name,
      x: containerOffsetX + pos.x,
      y: containerY + pos.y,
      w: pos.w,
      h: pos.h,
    };
    entityBoxes.push(globalTableBox);
    tablePosByModel.set(node.name, globalTableBox);

    const tableStyle = `swimlane;startSize=${HEADER_HEIGHT};rounded=1;arcSize=4;collapsible=0;fontStyle=1;fontSize=12;align=center;fillColor=${style.headerFill};strokeColor=${style.stroke};strokeWidth=1.3;fontColor=#0F172A;`;
    cells.push(
      `        <mxCell id="${tableId}" value="${escapeXml(formatTableHeader(node.model))}" style="${tableStyle}" vertex="1" parent="${containerId}">\n` +
        `          <mxGeometry x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" as="geometry" />\n` +
        `        </mxCell>`
    );

    node.rows.forEach((row, rIdx) => {
      const rowId = `${prefix}__row_${node.name}_${row.fieldName}`;
      rowCellByModelField.set(`${node.name}.${row.fieldName}`, rowId);
      const rowY = HEADER_HEIGHT + rIdx * ROW_HEIGHT;
      const bgColor = row.isPk ? '#FEF9C3' : rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const fontStyle = row.isPk ? '1' : '0';
      const fontColor = row.isFk ? '#1D4ED8' : '#1E293B';
      const rowStyle =
        `text;strokeColor=#E2E8F0;fillColor=${bgColor};align=left;verticalAlign=middle;spacingLeft=8;spacingRight=8;` +
        `overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=11;fontFamily=Courier New;fontStyle=${fontStyle};fontColor=${fontColor};`;

      cells.push(
        `        <mxCell id="${rowId}" value="${escapeXml(row.displayText)}" style="${rowStyle}" vertex="1" parent="${tableId}">\n` +
          `          <mxGeometry y="${rowY}" width="${pos.w}" height="${ROW_HEIGHT}" as="geometry" />\n` +
          `        </mxCell>`
      );
    });
  }

  // Render external reference boxes (left = referenced parents, right = referencing children)
  const refCellByModel = new Map<string, string>();
  const refStyle =
    `rounded=1;whiteSpace=wrap;html=1;dashed=1;dashPattern=5 3;arcSize=12;fontStyle=1;fontSize=11;` +
    `fillColor=#F1F5F9;strokeColor=#64748B;fontColor=#334155;strokeWidth=1.2;`;

  let leftY = containerY + 20;
  for (const extModelName of leftRefs) {
    const extDomain = domainByModel.get(extModelName) ?? 'Other';
    const extModel = allModelsMap.get(extModelName);
    const label = `${extModel ? formatTableHeader(extModel) : extModelName}\n[${extDomain}]`;
    const refId = `${prefix}__ref_${extModelName}`;
    refCellByModel.set(extModelName, refId);
    entityBoxes.push({ id: refId, label: extModelName, x: 40, y: leftY, w: refBoxWidth, h: refBoxHeight });
    cells.push(
      `        <mxCell id="${refId}" value="${escapeXml(label)}" style="${refStyle}" vertex="1" parent="1">\n` +
        `          <mxGeometry x="40" y="${leftY}" width="${refBoxWidth}" height="${refBoxHeight}" as="geometry" />\n` +
        `        </mxCell>`
    );
    leftY += refBoxHeight + refGapY;
  }

  const rightX = containerOffsetX + containerW + 90;
  let rightY = containerY + 20;
  for (const extModelName of rightRefs) {
    const extDomain = domainByModel.get(extModelName) ?? 'Other';
    const extModel = allModelsMap.get(extModelName);
    const label = `${extModel ? formatTableHeader(extModel) : extModelName}\n[${extDomain}]`;
    const refId = `${prefix}__ref_${extModelName}`;
    refCellByModel.set(extModelName, refId);
    entityBoxes.push({ id: refId, label: extModelName, x: rightX, y: rightY, w: refBoxWidth, h: refBoxHeight });
    cells.push(
      `        <mxCell id="${refId}" value="${escapeXml(label)}" style="${refStyle}" vertex="1" parent="1">\n` +
        `          <mxGeometry x="${rightX}" y="${rightY}" width="${refBoxWidth}" height="${refBoxHeight}" as="geometry" />\n` +
        `        </mxCell>`
    );
    rightY += refBoxHeight + refGapY;
  }

  assertNoOverlaps(domainName, entityBoxes);

  // Render intra-domain edges (row-to-row) + cross-domain edges (row-to-reference)
  const domainRelations = relations.filter(
    (r) => domSet.has(r.sourceModel) || domSet.has(r.targetModel)
  );

  let edgeIdx = 0;
  for (const rel of domainRelations) {
    const srcIn = domSet.has(rel.sourceModel);
    const tgtIn = domSet.has(rel.targetModel);

    const sourceId = srcIn
      ? rowCellByModelField.get(`${rel.sourceModel}.${rel.sourceField}`) ?? headerCellByModel.get(rel.sourceModel)
      : refCellByModel.get(rel.sourceModel);

    const targetId = tgtIn
      ? rowCellByModelField.get(`${rel.targetModel}.${rel.targetField}`) ?? headerCellByModel.get(rel.targetModel)
      : refCellByModel.get(rel.targetModel);

    if (!sourceId || !targetId) continue;
    edgeIdx++;

    const edgeId = `${prefix}__edge_${edgeIdx}_${rel.sourceModel}_${rel.sourceField}`;
    const isCross = !srcIn || !tgtIn;
    const strokeColor = isCross ? '#64748B' : '#334155';
    const dashed = isCross ? ';dashed=1;dashPattern=6 3' : '';

    const edgeStyle =
      `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;` +
      `startArrow=${rel.startArrow};startFill=0;endArrow=${rel.endArrow};endFill=0;` +
      `strokeColor=${strokeColor};strokeWidth=1.2${dashed};fontSize=10;fontColor=#1E293B;labelBackgroundColor=#FFFFFF;`;

    if (rel.isSelf) {
      const tbl = tablePosByModel.get(rel.sourceModel)!;
      const wpX = tbl.x + tbl.w + 32;
      const srcRowIdx = preparedNodes
        .find((n) => n.name === rel.sourceModel)!
        .rows.findIndex((r) => r.fieldName === rel.sourceField);
      const tgtRowIdx = preparedNodes
        .find((n) => n.name === rel.targetModel)!
        .rows.findIndex((r) => r.fieldName === rel.targetField);
      const y1 = tbl.y + HEADER_HEIGHT + Math.max(0, srcRowIdx) * ROW_HEIGHT + ROW_HEIGHT / 2;
      const y2 = tbl.y + HEADER_HEIGHT + Math.max(0, tgtRowIdx) * ROW_HEIGHT + ROW_HEIGHT / 2;

      cells.push(
        `        <mxCell id="${edgeId}" value="${escapeXml(rel.label)}" style="${edgeStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">\n` +
          `          <mxGeometry relative="1" as="geometry">\n` +
          `            <Array as="points">\n` +
          `              <mxPoint x="${wpX}" y="${y1}" />\n` +
          `              <mxPoint x="${wpX}" y="${y2}" />\n` +
          `            </Array>\n` +
          `          </mxGeometry>\n` +
          `        </mxCell>`
      );
    } else {
      cells.push(
        `        <mxCell id="${edgeId}" value="${escapeXml(rel.label)}" style="${edgeStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">\n` +
          `          <mxGeometry relative="1" as="geometry" />\n` +
          `        </mxCell>`
      );
    }
  }

  const maxRight = Math.max(
    containerOffsetX + containerW + 60,
    rightRefs.length > 0 ? rightX + refBoxWidth + 60 : 0,
    1200
  );
  const maxBottom = Math.max(containerY + containerH + 60, leftY + 40, rightY + 40, 800);

  const safeId = `page_dom_${domainIndex}`;
  const xml =
    `  <diagram id="${safeId}" name="${escapeXml(domainName)}">\n` +
    `    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${maxRight}" pageHeight="${maxBottom}" math="0" shadow="0">\n` +
    `      <root>\n` +
    `        <mxCell id="0" />\n` +
    `        <mxCell id="1" parent="0" />\n` +
    `${cells.join('\n')}\n` +
    `      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>`;

  return { xml, entityBoxes };
}

function buildLegendDiagram(
  models: DmmfModel[],
  relations: RelationEdge[],
  enums: DmmfEnum[],
  modelsByDomain: Map<string, DmmfModel[]>,
  styleByDomain: Map<string, DomainStyle>,
  otherModels: string[],
  gitMeta: { commitHash: string; commitDate: string }
): string {
  const cells: string[] = [];
  const boxes: BoxRect[] = [];

  // 1. Metadata & Summary Box
  const metaText =
    `NSMISP Database ERD\n` +
    `Commit: ${gitMeta.commitHash}\n` +
    `Commit Date: ${gitMeta.commitDate}\n` +
    `Models: ${models.length}  |  Foreign Keys: ${relations.length}  |  Enums: ${enums.length}\n` +
    `Models in "Other" (${otherModels.length}): ${otherModels.join(', ') || 'None'}`;
  boxes.push({ id: 'leg__meta', label: 'Metadata', x: 40, y: 40, w: 620, h: 110 });
  cells.push(
    `        <mxCell id="leg__meta" value="${escapeXml(metaText)}" style="rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=middle;spacingLeft=16;spacingRight=16;fillColor=#F8FAFC;strokeColor=#334155;strokeWidth=1.5;fontColor=#0F172A;fontSize=12;fontStyle=1;" vertex="1" parent="1">\n` +
      `          <mxGeometry x="40" y="40" width="620" height="110" as="geometry" />\n` +
      `        </mxCell>`
  );

  // 2. Column Markers Notation Box
  const markersText =
    `Column Markers & Syntax\n` +
    `──────────────────────────────\n` +
    `PK        Primary Key\n` +
    `FK        Foreign Key\n` +
    `UQ        Unique Constraint\n` +
    `Type?     Nullable field\n` +
    `Type[]    List / array field\n` +
    `= val     Short default value\n\n` +
    `Dashed Box   Cross-domain reference table`;
  boxes.push({ id: 'leg__markers', label: 'Column Markers', x: 40, y: 180, w: 300, h: 210 });
  cells.push(
    `        <mxCell id="leg__markers" value="${escapeXml(markersText)}" style="rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingTop=12;spacingLeft=14;spacingRight=14;fillColor=#FFFFFF;strokeColor=#94A3B8;strokeWidth=1.2;fontColor=#1E293B;fontFamily=Courier New;fontSize=11;" vertex="1" parent="1">\n` +
      `          <mxGeometry x="40" y="180" width="300" height="210" as="geometry" />\n` +
      `        </mxCell>`
  );

  // 3. Crow's Foot ER Notation Box with live arrow samples
  boxes.push({ id: 'leg__er_container', label: 'ER Notation', x: 370, y: 180, w: 290, h: 210 });
  cells.push(
    `        <mxCell id="leg__er_container" value="Crow's Foot ER Notation" style="swimlane;startSize=30;rounded=1;arcSize=6;collapsible=0;fontStyle=1;fontSize=12;fillColor=#F8FAFC;strokeColor=#94A3B8;fontColor=#0F172A;" vertex="1" parent="1">\n` +
      `          <mxGeometry x="370" y="180" width="290" height="210" as="geometry" />\n` +
      `        </mxCell>`
  );

  const arrowSamples: Array<{
    key: string;
    label: string;
    startArrow: string;
    endArrow: string;
    yOffset: number;
  }> = [
    { key: 'mand_one', label: 'Mandatory 1 (ERmandOne)', startArrow: 'none', endArrow: 'ERmandOne', yOffset: 44 },
    { key: 'zero_one', label: 'Optional 0..1 (ERzeroToOne)', startArrow: 'none', endArrow: 'ERzeroToOne', yOffset: 84 },
    { key: 'one_many', label: 'Mandatory 1..N (ERoneToMany)', startArrow: 'none', endArrow: 'ERoneToMany', yOffset: 124 },
    { key: 'zero_many', label: 'Optional 0..N (ERzeroToMany)', startArrow: 'none', endArrow: 'ERzeroToMany', yOffset: 164 },
  ];

  for (const s of arrowSamples) {
    const aId = `leg__a_${s.key}`;
    const bId = `leg__b_${s.key}`;
    const eId = `leg__e_${s.key}`;
    cells.push(
      `        <mxCell id="${aId}" value="" style="ellipse;fillColor=#FFFFFF;strokeColor=#FFFFFF;" vertex="1" parent="leg__er_container">\n` +
        `          <mxGeometry x="14" y="${s.yOffset}" width="8" height="8" as="geometry" />\n` +
        `        </mxCell>`
    );
    cells.push(
      `        <mxCell id="${bId}" value="${escapeXml(s.label)}" style="text;align=left;verticalAlign=middle;fontSize=11;fontColor=#1E293B;strokeColor=none;fillColor=none;" vertex="1" parent="leg__er_container">\n` +
        `          <mxGeometry x="84" y="${s.yOffset - 8}" width="196" height="24" as="geometry" />\n` +
        `        </mxCell>`
    );
    cells.push(
      `        <mxCell id="${eId}" value="" style="endArrow=${s.endArrow};startArrow=${s.startArrow};startFill=0;endFill=0;strokeColor=#1E293B;strokeWidth=1.4;" edge="1" parent="leg__er_container" source="${aId}" target="${bId}">\n` +
        `          <mxGeometry relative="1" as="geometry" />\n` +
        `        </mxCell>`
    );
  }

  // 4. Domain Palette Swatches
  const domainNames = [
    'Identity & Access',
    'CRM & Services',
    'Network',
    'Billing & Payments',
    'Inventory & Procurement',
    'Accounting',
    'Operations',
    'Automation & Settings',
    'Other',
  ];

  boxes.push({ id: 'leg__domains', label: 'Domain Colors', x: 40, y: 420, w: 620, h: 210 });
  cells.push(
    `        <mxCell id="leg__domains" value="Domain Color Palette" style="swimlane;startSize=30;rounded=1;arcSize=6;collapsible=0;fontStyle=1;fontSize=12;fillColor=#F8FAFC;strokeColor=#94A3B8;fontColor=#0F172A;" vertex="1" parent="1">\n` +
      `          <mxGeometry x="40" y="420" width="620" height="210" as="geometry" />\n` +
      `        </mxCell>`
  );

  domainNames.forEach((dName, idx) => {
    const style = styleByDomain.get(dName)!;
    const count = modelsByDomain.get(dName)?.length ?? 0;
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const sx = 16 + col * 198;
    const sy = 44 + row * 50;
    const swId = `leg__dom_${idx}`;
    cells.push(
      `        <mxCell id="${swId}" value="${escapeXml(dName)} (${count})" style="rounded=1;whiteSpace=wrap;html=1;arcSize=12;fontStyle=1;fontSize=11;fillColor=${style.fill};strokeColor=${style.stroke};strokeWidth=1.5;fontColor=${style.badgeText};" vertex="1" parent="leg__domains">\n` +
        `          <mxGeometry x="${sx}" y="${sy}" width="184" height="36" as="geometry" />\n` +
        `        </mxCell>`
    );
  });

  // 5. Enums Reference Box
  const sortedEnums = [...enums].sort((a, b) => a.name.localeCompare(b.name));
  const enumLines = sortedEnums.map(
    (e) => `${e.name}: ${e.values.map((v) => v.name).join(' | ')}`
  );
  const enumRowH = 22;
  const enumHeaderH = 32;
  const enumBoxW = 720;
  const enumBoxH = enumHeaderH + Math.max(1, enumLines.length) * enumRowH;
  boxes.push({ id: 'leg__enums', label: 'Enums', x: 700, y: 40, w: enumBoxW, h: enumBoxH });
  cells.push(
    `        <mxCell id="leg__enums" value="Prisma Enums (${enums.length})" style="swimlane;startSize=${enumHeaderH};rounded=1;arcSize=4;collapsible=0;fontStyle=1;fontSize=12;fillColor=#F1F5F9;strokeColor=#475569;strokeWidth=1.4;fontColor=#0F172A;" vertex="1" parent="1">\n` +
      `          <mxGeometry x="700" y="40" width="${enumBoxW}" height="${enumBoxH}" as="geometry" />\n` +
      `        </mxCell>`
  );

  enumLines.forEach((line, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    cells.push(
      `        <mxCell id="leg__enum_${idx}" value="${escapeXml(line)}" style="text;strokeColor=#E2E8F0;fillColor=${bg};align=left;verticalAlign=middle;spacingLeft=8;spacingRight=8;overflow=hidden;fontSize=10;fontFamily=Courier New;fontColor=#1E293B;" vertex="1" parent="leg__enums">\n` +
        `          <mxGeometry y="${enumHeaderH + idx * enumRowH}" width="${enumBoxW}" height="${enumRowH}" as="geometry" />\n` +
        `        </mxCell>`
    );
  });

  assertNoOverlaps('Legend', boxes);

  return (
    `  <diagram id="page_legend" name="Legend">\n` +
    `    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1480" pageHeight="${Math.max(700, 40 + enumBoxH + 40)}" math="0" shadow="0">\n` +
    `      <root>\n` +
    `        <mxCell id="0" />\n` +
    `        <mxCell id="1" parent="0" />\n` +
    `${cells.join('\n')}\n` +
    `      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>`
  );
}

function main(): void {
  const datamodel = Prisma.dmmf.datamodel as unknown as {
    models: DmmfModel[];
    enums: DmmfEnum[];
  };

  const models = [...datamodel.models].sort((a, b) => a.name.localeCompare(b.name));
  const enums = [...datamodel.enums].sort((a, b) => a.name.localeCompare(b.name));
  const allModelsMap = new Map<string, DmmfModel>(models.map((m) => [m.name, m]));

  const { relations, fkFieldsByModel, unrenderable } = extractRelations(models);
  const { domainByModel, modelsByDomain, otherModels, styleByDomain } = assignDomains(models);
  const gitMeta = getGitMetadata();

  const overview = buildOverviewDiagram(
    models,
    relations,
    domainByModel,
    modelsByDomain,
    styleByDomain
  );

  const orderedDomainPages = [
    ...DOMAIN_DEFINITIONS.map((d) => d.style.name),
    OTHER_DOMAIN_STYLE.name,
  ].filter((name) => (modelsByDomain.get(name)?.length ?? 0) > 0);

  const domainDiagrams = orderedDomainPages.map((domainName, idx) =>
    buildDomainDiagram(
      domainName,
      idx + 1,
      modelsByDomain.get(domainName)!,
      allModelsMap,
      relations,
      fkFieldsByModel,
      domainByModel,
      styleByDomain.get(domainName)!
    )
  );

  const legendXml = buildLegendDiagram(
    models,
    relations,
    enums,
    modelsByDomain,
    styleByDomain,
    otherModels,
    gitMeta
  );

  const mxfileXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<mxfile host="app.diagrams.net" agent="nsmisp-erd-generator" version="24.7.17" pages="${
      2 + domainDiagrams.length
    }">\n` +
    `${overview.xml}\n` +
    `${domainDiagrams.map((d) => d.xml).join('\n')}\n` +
    `${legendXml}\n` +
    `</mxfile>\n`;

  const outPath = path.resolve(process.cwd(), 'docs/erd/nsmisp-erd.drawio');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, mxfileXml, 'utf8');

  console.log(`Generated ${path.relative(process.cwd(), outPath)}`);
  console.log(`Models (entities): ${models.length}`);
  console.log(`Foreign key edges: ${relations.length}`);
  console.log(`Enums: ${enums.length}`);
  console.log(`Pages: Overview, ${orderedDomainPages.join(', ')}, Legend`);
  console.log(`Models in "Other" (${otherModels.length}): ${otherModels.join(', ') || 'None'}`);
  if (unrenderable.length > 0) {
    console.log(`Unrenderable relations (${unrenderable.length}): ${unrenderable.join('; ')}`);
  } else {
    console.log('Unrenderable relations: 0');
  }
}

main();
