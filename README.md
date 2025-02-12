# ChatGPT Next Web 二创
> 原项目：[ChatGPTNextWeb](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web)


**分歧节点：2.12.3，侧重维护 OpenAI 类型渠道**

docker 镜像：
- dockerhub 托管: `elluros/chatgpt-next-chat:latest`
- github  托管: `ghcr.io/qabot-zh/chatgpt-next-chat:latest`

## 二开新增特性

- 模型选择器优化
- 快速搜索聊天记录
- 可自定义**侧边栏**，支持 HTML 样式
- 免导入导出的云备份功能（需配合[文件服务器项目](https://github.com/QAbot-zh/go-file-server)使用）
- OpenAI 类型支持前端配置，一键拉取可用模型

<img src="./docs/images/getModels.png" width="80%" alt="get models"  style="display:inline-block; margin-left:40px"/>

- 基于 AI 模型的中英互译

   - 翻译前

  <img src="./docs/images/translate-1.png" width="80%" alt="before translate" style="display:inline-block; margin-right:10px"/>

   - 翻译后

   <img src="./docs/images/translate-2.png" width="80%" alt="after translate" style="display:inline-block; margin-right:10px"/>

- 基于 AI 模型的 OCR

  - OCR 前

  <img src="./docs/images/ocr-1.png" width="80%" alt="before ocr" style="display:inline-block; margin-right:10px"/>

  - OCR 后

  <img src="./docs/images/ocr-2.png" width="80%" alt="after ocr" style="display:inline-block"/>

- 基于正则匹配的隐私打码（**所有基于 AI 模型的功能的信息安全请自行把握，包括上述的翻译和 OCR，打码功能不基于 AI 实现**）

   - 打码前

    <img src="./docs/images/privacy-1.png" width="80%" alt="before privacy" style="display:inline-block; margin-right:10px"/>

   - 打码后

    <img src="./docs/images/privacy-2.png" width="80%" alt="after privacy" style="display:inline-block; margin-right:10px"/>


- 支持 details、summary 标签渲染，增强页面整洁度、交互性和趣味性

   <img src="./docs/images/details%20标签渲染.png" width="80%" alt="details render" style="display:inline-block; margin-right:10px"/>

- 适配 `<think>` 标签包裹和以 reasoning_content 参数传递的思考过程，泛化性强

  - 思考中

  <img src="./docs/images/thinking.png" width="80%" alt="thinking" style="display:inline-block; margin-right:10px"/>

  - 思考结束

  <img src="./docs/images/think.png" width="80%" alt="think" style="display:inline-block; margin-right:10px"/>



## 环境变量

> [简体中文 > 如何配置 api key、访问密码、接口代理](./README_CN.md#环境变量)

### `CODE` (optional)

Access password, separated by comma. （授权码，支持英文逗号分隔多个code）

### `OPENAI_API_KEY` (required)

Your openai api key, join multiple api keys with comma. （openai 密钥，支持英文逗号分隔多个key）

### `BASE_URL` (optional)

> Default: `https://api.openai.com`

> Examples: `http://your-openai-proxy.com`

Override openai api request base url. （openai 渠道自定义接口地址）

### `OPENAI_ORG_ID` (optional)

Specify OpenAI organization ID. （openai 组织 ID）

### `HIDE_USER_API_KEY` (optional)

> Default: Empty

If you do not want users to input their own API key, set this value to 1. （要禁止前端使用用户的key，则设置该变量非空）

### `DISABLE_GPT4` (optional)

> Default: Empty

If you do not want users to use GPT-4, set this value to 1. （要禁止用户使用 gpt4/chatgpt-4o/o1 等 gpt 高级模型，则设置该变量非空）

### `ENABLE_BALANCE_QUERY` (optional)

> Default: Empty

If you do want users to query balance, set this value to 1. （要禁止用户查询api余额，则设置该变量非空）

### `DISABLE_FAST_LINK` (optional)

> Default: Empty

If you want to disable parse settings from url, set this to 1. （要禁止url解析参数，则设置该变量非空）

### `CUSTOM_MODELS` (optional)

> Default: Empty
> Example: `+llama,+claude-2,-gpt-3.5-turbo,gpt-4-1106-preview=gpt-4-turbo` means add `llama, claude-2` to model list, and remove `gpt-3.5-turbo` from list, and display `gpt-4-1106-preview` as `gpt-4-turbo`.

To control custom models, use `+` to add a custom model, use `-` to hide a model, use `name=displayName<description>` to customize model name, separated by comma.

User `-*provider` to disable specified models, `+*provider` to enable specified models.

User `-all` to disable all default models, `+all` to enable all default models. （自定义模型参数）

 **支持通过<>设置模型描述**

 示例：

![model description](./docs/images/model-description.png)

### `SIDEBAR_TITLE` (optional)

Set the title of sidebar. （侧边栏标题）

### `SIDEBAR_SUBTITLE` (optional)

Set the subtitle of sidebar. Support html parsing. （侧边栏子标题，支持html解析）

- html 示例：
```
<br>
<div style="line-height: 1.8;">
   <div>AI-Chat 演示站</div>
   <div>测试侧边栏文字 HTML 解析</div>
   <a href="https://github.com/QAbot-zh/ChatGPT-Next-Web"
      style="color: #1890ff;
               text-decoration: none;
               font-weight: 500;
               transition: all 0.3s ease;
               padding: 2px 4px;
               border-radius: 4px;
               background-color: rgba(24,144,255,0.1);">
      <span style="margin-bottom: 8px;">📦</span>Github项目
   </a>
</div>
```

实际效果：

![alt text](image.png)

### `SITE_TITLE` (optional)

Set the website title. （网站顶部标题）

### `COMPRESS_MODEL` （optional）

Set the title generation and history compression model. （设置标题生成、历史压缩模型，默认为 gpt-4o-mini）

### `TRANSLATE_MODEL` （optional）

Set the translate model. （设置翻译模型，默认为 gpt-4o-mini）

### `OCR_MODEL` （optional）

Set the ocr model. （设置 ocr 模型，默认为 gpt-4o-mini）

### `CUSTOM_HELLO` (optional)

Set the custom hello to cover default bot_hello. （自定义招呼语，覆盖默认的 bot_hello）

### `UNAUTHORIZED_INFO` (optional)

Set the unathorized info to cover default unathorized info. （自定义错误提示，覆盖默认的提示词）

### `WHITE_WEBDEV_ENDPOINTS` (optional)

You can use this option if you want to increase the number of webdav service addresses you are allowed to access, as required by the format：
- Each address must be a complete endpoint
> `https://xxxx/yyy`
- Multiple addresses are connected by ', '

### `DEFAULT_INPUT_TEMPLATE` (optional)

Customize the default template used to initialize the User Input Preprocessing configuration item in Settings.


## LICENSE

[MIT](https://opensource.org/license/mit/)
