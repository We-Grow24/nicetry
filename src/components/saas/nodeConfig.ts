export interface LogicBlock {
  type: string;
  label: string;
  icon: string;
  color: string;
  category: string;
  description: string;
  defaultData: Record<string, unknown>;
}

export const LOGIC_BLOCKS: LogicBlock[] = [
  {
    type: "webhookTrigger",
    label: "Webhook Trigger",
    icon: "🔗",
    color: "#14b8a6",
    category: "trigger",
    description: "Receives HTTP webhook calls",
    defaultData: { path: "/webhook", method: "POST", secret: "" },
  },
  {
    type: "scheduleTrigger",
    label: "Schedule Trigger",
    icon: "⏰",
    color: "#f97316",
    category: "trigger",
    description: "Runs on a cron schedule",
    defaultData: { cron: "0 9 * * *", timezone: "UTC" },
  },
  {
    type: "httpRequest",
    label: "HTTP Request",
    icon: "🌐",
    color: "#3b82f6",
    category: "integration",
    description: "Call any external API",
    defaultData: { url: "https://api.example.com", method: "GET", headers: "", body: "" },
  },
  {
    type: "supabaseQuery",
    label: "Supabase Query",
    icon: "🗄️",
    color: "#10b981",
    category: "database",
    description: "Query your Supabase tables",
    defaultData: { table: "", operation: "select", columns: "*", filters: "" },
  },
  {
    type: "sendEmail",
    label: "Send Email",
    icon: "📧",
    color: "#8b5cf6",
    category: "communication",
    description: "Send transactional emails",
    defaultData: { to: "", subject: "", template: "", from: "noreply@example.com" },
  },
  {
    type: "razorpayPayment",
    label: "Razorpay Payment",
    icon: "💳",
    color: "#f59e0b",
    category: "payment",
    description: "Create payment orders",
    defaultData: { amount: "100", currency: "INR", orderId: "", webhookUrl: "" },
  },
  {
    type: "openAICall",
    label: "OpenAI Call",
    icon: "🤖",
    color: "#ec4899",
    category: "ai",
    description: "Call GPT models",
    defaultData: { model: "gpt-4o-mini", systemPrompt: "", userPrompt: "{{input}}", temperature: "0.7", maxTokens: "1000" },
  },
  {
    type: "ifElse",
    label: "If/Else Condition",
    icon: "🔀",
    color: "#6366f1",
    category: "logic",
    description: "Branch based on conditions",
    defaultData: { condition: "{{data}} !== null", expression: "" },
  },
];

export const BLOCK_MAP: Record<string, LogicBlock> = Object.fromEntries(
  LOGIC_BLOCKS.map((b) => [b.type, b])
);

export const CATEGORY_COLORS: Record<string, string> = {
  trigger: "#f97316",
  integration: "#3b82f6",
  database: "#10b981",
  communication: "#8b5cf6",
  payment: "#f59e0b",
  ai: "#ec4899",
  logic: "#6366f1",
};
