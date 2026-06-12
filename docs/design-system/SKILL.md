---
name: ricksi-design
description: Use this skill to generate well-branded interfaces and assets for ricksi.com (Rick Si's Liquid Glass personal workbench), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key rules of this brand (details in README.md):
- Everything is cobalt-tinted translucent glass over the single fixed snow-mountain photo (darkened 10→62%, sun-glow kept alive). Two colors, both from the photo: 群青 ultramarine oklch(0.58 0.20 263) for actions only; 太阳金 sun gold oklch(0.85 0.13 86) for small-text data emphasis only — never buttons, never big numbers. Capsules are 999px; the house easing is cubic-bezier(.3,1.4,.4,1); hover brightens, press scales down and brightens — glass never darkens.
- Simplified Chinese copy with mono-English echoes; every number needs a source; missing data gets the dashed gold 样例数据 badge, never faked. Provenance follows the 人机光谱: 色温 = 人↔机 (实测·金 → 共创·青 → AI 整理·紫); dashed border = unverified.
- Type: MiSans for all UI text (CDN, free), Geist Mono for data/labels/stamps, 霞鹜文楷 only for reading quotes (人的声音). No emoji, no icon fonts — 1.8-stroke inline SVGs and typographic glyphs (→ ↗ ✕) only.
