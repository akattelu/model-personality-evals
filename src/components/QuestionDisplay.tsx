import React from "react";
import { Box, Text } from "ink";

interface QuestionDisplayProps {
	question: string;
	questionNumber?: number;
}

export const QuestionDisplay = ({
	question,
	questionNumber = 1,
}: QuestionDisplayProps) => {
	return (
		<Box flexDirection="column" height={2} flexShrink={0}>
			<Text color="gray">Question {questionNumber}</Text>
			<Text bold>{question}</Text>
		</Box>
	);
};
