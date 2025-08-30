import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: z.object({
        // Add any custom frontmatter fields here
        lastUpdated: z.date().optional(),
        author: z.string().optional(),
      }),
    }),
  }),
};
