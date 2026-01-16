import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, Content, Parent, Code, List, Table } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";

const processor = unified().use(remarkParse).use(remarkGfm);

export const parseMarkdown = (content: string): Root => {
	// remark-parse is robust enough to handle partial content during streaming
	return processor.parse(content) as Root;
};

/**
 * Heuristic to estimate the height of a node when rendered.
 * This is used for auto-scrolling logic.
 */
export const estimateNodeHeight = (
	node: Content | Root,
	maxWidth: number,
): number => {
	if (!node) return 0;

	// Helper to calculate text height with wrapping
	const getTextHeight = (text: string): number => {
		if (!text) return 0;
		// Simple wrapping estimation
		return Math.ceil(text.length / maxWidth) || 1;
	};

	switch (node.type) {
		case "root":
		case "blockquote":
		case "listItem":
			return (node as Parent).children.reduce(
				(acc, child) => acc + estimateNodeHeight(child as Content, maxWidth),
				0,
			);

		case "paragraph":
		case "heading": {
			const text = mdastToString(node);
			// Headings often have padding/margins, but here we just count lines
			// Paragraphs might have a margin bottom, but usually 1 empty line is collapsed in the renderer logic
			// or handled by the parent flex container gap.
			// Let's assume strict text wrapping for now + 1 for potential spacing if it's not the last element
			return getTextHeight(text) + 1;
		}

		case "code": {
			// Code blocks: content lines + border (2)
			const codeNode = node as Code;
			const lines = (codeNode.value || "").split("\n").length;
			return lines + 2;
		}

		case "list":
			// List: sum of items
			return (node as List).children.reduce(
				(acc: number, child: Content) =>
					acc + estimateNodeHeight(child, maxWidth),
				0,
			);

		case "table": {
			// Table height estimation is tricky.
			// Header + rows + borders.
			// Roughly: (number of rows + 1 (header)) * 1 (min height per row) + 2 (borders)
			// This is very rough.
			const tableNode = node as Table;
			return tableNode.children.length + 2;
		}

		case "thematicBreak":
			return 1;

		default:
			// Inline elements usually don't add height on their own separate from their container block
			// But if we are traversing a root, we might hit them if they are top level (unlikely for inline)
			return 0;
	}
};
