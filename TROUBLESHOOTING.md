# Troubleshooting Guide

## Console Errors/Warnings

### Permission Policy Violations

If you see these warnings in the console:
```
[Violation] Potential permissions policy violation: camera is not allowed
[Violation] Potential permissions policy violation: microphone is not allowed
[Violation] Potential permissions policy violation: clipboard-write is not allowed
```

**These are harmless warnings from Figma's internal code, not from this plugin.** You can safely ignore them.

### Syntax Errors in vendor-core

If you see errors like:
```
vendor-core-164ef253d2e7f791.min.js.br:85 Syntax error on line 16: Unexpected token {
```

**This is also from Figma's internal code, not from this plugin.** These errors don't affect plugin functionality.

### How to Verify Plugin is Working

1. **Check Plugin Console** (not browser console):
   - In Figma Desktop: **Plugins** → **Development** → **Open Console**
   - Look for errors specifically mentioning "Frame Exporter" or your plugin code
   - Errors from Figma's vendor code won't mention your plugin

2. **Test the Plugin**:
   - Select frames
   - Run the plugin
   - If the UI opens and export works, the plugin is functioning correctly

3. **Check Build Output**:
   ```bash
   npm run build
   ```
   - Should complete without errors
   - Should create `dist/code.js`, `dist/ui.js`, and `dist/ui.html`

## Common Issues

### Plugin Doesn't Load

**Symptoms**: Plugin doesn't appear in Development menu

**Solutions**:
- Make sure you're using **Figma Desktop** (not web version)
- Verify `manifest.json` is in the project root
- Check that paths in manifest are correct:
  - `"main": "dist/code.js"`
  - `"ui": "dist/ui.html"`
- Rebuild: `npm run build`

### UI Doesn't Open

**Symptoms**: Plugin runs but UI doesn't appear

**Solutions**:
- Check that `dist/ui.html` exists
- Check that `dist/ui.js` exists
- Verify HTML file references `ui.js`:
  ```html
  <script src="ui.js"></script>
  ```
- Open browser console (right-click in plugin UI → Inspect) to see errors

### Export Fails

**Symptoms**: Export button does nothing or shows error

**Solutions**:
- Make sure frames are selected
- Check plugin console for specific error messages
- Verify frames contain content (not empty)
- Try with a simple frame first
- Check that JSZip is bundled correctly (should be in `dist/code.js`)

### Images Not Extracting

**Symptoms**: ZIP created but `assets/` folder is empty

**Solutions**:
- Verify images are actual image fills (not just colored shapes)
- Check that `figma.getImageByHash()` is working
- Look for errors in plugin console
- Try with a frame that has known image fills

### ZIP File is Corrupted

**Symptoms**: Can't open downloaded ZIP file

**Solutions**:
- Rebuild the plugin: `npm run build`
- Check that JSZip is properly bundled
- Try exporting again
- Check browser console for errors during download

### Build Errors

**Symptoms**: `npm run build` fails

**Solutions**:
- Make sure all dependencies are installed: `npm install`
- Check Node.js version (should be 14+)
- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## Getting Help

If you encounter issues:

1. **Check Plugin Console**: Most errors will appear here
2. **Check Browser Console**: For UI-related errors
3. **Verify Build**: Make sure build completes successfully
4. **Test with Simple Frame**: Start with a basic frame to isolate issues
5. **Check File Structure**: Ensure all files are in place

## Debug Mode

To get more detailed error information:

1. Open Figma Desktop
2. Go to **Plugins** → **Development** → **Open Console**
3. Run your plugin
4. Check for any error messages
5. Right-click in plugin UI → **Inspect** for browser console

## Still Having Issues?

If the plugin still doesn't work:

1. Share the error message from Plugin Console (not browser console)
2. Share your `manifest.json` content
3. Share the output of `npm run build`
4. Describe what happens when you try to use the plugin

