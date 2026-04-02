import { Shelf } from "../domain/Shelf"

export const CORE_DRAWERS = {
  saved_components: {
    displayName: "Saved",
    id: "saved_components",
    icon: "GradientSave",
    blueprintIds: [],
  },
  input_output: {
    displayName: "Input & Output",
    id: "input_output",
    icon: "Cable",
    blueprintIds: ["Core.Chat.Input", "Core.Chat.Output", "Core.Text.Input", "Core.Text.Output", "Core.Chat.History"],
  },
  developer: {
    displayName: "DEVELOPER",
    id: "developer",
    icon: "Terminal",
    blueprintIds: [
      "Core.Developer.AllBuilders",
      "Core.Developer.Eval",
      "Core.Developer.ConsoleLog",
      "Core.Developer.Sleep",
      "Core.Developer.HttpRequest"
    ],
  },
  data_source: {
    displayName: "Data Sources",
    id: "data_source",
    icon: "Database",
    blueprintIds: [],
  },
  models_and_agents: {
    displayName: "Models & Agents",
    id: "models_and_agents",
    icon: "Bot",
    blueprintIds: [
      "Core.Agent",
      "Core.LanguageModel"
    ],
  },
  llm_operations: {
    displayName: "LLM Operations",
    id: "llm_operations",
    icon: "BrainCircuit",
    blueprintIds: [],
  },
  files_and_knowledge: {
    displayName: "Files & Knowledge",
    id: "files_and_knowledge",
    icon: "Layers",
    blueprintIds: [],
  },
  processing: {
    displayName: "Processing",
    id: "processing",
    icon: "ListFilter",
    blueprintIds: [],
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
      "Core.Routing.Accumulator",
    ],
  },
  utilities: {
    displayName: "Utilities",
    id: "utilities",
    icon: "PencilRuler",
    blueprintIds: [
      "Core.Utils.JsonInjector",
      "Core.Utils.Message.Compose",
    ],
  },
  prototypes: {
    displayName: "Prototypes",
    id: "prototypes",
    icon: "FlaskConical",
    blueprintIds: [],
  },
  tools: {
    displayName: "Tools",
    id: "tools",
    icon: "Hammer",
    blueprintIds: [],
  },
} as const as Record<Shelf.Drawer.Id, Shelf.Drawer>

