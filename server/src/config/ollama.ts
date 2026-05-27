import axios, { AxiosInstance, AxiosResponse } from "axios";

const OLLAMA_BASE_URL = "http://localhost:11434";
const MODEL_NAME = "gemma4:e2b-mlx";
const TEMPERATURE = 0.3;
const MAX_TOKENS = 400;
const NUM_CTX = 1024;

const ollamaClient: AxiosInstance = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 60000,
});

export interface OllamaResponse {
  action: "add" | "query" | "delete" | "clear" | "unknown";
  params: {
    title?: string;
    dueDate?: string;
    priority?: "high" | "medium" | "low";
    id?: string;
    searchKey?: string;
  };
  reason?: string;
}

export const generateResponse = async (prompt: string): Promise<OllamaResponse> => {
  try {
    const response: AxiosResponse<{ response?: string }> = await ollamaClient.post("/api/generate", {
      model: MODEL_NAME,
      prompt,
      options: {
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        num_ctx: NUM_CTX,
      },
      think: false,
      stream: false,
    });

    if (!response.data || !response.data.response) {
      return {
        action: "unknown",
        params: {},
        reason: "AI服务响应为空，请稍后重试",
      };
    }

    const responseText = response.data.response.trim();
    try {
      return JSON.parse(responseText);
    } catch {
      return {
        action: "unknown",
        params: {},
        reason: "无法解析响应格式，请重新描述您的需求",
      };
    }
  } catch (error) {
    console.error("❌ Ollama API error:", error);
    throw new Error("AI服务暂不可用，请检查Ollama服务是否已启动或模型是否已加载");
  }
};

export const checkOllamaStatus = async (): Promise<{ status: "running" | "error"; message: string }> => {
  try {
    const response = await ollamaClient.get("/api/tags");
    const models = response.data.models || [];
    const hasModel = models.some((model: { name: string }) => model.name === MODEL_NAME || model.name.startsWith(MODEL_NAME.split(":")[0]));

    if (hasModel) {
      return { status: "running", message: `Ollama服务正常，模型${MODEL_NAME}已加载` };
    } else {
      return {
        status: "error",
        message: `Ollama服务正常，但模型${MODEL_NAME}未加载，请先运行 ollama pull ${MODEL_NAME}`,
      };
    }
  } catch (error) {
    return { status: "error", message: "Ollama服务未启动，请先启动Ollama服务" };
  }
};
