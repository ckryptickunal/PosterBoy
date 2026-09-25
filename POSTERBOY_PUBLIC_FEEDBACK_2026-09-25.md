# PosterBoy: public problem and user-feedback corpus

**Researched:** 2026-09-25. **Project:** [ckryptickunal/PosterBoy](https://github.com/ckryptickunal/PosterBoy). **Scope:** Poster composition, typography fidelity and controlled edits.

**Reading note:** These are third-party discussions in the problem space, **not feedback from users of this repo**. User posts are experiences or questions, not proof of prevalence. Relevance statements are hypotheses to test, not features claimed to exist. Each record uses stable fields for agents: date, audience, type, evidence, source, and project relevance.

## What emerges

- **Problem cluster:** Generated text and type are unreliable, and small edit requests can destroy an approved layout.
- Maintain source-level provenance and distinguish user-reported failure from speculation, feature request, promotional claim or counterpoint.

## Source records

### POSTERBOY-01
- date: 2025-10-28
- audience: Graphic designer
- type: discussion
- evidence: A designer asks what tools are behind AI posters with "awful quality control and terrible fonts."
- source: https://www.reddit.com/r/graphic_design/comments/1oi7qkb/what_on_earth_are_people_using_the_generate_these/
- PosterBoy relevance: Put typography and quality review ahead of production-ready claims.

### POSTERBOY-02
- date: 2026-04-20
- audience: Flyer maker using image generation
- type: firsthand
- evidence: Product labels on an advertising flyer "always get distorted and the text looks like its melting."
- source: https://www.reddit.com/r/generativeAI/comments/1sqzmoo/how_to_fix_the_melting_text_issue/
- PosterBoy relevance: Compose final legible text as editable type rather than trusting rendered image pixels; inspect before export.

### POSTERBOY-03
- date: 2026-01-15
- audience: Typography commenter
- type: discussion
- evidence: The poster calls AI-generated fonts "creepy" and notices odd glyph shapes; the thread also discusses errors, kerning and inconsistent forms.
- source: https://www.reddit.com/r/typography/comments/1qdaetu/what_makes_fonts_generated_by_ai_so_creepylookong/
- PosterBoy relevance: Typography selection and visual inspection should be explicit, not an image-model side effect.

### POSTERBOY-04
- date: 2025-05-20
- audience: Graphic designer making rally posters
- type: firsthand
- evidence: A client ran an approved poster through ChatGPT to spell-check; it changed favored elements, introduced an error and 100 copies were printed, according to the designer.
- source: https://www.reddit.com/r/graphic_design/comments/1kr7a4j/mil_ran_my_work_through_ai_and_is_unhappy_with/
- PosterBoy relevance: Separate proposed small edits from wholesale redesign, compare against the approved original, and require final print review.

### POSTERBOY-05
- date: 2024-01-15
- audience: Midjourney poster maker
- type: firsthand
- evidence: Midjourney kept adding unwanted text to posters even after the author tried `--no text`.
- source: https://www.reddit.com/r/midjourney/comments/197j5se/prompt_help_how_can_i_prevent_text_from_being/
- PosterBoy relevance: Separate image generation from deterministic editable text composition.

### POSTERBOY-06
- date: 2022-12-26
- audience: Midjourney user
- type: workflow request
- evidence: The user asks how to replace gibberish generated text while preserving its font, aesthetic and position.
- source: https://www.reddit.com/r/midjourney/comments/zvyzki/replace_midjourney_gibberish_with_real_text_with/
- PosterBoy relevance: Keep image composition and editable text layers independently addressable.

### POSTERBOY-07
- date: 2023-06-19
- audience: Ebook-cover maker
- type: workflow request
- evidence: The author asks whether Midjourney text can be fixed without manual editing.
- source: https://www.reddit.com/r/midjourney/comments/14d19o2/how_to_fix_midjourney_text/
- PosterBoy relevance: Offer a real text-editing path rather than regenerating an entire visual.

### POSTERBOY-08
- date: 2024-04-13
- audience: Movie-poster editor
- type: workflow request
- evidence: The poster asks whether existing movie-poster title and copy can be edited by prompt, or whether manual work is still necessary.
- source: https://www.reddit.com/r/midjourney/comments/1c2ucmn/how_can_i_edit_the_text_easily_in_a_movie_poster/
- PosterBoy relevance: Make what is editable explicit and avoid implying arbitrary raster text can be changed losslessly.

### POSTERBOY-09
- date: 2025-02-08
- audience: Design student reviewing typography graphic
- type: discussion
- evidence: A student questions apparently AI-made text in a classroom typography graphic while studying tracking and kerning.
- source: https://www.reddit.com/r/graphic_design/comments/1ikofwz/am_i_going_nuts_or_is_my_teacher_using_ai/
- PosterBoy relevance: Inspect spelling and letterforms at output size; authorship of the example is uncertain.

## Candidate checks (not an instruction to implement)

- Reproduce the cited problem with a small example before treating it as a priority.
- Compare a baseline workflow against the proposed improvement; keep failure states and confidence visible.
- Ask actual users of this repository before claiming product-market fit.

## Method and limits

Searched relevant public discussions and opened each linked page. The selected posts are independent problem-space signals; samples are small and selection-biased. Some are questions, feature requests, or interested commentary rather than reproducible bug reports. This is a dated snapshot, not an exhaustive or live feed. No private repository sources were used.
