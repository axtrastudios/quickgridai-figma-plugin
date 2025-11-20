(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const $input = (id) => document.getElementById(id);
    const $select = (id) => document.getElementById(id);
    const updateStatus = (text) => {
        const statusEl = $('status');
        if (statusEl) {
            statusEl.innerText = text;
        }
        else {
            console.error('Status element not found');
        }
    };
    const updateProgress = (percent) => {
        const progressBar = $('progressBar');
        const progressFill = $('progressFill');
        if (percent !== undefined) {
            if (progressBar)
                progressBar.style.display = 'block';
            if (progressFill)
                progressFill.style.width = `${percent}%`;
        }
        else {
            if (progressBar)
                progressBar.style.display = 'none';
        }
    };
    let isExporting = false;
    let exportBtn = null;
    // Wait for DOM to be ready
    function init() {
        exportBtn = $('exportBtn');
        if (!exportBtn) {
            console.error('Export button not found');
            updateStatus('Error: Export button not found');
            return;
        }
        exportBtn.addEventListener('click', () => {
            if (!exportBtn)
                return; // Safety check
            if (isExporting) {
                updateStatus('Export already in progress...');
                return;
            }
            const options = {
                includeHidden: $input('includeHidden').checked,
                embedImages: $input('embedImages').checked,
                exportPreview: $input('exportPreview').checked,
                exportScale: parseInt($select('exportScale').value, 10),
                filename: 'export.zip'
            };
            // Disable button during export
            isExporting = true;
            exportBtn.disabled = true;
            updateStatus('Starting export...');
            updateProgress(0);
            try {
                console.log('UI: Sending export message with options:', options);
                parent.postMessage({ pluginMessage: { type: 'start-export', options } }, '*');
                console.log('UI: Export message sent successfully');
            }
            catch (error) {
                console.error('Error sending export message:', error);
                updateStatus('Error: Failed to send export request');
                isExporting = false;
                if (exportBtn)
                    exportBtn.disabled = false;
            }
        });
    }
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
    // Handle messages from main thread
    window.onmessage = (event) => {
        const msg = event.data.pluginMessage;
        if (!msg)
            return;
        switch (msg.type) {
            case 'export-progress':
                updateStatus(`${msg.stage}${msg.percent !== undefined ? ` - ${msg.percent}%` : ''}`);
                updateProgress(msg.percent);
                break;
            case 'export-error':
                updateStatus(`Error: ${msg.error}`);
                updateProgress(undefined);
                isExporting = false;
                if (exportBtn)
                    exportBtn.disabled = false;
                break;
            case 'export-ready':
                // msg.zipBytes is an array (converted from Uint8Array for message passing)
                const uint8Array = new Uint8Array(msg.zipBytes);
                const blob = new Blob([uint8Array], { type: 'application/zip' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = msg.fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                updateStatus('Download started!');
                updateProgress(100);
                // Re-enable button after a short delay
                setTimeout(() => {
                    isExporting = false;
                    if (exportBtn)
                        exportBtn.disabled = false;
                    updateProgress(undefined);
                }, 1000);
                break;
            case 'preview-ready':
                // Handle individual preview if needed
                updateStatus(`Preview ready for ${msg.nodeId}`);
                break;
        }
    };

})();
