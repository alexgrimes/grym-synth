/**
 * GrymSynth Browser Compatibility Tests
 *
 * These tests must be run in a browser environment as they test browser-specific APIs.
 * Use browser-test-runner.html to execute these tests.
 */

// Test Web Audio API support
window.testAudioContext = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const result = {
            supported: true,
            sampleRate: ctx.sampleRate,
            maxChannels: ctx.destination.maxChannelCount,
            state: ctx.state
        };
        ctx.close();
        return result;
    } catch (error) {
        return {
            supported: false,
            error: error.message
        };
    }
};

// Test WebGL support
window.testWebGLSupport = function() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            return {
                supported: false,
                error: 'WebGL context creation failed'
            };
        }

        return {
            supported: true,
            version: gl instanceof WebGL2RenderingContext ? '2.0' : '1.0',
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            extensions: gl.getSupportedExtensions()
        };
    } catch (error) {
        return {
            supported: false,
            error: error.message
        };
    }
};

// Test Web Workers support
window.testWebWorkers = function() {
    return new Promise((resolve) => {
        try {
            if (!window.Worker) {
                resolve({
                    supported: false,
                    error: 'Web Workers not supported'
                });
                return;
            }

            const blob = new Blob([
                'self.onmessage = function(e) { self.postMessage("ok"); }'
            ], { type: 'application/javascript' });

            const worker = new Worker(URL.createObjectURL(blob));

            worker.onmessage = function(e) {
                worker.terminate();
                resolve({
                    supported: true,
                    message: e.data
                });
            };

            worker.onerror = function(error) {
                worker.terminate();
                resolve({
                    supported: false,
                    error: error.message
                });
            };

            worker.postMessage('test');
        } catch (error) {
            resolve({
                supported: false,
                error: error.message
            });
        }
    });
};

// Test LocalStorage support
window.testLocalStorage = function() {
    try {
        const testKey = '__grymsynth_test__';
        const testValue = 'test';

        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);

        return {
            supported: true,
            working: retrieved === testValue
        };
    } catch (error) {
        return {
            supported: false,
            error: error.message
        };
    }
};

// Test IndexedDB support
window.testIndexedDB = function() {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open('__grymsynth_test__', 1);

            request.onerror = () => {
                resolve({
                    supported: false,
                    error: request.error.message
                });
            };

            request.onsuccess = () => {
                const db = request.result;
                db.close();
                const delRequest = indexedDB.deleteDatabase('__grymsynth_test__');

                delRequest.onsuccess = () => {
                    resolve({
                        supported: true,
                        version: db.version
                    });
                };

                delRequest.onerror = () => {
                    resolve({
                        supported: true,
                        version: db.version,
                        warning: 'Could not clean up test database'
                    });
                };
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                db.createObjectStore('test');
            };
        } catch (error) {
            resolve({
                supported: false,
                error: error.message
            });
        }
    });
};

// Test SQLite WASM support
window.testSQLiteWASM = async function() {
    try {
        if (typeof WebAssembly !== 'object') {
            return {
                supported: false,
                error: 'WebAssembly not supported'
            };
        }

        const wasmTest = new WebAssembly.Module(new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00
        ]));

        return {
            supported: true,
            features: {
                webAssembly: true,
                streamingCompilation: 'compileStreaming' in WebAssembly,
                threads: 'SharedArrayBuffer' in window,
                simd: WebAssembly.validate(new Uint8Array([
                    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                    0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02,
                    0x01, 0x00, 0x0a, 0x09, 0x01, 0x07, 0x00, 0xfd,
                    0x0c, 0x00, 0x00, 0x0b
                ]))
            }
        };
    } catch (error) {
        return {
            supported: false,
            error: error.message
        };
    }
};
