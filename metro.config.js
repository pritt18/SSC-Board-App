const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const https = require('https');


const config = getDefaultConfig(__dirname);

// Add support for additional file types
if (!config.resolver.assetExts.includes('srt')) {
  config.resolver.assetExts.push('srt');
}
if (!config.resolver.assetExts.includes('pdf')) {
  config.resolver.assetExts.push('pdf');
}
if (!config.resolver.assetExts.includes('enc')) {
  config.resolver.assetExts.push('enc');
}

// Bundled pdf.js library source files (used for fully-offline in-app
// PDF viewing) are stored with a .txt extension so Metro treats them
// as plain-text assets instead of trying to parse them as JS modules.
if (!config.resolver.assetExts.includes('txt')) {
  config.resolver.assetExts.push('txt');
}

// Required for expo-sqlite to run in the browser (web build) — it loads
// a WASM SQLite engine and needs SharedArrayBuffer, which browsers only
// allow on "cross-origin isolated" pages (hence the COEP/COOP headers).
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const withOriginal = originalEnhanceMiddleware
    ? originalEnhanceMiddleware(middleware, metroServer)
    : middleware;

  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // 1. Serve bundled PDF.js library script for browser
    if (req.url === '/pdfjs/pdf.min.js') {
      const filePath = path.join(__dirname, 'assets', 'pdfjs', 'pdf.min.js.txt');
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 2. Serve bundled PDF.js worker script for browser
    if (req.url === '/pdfjs/pdf.worker.min.js') {
      const filePath = path.join(__dirname, 'assets', 'pdfjs', 'pdf.worker.min.js.txt');
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 3. Serve PDF file stream for web viewer
    if (req.url.startsWith('/api/pdf-content')) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost:8081');
        let fileParam = parsedUrl.searchParams.get('file') || '';
        fileParam = decodeURIComponent(fileParam);

        if (fileParam.startsWith('file:///')) {
          fileParam = fileParam.replace('file:///', '');
        }

        const candidatePaths = [
          fileParam,
          path.resolve(fileParam),
          path.join('E:/SoftspireSolution/Document/ssc book content', fileParam),
          path.join(__dirname, 'assets', 'pdfs', fileParam),
        ];

        let foundPath = null;
        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            foundPath = candidate;
            break;
          }
        }

        if (foundPath) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return fs.createReadStream(foundPath).pipe(res);
        } else {
          console.warn('PDF not found at candidate paths:', fileParam);
          res.statusCode = 404;
          return res.end('PDF file not found');
        }
      } catch (err) {
        console.error('Error serving PDF:', err);
        res.statusCode = 500;
        return res.end('Internal server error');
      }
    }

    // 4. Serve video file stream with HTTP 206 Partial Content (Range requests)
    if (req.url.startsWith('/api/video-content')) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost:8081');
        let fileParam = parsedUrl.searchParams.get('file') || '';
        fileParam = decodeURIComponent(fileParam);

        if (fileParam.startsWith('file:///')) {
          fileParam = fileParam.replace('file:///', '');
        }

        const candidatePaths = [
          fileParam,
          path.resolve(fileParam),
          path.join(__dirname, 'assets', 'videos', fileParam),
          path.join('E:/SoftspireSolution', fileParam),
        ];

        let foundPath = null;
        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            foundPath = candidate;
            break;
          }
        }

        if (foundPath) {
          const stat = fs.statSync(foundPath);
          const fileSize = stat.size;
          const range = req.headers.range;

          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Accept-Ranges', 'bytes');

          if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4',
            });
            return fs.createReadStream(foundPath, { start, end }).pipe(res);
          } else {
            res.writeHead(200, {
              'Content-Length': fileSize,
              'Content-Type': 'video/mp4',
            });
            return fs.createReadStream(foundPath).pipe(res);
          }
        } else {
          console.warn('Video not found at candidate paths:', fileParam);
          res.statusCode = 404;
          return res.end('Video file not found');
        }
      } catch (err) {
        console.error('Error serving Video:', err);
        res.statusCode = 500;
        return res.end('Internal server error');
      }
    }

    // 5. Proxy Google Drive video stream with Range support and CORS/CORP headers
    if (req.url.startsWith('/api/drive-video')) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost:8081');
        const driveId = parsedUrl.searchParams.get('id');
        if (!driveId) {
          res.statusCode = 400;
          return res.end('Missing drive id');
        }

        const googleUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download`;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        if (req.headers.range) {
          headers['range'] = req.headers.range;
        }

        const handleStream = (streamRes) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Content-Type', streamRes.headers['content-type'] || 'video/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          if (streamRes.headers['content-range']) {
            res.setHeader('Content-Range', streamRes.headers['content-range']);
          }
          if (streamRes.headers['content-length']) {
            res.setHeader('Content-Length', streamRes.headers['content-length']);
          }
          res.writeHead(streamRes.statusCode || 200);
          streamRes.pipe(res);
        };

        const googleReq = https.get(googleUrl, { headers }, (googleRes) => {
          if (googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
            const redirReq = https.get(googleRes.headers.location, { headers }, (redirRes) => {
              handleStream(redirRes);
            });
            redirReq.on('error', (err) => {
              console.error('Drive redirect stream error:', err);
              if (!res.headersSent) {
                res.statusCode = 502;
                res.end('Error fetching redirect stream');
              }
            });
            return;
          }

          handleStream(googleRes);
        });

        googleReq.on('error', (err) => {
          console.error('Drive video stream error:', err);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end('Error fetching video from drive');
          }
        });
        return;
      } catch (err) {
        console.error('Error in /api/drive-video:', err);
        res.statusCode = 500;
        return res.end('Internal server error');
      }
    }



    return withOriginal(req, res, next);
  };
};

module.exports = config;
