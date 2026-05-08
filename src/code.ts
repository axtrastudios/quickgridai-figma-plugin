// src/code.ts
// @ts-ignore - JSZip doesn't have proper ES module exports
import JSZip from 'jszip';
import { serializeNode, SvgMapEntry } from './lib/serializer';
import {
  ExportOptions,
  UIToMainMessage,
  MainToUIMessage,
  ExportManifest,
  NodeExport,
  ExportData
} from './lib/types';

// Helper to convert Uint8Array to base64
function toBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

// Read HTML file content (will be injected at build time)
// This will be replaced by the rollup plugin
const __html__: string = '__HTML_PLACEHOLDER__';

figma.showUI(__html__, { width: 400, height: 400 });

// Send a ready message when the plugin loads
console.log('Plugin main thread initialized');
figma.notify('Plugin loaded - Ready to export');

let isExporting = false;
let cancelExport = false;

figma.ui.onmessage = async (msg: UIToMainMessage) => {
  console.log('=== MESSAGE RECEIVED ===');
  console.log('Message type:', msg?.type);
  console.log('Full message:', JSON.stringify(msg));
  
  if (!msg || !msg.type) {
    console.error('Invalid message received:', msg);
    figma.notify('Invalid message received', { error: true });
    return;
  }
  
  if (msg.type === 'start-export') {
    console.log('Start export message received with options:', msg.options);
    figma.notify('Starting export...');
    
    if (isExporting) {
      console.log('Export already in progress');
      figma.ui.postMessage({
        type: 'export-error',
        error: 'Export already in progress',
        code: 'E_EXPORT_IN_PROGRESS'
      } as MainToUIMessage);
      return;
    }
    cancelExport = false;
    isExporting = true;
    try {
      console.log('Calling runExport...');
      await runExport(msg.options);
      console.log('runExport completed');
    } catch (e: any) {
      console.error('Export error:', e);
      const errorMessage = e?.message || String(e);
      const errorCode = e?.code || 'E_UNKNOWN';
      figma.ui.postMessage({
        type: 'export-error',
        error: errorMessage,
        code: errorCode
      } as MainToUIMessage);
      figma.notify('Export failed: ' + errorMessage, { error: true });
    } finally {
      isExporting = false;
    }
  } else if (msg.type === 'cancel-export') {
    console.log('Cancel export message received');
    cancelExport = true;
    figma.ui.postMessage({
      type: 'export-progress',
      stage: 'cancelled',
      percent: 0
    } as MainToUIMessage);
  }
};