export const BUNDLE_DRAWERS = {
  aiml: {
    displayName: "AI/ML API",
    id: "aiml",
    icon: "AIML",
    blueprintIds: []
  },
  agentql: {
    displayName: "AgentQL",
    id: "agentql",
    icon: "AgentQL",
    blueprintIds: []
  },
  altk: {
    displayName: "ALTK",
    id: "altk",
    icon: "Zap",
    blueprintIds: []
  },
  languagemodels: {
    displayName: "Language Models",
    id: "languagemodels",
    icon: "BrainCircuit",
    blueprintIds: []
  },
  embeddings: {
    displayName: "Embeddings",
    id: "embeddings",
    icon: "Binary",
    blueprintIds: []
  },
  amazon: {
    displayName: "Amazon",
    id: "amazon",
    icon: "Amazon",
    blueprintIds: []
  },
  anthropic: {
    displayName: "Anthropic",
    id: "anthropic",
    icon: "Anthropic",
    blueprintIds: ["Anthropic.Chat"]
  },
  apify: {
    displayName: "Apify",
    id: "apify",
    icon: "Apify",
    blueprintIds: []
  },
  arxiv: {
    displayName: "arXiv",
    id: "arxiv",
    icon: "arXiv",
    blueprintIds: []
  },
  assemblyai: {
    displayName: "AssemblyAI",
    id: "assemblyai",
    icon: "AssemblyAI",
    blueprintIds: []
  },
  azure: {
    displayName: "Azure",
    id: "azure",
    icon: "Azure",
    blueprintIds: []
  },
  baidu: {
    displayName: "Baidu",
    id: "baidu",
    icon: "BaiduQianfan",
    blueprintIds: []
  },
  bing: {
    displayName: "Bing",
    id: "bing",
    icon: "Bing",
    blueprintIds: []
  },
  cassandra: {
    displayName: "Cassandra",
    id: "cassandra",
    icon: "Cassandra",
    blueprintIds: []
  },
  chroma: {
    displayName: "Chroma",
    id: "chroma",
    icon: "Chroma",
    blueprintIds: []
  },
  clickhouse: {
    displayName: "ClickHouse",
    id: "clickhouse",
    icon: "Clickhouse",
    blueprintIds: []
  },
  cleanlab: {
    displayName: "Cleanlab",
    id: "cleanlab",
    icon: "Cleanlab",
    blueprintIds: []
  },
  cloudflare: {
    displayName: "Cloudflare",
    id: "cloudflare",
    icon: "Cloudflare",
    blueprintIds: []
  },
  cohere: {
    displayName: "Cohere",
    id: "cohere",
    icon: "Cohere",
    blueprintIds: []
  },
  cometapi: {
    displayName: "CometAPI",
    id: "cometapi",
    icon: "CometAPI",
    blueprintIds: []
  },
  composio: {
    displayName: "Composio",
    id: "composio",
    icon: "Composio",
    blueprintIds: []
  },
  confluence: {
    displayName: "Confluence",
    id: "confluence",
    icon: "Confluence",
    blueprintIds: []
  },
  couchbase: {
    displayName: "Couchbase",
    id: "couchbase",
    icon: "Couchbase",
    blueprintIds: []
  },
  crewai: {
    displayName: "CrewAI",
    id: "crewai",
    icon: "CrewAI",
    blueprintIds: []
  },
  cuga: {
    displayName: "CUGA",
    id: "cuga",
    icon: "Bot",
    blueprintIds: []
  },
  datastax: {
    displayName: "DataStax",
    id: "datastax",
    icon: "AstraDB",
    blueprintIds: []
  },
  deepseek: {
    displayName: "DeepSeek",
    id: "deepseek",
    icon: "DeepSeek",
    blueprintIds: []
  },
  docling: {
    displayName: "Docling",
    id: "docling",
    icon: "Docling",
    blueprintIds: []
  },
  duckduckgo: {
    displayName: "DuckDuckGo",
    id: "duckduckgo",
    icon: "DuckDuckGo",
    blueprintIds: []
  },
  elastic: {
    displayName: "Elastic",
    id: "elastic",
    icon: "ElasticsearchStore",
    blueprintIds: []
  },
  exa: {
    displayName: "Exa",
    id: "exa",
    icon: "Exa",
    blueprintIds: []
  },
  FAISS: {
    displayName: "FAISS",
    id: "FAISS",
    icon: "FAISS",
    blueprintIds: []
  },
  firecrawl: {
    displayName: "Firecrawl",
    id: "firecrawl",
    icon: "FirecrawlCrawlApi",
    blueprintIds: []
  },
  git: {
    displayName: "Git",
    id: "git",
    icon: "GitLoader",
    blueprintIds: []
  },
  glean: {
    displayName: "Glean",
    id: "glean",
    icon: "Glean",
    blueprintIds: []
  },
  gmail: {
    displayName: "Gmail",
    id: "gmail",
    icon: "Gmail",
    blueprintIds: []
  },
  google: {
    displayName: "Google",
    id: "google",
    icon: "Google",
    blueprintIds: ["Google.GenerativeAI"]
  },
  groq: {
    displayName: "Groq",
    id: "groq",
    icon: "Groq",
    blueprintIds: []
  },
  homeassistant: {
    displayName: "Home Assistant",
    id: "homeassistant",
    icon: "HomeAssistant",
    blueprintIds: []
  },
  huggingface: {
    displayName: "Hugging Face",
    id: "huggingface",
    icon: "HuggingFace",
    blueprintIds: []
  },
  ibm: {
    displayName: "IBM",
    id: "ibm",
    icon: "WatsonxAI",
    blueprintIds: []
  },
  icosacomputing: {
    displayName: "Icosa Computing",
    id: "icosacomputing",
    icon: "Icosa",
    blueprintIds: []
  },
  jigsawstack: {
    displayName: "JigsawStack",
    id: "jigsawstack",
    icon: "JigsawStack",
    blueprintIds: []
  },
  langchain_utils: {
    displayName: "LangChain",
    id: "langchain_utils",
    icon: "LangChain",
    blueprintIds: []
  },
  langwatch: {
    displayName: "LangWatch",
    id: "langwatch",
    icon: "Langwatch",
    blueprintIds: []
  },
  lmstudio: {
    displayName: "LMStudio",
    id: "lmstudio",
    icon: "LMStudio",
    blueprintIds: []
  },
  maritalk: {
    displayName: "MariTalk",
    id: "maritalk",
    icon: "Maritalk",
    blueprintIds: []
  },
  mem0: {
    displayName: "Mem0",
    id: "mem0",
    icon: "Mem0",
    blueprintIds: []
  },
  memories: {
    displayName: "Memories",
    id: "memories",
    icon: "Cpu",
    blueprintIds: []
  },
  milvus: {
    displayName: "Milvus",
    id: "milvus",
    icon: "Milvus",
    blueprintIds: []
  },
  mistral: {
    displayName: "MistralAI",
    id: "mistral",
    icon: "MistralAI",
    blueprintIds: []
  },
  mongodb: {
    displayName: "MongoDB",
    id: "mongodb",
    icon: "MongoDB",
    blueprintIds: []
  },
  needle: {
    displayName: "Needle",
    id: "needle",
    icon: "Needle",
    blueprintIds: []
  },
  notdiamond: {
    displayName: "Not Diamond",
    id: "notdiamond",
    icon: "NotDiamond",
    blueprintIds: []
  },
  notion: {
    displayName: "Notion",
    id: "Notion",
    icon: "Notion",
    blueprintIds: []
  },
  novita: {
    displayName: "Novita",
    id: "novita",
    icon: "Novita",
    blueprintIds: []
  },
  nvidia: {
    displayName: "NVIDIA",
    id: "nvidia",
    icon: "NVIDIA",
    blueprintIds: []
  },
  olivya: {
    displayName: "Olivya",
    id: "olivya",
    icon: "Olivya",
    blueprintIds: []
  },
  ollama: {
    displayName: "Ollama",
    id: "ollama",
    icon: "Ollama",
    blueprintIds: []
  },
  openai: {
    displayName: "OpenAI",
    id: "openai",
    icon: "OpenAI",
    blueprintIds: ["OpenAI.Chat"]
  },
  openrouter: {
    displayName: "OpenRouter",
    id: "openrouter",
    icon: "OpenRouter",
    blueprintIds: ["OpenRouter.Chat"]
  },
  perplexity: {
    displayName: "Perplexity",
    id: "perplexity",
    icon: "Perplexity",
    blueprintIds: []
  },
  pgvector: {
    displayName: "pgvector",
    id: "pgvector",
    icon: "cpu",
    blueprintIds: []
  },
  pinecone: {
    displayName: "Pinecone",
    id: "pinecone",
    icon: "Pinecone",
    blueprintIds: []
  },
  qdrant: {
    displayName: "Qdrant",
    id: "qdrant",
    icon: "Qdrant",
    blueprintIds: []
  },
  redis: {
    displayName: "Redis",
    id: "redis",
    icon: "Redis",
    blueprintIds: []
  },
  sambanova: {
    displayName: "SambaNova",
    id: "sambanova",
    icon: "SambaNova",
    blueprintIds: []
  },
  scrapegraph: {
    displayName: "ScrapeGraph AI",
    id: "scrapegraph",
    icon: "ScrapeGraph",
    blueprintIds: []
  },
  searchapi: {
    displayName: "SearchApi",
    id: "searchapi",
    icon: "SearchAPI",
    blueprintIds: []
  },
  serpapi: {
    displayName: "SerpApi",
    id: "serpapi",
    icon: "SerpSearch",
    blueprintIds: []
  },
  serper: {
    displayName: "Serper",
    id: "serper",
    icon: "Serper",
    blueprintIds: []
  },
  supabase: {
    displayName: "Supabase",
    id: "supabase",
    icon: "Supabase",
    blueprintIds: []
  },
  tavily: {
    displayName: "Tavily",
    id: "tavily",
    icon: "TavilyIcon",
    blueprintIds: []
  },
  twelvelabs: {
    displayName: "TwelveLabs",
    id: "twelvelabs",
    icon: "TwelveLabs",
    blueprintIds: []
  },
  unstructured: {
    displayName: "Unstructured",
    id: "unstructured",
    icon: "Unstructured",
    blueprintIds: []
  },
  upstash: {
    displayName: "Upstash",
    id: "upstash",
    icon: "Upstash",
    blueprintIds: []
  },
  vlmrun: {
    displayName: "VLM Run",
    id: "vlmrun",
    icon: "VLMRun",
    blueprintIds: []
  },
  vectara: {
    displayName: "Vectara",
    id: "vectara",
    icon: "Vectara",
    blueprintIds: []
  },
  vectorstores: {
    displayName: "Vector Stores",
    id: "vectorstores",
    icon: "Layers",
    blueprintIds: []
  },
  weaviate: {
    displayName: "Weaviate",
    id: "weaviate",
    icon: "Weaviate",
    blueprintIds: []
  },
  vertexai: {
    displayName: "Vertex AI",
    id: "vertexai",
    icon: "VertexAI",
    blueprintIds: []
  },
  wikipedia: {
    displayName: "Wikipedia",
    id: "wikipedia",
    icon: "Wikipedia",
    blueprintIds: []
  },
  wolframalpha: {
    displayName: "WolframAlpha",
    id: "wolframalpha",
    icon: "WolframAlphaAPI",
    blueprintIds: []
  },
  xai: {
    displayName: "xAI",
    id: "xai",
    icon: "xAI",
    blueprintIds: []
  },
  yahoosearch: {
    displayName: "Yahoo! Finance",
    id: "yahoosearch",
    icon: "trending-up",
    blueprintIds: []
  },
  youtube: {
    displayName: "YouTube",
    id: "youtube",
    icon: "YouTube",
    blueprintIds: []
  },
  zep: {
    displayName: "Zep",
    id: "zep",
    icon: "ZepMemory",
    blueprintIds: []
  },
} as const as Record<Shelf.Drawer.Id, Shelf.Drawer>

export const ALL_DRAWERS = { ...CORE_DRAWERS, ...BUNDLE_DRAWERS } as const

export const SECTIONS = {
  core: Object.keys(CORE_DRAWERS) as Shelf.Drawer.Id[],
  bundle: Object.keys(BUNDLE_DRAWERS) as Shelf.Drawer.Id[],
} as const