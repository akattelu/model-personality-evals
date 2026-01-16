import React, { useState, useEffect, useCallback } from "react";
import { render, Box, useApp, useInput, useStdout, Text } from "ink";
import { OpenRouter } from "@openrouter/sdk";
import { parseArgs } from "util";
import { QuestionDisplay } from "./components/QuestionDisplay.tsx";
import { ModelResponse } from "./components/ModelResponse.tsx";
import {
	AnswerScoring,
	type TraitScores,
} from "./components/AnswerScoring.tsx";

const enterAltScreen = "\x1b[?1049h";
const leaveAltScreen = "\x1b[?1049l";

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

interface CompletedRound {
	questionIndex: number;
	question: string;
	response: string;
	scores: TraitScores | null;
}

const App = () => {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [currentResponse, setCurrentResponse] = useState("");
	const [isStreaming, setIsStreaming] = useState(true);
	const [isScoring, setIsScoring] = useState(false);
	const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>([]);
	const [scrollOffset, setScrollOffset] = useState(0);
	const { exit } = useApp();
	const { stdout } = useStdout();

	const terminalHeight = stdout?.rows ?? 24;
	const isComplete = currentQuestionIndex >= QUESTIONS.length;

	useInput((input, key) => {
		if (key.ctrl && input === "c") {
			exit();
		}
		// Scroll through feed
		if (key.upArrow) {
			setScrollOffset((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setScrollOffset((prev) => prev + 1);
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

			{/* Completed rounds feed */}
			{completedRounds.map((round) => (
				<Box
					key={round.questionIndex}
					flexDirection="column"
					marginBottom={1}
					borderStyle="single"
					borderColor="gray"
					paddingX={1}
				>
					<Text color="gray" dimColor>
						Q{round.questionIndex + 1}: {round.question.slice(0, 60)}...
					</Text>
					<Text color="gray" dimColor>
						Response: {round.response.slice(0, 100).replace(/\n/g, " ")}...
					</Text>
					{round.scores && (
						<Text color="gray" dimColor>
							Scores: A:{round.scores.assertiveness} E:{round.scores.empathy} O:
							{round.scores.openness} D:{round.scores.directness} P:
							{round.scores.optimism}
						</Text>
					)}
				</Box>
			))}

			{/* Current question */}
			{!isComplete && currentQuestion && (
				<>
					<QuestionDisplay
						question={currentQuestion}
						questionNumber={currentQuestionIndex + 1}
					/>
					<ModelResponse
						modelName={EVALUATED_MODEL}
						response={currentResponse}
						isStreaming={isStreaming}
					/>
					{isScoring && currentResponse && (
						<AnswerScoring
							evaluatorModel={EVALUATOR_MODEL}
							question={currentQuestion}
							answer={currentResponse}
							onComplete={handleScoringComplete}
						/>
					)}
				</>
			)}

			{/* Completion message */}
			{isComplete && (
				<Box
					flexDirection="column"
					borderStyle="double"
					borderColor="green"
					padding={1}
					marginTop={1}
				>
					<Text bold color="green">
						Evaluation Complete!
					</Text>
					<Text>
						Evaluated {QUESTIONS.length} questions with model {EVALUATED_MODEL}
					</Text>
					<Text color="gray">Press Ctrl+C to exit</Text>
				</Box>
			)}
		</Box>
	);
};

// Enter alternate screen buffer
process.stdout.write(enterAltScreen);

const instance = render(<App />, { patchConsole: false, exitOnCtrlC: false });

void instance.waitUntilExit().then(() => {
	process.stdout.write(leaveAltScreen);
});
