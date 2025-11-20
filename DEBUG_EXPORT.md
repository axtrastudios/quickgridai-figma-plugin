# Debugging Export Button Issues

## Recent Fixes Applied

1. **HTML Injection Fixed** - The UI now properly loads instead of showing `__HTML_PLACEHOLDER__`
2. **DOM Ready Handler** - Added proper initialization to wait for DOM to be ready
3. **Error Handling** - Added try-catch blocks and console logging
4. **Message Passing** - Added logging to track messages between UI and main thread

## How to Debug Export Button Issues

### Step 1: Check Browser Console

1. In Figma Desktop, open the plugin
2. Right-click in the plugin UI area
3. Select **Inspect** or **Inspect Element**
4. Go to the **Console** tab
5. Look for:
   - `"Export message sent:"` - confirms button click is working
   - `"Received message from UI:"` - confirms main thread received the message
   - Any error messages

### Step 2: Check Plugin Console

1. In Figma Desktop: **Plugins** → **Development** → **Open Console**
2. Look for:
   - `"Received message from UI:"` - confirms message received
   - Any error messages related to export

### Step 3: Verify Selection

Make sure you have **frames selected** in Figma before clicking Export:
- Select one or more frames
- The plugin should show the export button
- If no frames are selected, you'll see an error message

### Step 4: Test with Simple Frame

1. Create a simple frame with just a rectangle
2. Select the frame
3. Run the plugin
4. Click Export
5. Check console for any errors

## Common Issues and Solutions

### Issue: Button does nothing when clicked

**Possible causes:**
- UI JavaScript not loading
- Message not reaching main thread
- No frames selected

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify `ui.js` is loading (check Network tab)
3. Make sure frames are selected
4. Check that `parent.postMessage` is working

### Issue: "Export button not found" error

**Solution:**
- The HTML might not be loading correctly
- Rebuild: `npm run build`
- Re-import the plugin in Figma

### Issue: Message sent but no response

**Possible causes:**
- Main thread not receiving message
- Export function failing silently

**Solutions:**
1. Check Plugin Console for `"Received message from UI:"`
2. Check for errors in Plugin Console
3. Verify `figma.ui.onmessage` is set up correctly

### Issue: Permission violations in console

**Note:** These are from Figma's internal code, NOT from this plugin. They can be safely ignored:
- `[Violation] Potential permissions policy violation: camera`
- `[Violation] Potential permissions policy violation: microphone`
- `[Violation] Potential permissions policy violation: clipboard-write`
- `[Violation] Potential permissions policy violation: display-capture`

These don't affect plugin functionality.

## Testing Checklist

- [ ] Plugin UI loads correctly (not showing placeholder)
- [ ] Export button is visible and clickable
- [ ] Frames are selected in Figma
- [ ] Browser console shows "Export message sent:" when button clicked
- [ ] Plugin console shows "Received message from UI:" 
- [ ] Status updates appear in UI
- [ ] Progress bar appears during export
- [ ] ZIP file downloads automatically

## Next Steps if Still Not Working

1. **Share Console Logs:**
   - Browser console output
   - Plugin console output
   - Any error messages

2. **Verify Build:**
   ```bash
   npm run build
   ```
   - Should complete without errors
   - Check that `dist/ui.js` and `dist/code.js` exist

3. **Test in Fresh Figma File:**
   - Create new file
   - Add simple frame
   - Test export

4. **Check Figma Version:**
   - Make sure you're using Figma Desktop (not web)
   - Update Figma if possible

