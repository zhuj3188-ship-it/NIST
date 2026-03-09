/**
 * QuantumShield — Express 服务器 v2.0
 * 优化: gzip 压缩 · 静态资源缓存 · 错误处理 · 健康检查
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const zlib = require('zlib');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// gzip compression for all responses
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) return next();
  const origSend = res.send.bind(res);
  res.send = function (body) {
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      const raw = typeof body === 'string' ? Buffer.from(body) : body;
      if (raw.length > 1024) {
        try {
          const compressed = zlib.gzipSync(raw);
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          return origSend(compressed);
        } catch { /* fallback */ }
      }
    }
    return origSend(body);
  };
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Powered-By', 'QuantumShield/2.0');
  next();
});

// API 路由
app.use('/api', apiRoutes);

// 生产环境: 提供前端静态文件 with cache headers
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist, {
  maxAge: '1d',
  etag: true,
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[QuantumShield] Server v2.0 running on http://0.0.0.0:${PORT}`);
  console.log(`[QuantumShield] Supported languages: Python, JS/TS, Java, Go, C/C++, Rust, C#, PHP, Ruby, Kotlin, Swift`);
  console.log(`[QuantumShield] ${Object.keys(require('./engine/rules').SCAN_RULES).length} language rule sets loaded`);
});
