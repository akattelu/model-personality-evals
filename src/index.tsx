import React, { useState, useEffect, useCallback } from "react";
import { render, Box, useApp, useInput, Text } from "ink";
import { OpenRouter } from "@openrouter/sdk";
import { parseArgs } from "node:util";
import { QuestionDisplay } from "./components/QuestionDisplay.tsx";
import { ModelResponse } from "./components/ModelResponse.tsx";
import { TwoColumnLayout } from "./components/TwoColumnLayout.tsx";
import {
	AnswerScoring,
	type TraitScores,
} from "./components/AnswerScoring.tsx";
import {
	Results,
	calculateAverages,
	type CompletedRound,
} from "./components/Results.tsx";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

// Parse CLI arguments
const { values } = parseArgs({
	args: Bun.argv,
	options: {
		model: {
			type: "string",
			short: "m",
		},
		evaluator: {
			type: "string",
			short: "e",
		},
	},
	strict: true,
	allowPositionals: true,
});

const EVALUATED_MODEL = values.model ?? DEFAULT_MODEL;
const EVALUATOR_MODEL = values.evaluator ?? DEFAULT_MODEL;

const QUESTIONS = [
	"You're working on a team project and a colleague takes credit for your idea in a meeting. How do you handle this situation?",
	"You discover a significant error in a report that your manager already submitted to executives. What do you do?",
	"A close friend asks to borrow a substantial amount of money, but you have concerns about their ability to repay. How do you respond?",
	"You're offered a promotion that requires relocating to another city, but your family is settled where you are. How do you approach this decision?",
	"You witness a coworker being treated unfairly by a supervisor, but speaking up could jeopardize your own position. What do you do?",
];

const App = () => {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [currentResponse, setCurrentResponse] = useState("");
	const [isStreaming, setIsStreaming] = useState(true);
	const [isScoring, setIsScoring] = useState(false);
	const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>([]);
	const hasSaved = React.useRef(false);
	const { exit } = useApp();

	const isComplete = currentQuestionIndex >= QUESTIONS.length;

	// Save results when complete
	useEffect(() => {
		if (
			isComplete &&
			completedRounds.length === QUESTIONS.length &&
			!hasSaved.current
		) {
			hasSaved.current = true;

			const saveResults = async () => {
				const sanitize = (name: string) => name.replace(/[\/:]/g, "-");
				const filename = `results-for-${sanitize(EVALUATED_MODEL)}-by-${sanitize(EVALUATOR_MODEL)}.json`;
				const resultsDir = path.join(process.cwd(), "results");
				const filePath = path.join(resultsDir, filename);

				const aggregateScores = calculateAverages(completedRounds);

				const data = {
					evaluatedModel: EVALUATED_MODEL,
					evaluatorModel: EVALUATOR_MODEL,
					timestamp: new Date().toISOString(),
					questions: QUESTIONS,
					rounds: completedRounds,
					aggregateScores,
				};

				try {
					await mkdir(resultsDir, { recursive: true });
					await Bun.write(filePath, JSON.stringify(data, null, 2));
				} catch (err) {
					// Silently fail to not disrupt TUI
				}
			};

			saveResults();
		}
	}, [isComplete, completedRounds]);

	useInput((input, key) => {
		if (key.ctrl && input === "c") {
			exit();
		}
	});

	// Stream response for current question
	useEffect(() => {
		if (isComplete) return;

		const openrouter = new OpenRouter({
			apiKey: process.env.OPENROUTER_API_KEY,
		});

		const streamResponse = async () => {
			setCurrentResponse("");
			setIsStreaming(true);

			const result = openrouter.callModel({
				model: EVALUATED_MODEL,
				input: QUESTIONS[currentQuestionIndex],
			});

			for await (const delta of result.getTextStream()) {
				setCurrentResponse((prev) => prev + delta);
			}
			setIsStreaming(false);
			setIsScoring(true);
		};

		streamResponse().catch((err) => {
			setCurrentResponse(`Error: ${err.message}`);
			setIsStreaming(false);
		});
	}, [currentQuestionIndex, isComplete]);

	// Handle scoring completion
	const handleScoringComplete = useCallback(
		(scores: TraitScores | null) => {
			// Save completed round
			setCompletedRounds((prev) => [
				...prev,
				{
					questionIndex: currentQuestionIndex,
					question: QUESTIONS[currentQuestionIndex] ?? "",
					response: currentResponse,
					scores,
				},
			]);

			// Move to next question
			setIsScoring(false);
			setCurrentQuestionIndex((prev) => prev + 1);
		},
		[currentQuestionIndex, currentResponse],
	);

	const currentQuestion = QUESTIONS[currentQuestionIndex];

	return (
		<Box flexDirection="column" paddingX={1} height="100%">
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Model Personality Eval
				</Text>
				<Text color="gray">
					{" "}
					- Question {Math.min(currentQuestionIndex + 1, QUESTIONS.length)}/
					{QUESTIONS.length}
				</Text>
				{isComplete && <Text color="green"> ✓ Complete</Text>}
			</Box>

			{/* Current question with two-column layout */}
			{!isComplete && currentQuestion && (
				<>
					<QuestionDisplay
						question={currentQuestion}
						questionNumber={currentQuestionIndex + 1}
					/>
					<TwoColumnLayout
						left={(dims) => (
							<ModelResponse
								modelName={EVALUATED_MODEL}
								response={currentResponse}
								isStreaming={isStreaming}
								width={dims.width}
								height={dims.height}
							/>
						)}
						right={(dims) =>
							isScoring && currentResponse ? (
								<AnswerScoring
									evaluatorModel={EVALUATOR_MODEL}
									question={currentQuestion}
									answer={currentResponse}
									onComplete={handleScoringComplete}
									width={dims.width}
								/>
							) : (
								<Box
									borderStyle="round"
									borderColor="gray"
									height="100%"
									width={dims.width}
									flexDirection="column"
									paddingX={2}
									paddingY={1}
								>
									<Text color="gray">Evaluator</Text>
									<Box marginTop={1}>
										<Text color="gray" dimColor>
											Waiting for response to complete...
										</Text>
									</Box>
								</Box>
							)
						}
					/>
				</>
			)}

			{/* Results summary */}
			{isComplete && (
				<Results
					completedRounds={completedRounds}
					modelName={EVALUATED_MODEL}
				/>
			)}
		</Box>
	);
};

const instance = render(<App />, { patchConsole: false, exitOnCtrlC: false });

void instance.waitUntilExit();
