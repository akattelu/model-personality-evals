import React from "react";
import { Box, Text } from "ink";
import { PERSONALITY_TRAITS, type TraitId } from "../AnswerScoring.tsx";
import type { ModelData } from "../../compare.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreDistributionPanelProps {
	model: ModelData;
	questionIndex: number;
	height?: number;
	width?: number;
}

interface TraitStats {
	traitId: TraitId;
	traitName: string;
	scores: number[];
	average: number;
	variance: number;
	currentScore: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const calculateStats = (
	model: ModelData,
	questionIndex: number,
): TraitStats[] => {
	return PERSONALITY_TRAITS.map((trait) => {
		const scores: number[] = [];

		for (const round of model.rounds) {
			if (round.scores) {
				scores.push(round.scores[trait.id]);
			}
		}

		const average =
			scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

		const variance =
			scores.length > 1
				? scores.reduce((sum, s) => sum + (s - average) ** 2, 0) / scores.length
				: 0;

		const currentRound = model.rounds[questionIndex];
		const currentScore = currentRound?.scores?.[trait.id] ?? null;

		return {
			traitId: trait.id,
			traitName: trait.name,
			scores,
			average,
			variance,
			currentScore,
		};
	});
};

const formatScore = (score: number | null): string => {
	if (score === null) return "  -  ";
	const sign = score >= 0 ? "+" : "";
	return `${sign}${score.toFixed(1)}`.padStart(5);
};

// ─────────────────────────────────────────────────────────────────────────────
// Mini Bar Component
// ─────────────────────────────────────────────────────────────────────────────

const MiniDistributionBar = ({
	scores,
	currentScore,
	average,
}: {
	scores: number[];
	currentScore: number | null;
	average: number;
}) => {
	// Map -2 to 2 range to 0-20 character positions
	const WIDTH = 21;
	const toPos = (val: number) => Math.round(((val + 2) / 4) * (WIDTH - 1));

	const chars: string[] = Array(WIDTH).fill("─");

	// Mark all scores as dots
	for (const score of scores) {
		const pos = toPos(score);
		if (pos >= 0 && pos < WIDTH) {
			chars[pos] = "·";
		}
	}

	// Mark average
	const avgPos = toPos(average);
	if (avgPos >= 0 && avgPos < WIDTH) {
		chars[avgPos] = "│";
	}

	// Mark current score
	if (currentScore !== null) {
		const curPos = toPos(currentScore);
		if (curPos >= 0 && curPos < WIDTH) {
			chars[curPos] = "●";
		}
	}

	// Color based on average
	const barColor = average < 0 ? "red" : average > 0 ? "green" : "yellow";

	return (
		<Box>
			<Text color="gray">[</Text>
			<Text color={barColor}>{chars.join("")}</Text>
			<Text color="gray">]</Text>
		</Box>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ScoreDistributionPanel = ({
	model,
	questionIndex,
	height,
	width,
}: ScoreDistributionPanelProps) => {
	const stats = calculateStats(model, questionIndex);

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="magenta"
			padding={1}
			height={height}
			width={width}
			overflow="hidden"
		>
			<Box marginBottom={1}>
				<Text bold color="magenta" underline>
					Score Distribution
				</Text>
				<Text color="gray"> - </Text>
				<Text color={model.color}>{model.displayName}</Text>
			</Box>

			{/* Legend */}
			<Box marginBottom={1}>
				<Text color="gray">● current │ avg · all scores</Text>
			</Box>

			<Box flexDirection="column">
				{stats.map((stat) => (
					<Box key={stat.traitId} flexDirection="column" marginBottom={1}>
						<Box justifyContent="space-between">
							<Text color="white">{stat.traitName.padEnd(12)}</Text>
							<Box gap={1}>
								<Text color="cyan">{formatScore(stat.currentScore)}</Text>
								<Text color="gray">avg:</Text>
								<Text color="white">{formatScore(stat.average)}</Text>
							</Box>
						</Box>
						<MiniDistributionBar
							scores={stat.scores}
							currentScore={stat.currentScore}
							average={stat.average}
						/>
					</Box>
				))}
			</Box>

			{/* Variance summary */}
			<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					Higher variance = more inconsistent responses across questions
				</Text>
			</Box>
		</Box>
	);
};
