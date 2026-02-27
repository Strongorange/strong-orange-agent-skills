# Toolditor Readable Commits

Version 1.0.0

Use this guide when reorganizing local git changes into readable, review-friendly, revert-safe commit stacks.

## Scope

- Large diff splitting into coherent commit groups
- Korean `[type] message` commit convention
- Safe staging and commit list verification
- Lint-staged side-effect handling during commit splitting

## Invariants

1. Do not change implementation behavior while restructuring commits.
2. Stage files explicitly by scope.
3. Keep commit messages concise and Korean.
4. Verify `git log`/`git status` frequently during the split.

## Reference Files

- `references/commit-splitting-playbook.md`
