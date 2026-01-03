# Shop Agent 店铺智能助手

## 功能说明

这是一个集成了千问(qwen-max)大模型的智能客服助手，以悬浮球的形式展示在网站右下角，支持多轮对话功能。

## 主要特性

- ✨ 悬浮球入口，点击展开聊天界面
- 💬 支持多轮对话，自动维护上下文
- 🎨 美观的 UI 设计，带有动画效果
- 📱 响应式设计，适配不同屏幕尺寸
- 🔄 实时加载状态提示

## 文件结构

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts           # 处理与 qwen-max 的对话 API
│   └── layout.tsx                 # 已添加 ShopAgentFloat 组件
├── components/
│   ├── shop-agent-float.tsx       # 悬浮球组件
│   └── shop-agent-chat.tsx        # 聊天界面组件
└── .env.example                   # 环境变量示例
```

## 配置步骤

### 1. 设置环境变量

在项目根目录创建 `.env.local` 文件（如果不存在），添加以下配置：

```bash
# Qwen API Configuration
QWEN_API_KEY=your_qwen_api_key_here
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### 2. 获取千问 API Key

1. 访问 [阿里云灵积平台](https://dashscope.console.aliyun.com/)
2. 登录或注册账号
3. 在控制台获取 API Key
4. 将 API Key 填入 `.env.local` 文件

### 3. 启动项目

```bash
npm run dev
```

访问 `http://localhost:3000`，你会在右下角看到悬浮球。

## 使用说明

### 基本使用

1. **打开聊天**: 点击右下角的蓝色悬浮球
2. **发送消息**: 在输入框输入问题，按 Enter 或点击发送按钮
3. **查看回复**: AI 助手会自动回复，支持多轮对话
4. **关闭聊天**: 点击聊天窗口右上角的 X 按钮

### 技术实现

#### 1. API 路由 (`app/api/chat/route.ts`)

- 使用 OpenAI SDK 的兼容接口连接千问模型
- 支持完整的消息历史传递，实现多轮对话
- 错误处理和响应验证

#### 2. 聊天界面 (`components/shop-agent-chat.tsx`)

- 维护完整的对话历史
- 自动滚动到最新消息
- 加载状态显示
- 支持键盘快捷键 (Enter 发送)

#### 3. 悬浮球 (`components/shop-agent-float.tsx`)

- 固定在右下角
- 带有动画效果的展开/收起
- 脉冲动画吸引注意
- 工具提示说明

## 自定义配置

### 修改模型参数

编辑 `app/api/chat/route.ts`：

```typescript
const response = await client.chat.completions.create({
  model: 'qwen-max',           // 可选: qwen-turbo, qwen-plus, qwen-max
  messages: messages,
  temperature: 0.7,            // 控制回复的随机性 (0-1)
  max_tokens: 2000,            // 最大回复长度
  stream: false,               // 是否使用流式响应
});
```

### 修改样式

- 悬浮球位置: 编辑 `components/shop-agent-float.tsx` 中的 `bottom-6 right-6`
- 聊天窗口大小: 编辑 `components/shop-agent-chat.tsx` 中的 `w-[380px] h-[600px]`
- 颜色主题: 修改对应组件中的 Tailwind CSS 类名

### 添加系统提示词

在 `app/api/chat/route.ts` 中添加系统提示词：

```typescript
const systemMessage = {
  role: 'system',
  content: '你是一个专业的电商客服助手，熟悉店铺的所有商品信息...'
};

const response = await client.chat.completions.create({
  model: 'qwen-max',
  messages: [systemMessage, ...messages],
  // ...
});
```

## 注意事项

1. **API Key 安全**: 
   - 不要将 `.env.local` 提交到版本控制
   - 确保 API Key 保密

2. **费用控制**:
   - 千问 API 按调用次数和 token 数量计费
   - 建议设置每日调用限额

3. **生产环境**:
   - 考虑添加用户身份验证
   - 实现对话历史持久化
   - 添加速率限制防止滥用

## 后续优化建议

1. **功能增强**:
   - [ ] 添加流式响应，提升体验
   - [ ] 集成商品搜索和推荐
   - [ ] 支持图片识别和回复
   - [ ] 添加常见问题快捷回复

2. **性能优化**:
   - [ ] 实现对话历史缓存
   - [ ] 添加消息去重逻辑
   - [ ] 优化大文本显示

3. **用户体验**:
   - [ ] 支持语音输入
   - [ ] 添加快捷操作按钮
   - [ ] 实现对话评分功能
   - [ ] 支持多语言

## 故障排除

### 问题: 悬浮球不显示

- 检查是否正确导入到 `app/layout.tsx`
- 清除浏览器缓存并刷新

### 问题: API 调用失败

- 确认 `.env.local` 文件配置正确
- 检查 API Key 是否有效
- 查看控制台错误信息

### 问题: 回复速度慢

- 检查网络连接
- 考虑使用 `qwen-turbo` 模型提升速度
- 减少 `max_tokens` 参数值

## 技术支持

如有问题，请检查：
1. 千问 API 文档: https://help.aliyun.com/zh/dashscope/
2. Next.js 文档: https://nextjs.org/docs
3. OpenAI SDK 文档: https://github.com/openai/openai-node
