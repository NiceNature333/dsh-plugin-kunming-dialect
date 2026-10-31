# Architecture

The Bundle registers kunming_rewrite via Harness tools.register, a systemPrompt.section, and the host llm service. Runtime imports only Node standard modules.

Retrieval maps Mandarin keywords and character n-grams to local dictionary entries, retaining source pages and review status. Dictionary connections are read-only. At most twelve candidates and two stored examples per candidate are supplied to the model. Raw OCR and pronunciation fields are excluded; definition excerpts are bounded.

Calls use per-invocation cancellation, bounded context, timeouts and retry. Most failures return the draft with a fixed status rather than an exception stack. The plugin does not read group history or another user's memory automatically. Numeric/token checks are partial safeguards, not proof of semantic equivalence.

QQ routing remains owned by the existing Bot plugin. Tool availability may be restricted per agent; adding this tool does not require permitting unrelated system tools. Normal tool results and attachments are not automatically rewritten. Host llm/stream hooks exist, but a robust, QQ-scoped mandatory rewrite interceptor is not implemented.

Reference implementations consulted: [Harness](https://github.com/deepseek-ai/deepseek-harness), [QQ Bot](https://github.com/tencent-connect/dsh-qqbot), [dsh-cn-dict](https://github.com/GJY-cmd/dsh-cn-dict), and [dialect-converter](https://github.com/Edison-tom/dialect-converter). No upstream dictionary data is bundled.
