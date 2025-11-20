// src/lib/serializer.ts
// Note: SceneNode, TextNode, etc. are global types provided by @figma/plugin-typings
import { NodeExport, FillExport } from './types';

export interface SerializeOptions {
  includeHidden: boolean;
  embedImages: boolean;
}

export function serializeNode(
  node: SceneNode,
  options: SerializeOptions,
  imageMap: Map<string, string>
): NodeExport | null {
  if (!node.visible && !options.includeHidden) return null;

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

  // Fills (including images)
  if ('fills' in node) {
    try {
      const fills = (node as any).fills as any[];
      if (fills && Array.isArray(fills) && fills.length > 0) {
        base.fills = fills
          .filter((f) => f && f.visible !== false)
          .map((f) => {
            if (f.type === 'SOLID') {
              return {
                type: 'SOLID',
                color: {
                  r: f.color.r,
                  g: f.color.g,
                  b: f.color.b,
                  a: f.opacity !== undefined ? f.opacity : 1
                }
              } as FillExport;
            }
            if (f.type === 'IMAGE') {
              // Register image hash for extraction
              const mapped = imageMap.get(f.imageHash);
              const fillExport: FillExport = {
                type: 'IMAGE',
                imageHash: f.imageHash,
                file: mapped ?? undefined,
                scaleMode: f.scaleMode
              };
              // dataUri will be set later during image extraction if embedImages is enabled
              return fillExport;
            }
            if (f.type === 'GRADIENT_LINEAR' || f.type === 'GRADIENT_RADIAL' || f.type === 'GRADIENT_ANGULAR' || f.type === 'GRADIENT_DIAMOND') {
              return {
                type: 'GRADIENT',
                gradient: {
                  type: f.type,
                  gradientStops: f.gradientStops,
                  gradientTransform: f.gradientTransform
                }
              } as FillExport;
            }
            // Fallback for other fill types
            return { type: f.type, raw: f } as any;
          });
      }
    } catch (e) {
      // Benign: fonts or mixed properties might throw
    }
  }

  // Strokes
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
      }
      if ('strokeWeight' in node && (node as any).strokeWeight) {
        if (!base.strokes) base.strokes = [];
      }
    } catch (e) {
      // Benign error handling
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
      base.textStyle = {
        fontSize: tn.fontSize,
        textAlignHorizontal: tn.textAlignHorizontal,
        textAlignVertical: tn.textAlignVertical,
        lineHeight: tn.lineHeight,
        letterSpacing: tn.letterSpacing
      };
      try {
        base.textStyle.fontName = tn.fontName;
      } catch (e) {
        base.textStyle.fontName = 'mixed-or-unloaded';
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
          .map((c) => serializeNode(c, options, imageMap))
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

