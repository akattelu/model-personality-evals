import React, { useState, useEffect } from "react";
import { render, Box, Text, useApp, useInput, useStdout } from "ink";
import { Badge } from "@inkjs/ui";
import { Glob } from "bun";
import { RadarChart } from "./components/compare/RadarChart.tsx";
import { QuestionExplorer } from "./components/compare/QuestionExplorer.tsx";
import { ResponseViewer } from "./components/compare/ResponseViewer.tsx";
import { TraitExtremesPanel } from "./components/compare/TraitExtremesPanel.tsx";
import { ScoreDistributionPanel } from "./components/compare/ScoreDistributionPanel.tsx";
import { ModelLegend } from "./components/compare/ModelLegend.tsx";
import type { TraitScores } from "./components/AnswerScoring.tsx";
import type { CompletedRound } from "./components/Results.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ResultsFile {
	evaluatedModel: string;
	evaluatorModel: string;
	timestamp: string;
	questions: string[];
	rounds: CompletedRound[];
	aggregateScores: TraitScores | null;
}

export interface ModelData {
	name: string;
	displayName: string;
	color: ModelColor;
	aggregateScores: TraitScores | null;
	rounds: CompletedRound[];
	questions: string[];
}

export type ModelColor = "cyan" | "yellow" | "magenta" | "green" | "blue";

const MODEL_COLORS: ModelColor[] = [
	"cyan",
	"yellow",
	"magenta",
	"green",
	"blue",
];

type ViewMode = "overview" | "question-detail" | "response-viewer";

// ─────────────────────────────────────────────────────────────────────────────
// Data Loading
// ─────────────────────────────────────────────────────────────────────────────

