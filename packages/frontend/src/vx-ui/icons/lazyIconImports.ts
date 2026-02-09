// Export the lazy loading mapping for brand icons (lazy-loaded)
export const lazyIconsMapping = {
  AIML: () => import("./BRAN_ICONS/AIML").then((mod) => ({ default: mod.AIMLIcon })),
  AgentQL: () =>
    import("./BRAN_ICONS/AgentQL").then((mod) => ({ default: mod.AgentQLIcon })),
  Agiled: () =>
    import("./BRAN_ICONS/Agiled").then((mod) => ({ default: mod.AgiledIcon })),
  Airbyte: () =>
    import("./BRAN_ICONS/Airbyte").then((mod) => ({ default: mod.AirbyteIcon })),
  Anthropic: () =>
    import("./BRAN_ICONS/Anthropic").then((mod) => ({ default: mod.AnthropicIcon })),
  Apify: () =>
    import("./BRAN_ICONS/Apify").then((mod) => ({ default: mod.ApifyIcon })),
  ApifyWhite: () =>
    import("./BRAN_ICONS/Apify").then((mod) => ({ default: mod.ApifyWhiteIcon })),
  ArXiv: () =>
    import("./BRAN_ICONS/ArXiv").then((mod) => ({ default: mod.ArXivIcon })),
  Arize: () =>
    import("./BRAN_ICONS/Arize").then((mod) => ({ default: mod.ArizeIcon })),
  Apollo: () =>
    import("./BRAN_ICONS/Apollo").then((mod) => ({ default: mod.ApolloIcon })),
  Bitbucket: () =>
    import("./BRAN_ICONS/Bitbucket").then((mod) => ({ default: mod.BitbucketIcon })),
  Canva: () =>
    import("./BRAN_ICONS/Canva").then((mod) => ({ default: mod.CanvaIcon })),
  Coda: () => import("./BRAN_ICONS/Coda").then((mod) => ({ default: mod.CodaIcon })),
  AssemblyAI: () =>
    import("./BRAN_ICONS/AssemblyAI").then((mod) => ({ default: mod.AssemblyAIIcon })),
  Elevenlabs: () =>
    import("./BRAN_ICONS/Elevenlabs").then((mod) => ({ default: mod.ElevenlabsIcon })),
  Googlebigquery: () =>
    import("./BRAN_ICONS/Googlebigquery").then((mod) => ({ default: mod.GooglebigqueryIcon })),
  Heygen: () =>
    import("./BRAN_ICONS/Heygen").then((mod) => ({ default: mod.HeygenIcon })),
  Peopledatalabs: () =>
    import("./BRAN_ICONS/Peopledatalabs").then((mod) => ({
      default: mod.PeopledatalabsIcon,
    })),
  Snowflake: () =>
    import("./BRAN_ICONS/Snowflake").then((mod) => ({ default: mod.SnowflakeIcon })),
  Googledocs: () =>
    import("./BRAN_ICONS/googledocs").then((mod) => ({
      default: mod.GoogledocsIcon,
    })),
  Googlesheets: () =>
    import("./BRAN_ICONS/googlesheets").then((mod) => ({
      default: mod.GooglesheetsIcon,
    })),
  Klaviyo: () =>
    import("./BRAN_ICONS/klaviyo").then((mod) => ({ default: mod.KlaviyoIcon })),
  Klipfolio: () =>
    import("./BRAN_ICONS/Klipfolio").then((mod) => ({ default: mod.KlipfolioIcon })),
  One_Drive: () =>
    import("./BRAN_ICONS/one_drive").then((mod) => ({ default: mod.One_DriveIcon })),
  Wrike: () =>
    import("./BRAN_ICONS/wrike").then((mod) => ({ default: mod.WrikeIcon })),
  Miro: () => import("./BRAN_ICONS/miro").then((mod) => ({ default: mod.MiroIcon })),
  Figma: () =>
    import("./BRAN_ICONS/figma").then((mod) => ({ default: mod.FigmaIcon })),
  discord: () =>
    import("./BRAN_ICONS/discord").then((mod) => ({
      default: mod.DiscordIcon,
    })),
  Digicert: () =>
    import("./BRAN_ICONS/Digicert").then((mod) => ({ default: mod.DigicertIcon })),
  Contentful: () =>
    import("./BRAN_ICONS/contentful").then((mod) => ({
      default: mod.ContentfulIcon,
    })),
  Calendly: () =>
    import("./BRAN_ICONS/calendly").then((mod) => ({
      default: mod.CalendlyIcon,
    })),
  CapsuleCRM: () =>
    import("./BRAN_ICONS/Capsulecrm").then((mod) => ({
      default: mod.CapsulecrmIcon,
    })),
  Canvas: () =>
    import("./BRAN_ICONS/Canvas").then((mod) => ({ default: mod.CanvasIcon })),
  Canvaas: () =>
    import("./BRAN_ICONS/Canvas").then((mod) => ({ default: mod.CanvasIcon })),
  Attio: () =>
    import("./BRAN_ICONS/attio").then((mod) => ({ default: mod.AttioIcon })),
  Asana: () =>
    import("./BRAN_ICONS/asana").then((mod) => ({ default: mod.AsanaIcon })),
  Airtable: () =>
    import("./BRAN_ICONS/airtable").then((mod) => ({ default: mod.AirtableIcon })),
  AstraDB: () =>
    import("./BRAN_ICONS/AstraDB").then((mod) => ({ default: mod.AstraDBIcon })),
  Athena: () =>
    import("./BRAN_ICONS/athena").then((mod) => ({ default: mod.AthenaIcon })),
  AWS: () => import("./BRAN_ICONS/AWS").then((mod) => ({ default: mod.AWSIcon })),
  AWSInverted: () =>
    import("./BRAN_ICONS/AWSInverted").then((mod) => ({
      default: mod.AWSInvertedIcon,
    })),
  Azure: () =>
    import("./BRAN_ICONS/Azure").then((mod) => ({ default: mod.AzureIcon })),
  Bing: () => import("./BRAN_ICONS/Bing").then((mod) => ({ default: mod.BingIcon })),
  Bolna: () =>
    import("./BRAN_ICONS/Bolna").then((mod) => ({ default: mod.BolnaIcon })),
  BotMessageSquareIcon: () =>
    import("./BRAN_ICONS/BotMessageSquare").then((mod) => ({
      default: mod.BotMessageSquareIcon,
    })),
  Brandfetch: () =>
    import("./BRAN_ICONS/Brandfetch").then((mod) => ({
      default: mod.BrandfetchIcon,
    })),
  Brightdata: () =>
    import("./BRAN_ICONS/Brightdata").then((mod) => ({
      default: mod.BrightdataIcon,
    })),
  BWPython: () =>
    import("./BRAN_ICONS/BW python").then((mod) => ({ default: mod.BWPythonIcon })),
  Cassandra: () =>
    import("./BRAN_ICONS/Cassandra").then((mod) => ({ default: mod.CassandraIcon })),
  Chroma: () =>
    import("./BRAN_ICONS/ChromaIcon").then((mod) => ({ default: mod.ChromaIcon })),
  Cleanlab: () =>
    import("./BRAN_ICONS/Cleanlab").then((mod) => ({ default: mod.CleanlabIcon })),
  Clickhouse: () =>
    import("./BRAN_ICONS/Clickhouse").then((mod) => ({
      default: mod.ClickhouseIcon,
    })),
  Cloudflare: () =>
    import("./BRAN_ICONS/Cloudflare").then((mod) => ({
      default: mod.CloudflareIcon,
    })),
  Cohere: () =>
    import("./BRAN_ICONS/Cohere").then((mod) => ({ default: mod.CohereIcon })),
  CometAPI: () =>
    import("./BRAN_ICONS/CometAPI").then((mod) => ({ default: mod.CometAPIIcon })),
  Composio: () =>
    import("./BRAN_ICONS/Composio").then((mod) => ({ default: mod.ComposioIcon })),
  Confluence: () =>
    import("./BRAN_ICONS/Confluence").then((mod) => ({
      default: mod.ConfluenceIcon,
    })),
  Couchbase: () =>
    import("./BRAN_ICONS/Couchbase").then((mod) => ({ default: mod.CouchbaseIcon })),
  Classroom: () =>
    import("./BRAN_ICONS/Classroom").then((mod) => ({ default: mod.ClassroomIcon })),
  Claude: () =>
    import("./BRAN_ICONS/Claude").then((mod) => ({ default: mod.ClaudeIcon })),
  CrewAI: () =>
    import("./BRAN_ICONS/CrewAI").then((mod) => ({ default: mod.CrewAiIcon })),
  Cursor: () =>
    import("./BRAN_ICONS/Cursor").then((mod) => ({ default: mod.CursorIcon })),
  DeepSeek: () =>
    import("./BRAN_ICONS/DeepSeek").then((mod) => ({ default: mod.DeepSeekIcon })),
  Docling: () =>
    import("./BRAN_ICONS/Docling").then((mod) => ({ default: mod.DoclingIcon })),
  Dropbox: () =>
    import("./BRAN_ICONS/Dropbox").then((mod) => ({ default: mod.DropboxIcon })),
  DuckDuckGo: () =>
    import("./BRAN_ICONS/DuckDuckGo").then((mod) => ({
      default: mod.DuckDuckGoIcon,
    })),
  ElasticsearchStore: () =>
    import("./BRAN_ICONS/ElasticsearchStore").then((mod) => ({
      default: mod.ElasticsearchIcon,
    })),
  Evernote: () =>
    import("./BRAN_ICONS/Evernote").then((mod) => ({ default: mod.EvernoteIcon })),
  Exa: () => import("./BRAN_ICONS/Exa").then((mod) => ({ default: mod.ExaIcon })),
  ExaComposio: () =>
    import("./BRAN_ICONS/ExaComposio").then((mod) => ({
      default: mod.ExaIconComposio,
    })),
  Fireflies: () =>
    import("./BRAN_ICONS/Fireflies").then((mod) => ({ default: mod.FirefliesIcon })),
  Excel: () =>
    import("./BRAN_ICONS/Excel").then((mod) => ({ default: mod.ExcelIcon })),
  FacebookMessenger: () =>
    import("./BRAN_ICONS/FacebookMessenger").then((mod) => ({
      default: mod.FBIcon,
    })),
  Firecrawl: () =>
    import("./BRAN_ICONS/Firecrawl").then((mod) => ({ default: mod.FirecrawlIcon })),
  Finage: () =>
    import("./BRAN_ICONS/Finage").then((mod) => ({ default: mod.FinageIcon })),
  Fixer: () =>
    import("./BRAN_ICONS/Fixer").then((mod) => ({ default: mod.FixerIcon })),
  Flexisign: () =>
    import("./BRAN_ICONS/Flexisign").then((mod) => ({ default: mod.FlexisignIcon })),
  FreezeAll: () =>
    import("./BRAN_ICONS/freezeAll").then((mod) => ({ default: mod.freezeAllIcon })),
  Freshdesk: () =>
    import("./BRAN_ICONS/Freshdesk").then((mod) => ({ default: mod.FreshdeskIcon })),
  GitBook: () =>
    import("./BRAN_ICONS/GitBook").then((mod) => ({ default: mod.GitBookIcon })),
  GitLoader: () =>
    import("./BRAN_ICONS/GitLoader").then((mod) => ({ default: mod.GitLoaderIcon })),
  Github: () =>
    import("./BRAN_ICONS/github").then((mod) => ({ default: mod.GithubIcon })),
  Glean: () =>
    import("./BRAN_ICONS/Glean").then((mod) => ({ default: mod.GleanIcon })),
  GlobeOk: () =>
    import("./BRAN_ICONS/globe-ok").then((mod) => ({ default: mod.GlobeOkIcon })),
  Google: () =>
    import("./BRAN_ICONS/Google").then((mod) => ({ default: mod.GoogleIcon })),
  GoogleDrive: () =>
    import("./BRAN_ICONS/GoogleDrive").then((mod) => ({
      default: mod.GoogleDriveIcon,
    })),
  Googlemeet: () =>
    import("./BRAN_ICONS/googlemeet").then((mod) => ({
      default: mod.GooglemeetIcon,
    })),
  GoogleTasks: () =>
    import("./BRAN_ICONS/GoogleTasks").then((mod) => ({
      default: mod.GoogleTasksIcon,
    })),
  GoogleGenerativeAI: () =>
    import("./BRAN_ICONS/GoogleGenerativeAI").then((mod) => ({
      default: mod.GoogleGenerativeAIIcon,
    })),
  Gmail: () =>
    import("./BRAN_ICONS/gmail").then((mod) => ({ default: mod.GmailIcon })),
  Outlook: () =>
    import("./BRAN_ICONS/outlook").then((mod) => ({ default: mod.OutlookIcon })),
  Pandadoc: () =>
    import("./BRAN_ICONS/Pandadoc").then((mod) => ({ default: mod.PandadocIcon })),
  Googlecalendar: () =>
    import("./BRAN_ICONS/googlecalendar").then((mod) => ({
      default: mod.GooglecalendarIcon,
    })),
  GradientInfinity: () =>
    import("./BRAN_ICONS/GradientSparkles").then((mod) => ({
      default: mod.GradientInfinity,
    })),
  Googlemaps: () =>
    import("./BRAN_ICONS/googlemaps").then((mod) => ({
      default: mod.GooglemapsIcon,
    })),
  Todoist: () =>
    import("./BRAN_ICONS/todoist").then((mod) => ({
      default: mod.TodoistIcon,
    })),
  Zoom: () =>
    import("./BRAN_ICONS/zoom").then((mod) => ({
      default: mod.ZoomIcon,
    })),
  GradientUngroup: () =>
    import("./BRAN_ICONS/GradientSparkles").then((mod) => ({
      default: mod.GradientUngroup,
    })),
  GradientSave: () =>
    import("./BRAN_ICONS/GradientSparkles").then((mod) => ({
      default: mod.GradientSave,
    })),
  GridHorizontal: () =>
    import("./BRAN_ICONS/GridHorizontal").then((mod) => ({
      default: mod.GridHorizontalIcon,
    })),
  Groq: () => import("./BRAN_ICONS/Groq").then((mod) => ({ default: mod.GroqIcon })),
  HackerNews: () =>
    import("./BRAN_ICONS/hackerNews").then((mod) => ({
      default: mod.HackerNewsIcon,
    })),
  HCD: () => import("./BRAN_ICONS/HCD").then((mod) => ({ default: mod.HCDIcon })),
  HomeAssistant: () =>
    import("./BRAN_ICONS/HomeAssistant").then((mod) => ({
      default: mod.HomeAssistantIcon,
    })),
  HuggingFace: () =>
    import("./BRAN_ICONS/HuggingFace").then((mod) => ({
      default: mod.HuggingFaceIcon,
    })),
  Icosa: () =>
    import("./BRAN_ICONS/Icosa").then((mod) => ({ default: mod.IcosaIcon })),
  IFixIt: () =>
    import("./BRAN_ICONS/IFixIt").then((mod) => ({ default: mod.IFixIcon })),
  Instagram: () =>
    import("./BRAN_ICONS/Instagram").then((mod) => ({ default: mod.InstagramIcon })),
  javascript: () =>
    import("./BRAN_ICONS/JSicon").then((mod) => ({ default: mod.JSIcon })),
  JigsawStack: () =>
    import("./BRAN_ICONS/JigsawStack").then((mod) => ({
      default: mod.JigsawStackIcon,
    })),
  Jira: () => import("./BRAN_ICONS/Jira").then((mod) => ({ default: mod.JiraIcon })),
  Jotform: () =>
    import("./BRAN_ICONS/Jotform").then((mod) => ({ default: mod.JotformIcon })),
  Linear: () =>
    import("./BRAN_ICONS/linear").then((mod) => ({ default: mod.LinearIcon })),
  LangChain: () =>
    import("./BRAN_ICONS/LangChain").then((mod) => ({ default: mod.LangChainIcon })),
  Langwatch: () =>
    import("./BRAN_ICONS/Langwatch").then((mod) => ({ default: mod.LangwatchIcon })),
  LMStudio: () =>
    import("./BRAN_ICONS/LMStudio").then((mod) => ({ default: mod.LMStudioIcon })),
  Listennotes: () =>
    import("./BRAN_ICONS/Listennotes").then((mod) => ({
      default: mod.ListennotesIcon,
    })),
  Maritalk: () =>
    import("./BRAN_ICONS/Maritalk").then((mod) => ({ default: mod.MaritalkIcon })),
  Mcp: () => import("./BRAN_ICONS/MCP").then((mod) => ({ default: mod.McpIcon })),
  Mem0: () => import("./BRAN_ICONS/Mem0").then((mod) => ({ default: mod.Mem0 })),
  Mem0Composio: () =>
    import("./BRAN_ICONS/Mem0Composio").then((mod) => ({
      default: mod.Mem0IconComposio,
    })),
  Meta: () => import("./BRAN_ICONS/Meta").then((mod) => ({ default: mod.MetaIcon })),
  Midjourney: () =>
    import("./BRAN_ICONS/Midjorney").then((mod) => ({
      default: mod.MidjourneyIcon,
    })),
  Milvus: () =>
    import("./BRAN_ICONS/Milvus").then((mod) => ({ default: mod.MilvusIcon })),
  Missive: () =>
    import("./BRAN_ICONS/Missive").then((mod) => ({ default: mod.MissiveIcon })),
  Mistral: () =>
    import("./BRAN_ICONS/mistral").then((mod) => ({ default: mod.MistralIcon })),
  MongoDB: () =>
    import("./BRAN_ICONS/MongoDB").then((mod) => ({ default: mod.MongoDBIcon })),
  Needle: () =>
    import("./BRAN_ICONS/Needle").then((mod) => ({ default: mod.NeedleIcon })),
  Neon: () => import("./BRAN_ICONS/Neon").then((mod) => ({ default: mod.NeonIcon })),
  Newsapi: () =>
    import("./BRAN_ICONS/Newsapi").then((mod) => ({ default: mod.NewsapiIcon })),
  NotDiamond: () =>
    import("./BRAN_ICONS/NotDiamond").then((mod) => ({
      default: mod.NotDiamondIcon,
    })),
  Notion: () =>
    import("./BRAN_ICONS/Notion").then((mod) => ({ default: mod.NotionIcon })),
  Novita: () =>
    import("./BRAN_ICONS/Novita").then((mod) => ({ default: mod.NovitaIcon })),
  NVIDIA: () =>
    import("./BRAN_ICONS/Nvidia").then((mod) => ({ default: mod.NvidiaIcon })),
  Olivya: () =>
    import("./BRAN_ICONS/Olivya").then((mod) => ({ default: mod.OlivyaIcon })),
  Ollama: () =>
    import("./BRAN_ICONS/Ollama").then((mod) => ({ default: mod.OllamaIcon })),
  OpenAI: () =>
    import("./BRAN_ICONS/OpenAi").then((mod) => ({ default: mod.OpenAiIcon })),
  OpenAICopy: () =>
    import("./BRAN_ICONS/OpenAI copy").then((mod) => ({ default: mod.OpenAIIcon })),
  OpenRouter: () =>
    import("./BRAN_ICONS/OpenRouter").then((mod) => ({
      default: mod.OpenRouterIcon,
    })),
  OpenSearch: () =>
    import("./BRAN_ICONS/OpenSearch").then((mod) => ({ default: mod.OpenSearch })),
  Perplexity: () =>
    import("./BRAN_ICONS/Perplexity").then((mod) => ({
      default: mod.PerplexityIcon,
    })),
  PerplexityComposio: () =>
    import("./BRAN_ICONS/PerplexityComposio").then((mod) => ({
      default: mod.PerplexityIconComposio,
    })),
  Pinecone: () =>
    import("./BRAN_ICONS/Pinecone").then((mod) => ({ default: mod.PineconeIcon })),
  Postgres: () =>
    import("./BRAN_ICONS/Postgres").then((mod) => ({ default: mod.PostgresIcon })),
  Python: () =>
    import("./BRAN_ICONS/Python").then((mod) => ({ default: mod.PythonIcon })),
  QDrant: () =>
    import("./BRAN_ICONS/QDrant").then((mod) => ({ default: mod.QDrantIcon })),
  QianFanChat: () =>
    import("./BRAN_ICONS/QianFanChat").then((mod) => ({
      default: mod.QianFanChatIcon,
    })),
  Redis: () =>
    import("./BRAN_ICONS/Redis").then((mod) => ({ default: mod.RedisIcon })),
  Reddit: () =>
    import("./BRAN_ICONS/reddit").then((mod) => ({ default: mod.RedditIcon })),
  SambaNova: () =>
    import("./BRAN_ICONS/SambaNova").then((mod) => ({ default: mod.SambaNovaIcon })),
  ScrapeGraph: () =>
    import("./BRAN_ICONS/ScrapeGraphAI").then((mod) => ({
      default: mod.ScrapeGraph,
    })),
  SearchAPI: () =>
    import("./BRAN_ICONS/SearchAPI").then((mod) => ({ default: mod.SearchAPIIcon })),
  SearchLexical: () =>
    import("./BRAN_ICONS/SearchLexical").then((mod) => ({
      default: mod.SearchLexicalIcon,
    })),
  SearchHybrid: () =>
    import("./BRAN_ICONS/SearchHybrid").then((mod) => ({
      default: mod.SearchHybridIcon,
    })),
  SearchVector: () =>
    import("./BRAN_ICONS/SearchVector").then((mod) => ({
      default: mod.SearchVectorIcon,
    })),
  Searx: () =>
    import("./BRAN_ICONS/Searx").then((mod) => ({ default: mod.SearxIcon })),
  SerpSearch: () =>
    import("./BRAN_ICONS/SerpSearch").then((mod) => ({
      default: mod.SerpSearchIcon,
    })),
  SerpSearchComposio: () =>
    import("./BRAN_ICONS/SerpAPIComposio").then((mod) => ({
      default: mod.SerpSearchIconComposio,
    })),
  Serper: () =>
    import("./BRAN_ICONS/Serper").then((mod) => ({ default: mod.SerperIcon })),
  Share2: () =>
    import("./BRAN_ICONS/Share2").then((mod) => ({ default: mod.Share2Icon })),
  Slack: () =>
    import("./BRAN_ICONS/Slack/SlackIcon").then((mod) => ({ default: mod.default })),
  SlackComposio: () =>
    import("./BRAN_ICONS/slackComposio").then((mod) => ({
      default: mod.SlackIcons,
    })),
  Slides: () =>
    import("./BRAN_ICONS/Slides").then((mod) => ({ default: mod.SlidesIcon })),
  Spider: () =>
    import("./BRAN_ICONS/Spider").then((mod) => ({ default: mod.SpiderIcon })),
  Streamlit: () =>
    import("./BRAN_ICONS/Streamlit").then((mod) => ({ default: mod.Streamlit })),
  Supabase: () =>
    import("./BRAN_ICONS/supabase").then((mod) => ({ default: mod.SupabaseIcon })),
  Tavily: () =>
    import("./BRAN_ICONS/Tavily").then((mod) => ({ default: mod.TavilyIcon })),
  ThumbDownCustom: () =>
    import("./BRAN_ICONS/thumbs").then((mod) => ({
      default: mod.ThumbDownIconCustom,
    })),
  ThumbUpCustom: () =>
    import("./BRAN_ICONS/thumbs").then((mod) => ({
      default: mod.ThumbUpIconCustom,
    })),
  Timelinesai: () =>
    import("./BRAN_ICONS/Timelinesai").then((mod) => ({
      default: mod.TimelinesaiIcon,
    })),
  TwelveLabs: () =>
    import("./BRAN_ICONS/TwelveLabs").then((mod) => ({
      default: mod.TwelveLabsIcon,
    })),
  TwitterX: () =>
    import("./BRAN_ICONS/Twitter X").then((mod) => ({
      default: mod.TwitterXIcon,
    })),
  VLMRun: () =>
    import("./BRAN_ICONS/VLMRun").then((mod) => ({
      default: mod.VLMRunIcon,
    })),
  Unstructured: () =>
    import("./BRAN_ICONS/Unstructured").then((mod) => ({
      default: mod.UnstructuredIcon,
    })),
  Upstash: () =>
    import("./BRAN_ICONS/Upstash").then((mod) => ({ default: mod.UpstashSvgIcon })),
  Vectara: () =>
    import("./BRAN_ICONS/VectaraIcon").then((mod) => ({ default: mod.VectaraIcon })),
  VectorStores: () =>
    import("./BRAN_ICONS/vectorstores").then((mod) => ({
      default: mod.VectorStoresIcon,
    })),
  VertexAI: () =>
    import("./BRAN_ICONS/VertexAI").then((mod) => ({ default: mod.VertexAIIcon })),
  WatsonxAI: () =>
    import("./BRAN_ICONS/IBMWatsonx").then((mod) => ({
      default: mod.WatsonxAiIcon,
    })),
  Weaviate: () =>
    import("./BRAN_ICONS/Weaviate").then((mod) => ({ default: mod.WeaviateIcon })),
  Wikipedia: () =>
    import("./BRAN_ICONS/Wikipedia/Wikipedia").then((mod) => ({
      default: mod.default,
    })),
  Windsurf: () =>
    import("./BRAN_ICONS/Windsurf").then((mod) => ({ default: mod.WindsurfIcon })),
  Wolfram: () =>
    import("./BRAN_ICONS/Wolfram").then((mod) => ({ default: mod.WolframIcon })),
  xAI: () => import("./BRAN_ICONS/xAI").then((mod) => ({ default: mod.XAIIcon })),
  youTube: () =>
    import("./BRAN_ICONS/Youtube").then((mod) => ({ default: mod.YoutubeIcon })),
  ZepMemory: () =>
    import("./BRAN_ICONS/ZepMemory").then((mod) => ({ default: mod.ZepMemoryIcon })),
};
