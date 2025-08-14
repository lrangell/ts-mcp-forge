# Changelog

## [0.6.0](https://github.com/lrangell/ts-mcp-forge/compare/v0.5.1...v0.6.0) (2025-08-14)

### Features

* add configurable logging to Fastify transports ([4218cdd](https://github.com/lrangell/ts-mcp-forge/commit/4218cdd80cdfeb6e9aea733e3f3e4e5d186a9794))
* implement comprehensive MCP protocol compliance framework ([e966ec9](https://github.com/lrangell/ts-mcp-forge/commit/e966ec99db2d3397fffa4bf91da538c9baa28a1f))

### Style

* fix changelog formatting ([8e1aeb0](https://github.com/lrangell/ts-mcp-forge/commit/8e1aeb01468fa23824d39b451afa11b2e1316dbc))

### Refactoring

* adopt neverthrow Railway Oriented Programming patterns ([78172a3](https://github.com/lrangell/ts-mcp-forge/commit/78172a329fe10709071feb1358a31d9dbda29f14))

### Tests

* add comprehensive MCP protocol compliance test suite ([e75935f](https://github.com/lrangell/ts-mcp-forge/commit/e75935f1fd0df082486fae2e357d2b5b32ff615b))

## [0.5.1](https://github.com/lrangell/ts-mcp-forge/compare/v0.5.0...v0.5.1) (2025-08-13)

### Refactoring

- implement lazy initialization and simplify Result handling ([b885974](https://github.com/lrangell/ts-mcp-forge/commit/b8859744b37bb2e0194a42537f66cd45f828f0a3))

## [0.5.0](https://github.com/lrangell/ts-mcp-forge/compare/v0.4.0...v0.5.0) (2025-08-13)

### Features

- add dynamic prompt and resource registration support ([f618090](https://github.com/lrangell/ts-mcp-forge/commit/f618090a39471396567f339742ddc1444e8ab194))

### Refactoring

- add validation factory for router ([f072a18](https://github.com/lrangell/ts-mcp-forge/commit/f072a186b4633bf358453e89e2c551019f8748b4))
- improve transport layer with base class and neverthrow patterns ([5746881](https://github.com/lrangell/ts-mcp-forge/commit/574688100f7f72ce9939ce8642ff6ce9c13e3b85))

## [0.4.0](https://github.com/lrangell/ts-mcp-forge/compare/v0.3.0...v0.4.0) (2025-08-13)

### Features

- add advanced resources example ([5d08f35](https://github.com/lrangell/ts-mcp-forge/commit/5d08f355cadc3bc5ae4309239b9b319a5acccd85))
- add resource subscriptions and notifications system ([928a40d](https://github.com/lrangell/ts-mcp-forge/commit/928a40dd78e80f35eb48acdf097d7553a2481e60))

### Maintenance

- document decorator when building ([a1a3e22](https://github.com/lrangell/ts-mcp-forge/commit/a1a3e223774f09de9f3bcddea81a1f3dfb456b81))
- update changelog for v0.3.0 ([48f9162](https://github.com/lrangell/ts-mcp-forge/commit/48f916261dd1ce1f65b36644883477bc644cf2ba))
- update dependencies and test infrastructure ([806c436](https://github.com/lrangell/ts-mcp-forge/commit/806c436ffd1eb599b92c5bb0fccc904a751d04dc))
- update readme ([e04633f](https://github.com/lrangell/ts-mcp-forge/commit/e04633fbb2832157cc4946c63bef475e645ba7df))

### Refactoring

- implement Railway Oriented Programming patterns throughout codebase ([142ad77](https://github.com/lrangell/ts-mcp-forge/commit/142ad77e7255fec8d7dd48db35731386f7bfce3d))
- update transport layer for notification support ([8c20a39](https://github.com/lrangell/ts-mcp-forge/commit/8c20a3923d3f9dcc65752dfbd0d49cf67b0bbfc4))

## [0.3.0](https://github.com/lrangell/ts-mcp-forge/compare/v0.2.0...v0.3.0) (2025-08-10)

### Features

- make Tool decorator name parameter optional ([962de69](https://github.com/lrangell/ts-mcp-forge/commit/962de690763e64c019beb5c6214c1591cfcd2347))

## 0.2.0 (2025-08-10)

### Features

- initial release of ts-mcp-forge ([34ad100](https://github.com/lrangell/ts-mcp-forge/commit/34ad10087e25b476c25e5e8194746f4722ffd179))

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-29

### Added

- Initial release of ts-mcp-forge
- Decorator-based API for defining MCP servers
- Support for Tools, Resources, and Prompts
- TypeScript support with full type safety
- Functional error handling with neverthrow
- Transport layer support (stdio, SSE, HTTP)
- Comprehensive test suite
- Example calculator server
- Full documentation and API reference
