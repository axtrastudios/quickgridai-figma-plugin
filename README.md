# Frame Exporter - Figma Plugin

Export selected Figma frames to a structured ZIP file containing complete JSON representation, metadata, and extracted assets.

## Features

- **Complete Frame Export**: Export full node hierarchy including all children and subchildren
- **Structured JSON**: Hierarchical JSON representation with geometry, layout, styles, text, and vector metadata
- **Image Extraction**: Automatically extract image fills to separate assets folder
- **Base64 Embedding**: Optionally embed images as Base64 directly in JSON
- **Frame Previews**: Export PNG previews of frames at customizable scales (1x, 2x, 3x)
- **Hidden Layers**: Option to include or exclude hidden layers
- **Progress Tracking**: Real-time progress updates during export
- **Error Handling**: Comprehensive error handling with detailed error codes

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. In Figma Desktop:
   - Go to **Plugins** → **Development** → **Import plugin from manifest...**
   - Select the `manifest.json` file from this project
   - The plugin will appear in **Plugins** → **Development** → **Frame Exporter**

## Usage

1. **Select Frames**: In Figma, select one or more frames, components, or instances that you want to export
2. **Open Plugin**: Run the plugin from **Plugins** → **Development** → **Frame Exporter**
3. **Configure Options**:
   - **Include hidden layers**: Export layers that are currently hidden
   - **Embed images as Base64**: Include image data directly in JSON (increases file size)
   - **Export frame previews**: Generate PNG previews of frames
   - **Export Scale**: Choose 1x, 2x, or 3x scale for previews
4. **Export**: Click "Export to ZIP" button
5. **Download**: The ZIP file will automatically download when ready

## Export Structure

The exported ZIP file contains:

```
Export.zip
├── data.json          # Complete hierarchical JSON representation
├── manifest.json      # Export metadata and settings
├── assets/           # Extracted image assets
│   ├── image_1.png
│   ├── image_2.png
│   └── ...
└── previews/         # Frame preview images (if enabled)
    ├── frame_1_2.png
    └── ...
```

### data.json Structure

The `data.json` file contains a hierarchical representation of all exported frames:

```json
{
  "frames": [
    {
      "id": "137:45",
      "name": "Frame Name",
      "type": "FRAME",
      "visible": true,
      "x": 0,
      "y": 0,
      "width": 1440,
      "height": 900,
      "children": [
        {
          "id": "137:46",
          "name": "Child Node",
          "type": "RECTANGLE",
          "fills": [...],
          "x": 20,
          "y": 100,
          "width": 1200,
          "height": 450
        }
      ],
      "exportPreviewFile": "previews/frame_137_45.png"
    }
  ]
}
```

### manifest.json Structure

The `manifest.json` contains export metadata:

```json
{
  "plugin": "Frame Exporter",
  "pluginVersion": "1.0.0",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "frameCount": 2,
  "frames": [
    {"id": "1:2", "name": "Frame 1"}
  ],
  "options": {
    "includeHidden": false,
    "embedImages": false,
    "exportScale": 2,
    "exportPreview": true
  },
  "source": {
    "fileName": "MyDesign.figma",
    "pageId": "...",
    "pageName": "Page 1"
  }
}
```

## Development

### Project Structure

```
figma-frame-exporter/
├── src/
│   ├── code.ts          # Main plugin thread
│   ├── ui.ts            # UI logic
│   ├── ui.html          # UI template
│   └── lib/
│       ├── serializer.ts # Node serialization logic
│       └── types.ts      # TypeScript type definitions
├── dist/                # Build output
├── manifest.json        # Figma plugin manifest
├── package.json
├── tsconfig.json
└── rollup.config.js
```

### Build Commands

- `npm run build` - Build the plugin
- `npm run watch` - Build in watch mode (auto-rebuild on changes)
- `npm run clean` - Clean the dist folder

### Testing

1. Build the plugin: `npm run build`
2. In Figma Desktop, import the plugin from `manifest.json`
3. Create a test file with frames containing:
   - Text nodes
   - Image fills
   - Nested frames
   - Hidden layers
4. Test all export options and verify the output

## Error Codes

The plugin uses error codes for better error handling:

- `E_NO_SELECTION` - No frames selected
- `E_INVALID_SELECTION` - Selected nodes are not frames/components/instances
- `E_EXPORT_IN_PROGRESS` - Export already running
- `E_FONT_LOAD` - Font loading error
- `E_IMAGE_EXTRACT` - Image extraction error
- `E_PREVIEW_EXPORT` - Preview export error
- `E_ZIP_FAIL` - ZIP creation error
- `E_UNKNOWN` - Unknown error

## Limitations

- Very large images (>4096px) may be downscaled by Figma
- Mixed-font text runs are recorded with metadata but may not preserve full fidelity
- Deep nesting (>50 levels) should work but may impact performance
- ZIP file size is limited by available memory

## Publishing

Before publishing to the Figma Community:

1. Update `manifest.json` with your generated plugin ID
2. Update `pluginVersion` in `src/code.ts`
3. Test thoroughly on macOS and Windows
4. Create plugin icon (128×128) and cover image (1920×1080)
5. Write a clear description for the plugin listing
6. Ensure all processing is local (no network calls)

## License

ISC

## Support

For issues, questions, or contributions, please open an issue on the repository.

