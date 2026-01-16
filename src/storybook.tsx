import type React from "react";
import { useState } from "react";
import { render, Box, Text, useInput } from "ink";
import { QuestionDisplay } from "./components/QuestionDisplay.tsx";
import { ModelResponse } from "./components/ModelResponse.tsx";
import { Results } from "./components/Results.tsx";
import {
	PERSONALITY_TRAITS,
	type TraitScores,
} from "./components/AnswerScoring.tsx";
import { RadarChart } from "./components/compare/RadarChart.tsx";
import { QuestionExplorer } from "./components/compare/QuestionExplorer.tsx";
import { ResponseViewer } from "./components/compare/ResponseViewer.tsx";
import { TraitExtremesPanel } from "./components/compare/TraitExtremesPanel.tsx";
import { ScoreDistributionPanel } from "./components/compare/ScoreDistributionPanel.tsx";
import { ModelLegend } from "./components/compare/ModelLegend.tsx";
import type { ModelData, ModelColor } from "./compare.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Static version of AnswerScoring for storybook (no API calls)
// ─────────────────────────────────────────────────────────────────────────────

interface StaticAnswerScoringProps {
	evaluatorModel: string;
	scores: TraitScores | null;
	isEvaluating?: boolean;
	error?: string | null;
}

const ScoreBar = ({
	score,
	lowLabel,
	highLabel,
}: { score: number; lowLabel: string; highLabel: string }) => {
	const normalized = score + 2;
	const filled = "█".repeat(normalized + 1);
	const empty = "░".repeat(4 - normalized);
	const color = score < 0 ? "red" : score > 0 ? "green" : "yellow";

	return (
		<Box>
			<Text color="gray">{lowLabel.padEnd(12)}</Text>
			<Text color={color}>{filled}</Text>
			<Text color="gray">{empty}</Text>
			<Text color="gray"> {highLabel}</Text>
			<Text color="cyan">
				{" "}
				({score > 0 ? "+" : ""}
				{score})
			</Text>
		</Box>
	);
};

