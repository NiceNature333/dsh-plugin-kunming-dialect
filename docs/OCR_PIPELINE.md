# Local OCR pipeline

Only import material you have the right to use. Preserve the original PDF. The importer reads an existing text layer; it does not run a new full-document OCR pass.

1. Select the file using KUNMING_SOURCE_PDF, or keep one PDF in source/ or the project root.
2. Run inspect_pdf.py. It writes text/geometry to data/raw and selected review images to tmp/pdfs.
3. Inspect the actual layout. Run parse_entries.py with --start-page, --end-page, --printed-offset, --header and --footer as appropriate. The current two-column heuristic is not universal.
4. Review data/entries.jsonl and data/private/reports/OCR_SAMPLES.md. Missing POS, long entries, page continuations and OCR ambiguity need manual inspection. Default parsing does not mean verified linguistic accuracy.
5. Optionally import your own seed JSON with build_seed.py --input. It preserves supplied review metadata and refuses to overwrite an existing seed file. Seed files stay at data/private/dialect_seed.json.
6. Run build_database.py and validate_database.py after closing runtime connections when required by Windows. Existing raw-page/candidate files are prerequisites. Build uses a temporary database and atomic replacement; retain a backup before rebuilding.

Tables: entries, meanings, examples, aliases, source_pages, entry_pages and search_index. Original definitions and pronunciation remain separate from derived meanings/notes. OCR confidence is not invented. Automatic examples and sense splitting are incomplete. Generated IDs are stable within the same parser version, not across arbitrary parser changes.

index_all_entries.py can back up an existing database and extend its reverse index without replacing OCR or review status. includeUnreviewed allows trial retrieval from pending/problem entries, not certification of their correctness. No entire book is sent to the model.

All input publications, images, page text, entries, seeds, reports, evaluation output, caches and databases are private. None are covered by the MIT code license or included in this repository.

Run `scripts/curate_corpus.py` for a non-destructive second pass. It first backs up the database, then writes `entry_curation` and `example_candidates`. It flags suspected merged headings and missing/late boundaries, derives separate gloss projections, and collapses only explicit same-page seed duplicates or exact duplicates at retrieval time. Original entries and review statuses remain unchanged. Recovered definitions and automatically extracted example fragments remain unverified; candidate examples are not added to the runtime example table. Reports are written under `data/private/reports/`. Homographs and different senses are not automatically combined.

Run `scripts/expand_corpus.py` to derive reverse-gloss hints and a common-use priority queue from all available local glosses. This writes `entry_enrichment` and private reports, and expands the local keyword index. The hints are automatic projections, not new human-verified dictionary senses; missing glosses are not invented. When explicitly enabled, `includeExampleCandidates` permits candidate examples directly at retrieval time while retaining their original labels, rather than copying them into the source-checked example table.
