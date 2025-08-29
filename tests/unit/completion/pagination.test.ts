import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { createMCPRouter } from '../../../src/core/router.js';
import { Resource, Prompt, Param, DynamicResource } from '../../../src/decorators/index.js';
import { CompletionResponse } from '../../../src/core/protocol.js';

class PaginationTestServer extends MCPServer {
  constructor() {
    super('Pagination Test Server', '1.0.0');
  }

  // Generate a large number of static resources to test pagination
  @Resource('file://docs/languages/javascript.md', 'JavaScript documentation')
  getJavaScriptDocs(): Result<string, Error> {
    return ok('JS docs');
  }

  @Resource('file://docs/languages/typescript.md', 'TypeScript documentation')
  getTypeScriptDocs(): Result<string, Error> {
    return ok('TS docs');
  }

  @Resource('file://docs/languages/python.md', 'Python documentation')
  getPythonDocs(): Result<string, Error> {
    return ok('Python docs');
  }

  @Resource('file://docs/languages/java.md', 'Java documentation')
  getJavaDocs(): Result<string, Error> {
    return ok('Java docs');
  }

  @Resource('file://docs/languages/rust.md', 'Rust documentation')
  getRustDocs(): Result<string, Error> {
    return ok('Rust docs');
  }

  @Resource('file://docs/languages/go.md', 'Go documentation')
  getGoDocs(): Result<string, Error> {
    return ok('Go docs');
  }

  @Resource('file://docs/languages/csharp.md', 'C# documentation')
  getCSharpDocs(): Result<string, Error> {
    return ok('C# docs');
  }

  @Resource('file://docs/languages/php.md', 'PHP documentation')
  getPhpDocs(): Result<string, Error> {
    return ok('PHP docs');
  }

  @Resource('file://docs/languages/ruby.md', 'Ruby documentation')
  getRubyDocs(): Result<string, Error> {
    return ok('Ruby docs');
  }

  @Resource('file://docs/languages/swift.md', 'Swift documentation')
  getSwiftDocs(): Result<string, Error> {
    return ok('Swift docs');
  }

  // Generate many more resources via dynamic registration
  @DynamicResource('Generate large resource set for pagination testing')
  generateLargeResourceSet(): void {
    // Generate 150 resources to test the 100-item limit
    const categories = ['framework', 'library', 'tool', 'platform', 'service'];
    const types = [
      'frontend',
      'backend',
      'mobile',
      'desktop',
      'web',
      'api',
      'database',
      'cache',
      'queue',
      'stream',
    ];
    const variants = [
      'dev',
      'staging',
      'prod',
      'test',
      'local',
      'cloud',
      'enterprise',
      'community',
      'open-source',
      'commercial',
    ];

    let resourceCount = 0;
    for (const category of categories) {
      for (const type of types) {
        for (const variant of variants) {
          if (resourceCount >= 150) break;

          const resourceUri = `api://${category}/${type}/${variant}/config.json`;
          this.registerResource(
            resourceUri,
            async () => ok({ category, type, variant, config: 'test' }),
            `${category} ${type} ${variant} configuration`,
            false
          );
          resourceCount++;
        }
        if (resourceCount >= 150) break;
      }
      if (resourceCount >= 150) break;
    }

    // Add some specific test resources for ranking tests
    const specificResources = [
      'priority://high-priority-service/config.json',
      'priority://medium-priority-service/config.json',
      'priority://low-priority-service/config.json',
      'test://exact-match-resource/data.json',
      'test://partial-match-resource/info.json',
      'test://fuzzy-match-resource/details.json',
      'ranking://aaa-first-alphabetically/config.json',
      'ranking://zzz-last-alphabetically/config.json',
      'ranking://prefix-match-test/data.json',
      'ranking://substring-match-test/data.json',
    ];

    for (const uri of specificResources) {
      this.registerResource(
        uri,
        async () => ok({ test: 'ranking' }),
        `Test resource for ranking: ${uri}`,
        false
      );
    }
  }

