import React, { useState, useEffect } from 'react';
import { render, Box, useApp, useInput } from 'ink';
import { OpenRouter } from '@openrouter/sdk';
import { QuestionDisplay } from './components/QuestionDisplay.tsx';
import { ModelResponse } from './components/ModelResponse.tsx';
import { AnswerScoring } from './components/AnswerScoring.tsx';

const enterAltScreen = '\x1b[?1049h';
const leaveAltScreen = '\x1b[?1049l';

const EVALUATED_MODEL = 'openai/gpt-oss-120b:free';
const EVALUATOR_MODEL = 'openai/gpt-oss-120b:free';

const SAMPLE_QUESTION = "You're working on a team project and a colleague takes credit for your idea in a meeting. How do you handle this situation?";

const App = () => {
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  useEffect(() => {
    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const streamResponse = async () => {
      const result = openrouter.callModel({
        model: EVALUATED_MODEL,
        input: SAMPLE_QUESTION,
      });

      for await (const delta of result.getTextStream()) {
        setResponse(prev => prev + delta);
      }
      setIsStreaming(false);
    };

    streamResponse().catch(err => {
      setResponse(`Error: ${err.message}`);
      setIsStreaming(false);
    });
  }, []);

  return (
    <Box flexDirection="column" paddingX={1} height="100%">
      <QuestionDisplay
        question={SAMPLE_QUESTION}
        questionNumber={1}
      />
      <ModelResponse
        modelName={EVALUATED_MODEL}
        response={response}
        isStreaming={isStreaming}
      />
      {!isStreaming && response && (
        <AnswerScoring
          evaluatorModel={EVALUATOR_MODEL}
          question={SAMPLE_QUESTION}
          answer={response}
        />
      )}
    </Box>
  );
};

// Enter alternate screen buffer
process.stdout.write(enterAltScreen);

const instance = render(<App />, { patchConsole: false, exitOnCtrlC: false });

void instance.waitUntilExit().then(() => {
  process.stdout.write(leaveAltScreen);
});
