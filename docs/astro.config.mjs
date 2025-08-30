import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';
import starlightLLMsTxt from 'starlight-llms-txt';
import starlightScrollToTop from 'starlight-scroll-to-top';
import starlightThemeRapide from 'starlight-theme-rapide';

// https://astro.build/config
export default defineConfig({
  site: 'https://lrangell.github.io',
  base: '/ts-mcp-forge',
  integrations: [
    starlight({
      title: 'TS MCP Forge',
      description: 'A TypeScript framework for building MCP servers with decorators',
      social: [
        {
          label: 'GitHub',
          icon: 'github',
          href: 'https://github.com/lrangell/ts-mcp-forge',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/lrangell/ts-mcp-forge/edit/main/docs/',
      },
      plugins: [
        // Apply Rapide theme
        starlightThemeRapide(),
        // Generate TypeDoc documentation
        starlightTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: '../tsconfig.build.json',
          sidebar: {
            label: 'API Reference',
            collapsed: false,
          },
          typeDoc: {
            excludePrivate: true,
            excludeInternal: true,
            excludeProtected: true,
            includeVersion: true,
            readme: 'none',
            githubPages: false,
          },
        }),
        // Generate LLM training file
        starlightLLMsTxt({
          include: ['**/*.md', '**/*.mdx'],
          title: 'TS MCP Forge Documentation',
        }),
        // Add scroll to top button
        starlightScrollToTop({
          showOnScrollDown: true,
          minScrollDistance: 400,
          placement: 'end',
          ariaLabel: 'Scroll to top',
          shape: 'round',
          fadeInOut: true,
        }),
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Core Concepts',
          items: [
            { label: 'Decorators', slug: 'guides/decorators' },
            { label: 'Tools', slug: 'guides/tools' },
            { label: 'Resources', slug: 'guides/resources' },
            { label: 'Prompts', slug: 'guides/prompts' },
            { label: 'Error Handling', slug: 'guides/error-handling' },
            { label: 'Toolkits', slug: 'guides/toolkits' },
          ],
        },
        {
          label: 'Examples',
          items: [
            { label: 'Calculator Server', slug: 'examples/calculator' },
            { label: 'File System Server', slug: 'examples/file-system' },
            { label: 'Weather Server', slug: 'examples/weather' },
          ],
        },
        // TypeDoc sidebar group will be added here by the plugin
        typeDocSidebarGroup,
        {
          label: 'Changelog',
          slug: 'changelog',
        },
      ],
    }),
  ],
});
