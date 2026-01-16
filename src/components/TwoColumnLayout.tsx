import type React from "react";
import { Box, useStdout } from "ink";

interface ColumnDimensions {
	width: number;
	height: number;
}

interface TwoColumnLayoutProps {
	left: React.ReactNode | ((dims: ColumnDimensions) => React.ReactNode);
	right: React.ReactNode | ((dims: ColumnDimensions) => React.ReactNode);
}

export const TwoColumnLayout = ({ left, right }: TwoColumnLayoutProps) => {
	const { stdout } = useStdout();
	const terminalWidth = stdout?.columns ?? 80;
	const terminalHeight = stdout?.rows ?? 24;

	// Account for outer paddingX={1} from parent (2 chars total)
	const availableWidth = terminalWidth - 2;
	// Reserve space for header (2 lines) + question banner (~4 lines) + margin
	const availableHeight = terminalHeight - 8;

	// Gap between columns
	const gap = 2;
	// Left column gets ~50%, right column gets the rest
	const leftWidth = Math.floor((availableWidth - gap) / 2);
	const rightWidth = availableWidth - gap - leftWidth;

	const leftDims: ColumnDimensions = {
		width: leftWidth,
		height: availableHeight,
	};
	const rightDims: ColumnDimensions = {
		width: rightWidth,
		height: availableHeight,
	};

	return (
		<Box
			flexDirection="row"
			height={availableHeight}
			width={availableWidth}
			gap={gap}
			marginTop={1}
		>
			<Box width={leftWidth} flexShrink={0}>
				{typeof left === "function" ? left(leftDims) : left}
			</Box>
			<Box width={rightWidth} flexShrink={0}>
				{typeof right === "function" ? right(rightDims) : right}
			</Box>
		</Box>
	);
};
