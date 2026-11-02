# Installation and configuration

Read either README for requirements, local import and API setup. Install the local package using the Harness plugin manager and add dsh-plugin-kunming-dialect to the target Profile's dsh.profile.bundles list. The included cordis.patch.yml inserts its plugin row.

Set dbPath to an absolute path to your private SQLite database. Supported settings: transport (harness/openai), provider, model, apiBase, apiKeyEnv, timeoutMs, maxOutputTokens, intensity (light/medium/heavy), retrievalLimit (1–12), maxDraftChars, maxContextChars, retries (0–2), includeUnreviewed (boolean), and optional statusPath for a local startup report. Keep statusPath inside an ignored directory or outside the repository.

harness is the default transport. openai requires a Key in the environment variable named by apiKeyEnv. HTTPS is required except loopback development endpoints. Do not commit credentials or Profile configuration. The plugin does not load .env itself.

Windows scripts/install_profile.py is an optional helper for a known desktop/QQ layout. It changes Profile configuration and a known QQ tool whitelist and saves local backups. Review the current installed version first; do not run blindly after an upstream upgrade. It does not install the package dependency itself. Do not replace an entire existing QQ configuration with a minimal example, because this would lose credentials and persona settings.

For QQ, allow kunming_rewrite while retaining existing safety restrictions. Use showToolResults=false and streaming=false for this workflow. Restart/reload the Profile and confirm tool registration before group tests. A model may still skip the tool or emit earlier text. To disable the Bundle, remove its whitelist name at the same time: unknown whitelist names can mask all QQ tools in some customized installations.

Backups, local account credentials and imported datasets must remain private. No cloud or group test messages are sent automatically by npm test.

Optional `orthographyPath` points to a private JSON array of user spelling preferences. Each rule contains `source`, `target`, `excludePhrases` (an array), and optional `notes`. No real spelling dataset is bundled. The model receives these preferences; a final deterministic pass applies them outside protected code, URLs, quoted spans and excluded phrases. These preferences express user-selected approximate written pronunciation, not an assertion that a replacement character is the dictionary's canonical headword. Missing/malformed rules cause a controlled fallback. Native words with no suitable written approximation should be left unchanged.

Optional `includeExampleCandidates:true` admits all locally extracted `example_candidates` without falsely changing their review labels. `examplesPerEntry` defaults to 2 and supports 1–4. Stored examples take precedence; automatic examples from a folded duplicate can be retrieved through its canonical entry. Each selected example carries provenance. Older databases without this optional table continue to work. These switches affect eligibility, not bulk transmission: the configured retrieval limit and per-entry example cap still apply.
