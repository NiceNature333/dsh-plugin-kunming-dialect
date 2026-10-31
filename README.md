# dsh-plugin-kunming-dialect

[简体中文](README.zh-CN.md)

An experimental DeepSeek Harness plugin that rewrites completed chatbot replies into Kunming dialect using a locally imported dictionary and a second cloud model call.

**No dictionary, PDF, OCR text, definitions, book examples, or digitized publication is included.** MIT applies only to original project code and documentation. See [NOTICE](NOTICE.md).

## How it works

Mandarin draft → `kunming_rewrite` → local SQLite reverse keyword / character n-gram retrieval → DeepSeek Flash rewrite → output validation → Agent final reply → existing chat transport.

A standalone Harness Bundle registers a model-visible tool and a separate prompt section. It can run alongside the official QQ Bot and memory plugins. It does not replace their routing or memory storage.

## Status and limitations

The tool, local retrieval, error fallback, and real Harness / Flash calls have been exercised in a private development environment. Public tests use only original fictional fixtures and mocked cloud responses. Local QQ outbound simulation was tested; comprehensive live group/private-chat acceptance and native-speaker language review remain pending.

Invocation is model-directed. Prompt instructions request a tool call, but cannot guarantee that the Agent will invoke it or avoid emitting earlier text. This is not a mandatory outbound interceptor. OCR parsing is heuristic; imported entries need review. Numeric/token checks cannot prove complete semantic fidelity or authentic linguistic style.

## Requirements

- Node.js >=22.13 (Node 24 recommended), including `node:sqlite` and `fetch`.
- Python 3.11+, a virtual environment, and `requirements.txt` for PDF import; SQLite uses Python's standard library.
- A compatible DeepSeek Harness installation and either its signed-in model service or an OpenAI-compatible endpoint.
- A dictionary you have the right to use. No GPU or local embedding model is needed.

## Install and enable

```powershell
git clone <this-repository-url>
cd dsh-plugin-kunming-dialect
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

Use your Harness plugin manager to add this directory as a local package and enable its Bundle in the chosen Profile. Desktop installations provide a bundled `dsh.cmd`; it may not be on PATH. Back up the Profile before editing. Configure the existing plugin row:

```yaml
- id: kunming-dialect
  config:
    dbPath: /absolute/path/to/local/kunming.sqlite
    transport: harness
    provider: deepseek-account
    model: deepseek-flash
    intensity: heavy
    includeUnreviewed: false
```

Use one configuration row per plugin; preserve existing QQ credentials and personality. See [installation](docs/INSTALLATION.md).

## Local dictionary import

Keep source material in ignored `source/` or outside this repository. Original PDFs are never moved or deleted by the importer. Set `KUNMING_SOURCE_PDF` to select a file. Inspect its layout, then choose body-page range, printed-page offset, and header/footer margins:

```powershell
.venv\Scripts\python scripts/inspect_pdf.py
.venv\Scripts\python scripts/parse_entries.py --start-page 1 --header 195 --footer 75
.venv\Scripts\python scripts/build_database.py
.venv\Scripts\python scripts/validate_database.py
```

Raw pages, candidates, review reports, and the database remain in ignored `data/` and `tmp/`. Optional locally reviewed seeds can be imported with `scripts/build_seed.py --input <your-authorized-json>`. Import before building. No seeds are bundled. Default retrieval uses `verified` entries; `includeUnreviewed: true` allows all imported candidates without changing their original review status. See [OCR pipeline](docs/OCR_PIPELINE.md).

## API and safety

`transport: harness` reuses Harness authentication; do not copy its credentials into this repository. For `transport: openai`, configure `apiBase`, `apiKeyEnv`, and `model`, and export the named environment variable. `.env.example` is a template; the plugin does not load `.env` automatically. Model aliases depend on the provider.

Defaults: 30-second per-attempt timeout, one retry, 2,048 output tokens, 10 retrieved entries (maximum 12), 6,000 draft characters and 500 context characters. Overlong drafts and most operational failures fall back to the original draft. Context is optional: send only information necessary for the current reply. Logs contain status, duration and hit count, not message bodies. Synthetic evaluation reports are saved only by an explicit evaluation run.

## QQ coexistence

Keep the official QQ Bot installed. Its per-agent tool restrictions must permit `kunming_rewrite`; this differs by version and local customization. `scripts/install_profile.py` is an optional Windows helper for a specific known layout, with local backups: inspect it before use. Set QQ `showToolResults: false` and `streaming: false` to reduce duplicate output / draft streaming. These settings cannot prevent every early assistant message. No live QQ test message is sent by the public test suite.

## Tests and development

```powershell
npm test
python scripts/audit_public.py
```

Tests create temporary SQLite databases from original fictional data. They do not require a commercial dictionary. Installed-QQ-specific checks skip when QQ is absent. `npm run evaluate` is an optional Windows / Harness live evaluation using your own local database and account quota; its outputs remain private.

Before commits, pushes, npm publishing, or Releases, inspect staged content and reachable history and run the public-data audit. Do not attach imported datasets or generated outputs. See [publication policy](docs/PUBLISHING.md).

## Roadmap

- Improve column/page boundary parsing, sense separation and OCR review.
- Conduct native-speaker review and live QQ group/private-chat acceptance tests.
- Explore supported host or transport hooks for mandatory buffered rewriting.
- Add a separately licensed community-authored dictionary, with contributor provenance.

## Third-party publication notice

Development background includes a locally supplied copy of 《昆明方言词典》, 张华文、毛玉玲, 云南人民出版社, 2014. This project distributes neither the book nor its digitized database and has no official endorsement or authorization from its authors or publisher. Obtain the rights needed for your own material, including any cloud processing. The software license does not license imported content.
