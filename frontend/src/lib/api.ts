const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiRequest<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Add Bearer token from localStorage for seamless cross-origin auth (Vercel -> Render)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("lwavee_auth_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  if (options.data && !(options.data instanceof FormData)) {
    options.body = JSON.stringify(options.data);
  }

  // If uploading FormData, delete Content-Type to let the browser set boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Sends HttpOnly cookie automatically
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = json?.error?.message || json?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Auth
  login: (data: any) => apiRequest("/api/auth/login", { method: "POST", data }),
  register: (data: any) => apiRequest("/api/auth/register", { method: "POST", data }),
  logout: () => apiRequest("/api/auth/logout", { method: "POST" }),
  getMe: () => apiRequest("/api/auth/me"),
  updatePreferences: (data: any) => apiRequest("/api/auth/preferences", { method: "PUT", data }),

  // Dashboard
  getDashboardStats: () => apiRequest("/api/dashboard/stats"),

  // Research
  getTopics: () => apiRequest("/api/research/topics"),
  discoverResearch: (data: any) => apiRequest("/api/research/discover", { method: "POST", data }),
  getArticles: (params: string = "") => apiRequest(`/api/research/articles${params ? `?${params}` : ""}`),
  generateIdeasFromArticle: (id: string) => apiRequest(`/api/research/articles/${id}/generate-ideas`, { method: "POST" }),

  // Content Ideas
  getContentIdeas: (params: string = "") => apiRequest(`/api/content-ideas${params ? `?${params}` : ""}`),
  createContentIdea: (data: any) => apiRequest("/api/content-ideas", { method: "POST", data }),
  updateIdeaStatus: (id: string, data: any) => apiRequest(`/api/content-ideas/${id}/status`, { method: "PUT", data }),
  createScriptFromIdea: (id: string, data: any) => apiRequest(`/api/content-ideas/${id}/create-script`, { method: "POST", data }),
  deleteIdea: (id: string) => apiRequest(`/api/content-ideas/${id}`, { method: "DELETE" }),

  // Scripts
  getScripts: (params: string = "") => apiRequest(`/api/scripts${params ? `?${params}` : ""}`),
  getScript: (id: string) => apiRequest(`/api/scripts/${id}`),
  generateScript: (data: any) => apiRequest("/api/scripts/generate", { method: "POST", data }),
  updateScript: (id: string, data: any) => apiRequest(`/api/scripts/${id}`, { method: "PUT", data }),
  updateScriptStatus: (id: string, data: any) => apiRequest(`/api/scripts/${id}/status`, { method: "PUT", data }),
  createPostFromScript: (id: string, data: any) => apiRequest(`/api/scripts/${id}/create-post`, { method: "POST", data }),

  // Media
  getMedia: (params: string = "") => apiRequest(`/api/media${params ? `?${params}` : ""}`),
  uploadMedia: (formData: FormData) =>
    apiRequest("/api/media/upload", {
      method: "POST",
      body: formData,
    }),
  deleteMedia: (id: string) => apiRequest(`/api/media/${id}`, { method: "DELETE" }),

  // Posts & Publishing
  getPosts: (params: string = "") => apiRequest(`/api/posts${params ? `?${params}` : ""}`),
  getPost: (id: string) => apiRequest(`/api/posts/${id}`),
  createPost: (data: any) => apiRequest("/api/posts", { method: "POST", data }),
  publishPostNow: (id: string) => apiRequest(`/api/posts/${id}/publish-now`, { method: "POST" }),
  deletePost: (id: string) => apiRequest(`/api/posts/${id}`, { method: "DELETE" }),

  // Calendar
  getCalendarEvents: (params: string = "") => apiRequest(`/api/calendar/events${params ? `?${params}` : ""}`),
  reschedulePost: (id: string, data: any) => apiRequest(`/api/calendar/reschedule/${id}`, { method: "PUT", data }),

  // Instagram
  getInstagramAuthUrl: () => apiRequest("/api/instagram/auth-url"),
  getInstagramAccount: () => apiRequest("/api/instagram/account"),
  connectInstagramToken: (data: any) => apiRequest("/api/instagram/connect-token", { method: "POST", data }),
  disconnectInstagram: () => apiRequest("/api/instagram/disconnect", { method: "POST" }),

  // Analytics
  getAnalytics: (range: string = "30d") => apiRequest(`/api/analytics/overview?range=${range}`),

  // Automation
  getExecutions: (params: string = "") => apiRequest(`/api/automation/executions${params ? `?${params}` : ""}`),
  triggerWorkflow: (workflowCode: string) => apiRequest(`/api/automation/trigger/${workflowCode}`, { method: "POST" }),

  // Integrations & AI Providers
  getAiProviders: () => apiRequest("/api/integrations/ai-providers"),
  testAiConnection: (data: any) => apiRequest("/api/integrations/ai-providers/test", { method: "POST", data }),
  saveAiConfig: (data: any) => apiRequest("/api/integrations/ai-providers/save", { method: "POST", data }),

  // Settings & Activity
  getNotifications: () => apiRequest("/api/settings/notifications"),
  markNotificationsRead: () => apiRequest("/api/settings/notifications/mark-read", { method: "PUT" }),
  getActivityLogs: () => apiRequest("/api/settings/activity-logs"),
};

