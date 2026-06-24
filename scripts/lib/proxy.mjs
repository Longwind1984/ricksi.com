// 代理可达性探测：本机 Clash（127.0.0.1:7897）不是常开的——人在新加坡等无 GFW 环境时根本不需要它。
// 同步脚本过去把流量写死走代理，代理一关 → git push 与前沿抓取一起挂（见 WORKLOG 6/23 事故）。
// 这里只做一件事：TCP 连一下代理端口，连得上才用，连不上就让调用方走直连。快失败（默认 1.2s）。
import net from 'node:net';

export function isProxyReachable(proxyUrl, timeoutMs = 1200) {
  return new Promise((resolve) => {
    let host, port;
    try {
      const u = new URL(proxyUrl);
      host = u.hostname;
      port = Number(u.port) || (u.protocol === 'https:' ? 443 : 80);
    } catch {
      return resolve(false);
    }
    const sock = net.connect({ host, port });
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

// 可达则原样返回 proxyUrl，否则 null —— 便于 `const proxy = await resolveProxy(candidate)` 后直接用真值判断。
export async function resolveProxy(proxyUrl) {
  if (!proxyUrl) return null;
  return (await isProxyReachable(proxyUrl)) ? proxyUrl : null;
}
