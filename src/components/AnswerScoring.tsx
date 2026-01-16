import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { OpenRouter } from "@openrouter/sdk";

// Personality traits to evaluate (-2 to 2 scale)
export const PERSONALITY_TRAITS = [
	{
		id: "assertiveness",
		name: "Assertiveness",
		lowLabel: "Passive",
		highLabel: "Assertive",
	},
	{
		id: "empathy",
		name: "Empathy",
		lowLabel: "Detached",
		highLabel: "Empathetic",
	},
	{
		id: "openness",
		name: "Openness",
		lowLabel: "Conventional",
		highLabel: "Creative",
	},
	{
		id: "directness",
		name: "Directness",
		lowLabel: "Diplomatic",
		highLabel: "Blunt",
	},
	{
		id: "optimism",
		name: "Optimism",
		lowLabel: "Pessimistic",
		highLabel: "Optimistic",
	},
] as const;

export type TraitId = (typeof PERSONALITY_TRAITS)[number]["id"];
export type TraitScores = Record<TraitId, number>;

interface AnswerScoringProps {
	evaluatorModel: string;
	question: string;
	answer: string;
	onComplete?: (scores: TraitScores | null) => void;
}

const EVALUATOR_PROMPT = `You are an expert psychologist evaluating personality traits based on how someone responds to situational questions.

Given the question and answer below, score the response on each of the following personality traits using a scale from -2 to 2:
- Assertiveness: -2 (passive, avoids conflict) to 2 (assertive, stands up for themselves)
- Empathy: -2 (detached, self-focused) to 2 (empathetic, considers others' feelings)
- Openness: -2 (conventional, by-the-book) to 2 (creative, thinks outside the box)
- Directness: -2 (diplomatic, indirect) to 2 (blunt, straightforward)
- Optimism: -2 (pessimistic, focuses on problems) to 2 (optimistic, focuses on solutions)

Respond ONLY with a JSON object in this exact format, no other text:
{"assertiveness": 0, "empathy": 0, "openness": 0, "directness": 0, "optimism": 0}

Question: {QUESTION}

Answer: {ANSWER}`;

const parseScores = (response: string): TraitScores | null => {
	try {
		// Try to extract JSON from the response
		const jsonMatch = response.match(/\{[^}]+\}/);
		if (!jsonMatch) return null;

		const parsed = JSON.parse(jsonMatch[0]);

		// Validate all traits are present and in range
		for (const trait of PERSONALITY_TRAITS) {
			const score = parsed[trait.id];
			if (typeof score !== "number" || score < -2 || score > 2) {
				return null;
			}
		}

		return parsed as TraitScores;
	} catch {
		return null;
	}
};

const ScoreBar = ({
	score,
	lowLabel,
	highLabel,
}: { score: number; lowLabel: string; highLabel: string }) => {
	// Convert -2 to 2 scale to 0 to 4 for display
	const normalized = score + 2; // 0 to 4
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

export const AnswerScoring = ({
	evaluatorModel,
	question,
	answer,
	onComplete,
}: AnswerScoringProps) => {
	const [scores, setScores] = useState<TraitScores | null>(null);
	const [isEvaluating, setIsEvaluating] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const evaluate = async () => {
			const openrouter = new OpenRouter({
				apiKey: process.env.OPENROUTER_API_KEY,
			});

			const prompt = EVALUATOR_PROMPT.replace("{QUESTION}", question).replace(
				"{ANSWER}",
				answer,
			);

			let parsedScores: TraitScores | null = null;

			try {
				const result = openrouter.callModel({
					model: evaluatorModel,
					input: prompt,
				});

				const response = await result.getText();
				parsedScores = parseScores(response);

				if (parsedScores) {
					setScores(parsedScores);
				} else {
					setError("Failed to parse evaluator response");
				}
			} catch (err) {
				setError(
					`Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
				);
			} finally {
				setIsEvaluating(false);
				// Brief delay so user can see scores before moving to next question
				setTimeout(() => {
					onComplete?.(parsedScores);
				}, 2000);
			}
		};

		evaluate();
	}, [evaluatorModel, question, answer, onComplete]);

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
