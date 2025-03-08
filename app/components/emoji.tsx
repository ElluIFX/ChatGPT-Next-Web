import EmojiPicker, {
  Emoji,
  EmojiStyle,
  Theme as EmojiTheme,
} from "emoji-picker-react";

import { ModelType } from "../store";

import BotIcon from "../icons/bot.svg";
import BotIconBlack from "../icons/black-bot.svg";
import BotIconDefault from "../icons/llm-icons/default-ai.svg";
import BotIconAzure from "../icons/llm-icons/azure.svg";
import BotIconClaude from "../icons/llm-icons/claude.svg";
import BotIconCohere from "../icons/llm-icons/cohere.svg";
import BotIconDeepseek from "../icons/llm-icons/deepseek.svg";
import BotIconDoubao from "../icons/llm-icons/doubao.svg";
import BotIconFlux from "../icons/llm-icons/flux.svg";
import BotIconGemini from "../icons/llm-icons/gemini.svg";
import BotIconGLM from "../icons/llm-icons/glm.svg";
import BotIconGrok from "../icons/llm-icons/grok.svg";
import BotIconHunyuan from "../icons/llm-icons/hunyuan.svg";
import BotIconInternlm from "../icons/llm-icons/internlm.svg";
import BotIconLlama from "../icons/llm-icons/llama.svg";
import BotIconLuma from "../icons/llm-icons/luma.svg";
import BotIconMidjourney from "../icons/llm-icons/midjourney.svg";
import BotIconMinimax from "../icons/llm-icons/minimax.svg";
import BotIconMistral from "../icons/llm-icons/mistral.svg";
import BotIconMoonshot from "../icons/llm-icons/moonshot.svg";
import BotIconQwen from "../icons/llm-icons/qwen.svg";
import BotIconRunway from "../icons/llm-icons/runway.svg";
import BotIconSparkdesk from "../icons/llm-icons/sparkdesk.svg";
import BotIconStability from "../icons/llm-icons/stability.svg";
import BotIconStep from "../icons/llm-icons/stepfun.svg";
import BotIconSuno from "../icons/llm-icons/suno.svg";
import BotIconWenxin from "../icons/llm-icons/wenxin.svg";
import BotIconYi from "../icons/llm-icons/yi.svg";

export function getEmojiUrl(unified: string, style: EmojiStyle) {
  // Whoever owns this Content Delivery Network (CDN), I am using your CDN to serve emojis
  // Old CDN broken, so I had to switch to this one
  // Author: https://github.com/H0llyW00dzZ
  return `https://fastly.jsdelivr.net/npm/emoji-datasource-apple/img/${style}/64/${unified}.png`;
}

export function AvatarPicker(props: {
  onEmojiClick: (emojiId: string) => void;
}) {
  return (
    <EmojiPicker
      width={"100%"}
      lazyLoadEmojis
      theme={EmojiTheme.AUTO}
      getEmojiUrl={getEmojiUrl}
      onEmojiClick={(e) => {
        props.onEmojiClick(e.unified);
      }}
    />
  );
}

export function Avatar(props: { model?: ModelType; avatar?: string }) {
  if (props.model) {
    let IconComponent;
    let model = props.model.toLowerCase();
    switch (true) {
      case /^(o1|o3)|gpt-(o1|o3)/.test(model):
        IconComponent = BotIconBlack;
        break;
      case model.includes("gpt-"):
        IconComponent = BotIcon;
        break;
      case model.includes("phi-"):
        IconComponent = BotIconAzure;
        break;
      case model.includes("claude"):
        IconComponent = BotIconClaude;
        break;
      case model.includes("command"):
        IconComponent = BotIconCohere;
        break;
      case model.includes("deepseek"):
        IconComponent = BotIconDeepseek;
        break;
      case model.includes("doubao") || model.startsWith("ep-"):
        IconComponent = BotIconDoubao;
        break;
      case model.includes("flux"):
        IconComponent = BotIconFlux;
        break;
      case model.includes("gemini") || model.includes("learnlm"):
        IconComponent = BotIconGemini;
        break;
      case model.includes("glm") ||
        model.startsWith("cogview-") ||
        model.startsWith("cogvideox-"):
        IconComponent = BotIconGLM;
        break;
      case model.includes("grok"):
        IconComponent = BotIconGrok;
        break;
      case model.includes("hunyuan"):
        IconComponent = BotIconHunyuan;
        break;
      case model.includes("internlm"):
        IconComponent = BotIconInternlm;
        break;
      case model.includes("luma"):
        IconComponent = BotIconLuma;
        break;
      case model.includes("llama"):
        IconComponent = BotIconLlama;
        break;
      case model.includes("midjourney") || model.includes("mj"):
        IconComponent = BotIconMidjourney;
        break;
      case model.includes("abab"):
        IconComponent = BotIconMinimax;
        break;
      case model.includes("mistral") ||
        model.includes("pixtral") ||
        model.includes("codestral"):
        IconComponent = BotIconMistral;
        break;
      case model.includes("moonshot") || model.includes("kimi"):
        IconComponent = BotIconMoonshot;
        break;
      case model.includes("qwen") || model.includes("qwq"):
        IconComponent = BotIconQwen;
        break;
      case model.includes("runway"):
        IconComponent = BotIconRunway;
        break;
      case model.includes("sparkdesk"):
        IconComponent = BotIconSparkdesk;
        break;
      case model.includes("stability") ||
        model.includes("stable-diffusion") ||
        model.includes("sd"):
        IconComponent = BotIconStability;
        break;
      case model.includes("step"):
        IconComponent = BotIconStep;
        break;
      case model.includes("suno"):
        IconComponent = BotIconSuno;
        break;
      case model.includes("ernie"):
        IconComponent = BotIconWenxin;
        break;
      case model.includes("yi"):
        IconComponent = BotIconYi;
        break;
      default:
        IconComponent = BotIconDefault;
    }
    return (
      <div className="no-dark">
        <IconComponent width={30} height={30} />
      </div>
    );
  }

  return (
    <div className="user-avatar">
      {props.avatar && <EmojiAvatar avatar={props.avatar} />}
    </div>
  );
}

export function EmojiAvatar(props: { avatar: string; size?: number }) {
  return (
    <Emoji
      unified={props.avatar}
      size={props.size ?? 18}
      getEmojiUrl={getEmojiUrl}
    />
  );
}
