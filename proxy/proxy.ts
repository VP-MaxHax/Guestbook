import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

app.use((req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', req.header('Origin') || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,x-api-key,X-Api-Key,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use('/api', createProxyMiddleware({
  target: process.env.GUESTBOOK_API_TARGET || 'https://e4nq1qffvc.execute-api.eu-north-1.amazonaws.com/prod',
  changeOrigin: true,
  pathRewrite: { '^/api': '' },

  onProxyReq: (proxyReq, req: Request, res: Response) => {
    const hasKey = !!process.env.GUESTBOOK_API_KEY;
    if (hasKey) (proxyReq as any).setHeader('x-api-key', process.env.GUESTBOOK_API_KEY);
    console.log(`[proxy] -> ${req.method} ${req.originalUrl}  forward-x-api-key?: ${hasKey}  proxied-path: ${proxyReq.path || proxyReq.getHeader('host')}`);
  },

  onProxyRes: (proxyRes, req: Request, res: Response) => {
    try {
      (proxyRes as any).headers = (proxyRes as any).headers || {};
      (proxyRes as any).headers['access-control-allow-origin'] = req.header('Origin') || '*';
      (proxyRes as any).headers['access-control-allow-headers'] = 'Content-Type,x-api-key,X-Api-Key,Authorization';
      (proxyRes as any).headers['access-control-allow-methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
      (proxyRes as any).headers['access-control-allow-credentials'] = 'true';
    } catch (e) {
      console.error('[proxy] onProxyRes error:', e);
    }
  },

  onError: (err, req: Request, res: Response) => {
    console.error('[proxy] error:', err && (err as Error).message ? (err as Error).message : err);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    }
    res.end(JSON.stringify({ error: 'proxy_error', message: err && (err as Error).message }));
  },
}));

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Proxy listening http://localhost:${port}`));