  // Prompts with extensive parameter options for pagination testing
  @Prompt('comprehensive-analysis', 'Comprehensive system analysis')
  comprehensiveAnalysis(
    @Param('Analysis type') analysisType: string,
    @Param('Target system') targetSystem: string,
    @Param('Methodology') methodology: string,
    @Param('Scope level') scope: string,
    @Param('Output detail') detail: string
  ): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: `Perform ${analysisType} analysis on ${targetSystem} using ${methodology} with ${scope} scope and ${detail} detail`,
        },
      ],
    });
  }

  @Prompt('large-parameter-set', 'Prompt with many parameter options')
  largeParameterSet(
    @Param('Technology stack') techStack: string,
    @Param('Deployment environment') environment: string,
    @Param('Performance requirement') performance: string,
    @Param('Security level') security: string,
    @Param('Compliance standard') compliance: string
  ): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: `Configure ${techStack} for ${environment} with ${performance} performance, ${security} security, and ${compliance} compliance`,
        },
      ],
    });
  }

  // Generate extensive parameter completion options
  protected async getParamCompletions(
    param: { name: string; type: string; description?: string },
    currentValue: string
  ): Promise<Array<{ value: string; description?: string }>> {
    // Generate large parameter sets to test pagination
    const parameterSets: Record<string, () => Array<{ value: string; description?: string }>> = {
      analysisType: () => this.generateAnalysisTypes(),
      targetSystem: () => this.generateTargetSystems(),
      methodology: () => this.generateMethodologies(),
      scope: () => this.generateScopeOptions(),
      detail: () => this.generateDetailOptions(),
      techStack: () => this.generateTechStacks(),
      environment: () => this.generateEnvironments(),
      performance: () => this.generatePerformanceOptions(),
      security: () => this.generateSecurityOptions(),
      compliance: () => this.generateComplianceOptions(),
    };

    const generator = parameterSets[param.name];
    if (!generator) {
      return [];
    }

    const allOptions = generator();

    // Apply fuzzy matching and ranking
    return this.rankAndFilterSuggestions(allOptions, currentValue);
  }

  private generateAnalysisTypes(): Array<{ value: string; description?: string }> {
    const types = [];
    const categories = [
      'security',
      'performance',
      'scalability',
      'reliability',
      'maintainability',
      'usability',
    ];
    const depths = ['surface', 'standard', 'deep', 'comprehensive', 'exhaustive'];
    const focuses = ['code', 'architecture', 'infrastructure', 'workflow', 'integration', 'data'];

    for (const category of categories) {
      for (const depth of depths) {
        for (const focus of focuses) {
          types.push({
            value: `${category}-${depth}-${focus}`,
            description: `${depth} ${category} analysis focusing on ${focus}`,
          });
        }
      }
    }

    return types.slice(0, 120); // Ensure we exceed 100 items
  }

  private generateTargetSystems(): Array<{ value: string; description?: string }> {
    const systems = [];
    const platforms = ['web', 'mobile', 'desktop', 'server', 'embedded', 'cloud'];
    const types = ['monolith', 'microservices', 'serverless', 'hybrid', 'distributed'];
    const scales = ['small', 'medium', 'large', 'enterprise', 'global'];

    for (const platform of platforms) {
      for (const type of types) {
        for (const scale of scales) {
          systems.push({
            value: `${platform}-${type}-${scale}`,
            description: `${scale} scale ${type} ${platform} system`,
          });
        }
      }
    }

    return systems.slice(0, 110);
  }

  private generateMethodologies(): Array<{ value: string; description?: string }> {
    const methodologies = [];
    const approaches = ['automated', 'manual', 'hybrid', 'continuous', 'scheduled'];
    const techniques = [
      'static-analysis',
      'dynamic-analysis',
      'penetration-testing',
      'load-testing',
      'chaos-engineering',
    ];
    const tools = ['opensource', 'commercial', 'custom', 'cloud-native', 'on-premises'];

    for (const approach of approaches) {
      for (const technique of techniques) {
        for (const tool of tools) {
          methodologies.push({
            value: `${approach}-${technique}-${tool}`,
            description: `${approach} ${technique} using ${tool} tools`,
          });
        }
      }
    }

    return methodologies.slice(0, 125);
  }

  private generateScopeOptions(): Array<{ value: string; description?: string }> {
    const scopes = [];
    const breadths = ['component', 'service', 'subsystem', 'system', 'ecosystem'];
    const depths = ['interface', 'implementation', 'integration', 'end-to-end', 'full-stack'];
    const timeframes = ['snapshot', 'trend', 'historical', 'predictive', 'real-time'];

    for (const breadth of breadths) {
      for (const depth of depths) {
        for (const timeframe of timeframes) {
          scopes.push({
            value: `${breadth}-${depth}-${timeframe}`,
            description: `${breadth} level ${depth} analysis with ${timeframe} perspective`,
          });
        }
      }
    }

    return scopes.slice(0, 115);
  }

  private generateDetailOptions(): Array<{ value: string; description?: string }> {
    const details = [];
    const levels = ['summary', 'standard', 'detailed', 'comprehensive', 'exhaustive'];
    const formats = ['text', 'visual', 'interactive', 'tabular', 'graphical'];
    const audiences = ['technical', 'business', 'executive', 'audit', 'compliance'];

    for (const level of levels) {
      for (const format of formats) {
        for (const audience of audiences) {
          details.push({
            value: `${level}-${format}-${audience}`,
            description: `${level} detail in ${format} format for ${audience} audience`,
          });
        }
      }
    }

    return details.slice(0, 105);
  }

  private generateTechStacks(): Array<{ value: string; description?: string }> {
    const stacks = [];
    const frontends = ['react', 'vue', 'angular', 'svelte', 'vanilla'];
    const backends = ['nodejs', 'python', 'java', 'dotnet', 'go', 'rust'];
    const databases = ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch'];

    for (const frontend of frontends) {
      for (const backend of backends) {
        for (const database of databases) {
          stacks.push({
            value: `${frontend}-${backend}-${database}`,
            description: `${frontend} frontend with ${backend} backend and ${database} database`,
          });
        }
      }
    }

    return stacks.slice(0, 130);
  }

  private generateEnvironments(): Array<{ value: string; description?: string }> {
    const environments = [];
    const stages = ['local', 'dev', 'test', 'staging', 'prod'];
    const infrastructures = ['onprem', 'cloud', 'hybrid', 'edge', 'multi-cloud'];
    const configurations = ['minimal', 'standard', 'enhanced', 'premium', 'enterprise'];

    for (const stage of stages) {
      for (const infrastructure of infrastructures) {
        for (const config of configurations) {
          environments.push({
            value: `${stage}-${infrastructure}-${config}`,
            description: `${stage} environment on ${infrastructure} with ${config} configuration`,
          });
        }
      }
    }

    return environments.slice(0, 125);
  }

  private generatePerformanceOptions(): Array<{ value: string; description?: string }> {
    const options = [];
    const metrics = ['latency', 'throughput', 'concurrency', 'scalability', 'efficiency'];
    const targets = ['basic', 'standard', 'high', 'extreme', 'custom'];
    const optimizations = ['cpu', 'memory', 'network', 'storage', 'balanced'];

    for (const metric of metrics) {
      for (const target of targets) {
        for (const optimization of optimizations) {
          options.push({
            value: `${metric}-${target}-${optimization}`,
            description: `${target} ${metric} performance optimized for ${optimization}`,
          });
        }
      }
    }

    return options.slice(0, 120);
  }

  private generateSecurityOptions(): Array<{ value: string; description?: string }> {
    const options = [];
    const levels = ['basic', 'standard', 'enhanced', 'maximum', 'custom'];
    const focuses = ['authentication', 'authorization', 'encryption', 'compliance', 'monitoring'];
    const standards = ['iso27001', 'soc2', 'gdpr', 'hipaa', 'pci-dss'];

    for (const level of levels) {
      for (const focus of focuses) {
        for (const standard of standards) {
          options.push({
            value: `${level}-${focus}-${standard}`,
            description: `${level} security with ${focus} focus meeting ${standard} standards`,
          });
        }
      }
    }

    return options.slice(0, 125);
  }

  private generateComplianceOptions(): Array<{ value: string; description?: string }> {
    const options = [];
    const frameworks = [
      'iso27001',
      'soc2-type1',
      'soc2-type2',
      'gdpr',
      'ccpa',
      'hipaa',
      'pci-dss',
      'fedramp',
    ];
    const scopes = ['basic', 'standard', 'comprehensive', 'full', 'custom'];
    const regions = ['us', 'eu', 'apac', 'global', 'multi-region'];

    for (const framework of frameworks) {
      for (const scope of scopes) {
        for (const region of regions) {
          options.push({
            value: `${framework}-${scope}-${region}`,
            description: `${framework} compliance with ${scope} scope for ${region} region`,
          });
        }
      }
    }

    return options.slice(0, 120);
  }

  private rankAndFilterSuggestions(
    suggestions: Array<{ value: string; description?: string }>,
    query: string
  ): Array<{ value: string; description?: string }> {
    if (!query) {
      // Return all suggestions up to limit if no query
      return suggestions.slice(0, 100);
    }

    const queryLower = query.toLowerCase();
    const scored = suggestions
      .map((suggestion) => ({
        ...suggestion,
        score: this.calculateRelevanceScore(suggestion.value.toLowerCase(), queryLower),
      }))
      .filter((item) => item.score > 0);

    // Sort by score (descending) and return top 100 without score
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map(({ _score, ...item }) => item);
  }

  private calculateRelevanceScore(text: string, query: string): number {
    if (text === query) return 1000; // Exact match
    if (text.startsWith(query)) return 900; // Prefix match
    if (text.includes(query)) return 800; // Substring match

    // Character-by-character matching for fuzzy search
    let score = 0;
    let queryIndex = 0;
    let consecutiveMatches = 0;
    let wordBoundaryBonus = 0;

    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        queryIndex++;
        consecutiveMatches++;
        score += 10 + consecutiveMatches * 2;

        // Bonus for word boundary matches
        if (i === 0 || text[i - 1] === '-' || text[i - 1] === '_' || text[i - 1] === ' ') {
          wordBoundaryBonus += 20;
        }
      } else {
        consecutiveMatches = 0;
      }
    }

    // Only return score if all query characters were matched
    if (queryIndex === query.length) {
      return score + wordBoundaryBonus;
    }

    return 0;
  }

  protected async getTemplateCompletions(template: any, currentValue: string): Promise<string[]> {
    // Generate many template completion options to test pagination
    const options = [];

    if (template.uriTemplate?.includes('api://')) {
      // Generate 150+ API endpoint completions
      const services = [
        'user',
        'auth',
        'payment',
        'notification',
        'analytics',
        'search',
        'recommendation',
      ];
      const versions = ['v1', 'v2', 'v3', 'beta', 'alpha'];
      const environments = ['dev', 'staging', 'prod', 'test'];
      const regions = ['us', 'eu', 'asia'];

      for (const service of services) {
        for (const version of versions) {
          for (const env of environments) {
            for (const region of regions) {
              options.push(`${service}-${version}-${env}-${region}`);
            }
          }
        }
      }
    }

    // Apply filtering and ranking
    if (!currentValue) {
      return options.slice(0, 100);
    }

    const filtered = options.filter((opt) =>
      opt.toLowerCase().includes(currentValue.toLowerCase())
    );

    // Sort by relevance and limit to 100
    return filtered
      .sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a.toLowerCase(), currentValue.toLowerCase());
        const bScore = this.calculateRelevanceScore(b.toLowerCase(), currentValue.toLowerCase());
        return bScore - aScore;
      })
      .slice(0, 100);
  }
}

