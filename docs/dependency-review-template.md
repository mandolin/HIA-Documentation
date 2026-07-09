# Dependency Review Template

Use this template before adding a new external dependency.

## Package

- Name:
- Requested version/range:
- Dependency type: `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies`
- Declaring package:

## Purpose

- Purpose:
- User-facing behavior enabled:
- Why existing project code or platform APIs are not enough:

## License

- License:
- License family allowed by policy: yes/no
- Restricted license family involved: yes/no
- Source for license check:

## Risk

- Runtime impact:
- Package size or bundle impact:
- Maintenance status:
- Security considerations:
- Secret or credential handling involved: yes/no
- Release or publish automation involved: yes/no
- Alternative packages considered:

## Required Updates

- [ ] Update `package.json`.
- [ ] Update `docs/dependency-license-audit.md`.
- [ ] Update `scripts/check-dependency-license-audit.mjs`.
- [ ] Run `pnpm run license:audit`.
- [ ] Run `pnpm run release:gate`.
