import {
  ApiPath,
  DEFAULT_API_HOST,
  ServiceProvider,
  StoreKey,
} from "../constant";
import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import { createPersistStore } from "../utils/store";
import { ensure } from "../utils/clone";
import { DEFAULT_CONFIG, ModelType } from "./config";
import { showToast } from "../components/ui-lib";

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export"
    ? DEFAULT_API_HOST + "/api/proxy/openai"
    : ApiPath.OpenAI;

const DEFAULT_ACCESS_STATE = {
  accessCode: "",
  useCustomConfig: false,

  provider: ServiceProvider.OpenAI,

  // openai
  openaiUrl: DEFAULT_OPENAI_URL,
  openaiApiKey: "",

  // azure
  azureUrl: "",
  azureApiKey: "",
  azureApiVersion: "2023-08-01-preview",

  // google ai studio
  googleUrl: "",
  googleApiKey: "",
  googleApiVersion: "v1",

  // anthropic
  anthropicApiKey: "",
  anthropicApiVersion: "2023-06-01",
  anthropicUrl: "",

  // server config
  needCode: true,
  hideUserApiKey: false,
  hideBalanceQuery: false,
  disableGPT4: false,
  disableFastLink: false,
  customModels: "",
  defaultModel: "",
  defaultBackupServerAddress: "",
  visionModels: "",
  customHello: "",
  UnauthorizedInfo: "",

  // icon position
  iconPosition: "",

  // sidebar config
  sidebarTitle: "",
  sidebarSubTitle: "",
  siteTitle: "NextChat",

  // model config
  compressModel: "" as ModelType,
  translateModel: "" as ModelType,
  ocrModel: "" as ModelType,

  // tts config
  edgeTTSVoiceName: "zh-CN-YunxiNeural",

  // select labels
  selectLabels: "",
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },

  (set, get) => ({
    setSideBarTitle() {
      this.fetch();
      return get().sidebarTitle;
    },
    setSideBarSubTitle() {
      this.fetch();
      return get().sidebarSubTitle;
    },
    setSiteTitle() {
      this.fetch();
      return get().siteTitle;
    },
    setCompressModel() {
      this.fetch();
      return get().compressModel;
    },
    setTranslateModel() {
      this.fetch();
      return get().translateModel;
    },
    setOcrModel() {
      this.fetch();
      return get().ocrModel;
    },
    setIconPosition() {
      this.fetch();
      return get().iconPosition;
    },
    setCustomHello() {
      this.fetch();
      return get().customHello;
    },
    setUnauthorizedInfo() {
      this.fetch();
      return get().UnauthorizedInfo;
    },
    setDefaultBackupServerAddress() {
      this.fetch();
      return get().defaultBackupServerAddress;
    },
    enabledAccessControl() {
      this.fetch();
      return get().needCode;
    },
    getVisionModels() {
      this.fetch();
      return get().visionModels;
    },
    edgeVoiceName() {
      this.fetch();
      return get().edgeTTSVoiceName;
    },
    getSelectLabels() {
      this.fetch();
      return get().selectLabels;
    },

    isValidOpenAI() {
      return ensure(get(), ["openaiApiKey"]);
    },

    isValidAzure() {
      return ensure(get(), ["azureUrl", "azureApiKey", "azureApiVersion"]);
    },

    isValidGoogle() {
      return ensure(get(), ["googleApiKey"]);
    },

    isValidAnthropic() {
      return ensure(get(), ["anthropicApiKey"]);
    },

    isAuthorized() {
      this.fetch();

      // has token or has code or disabled access control
      return (
        this.isValidOpenAI() ||
        this.isValidAzure() ||
        this.isValidGoogle() ||
        this.isValidAnthropic() ||
        !this.enabledAccessControl() ||
        (this.enabledAccessControl() && ensure(get(), ["accessCode"]))
      );
    },
    fetch() {
      if (fetchState > 0 || getClientConfig()?.buildMode === "export") return;
      fetchState = 1;
      fetch("/api/config", {
        method: "post",
        body: null,
        headers: {
          ...getHeaders(),
        },
      })
        .then((res) => res.json())
        .then((res) => {
          // Set default model from env request
          let defaultModel = res.defaultModel ?? "";
          if (defaultModel !== "") {
            const [model, providerName] = defaultModel.split(/@(?=[^@]*$)/);
            DEFAULT_CONFIG.modelConfig.model = model;
            DEFAULT_CONFIG.modelConfig.providerName = providerName;
          }
          return res;
        })
        .then((res: DangerConfig) => {
          console.log("[Config] got config from server", res);
          set(() => ({ ...res }));
        })
        .catch(() => {
          console.error("[Config] failed to fetch config");
        })
        .finally(() => {
          fetchState = 2;
        });
    },
    fetchAvailableModels(url: string, apiKey: string): Promise<string> {
      // if (fetchState !== 0) return Promise.resolve(DEFAULT_ACCESS_STATE.customModels);
      fetchState = 1;
      return fetch(`${url.replace(/\/+$/, "")}/v1/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            // 抛出错误，包含响应状态和状态文本
            throw new Error(`${res.status} - ${res.statusText}`);
          }
          return res.json();
        })
        .then((res) => {
          const models = res.data || [];
          // 根据关键字，去除非chat格式模型
          const excludedKeywords = [
            "text-",
            "moderation",
            "embedding",
            "dall-e-",
            "davinci",
            "babbage",
            "midjourney",
            "whisper",
            "tts",
          ];
          const availableModels = models
            .filter(
              (model: any) =>
                !excludedKeywords.some((keyword) =>
                  model.id.toLowerCase().includes(keyword.toLowerCase()),
                ),
            )
            .map((model: any) => `${model.id}@OpenAI`)
            .join(",");
          console.log("availableModels", availableModels);
          showToast("fetch and update models list successfully");
          return `-all,${availableModels}`;
        })
        .catch((error) => {
          console.error("[Access] failed to fetch available models: ", error);
          showToast(`failed to fetch available models: ${error}`);
          return DEFAULT_ACCESS_STATE.customModels;
        })
        .finally(() => (fetchState = 2));
    },
  }),
  {
    name: StoreKey.Access,
    version: 2,
    migrate(persistedState, version) {
      if (version < 2) {
        const state = persistedState as {
          token: string;
          openaiApiKey: string;
          azureApiVersion: string;
          googleApiKey: string;
        };
        state.openaiApiKey = state.token;
        state.azureApiVersion = "2023-08-01-preview";
      }

      return persistedState as any;
    },
  },
);
