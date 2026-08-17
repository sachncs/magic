# Changelog

All notable changes to magic are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Initial workspace bootstrap (npm workspaces, strict TS, gts enforcement)
- `.env.example` documenting all configuration
- LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, STYLE_GUIDE
- Dependabot weekly for npm dependencies
- WS auth via session-scoped tokens
- REST API bearer token middleware
- Browser support policy

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- WS endpoint requires session-scoped token
- REST endpoint requires bearer token when not on localhost
