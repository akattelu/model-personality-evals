import React from "react";
import { Box, Text } from "ink";
import { PERSONALITY_TRAITS, type TraitId } from "../AnswerScoring.tsx";
import type { ModelData } from "../../compare.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TraitExtremesPanelProps {
	models: ModelData[];
	height?: number;
	width?: number;
}

interface TraitExtreme {
	traitId: TraitId;
	traitName: string;
	highestModel: {
		name: string;
		score: number;
		color: ModelData["color"];
	} | null;
	lowestModel: {
		name: string;
		score: number;
		color: ModelData["color"];
	} | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const calculateExtremes = (models: ModelData[]): TraitExtreme[] => {
	return PERSONALITY_TRAITS.map((trait) => {
		let highest: TraitExtreme["highestModel"] = null;
		let lowest: TraitExtreme["lowestModel"] = null;

		for (const model of models) {
			if (!model.aggregateScores) continue;

			const score = model.aggregateScores[trait.id];

			if (highest === null || score > highest.score) {
				highest = {
					name: model.displayName,
					score,
					color: model.color,
				};
			}

			if (lowest === null || score < lowest.score) {
				lowest = {
					name: model.displayName,
					score,
					color: model.color,
				};
			}
		}

		return {
			traitId: trait.id,
			traitName: trait.name,
			highestModel: highest,
			lowestModel: lowest,
		};
	});
};

const formatScore = (score: number): string => {
	const sign = score >= 0 ? "+" : "";
	return `${sign}${score.toFixed(1)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const TraitExtremesPanel = ({
	models,
	height,
	width,
}: TraitExtremesPanelProps) => {
	const extremes = calculateExtremes(models);

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="yellow"
			padding={1}
			height={height}
			width={width}
			overflow="hidden"
		>
			<Text bold color="yellow" underline>
				Trait Extremes
			</Text>

			<Box flexDirection="column" marginTop={1}>
				{extremes.map((extreme) => (
					<Box key={extreme.traitId} flexDirection="column" marginBottom={1}>
						<Text bold color="white">
							{extreme.traitName}
						</Text>
						<Box flexDirection="row" gap={2}>
							{/* Highest */}
							<Box>
								<Text color="green">▲ </Text>
								{extreme.highestModel ? (
									<>
										<Text color={extreme.highestModel.color}>
											{extreme.highestModel.name.slice(0, 12)}
										</Text>
										<Text color="gray">
											{" "}
											({formatScore(extreme.highestModel.score)})
										</Text>
									</>
								) : (
									<Text color="gray">-</Text>
								)}
							</Box>

							{/* Lowest */}
							<Box>
								<Text color="red">▼ </Text>
								{extreme.lowestModel ? (
									<>
										<Text color={extreme.lowestModel.color}>
											{extreme.lowestModel.name.slice(0, 12)}
										</Text>
										<Text color="gray">
											{" "}
											({formatScore(extreme.lowestModel.score)})
										</Text>
									</>
								) : (
									<Text color="gray">-</Text>
								)}
							</Box>
						</Box>
					</Box>
				))}
			</Box>
		</Box>
	);
};
