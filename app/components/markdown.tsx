import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeRaw from "rehype-raw";
import RehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";
import { useRef, useState, RefObject, useEffect, useMemo } from "react";
import { copyToClipboard, useWindowSize } from "../utils";
import mermaid from "mermaid";
import Locale from "../locales";
import LoadingIcon from "../icons/three-dots.svg";
import ReloadButtonIcon from "../icons/reload.svg";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { showImageModal, FullScreen } from "./ui-lib";
import { HTMLPreview, HTMLPreviewHander } from "./artifacts";
import { useChatStore } from "../store";
import { IconButton } from "./button";

import { useAppConfig } from "../store/config";

import { Collapse } from "antd";
import styled from "styled-components";
const { Panel } = Collapse;

interface ThinkCollapseProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fontSize?: number;
}
const ThinkCollapse = styled(
  ({ title, children, className, fontSize }: ThinkCollapseProps) => {
    // 如果是 Thinking 状态，默认展开，否则折叠
    const defaultActive = title === Locale.NewChat.Thinking ? ["1"] : [];
    // 如果是 NoThink 状态，禁用
    const disabled = title === Locale.NewChat.NoThink;
    const [activeKeys, setActiveKeys] = useState(defaultActive);

    // 当标题从 Thinking 变为 Think 或 NoThink 时自动折叠
    useEffect(() => {
      if (title === Locale.NewChat.Think || title === Locale.NewChat.NoThink) {
        setActiveKeys([]);
      } else if (title === Locale.NewChat.Thinking) {
        setActiveKeys(["1"]);
      }
    }, [title]);

    return (
      <Collapse
        className={`${className} ${disabled ? "disabled" : ""}`}
        size="small"
        activeKey={activeKeys}
        onChange={(keys) => !disabled && setActiveKeys(keys as string[])}
        bordered={false}
      >
        <Panel header={title} key="1">
          {children}
        </Panel>
      </Collapse>
    );
  },
)<{ fontSize?: number }>`
  .ant-collapse-item {
    border: var(--border-in-light) !important;
    border-radius: 10px !important;
    background-color: var(--white) !important;
    margin-bottom: 8px !important;
  }

  .ant-collapse-header {
    color: var(--black) !important;
    font-weight: bold !important;
    font-size: ${(props) => props.fontSize ?? 14}px !important;
    padding: 6px 12px !important;
    align-items: center !important;
    transition: all 0.3s ease !important;

    .ant-collapse-expand-icon {
      color: var(--primary) !important;
    }
  }

  .ant-collapse-content {
    background-color: transparent !important;
    border-top: 1px solid var(--border-in-light) !important;

    .ant-collapse-content-box {
      padding: 8px 12px !important;
      font-size: 14px;
      color: var(--black);
      opacity: 0.8;
    }
  }

  &.disabled {
    opacity: 0.9;
    pointer-events: none;
    .ant-collapse-item {
      border: none !important;
      background-color: transparent !important;
    }
    .ant-collapse-header {
      padding: 6px 0px !important;
    }
  }
`;

// 配置安全策略，允许 thinkcollapse 标签，防止html注入造成页面崩溃
const sanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div || []),
      ["className", "math", "math-display"],
    ],
    math: [["xmlns", "http://www.w3.org/1998/Math/MathML"], "display"],
    annotation: ["encoding"],
    span: ["className", "style"],
    svg: [
      ["xmlns", "http://www.w3.org/2000/svg"],
      "width",
      "height",
      "viewBox",
      "preserveAspectRatio",
    ],
    path: ["d"],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "thinkcollapse",
    "math",
    "semantics",
    "annotation",
    "mrow",
    "mi",
    "mo",
    "mfrac",
    "mn",
    "msup",
    "msub",
    "svg",
    "path",
  ],
};

function Details(props: { children: React.ReactNode }) {
  return <details>{props.children}</details>;
}

function Summary(props: { children: React.ReactNode }) {
  return <summary>{props.children}</summary>;
}

