import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useStdout, useInput } from "ink";

interface ModelResponseProps {
	modelName: string;
	response: string;
	isStreaming: boolean;
}

// Simple markdown renderer - cleans up common LLM output patterns
const renderMarkdown = (text: string): string => {
	return (
		text
			// Headers: ### Header -> just the text
			.replace(/^#{1,6}\s+/gm, "")
			// Bullet points: - item or * item -> • item
			.replace(/^(\s*)[-*]\s+/gm, "$1• ")
			// Numbered lists: 1. item -> 1) item (cleaner look)
			.replace(/^(\s*)(\d+)\.\s+/gm, "$1$2) ")
			// Remove bold markers
			.replace(/\*\*(.+?)\*\*/g, "$1")
			// Remove italic markers
			.replace(/\*(.+?)\*/g, "$1")
			// Remove inline code backticks
			.replace(/`([^`]+)`/g, "$1")
			// Collapse multiple blank lines into one
			.replace(/\n{3,}/g, "\n\n")
			.trim()
	);
};

// Wrap text to fit within a given width
const wrapText = (text: string, width: number): string[] => {
	const lines: string[] = [];

	for (const line of text.split("\n")) {
		if (line.length === 0) {
			lines.push("");
			continue;
		}

		let remaining = line;
		while (remaining.length > 0) {
			if (remaining.length <= width) {
				lines.push(remaining);
				break;
			}

			// Find last space within width
			let breakPoint = remaining.lastIndexOf(" ", width);
			if (breakPoint === -1 || breakPoint === 0) {
				breakPoint = width;
			}

			lines.push(remaining.slice(0, breakPoint));
			remaining = remaining.slice(breakPoint).trimStart();
		}
	}

	return lines;
};

export const ModelResponse = ({
	modelName,
	response,
	isStreaming,
}: ModelResponseProps) => {
	const { stdout } = useStdout();
	const [scrollOffset, setScrollOffset] = useState(0);

	// Calculate dimensions
	// Terminal height minus: question area (2) + padding (2) + border (2) + header (2) + some margin (3)
	const terminalHeight = stdout?.rows ?? 24;
	const terminalWidth = stdout?.columns ?? 80;
	const contentWidth = terminalWidth - 8; // Account for borders and padding
	const visibleHeight = terminalHeight - 11; // Available lines for content

	// Render markdown and wrap to fit width
	const wrappedLines = useMemo(
		() => wrapText(renderMarkdown(response || ""), contentWidth),
		[response, contentWidth],
	);

	const totalLines = wrappedLines.length;
	const maxScroll = Math.max(0, totalLines - visibleHeight);

	// Auto-scroll to bottom while streaming
	useEffect(() => {
		if (isStreaming) {
			setScrollOffset(maxScroll);
		}
	}, [isStreaming, maxScroll]);

	// Manual scroll with arrow keys when not streaming
	useInput((input, key) => {
		if (!isStreaming) {
			if (key.upArrow) {
				setScrollOffset((prev) => Math.max(0, prev - 1));
			} else if (key.downArrow) {
				setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
			} else if (key.pageUp) {
				setScrollOffset((prev) => Math.max(0, prev - visibleHeight));
			} else if (key.pageDown) {
				setScrollOffset((prev) => Math.min(maxScroll, prev + visibleHeight));
			}
		}
	});

	// Get visible lines
	const visibleLines = wrappedLines.slice(
		scrollOffset,
		scrollOffset + visibleHeight,
	);

	// Pad with empty lines if content doesn't fill the box
	while (visibleLines.length < visibleHeight) {
		visibleLines.push("");
	}

	const canScroll = totalLines > visibleHeight;
	const scrollPercent =
		maxScroll > 0 ? Math.round((scrollOffset / maxScroll) * 100) : 100;

	return (
		<Box
			flexDirection="column"
			flexGrow={1}
			borderStyle="round"
			borderColor="green"
			paddingX={2}
			marginTop={1}
		>
			<Box justifyContent="space-between">
				<Box>
					<Text color="gray">Model: </Text>
					<Text color="yellow">{modelName}</Text>
					{isStreaming && <Text color="magenta"> ● streaming...</Text>}
				</Box>
				{canScroll && !isStreaming && (
					<Text color="gray">[↑↓ scroll] {scrollPercent}%</Text>
				)}
			</Box>
			<Box flexDirection="column" flexGrow={1} marginTop={1}>
				{visibleLines.map((line) => (
					<Text key={`${scrollOffset}-${line}`}>{line}</Text>
				))}
			</Box>
		</Box>
	);
};
