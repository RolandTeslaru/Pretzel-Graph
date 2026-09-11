import { Shelf } from "../domain/Shelf"

export const CORE_DRAWERS = {
  input_output: {
    displayName: "Input & Output",
    id: "input_output",
    icon: "Cable",
    blueprintIds: [
      "Core.Webhook",
      "Core.Chat.Input", 
      "Core.Chat.Output", 
      "Core.Text.Input", 
      "Core.Chat.History",
      "Core.Utils.JsonInjector",
    ],
  },
    routing: {
    displayName: "Routing",
    id: "routing",
    icon: "ChevronsLeftRightEllipsis",
    blueprintIds: [
      "Core.Routing.IfElse",
      "Core.Routing.Switch",
      "Core.Routing.Router",
      "Core.Routing.Merge",
      "Core.Routing.Passthrough",
      "Core.Routing.Portal",
    ],
  },
  lifecycle: {
    displayName: "Lifecycle",
    id: "lifecycle",
    icon: "TimerReset",
    blueprintIds: [
      "Core.Routing.CatchError",
      "Core.Routing.Terminate",
      "Core.Routing.Sleep",
    ],
  },
  // developer: {
  //   displayName: "DEVELOPER",
  //   id: "developer",
  //   icon: "Terminal",
  //   blueprintIds: [
  //     "Core.Developer.AllBuilders",
  //     "Core.Developer.ConsoleLog",
  //     "Core.Developer.ErrorThrower",
  //     "Core.Developer.ResourceLoaderTest",
  //     "Core.Developer.DerivativeTest"
  //   ],
  // },
  data_source: {
    displayName: "Data Sources",
    id: "data_source",
    icon: "Database",
    blueprintIds: [],
  },
  models_and_agents: {
    displayName: "AI & Agents",
    id: "models_and_agents",
    icon: "Bot",
    blueprintIds: [
      "Pretzel.Agent",
      "Core.LanguageModel"
    ],
  },
  llm_operations: {
    displayName: "LLM Utilities",
    id: "llm_operations",
    icon: "MessageSquareCode",
    blueprintIds: [
      "Core.Utils.Message.Compose",
      "Pretzel.Utils.Compactor",
    ],
  },
  files_and_knowledge: {
    displayName: "Files & Knowledge",
    id: "files_and_knowledge",
    icon: "Layers",
    blueprintIds: [],
  },
  data_manipulation: {
    displayName: "Data Manipulation",
    id: "data_manipulation",
    icon: "PencilRuler",
    blueprintIds: [
      "Core.Routing.Accumulator",
      "Core.Utils.List.Select",
      "Core.Utils.List.Slice",
      "Core.Utils.List.Filter",
    ],
  },
  utilities: {
    displayName: "Utilities",
    id: "utilities",
    icon: "DraftingCompass",
    blueprintIds: [
      "Core.Utils.RunCode",
      "Core.Developer.HttpRequest"
    ],
  },
  sub_workflow: {
    displayName: "Sub-Workflow",
    id: "sub_workflow",
    icon: "Graph",
    blueprintIds: [
      "Core.SubWorkflow.Execute",
      "Core.SubWorkflow.ExposeInputPort",
      "Core.SubWorkflow.ExposeOutputPort"
    ],
  },
  prototypes: {
    displayName: "Prototypes",
    id: "prototypes",
    icon: "FlaskConical",
    blueprintIds: [],
  },
  toolbox: {
    displayName: "Toolbox",
    id: "toolbox",
    icon: "Toolbox",
    blueprintIds: [
      "Core.Utils.Tool.Runner",
      "Core.Utils.Tool.Gate",
      "Core.Utils.Tool.Catalog",
      "Core.Utils.Tool.Custom",
      "Core.Utils.Tool.MCP",
    ],
  },
  human_review: {
    displayName: "Human Review",
    id: "human_review",
    icon: "ShieldUser",
    blueprintIds: [
      "Core.Workbench.Review",
    ],
  },
} as const as Record<Shelf.Drawer.Id, Shelf.Drawer>

