import type React from "react";
import { Box, Text } from "ink";
import { PERSONALITY_TRAITS, type TraitId } from "../AnswerScoring.tsx";
import type { ModelData, ModelColor } from "../../compare.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChartCell {
	char: string;
	color?: ModelColor | "gray" | "white";
	bold?: boolean;
	dimColor?: boolean;
}

type ChartGrid = ChartCell[][];

// Trait abbreviations for vertex labels
const TRAIT_ABBREV: Record<TraitId, string> = {
	assertiveness: "ASS",
	empathy: "EMP",
	openness: "OPN",
	directness: "DIR",
	optimism: "OPT",
};

// ─────────────────────────────────────────────────────────────────────────────
// Chart Grid Functions
// ─────────────────────────────────────────────────────────────────────────────

const createEmptyGrid = (width: number, height: number): ChartGrid => {
	const grid: ChartGrid = [];
	for (let y = 0; y < height; y++) {
		const row: ChartCell[] = [];
		for (let x = 0; x < width; x++) {
			row.push({ char: " " });
		}
		grid.push(row);
	}
	return grid;
};

const setCell = (
	grid: ChartGrid,
	x: number,
	y: number,
	cell: ChartCell,
	width: number,
	height: number,
): void => {
	if (y >= 0 && y < height && x >= 0 && x < width) {
		const row = grid[y];
		if (row) row[x] = cell;
	}
};

