# Repository instructions

This is an original-code-only public project. These rules apply to commits,
pushes, npm packages, Releases, assets, CI artifacts and documentation.

- Never publish user-imported dictionaries, PDFs, OCR, scans, definitions,
  examples, databases, generated reports, chat histories or credentials.
- Keep private material under ignored source/, data/, tmp/, cache/ or logs/,
  or outside the checkout. Never move, overwrite or delete an owner's original
  PDF to clean the repository.
- Tests must use independently authored synthetic fixtures. Do not make public
  tests depend on a local commercial dictionary or copy its example sentences.
- Generated review/evaluation reports go to data/private/reports/, never docs/.
- MIT covers original project code/documentation only. Do not imply publisher
  authorization, endorsement or a license to imported data.
- Before each commit/push/release, inspect staged contents and reachable history,
  run python scripts/audit_public.py and appropriate tests, and review package or
  release assets separately. Automated scanning does not replace content review.
- If private data entered local history, preserve a private backup and clean the
  history before publication. Inspect existing remotes before altering them;
  never force-push over unknown remote content.
- Preserve existing Harness/QQ configuration, persona and memory. Avoid changing
  installed third-party code without explicit user authorization. Never send
  test messages to production groups without permission.
