# Testing the Plugin Locally

You can test the plugin directly in Figma Desktop without publishing it to the community. Here's how:

## Prerequisites

1. **Figma Desktop App** (not the web version)
   - Download from: https://www.figma.com/downloads/
   - The web version doesn't support local plugin development

2. **Built Plugin Files**
   - Make sure you've run `npm run build` successfully
   - Verify `dist/` folder contains:
     - `code.js`
     - `ui.html`
     - `ui.js`

## Step-by-Step Testing Process

### 1. Build the Plugin

```bash
cd figma-frame-exporter
npm run build
```

This creates the necessary files in the `dist/` folder.

### 2. Open Figma Desktop

- Launch the Figma Desktop application (not the browser version)
- Open any Figma file or create a new one
- Make sure you have some frames to test with

### 3. Import the Plugin (Development Mode)

1. In Figma Desktop, go to the menu:
   - **Plugins** → **Development** → **Import plugin from manifest...**
   
   OR
   
   - Right-click in the canvas → **Plugins** → **Development** → **Import plugin from manifest...**

2. Navigate to your project folder:
   ```
   /Users/mac/Desktop/Axtra Studios/FigmaPlugin/figma-frame-exporter/
   ```

3. Select the `manifest.json` file (NOT the one in dist/, but the one in the root)

4. Click **Open**

5. The plugin should now appear in:
   - **Plugins** → **Development** → **Frame Exporter**

### 4. Test the Plugin

1. **Create Test Content** (if you don't have any):
   - Create a frame (F key)
   - Add some text, shapes, images
   - Create nested frames
   - Optionally hide some layers to test the "include hidden" option

2. **Select Frames**:
   - Select one or more frames you want to export
   - You can select multiple frames by holding Shift or Cmd/Ctrl

3. **Run the Plugin**:
   - Go to **Plugins** → **Development** → **Frame Exporter**
   - The plugin UI should open in a sidebar

4. **Configure Options**:
   - Toggle "Include hidden layers" if needed
   - Toggle "Embed images as Base64" to test that feature
   - Toggle "Export frame previews" to test PNG export
   - Select export scale (1x, 2x, or 3x)

5. **Export**:
   - Click "Export to ZIP" button
   - Watch the progress bar and status messages
   - The ZIP file should automatically download when complete

6. **Verify Export**:
   - Open the downloaded ZIP file
   - Check that it contains:
     - `data.json` (with your frame data)
     - `manifest.json` (with export metadata)
     - `assets/` folder (if images were present)
     - `previews/` folder (if preview export was enabled)

### 5. Test Different Scenarios

Test these scenarios to ensure everything works:

- ✅ Single frame export
- ✅ Multiple frames export
- ✅ Frames with image fills
- ✅ Frames with nested children
- ✅ Hidden layers (with and without "include hidden")
- ✅ Text nodes with different fonts
- ✅ Frames with auto layout
- ✅ Components and instances
- ✅ Large frames (performance test)
- ✅ Frames with many images

## Development Workflow

### Making Changes

1. **Edit Source Files**:
   - Modify files in `src/` directory
   - For example: `src/code.ts`, `src/ui.ts`, `src/ui.html`

2. **Rebuild**:
   ```bash
   npm run build
   ```

3. **Reload Plugin in Figma**:
   - In Figma, go to **Plugins** → **Development** → **Frame Exporter**
   - The plugin will automatically use the new build
   - If it doesn't update, close and reopen the plugin

### Watch Mode (Auto-rebuild)

For faster development, use watch mode:

```bash
npm run watch
```

This will automatically rebuild when you save changes to source files.

Then in Figma, just close and reopen the plugin to see changes.

## Troubleshooting

### Plugin doesn't appear in Development menu

- Make sure you're using **Figma Desktop** (not web)
- Check that `manifest.json` is in the project root
- Verify the manifest has correct paths:
  - `"main": "dist/code.js"`
  - `"ui": "dist/ui.html"`

### Plugin shows errors

1. **Check Browser Console** (for UI errors):
   - Right-click in the plugin UI → **Inspect**
   - Look for JavaScript errors

2. **Check Plugin Console** (for main thread errors):
   - In Figma Desktop: **Plugins** → **Development** → **Open Console**
   - Look for errors related to your plugin

3. **Verify Build**:
   ```bash
   npm run build
   ```
   - Make sure there are no build errors
   - Check that `dist/` folder has all files

### Export fails or ZIP is empty

- Check that frames are actually selected
- Verify frames contain content (not empty)
- Check the status message in the plugin UI
- Look for errors in the plugin console

### Images not exporting

- Verify images are actual image fills (not just colored rectangles)
- Check that `figma.getImageByHash()` is working
- Look for errors in the plugin console

### HTML not loading

- Verify `dist/ui.html` exists
- Check that `dist/ui.js` exists
- Make sure the HTML file references `ui.js` correctly:
  ```html
  <script src="ui.js"></script>
  ```

## Quick Test Checklist

Before considering the plugin ready:

- [ ] Plugin loads without errors
- [ ] UI displays correctly
- [ ] Can export single frame
- [ ] Can export multiple frames
- [ ] Images are extracted correctly
- [ ] JSON structure is correct
- [ ] Frame previews work (if enabled)
- [ ] Hidden layers option works
- [ ] Base64 embedding works (if enabled)
- [ ] Progress updates display
- [ ] Error messages are clear
- [ ] ZIP file downloads automatically
- [ ] All files are in the ZIP

## Next Steps

Once testing is complete and everything works:

1. Update `manifest.json` with your plugin ID (when you're ready to publish)
2. Update version numbers
3. Create plugin icon and cover image
4. Write plugin description
5. Publish to Figma Community (optional)

