import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import {
	parseMarkdown,
	estimateNodeHeight,
	MarkdownRenderer,
} from "../lib/markdown";
import type {
	Root,
	Content,
	Code,
	Paragraph,
	List,
	ListItem,
	Parent,
	Text as MdastText,
} from "mdast";

interface ModelResponseProps {
	modelName: string;
	response: string;
	isStreaming: boolean;
}

// Helper to slice a node from the top
const sliceNode = (
	node: Content,
	linesToSkip: number,
	maxWidth: number,
): Content | null => {
	if (linesToSkip <= 0) return node;

	switch (node.type) {
		case "paragraph": {
			// Approximation: slice characters based on width
			// This is rough because we don't know exactly where words break
			const charsToSkip = linesToSkip * maxWidth;
			const paragraph = node as Paragraph;
			const textNode = paragraph.children?.[0];
			if (
				!textNode ||
				textNode.type !== "text" ||
				charsToSkip >= textNode.value.length
			) {
				return null;
			}
			return {
				...paragraph,
				children: [
					{
						type: "text",
						value: textNode.value.slice(charsToSkip),
					} as MdastText,
				],
			};
		}
		case "code": {
			const codeNode = node as Code;
			const lines = codeNode.value.split("\n");
			if (linesToSkip >= lines.length) return null;
			return {
				...codeNode,
				value: lines.slice(linesToSkip).join("\n"),
			};
		}
		case "list": {
			// This is tricky. We need to skip items.
			const listNode = node as List;
			let skipped = 0;
			const newChildren: Content[] = [];

			// Note: This logic assumes simple list items.
			for (const child of listNode.children) {
				const h = estimateNodeHeight(child, maxWidth);
				if (skipped + h > linesToSkip) {
					// This item is partially visible or fully visible
					if (skipped < linesToSkip) {
						// Partially visible - just include it all for now to avoid complexity
						newChildren.push(child);
					} else {
						newChildren.push(child);
					}
				}
				skipped += h;
			}
			if (newChildren.length === 0) return null;
			return { ...listNode, children: newChildren } as List; // Cast needed because of Content[] type mismatch in generic Content union potentially
		}
		default:
			return node;
	}
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

	// Parse AST
	const ast = useMemo(() => parseMarkdown(response || ""), [response]);

	// Calculate heights and visible range
	const { visibleAst, totalLines, maxScroll } = useMemo(() => {
		const heights = ast.children.map((child) =>
			estimateNodeHeight(child, contentWidth),
		);
		const total = heights.reduce((a, b) => a + b, 0);
		const max = Math.max(0, total - visibleHeight);

		// Determine start index and skip
		let currentY = 0;
		let startIndex = 0;
		let skipLines = 0;

		for (let i = 0; i < heights.length; i++) {
			if (currentY + (heights[i] ?? 0) > scrollOffset) {
				startIndex = i;
				skipLines = scrollOffset - currentY;
				break;
			}
			currentY += heights[i] ?? 0;
		}

		// If we scrolled past everything
		if (scrollOffset >= total && total > 0) {
			return {
				visibleAst: { type: "root", children: [] } as Root,
				totalLines: total,
				maxScroll: max,
			};
		}

		const visibleChildren: Content[] = [];
		// Slice the first node if needed
		const firstNode = ast.children[startIndex];
		if (firstNode) {
			const sliced = sliceNode(firstNode, skipLines, contentWidth);
			if (sliced) visibleChildren.push(sliced);
		}

		// Add subsequent nodes until we fill the view (roughly)
		// We add a buffer of nodes to ensure we cover the screen
		let linesInView = firstNode ? (heights[startIndex] ?? 0) - skipLines : 0;
		for (let i = startIndex + 1; i < ast.children.length; i++) {
			const child = ast.children[i];
			if (child) {
				visibleChildren.push(child);
				linesInView += heights[i] ?? 0;
				if (linesInView > visibleHeight) break;
			}
		}

		return {
			visibleAst: { type: "root", children: visibleChildren } as Root,
			totalLines: total,
			maxScroll: max,
		};
	}, [ast, contentWidth, visibleHeight, scrollOffset]);

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
			height={visibleHeight + 2} // Force height to contain overflow roughly?
		>
			<Box justifyContent="space-between" flexShrink={0}>
				<Box>
					<Text color="gray">Model: </Text>
					<Text color="yellow">{modelName}</Text>
					{isStreaming && <Text color="magenta"> ● streaming...</Text>}
				</Box>
				{canScroll && !isStreaming && (
					<Text color="gray">[↑↓ scroll] {scrollPercent}%</Text>
				)}
			</Box>
			<Box flexDirection="column" flexGrow={1} marginTop={1} overflow="hidden">
				<MarkdownRenderer ast={visibleAst} />
			</Box>
		</Box>
	);
};
