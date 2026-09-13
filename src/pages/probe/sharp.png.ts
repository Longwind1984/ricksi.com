// sharp 运行时自检探针（仅用于 preview 部署测试，非生产功能）。
//
// 目的：在 EdgeOne Pages 的 Node cloud-function（cloud-functions/ssr-node）上，
// 用 `curl https://<preview>/probe/sharp.png` 确认 sharp 的 Linux native 二进制
// （@img/sharp-linux-*）能否在运行时被正确加载并出图。
//
// 跨平台风险：sharp 的 native 二进制按平台分包（optionalDependencies）。在 macOS 上本地
// 构建只会带 @img/sharp-darwin-arm64；EdgeOne 的 Linux 运行时需要 @img/sharp-linux-*。
// 这个探针就是用来在真实 Linux 构建/运行环境里验证这一点的——本地构建无法替代。
//
// prerender 由 astro.config 的 astro:route:setup 钩子按平台设置（按需平台上 = false）。
// 失败时把错误以纯文本 500 返回，便于 curl 直接读出原因（而不是空白图/空响应）。
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // 动态 import，确保「sharp 加载失败」本身能被 catch 住并报告，而不是在模块顶层炸掉。
    const { default: sharp } = await import('sharp');

    // 生成一张 64×64 的纯色 PNG（钴蓝），证明 sharp 能解码/编码/输出。
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 31, g: 58, b: 147, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // 探针不缓存——每次 curl 都真正走一遍 sharp。
        'Cache-Control': 'no-store',
        'X-Sharp-Probe': 'ok',
      },
    });
  } catch (err: any) {
    // 把 sharp 加载/出图失败以可读纯文本返回，方便排障（缺 Linux 二进制时通常在这里）。
    const detail =
      (err && (err.stack || err.message)) ? String(err.stack || err.message) : String(err);
    return new Response(
      `sharp probe FAILED\n\nnode: ${process.version}\nplatform: ${process.platform} ${process.arch}\n\n${detail}\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Sharp-Probe': 'fail',
        },
      },
    );
  }
};
