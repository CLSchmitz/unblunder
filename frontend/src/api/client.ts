import { AnalysisRequest, AnalysisResponse, Blunder, OutcomeType } from '../types/blunder';

const API_BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Get response text first to handle both JSON and non-JSON responses
  const responseText = await response.text();
  
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.error || errorData.detail || errorMessage;
    } catch {
      // If response is not JSON, use the text or a default message
      errorMessage = responseText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Parse JSON for successful responses
  if (!responseText) {
    throw new Error('Empty response from server');
  }
  
  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
  }
}

export interface StreamEvent {
  type: 'progress' | 'blunder' | 'complete' | 'error';
  games_analyzed?: number;
  total_games?: number;
  blunder?: Blunder;
  error?: string;
}

export interface StreamCallbacks {
  onProgress?: (gamesAnalyzed: number, totalGames: number) => void;
  onBlunder?: (blunder: Blunder) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export const api = {
  async analyze(data: AnalysisRequest): Promise<AnalysisResponse> {
    return request<AnalysisResponse>('/analyze/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async analyzeStream(data: AnalysisRequest, callbacks: StreamCallbacks): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/analyze-stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      callbacks.onError?.(errorMessage);
      throw new Error(errorMessage);
    }

    if (!response.body) {
      callbacks.onError?.('No response body');
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData: StreamEvent = JSON.parse(line.slice(6));
              
              switch (eventData.type) {
                case 'progress':
                  if (eventData.games_analyzed !== undefined && eventData.total_games !== undefined) {
                    callbacks.onProgress?.(eventData.games_analyzed, eventData.total_games);
                  }
                  break;
                case 'blunder':
                  if (eventData.blunder) {
                    callbacks.onBlunder?.(eventData.blunder);
                  }
                  break;
                case 'complete':
                  callbacks.onComplete?.();
                  return;
                case 'error':
                  callbacks.onError?.(eventData.error || 'Unknown error');
                  return;
              }
            } catch (e) {
              console.error('Error parsing SSE event:', e, line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async getDevBlunders(): Promise<AnalysisResponse> {
    return request<AnalysisResponse>('/dev/blunders/');
  },

  async getBlunders(): Promise<Blunder[]> {
    return request<Blunder[]>('/blunders/');
  },

  async getBlunder(id: number): Promise<Blunder> {
    return request<Blunder>(`/blunders/${id}/`);
  },

  async submitAttempt(blunderId: number, attemptedMove: string, outcome: OutcomeType): Promise<void> {
    return request<void>(`/blunders/${blunderId}/attempt/`, {
      method: 'POST',
      body: JSON.stringify({
        attempted_move: attemptedMove,
        outcome,
      }),
    });
  },

  async validateMove(data: { fen: string; from: string; to: string }): Promise<boolean> {
    const response = await request<{ isValid: boolean }>('/dev/validate-move/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.isValid;
  },
};

