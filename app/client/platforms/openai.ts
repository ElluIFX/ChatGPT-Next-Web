"use client";
import {
  ApiPath,
  DEFAULT_API_HOST,
  DEFAULT_MODELS,
  OpenaiPath,
  REQUEST_TIMEOUT_MS,
  ServiceProvider,
} from "@/app/constant";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";

import {
  ChatOptions,
  getHeaders,
  LLMApi,
  LLMModel,
  LLMUsage,
  MultimodalContent,
  SpeechOptions,
} from "../api";
import Locale from "../../locales";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";
import { prettyObject } from "@/app/utils/format";
import { getClientConfig } from "@/app/config/client";
import { makeAzurePath } from "@/app/azure";
import {
  getMessageTextContent,
  getMessageTextContentWithoutThinking,
  isVisionModel,
  isThinkingModel,
} from "@/app/utils";
import { preProcessImageContent } from "@/app/utils/chat";

export interface OpenAIListModelResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    root: string;
  }>;
}

interface RequestPayload {
  messages: {
    role: "system" | "user" | "assistant";
    content: string | MultimodalContent[];
  }[];
  stream?: boolean;
  model: string;
  temperature?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
}

export class ChatGPTApi implements LLMApi {
  private disableListModels = true;

  path(path: string): string {
    const accessStore = useAccessStore.getState();

    let baseUrl = "";

    if (accessStore.useCustomConfig) {
      const isAzure = accessStore.provider === ServiceProvider.Azure;

      if (isAzure && !accessStore.isValidAzure()) {
        throw Error(
          "incomplete azure config, please check it in your settings page",
        );
      }

      if (isAzure) {
        path = makeAzurePath(path, accessStore.azureApiVersion);
      }

      baseUrl = isAzure ? accessStore.azureUrl : accessStore.openaiUrl;
    }

    if (baseUrl.length === 0) {
      const isApp = !!getClientConfig()?.isApp;
      baseUrl = isApp
        ? DEFAULT_API_HOST + "/proxy" + ApiPath.OpenAI
        : ApiPath.OpenAI;
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1);
    }
    if (!baseUrl.startsWith("http") && !baseUrl.startsWith(ApiPath.OpenAI)) {
      baseUrl = "https://" + baseUrl;
    }

    // console.log("[Proxy Endpoint] ", baseUrl, path);

