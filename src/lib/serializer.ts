// src/lib/serializer.ts
// Note: SceneNode, TextNode, etc. are global types provided by @figma/plugin-typings
import { NodeExport, FillExport } from './types';

export interface SerializeOptions {
  includeHidden: boolean;
  embedImages: boolean;
}

export interface SvgMapEntry {
  fileName: string;
}

function paintToFillExport(p: any, imageMap?: Map<string, string>): FillExport | any {
  if (!p) return null;
  if (p.type === 'SOLID') {
    return {
      type: 'SOLID',
      color: {
        r: p.color.r,
        g: p.color.g,
        b: p.color.b,
        a: p.opacity !== undefined ? p.opacity : 1
      }
    } as FillExport;
  }
  if (p.type === 'IMAGE') {
    const mapped = imageMap?.get(p.imageHash);
    return {
      type: 'IMAGE',
      imageHash: p.imageHash,
      file: mapped ?? undefined,
      scaleMode: p.scaleMode
    } as FillExport;
  }
  if (
    p.type === 'GRADIENT_LINEAR' ||
    p.type === 'GRADIENT_RADIAL' ||
    p.type === 'GRADIENT_ANGULAR' ||
    p.type === 'GRADIENT_DIAMOND'
  ) {
    return {
      type: 'GRADIENT',
      gradient: {
        type: p.type,
        gradientStops: p.gradientStops,
        gradientTransform: p.gradientTransform
      }
    } as FillExport;
  }
  return { type: p.type, raw: p };
}

function fillsKey(fills: FillExport[]): string {
  return JSON.stringify(fills);
}