export function Mermaid(props: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (props.code && ref.current) {
      mermaid
        .run({
          nodes: [ref.current],
          suppressErrors: true,
        })
        .catch((e) => {
          setHasError(true);
          console.error("[Mermaid] ", e.message);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.code]);

  function viewSvgInNewWindow() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([text], { type: "image/svg+xml" });
    showImageModal(URL.createObjectURL(blob));
  }

  if (hasError) {
    return null;
  }

  return (
    <div
      className="no-dark mermaid"
      style={{
        cursor: "pointer",
        overflow: "auto",
      }}
      ref={ref}
      onClick={() => viewSvgInNewWindow()}
    >
      {props.code}
    </div>
  );
}

export function PreCode(props: { children: any }) {
  const ref = useRef<HTMLPreElement>(null);
  const previewRef = useRef<HTMLPreviewHander>(null);
  const [mermaidCode, setMermaidCode] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const { height } = useWindowSize();
  const chatStore = useChatStore();
  const session = chatStore.currentSession();

  const renderArtifacts = useDebouncedCallback(() => {
    if (!ref.current) return;
    const mermaidDom = ref.current.querySelector("code.language-mermaid");
    if (mermaidDom) {
      setMermaidCode((mermaidDom as HTMLElement).innerText);
    }
    const htmlDom = ref.current.querySelector("code.language-html");
    const refText = ref.current.querySelector("code")?.innerText;
    if (htmlDom) {
      setHtmlCode((htmlDom as HTMLElement).innerText);
    } else if (
      refText?.startsWith("<!DOCTYPE") ||
      refText?.startsWith("<svg") ||
      refText?.startsWith("<?xml")
    ) {
      setHtmlCode(refText);
    }
  }, 600);

  const config = useAppConfig();
  const enableArtifacts =
    session.mask?.enableArtifacts !== false && config.enableArtifacts;

  //Wrap the paragraph for plain-text
  useEffect(() => {
    if (ref.current) {
      const codeElements = ref.current.querySelectorAll(
        "code",
      ) as NodeListOf<HTMLElement>;
      const wrapLanguages = [
        "",
        "md",
        "markdown",
        "text",
        "txt",
        "plaintext",
        "tex",
        "latex",
      ];
      codeElements.forEach((codeElement) => {
        let languageClass = codeElement.className.match(/language-(\w+)/);
        let name = languageClass ? languageClass[1] : "";
        if (wrapLanguages.includes(name)) {
          codeElement.style.whiteSpace = "pre-wrap";
        }
      });
      setTimeout(renderArtifacts, 1);
    }
  }, [renderArtifacts]);
  return (
    <>
      <pre ref={ref}>
        <span
          className="copy-code-button"
          onClick={() => {
            if (ref.current) {
              copyToClipboard(
                ref.current.querySelector("code")?.innerText ?? "",
              );
            }
          }}
        ></span>
        {props.children}
      </pre>
      {mermaidCode.length > 0 && (
        <Mermaid code={mermaidCode} key={mermaidCode} />
      )}
      {htmlCode.length > 0 && enableArtifacts && (
        <FullScreen className="no-dark html" right={70}>
          {/* <ArtifactsShareButton
            style={{ position: "absolute", right: 20, top: 10 }}
            getCode={() => htmlCode}
          /> */}
          <span className="button-description" style={{ whiteSpace: "normal" }}>
            {Locale.NewChat.ArtifactsInfo}
          </span>
          <IconButton
            style={{ position: "absolute", right: 20, top: 10 }}
            bordered
            icon={<ReloadButtonIcon />}
            shadow
            onClick={() => previewRef.current?.reload()}
          />
          <HTMLPreview
            ref={previewRef}
            code={htmlCode}
            autoHeight={!document.fullscreenElement}
            height={!document.fullscreenElement ? 600 : height}
          />
        </FullScreen>
      )}
    </>
  );
}