const StaticAnswerScoring = ({
	evaluatorModel,
	scores,
	isEvaluating = false,
	error = null,
}: StaticAnswerScoringProps) => {
	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="magenta"
			paddingX={2}
			paddingY={1}
			marginTop={1}
		>
			<Box marginBottom={1}>
				<Text color="gray">Evaluator: </Text>
				<Text color="yellow">{evaluatorModel}</Text>
				{isEvaluating && <Text color="magenta"> ● evaluating...</Text>}
			</Box>

			{error && <Text color="red">{error}</Text>}

			{scores && (
				<Box flexDirection="column">
					{PERSONALITY_TRAITS.map((trait) => (
						<Box key={trait.id} marginBottom={0}>
							<Text bold>{trait.name.padEnd(14)}</Text>
							<ScoreBar
								score={scores[trait.id]}
								lowLabel={trait.lowLabel}
								highLabel={trait.highLabel}
							/>
						</Box>
					))}
				</Box>
			)}

			{isEvaluating && !scores && (
				<Text color="gray">Analyzing personality traits...</Text>
			)}
		</Box>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Story Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface Story {
	name: string;
	component: React.ReactNode;
}

interface StoryGroup {
	componentName: string;
	stories: Story[];
}

const MOCK_SCORES: TraitScores = {
	assertiveness: 1,
	empathy: 2,
	openness: 0,
	directness: -1,
	optimism: 1,
};

const MOCK_NEGATIVE_SCORES: TraitScores = {
	assertiveness: -2,
	empathy: -1,
	openness: -1,
	directness: -2,
	optimism: -2,
};

const MOCK_NEUTRAL_SCORES: TraitScores = {
	assertiveness: 0,
	empathy: 0,
	openness: 0,
	directness: 0,
	optimism: 0,
};

const MOCK_RESPONSE_SHORT = `I would calmly address the situation by speaking privately with my colleague after the meeting. I'd explain how I felt when they presented my idea without acknowledgment and ask if we could collaborate more transparently in the future.`;

const MOCK_RESPONSE_LONG = `This is a delicate situation that requires careful handling. Here's how I would approach it:

**First, I'd take a moment to calm down.** It's natural to feel frustrated when someone takes credit for your work, but reacting emotionally in the moment could backfire.

**Then, I'd assess the situation:**
- Was it intentional or an oversight?
- Does this colleague have a pattern of this behavior?
- How important is this idea to my career progression?

**My approach would be:**

1. Request a private conversation with the colleague
2. Use "I" statements to express how I felt
3. Give them a chance to explain their perspective
4. Propose a solution for future collaboration

If the behavior continues, I might need to:
- Document instances
- Involve a manager
- Be more proactive about claiming credit in meetings

The key is maintaining professionalism while standing up for myself.`;

const MOCK_MD_FORMATTING = `
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text* and ~~strikethrough~~.
Inline \`code\` snippet.
[Link](https://example.com)
`;

const MOCK_MD_CODE = `
Here is some code:

\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\`

And python:
\`\`\`python
def hello():
    print("world")
\`\`\`
`;

const MOCK_MD_LISTS = `
- Item 1
- Item 2
  - Nested item
- Item 3

1. First
2. Second
3. Third

> This is a blockquote.
> It can span multiple lines.
`;

const MOCK_MD_TABLE = `
| Feature | Status | Notes |
| :--- | :---: | ---: |
| Markdown | ✅ | Supported |
| Tables | ✅ | Works |
| Streaming | ⚠️ | In progress |
`;

const MOCK_COMPLETED_ROUNDS = [
	{
		questionIndex: 0,
		question:
			"You're working on a team project and a colleague takes credit for your idea. How do you handle this?",
		response: MOCK_RESPONSE_SHORT,
		scores: MOCK_SCORES,
	},
	{
		questionIndex: 1,
		question:
			"You discover an error in a report your manager already submitted. What do you do?",
		response:
			"I would immediately notify my manager privately about the error.",
		scores: {
			assertiveness: 2,
			empathy: 1,
			openness: 1,
			directness: 2,
			optimism: 0,
		},
	},
	{
		questionIndex: 2,
		question:
			"A close friend asks to borrow money but you're unsure they can repay. How do you respond?",
		response:
			"I'd have an honest conversation about my concerns while being supportive.",
		scores: {
			assertiveness: 0,
			empathy: 2,
			openness: 0,
			directness: -1,
			optimism: 1,
		},
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock Model Data for Compare Components
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_QUESTIONS = [
	"You're working on a team project and a colleague takes credit for your idea. How do you handle this?",
	"You discover an error in a report your manager already submitted. What do you do?",
	"A close friend asks to borrow money but you're unsure they can repay. How do you respond?",
	"You're offered a promotion requiring relocation, but family is settled. How do you decide?",
	"You witness a coworker being treated unfairly. Speaking up could jeopardize your position. What do you do?",
];

const createMockModelData = (
	name: string,
	color: ModelColor,
	scores: TraitScores,
): ModelData => ({
	name,
	displayName: name.split("/").pop() || name,
	color,
	aggregateScores: scores,
	questions: MOCK_QUESTIONS,
	rounds: MOCK_QUESTIONS.map((question, idx) => ({
		questionIndex: idx,
		question,
		response: MOCK_RESPONSE_LONG,
		scores: {
			assertiveness: scores.assertiveness + (Math.random() - 0.5),
			empathy: scores.empathy + (Math.random() - 0.5),
			openness: scores.openness + (Math.random() - 0.5),
			directness: scores.directness + (Math.random() - 0.5),
			optimism: scores.optimism + (Math.random() - 0.5),
		},
	})),
});

const MOCK_MODELS: ModelData[] = [
	createMockModelData("openai/gpt-4", "cyan", {
		assertiveness: 1.4,
		empathy: 1.8,
		openness: 0.8,
		directness: 0.4,
		optimism: 1.8,
	}),
	createMockModelData("anthropic/claude-3", "magenta", {
		assertiveness: 0.5,
		empathy: 2.0,
		openness: 1.5,
		directness: -0.5,
		optimism: 1.2,
	}),
	createMockModelData("meta/llama-3-70b", "yellow", {
		assertiveness: 1.8,
		empathy: 0.3,
		openness: 0.2,
		directness: 1.5,
		optimism: 0.5,
	}),
	createMockModelData("google/gemma-3", "green", {
		assertiveness: -0.5,
		empathy: 1.2,
		openness: 1.8,
		directness: -1.0,
		optimism: 1.5,
	}),
];

const storyGroups: StoryGroup[] = [
	{
		componentName: "QuestionDisplay",
		stories: [
			{
				name: "Basic",
				component: (
					<QuestionDisplay
						question="You're working on a team project and a colleague takes credit for your idea in a meeting. How do you handle this situation?"
						questionNumber={1}
					/>
				),
			},
			{
				name: "Question 5",
				component: (
					<QuestionDisplay
						question="You witness a coworker being treated unfairly by a supervisor, but speaking up could jeopardize your own position. What do you do?"
						questionNumber={5}
					/>
				),
			},
			{
				name: "Short Question",
				component: (
					<QuestionDisplay question="What would you do in this situation?" />
				),
			},
		],
	},
	{
		componentName: "ModelResponse",
		stories: [
			{
				name: "Streaming",
				component: (
					<ModelResponse
						modelName="openai/gpt-4"
						response={MOCK_RESPONSE_SHORT.slice(0, 50)}
						isStreaming={true}
					/>
				),
			},
			{
				name: "Complete (Short)",
				component: (
					<ModelResponse
						modelName="anthropic/claude-3-opus"
						response={MOCK_RESPONSE_SHORT}
						isStreaming={false}
					/>
				),
			},
			{
				name: "Complete (Long)",
				component: (
					<ModelResponse
						modelName="meta-llama/llama-3-70b"
						response={MOCK_RESPONSE_LONG}
						isStreaming={false}
					/>
				),
			},
			{
				name: "Formatting",
				component: (
					<ModelResponse
						modelName="markdown-test"
						response={MOCK_MD_FORMATTING}
						isStreaming={false}
					/>
				),
			},
			{
				name: "Code Blocks",
				component: (
					<ModelResponse
						modelName="coder-bot"
						response={MOCK_MD_CODE}
						isStreaming={false}
					/>
				),
			},
			{
				name: "Lists & Quotes",
				component: (
					<ModelResponse
						modelName="writer-bot"
						response={MOCK_MD_LISTS}
						isStreaming={false}
					/>
				),
			},
			{
				name: "Tables",
				component: (
					<ModelResponse
						modelName="data-bot"
						response={MOCK_MD_TABLE}
						isStreaming={false}
					/>
				),
			},
			{
				name: "Empty",
				component: (
					<ModelResponse
						modelName="openai/gpt-4"
						response=""
						isStreaming={true}
					/>
				),
			},
		],
	},
	{
		componentName: "AnswerScoring",
		stories: [
			{
				name: "Evaluating",
				component: (
					<StaticAnswerScoring
						evaluatorModel="openai/gpt-4"
						scores={null}
						isEvaluating={true}
					/>
				),
			},
			{
				name: "Positive Scores",
				component: (
					<StaticAnswerScoring
						evaluatorModel="anthropic/claude-3-opus"
						scores={MOCK_SCORES}
						isEvaluating={false}
					/>
				),
			},
			{
				name: "Negative Scores",
				component: (
					<StaticAnswerScoring
						evaluatorModel="openai/gpt-4"
						scores={MOCK_NEGATIVE_SCORES}
						isEvaluating={false}
					/>
				),
			},
			{
				name: "Neutral Scores",
				component: (
					<StaticAnswerScoring
						evaluatorModel="meta-llama/llama-3-70b"
						scores={MOCK_NEUTRAL_SCORES}
						isEvaluating={false}
					/>
				),
			},
			{
				name: "Error",
				component: (
					<StaticAnswerScoring
						evaluatorModel="openai/gpt-4"
						scores={null}
						isEvaluating={false}
						error="Failed to parse evaluator response"
					/>
				),
			},
		],
	},
	{
		componentName: "Results",
		stories: [
			{
				name: "With Data",
				component: (
					<Results
						completedRounds={MOCK_COMPLETED_ROUNDS}
						modelName="anthropic/claude-3-opus"
					/>
				),
			},
			{
				name: "No Valid Scores",
				component: (
					<Results
						completedRounds={[
							{
								questionIndex: 0,
								question: "Test question",
								response: "Test response",
								scores: null,
							},
						]}
						modelName="openai/gpt-4"
					/>
				),
			},
		],
	},
	{
		componentName: "RadarChart",
		stories: [
			{
				name: "4 Models",
				component: <RadarChart models={MOCK_MODELS} activeModelIndex={0} />,
			},
			{
				name: "Claude Active",
				component: <RadarChart models={MOCK_MODELS} activeModelIndex={1} />,
			},
			{
				name: "Llama Active",
				component: <RadarChart models={MOCK_MODELS} activeModelIndex={2} />,
			},
		],
	},
	{
		componentName: "QuestionExplorer",
		stories: [
			{
				name: "Compact",
				component: (
					<QuestionExplorer
						models={MOCK_MODELS}
						activeModelIndex={0}
						selectedQuestionIndex={0}
						compact
					/>
				),
			},
			{
				name: "Full View",
				component: (
					<QuestionExplorer
						models={MOCK_MODELS}
						activeModelIndex={0}
						selectedQuestionIndex={2}
					/>
				),
			},
		],
	},
	{
		componentName: "ResponseViewer",
		stories: [
			{
				name: "With Scores",
				component: (
					<ResponseViewer
						modelName="gpt-4"
						modelColor="cyan"
						question={MOCK_QUESTIONS[0] ?? ""}
						response={MOCK_RESPONSE_LONG}
						scores={MOCK_SCORES}
						height={20}
						width={80}
					/>
				),
			},
			{
				name: "No Scores",
				component: (
					<ResponseViewer
						modelName="claude-3"
						modelColor="magenta"
						question={MOCK_QUESTIONS[1] ?? ""}
						response={MOCK_RESPONSE_SHORT}
						scores={null}
						height={20}
						width={80}
					/>
				),
			},
		],
	},
	{
		componentName: "ModelLegend",
		stories: [
			{
				name: "First Active",
				component: <ModelLegend models={MOCK_MODELS} activeModelIndex={0} />,
			},
			{
				name: "Last Active",
				component: <ModelLegend models={MOCK_MODELS} activeModelIndex={3} />,
			},
		],
	},
	{
		componentName: "TraitExtremes",
		stories: [
			{
				name: "4 Models",
				component: <TraitExtremesPanel models={MOCK_MODELS} />,
			},
		],
	},
	{
		componentName: "ScoreDistribution",
		stories: [
			{
				name: "Question 1",
				component: (
					<ScoreDistributionPanel
						model={MOCK_MODELS[0] as ModelData}
						questionIndex={0}
					/>
				),
			},
			{
				name: "Question 3",
				component: (
					<ScoreDistributionPanel
						model={MOCK_MODELS[1] as ModelData}
						questionIndex={2}
					/>
				),
			},
		],
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// Storybook App
// ─────────────────────────────────────────────────────────────────────────────

const Storybook = () => {
	const [groupIndex, setGroupIndex] = useState(0);
	const [storyIndex, setStoryIndex] = useState(0);

	const currentGroup = storyGroups[groupIndex];
	const currentStory = currentGroup?.stories[storyIndex];

	useInput((input, key) => {
		// Up/down to navigate between components
		if (key.upArrow || input === "k") {
			setGroupIndex((prev) => {
				const newIndex = prev > 0 ? prev - 1 : storyGroups.length - 1;
				// Reset story index if it exceeds the new group's story count
				const newGroupStoryCount = storyGroups[newIndex]?.stories.length ?? 1;
				if (storyIndex >= newGroupStoryCount) {
					setStoryIndex(0);
				}
				return newIndex;
			});
		} else if (key.downArrow || input === "j") {
			setGroupIndex((prev) => {
				const newIndex = prev < storyGroups.length - 1 ? prev + 1 : 0;
				const newGroupStoryCount = storyGroups[newIndex]?.stories.length ?? 1;
				if (storyIndex >= newGroupStoryCount) {
					setStoryIndex(0);
				}
				return newIndex;
			});
		}
		// Left/right to navigate between stories within a component
		else if (key.leftArrow || input === "h") {
			const maxStory = (currentGroup?.stories.length ?? 1) - 1;
			setStoryIndex((prev) => (prev > 0 ? prev - 1 : maxStory));
		} else if (key.rightArrow || input === "l") {
			const maxStory = (currentGroup?.stories.length ?? 1) - 1;
			setStoryIndex((prev) => (prev < maxStory ? prev + 1 : 0));
		} else if (key.escape || (key.ctrl && input === "c")) {
			process.exit(0);
		}
	});

	return (
		<Box flexDirection="column" paddingX={1}>
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor="cyan"
				paddingX={2}
				justifyContent="space-between"
			>
				<Text bold color="cyan">
					Component Storybook
				</Text>
				<Text color="gray">↑↓ component | ←→ variant | Esc to exit</Text>
			</Box>

			{/* Component list with story dots */}
			<Box flexDirection="column" marginY={1}>
				{storyGroups.map((group, gIdx) => {
					const isSelectedGroup = gIdx === groupIndex;
					return (
						<Box key={group.componentName} marginBottom={0}>
							<Text
								color={isSelectedGroup ? "cyan" : "gray"}
								bold={isSelectedGroup}
							>
								{isSelectedGroup ? "▸ " : "  "}
								{group.componentName.padEnd(16)}
							</Text>
							<Box>
								{group.stories.map((story, sIdx) => {
									const isSelected = isSelectedGroup && sIdx === storyIndex;
									return (
										<Text
											key={story.name}
											color={
												isSelected
													? "yellow"
													: isSelectedGroup
														? "cyan"
														: "gray"
											}
											bold={isSelected}
										>
											{isSelected ? "●" : "○"}{" "}
										</Text>
									);
								})}
							</Box>
							{isSelectedGroup && (
								<Text color="yellow" bold>
									{" "}
									{currentStory?.name}
								</Text>
							)}
						</Box>
					);
				})}
			</Box>

			{/* Divider */}
			<Text color="gray">{"─".repeat(60)}</Text>

			{/* Story content */}
			<Box marginTop={1}>{currentStory?.component}</Box>
		</Box>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────────

render(<Storybook />);
