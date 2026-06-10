import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 博客文章：content/posts/*.md
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tag: z.string().default('随笔'),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// 知识库笔记：content/kb/**（由 scripts/sync-vault.mjs 从 Obsidian 同步生成）
const kb = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/kb' }),
  schema: z
    .object({
      title: z.string(),
      cluster: z.string(),
      created: z.coerce.date().optional(),
      updated: z.coerce.date().optional(),
    })
    .passthrough(),
});

export const collections = { posts, kb };