function CustomCode(props: { children: any; className?: string }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const enableCodeFold =
    session.mask?.enableCodeFold !== false && config.enableCodeFold;

  const ref = useRef<HTMLPreElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showToggle, setShowToggle] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const codeHeight = ref.current.scrollHeight;
      setShowToggle(codeHeight > 400);
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [props.children]);

  const toggleCollapsed = () => {
    setCollapsed((collapsed) => !collapsed);
  };
  const renderShowMoreButton = () => {
    if (showToggle && enableCodeFold && collapsed) {
      return (
        <div
          className={`show-hide-button ${collapsed ? "collapsed" : "expanded"}`}
        >
          <button onClick={toggleCollapsed}>{Locale.NewChat.More}</button>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <code
        className={props?.className}
        ref={ref}
        style={{
          maxHeight: enableCodeFold && collapsed ? "400px" : "none",
          overflowY: "hidden",
        }}
      >
        {props.children}
      </code>
      {renderShowMoreButton()}
    </>
  );
}

// function escapeDollarNumber(text: string) {
//   let escapedText = "";

//   for (let i = 0; i < text.length; i += 1) {
//     let char = text[i];
//     const nextChar = text[i + 1] || " ";

//     if (char === "$" && nextChar >= "0" && nextChar <= "9") {
//       char = "\\$";
//     }

//     escapedText += char;
//   }

//   return escapedText;
// }
function escapeDollarNumber(text: string) {
  let escapedText = "";
  let isInMathExpression = false;
  let isInCodeBlock = false;
  let isInInlineCode = false;

  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    const nextChar = text[i + 1] || " ";

    // Toggle the isInCodeBlock flag when encountering a code block start or end indicator
    if (text.substring(i, i + 3) === "```") {
      isInCodeBlock = !isInCodeBlock;
      escapedText += "```";
      i += 2; // Skip the next two characters since we have already included them
      continue;
    }

    // Toggle the isInInlineCode flag when encountering a single backtick
    if (char === "`" && !isInCodeBlock) {
      isInInlineCode = !isInInlineCode;
      escapedText += "`";
      continue;
    }

    // If inside a code block, preserve the character as is
    if (isInCodeBlock || isInInlineCode) {
      escapedText += char;
      continue;
    }

    // Toggle the isInMathExpression flag when encountering a dollar sign
    if (char === "$" && nextChar !== "$" && !isInMathExpression) {
      isInMathExpression = true;
    } else if (char === "$" && nextChar !== "$" && isInMathExpression) {
      isInMathExpression = false;
    }

    // Preserve the double dollar sign in math expressions
    if (char === "$" && nextChar === "$") {
      escapedText += "$$"; // Preserve the double dollar sign
      i++; // Skip the next dollar sign since we have already included it
      continue;
    }

    // Escape a single dollar sign followed by a number outside of math expressions
    if (
      char === "$" &&
      nextChar >= "0" &&
      nextChar <= "9" &&
      !isInMathExpression
    ) {
      escapedText += "&#36;"; // Use HTML entity &#36; to represent the dollar sign
      continue;
    }

    escapedText += char;
  }

  return escapedText;
}

// function escapeBrackets(text: string) {
//   const pattern =
//     /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
//   return text.replace(
//     pattern,
//     (match, codeBlock, squareBracket, roundBracket) => {
//       if (codeBlock) {
//         return codeBlock;
//       } else if (squareBracket) {
//         return `$$${squareBracket}$$`;
//       } else if (roundBracket) {
//         return `$${roundBracket}$`;
//       }
//       return match;
//     },
//   );
// }

