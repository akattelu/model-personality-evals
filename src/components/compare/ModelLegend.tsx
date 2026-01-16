import React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import type { ModelData } from "../../compare.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ModelLegendProps {
	models: ModelData[];
	activeModelIndex: number;
	height?: number;
	width?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ModelLegend = ({
	models,
	activeModelIndex,
	height,
	width,
}: ModelLegendProps) => {
	// Calculate max name length based on width
	const maxNameLen = width ? Math.min(18, width - 15) : 18;

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
				Models ({models.length})
			</Text>

			<Box flexDirection="column" marginTop={1} overflow="hidden">
				{models.map((model, idx) => {
					const isActive = idx === activeModelIndex;
					const scores = model.aggregateScores;

					let profile = "";
					if (scores) {
						const dominant = Object.entries(scores).reduce((a, b) =>
							Math.abs(b[1]) > Math.abs(a[1]) ? b : a,
						);
						const traitNames: Record<string, string> = {
							assertiveness: "ASS",
							empathy: "EMP",
							openness: "OPN",
							directness: "DIR",
							optimism: "OPT",
						};
						profile = traitNames[dominant[0]] ?? "";
					}

					return (
						<Box key={model.name}>
							<Text color={model.color} bold={isActive}>
								{isActive ? "▸●" : " ○"}{" "}
							</Text>
							<Text color={model.color} bold={isActive}>
								{model.displayName.slice(0, maxNameLen).padEnd(maxNameLen + 1)}
							</Text>
							{profile && (
								<Badge color={isActive ? model.color : "gray"}>{profile}</Badge>
							)}
						</Box>
					);
				})}
			</Box>

			<Box marginTop={1}>
				<Text color="gray" dimColor>
					←→ cycle model
				</Text>
			</Box>
		</Box>
	);
};
