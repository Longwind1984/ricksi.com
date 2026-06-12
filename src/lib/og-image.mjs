// 构建时 OG 分享图：satori（文字转矢量路径，环境无关）+ resvg 光栅化
// v2「钴蓝之夜」模板：钴蓝渐变 + 玻璃卡 + 标题 + 群青类别 chip + 域名（字体 MiSans）
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const fontRegular = fs.readFileSync(path.resolve('assets-src/fonts/MiSans-Regular.ttf'));
const fontSemibold = fs.readFileSync(path.resolve('assets-src/fonts/MiSans-Semibold.ttf'));
const fontNoto = fs.readFileSync(path.resolve('assets-src/fonts/NotoSansCJKsc-Medium.otf')); // MiSans v1 缺字兜底

export async function renderOg({ title, sub, kind }) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(160deg, #16266A 0%, #0B1538 55%, #070D20 100%)',
          fontFamily: 'MiSans',
          position: 'relative',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                padding: '56px 64px',
                borderRadius: '32px',
                border: '1.5px solid rgba(255,255,255,0.28)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.05))',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            padding: '8px 22px',
                            borderRadius: '999px',
                            border: '1.5px solid rgba(120,168,255,0.7)',
                            background: 'rgba(54,112,238,0.32)',
                            color: '#FFFFFF',
                            fontSize: '24px',
                          },
                          children: kind,
                        },
                      },
                      sub
                        ? {
                            type: 'div',
                            props: {
                              style: { display: 'flex', color: 'rgba(235,242,250,0.6)', fontSize: '24px' },
                              children: sub,
                            },
                          }
                        : null,
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      color: '#FFFFFF',
                      fontSize: title.length > 18 ? '58px' : '72px',
                      fontWeight: 600,
                      lineHeight: 1.35,
                    },
                    children: title,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '52px',
                left: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                color: 'rgba(235,242,250,0.7)',
                fontSize: '26px',
              },
              children: 'ricksi.com · 司豪杰 Rick Si · AI 产品经理',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'MiSans', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'MiSans', data: fontSemibold, weight: 600, style: 'normal' },
        { name: 'Noto Sans SC', data: fontNoto, weight: 500, style: 'normal' },
      ],
    }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return png;
}
