Repository history rewritten to remove exposed secrets

What happened
- A secret (OpenAI key) was accidentally committed and has been removed from the repository history.

What you must do
- Immediately rotate any keys you used from this repo (already done).
- Recloning the repository is recommended to avoid references to rewritten history:
  - git clone https://github.com/kimblezc/kimbleai-v4-clean.git

Notes
- The repo now contains placeholder text (<OPENAI_KEY_PLACEHOLDER>) instead of literal keys in docs.
- If you have local clones with the old history, delete them and reclone or run the documented recovery steps.