const drawLine = (
	grid: ChartGrid,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	cell: ChartCell,
	width: number,
	height: number,
): void => {
	const dx = Math.abs(x1 - x0);
	const dy = Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1;
	const sy = y0 < y1 ? 1 : -1;
	let err = dx - dy;

	let cx = x0;
	let cy = y0;

	while (true) {
		setCell(grid, cx, cy, cell, width, height);

		if (cx === x1 && cy === y1) break;

		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			cx += sx;
		}
		if (e2 < dx) {
			err += dx;
			cy += sy;
		}
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Drawing Functions
// ─────────────────────────────────────────────────────────────────────────────

const normalizeScore = (score: number): number => {
	return (score + 2) / 4;
};

const getVertexPosition = (
	index: number,
	radius: number,
	centerX: number,
	centerY: number,
): { x: number; y: number } => {
	const angle = (-90 + 72 * index) * (Math.PI / 180);
	return {
		x: Math.round(centerX + radius * Math.cos(angle) * 2),
		y: Math.round(centerY + radius * Math.sin(angle)),
	};
};

const drawModelProfile = (
	grid: ChartGrid,
	model: ModelData,
	isActive: boolean,
	maxRadius: number,
	centerX: number,
	centerY: number,
	width: number,
	height: number,
): void => {
	if (!model.aggregateScores) return;

	const points: { x: number; y: number }[] = [];
	const traitIds = PERSONALITY_TRAITS.map((t) => t.id);

	for (let i = 0; i < traitIds.length; i++) {
		const traitId = traitIds[i];
		if (!traitId) continue;
		const score = model.aggregateScores[traitId];
		const normalized = normalizeScore(score);
		const radius = 1 + normalized * (maxRadius - 1);
		const pos = getVertexPosition(i, radius, centerX, centerY);
		points.push(pos);
	}

	const lineChar = isActive ? "━" : "─";
	const lineCell: ChartCell = {
		char: lineChar,
		color: model.color,
		dimColor: !isActive,
	};

	for (let i = 0; i < points.length; i++) {
		const p1 = points[i];
		const p2 = points[(i + 1) % points.length];
		if (!p1 || !p2) continue;
		drawLine(grid, p1.x, p1.y, p2.x, p2.y, lineCell, width, height);
	}

	const markerChar = isActive ? "●" : "○";
	for (let i = 0; i < points.length; i++) {
		const point = points[i];
		if (!point) continue;
		setCell(
			grid,
			point.x,
			point.y,
			{
				char: markerChar,
				color: model.color,
				bold: isActive,
				dimColor: !isActive,
			},
			width,
			height,
		);
	}
};

const drawBasePentagon = (
	grid: ChartGrid,
	maxRadius: number,
	centerX: number,
	centerY: number,
	width: number,
	height: number,
): void => {
	const points: { x: number; y: number }[] = [];

	for (let i = 0; i < 5; i++) {
		const pos = getVertexPosition(i, maxRadius, centerX, centerY);
		points.push(pos);
	}

	for (let i = 0; i < points.length; i++) {
		const p1 = points[i];
		const p2 = points[(i + 1) % points.length];
		if (!p1 || !p2) continue;
		drawLine(
			grid,
			p1.x,
			p1.y,
			p2.x,
			p2.y,
			{ char: "·", color: "gray" },
			width,
			height,
		);
	}

	setCell(grid, centerX, centerY, { char: "+", color: "gray" }, width, height);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface RadarChartProps {
	models: ModelData[];
	activeModelIndex: number;
	height?: number;
	width?: number;
}

export const RadarChart = ({
	models,
	activeModelIndex,
	height: propHeight,
	width: propWidth,
}: RadarChartProps) => {
	// Calculate chart dimensions based on available space
	const boxHeight = propHeight ?? 15;
	const boxWidth = propWidth ?? 45;

	// Account for border (2) and title (1) and padding (2)
	const chartHeight = Math.max(7, boxHeight - 5);
	const chartWidth = Math.max(20, boxWidth - 4);

	const centerX = Math.floor(chartWidth / 2);
	const centerY = Math.floor(chartHeight / 2);
	const maxRadius = Math.min(centerY - 1, Math.floor(centerX / 2) - 1);

	const grid = createEmptyGrid(chartWidth, chartHeight);

	drawBasePentagon(grid, maxRadius, centerX, centerY, chartWidth, chartHeight);

	for (let i = 0; i < models.length; i++) {
		if (i !== activeModelIndex) {
			const model = models[i];
			if (model) {
				drawModelProfile(
					grid,
					model,
					false,
					maxRadius,
					centerX,
					centerY,
					chartWidth,
					chartHeight,
				);
			}
		}
	}

	const activeModel = models[activeModelIndex];
	if (activeModel) {
		drawModelProfile(
			grid,
			activeModel,
			true,
			maxRadius,
			centerX,
			centerY,
			chartWidth,
			chartHeight,
		);
	}

	// Calculate label positions
	const traitLabels: { label: string; x: number; y: number }[] = [];
	const traitIds = PERSONALITY_TRAITS.map((t) => t.id);

	for (let i = 0; i < traitIds.length; i++) {
		const traitId = traitIds[i];
		if (!traitId) continue;
		const pos = getVertexPosition(i, maxRadius + 2, centerX, centerY);
		traitLabels.push({ label: TRAIT_ABBREV[traitId], x: pos.x, y: pos.y });
	}

	const renderRow = (row: ChartCell[], y: number): React.ReactNode[] => {
		const result: React.ReactNode[] = [];
		let skipUntil = -1;

		for (let x = 0; x < row.length; x++) {
			if (x < skipUntil) continue;

			const cell = row[x];
			if (!cell) continue;

			const label = traitLabels.find(
				(l) => Math.abs(l.x - x) <= 1 && l.y === y,
			);

			if (label && x === Math.max(0, label.x - 1)) {
				result.push(
					<Text key={`label-${y}-${x}`} color="white" bold>
						{label.label}
					</Text>,
				);
				skipUntil = x + label.label.length;
				continue;
			}

			result.push(
				<Text
					key={`cell-${y}-${x}`}
					color={cell.color}
					bold={cell.bold}
					dimColor={cell.dimColor}
				>
					{cell.char}
				</Text>,
			);
		}

		return result;
	};

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={1}
			height={boxHeight}
			width={boxWidth}
			overflow="hidden"
		>
			<Text bold color="cyan">
				Radar
			</Text>
			<Box flexDirection="column" overflow="hidden">
				{grid.map((row, y) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: grid rows are stable and have no unique ID
					<Box key={`row-${y}`}>
						<Text>{renderRow(row, y)}</Text>
					</Box>
				))}
			</Box>
		</Box>
	);
};