async function runExport(options: ExportOptions) {
  console.log('runExport: Starting with options:', options);
  
  const selection = figma.currentPage.selection;
  console.log('runExport: Selection count:', selection?.length || 0);
  
  if (!selection || selection.length === 0) {
    figma.notify('Please select one or more frames to export.');
    figma.ui.postMessage({
      type: 'export-error',
      error: 'No frames selected',
      code: 'E_NO_SELECTION'
    } as MainToUIMessage);
    return;
  }

  // Filter to only frames, components, and instances
  const validNodes = selection.filter(
    (node) => node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  );

  if (validNodes.length === 0) {
    figma.notify('Please select frames, components, or instances to export.');
    figma.ui.postMessage({
      type: 'export-error',
      error: 'No valid frames selected',
      code: 'E_INVALID_SELECTION'
    } as MainToUIMessage);
    return;
  }

  if (cancelExport) return;

  figma.ui.postMessage({
    type: 'export-progress',
    stage: 'serializing',
    percent: 5
  } as MainToUIMessage);

  // Collect image hashes and SVG-pattern nodes during a single tree walk.
  const imageMap = new Map<string, string>();
  const svgMap = new Map<string, SvgMapEntry>();
  let imageCounter = 0;
  let svgCounter = 0;

  function isPatternNode(n: SceneNode): boolean {
    return (n.type === 'GROUP' || n.type === 'FRAME') && /pattern/i.test(n.name);
  }

  function slugifyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'pattern';
  }

  function scanNode(node: SceneNode) {
    if (cancelExport) return;
    // Pattern nodes are exported as SVG; do not descend (their descendants are
    // absorbed into the SVG file and must not be serialized or PNG-extracted).
    if (isPatternNode(node)) {
      if (!svgMap.has(node.id)) {
        svgCounter++;
        const slug = slugifyName(node.name);
        svgMap.set(node.id, { fileName: `${slug}_${svgCounter}.svg` });
      }
      return;
    }
    try {
      if ('fills' in node && (node as any).fills) {
        const fills = (node as any).fills as any[];
        for (const f of fills) {
          if (f && f.type === 'IMAGE' && f.imageHash) {
            if (!imageMap.has(f.imageHash)) {
              imageCounter++;
              imageMap.set(f.imageHash, `image_${imageCounter}.png`);
            }
          }
        }
      }
    } catch (e) {
      // Benign error
    }
    if ('children' in node) {
      const children = (node as any).children as SceneNode[];
      if (children && Array.isArray(children)) {
        for (const c of children) {
          scanNode(c);
        }
      }
    }
  }

  for (const node of validNodes) {
    scanNode(node);
  }

  if (cancelExport) return;

  // Serialize nodes
  const frames: NodeExport[] = [];
  for (const node of validNodes) {
    if (cancelExport) return;
    const serialized = serializeNode(
      node as SceneNode,
      { includeHidden: options.includeHidden, embedImages: options.embedImages },
      imageMap,
      svgMap
    );
    if (serialized) {
      frames.push(serialized);
    }
  }

  if (cancelExport) return;

  figma.ui.postMessage({
    type: 'export-progress',
    stage: 'extracting-images',
    percent: 30
  } as MainToUIMessage);

  // Extract image bytes
  const imageBytesMap: Record<string, Uint8Array> = {};
  const totalImages = imageMap.size;
  let processedImages = 0;

  for (const [hash, fname] of imageMap) {
    if (cancelExport) return;
    try {
      const image = figma.getImageByHash(hash);
      if (!image) {
        console.warn(`Image not found for hash: ${hash}`);
        continue;
      }
      const bytes = await image.getBytesAsync();
      imageBytesMap[fname] = bytes;

      // If embedImages is enabled, also add base64 to the fill data
      if (options.embedImages) {
        const dataUri = `data:image/png;base64,${toBase64(bytes)}`;
        // Update the fills in frames that use this image
        for (const frame of frames) {
          updateFillDataUri(frame, hash, dataUri);
        }
      }

      processedImages++;
      if (totalImages > 0) {
        const percent = 30 + Math.round((processedImages / totalImages) * 20);
        figma.ui.postMessage({
          type: 'export-progress',
          stage: 'extracting-images',
          percent
        } as MainToUIMessage);
      }
    } catch (e: any) {
      console.error(`Error extracting image ${fname}:`, e);
      figma.ui.postMessage({
        type: 'export-progress',
        stage: `error extracting ${fname}`,
        percent: undefined
      } as MainToUIMessage);
    }
  }

  if (cancelExport) return;

  // Extract SVGs for pattern groups/frames (rasterize the entire subtree to a single SVG file).
  const svgBytesMap: Record<string, Uint8Array> = {};
  if (svgMap.size > 0) {
    figma.ui.postMessage({
      type: 'export-progress',
      stage: 'extracting-svgs',
      percent: 50
    } as MainToUIMessage);

    const totalSvgs = svgMap.size;
    let processedSvgs = 0;

    for (const [id, entry] of svgMap) {
      if (cancelExport) return;
      try {
        const node = figma.getNodeById(id) as SceneNode | null;
        if (!node) {
          console.warn(`SVG-pattern node not found for id: ${id}`);
          continue;
        }
        const bytes = await (node as any).exportAsync({ format: 'SVG' });
        svgBytesMap[entry.fileName] = bytes;

        processedSvgs++;
        if (totalSvgs > 0) {
          const percent = 50 + Math.round((processedSvgs / totalSvgs) * 5);
          figma.ui.postMessage({
            type: 'export-progress',
            stage: 'extracting-svgs',
            percent
          } as MainToUIMessage);
        }
      } catch (e: any) {
        console.error(`Error exporting SVG ${entry.fileName}:`, e);
        figma.ui.postMessage({
          type: 'export-progress',
          stage: `error extracting svg ${entry.fileName}`,
          percent: undefined
        } as MainToUIMessage);
      }
    }
  }

  if (cancelExport) return;

  // Export frame previews if enabled
  const previewBytesMap: Record<string, Uint8Array> = {};
  if (options.exportPreview) {
    figma.ui.postMessage({
      type: 'export-progress',
      stage: 'exporting-previews',
      percent: 50
    } as MainToUIMessage);

    const totalFrames = frames.length;
    let processedFrames = 0;

    for (let i = 0; i < validNodes.length; i++) {
      if (cancelExport) return;
      const node = validNodes[i];
      const frameData = frames[i];
      if (!frameData) continue;

      try {
        // Export as PNG
        const exportSettings: ExportSettings = {
          format: 'PNG',
          constraint: {
            type: 'SCALE',
            value: options.exportScale
          }
        };

        const bytes = await (node as any).exportAsync(exportSettings);
        const previewFileName = `previews/frame_${node.id.replace(/[:]/g, '_')}.png`;
        previewBytesMap[previewFileName] = bytes;
        frameData.exportPreviewFile = previewFileName;

        processedFrames++;
        if (totalFrames > 0) {
          const percent = 50 + Math.round((processedFrames / totalFrames) * 10);
          figma.ui.postMessage({
            type: 'export-progress',
            stage: 'exporting-previews',
            percent
          } as MainToUIMessage);
        }
      } catch (e: any) {
        console.error(`Error exporting preview for frame ${node.name}:`, e);
        // Continue with other frames even if one fails
      }
    }
  }

  if (cancelExport) return;

  figma.ui.postMessage({
    type: 'export-progress',
    stage: 'zipping',
    percent: 60
  } as MainToUIMessage);

  // Build JSON and zip
  const firstNode = validNodes[0] as any;
  const exportData: ExportData = {
    canvas: {
      width: typeof firstNode.width === 'number' ? firstNode.width : 0,
      height: typeof firstNode.height === 'number' ? firstNode.height : 0
    },
    frames
  };
  const exportManifest: ExportManifest = {
    plugin: 'Frame Exporter',
    pluginVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    frameCount: frames.length,
    frames: frames.map((f) => ({ id: f.id, name: f.name })),
    options,
    source: {
      fileName: figma.root.name,
      pageId: figma.currentPage.id,
      pageName: figma.currentPage.name
    }
  };

  const zip = new JSZip();
  zip.file('data.json', JSON.stringify(exportData, null, 2));
  zip.file('manifest.json', JSON.stringify(exportManifest, null, 2));

  // Add assets folder (PNG image fills + SVG pattern exports)
  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    for (const [fname, bytes] of Object.entries(imageBytesMap)) {
      assetsFolder.file(fname, bytes);
    }
    for (const [fname, bytes] of Object.entries(svgBytesMap)) {
      assetsFolder.file(fname, bytes);
    }
  }

  // Add previews folder if previews were exported
  if (options.exportPreview && Object.keys(previewBytesMap).length > 0) {
    const previewsFolder = zip.folder('previews');
    if (previewsFolder) {
      for (const [fname, bytes] of Object.entries(previewBytesMap)) {
        const fileName = fname.replace('previews/', '');
        previewsFolder.file(fileName, bytes);
      }
    }
  }

  const zipBytes = await zip.generateAsync(
    { type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata: any) => {
      if (!cancelExport) {
        figma.ui.postMessage({
          type: 'export-progress',
          stage: 'zipping',
          percent: 60 + Math.round((metadata.percent / 100) * 30)
        } as MainToUIMessage);
      }
    }
  );

  if (cancelExport) return;

  const fileName = options.filename || 'Export.zip';
  figma.ui.postMessage({
    type: 'export-ready',
    fileName,
    zipBytes: Array.from(zipBytes) // Convert to array for message passing
  } as MainToUIMessage);

  figma.notify(`Export complete: ${fileName}`);
}

// Helper function to update fill dataUri recursively
function updateFillDataUri(node: NodeExport, imageHash: string, dataUri: string) {
  if (node.fills) {
    for (const fill of node.fills) {
      if (fill.type === 'IMAGE' && fill.imageHash === imageHash) {
        fill.dataUri = dataUri;
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      updateFillDataUri(child, imageHash, dataUri);
    }
  }
}