function escapeBrackets(text: string) {
  const pattern =
    /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
  return text.replace(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock;
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket}$`;
      }
      return match;
    },
  );
}
function formatBoldText(text: string) {
  const pattern = /\*\*(.*?)([:：])\*\*/g;
  return text.replace(pattern, (match, boldText, colon) => {
    return `**${boldText}**${colon}`;
  });
}
function formatThinkText(text: string): string {
  // 检查是否以 <think> 开头但没有结束标签
  if (text.startsWith("<think>") && !text.includes("</think>")) {
    // 获取 <think> 后的所有内容
    const thinkContent = text.slice("<think>".length);
    // 渲染为"思考中"状态
    return `<thinkcollapse title="${Locale.NewChat.Thinking}">\n${thinkContent}\n</thinkcollapse>`;
  }

  // 处理完整的 think 标签
  const pattern = /^<think>([\s\S]*?)<\/think>/;
  return text.replace(pattern, (match, thinkContent) => {
    // 渲染为"思考完成"状态
    // 如果 thinkContent 为空，则渲染为"没有思考过程"状态
    if (thinkContent.trim() === "") {
      return `<thinkcollapse title="${Locale.NewChat.NoThink}">\n</thinkcollapse>`;
    }
    return `<thinkcollapse title="${Locale.NewChat.Think}">\n${thinkContent}\n</thinkcollapse>`;
  });
}

function tryWrapHtmlCode(text: string) {
  // try add wrap html code (fixed: html codeblock include 2 newline)
  // ignore embed codeblock
  if (text.includes("```")) {
    return text;
  }
  return text
    .replace(
      /([`]*?)(\w*?)([\n\r]*?)(<!DOCTYPE html>)/g,
      (match, quoteStart, lang, newLine, doctype) => {
        return !quoteStart ? "\n```html\n" + doctype : match;
      },
    )
    .replace(
      /(<\/body>)([\r\n\s]*?)(<\/html>)([\n\r]*)([`]*)([\n\r]*?)/g,
      (match, bodyEnd, space, htmlEnd, newLine, quoteEnd) => {
        return !quoteEnd ? bodyEnd + space + htmlEnd + "\n```\n" : match;
      },
    );
}

function R_MarkDownContent(props: { content: string; fontSize?: number }) {
  const escapedContent = useMemo(() => {
    return tryWrapHtmlCode(
      formatThinkText(
        formatBoldText(escapeBrackets(escapeDollarNumber(props.content))),
      ),
    );
  }, [props.content]);

  return (
    <ReactMarkdown
      remarkPlugins={[RemarkMath, RemarkGfm, RemarkBreaks]}
      rehypePlugins={[
        RehypeRaw,
        RehypeKatex,
        [rehypeSanitize, sanitizeOptions],
        [
          RehypeHighlight,
          {
            detect: false,
            ignoreMissing: true,
          },
        ],
      ]}
      components={
        {
          pre: PreCode,
          code: CustomCode,
          p: (pProps: any) => <p {...pProps} dir="auto" />,
          thinkcollapse: ({
            title,
            children,
          }: {
            title: string;
            children: React.ReactNode;
          }) => (
            <ThinkCollapse title={title} fontSize={props.fontSize}>
              {children}
            </ThinkCollapse>
          ),
          a: (aProps: any) => {
            const href = aProps.href || "";
            if (/\.(aac|mp3|opus|wav)$/.test(href)) {
              return (
                <figure>
                  <audio controls src={href}></audio>
                </figure>
              );
            }
            if (/\.(3gp|3g2|webm|ogv|mpeg|mp4|avi)$/.test(href)) {
              return (
                <video controls width="99.9%">
                  <source src={href} />
                </video>
              );
            }
            const isInternal = /^\/#/i.test(href);
            const target = isInternal ? "_self" : aProps.target ?? "_blank";
            return <a {...aProps} target={target} />;
          },
          details: Details,
          summary: Summary,
        } as any
      }
    >
      {escapedContent}
    </ReactMarkdown>
  );
}

export const MarkdownContent = React.memo(R_MarkDownContent);

export function Markdown(
  props: {
    content: string;
    loading?: boolean;
    fontSize?: number;
    parentRef?: RefObject<HTMLDivElement>;
    defaultShow?: boolean;
  } & React.DOMAttributes<HTMLDivElement>,
) {
  const mdRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="markdown-body"
      style={{
        fontSize: `${props.fontSize ?? 14}px`,
      }}
      ref={mdRef}
      onContextMenu={props.onContextMenu}
      onDoubleClickCapture={props.onDoubleClickCapture}
      dir="auto"
    >
      {props.loading ? (
        <LoadingIcon />
      ) : (
        <MarkdownContent content={props.content} fontSize={props.fontSize} />
      )}
    </div>
  );
}
