import type React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
// import Table from "ink-table"; // Removed due to ESM/CJS issues
import type {
	Root,
	Content,
	Table as MdastTable,
	ListItem,
	Code,
	Heading,
	Parent,
	List,
} from "mdast";

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

const Blockquote = ({ children }: { children: React.ReactNode }) => {
	return (
		<Box
			borderStyle="round"
			borderColor="blue"
			paddingX={1}
			flexDirection="row"
			marginBottom={1}
		>
			<Text color="blue">ℹ </Text>
			<Box flexDirection="column" marginLeft={1} gap={1}>
				{children}
			</Box>
		</Box>
	);
};

const UnorderedList = ({ children }: { children: React.ReactNode }) => {
	return <Box flexDirection="column">{children}</Box>;
};

const OrderedList = ({ children }: { children: React.ReactNode }) => {
	return <Box flexDirection="column">{children}</Box>;
};

const ListItemComp = ({
	children,
	index,
	ordered,
}: { children: React.ReactNode; index?: number; ordered?: boolean }) => {
	return (
		<Box flexDirection="row">
			<Text color="green">{ordered ? `${(index || 0) + 1}. ` : "• "}</Text>
			<Box flexDirection="column" gap={1}>
				{children}
			</Box>
		</Box>
	);
};

// Simple Table implementation since ink-table has CJS/ESM issues
export const SimpleTable = ({ data }: { data: string[][] }) => {
	if (data.length === 0) return null;

	// Calculate column widths
	const colWidths = data[0]?.map((_, colIdx) => {
		return Math.max(...data.map((row) => (row[colIdx] || "").length));
	});

	if (!colWidths) return null;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="gray"
			paddingX={1}
		>
			{data.map((row, rowIndex) => (
				<Box key={`row-${rowIndex}`} flexDirection="column">
					<Box flexDirection="row">
						{row.map((cell, colIdx) => (
							<Box
								key={`cell-${rowIndex}-${colIdx}`}
								width={(colWidths[colIdx] ?? 0) + 2}
								paddingX={1}
							>
								<Text
									bold={rowIndex === 0}
									color={rowIndex === 0 ? "cyan" : undefined}
								>
									{cell}
								</Text>
							</Box>
						))}
					</Box>
					{rowIndex === 0 && (
						<Box flexDirection="row">
							{colWidths.map((w, i) => (
								<Box key={`sep-${i}`} width={w + 2} paddingX={1}>
									<Text color="gray">{"─".repeat(w)}</Text>
								</Box>
							))}
						</Box>
					)}
				</Box>
			))}
		</Box>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Flatten text content from a node tree (for table cells mostly)
const extractText = (node: Content): string => {
	if ("value" in node) return node.value as string;
	if ("children" in node) {
		return (node as Parent).children.map(extractText).join("");
	}
	return "";
};

const transformTableData = (node: MdastTable): string[][] => {
	// Return rows as string arrays
	const rows = node.children.map((row) =>
		row.children.map((cell) => extractText(cell as Content)),
	);
	return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

interface NodeRendererProps {
	node: Content | Root;
	parent?: Content | Root;
}

const NodeRenderer: React.FC<NodeRendererProps> = ({ node, parent }) => {
	if (!node) return null;

	switch (node.type) {
		case "root":
			return (
				<Box flexDirection="column">
					{(node as Root).children.map((child, i) => (
						<NodeRenderer key={i} node={child} parent={node} />
					))}
				</Box>
			);

		case "paragraph": {
			const isInsideListOrQuote =
				parent?.type === "listItem" || parent?.type === "blockquote";
			return (
				<Box marginBottom={isInsideListOrQuote ? 0 : 1}>
					<Text>
						{(node as Parent).children.map((child, i) => (
							<NodeRenderer key={i} node={child} parent={node} />
						))}
					</Text>
				</Box>
			);
		}

		case "heading": {
			const headingNode = node as Heading;
			const depth = headingNode.depth;
			const color =
				depth === 1
					? "cyan"
					: depth === 2
						? "green"
						: depth === 3
							? "yellow"
							: "blue";

			return (
				<Box marginTop={1} marginBottom={1}>
					<Text bold color={color} underline={depth <= 2}>
						{(node as Parent).children.map((child, i) => (
							<NodeRenderer key={i} node={child} parent={node} />
						))}
					</Text>
				</Box>
			);
		}

		case "emphasis":
			return (
				<Text italic>
					{(node as Parent).children.map((child, i) => (
						<NodeRenderer key={i} node={child} parent={node} />
					))}
				</Text>
			);

		case "strong":
			return (
				<Text bold>
					{(node as Parent).children.map((child, i) => (
						<NodeRenderer key={i} node={child} parent={node} />
					))}
				</Text>
			);

		case "delete":
			return (
				<Text strikethrough>
					{(node as Parent).children.map((child, i) => (
						<NodeRenderer key={i} node={child} parent={node} />
					))}
				</Text>
			);

		case "inlineCode":
			// @ts-ignore
			return <Text color="magenta"> {node.value} </Text>;

		case "code": {
			const codeNode = node as Code;
			return (
				<Box
					borderStyle="single"
					borderColor="gray"
					paddingX={1}
					flexDirection="column"
					marginBottom={1}
				>
					{codeNode.lang && (
						<Box marginBottom={0}>
							<Badge color="blue">{codeNode.lang}</Badge>
						</Box>
					)}
					<Text>{codeNode.value}</Text>
				</Box>
			);
		}

		case "blockquote":
			return (
				<Blockquote>
					{(node as Parent).children.map((child, i) => (
						<NodeRenderer key={i} node={child} parent={node} />
					))}
				</Blockquote>
			);

		case "list": {
			const listNode = node as List;
			const Component = listNode.ordered ? OrderedList : UnorderedList;
			return (
				<Box marginBottom={1}>
					<Component>
						{listNode.children.map((child, i) => (
							<ListItemComp
								key={i}
								index={i}
								ordered={listNode.ordered || false}
							>
								{(child as ListItem).children.map((subChild, j) => (
									<NodeRenderer key={j} node={subChild} parent={child} />
								))}
							</ListItemComp>
						))}
					</Component>
				</Box>
			);
		}

		case "listItem":
			// Should be handled by parent list, but if isolated:
			return (
				<Box>
					{(node as Parent).children.map((child, i) => (
						<NodeRenderer key={i} node={child} parent={node} />
					))}
				</Box>
			);

		case "link":
			return (
				<Text color="blue" underline>
					{(node as Parent).children.map((child, i) => (
						<NodeRenderer key={i} node={child} parent={node} />
					))}
				</Text>
			);

		case "text":
			// @ts-ignore
			return <Text>{node.value}</Text>;

		case "table": {
			const data = transformTableData(node as MdastTable);
			if (data.length === 0) return null;
			return (
				<Box marginBottom={1}>
					<SimpleTable data={data} />
				</Box>
			);
		}

		case "thematicBreak":
			return (
				<Box marginY={1}>
					<Text color="gray">{"─".repeat(40)}</Text>
				</Box>
			);

		default:
			if ("children" in node) {
				return (
					<>
						{(node as Parent).children.map((child, i) => (
							<NodeRenderer key={i} node={child} parent={node} />
						))}
					</>
				);
			}
			// @ts-ignore
			return <Text>{node.value || ""}</Text>;
	}
};

export const MarkdownRenderer = ({
	ast,
}: {
	ast: Root;
}) => {
	return <NodeRenderer node={ast} />;
};
