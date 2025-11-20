import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import polyfillNode from 'rollup-plugin-polyfill-node';
import { readFileSync, copyFileSync } from 'fs';

// Plugin to fix catch {} syntax (ES2019) to catch (e) {} for compatibility
const fixCatchSyntax = () => ({
  name: 'fix-catch-syntax',
  renderChunk(code, chunk) {
    if (chunk.fileName === 'code.js') {
      // Replace } catch {} with } catch (e) {} for ES2017 compatibility
      code = code.replace(/\}\s*catch\s*\{\s*\}/g, '} catch (e) {}');
      // Fix exports and module references that weren't transformed by CommonJS plugin
      // Add var exports = {}; and var module = {}; at the start of the IIFE
      const wrapperStart = code.indexOf('(function');
      if (wrapperStart >= 0) {
        let afterWrapper = code.indexOf('{', wrapperStart) + 1;
        if (afterWrapper > 0) {
          // Check if exports/module are needed
          let hasExports = code.match(/\bvar\s+exports\b/) || code.match(/\blet\s+exports\b/) || code.match(/\bconst\s+exports\b/);
          let hasModule = code.match(/\bvar\s+module\b/) || code.match(/\blet\s+module\b/) || code.match(/\bconst\s+module\b/);
          let needsExports = code.includes('exports') && !hasExports;
          let needsModule = (code.includes('module.') || code.includes('module.exports')) && !hasModule;
          
          // First, add exports and module declarations at the very beginning
          let declarations = '';
          if (needsExports || needsModule) {
            declarations += '\n\tvar exports = {};';
            if (needsModule) {
              declarations += '\n\tvar module = { exports: exports };';
            }
            code = code.slice(0, afterWrapper) + declarations + code.slice(afterWrapper);
            // Recalculate afterWrapper after insertion
            afterWrapper = code.indexOf('{', wrapperStart) + 1 + declarations.length;
          }
          
          // Then add polyfill for Object.setPrototypeOf (after exports/module)
          if (code.includes('inherits') || code.includes('setPrototypeOf')) {
            const prototypeFix = `
\t// Polyfill Object.setPrototypeOf for compatibility with better error handling
\tvar originalSetPrototypeOf = Object.setPrototypeOf;
\tObject.setPrototypeOf = function(obj, proto) {
\t\t// Validate arguments
\t\tif (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
\t\t\tthrow new TypeError('Object.setPrototypeOf called on non-object');
\t\t}
\t\tif (proto !== null && typeof proto !== 'object' && typeof proto !== 'function') {
\t\t\t// Return obj without setting prototype if proto is invalid
\t\t\treturn obj;
\t\t}
\t\t// Use native implementation if available
\t\tif (originalSetPrototypeOf) {
\t\t\ttry {
\t\t\t\treturn originalSetPrototypeOf.call(Object, obj, proto);
\t\t\t} catch (e) {
\t\t\t\t// Fallback to __proto__ if native fails
\t\t\t}
\t\t}
\t\t// Fallback to __proto__ assignment
\t\ttry {
\t\t\tobj.__proto__ = proto;
\t\t\treturn obj;
\t\t} catch (e) {
\t\t\t// If all else fails, just return the object
\t\t\treturn obj;
\t\t}
\t};`;
            code = code.slice(0, afterWrapper) + prototypeFix + code.slice(afterWrapper);
          }
        }
      }
      return code;
    }
    return null;
  }
});

// Plugin to inject HTML as a string constant with inlined UI script
const injectHtml = () => {
  let htmlContent;
  let uiJsContent;
  return {
    name: 'inject-html',
    buildStart() {
      // Read HTML content
      htmlContent = readFileSync('src/ui.html', 'utf-8');
      // Remove the external script tag since we'll inline it
      htmlContent = htmlContent.replace(/<script src="ui\.js"><\/script>/g, '');
      
      // Try to read the compiled UI JavaScript (should exist from first build in sequence)
      try {
        uiJsContent = readFileSync('dist/ui.js', 'utf-8');
        // Remove the IIFE wrapper to get just the code
        uiJsContent = uiJsContent.replace(/^\(function \(\) \{\s*'use strict';\s*/g, '');
        uiJsContent = uiJsContent.replace(/\}\)\(\);[\s\n]*$/g, '');
        // Inject the script inline into HTML before closing body tag
        htmlContent = htmlContent.replace('</body>', `<script>\n${uiJsContent}\n</script>\n</body>`);
        console.log('✓ Successfully inlined UI JavaScript into HTML');
      } catch (e) {
        console.warn('⚠ Could not inline ui.js - it may not exist yet. Run build again if this is first build.');
        // Keep the external script reference as fallback
        htmlContent = htmlContent.replace('</body>', `<script src="ui.js"></script>\n</body>`);
      }
      
      // Escape the HTML for use in a JavaScript string
      htmlContent = htmlContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\${/g, '\\${');
    },
    renderChunk(code, chunk) {
      if (chunk.fileName === 'code.js') {
        // Replace the placeholder with actual HTML content
        // Try multiple patterns to catch the placeholder
        code = code.replace(
          /const __html__: string = '__HTML_PLACEHOLDER__';/g,
          `const __html__ = \`${htmlContent}\`;`
        );
        code = code.replace(
          /const __html__ = '__HTML_PLACEHOLDER__';/g,
          `const __html__ = \`${htmlContent}\`;`
        );
        code = code.replace(
          /var __html__ = '__HTML_PLACEHOLDER__';/g,
          `var __html__ = \`${htmlContent}\`;`
        );
        return code;
      }
      return null;
    }
  };
};

// Plugin to copy HTML file to dist
const copyHtml = () => ({
  name: 'copy-html',
  writeBundle() {
    copyFileSync('src/ui.html', 'dist/ui.html');
  }
});

export default [
  // Build UI first so we can inline it into code.js
  {
    input: 'src/ui.ts',
    output: {
      file: 'dist/ui.js',
      format: 'iife',
      name: 'PluginUI'
    },
    plugins: [typescript(), copyHtml()]
  },
  // Build main code second, reading the compiled UI
  {
    input: 'src/code.ts',
    output: {
      file: 'dist/code.js',
      format: 'iife',
      name: 'PluginCode'
    },
    plugins: [
      polyfillNode({
        include: ['buffer', 'util']
      }),
      nodeResolve({ 
        preferBuiltins: false,
        browser: true
      }),
      commonjs({
        transformMixedEsModules: true,
        strictRequires: true
      }),
      typescript(),
      fixCatchSyntax(),
      injectHtml()
    ]
  }
];

