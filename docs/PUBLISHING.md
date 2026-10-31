# Public release policy

This policy applies to every commit, push, package publish, Release and attachment.

- Publish original source, generic import/build tools, schemas, documentation and independently authored synthetic tests only.
- Never publish third-party PDFs, scans, OCR, dictionary definitions/examples, imported databases, derived datasets, evaluation snapshots containing imported excerpts, credentials, personal paths, group histories or user memory.
- Keep source/, data/, tmp/, cache/, logs/, .venv/ and node_modules/ private. The original PDF may remain where its owner placed it. Never move or delete it as part of cleanup.
- Run git status, git ls-files, git diff --cached and python scripts/audit_public.py. Read every proposed file; filename filters alone do not establish safe content.
- The audit checks the Git index and all reachable history. If prohibited data entered local commits, back up that history privately, rewrite it before first push, remove old public refs and verify again. Never force-push over an existing remote without inspecting its content and obtaining suitable authorization.
- Review npm pack --dry-run output and Release assets separately. Never use blanket uploads of the working directory. No imported dictionary is an allowed release asset.
- An automated scanner can miss unknown secrets or paraphrased copyrighted data. Manual review remains required. CI adds a basic guard; it cannot prove copyright ownership.

Local pre-public history backups and import reports are deliberately not linked in public Git history. A future community dataset needs independent author contributions, clear provenance and its own explicit data license; do not relabel a digitized publication as community-authored data.
