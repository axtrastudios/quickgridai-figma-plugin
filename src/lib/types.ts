// Type definitions for the Figma Frame Exporter plugin

export interface ExportOptions {
  includeHidden: boolean;
  embedImages: boolean;
  exportScale: number; // 1, 2, or 3
  exportPreview: boolean; // include frame PNG previews
  filename?: string; // default Export.zip
}

export interface AutoLayoutInfo {
  layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  primaryAxisAlign: string;
  counterAxisAlign: string;
  itemSpacing: number;
  padding: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export interface TextStyleInfo {
  fontSize?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  fontName?: FontName | string;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
}

export type FillExport =
  | { type: 'SOLID'; color: { r: number; g: number; b: number; a?: number } }
  | { type: 'GRADIENT'; gradient: any }
  | { type: 'IMAGE'; imageHash: string; file?: string; dataUri?: string; scaleMode?: string };

export interface StrokeExport {
  type: string;
  color?: { r: number; g: number; b: number; a?: number };
  strokeWeight?: number;
  [key: string]: any;
}

export interface NodeExport {
  id: string;
  name: string;
  type: string; // e.g. "FRAME", "RECTANGLE", "TEXT", ...
  visible: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  layout?: AutoLayoutInfo | null;
  constraints?: any; // as from node.constraints
  fills?: FillExport[];
  strokes?: StrokeExport[];
  effects?: any[];
  opacity?: number;
  blendMode?: string;
  cornerRadius?: number | null;
  cornerRadii?: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number } | null;
  characters?: string | null; // for text nodes
  textStyle?: TextStyleInfo | null;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, { fills?: FillExport[] }>;
  figmaWidth?: number;
  vectorPaths?: any[] | null; // optional
  component?: { mainComponentId?: string; isInstance?: boolean } | null;
  children?: NodeExport[];
  exportPreviewFile?: string | null; // e.g. "previews/frame_1.png"
  meta?: any; // any plugin specific extra
}

export interface ExportData {
  canvas: { width: number; height: number };
  frames: NodeExport[];
}

export interface ExportManifest {
  plugin: string;
  pluginVersion: string;
  generatedAt: string;
  frameCount: number;
  frames: Array<{ id: string; name: string }>;
  options: ExportOptions;
  source?: {
    fileName?: string;
    pageId?: string;
    pageName?: string;
  };
}

// UI to Main thread messages
export type UIToMainMessage =
  | { type: 'start-export'; options: ExportOptions }
  | { type: 'request-preview'; nodeId: string; options: PreviewOptions }
  | { type: 'cancel-export' };

export interface PreviewOptions {
  format: 'PNG' | 'JPG';
  scale: number;
}

// Main to UI thread messages
export type MainToUIMessage =
  | { type: 'export-ready'; fileName: string; zipBytes: Uint8Array | number[] }
  | { type: 'export-progress'; stage: string; percent?: number }
  | { type: 'export-error'; error: string; code?: string }
  | { type: 'preview-ready'; nodeId: string; bytes: Uint8Array; format: 'PNG' | 'JPG' };

