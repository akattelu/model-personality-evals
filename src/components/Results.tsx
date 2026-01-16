import React from "react";
import { Box, Text } from "ink";
import {
	PERSONALITY_TRAITS,
	type TraitScores,
	type TraitId,
} from "./AnswerScoring.tsx";

interface CompletedRound {
	questionIndex: number;
	question: string;
	response: string;
	scores: TraitScores | null;
}

interface ResultsProps {
	completedRounds: CompletedRound[];
	modelName: string;
}

const calculateAverages = (rounds: CompletedRound[]): TraitScores | null => {
	const roundsWithScores = rounds.filter((r) => r.scores !== null);
	if (roundsWithScores.length === 0) return null;

	const totals: Record<TraitId, number> = {
		assertiveness: 0,
		empathy: 0,
		openness: 0,
		directness: 0,
		optimism: 0,
	};

	for (const round of roundsWithScores) {
		if (round.scores) {
			for (const trait of PERSONALITY_TRAITS) {
				totals[trait.id] += round.scores[trait.id];
			}
		}
	}

	const averages: TraitScores = {
		assertiveness: totals.assertiveness / roundsWithScores.length,
		empathy: totals.empathy / roundsWithScores.length,
		openness: totals.openness / roundsWithScores.length,
		directness: totals.directness / roundsWithScores.length,
		optimism: totals.optimism / roundsWithScores.length,
	};

	return averages;
};

const TraitBar = ({
	trait,
	score,
}: {
	trait: (typeof PERSONALITY_TRAITS)[number];
	score: number;
}) => {
	// Create a visual bar from -2 to +2 (5 segments)
	const segments = 21;
	const center = Math.floor(segments / 2);
	const position = Math.round(((score + 2) / 4) * (segments - 1));

	const bar = Array(segments)
		.fill("─")
		.map((char, i) => {
			if (i === center) return "┼";
			if (i === position) return "●";
			return char;
		})
		.join("");

	const color = score < -0.5 ? "red" : score > 0.5 ? "green" : "yellow";

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color="gray">{trait.lowLabel.padEnd(12)}</Text>
				<Text color={color}>{bar}</Text>
				<Text color="gray"> {trait.highLabel.padStart(12)}</Text>
			</Box>
			<Box justifyContent="center">
				<Text bold color={color}>
					{trait.name}: {score > 0 ? "+" : ""}
					{score.toFixed(2)}
				</Text>
			</Box>
		</Box>
	);
};

const RadarChart = ({ scores }: { scores: TraitScores }) => {
	// Simple ASCII radar visualization
	const traits = PERSONALITY_TRAITS.map((t) => ({
		...t,
		score: scores[t.id],
		normalized: (scores[t.id] + 2) / 4, // 0 to 1
	}));

	return (
		<Box flexDirection="column" alignItems="center" marginY={1}>
			<Text color="cyan">┌─────────────────────────────┐</Text>
			{traits.map((trait, i) => {
				const barLength = Math.round(trait.normalized * 20);
				const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);
				const color =
					trait.score < -0.5 ? "red" : trait.score > 0.5 ? "green" : "yellow";
				return (
					<Box key={trait.id}>
						<Text color="cyan">│ </Text>
						<Text>{trait.name.slice(0, 3).toUpperCase().padEnd(4)}</Text>
						<Text color={color}>{bar}</Text>
						<Text color="cyan"> │</Text>
					</Box>
				);
			})}
			<Text color="cyan">└─────────────────────────────┘</Text>
		</Box>
	);
};

export const Results = ({ completedRounds, modelName }: ResultsProps) => {
	const averages = calculateAverages(completedRounds);

	if (!averages) {
		return (
			<Box
				flexDirection="column"
				borderStyle="double"
				borderColor="red"
				padding={1}
			>
				<Text color="red">No valid scores to display</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box
				flexDirection="column"
				alignItems="center"
				borderStyle="double"
				borderColor="magenta"
				paddingX={3}
				paddingY={1}
				marginBottom={1}
			>
				<Text color="magenta" bold>
					╔═══════════════════════════════════════╗
				</Text>
				<Text color="magenta" bold>
					║ PERSONALITY ANALYSIS COMPLETE ║
				</Text>
				<Text color="magenta" bold>
					╚═══════════════════════════════════════╝
				</Text>
				<Box marginTop={1}>
					<Text color="gray">Model: </Text>
					<Text color="cyan" bold>
						{modelName}
					</Text>
				</Box>
				<Box>
					<Text color="gray">Questions Analyzed: </Text>
					<Text color="white">{completedRounds.length}</Text>
				</Box>
			</Box>

			{/* Radar Chart */}
			<Box flexDirection="column" alignItems="center" marginBottom={1}>
				<Text bold color="cyan">
					Trait Overview
				</Text>
				<RadarChart scores={averages} />
			</Box>

			{/* Detailed Trait Bars */}
			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="gray"
				paddingX={2}
				paddingY={1}
			>
				<Text bold color="white" underline>
					Detailed Trait Analysis
				</Text>
				<Box marginTop={1} />
				{PERSONALITY_TRAITS.map((trait) => (
					<TraitBar key={trait.id} trait={trait} score={averages[trait.id]} />
				))}
			</Box>

			{/* Footer */}
			<Box marginTop={1} justifyContent="center">
				<Text color="gray">Press Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
};
