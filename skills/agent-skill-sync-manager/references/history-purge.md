# Purging leaked content from a pushed repo

Only when the user asks. This rewrites every commit and needs a force push.

1. Back up: `git clone --mirror <repo> <scratch>/backup.git`.
2. Write the rules:
   - `replace.txt`: one `literal==>replacement` per line. Prefix `regex:` for a pattern, e.g. `regex:\n- removed-skill\n==>\n` drops a README list line.
   - `mailmap`: `Name <personal@email> <company@email>` rewrites author and committer.
   - Paths to drop entirely: `--path <dir> --invert-paths`.
3. Record `git rev-parse HEAD^{tree}`, then run:
   `git filter-repo --force --path <dir> --invert-paths --replace-text replace.txt --mailmap mailmap`
   Add `--replace-message msg.txt` when commit subjects leak too. Commits left empty are dropped.
4. Verify: the HEAD tree hash is unchanged if HEAD was already clean, and `scripts/scan-sensitive.sh <repo> --history` prints `clean`.
5. filter-repo removes `origin`. Add it back with the personal remote, then run
   `git push --force-with-lease=main:<old remote sha, full 40 chars> origin main`.
6. Tell the user: GitHub can still serve old commits by SHA until GitHub Support purges its cache, other clones keep the old history, and the backup holds the leaked content until deleted.
