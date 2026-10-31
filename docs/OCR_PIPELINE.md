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
