# TS MCP Forge Documentation

This directory contains the documentation for TS MCP Forge, built with Astro Starlight.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Run all checks (format, typecheck, lint, build)
pnpm run check
```

## Documentation Structure

- `src/content/docs/` - Markdown documentation files
- `src/content/docs/api/` - Auto-generated API documentation (TypeDoc)
- `src/styles/` - Custom CSS styles
- `astro.config.mjs` - Astro and Starlight configuration
- `typedoc.json` - TypeDoc configuration

## Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch.

The deployment workflow:

1. Builds the TypeScript library
2. Generates API documentation with TypeDoc
3. Builds the Astro site
4. Deploys to GitHub Pages

## Plugins

This documentation uses several Starlight plugins:

- **starlight-typedoc** - Generates API documentation from TypeScript
- **starlight-llms-txt** - Creates LLM training files at `/llms.txt`
- **starlight-changelogs** - Displays changelog from CHANGELOG.md
- **starlight-contextual-menu** - Adds contextual navigation menu
- **starlight-plugin-icons** - Provides icon support

## Local Development Tips

- The development server hot-reloads on changes
- API documentation is regenerated when TypeScript files change
- Use `pnpm run check` before committing to ensure everything builds
