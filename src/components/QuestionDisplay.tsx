import { Box, Text, useStdout } from "ink";

interface QuestionDisplayProps {
	question: string;
	questionNumber?: number;
}

export const QuestionDisplay = ({
	question,
	questionNumber = 1,
}: QuestionDisplayProps) => {
	const { stdout } = useStdout();
	const terminalWidth = stdout?.columns ?? 80;
	// Account for border (2) + padding (4) + outer margin (2)
	const textWidth = terminalWidth - 8;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="blue"
			paddingX={2}
			width={terminalWidth - 2}
		>
			<Box>
				<Text color="blue" bold>
					ℹ Question {questionNumber}
				</Text>
			</Box>
			<Box width={textWidth}>
				<Text wrap="wrap">{question}</Text>
			</Box>
		</Box>
	);
};