const loadResultsFiles = async (): Promise<ModelData[]> => {
	const glob = new Glob("results/*.json");
	const files: string[] = [];

	for await (const file of glob.scan({ cwd: process.cwd() })) {
		files.push(file);
	}

	const models: ModelData[] = [];

	for (let i = 0; i < files.length; i++) {
		const filePath = files[i];
		if (!filePath) continue;

		try {
			const content = await Bun.file(filePath).text();
			const data: ResultsFile = JSON.parse(content);

			// Extract display name from model ID (e.g., "openai/gpt-4" -> "gpt-4")
			const displayName =
				data.evaluatedModel.split("/").pop() || data.evaluatedModel;

			models.push({
				name: data.evaluatedModel,
				displayName,
				color: MODEL_COLORS[i % MODEL_COLORS.length] as ModelColor,
				aggregateScores: data.aggregateScores,
				rounds: data.rounds,
				questions: data.questions,
			});
		} catch (err) {
			// Skip invalid files
		}
	}

	return models;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

const CompareApp = () => {
	const [models, setModels] = useState<ModelData[]>([]);
	const [activeModelIndex, setActiveModelIndex] = useState(0);
	const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
	const [viewMode, setViewMode] = useState<ViewMode>("overview");
	const [isLoading, setIsLoading] = useState(true);
	const { exit } = useApp();
	const { stdout } = useStdout();

	// Calculate layout dimensions (90% of terminal)
	const terminalHeight = stdout?.rows ?? 24;
	const terminalWidth = stdout?.columns ?? 80;
	const contentHeight = Math.floor(terminalHeight * 0.9) - 4; // -4 for header/footer
	const contentWidth = Math.floor(terminalWidth * 0.95);
	const quadrantHeight = Math.floor(contentHeight / 2);
	const quadrantWidth = Math.floor(contentWidth / 2);

	// Load data on mount
	useEffect(() => {
		loadResultsFiles().then((data) => {
			setModels(data);
			setIsLoading(false);
		});
	}, []);

	const activeModel = models[activeModelIndex];
	const questions = activeModel?.questions ?? [];

	// Navigation
	useInput((input, key) => {
		if (input === "q" || (key.ctrl && input === "c")) {
			exit();
			return;
		}

		if (key.escape) {
			if (viewMode === "response-viewer") {
				setViewMode("question-detail");
			} else if (viewMode === "question-detail") {
				setViewMode("overview");
			}
			return;
		}

		if (viewMode === "overview" || viewMode === "question-detail") {
			// Left/Right: cycle models
			if (key.leftArrow || input === "h") {
				setActiveModelIndex((prev) =>
					prev > 0 ? prev - 1 : models.length - 1,
				);
			} else if (key.rightArrow || input === "l") {
				setActiveModelIndex((prev) =>
					prev < models.length - 1 ? prev + 1 : 0,
				);
			}

			// Up/Down: navigate questions
			if (key.upArrow || input === "k") {
				setSelectedQuestionIndex((prev) =>
					prev > 0 ? prev - 1 : questions.length - 1,
				);
			} else if (key.downArrow || input === "j") {
				setSelectedQuestionIndex((prev) =>
					prev < questions.length - 1 ? prev + 1 : 0,
				);
			}

			// Enter: drill down
			if (key.return) {
				if (viewMode === "overview") {
					setViewMode("question-detail");
				} else if (viewMode === "question-detail") {
					setViewMode("response-viewer");
				}
			}
		}
	});

	if (isLoading) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="cyan">Loading results...</Text>
			</Box>
		);
	}

	if (models.length === 0) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="red">No result files found in results/</Text>
				<Text color="gray">Run evaluations first with: bun run start</Text>
			</Box>
		);
	}

	// Response Viewer Mode
	if (viewMode === "response-viewer" && activeModel) {
		const round = activeModel.rounds[selectedQuestionIndex];
		return (
			<Box flexDirection="column" paddingX={1} height="100%">
				<Header
					viewMode={viewMode}
					activeModel={activeModel}
					questionIndex={selectedQuestionIndex}
					totalQuestions={questions.length}
				/>
				<ResponseViewer
					modelName={activeModel.displayName}
					modelColor={activeModel.color}
					question={round?.question ?? ""}
					response={round?.response ?? ""}
					scores={round?.scores ?? null}
					height={contentHeight}
					width={contentWidth}
				/>
				<Footer viewMode={viewMode} />
			</Box>
		);
	}

	// Question Detail Mode
	if (viewMode === "question-detail" && activeModel) {
		const leftWidth = Math.floor(contentWidth * 0.55);
		const rightWidth = contentWidth - leftWidth;
		return (
			<Box flexDirection="column" paddingX={1} width={contentWidth}>
				<Header
					viewMode={viewMode}
					activeModel={activeModel}
					questionIndex={selectedQuestionIndex}
					totalQuestions={questions.length}
				/>
				<Box flexDirection="row" height={contentHeight}>
					<Box width={leftWidth} height={contentHeight}>
						<QuestionExplorer
							models={models}
							activeModelIndex={activeModelIndex}
							selectedQuestionIndex={selectedQuestionIndex}
							height={contentHeight}
							width={leftWidth}
						/>
					</Box>
					<Box width={rightWidth} height={contentHeight}>
						<ScoreDistributionPanel
							model={activeModel}
							questionIndex={selectedQuestionIndex}
							height={contentHeight}
							width={rightWidth}
						/>
					</Box>
				</Box>
				<Footer viewMode={viewMode} />
			</Box>
		);
	}

	// Overview Mode (default)
	return (
		<Box flexDirection="column" paddingX={1} width={contentWidth}>
			<Header
				viewMode={viewMode}
				activeModel={activeModel}
				questionIndex={selectedQuestionIndex}
				totalQuestions={questions.length}
			/>

			{/* 2x2 Grid Layout */}
			<Box flexDirection="column" height={contentHeight}>
				{/* Top Row */}
				<Box flexDirection="row" height={quadrantHeight}>
					<Box width={quadrantWidth} height={quadrantHeight}>
						<RadarChart
							models={models}
							activeModelIndex={activeModelIndex}
							height={quadrantHeight}
							width={quadrantWidth}
						/>
					</Box>
					<Box width={quadrantWidth} height={quadrantHeight}>
						<ModelLegend
							models={models}
							activeModelIndex={activeModelIndex}
							height={quadrantHeight}
							width={quadrantWidth}
						/>
					</Box>
				</Box>

				{/* Bottom Row */}
				<Box flexDirection="row" height={quadrantHeight}>
					<Box width={quadrantWidth} height={quadrantHeight}>
						<QuestionExplorer
							models={models}
							activeModelIndex={activeModelIndex}
							selectedQuestionIndex={selectedQuestionIndex}
							height={quadrantHeight}
							width={quadrantWidth}
							compact
						/>
					</Box>
					<Box width={quadrantWidth} height={quadrantHeight}>
						<TraitExtremesPanel
							models={models}
							height={quadrantHeight}
							width={quadrantWidth}
						/>
					</Box>
				</Box>
			</Box>

			<Footer viewMode={viewMode} />
		</Box>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Header & Footer
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
	viewMode: ViewMode;
	activeModel?: ModelData;
	questionIndex: number;
	totalQuestions: number;
}

const Header = ({
	viewMode,
	activeModel,
	questionIndex,
	totalQuestions,
}: HeaderProps) => {
	const modeLabels: Record<ViewMode, string> = {
		overview: "Overview",
		"question-detail": "Question Detail",
		"response-viewer": "Response Viewer",
	};

	return (
		<Box marginBottom={1} justifyContent="space-between">
			<Box>
				<Text bold color="cyan">
					Model Comparison
				</Text>
				<Text color="gray"> - </Text>
				<Badge color="blue">{modeLabels[viewMode]}</Badge>
			</Box>
			<Box gap={2}>
				{activeModel && (
					<Box>
						<Text color="gray">Active: </Text>
						<Text color={activeModel.color} bold>
							{activeModel.displayName}
						</Text>
					</Box>
				)}
				{viewMode !== "overview" && (
					<Box>
						<Text color="gray">
							Q{questionIndex + 1}/{totalQuestions}
						</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
};

interface FooterProps {
	viewMode: ViewMode;
}

const Footer = ({ viewMode }: FooterProps) => {
	const hints: Record<ViewMode, string> = {
		overview: "←→ model | ↑↓ question | Enter drill | q quit",
		"question-detail":
			"←→ model | ↑↓ question | Enter view response | Esc back | q quit",
		"response-viewer": "Esc back | q quit",
	};

	return (
		<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
			<Text color="gray">{hints[viewMode]}</Text>
		</Box>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────────

const instance = render(<CompareApp />, {
	patchConsole: false,
	exitOnCtrlC: false,
});

void instance.waitUntilExit();
