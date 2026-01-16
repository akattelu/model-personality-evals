import React, { useState, useMemo } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { Badge } from "@inkjs/ui";
import { parseMarkdown, MarkdownRenderer } from "../../lib/markdown";
import { PERSONALITY_TRAITS, type TraitScores } from "../AnswerScoring.tsx";
import type { ModelColor } from "../../compare.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ResponseViewerProps {
	modelName: string;
	modelColor: ModelColor;
	question: string;
	response: string;
	scores: TraitScores | null;
	height?: number;
	width?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Display Component
// ─────────────────────────────────────────────────────────────────────────────

const ScoreBar = ({
	score,
	lowLabel,
	highLabel,
}: {
	score: number;
	lowLabel: string;
	highLabel: string;
}) => {
	const normalized = score + 2; // 0 to 4
	const filled = "█".repeat(normalized + 1);
	const empty = "░".repeat(4 - normalized);
	const color = score < 0 ? "red" : score > 0 ? "green" : "yellow";

	return (
		<Box>
			<Text color="gray">{lowLabel.slice(0, 8).padEnd(9)}</Text>
			<Text color={color}>{filled}</Text>
			<Text color="gray">{empty}</Text>
			<Text color="gray"> {highLabel.slice(0, 8)}</Text>
			<Text color="cyan">
				{" "}
				({score > 0 ? "+" : ""}
				{score})
			</Text>
		</Box>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ResponseViewer = ({
	modelName,
	modelColor,
	question,
	response,
	scores,
	height,
	width,
}: ResponseViewerProps) => {
	const { stdout } = useStdout();
	const [scrollOffset, setScrollOffset] = useState(0);

	const terminalHeight = height ?? stdout?.rows ?? 24;
	const terminalWidth = width ?? stdout?.columns ?? 80;
	const contentWidth = terminalWidth - 10;

	// Estimate question height (rough)
	const questionLines = Math.ceil(question.length / contentWidth) + 2;
	const visibleHeight = terminalHeight - questionLines - 6; // Account for question, header, padding

	// Parse markdown
	const ast = useMemo(() => parseMarkdown(response || ""), [response]);

	// Simple line count estimation
	const totalLines = useMemo(() => {
		const lines = response.split("\n").length;
		// Rough estimate accounting for word wrap and block elements
		// Adding some buffer for headings/code blocks
		return Math.max(
			lines,
			Math.ceil((response.length * 1.2) / (contentWidth * 0.65)),
		);
	}, [response, contentWidth]);

	const maxScroll = Math.max(0, totalLines - visibleHeight);

	// Scroll handling
	useInput((input, key) => {
		if (key.upArrow) {
			setScrollOffset((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
		} else if (key.pageUp) {
			setScrollOffset((prev) => Math.max(0, prev - visibleHeight));
		} else if (key.pageDown) {
			setScrollOffset((prev) => Math.min(maxScroll, prev + visibleHeight));
		}
	});

	const canScroll = totalLines > visibleHeight;
	const scrollPercent =
		maxScroll > 0 ? Math.round((scrollOffset / maxScroll) * 100) : 100;

	return (
		<Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
			{/* Question header */}
			<Box
				borderStyle="single"
				borderColor="gray"
				paddingX={1}
				marginBottom={1}
				flexShrink={0}
			>
				<Text color="white" wrap="wrap">
					{question}
				</Text>
			</Box>

			{/* Main content area */}
			<Box flexDirection="row" flexGrow={1} overflow="hidden">
				{/* Response panel */}
				<Box
					flexDirection="column"
					borderStyle="round"
					borderColor={modelColor}
					paddingX={2}
					paddingY={1}
					width="70%"
					height="100%"
				>
					<Box justifyContent="space-between" marginBottom={1} flexShrink={0}>
						<Box>
							<Text color="gray">Response from </Text>
							<Badge color={modelColor}>{modelName}</Badge>
						</Box>
						{canScroll && <Text color="gray">[↑↓] {scrollPercent}%</Text>}
					</Box>

					<Box
						flexDirection="column"
						flexGrow={1}
						overflow="hidden"
						width="100%"
					>
						<Box flexDirection="column" marginTop={-scrollOffset}>
							<MarkdownRenderer ast={ast} />
						</Box>
					</Box>
				</Box>

				{/* Scores panel */}
				<Box
					flexDirection="column"
					borderStyle="round"
					borderColor="magenta"
					paddingX={2}
					paddingY={1}
					width="30%"
					marginLeft={1}
					height="100%"
				>
					<Text bold color="magenta">
						Trait Scores
					</Text>

					{scores ? (
						<Box flexDirection="column" marginTop={1}>
							{PERSONALITY_TRAITS.map((trait) => (
								<Box key={trait.id} flexDirection="column" marginBottom={1}>
									<Text bold color="white">
										{trait.name}
									</Text>
									<ScoreBar
										score={scores[trait.id]}
										lowLabel={trait.lowLabel}
										highLabel={trait.highLabel}
									/>
								</Box>
							))}
						</Box>
					) : (
						<Text color="gray">No scores available</Text>
					)}
				</Box>
			</Box>
		</Box>
	);
};
