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

export const api = {
  async analyze(data: AnalysisRequest): Promise<AnalysisResponse> {
    return request<AnalysisResponse>('/analyze/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

