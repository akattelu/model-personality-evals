# model-personality

Run evals and view comparisons for AI model personality tests in the terminal.


## Usage

To install dependencies:

```bash
bun install
```

Note: Running evals requires an `$OPENROUTER_API_KEY` present

```sh
# Run the evals app
bun run start --model google/gemini-2.0-flash-001 --evaluator anthropic/claude-3.5-sonnet`

# Run component previews with fake data
bun run storybook

# Run the comparison app
# This uses json result files stored in results/ after successful runs
bun run compare
```
