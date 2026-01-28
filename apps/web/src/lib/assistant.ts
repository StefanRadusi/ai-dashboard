import { useExternalStoreRuntime, type ThreadMessageLike, type AppendMessage, type AssistantRuntime } from '@assistant-ui/react';
import { useState, useCallback, useMemo } from 'react';
import type { GenieAskResponse, GenieResultResponse } from '@ai-dashboard/shared';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: GenieResultResponse;
}

interface ConversationState {
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
}

async function askGenie(question: string, conversationId?: string): Promise<GenieAskResponse> {
  const response = await fetch('/api/genie/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversationId }),
  });

  if (!response.ok) {
    throw new Error('Failed to send question');
  }

  return response.json();
}

async function getGenieResult(conversationId: string, messageId: string): Promise<GenieResultResponse> {
  const response = await fetch(`/api/genie/result/${conversationId}/${messageId}`);

  if (!response.ok) {
    throw new Error('Failed to get result');
  }

  return response.json();
}

async function pollForResult(
  conversationId: string,
  messageId: string,
  maxAttempts = 30
): Promise<GenieResultResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getGenieResult(conversationId, messageId);

    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Timeout waiting for result');
}

function convertMessage(msg: Message): ThreadMessageLike {
  const parts: Array<
    | { type: 'text'; text: string }
    | {
        type: 'tool-call';
        toolCallId: string;
        toolName: string;
        args: {
          conversationId: string;
          messageId: string;
          data: Record<string, unknown>[];
          columns?: { name: string; type: string }[];
          sql?: string;
        };
      }
  > = [];

  // Add text content if present
  if (msg.content) {
    parts.push({ type: 'text', text: msg.content });
  }

  // Add tool call for data visualization if we have query results
  if (msg.data?.data && msg.data.data.length > 0) {
    parts.push({
      type: 'tool-call',
      toolCallId: `${msg.id}-data`,
      toolName: 'displayData',
      args: {
        conversationId: msg.data.conversationId,
        messageId: msg.data.messageId,
        data: msg.data.data,
        columns: msg.data.columns,
        sql: msg.data.sql,
      },
    });
  }

  return {
    id: msg.id,
    role: msg.role,
    content: parts as ThreadMessageLike['content'],
  };
}

export function useAssistantRuntime(): AssistantRuntime {
  const [state, setState] = useState<ConversationState>({
    conversationId: null,
    messages: [],
    isLoading: false,
  });

  const onNew = useCallback(async (message: AppendMessage) => {
    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') return;
    const question = textContent.text;

    if (!question.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));

    try {
      const askResponse = await askGenie(question, state.conversationId || undefined);

      const result = await pollForResult(askResponse.conversationId, askResponse.messageId);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.description || result.error || 'No response',
        data: result,
      };

      setState((prev) => ({
        conversationId: askResponse.conversationId,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An error occurred',
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
      }));
    }
  }, [state.conversationId]);

  const threadMessages = useMemo(
    () => state.messages.map(convertMessage),
    [state.messages]
  );

  return useExternalStoreRuntime({
    isRunning: state.isLoading,
    messages: threadMessages,
    convertMessage: (msg: ThreadMessageLike) => msg,
    onNew,
  });
}
