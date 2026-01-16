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

## Screenshots

### Evaluation

<img width="1469" height="856" alt="image" src="https://github.com/user-attachments/assets/36c18ec6-054a-492c-bd8c-b62117f9bd81" />
<img width="1582" height="1035" alt="image" src="https://github.com/user-attachments/assets/97dfe8e8-2c53-4b60-9de3-f2d10404b20d" />
<img width="1470" height="861" alt="image" src="https://github.com/user-attachments/assets/d6452cbb-6317-48bc-8f7c-fa254b048f6e" />

### Storybook

<img width="1442" height="861" alt="image" src="https://github.com/user-attachments/assets/97a8ad1b-a361-404e-88b5-ab4358562249" />
<img width="1463" height="860" alt="image" src="https://github.com/user-attachments/assets/f596b200-6802-41d2-9ec0-f040f68a822e" />


### Comparison Viewer

<img width="1468" height="860" alt="image" src="https://github.com/user-attachments/assets/50870c1c-a8d6-42e4-8d1a-46e9e58a5320" />
<img width="1460" height="832" alt="image" src="https://github.com/user-attachments/assets/a6bc528d-9e00-465c-9f49-c927a62b1a53" />
<img width="1470" height="857" alt="image" src="https://github.com/user-attachments/assets/f2c6cf07-5a74-4c53-aeb9-bb53ae194498" />



