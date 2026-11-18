# ai-portfolio

## Publish website changes to GitHub

When a ChatGPT or Codex task makes changes to this portfolio website, publish those changes to `main` in [aswinpromptella-crypto/portfolio-website](https://github.com/aswinpromptella-crypto/portfolio-website) before finishing the task. The user has authorized this as the default for website edits. Honor any request to keep a specific change local or to prepare a draft.

1. Check the local working tree and the current GitHub branch before editing so you can identify changes that predate the task.
2. Verify the completed website edit. Review the files and hunks to publish, including any public assets the change needs. Preserve unrelated drafts and exclude private files, credentials, and temporary output.
3. Commit and push the scoped changes to `origin/main`. If local Git cannot write or push, use the GitHub connector to apply the same scoped changes against the current remote tip. Preserve concurrent remote changes and use a fast-forward update.
4. Verify the commit is on GitHub's `main` branch and include its link in the final response. If publication is blocked, report the specific blocker and keep the local work intact.