export function serializeNode(
  node: SceneNode,
  options: SerializeOptions,
  imageMap: Map<string, string>,
  svgMap?: Map<string, SvgMapEntry>
): NodeExport | null {
  if (!node.visible && !options.includeHidden) return null;

  // SVG short-circuit: pattern nodes are flattened into a single synthetic IMAGE fill
  // and their children are dropped (the SVG is exported separately by the main thread).
  if (svgMap && svgMap.has(node.id)) {
    const entry = svgMap.get(node.id)!;
    const out: any = {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible
    };
    if ('x' in node) {
      out.x = (node as any).x;
      out.y = (node as any).y;
    }
    if ('width' in node) {
      out.width = (node as any).width;
      out.height = (node as any).height;
    }
    if ('rotation' in node) out.rotation = (node as any).rotation;
    if ('opacity' in node) out.opacity = (node as any).opacity;
    if ('blendMode' in node) out.blendMode = (node as any).blendMode;
    out.fills = [
      {
        type: 'IMAGE',
        imageHash: `svg_export_${node.id}`,
        file: entry.fileName,
        scaleMode: 'FILL'
      } as FillExport
    ];
    return out as NodeExport;
  }

  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible
  };

  // Geometry
  if ('x' in node) {
    base.x = node.x;
    base.y = node.y;
  }
  if ('width' in node) {
    base.width = (node as any).width;
    base.height = (node as any).height;
  }
  if ('rotation' in node) {
    base.rotation = (node as any).rotation;
  }
  if ('opacity' in node) {
    base.opacity = (node as any).opacity;
  }
  if ('blendMode' in node) {
    base.blendMode = (node as any).blendMode;
  }

  // Constraints
  if ('constraints' in node && (node as any).constraints) {
    base.constraints = (node as any).constraints;
  }

  // Corner radius
  if ('cornerRadius' in node) {
    const cornerRadius = (node as any).cornerRadius;
    if (typeof cornerRadius === 'number') {
      base.cornerRadius = cornerRadius;
    } else if (cornerRadius !== undefined) {
      base.cornerRadius = null;
    }
  }

  // Individual corner radii
  if ('topLeftRadius' in node || 'topRightRadius' in node || 'bottomLeftRadius' in node || 'bottomRightRadius' in node) {
    const topLeft = (node as any).topLeftRadius ?? 0;
    const topRight = (node as any).topRightRadius ?? 0;
    const bottomLeft = (node as any).bottomLeftRadius ?? 0;
    const bottomRight = (node as any).bottomRightRadius ?? 0;
    if (topLeft || topRight || bottomLeft || bottomRight) {
      base.cornerRadii = { topLeft, topRight, bottomLeft, bottomRight };
    }
  }

  // Layout (Auto Layout)
  if ('layoutMode' in node && (node as any).layoutMode !== 'NONE') {
    base.layout = {
      layoutMode: (node as any).layoutMode,
      primaryAxisAlign: (node as any).primaryAxisAlignItems,
      counterAxisAlign: (node as any).counterAxisAlignItems,
      itemSpacing: (node as any).itemSpacing ?? 0,
      padding: {
        left: (node as any).paddingLeft ?? 0,
        right: (node as any).paddingRight ?? 0,
        top: (node as any).paddingTop ?? 0,
        bottom: (node as any).paddingBottom ?? 0
      }
    };
  }

  // Fills (including images). When fills are figma.mixed (e.g. on text nodes with
  // per-character colors) the getter throws and we intentionally omit the `fills` key,
  // matching the ideal Health1 output for split-color titles.
  if ('fills' in node) {
    try {
      const fills = (node as any).fills as any[];
      if (fills && Array.isArray(fills) && fills.length > 0) {
        base.fills = fills
          .filter((f) => f && f.visible !== false)
          .map((f) => paintToFillExport(f, imageMap));
      }
    } catch (e) {
      // Mixed fills: leave `fills` unset on purpose.
    }
  }

  // Strokes — always emit when the node supports strokes, even if empty.
  if ('strokes' in node) {
    try {
      const strokes = (node as any).strokes as any[];
      if (strokes && Array.isArray(strokes) && strokes.length > 0) {
        base.strokes = strokes
          .filter((s) => s && s.visible !== false)
          .map((s) => {
            if (s.type === 'SOLID') {
              return {
                type: 'SOLID',
                color: {
                  r: s.color.r,
                  g: s.color.g,
                  b: s.color.b,
                  a: s.opacity !== undefined ? s.opacity : 1
                },
                strokeWeight: (node as any).strokeWeight
              };
            }
            return { type: s.type, raw: s };
          });
      } else {
        base.strokes = [];
      }
    } catch (e) {
      base.strokes = [];
    }
  }

  // Effects (shadows, blurs)
  if ('effects' in node) {
    try {
      const effects = (node as any).effects as any[];
      if (effects && Array.isArray(effects) && effects.length > 0) {
        base.effects = effects.filter((e) => e && e.visible !== false);
      }
    } catch (e) {
      // Benign error handling
    }
  }

  // Text
  if (node.type === 'TEXT') {
    try {
      const tn = node as TextNode;
      base.characters = tn.characters;

      // Fetch styled text segments once and reuse for both textStyle fallback
      // values and the per-character override table below. We request every
      // property we serialize so a mixed direct getter (figma.mixed Symbol,
      // which JSON.stringify silently drops) can fall back to the first
      // segment's concrete value.
      let segments: any[] = [];
      try {
        if ((tn as any).getStyledTextSegments) {
          segments = (tn as any).getStyledTextSegments([
            'fills',
            'fontSize',
            'fontName',
            'lineHeight',
            'letterSpacing',
            'textCase'
          ]);
        }
      } catch (e) {
        segments = [];
      }
      const seg0: any = segments[0] || {};

      const pick = <T>(direct: any, fromSegment: T | undefined): T | undefined => {
        return direct === figma.mixed ? fromSegment : (direct as T);
      };

      base.textStyle = {
        fontSize: pick<number>(tn.fontSize, seg0.fontSize),
        textAlignHorizontal: tn.textAlignHorizontal,
        textAlignVertical: tn.textAlignVertical,
        lineHeight: pick<LineHeight>(tn.lineHeight, seg0.lineHeight),
        letterSpacing: pick<LetterSpacing>(tn.letterSpacing, seg0.letterSpacing)
      };
      try {
        const fontNameVal = pick<FontName>(tn.fontName as any, seg0.fontName);
        if (fontNameVal) base.textStyle.fontName = fontNameVal;
      } catch (e) {
        // Font getter threw (e.g. unloaded font) — fall back to first segment if we have it.
        if (seg0.fontName) base.textStyle.fontName = seg0.fontName;
      }
      try {
        const textCaseVal = pick<any>(tn.textCase as any, seg0.textCase);
        if (textCaseVal) base.textStyle.textCase = textCaseVal;
      } catch (e) {
        // ignore
      }

      // Per-character style overrides (matches Figma REST: characterStyleOverrides + styleOverrideTable)
      try {
        const charLen = tn.characters.length;
        const overrides: number[] = new Array(charLen).fill(0);
        const overrideTable: Record<string, { fills: FillExport[] }> = {};

        let baseFillsKey: string | null = null;
        try {
          const baseFillsRaw = (tn as any).fills;
          if (baseFillsRaw && baseFillsRaw !== figma.mixed && Array.isArray(baseFillsRaw)) {
            const baseFillsExp = baseFillsRaw
              .filter((f: any) => f && f.visible !== false)
              .map((f: any) => paintToFillExport(f, imageMap));
            baseFillsKey = fillsKey(baseFillsExp);
          }
        } catch (e) {
          // mixed fills: there is no single base style; every segment becomes an override
        }

        const keyToId = new Map<string, number>();
        let nextId = 1;

        for (const seg of segments) {
          const segFillsExp = (seg.fills || [])
            .filter((f: any) => f && f.visible !== false)
            .map((f: any) => paintToFillExport(f, imageMap));
          const segKey = fillsKey(segFillsExp);
          let id = 0;
          if (baseFillsKey !== null && segKey === baseFillsKey) {
            id = 0;
          } else {
            if (!keyToId.has(segKey)) {
              keyToId.set(segKey, nextId);
              overrideTable[String(nextId)] = { fills: segFillsExp };
              nextId++;
            }
            id = keyToId.get(segKey)!;
          }
          for (let i = seg.start; i < seg.end && i < charLen; i++) {
            overrides[i] = id;
          }
        }

        if (charLen > 0 && segments.length > 0) {
          base.characterStyleOverrides = overrides;
        }
        if (Object.keys(overrideTable).length > 0) {
          base.styleOverrideTable = overrideTable;
        }
      } catch (e) {
        // segments not available — skip overrides quietly
      }

      // figmaWidth: rendered text width (longest line for wrapped text), independent
      // of the layout box width imposed by the parent.
      try {
        const rb = (node as any).absoluteRenderBounds;
        if (rb && typeof rb.width === 'number') {
          base.figmaWidth = Math.round(rb.width);
        } else if (typeof (node as any).width === 'number') {
          base.figmaWidth = Math.round((node as any).width);
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // Font not loaded or other text-related error
      base.characters = '';
      base.textStyle = { fontName: 'unloaded' };
    }
  }

  // Component/Instance info
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
    try {
      const instanceNode = node as any;
      base.component = {
        isInstance: node.type === 'INSTANCE',
        mainComponentId: instanceNode.mainComponent?.id || null
      };
    } catch (e) {
      // Component info not available
    }
  }

  // Vector paths (for vector shapes)
  if ('vectorPaths' in node && (node as any).vectorPaths) {
    try {
      base.vectorPaths = (node as any).vectorPaths;
    } catch (e) {
      // Vector paths not accessible
    }
  }

  // Children (recursive)
  if ('children' in node) {
    try {
      const children = (node as any).children as SceneNode[];
      if (children && Array.isArray(children)) {
        const serializedChildren = children
          .map((c) => serializeNode(c, options, imageMap, svgMap))
          .filter((c) => c !== null);
        if (serializedChildren.length > 0) {
          base.children = serializedChildren;
        }
      }
    } catch (e) {
      // Children not accessible
    }
  }

  return base as NodeExport;
}
