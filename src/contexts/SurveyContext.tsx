import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Survey, SurveyResponse, Question } from '../types/survey';
import { useAuth } from './useAuth';

export interface SurveyContextType {
  surveys: Survey[];
  responses: SurveyResponse[];
  activeSurvey: Survey | null;
  createSurvey: (survey: Omit<Survey, 'id' | 'createdAt'>) => Promise<string | null>;
  updateSurvey: (id: string, updates: Partial<Survey>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  activateSurvey: (id: string) => Promise<void>;
  setSurveyStatus: (id: string, status: number) => Promise<void>;
  submitResponse: (response: Omit<SurveyResponse, 'id' | 'submittedAt'>) => void;
  getResponsesForSurvey: (surveyId: string) => SurveyResponse[];
  // New question API methods
  createQuestion: (surveyId: string, question: Omit<Question, 'id'>) => Promise<Question | null>;
  updateQuestion: (surveyId: string, question: Question) => Promise<Question | null>;
  deleteQuestion: (surveyId: string, questionId: string) => Promise<boolean>;
  fetchQuestions: (surveyId: string) => Promise<Question[]>;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

export const useSurvey = () => {
  const context = useContext(SurveyContext);
  if (!context) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }
  return context;
};

const API_BASE = 'https://localhost:7226/api/ManageSurvey';
const QUESTION_API_BASE = 'https://localhost:7226/api/ManageQuestion';

export const SurveyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const { accessToken } = useAuth();

  // Fetch all surveys from backend
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const token = accessToken || localStorage.getItem('token');
        const res = await fetch(`${API_BASE}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Lỗi khi tải danh sách khảo sát');
        const data = await res.json();
        setSurveys(data);
        if (data.length > 0) setActiveSurvey(data.find((s: Survey) => s.isActive) || data[0]);
      } catch {
        setSurveys([]);
      }
    };
    if (accessToken) {
      fetchSurveys();
    } else {
      setSurveys([]);
    }
  }, [accessToken]);

  // Create survey
  const createSurvey = async (surveyData: Omit<Survey, 'id' | 'createdAt'>): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(surveyData)
      });
      if (!res.ok) throw new Error('Lỗi khi tạo khảo sát');
      const created = await res.json();
      setSurveys(prev => [...prev, created]);
      return created.id;
    } catch {
      return null;
    }
  };

  // Update survey
  const updateSurvey = async (id: string, updates: Partial<Survey>): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Lỗi khi cập nhật khảo sát');
      const updated = await res.json();
      setSurveys(prev => prev.map(s => s.id === id ? updated : s));
    } catch {
      // handle error
    }
  };

  // Delete survey
  const deleteSurvey = async (id: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Lỗi khi xóa khảo sát');
      setSurveys(prev => prev.filter(s => s.id !== id));
      if (activeSurvey?.id === id) setActiveSurvey(null);
    } catch {
      // handle error
    }
  };

  // Activate survey (set status)
  const activateSurvey = async (id: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      // status: 1 = active, 0 = inactive
      const res = await fetch(`${API_BASE}/set-status/${id}?status=1`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Lỗi khi kích hoạt khảo sát');
      setSurveys(prev => prev.map(s => ({ ...s, isActive: s.id === id })));
      const found = surveys.find(s => s.id === id);
      if (found) setActiveSurvey({ ...found, isActive: true });
    } catch {
      // handle error
    }
  };

  // Set survey status
  const setSurveyStatus = async (id: string, status: number): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/set-status/${id}?status=${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Lỗi khi đổi trạng thái khảo sát');
      setSurveys(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch {
      // handle error
    }
  };

  // Local only: submit response
  const submitResponse = (responseData: Omit<SurveyResponse, 'id' | 'submittedAt'>) => {
    const newResponse: SurveyResponse = {
      ...responseData,
      id: Date.now().toString(),
      submittedAt: new Date()
    };
    setResponses(prev => [...prev, newResponse]);
  };

  // Local only: get responses for survey
  const getResponsesForSurvey = (surveyId: string) => {
    return responses.filter(response => response.surveyId === surveyId);
  };

  // Create question
  const createQuestion = async (surveyId: string, question: Omit<Question, 'id'>): Promise<Question | null> => {
    try {
      const token = accessToken || localStorage.getItem('token');
      const res = await fetch(`${QUESTION_API_BASE}/${surveyId}/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(question)
      });
      if (!res.ok) throw new Error('Lỗi khi tạo câu hỏi');
      const created = await res.json();
      // Update local survey questions
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, questions: [...(s.questions || []), created] } : s));
      return created;
    } catch {
      return null;
    }
  };

  // Update question
  const updateQuestion = async (surveyId: string, question: Question): Promise<Question | null> => {
    try {
      const token = accessToken || localStorage.getItem('token');
      const res = await fetch(`${QUESTION_API_BASE}/${surveyId}/questions/${question.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(question)
      });
      if (!res.ok) throw new Error('Lỗi khi cập nhật câu hỏi');
      const updated = await res.json();
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, questions: s.questions.map(q => q.id === question.id ? updated : q) } : s));
      return updated;
    } catch {
      return null;
    }
  };

  // Delete question
  const deleteQuestion = async (surveyId: string, questionId: string): Promise<boolean> => {
    try {
      const token = accessToken || localStorage.getItem('token');
      const res = await fetch(`${QUESTION_API_BASE}/${surveyId}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Lỗi khi xóa câu hỏi');
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s));
      return true;
    } catch {
      return false;
    }
  };

  // Fetch questions for a survey
  const fetchQuestions = async (surveyId: string): Promise<Question[]> => {
    try {
      const token = accessToken || localStorage.getItem('token');
      // Use new endpoint for questions by survey
      const res = await fetch(`${QUESTION_API_BASE}/survey/${surveyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Lỗi khi tải câu hỏi');
      const data = await res.json();
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, questions: data } : s));
      return data;
    } catch {
      return [];
    }
  };

  return (
    <SurveyContext.Provider value={{
      surveys,
      responses,
      activeSurvey,
      createSurvey,
      updateSurvey,
      deleteSurvey,
      activateSurvey,
      setSurveyStatus,
      submitResponse,
      getResponsesForSurvey,
      createQuestion,
      updateQuestion,
      deleteQuestion,
      fetchQuestions
    }}>
      {children}
    </SurveyContext.Provider>
  );
};

export default SurveyProvider;