    return [baseUrl, path].join("/");
  }

  async extractMessage(res: any) {
    if (res.error) {
      return "```\n" + JSON.stringify(res, null, 4) + "\n```";
    }
    return res.choices?.at(0)?.message?.content ?? res;
  }

  async speech(options: SpeechOptions): Promise<ArrayBuffer> {
    const requestPayload = {
      model: options.model,
      input: options.input,
      voice: options.voice,
      response_format: options.response_format,
      speed: options.speed,
    };

    console.log("[Request] openai speech payload: ", requestPayload);

    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const speechPath = this.path(OpenaiPath.SpeechPath);
      const speechPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: getHeaders(),
      };

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      const res = await fetch(speechPath, speechPayload);
      clearTimeout(requestTimeoutId);
      return await res.arrayBuffer();
    } catch (e) {
      console.log("[Request] failed to make a speech request", e);
      throw e;
    }
  }

  async chat(options: ChatOptions) {
    const visionModel = isVisionModel(options.config.model);
    const thinkingModel = isThinkingModel(options.config.model);
    const model_name = options.config.model.toLowerCase();
    const isO1 = model_name.startsWith("o1") || model_name.startsWith("gpt-o1");
    const isO3 = model_name.startsWith("o3") || model_name.startsWith("gpt-o3");
    const isGlm4v = model_name.startsWith("glm-4v");
    const isMistral = model_name.startsWith("mistral");
    const isMiniMax = model_name.startsWith("aabb");
    const isDeepseekReasoner =
      model_name.includes("deepseek-reasoner") ||
      model_name.includes("deepseek-r1");
    const isThinking =
      model_name.includes("thinking") || isO1 || isO3 || isDeepseekReasoner;

    const messages: ChatOptions["messages"] = [];
    for (const v of options.messages) {
      const content = visionModel
        ? await preProcessImageContent(v)
        : v.role === "assistant" // 如果 role 是 assistant
        ? getMessageTextContentWithoutThinking(v) // 调用 getMessageTextContentWithoutThinking
        : getMessageTextContent(v); // 否则调用 getMessageTextContent
      if (!(isO1 && v.role === "system"))
        messages.push({ role: v.role, content });
    }

    // For claude model: roles must alternate between "user" and "assistant" in claude, so add a fake assistant message between two user messages
    const keys = ["system", "user"];
    if (options.config.model.includes("claude")) {
      // 新的处理方式
      // 忽略所有不是 user 或 system 的开头消息
      while (
        messages.length > 0 &&
        messages[0].role !== "user" &&
        messages[0].role !== "system"
      ) {
        messages.shift();
      }

      // 如果第一条消息是 system，确保其后跟着的是 user 消息
      if (messages[0]?.role === "system") {
        let index = 1; // 从 system 后的第一条消息开始检查
        while (index < messages.length && messages[index].role !== "user") {
          messages.splice(index, 1); // 删除非 user 消息
        }
      }
      // 检查消息的顺序，添加或删除消息以确保 user 和 assistant 交替出现
      let i = 0;
      while (i < messages.length) {
        if (
          i < messages.length - 1 &&
          messages[i].role === messages[i + 1].role
        ) {
          if (messages[i].role === "user") {
            // 插入一个含分号的 assistant 消息
            messages.splice(i + 1, 0, {
              role: "assistant",
              content: ";",
            });
            i++; // 跳过新插入的 assistant 消息
          } else if (messages[i].role === "assistant") {
            // 忽略前一条 assistant 消息
            messages.splice(i, 1);
            continue; // 由于数组长度减少，当前索引继续指向下一个待比较的元素
          }
        }
        i++; // 正常移动到下一个元素
      }
      while (
        messages.length > 0 &&
        messages[messages.length - 1].role !== "user"
      ) {
        messages.pop(); // 删除非 user 消息
      }
    }

    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
      },
    };

    // O1 not support image, tools (plugin in ChatGPTNextWeb) and system, stream, logprobs, temperature, top_p, n, presence_penalty, frequency_penalty yet.
    let requestPayload: RequestPayload;
    requestPayload = {
      messages,
      stream: options.config.stream,
      model: modelConfig.model,
      // temperature: !isO1 ? modelConfig.temperature : 1,
      // top_p: !isO1 ? modelConfig.top_p : 1,
    };
    if (!isDeepseekReasoner) {
      if (modelConfig.temperature_enabled) {
        requestPayload["temperature"] = !isO1 ? modelConfig.temperature : 1;
      }
      if (modelConfig.top_p_enabled) {
        requestPayload["top_p"] = !isO1 ? modelConfig.top_p : 1;
      }
    }

    // add max_tokens to vision model
    // if (visionModel && modelConfig.model.includes("preview")) {
    if (modelConfig.max_tokens_enabled) {
      if (
        (visionModel &&
          modelConfig.model !== "gpt-4-turbo" &&
          !isGlm4v &&
          !thinkingModel) ||
        isMiniMax ||
        isDeepseekReasoner
      ) {
        requestPayload["max_tokens"] = Math.max(modelConfig.max_tokens, 4000);
      }
    }

    if (!isMistral && !isDeepseekReasoner) {
      if (modelConfig.presence_penalty_enabled) {
        requestPayload["presence_penalty"] = modelConfig.presence_penalty;
      }
      if (modelConfig.frequency_penalty_enabled) {
        requestPayload["frequency_penalty"] = modelConfig.frequency_penalty;
      }
      if (isO1) {
        if (modelConfig.presence_penalty_enabled) {
          requestPayload["presence_penalty"] = 0;
        }
        if (modelConfig.frequency_penalty_enabled) {
          requestPayload["frequency_penalty"] = 0;
        }
        if (modelConfig.max_tokens_enabled) {
          requestPayload["max_completion_tokens"] = modelConfig.max_tokens;
        }
      }
    }

    console.log("[Request] openai payload: ", requestPayload);

    const shouldStream = !!options.config.stream; // && !isO1; // o1 已经开始支持流式
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const chatPath = this.path(OpenaiPath.ChatPath);
      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: getHeaders(),
      };

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        isThinking ? REQUEST_TIMEOUT_MS * 10 : REQUEST_TIMEOUT_MS,
      );

      if (shouldStream) {
        let responseText = "";
        let remainText = "";
        let finished = false;
        let isInThinking = false;

        // animate response to make it looks smooth
        function animateResponseText() {
          if (finished || controller.signal.aborted) {
            responseText += remainText;
            console.log("[Response Animation] finished");
            if (responseText?.length === 0) {
              options.onError?.(new Error("empty response from server"));
            }
            return;
          }

          if (remainText.length > 0) {
            const fetchCount = Math.max(1, Math.round(remainText.length / 60));
            const fetchText = remainText.slice(0, fetchCount);
            responseText += fetchText;
            remainText = remainText.slice(fetchCount);
            options.onUpdate?.(responseText, fetchText);
          }

          requestAnimationFrame(animateResponseText);
        }

        // start animaion
        animateResponseText();

        const finish = () => {
          if (!finished) {
            finished = true;
            options.onFinish(
              responseText + remainText,
              new Response(null, { status: 200 }),
            );
          }
        };

        controller.signal.onabort = finish;

        fetchEventSource(chatPath, {
          ...chatPayload,
          async onopen(res) {
            clearTimeout(requestTimeoutId);
            const contentType = res.headers.get("content-type");
            console.log(
              "[OpenAI] request response content type: ",
              contentType,
            );

            if (contentType?.startsWith("text/plain")) {
              responseText = await res.clone().text();
              return finish();
            }

            if (
              !res.ok ||
              !res.headers
                .get("content-type")
                ?.startsWith(EventStreamContentType) ||
              res.status !== 200
            ) {
              const responseTexts = [responseText];
              let extraInfo = await res.clone().text();
              try {
                const resJson = await res.clone().json();
                extraInfo = prettyObject(resJson);
              } catch {}

              if (res.status === 401) {
                responseTexts.push(Locale.Error.Unauthorized);
              }

              if (extraInfo) {
                responseTexts.push(extraInfo);
              }

              responseText = responseTexts.join("\n\n");

              return finish();
            }
          },
          onmessage(msg) {
            if (msg.data === "[DONE]" || finished) {
              return finish();
            }
            const text = msg.data;
            try {
              const json = JSON.parse(text);
              const choices = json.choices as Array<{
                delta: {
                  content: string | null;
                  reasoning_content: string | null;
                };
              }>;
              const reasoning = choices[0]?.delta?.reasoning_content;
              const content = choices[0]?.delta?.content;
              const textmoderation = json?.prompt_filter_results;

              if (reasoning && reasoning.length > 0) {
                if (!isInThinking) {
                  remainText += "<think>\n" + reasoning;
                } else {
                  remainText += reasoning;
                }
                isInThinking = true;
              } else if (content && content.length > 0) {
                if (isInThinking) {
                  isInThinking = false;
                  remainText += "\n</think>\n\n" + content;
                } else {
                  remainText += content;
                }
              }

              if (
                textmoderation &&
                textmoderation.length > 0 &&
                ServiceProvider.Azure
              ) {
                const contentFilterResults =
                  textmoderation[0]?.content_filter_results;
                console.log(
                  `[${ServiceProvider.Azure}] [Text Moderation] flagged categories result:`,
                  contentFilterResults,
                );
              }
            } catch (e) {
              console.error("[Request] parse error", text, msg);
            }
          },
          onclose() {
            finish();
          },
          onerror(e) {
            options.onError?.(e);
            throw e;
          },
          openWhenHidden: true,
        });
      } else {
        const res = await fetch(chatPath, chatPayload);
        clearTimeout(requestTimeoutId);

        const resJson = await res.json();
        const message = await this.extractMessage(resJson);
        options.onFinish(message, res);
      }
    } catch (e) {
      console.log("[Request] failed to make a chat request", e);
      options.onError?.(e as Error);
    }
  }
  async usage() {
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
    const ONE_DAY = 1 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = formatDate(startOfMonth);
    const endDate = formatDate(new Date(Date.now() + ONE_DAY));

    const [used, subs] = await Promise.all([
      fetch(
        this.path(
          `${OpenaiPath.UsagePath}?start_date=${startDate}&end_date=${endDate}`,
        ),
        {
          method: "GET",
          headers: getHeaders(),
        },
      ),
      fetch(this.path(OpenaiPath.SubsPath), {
        method: "GET",
        headers: getHeaders(),
      }),
    ]);

    if (used.status === 401) {
      throw new Error(Locale.Error.Unauthorized);
    }

    if (!used.ok || !subs.ok) {
      throw new Error("Failed to query usage from openai");
    }

    const response = (await used.json()) as {
      total_usage?: number;
      error?: {
        type: string;
        message: string;
      };
    };

    const total = (await subs.json()) as {
      hard_limit_usd?: number;
    };

    if (response.error && response.error.type) {
      throw Error(response.error.message);
    }

    if (response.total_usage) {
      response.total_usage = Math.round(response.total_usage) / 100;
    }

    if (total.hard_limit_usd) {
      total.hard_limit_usd = Math.round(total.hard_limit_usd * 100) / 100;
    }

    return {
      used: response.total_usage,
      total: total.hard_limit_usd,
    } as LLMUsage;
  }

  async models(): Promise<LLMModel[]> {
    if (this.disableListModels) {
      return DEFAULT_MODELS.slice();
    }

    const res = await fetch(this.path(OpenaiPath.ListModelPath), {
      method: "GET",
      headers: {
        ...getHeaders(),
      },
    });

    const resJson = (await res.json()) as OpenAIListModelResponse;
    const chatModels = resJson.data?.filter(
      (m) => m.id.startsWith("gpt-") || m.id.startsWith("chatgpt-"),
    );
    console.log("[Models]", chatModels);

    if (!chatModels) {
      return [];
    }

    return chatModels.map((m) => ({
      name: m.id,
      available: true,
      provider: {
        id: "openai",
        providerName: "OpenAI",
        providerType: "openai",
      },
    }));
  }
}
export { OpenaiPath };
