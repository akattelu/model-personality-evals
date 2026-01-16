import React from "react";
import { Box, Text } from "ink";
import { PERSONALITY_TRAITS, type TraitId } from "../AnswerScoring.tsx";
import type { ModelData } from "../../compare.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QuestionExplorerProps {
	models: ModelData[];
	activeModelIndex: number;
	selectedQuestionIndex: number;
	compact?: boolean;
	height?: number;
	width?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const truncateQuestion = (question: string, maxLength: number): string => {
	if (question.length <= maxLength) return question;
	return `${question.slice(0, maxLength - 3)}...`;
};

const formatScore = (score: number | undefined): string => {
	if (score === undefined) return "  - ";
	const sign = score >= 0 ? "+" : "";
	return `${sign}${score.toFixed(1)}`.padStart(4);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const QuestionExplorer = ({
	models,
	activeModelIndex,
	selectedQuestionIndex,
	compact = false,
	height,
	width,
}: QuestionExplorerProps) => {
	const activeModel = models[activeModelIndex];
	const questions = activeModel?.questions ?? [];
	const maxQLen = width ? width - 12 : 50;

	if (compact) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="gray"
				paddingX={1}
				height={height}
				width={width}
				overflow="hidden"
			>
				<Text bold color="white">
					Questions
				</Text>
				{questions.slice(0, 5).map((question, idx) => {
					const isSelected = idx === selectedQuestionIndex;
					return (
						<Box
							// biome-ignore lint/suspicious/noArrayIndexKey: stable
							key={idx}
						>
							<Text color={isSelected ? "yellow" : "gray"}>
								{isSelected ? "▸" : " "}Q{idx + 1}:{" "}
							</Text>
							<Text color={isSelected ? "white" : "gray"}>
								{truncateQuestion(question, maxQLen)}
							</Text>
						</Box>
					);
				})}
			</Box>
		);
	}

	// Full mode
	const selectedQuestion = questions[selectedQuestionIndex];
	const modelNameLen = width ? Math.min(14, Math.floor(width * 0.25)) : 14;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="blue"
			paddingX={1}
			height={height}
			width={width}
			overflow="hidden"
		>
			<Text bold color="blue">
				Question Explorer
			</Text>

			{/* Question list */}
			<Box flexDirection="row" marginTop={1} gap={1}>
				{questions.map((_, idx) => {
					const isSelected = idx === selectedQuestionIndex;
					return (
						<Text
							// biome-ignore lint/suspicious/noArrayIndexKey: stable
							key={idx}
							color={isSelected ? "yellow" : "gray"}
							bold={isSelected}
						>
							{isSelected ? "▸" : " "}Q{idx + 1}
						</Text>
					);
				})}
			</Box>

			{/* Selected question text */}
			{selectedQuestion && (
				<Box marginY={1} borderStyle="single" borderColor="gray" paddingX={1}>
					<Text color="white" wrap="wrap">
						{truncateQuestion(selectedQuestion, width ? width - 6 : 60)}
					</Text>
				</Box>
			)}

			{/* Scores table */}
			<Box flexDirection="column" overflow="hidden">
				<Text bold color="cyan">
					Scores for Q{selectedQuestionIndex + 1}
				</Text>
				<Box flexDirection="column">
					{/* Header */}
					<Box>
						<Text color="gray">{"Model".padEnd(modelNameLen + 2)}</Text>
						{PERSONALITY_TRAITS.map((trait) => (
							<Text key={trait.id} color="gray">
								{trait.name.slice(0, 3).padStart(5)}
							</Text>
						))}
					</Box>

					{/* Model rows */}
					{models.map((model, idx) => {
						const isActive = idx === activeModelIndex;
						const round = model.rounds[selectedQuestionIndex];
						const scores = round?.scores;

						return (
							<Box key={model.name}>
								<Text color={model.color} bold={isActive}>
									{isActive ? "▸" : " "}
									{model.displayName
										.slice(0, modelNameLen)
										.padEnd(modelNameLen + 1)}
								</Text>
								{PERSONALITY_TRAITS.map((trait) => {
									const score = scores?.[trait.id as TraitId];
									const color =
										score === undefined
											? "gray"
											: score < 0
												? "red"
												: score > 0
													? "green"
													: "yellow";
									return (
										<Text key={trait.id} color={color}>
											{formatScore(score)}
										</Text>
									);
								})}
							</Box>
						);
					})}
				</Box>
			</Box>
		</Box>
	);
};
