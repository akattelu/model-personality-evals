import React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import { SimpleTable } from "../lib/markdown/renderer.tsx";
import {
	PERSONALITY_TRAITS,
	type TraitScores,
	type TraitId,
} from "./AnswerScoring.tsx";

export interface CompletedRound {
	questionIndex: number;
	question: string;
	response: string;
	scores: TraitScores | null;
}

interface ResultsProps {
	completedRounds: CompletedRound[];
	modelName: string;
}

export const calculateAverages = (
	rounds: CompletedRound[],
): TraitScores | null => {
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

const RadarChart = ({ scores }: { scores: TraitScores }) => {
	// Simple ASCII radar visualization
	const traits = PERSONALITY_TRAITS.map((t) => ({
		...t,
		score: scores[t.id],
		normalized: (scores[t.id] + 2) / 4, // 0 to 1
	}));

	return (
		<Box
			flexDirection="column"
			alignItems="center"
			marginY={1}
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
		>
			{traits.map((trait) => {
				const barLength = Math.round(trait.normalized * 20);
				const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);
				const color =
					trait.score < -0.5 ? "red" : trait.score > 0.5 ? "green" : "yellow";
				return (
					<Box key={trait.id}>
						<Text>{trait.name.slice(0, 3).toUpperCase().padEnd(4)}</Text>
						<Text color={color}>{bar}</Text>
					</Box>
				);
			})}
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

	const tableData = [
		["Trait", "Score", "Tendency"],
		...PERSONALITY_TRAITS.map((trait) => {
			const score = averages[trait.id];
			const tendency =
				score < -0.5
					? trait.lowLabel
					: score > 0.5
						? trait.highLabel
						: "Neutral";
			return [trait.name, score.toFixed(2), tendency];
		}),
	];

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box
				flexDirection="column"
				alignItems="center"
				paddingY={1}
				marginBottom={1}
			>
				<Badge color="magenta">PERSONALITY ANALYSIS COMPLETE</Badge>

				<Box marginTop={1} gap={2}>
					<Box>
						<Text color="gray">Model: </Text>
						<Badge color="cyan">{modelName}</Badge>
					</Box>
					<Box>
						<Text color="gray">Rounds: </Text>
						<Badge color="white">{completedRounds.length}</Badge>
					</Box>
				</Box>
			</Box>

			<Box flexDirection="row" justifyContent="space-around">
				{/* Radar Chart Area */}
				<Box flexDirection="column" alignItems="center">
					<Text bold color="cyan" underline>
						Trait Overview
					</Text>
					<RadarChart scores={averages} />
				</Box>

				{/* Detailed Table Area */}
				<Box flexDirection="column" alignItems="center">
					<Text bold color="white" underline>
						Detailed Metrics
					</Text>
					<Box marginTop={1}>
						<SimpleTable data={tableData} />
					</Box>
				</Box>
			</Box>

			{/* Footer */}
			<Box marginTop={2} justifyContent="center">
				<Text color="gray">Press Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
};