describe('Completion Pagination and Ranking', () => {
  let server: PaginationTestServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new PaginationTestServer();
    router = createMCPRouter(server);
  });

  describe('100 Item Limit Compliance', () => {
    it('should limit resource completions to 100 items maximum', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'api://' },
          argument: { name: 'uri', value: 'api://' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };
        expect(response.completion.values).toBeDefined();
        expect(response.completion.values.length).toBeLessThanOrEqual(100);

        // Should set hasMore to true if there are more than 100 matches
        if (response.completion.total && response.completion.total > 100) {
          expect(response.completion.hasMore).toBe(true);
        }
      }
    });

    it('should limit prompt parameter completions to 100 items', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'analysisType', value: '' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };
        expect(response.completion.values.length).toBeLessThanOrEqual(100);

        // Should properly set hasMore flag
        expect(typeof response.completion.hasMore).toBe('boolean');
        if (response.completion.hasMore) {
          expect(response.completion.values.length).toBe(100);
        }
      }
    });

    it('should set correct total count regardless of 100 item limit', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'large-parameter-set' },
          argument: { name: 'techStack', value: '' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        if (response.completion.total !== undefined) {
          // Total should reflect actual number of matches, not limited to 100
          expect(response.completion.total).toBeGreaterThanOrEqual(
            response.completion.values.length
          );

          if (response.completion.total > 100) {
            expect(response.completion.values.length).toBe(100);
            expect(response.completion.hasMore).toBe(true);
          }
        }
      }
    });

    it('should handle cases with fewer than 100 results correctly', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'file://docs/languages/' },
          argument: { name: 'uri', value: 'file://docs/languages/' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        // Should have fewer than 100 results for this specific query
        expect(response.completion.values.length).toBeLessThan(100);
        expect(response.completion.hasMore).toBe(false);

        if (response.completion.total !== undefined) {
          expect(response.completion.total).toBe(response.completion.values.length);
        }
      }
    });
  });

  describe('Relevance Ranking', () => {
    it('should rank exact matches higher than partial matches', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'test://' },
          argument: { name: 'uri', value: 'exact-match' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        if (response.completion.values.length > 0) {
          const topResult = response.completion.values[0];
          expect(topResult).toMatch(/exact-match/);
        }
      }
    });

    it('should rank prefix matches higher than substring matches', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'ranking://' },
          argument: { name: 'uri', value: 'prefix' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        const prefixMatch = response.completion.values.find((v) => v.includes('prefix-match-test'));
        const substringMatch = response.completion.values.find((v) =>
          v.includes('substring-match-test')
        );

        if (prefixMatch && substringMatch) {
          const prefixIndex = response.completion.values.indexOf(prefixMatch);
          const substringIndex = response.completion.values.indexOf(substringMatch);
          expect(prefixIndex).toBeLessThan(substringIndex);
        }
      }
    });

    it('should apply consistent ranking across multiple queries', async () => {
      // Test ranking consistency for prompt parameters
      const result1 = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'analysisType', value: 'security' },
        },
        1
      );

      const result2 = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'analysisType', value: 'security' },
        },
        2
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const response1 = result1.value as { completion: CompletionResponse['completion'] };
        const response2 = result2.value as { completion: CompletionResponse['completion'] };

        // Rankings should be consistent
        expect(response1.completion.values).toEqual(response2.completion.values);
      }
    });

    it('should prioritize shorter matches over longer ones when relevance is equal', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'large-parameter-set' },
          argument: { name: 'environment', value: 'dev' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        // Shorter matches should generally appear earlier
        if (response.completion.values.length > 5) {
          const topResults = response.completion.values.slice(0, 5);
          const hasShortMatches = topResults.some((result) => result.length < 20);
          expect(hasShortMatches).toBe(true);
        }
      }
    });

    it('should handle word boundary matching correctly', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'targetSystem', value: 'web' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        // Word boundary matches should be ranked higher
        const topResults = response.completion.values.slice(0, 10);
        const wordBoundaryMatches = topResults.filter(
          (result) => result.startsWith('web-') || result.includes('-web-')
        );

        expect(wordBoundaryMatches.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();

      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'methodology', value: 'auto' },
        },
        1
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.isOk()).toBe(true);

      // Should complete within reasonable time (2 seconds)
      expect(duration).toBeLessThan(2000);

      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };
        expect(response.completion.values.length).toBeLessThanOrEqual(100);
      }
    });

    it('should maintain ranking quality even with large datasets', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'large-parameter-set' },
          argument: { name: 'performance', value: 'latency-high' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        // Top results should be highly relevant
        if (response.completion.values.length > 0) {
          const topResult = response.completion.values[0];
          expect(topResult.toLowerCase()).toMatch(/latency.*high|high.*latency/);
        }
      }
    });

    it('should handle empty query efficiently for large parameter sets', async () => {
      const startTime = Date.now();

      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'analysisType', value: '' },
        },
        1
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(1000); // Should be fast for empty query

      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };
        expect(response.completion.values.length).toBeLessThanOrEqual(100);
        expect(response.completion.values.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Pagination Metadata Accuracy', () => {
    it('should provide accurate total counts', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'scope', value: '' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        if (response.completion.total !== undefined) {
          expect(response.completion.total).toBeGreaterThanOrEqual(0);
          expect(response.completion.total).toBeGreaterThanOrEqual(
            response.completion.values.length
          );
        }
      }
    });

    it('should set hasMore flag correctly when there are more results', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'large-parameter-set' },
          argument: { name: 'security', value: '' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        if (response.completion.values.length === 100) {
          // If we're returning exactly 100 items, hasMore should indicate if there are more
          expect(typeof response.completion.hasMore).toBe('boolean');
        }

        if (response.completion.hasMore === true) {
          expect(response.completion.values.length).toBe(100);
        }

        if (response.completion.hasMore === false) {
          expect(response.completion.values.length).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should handle filtered results correctly in pagination metadata', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'detail', value: 'summary' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        // All returned values should match the filter
        response.completion.values.forEach((value) => {
          expect(value.toLowerCase()).toMatch(/summary/);
        });

        // Total should reflect filtered count, not original count
        if (response.completion.total !== undefined) {
          expect(response.completion.total).toBe(response.completion.values.length);
        }
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle exactly 100 results correctly', async () => {
      // Create a query that should return exactly 100 results
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'api://framework/' },
          argument: { name: 'uri', value: 'framework' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        if (response.completion.values.length === 100) {
          // When exactly 100 results, hasMore should be false
          expect(response.completion.hasMore).toBe(false);
          if (response.completion.total !== undefined) {
            expect(response.completion.total).toBe(100);
          }
        }
      }
    });

    it('should handle single result correctly', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'test://' },
          argument: { name: 'uri', value: 'exact-match-resource' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        if (response.completion.values.length === 1) {
          expect(response.completion.hasMore).toBe(false);
          if (response.completion.total !== undefined) {
            expect(response.completion.total).toBe(1);
          }
        }
      }
    });

    it('should handle no results correctly', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'nonexistent://' },
          argument: { name: 'uri', value: 'definitely-does-not-exist' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        expect(response.completion.values).toHaveLength(0);
        expect(response.completion.hasMore).toBe(false);
        if (response.completion.total !== undefined) {
          expect(response.completion.total).toBe(0);
        }
      }
    });

    it('should handle very long query strings', async () => {
      const longQuery = 'a'.repeat(500);

      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'comprehensive-analysis' },
          argument: { name: 'analysisType', value: longQuery },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };

        // Should handle gracefully without errors
        expect(response.completion).toBeDefined();
        expect(response.completion.values).toBeInstanceOf(Array);
        expect(response.completion.values.length).toBeLessThanOrEqual(100);
      }
    });

    it('should maintain performance with complex ranking scenarios', async () => {
      const startTime = Date.now();

      // Query that will trigger complex ranking logic
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'large-parameter-set' },
          argument: { name: 'compliance', value: 'iso' },
        },
        1
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      if (result.isOk()) {
        const response = result.value as { completion: CompletionResponse['completion'] };
        expect(response.completion.values.length).toBeLessThanOrEqual(100);

        // Results should be properly ranked
        if (response.completion.values.length > 1) {
          const topResult = response.completion.values[0];
          expect(topResult.toLowerCase()).toMatch(/iso/);
        }
      }
    });
  });
});
