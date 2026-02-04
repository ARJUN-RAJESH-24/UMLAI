/**
 * PlantUML Encoder for browser
 * Encodes PlantUML code to URL-safe format for rendering
 */

(function (global) {
    'use strict';

    // Encoding table for PlantUML's custom base64
    const ENCODE_TABLE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

    /**
     * Encode a 6-bit value to PlantUML's custom base64
     */
    function encode6bit(b) {
        return ENCODE_TABLE.charAt(b & 0x3F);
    }

    /**
     * Append 3 bytes to encoded string
     */
    function append3bytes(b1, b2, b3) {
        const c1 = b1 >> 2;
        const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
        const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
        const c4 = b3 & 0x3F;
        return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
    }

    /**
     * Encode bytes to PlantUML format
     */
    function encodeBytes(data) {
        let result = '';
        const len = data.length;

        for (let i = 0; i < len; i += 3) {
            if (i + 2 < len) {
                result += append3bytes(data[i], data[i + 1], data[i + 2]);
            } else if (i + 1 < len) {
                result += append3bytes(data[i], data[i + 1], 0);
            } else {
                result += append3bytes(data[i], 0, 0);
            }
        }

        return result;
    }

    /**
     * Deflate compress using pako library (loaded dynamically if needed)
     */
    async function deflate(str) {
        // Convert string to UTF-8 bytes
        const encoder = new TextEncoder();
        const data = encoder.encode(str);

        // Use CompressionStream API if available
        if (typeof CompressionStream !== 'undefined') {
            const cs = new CompressionStream('deflate-raw');
            const writer = cs.writable.getWriter();
            writer.write(data);
            writer.close();

            const reader = cs.readable.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            return result;
        }

        // Fallback: use pako if CompressionStream not available
        if (typeof pako !== 'undefined') {
            return pako.deflateRaw(data, { level: 9 });
        }

        // Last resort: no compression, just encode
        return data;
    }

    /**
     * Encode PlantUML code to URL format
     */
    async function encode(plantUmlCode) {
        const compressed = await deflate(plantUmlCode);
        return encodeBytes(compressed);
    }

    /**
     * Get PlantUML server URL for rendering
     */
    function getServerUrl(encoded, format = 'svg') {
        // Using official PlantUML server
        return `https://www.plantuml.com/plantuml/${format}/~1${encoded}`;
    }

    /**
     * Encode and get render URL
     */
    async function getUrl(plantUmlCode, format = 'svg') {
        const encoded = await encode(plantUmlCode);
        return getServerUrl(encoded, format);
    }

    // Export
    global.PlantUMLEncoder = {
        encode,
        getUrl,
        getServerUrl
    };

})(typeof window !== 'undefined' ? window : global);
