# Documentation Terminology Contract

`documentation-terminology@0.1.0-draft` is a neutral, versioned contract for terminology
candidate review and controlled terminology registries. It is owned by `@hia-doc/core` and is
distributed as Draft 2020-12 JSON Schema.

## Artifact Kinds

| Kind | Purpose | Text boundary |
| --- | --- | --- |
| `documentation-terminology-candidate-set` | Carries stable candidate scope, profile provenance, lifecycle state, optional human review and optional term linkage. | Does not contain an observed phrase, source body, raw locator, source range or AST data. |
| `documentation-terminology-registry` | Carries human-maintained `term.*` entries, locale forms, optional definitions, visibility and lifecycle. | Forms and definitions are controlled registry input; they do not enter quality-review artifacts. |

## Candidate Lifecycle

Candidates use `detected`, `reviewed`, `linked`, or `ignored` states. A linked candidate requires
a matching human-review record and an approved registry entry. A grammar-unknown profile result is
kept as `TERM_CANDIDATE_GRAMMAR_UNKNOWN` for human review; it must not be guessed, linked, or
turned into a source edit.

Candidate identity is based on `sourceDocumentId`, `fieldPath`, `annotationKind`, `occurrence`, and
profile provenance. It is not derived from display text, a file path, a range, a hash, or a private
parser AST.

## Locale, Visibility, and Quality Review

Registry locale keys use canonical BCP 47 form. A bridge may canonicalize a legacy underscore input
and report a diagnostic, but stored artifacts use hyphenated canonical tags. Canonical forms and
synonyms must not conflict within a locale.

`createDocumentationTerminologyQualityReviewInput()` produces a metadata-only
`documentation-quality-review` input. It exports stable scope, `TERM_*` diagnostics, confidence,
and provenance only. Its privacy policy denies source bodies, term phrases, and raw locators; its
consumer action policy remains `review-only` and requires human review.

## Deliberate Boundaries

This reference does not parse raw comments, implement a tokenizer or AST extractor, persist or
mutate a registry, import TBX/XLIFF/Fluent data, read DLR files, create editor actions, or access a
network. Profile-specific syntax and real storage remain separate, explicitly authorized work.

The canonical schema is available from
`@hia-doc/schemas/documentation-terminology.schema.json` and its versioned `$id` is listed in the
schema catalog.
