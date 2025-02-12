import EmojiPicker, {
  Emoji,
  EmojiStyle,
  Theme as EmojiTheme,
} from "emoji-picker-react";

import { ModelType } from "../store";

import BotIcon from "../icons/bot.svg";
import BotIconBlack from "../icons/black-bot.svg";
import BotIconClaude from "../icons/bot-claude.svg";
import BotIconCohere from "../icons/bot-cohere.svg";
import BotIconDeepseek from "../icons/bot-deepseek.svg";
import BotIconDoubao from "../icons/bot-doubao.svg";
import BotIconFlux from "../icons/bot-flux.svg";
import BotIconGemini from "../icons/bot-gemini.svg";
import BotIconGLM from "../icons/bot-glm.svg";
import BotIconGrok from "../icons/bot-grok.svg";
import BotIconHunyuan from "../icons/bot-hunyuan.svg";
import BotIconInternlm from "../icons/bot-internlm.svg";
import BotIconLlama from "../icons/bot-llama.svg";
import BotIconLuma from "../icons/bot-luma.svg";
import BotIconMidjourney from "../icons/bot-midjourney.svg";
import BotIconMinimax from "../icons/bot-minimax.svg";
import BotIconMistral from "../icons/bot-mistral.svg";
import BotIconMoonshot from "../icons/bot-moonshot.svg";
import BotIconQwen from "../icons/bot-qwen.svg";
import BotIconRunway from "../icons/bot-runway.svg";
import BotIconSparkdesk from "../icons/bot-sparkdesk.svg";
import BotIconStability from "../icons/bot-stability.svg";
import BotIconStep from "../icons/bot-stepfun.svg";
import BotIconSuno from "../icons/bot-suno.svg";
import BotIconWenxin from "../icons/bot-wenxin.svg";
import BotIconYi from "../icons/bot-yi.svg";

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
  // if (props.model) {
  //   return (
  //     <div className="no-dark">
  //       {props.model?.startsWith("gpt-4") ? (
  //         <BlackBotIcon className="user-avatar" />
  //       ) : (
  //         <BotIcon className="user-avatar" />
  //       )}
  //     </div>
  //   );
  // }
  if (props.model) {
    let IconComponent;
    let model = props.model.toLowerCase();
    switch (true) {
      case model.includes("o1") || model.includes("o3"):
        IconComponent = BotIconBlack;
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
      case model.includes("doubao"):
        IconComponent = BotIconDoubao;
        break;
      case model.includes("flux"):
        IconComponent = BotIconFlux;
        break;
      case model.includes("gemini") || model.includes("learnlm"):
        IconComponent = BotIconGemini;
        break;
      case model.includes("glm") || model.includes("cogvideo"):
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
      case model.includes("mistral") || model.includes("pixtral"):
        IconComponent = BotIconMistral;
        break;
      case model.includes("moonshot"):
        IconComponent = BotIconMoonshot;
        break;
      case model.includes("qwen"):
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
        IconComponent = BotIcon;
    }
    return (
      <div className="no-dark">
        <IconComponent />
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