export const BUNDLE_DRAWERS = {
  alpaca: {
    displayName: "Alpaca",
    id: "alpaca",
    icon: "Alpaca",
    blueprintIds: [
      "Integrations.Alpaca.Market",
      "Integrations.Alpaca.Account",
      "Integrations.Alpaca.Trading"
    ]
  },
  anthropic: {
    displayName: "Anthropic",
    id: "anthropic",
    icon: "Anthropic",
    blueprintIds: [
      "Integrations.Anthropic.Chat",
      "Integrations.Anthropic.ClaudeCode"
    ]
  },
  google: {
    displayName: "Google",
    id: "google",
    icon: "Google",
    blueprintIds: [
      "Integrations.Google.Gemini",
      "Integrations.Google.Search",
      "Integrations.Google.Gmail.Mailbox",
      "Integrations.Google.Gmail.Compose",
      "Integrations.Google.Sheets",
      "Integrations.Google.Drive",
      "Integrations.Google.Calendar",
    ]
  },
  hyperliquid: {
    displayName: "HyperLiquid",
    id: "hyperliquid",
    icon: "HyperLiquid",
    blueprintIds: ["Integrations.HyperLiquid.Market", "Integrations.HyperLiquid.Account"]
  },
  kalshi: {
    displayName: "Kalshi",
    id: "kalshi",
    icon: "Kalshi",
    blueprintIds: ["Integrations.Kalshi.Market"]
  },
  massive: {
    displayName: "Massive",
    id: "massive",
    icon: "Massive",
    blueprintIds: ["Integrations.Massive.Market"]
  },
  mongodb: {
    displayName: "MongoDB",
    id: "mongodb",
    icon: "MongoDB",
    blueprintIds: ["Integrations.MongoDB.Operation"]
  },
  mysql: {
    displayName: "MySQL",
    id: "mysql",
    icon: "MySQL",
    blueprintIds: ["Integrations.MySQL.Query"]
  },
  openai: {
    displayName: "OpenAI",
    id: "openai",
    icon: "OpenAI",
    blueprintIds: [
      "Integrations.OpenAI.Chat",
      "Integrations.OpenAI.Codex"
    ]
  },
  openrouter: {
    displayName: "OpenRouter",
    id: "openrouter",
    icon: "OpenRouter",
    blueprintIds: ["Integrations.OpenRouter.Chat"]
  },
  pretzelgraph: {
    displayName: "PretzelGraph",
    id: "pretzelgraph",
    icon: "PretzelGraphAppIcon",
    blueprintIds: ["Integrations.PretzelGraph.Workbench", "Integrations.PretzelGraph.Shelf"]
  },
  polymarket: {
    displayName: "Polymarket",
    id: "polymarket",
    icon: "Polymarket",
    blueprintIds: ["Integrations.Polymarket.Market", "Integrations.Polymarket.Profile", "Integrations.Polymarket.Account"]
  },
  postgres: {
    displayName: "Postgres",
    id: "postgres",
    icon: "Postgres",
    blueprintIds: ["Integrations.Postgres.Query"]
  },
  redis: {
    displayName: "Redis",
    id: "redis",
    icon: "Redis",
    blueprintIds: ["Integrations.Redis.Database"]
  },
  tavily: {
    displayName: "Tavily",
    id: "tavily",
    icon: "Tavily",
    blueprintIds: ["Integrations.Tavily.Retriever", "Integrations.Tavily.Search"]
  },
  uniswap: {
    displayName: "Uniswap",
    id: "uniswap",
    icon: "Uniswap",
    blueprintIds: ["Integrations.Uniswap.Swap"]
  },
  xai: {
    displayName: "xAI",
    id: "xai",
    icon: "xAI",
    blueprintIds: ["Integrations.xAI.Chat"]
  },
} as const as Record<Shelf.Drawer.Id, Shelf.Drawer>

export const ALL_DRAWERS = { ...CORE_DRAWERS, ...BUNDLE_DRAWERS } as const

export const SECTIONS = {
  core_extended: Object.keys(CORE_DRAWERS) as Shelf.Drawer.Id[],
  integrations: Object.keys(BUNDLE_DRAWERS) as Shelf.Drawer.Id[],
} as const
