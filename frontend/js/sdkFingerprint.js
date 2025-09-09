class FingerprintSDK {
    constructor() {
        this.fingerprint = null;
        this.ip = null;
        this.ready = false;
    }

    async collect() {
        try {
            // Coleta dados básicos do navegador
            const fp = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                languages: navigator.languages,
                platform: navigator.platform,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory || 'unknown',
                screen: {
                    width: screen.width,
                    height: screen.height,
                    colorDepth: screen.colorDepth,
                    pixelDepth: screen.pixelDepth
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                touchSupport: 'ontouchstart' in window,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                webgl: this.getWebGLFingerprint(),
                canvas: this.getCanvasFingerprint()
            };

            this.fingerprint = fp;

            // Obtém IP público
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                this.ip = ipData.ip;
            } catch {
                this.ip = 'unknown';
            }

            this.ready = true;
        } catch (err) {
            console.error('Erro ao coletar fingerprint:', err);
            this.ready = true; // Marca como pronto mesmo com erro
        }
    }

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (!gl) return 'not_supported';
            
            return {
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER)
            };
        } catch {
            return 'error';
        }
    }

    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Fingerprint test 🔒', 2, 2);
            return canvas.toDataURL().slice(-50);
        } catch {
            return 'error';
        }
    }

    async ensureReady() {
        if (!this.ready) {
            await this.collect();
        }
    }
}

window.FingerprintSDK = FingerprintSDK;
