# ChangePilot AI — AI Engineering Roadmap

> Objetivo: aprender AI Engineering construindo, do zero em TypeScript,
> um produto real que utilize LLMs, RAG, MCP, agentes, LangGraph,
> fine-tuning, evals e AI DevOps.

---

# 01 — Fundamentos de LLM Engineering

## 01.1 — O que acontece quando uma aplicação usa um LLM

- [x] Entender aplicação → provider → modelo → aplicação
- [x] Diferenciar LLM, modelo, provider e API
- [x] Entender request e response conceitualmente
- [x] Entender serialização da requisição
- [x] Entender onde ocorre tokenização
- [x] Entender geração/autoregressão em alto nível
- [x] Modelar o lifecycle de uma geração em TypeScript

## 01.2 — Tokens

- [x] Entender o que é um token
- [x] Entender tokenização
- [x] Entender por que tokens não correspondem diretamente a palavras
- [x] Input tokens vs output tokens
- [x] Relação entre tokens, custo e latência
- [x] Experimentar tokenização com textos e código

## 01.3 — Context Window

- [x] Entender context window
- [x] Entender o que efetivamente entra no contexto
- [x] Limites de contexto
- [x] Context overflow
- [x] Estratégias básicas para controlar contexto
- [x] Entender por que contexto maior não significa necessariamente resposta melhor

## 01.4 — Messages e Roles

- [x] System messages
- [x] User messages
- [x] Assistant messages
- [ ] Tool messages
- [x] Conversa como sequência estruturada
- [x] Modelar messages em TypeScript
- [x] Separar domínio da aplicação de formatos específicos de providers

## 01.5 — Prompt Engineering

- [x] Instruction prompting
- [x] Zero-shot
- [x] Few-shot
- [x] Exemplos positivos e negativos
- [x] Delimitadores
- [x] Restrições explícitas
- [x] Ambiguidade de instruções
- [x] Prompt injection em nível introdutório

## 01.6 — Context Engineering

- [x] Prompt engineering vs context engineering
- [x] Seleção de contexto
- [x] Ordenação de informações
- [x] Context relevance
- [x] Context pollution
- [x] Instruções vs dados
- [x] Construção programática de contexto
- [x] Aplicação ao ChangePilot

## 01.7 — Parâmetros de geração

- [ ] Temperature
- [ ] Top-P
- [ ] Max output tokens
- [ ] Stop sequences
- [ ] Determinismo vs variabilidade
- [ ] Quando não alterar parâmetros
- [ ] Separar parâmetros de negócio de parâmetros específicos do provider

## 01.8 — Primeiro provider real

- [ ] Comparar providers disponíveis
- [ ] Escolher um provider para o primeiro adapter
- [ ] Entender por que precisamos dele neste momento
- [ ] Configurar secrets corretamente
- [ ] Instalar SDK oficial
- [ ] Realizar primeira geração real
- [ ] Inspecionar request e response
- [ ] Identificar elementos específicos do provider

## 01.9 — Modelagem de Generation

- [ ] Criar contrato interno de geração
- [ ] Modelar GenerationRequest
- [ ] Modelar GenerationResponse
- [ ] Modelar token usage
- [ ] Modelar finish reason
- [ ] Evitar abstração prematura
- [ ] Criar primeiro adapter de provider

## 01.10 — Structured Outputs

- [ ] Problemas de consumir texto livre
- [ ] JSON output
- [ ] JSON Schema
- [ ] Schema validation
- [ ] Runtime validation
- [ ] Zod ou alternativa equivalente
- [ ] Invalid structured output
- [ ] Retry de parsing
- [ ] Aplicar structured output no ChangePilot

## 01.11 — Tool / Function Calling

- [ ] Entender o que tool calling realmente significa
- [ ] Entender que o modelo não executa a ferramenta
- [ ] Tool definitions
- [ ] Tool arguments
- [ ] Tool selection
- [ ] Execução pela aplicação
- [ ] Tool result
- [ ] Continuação da geração
- [ ] Criar primeira tool local
- [ ] Validar argumentos da tool

## 01.12 — Streaming

- [ ] Response completa vs streaming
- [ ] Server-Sent Events / streams
- [ ] Chunks
- [ ] Tokens incrementais
- [ ] Streaming no provider
- [ ] Streaming API → frontend
- [ ] Cancelamento
- [ ] Erros durante streaming

## 01.13 — Token Usage e Custos

- [ ] Capturar input tokens
- [ ] Capturar output tokens
- [ ] Calcular custo estimado
- [ ] Custo por request
- [ ] Custo por feature
- [ ] Modelos caros vs baratos
- [ ] Criar primitive de usage/cost tracking

## 01.14 — Latência

- [ ] Time to First Token
- [ ] Time to Last Token
- [ ] Latência do provider
- [ ] Latência de rede
- [ ] Latência da aplicação
- [ ] Instrumentação básica
- [ ] Trade-off custo × qualidade × latência

## 01.15 — Errors, Timeout e Cancellation

- [ ] Erros HTTP
- [ ] Erros do provider
- [ ] Invalid requests
- [ ] Timeout
- [ ] AbortController
- [ ] Cancellation propagation
- [ ] Erros recuperáveis vs não recuperáveis

## 01.16 — Retry e Rate Limiting

- [ ] Quando fazer retry
- [ ] Quando não fazer retry
- [ ] Exponential backoff
- [ ] Jitter
- [ ] Rate limits
- [ ] Retry-After
- [ ] Idempotência
- [ ] Retry budgets

## 01.17 — Provider Abstraction

- [ ] Revisar código existente
- [ ] Identificar diferenças entre domínio e provider
- [ ] Definir fronteira mínima
- [ ] Adapter pattern
- [ ] Implementar segundo provider ou fake provider
- [ ] Comparar providers
- [ ] Evitar lowest-common-denominator abstraction

## 01.18 — Testing da camada AI

- [ ] Unit tests sem provider real
- [ ] Fake provider
- [ ] Fixtures
- [ ] Contract tests
- [ ] Integration tests
- [ ] Evitar testes frágeis baseados em texto exato
- [ ] Definir fronteira entre tests e evals

## 01.19 — Fechamento do módulo de LLM Engineering

- [ ] Refatorar `packages/ai`
- [ ] Atualizar ARCHITECTURE.md
- [ ] Atualizar PROJECT_STATE.md
- [ ] Criar ADRs necessários
- [ ] Revisar custos e observabilidade
- [ ] Documentar decisões
- [ ] Consolidar aprendizado

---

# 02 — Embeddings e Code Intelligence

## 02.1 — O problema da busca semântica

- [ ] Busca textual vs semântica
- [ ] Por que LLM não conhece automaticamente nosso repositório
- [ ] Introdução a embeddings

## 02.2 — Embeddings

- [ ] Vetores
- [ ] Dimensionalidade
- [ ] Similaridade semântica
- [ ] Embedding de texto
- [ ] Embedding de código
- [ ] Modelos de embeddings

## 02.3 — Similaridade vetorial

- [ ] Cosine similarity
- [ ] Dot product
- [ ] Euclidean distance
- [ ] Ranking por similaridade
- [ ] Implementar busca vetorial simples em memória

## 02.4 — Ingestão de repositórios

- [ ] Ler estrutura de diretórios
- [ ] Ignorar arquivos irrelevantes
- [ ] `.gitignore`
- [ ] Binários
- [ ] Arquivos gerados
- [ ] Limites de tamanho
- [ ] Representar RepositoryDocument

## 02.5 — Chunking

- [ ] Por que dividir documentos
- [ ] Fixed-size chunking
- [ ] Recursive chunking
- [ ] Semantic chunking
- [ ] Chunking específico para código
- [ ] Chunk overlap
- [ ] Trade-offs de chunk size

## 02.6 — AST e análise estrutural de código

- [ ] O que é AST
- [ ] Parsing de TypeScript
- [ ] Functions
- [ ] Classes
- [ ] Components
- [ ] Imports
- [ ] Exports
- [ ] Symbols
- [ ] Chunking orientado por AST

## 02.7 — Metadata

- [ ] Repository
- [ ] Path
- [ ] Language
- [ ] Symbol
- [ ] Type
- [ ] Line ranges
- [ ] Commit/version
- [ ] Metadata filtering

## 02.8 — Vector Store

- [ ] O que um vector database resolve
- [ ] Busca em memória vs persistente
- [ ] Comparar opções
- [ ] Escolher tecnologia
- [ ] Persistir embeddings
- [ ] Índices vetoriais

## 02.9 — Semantic Code Search

- [ ] Gerar embedding da query
- [ ] Buscar chunks
- [ ] Rankear resultados
- [ ] Exibir arquivo + linhas + score
- [ ] Criar primeira busca semântica funcional

## 02.10 — Incremental Indexing

- [ ] Evitar reindexar todo o repository
- [ ] Hash de conteúdo
- [ ] Arquivos adicionados
- [ ] Arquivos modificados
- [ ] Arquivos removidos
- [ ] Reindexação incremental

## 02.11 — Fechamento do Code Intelligence

- [ ] Testes
- [ ] Métricas básicas
- [ ] Documentação
- [ ] ADR da estratégia de embeddings
- [ ] Atualizar arquitetura

---

# 03 — RAG e Advanced RAG

## 03.1 — Fundamentos de RAG

- [ ] Retrieval-Augmented Generation
- [ ] Retrieval
- [ ] Augmentation
- [ ] Generation
- [ ] Quando usar RAG
- [ ] Quando RAG não resolve

## 03.2 — Primeiro Repository Q&A

- [ ] Receber pergunta
- [ ] Recuperar contexto
- [ ] Construir prompt
- [ ] Gerar resposta
- [ ] Retornar fontes
- [ ] Primeira feature RAG do ChangePilot

## 03.3 — Grounding e citações

- [ ] Grounded answers
- [ ] Source attribution
- [ ] File citations
- [ ] Line citations
- [ ] Abstention
- [ ] Responder "não sei"

## 03.4 — Retrieval Quality

- [ ] Precision
- [ ] Recall
- [ ] Top-K
- [ ] Noise
- [ ] Missing context
- [ ] Retrieval debugging

## 03.5 — Keyword Search / BM25

- [ ] Limitações de semantic search
- [ ] Busca lexical
- [ ] BM25
- [ ] Identificadores e nomes de símbolos
- [ ] Quando lexical vence semantic

## 03.6 — Hybrid Search

- [ ] Semantic + lexical
- [ ] Combinar resultados
- [ ] Score normalization
- [ ] Reciprocal Rank Fusion
- [ ] Aplicar hybrid search ao código

## 03.7 — Query Classification

- [ ] Classificar intenção
- [ ] Pergunta arquitetural
- [ ] Busca de símbolo
- [ ] Busca de implementação
- [ ] Pergunta sobre comportamento
- [ ] Selecionar estratégia de retrieval

## 03.8 — Query Rewriting

- [ ] Reescrever queries
- [ ] Expansão de consulta
- [ ] Multi-query retrieval
- [ ] HyDE em nível conceitual
- [ ] Avaliar quando rewriting ajuda ou piora

## 03.9 — Metadata Filtering

- [ ] Filtrar por linguagem
- [ ] Path
- [ ] file type
- [ ] symbols
- [ ] repository
- [ ] branch/version

## 03.10 — Reranking

- [ ] Retrieval vs reranking
- [ ] Cross-encoder / reranker
- [ ] LLM-based reranking
- [ ] Custo do reranking
- [ ] Aplicar reranking ao ChangePilot

## 03.11 — Context Construction

- [ ] Escolher chunks finais
- [ ] Remover duplicação
- [ ] Ordenar contexto
- [ ] Context packing
- [ ] Token budget
- [ ] Preservar relações entre arquivos

## 03.12 — Parent/Child Retrieval

- [ ] Small chunks para busca
- [ ] Large chunks para contexto
- [ ] Recuperar parent documents
- [ ] Aplicação para functions/classes/modules

## 03.13 — Multi-Step Retrieval

- [ ] Retrieval iterativo
- [ ] Pergunta → evidência → nova busca
- [ ] Dependency exploration
- [ ] Limites e stopping conditions

## 03.14 — RAG Failure Modes

- [ ] Retrieval failure
- [ ] Ranking failure
- [ ] Context failure
- [ ] Generation failure
- [ ] Hallucination
- [ ] Stale index
- [ ] Debugging sistemático

## 03.15 — Caching em sistemas RAG

- [ ] Embedding cache
- [ ] Retrieval cache
- [ ] Generation cache
- [ ] Cache invalidation
- [ ] Semantic caching

## 03.16 — Advanced RAG Pipeline

- [ ] Consolidar pipeline
- [ ] Classification
- [ ] Rewriting
- [ ] Hybrid retrieval
- [ ] Fusion
- [ ] Filtering
- [ ] Reranking
- [ ] Context construction
- [ ] Generation
- [ ] Citations

## 03.17 — Fechamento do RAG

- [ ] Benchmark inicial
- [ ] Comparar basic RAG vs advanced RAG
- [ ] Documentar arquitetura
- [ ] Criar ADRs
- [ ] Atualizar PROJECT_STATE

---

# 04 — Model Context Protocol (MCP)

## 04.1 — O problema que MCP resolve

- [ ] LLM applications e tools
- [ ] Integrações proprietárias
- [ ] Cliente e servidor MCP
- [ ] Host MCP
- [ ] Modelo mental do protocolo

## 04.2 — Arquitetura MCP

- [ ] MCP Host
- [ ] MCP Client
- [ ] MCP Server
- [ ] Transport
- [ ] Lifecycle
- [ ] Capabilities

## 04.3 — MCP Tools

- [ ] Tool declaration
- [ ] Input schema
- [ ] Tool invocation
- [ ] Tool result
- [ ] Error handling

## 04.4 — MCP Resources

- [ ] Resources
- [ ] URIs
- [ ] Reading resources
- [ ] Repository context como resource

## 04.5 — MCP Prompts

- [ ] Prompt templates
- [ ] Arguments
- [ ] Diferença entre prompts e tools

## 04.6 — Criando o ChangePilot MCP Server

- [ ] Estrutura do servidor
- [ ] Primeiro servidor MCP em TypeScript
- [ ] Lifecycle
- [ ] Logs
- [ ] Errors

## 04.7 — Tools do ChangePilot

- [ ] `search_code`
- [ ] `find_symbol`
- [ ] `get_file_context`
- [ ] `explain_architecture`
- [ ] `find_related_files`
- [ ] `find_tests`

## 04.8 — Segurança em MCP

- [ ] Trust boundaries
- [ ] Tool permissions
- [ ] Input validation
- [ ] Path traversal
- [ ] Secrets
- [ ] Destructive operations
- [ ] Least privilege

## 04.9 — Integração com clientes MCP

- [ ] Conectar cliente compatível
- [ ] Testar tools externamente
- [ ] Debug MCP
- [ ] Compatibility

## 04.10 — Fechamento do MCP

- [ ] Testes
- [ ] Documentação das tools
- [ ] Arquitetura
- [ ] ADR
- [ ] Demo de portfólio

---

# 05 — Agents e Agentic Systems

## 05.1 — O que é um agente

- [ ] Workflow vs agent
- [ ] LLM + tools + loop
- [ ] Autonomia
- [ ] Estado
- [ ] Environment
- [ ] Goal

## 05.2 — Agent Loop

- [ ] Observe
- [ ] Decide
- [ ] Act
- [ ] Observe result
- [ ] Repeat
- [ ] Stopping conditions

## 05.3 — Tool-Using Agent

- [ ] Seleção dinâmica de tools
- [ ] Tool execution
- [ ] Tool errors
- [ ] Tool result interpretation
- [ ] Limite de iterações

## 05.4 — Planning

- [ ] Plano antes de executar
- [ ] Decomposição de tarefas
- [ ] Dynamic planning
- [ ] Replanning
- [ ] Plan validation

## 05.5 — Agent State

- [ ] Estado de execução
- [ ] Short-term memory
- [ ] Persistent state
- [ ] Context vs memory
- [ ] Serialização do estado

## 05.6 — Reflection e Critique

- [ ] Self-review
- [ ] Critique
- [ ] Revision
- [ ] Limitações de self-reflection
- [ ] Evitar loops infinitos

## 05.7 — Human-in-the-Loop

- [ ] Approval points
- [ ] Pause/resume
- [ ] Escalation
- [ ] Destructive actions
- [ ] UX para aprovação humana

## 05.8 — Primeiro agente do ChangePilot

- [ ] Issue analysis agent
- [ ] Recuperar contexto
- [ ] Identificar impacto
- [ ] Produzir plano técnico
- [ ] Critérios de parada

## 05.9 — Agentes especializados

- [ ] Context Agent
- [ ] Architecture Agent
- [ ] Planning Agent
- [ ] Test Agent
- [ ] Risk Agent
- [ ] Review Agent

## 05.10 — Multi-Agent Systems

- [ ] Quando vários agentes fazem sentido
- [ ] Delegação
- [ ] Supervisor
- [ ] Peer-to-peer
- [ ] Shared state
- [ ] Comunicação entre agentes

## 05.11 — Agent Failure Modes

- [ ] Infinite loops
- [ ] Tool abuse
- [ ] Bad planning
- [ ] Context drift
- [ ] Cost explosion
- [ ] Hallucinated tool arguments
- [ ] Premature completion

## 05.12 — Guardrails para agentes

- [ ] Max steps
- [ ] Token budget
- [ ] Cost budget
- [ ] Tool allowlist
- [ ] Permission levels
- [ ] Validation
- [ ] Human approval

## 05.13 — Fechamento de Agents

- [ ] Refatoração
- [ ] Testes
- [ ] Métricas
- [ ] Documentação
- [ ] ADR

---

# 06 — LangGraph e Stateful Agent Orchestration

## 06.1 — Por que LangGraph

- [ ] Problema de controlar agent loops manualmente
- [ ] Graph
- [ ] Nodes
- [ ] Edges
- [ ] State
- [ ] Conditional routing

## 06.2 — Primeiro Graph

- [ ] Criar state
- [ ] Criar nodes
- [ ] Criar edges
- [ ] START
- [ ] END
- [ ] Executar graph

## 06.3 — Typed State

- [ ] State schema
- [ ] Reducers
- [ ] Immutable updates
- [ ] Estado compartilhado

## 06.4 — Conditional Edges

- [ ] Decisões
- [ ] Routing
- [ ] Branches
- [ ] Retry paths
- [ ] Failure paths

## 06.5 — Loops

- [ ] Ciclos explícitos
- [ ] Stopping conditions
- [ ] Max iterations
- [ ] Replanning

## 06.6 — Persistence / Checkpointing

- [ ] Checkpoints
- [ ] Durable execution
- [ ] Resume
- [ ] Crash recovery
- [ ] Conversation/thread identity

## 06.7 — Human-in-the-Loop com LangGraph

- [ ] Interrupts
- [ ] Approval
- [ ] Resume
- [ ] Manual state updates

## 06.8 — Subgraphs

- [ ] Composição
- [ ] Separação de responsabilidades
- [ ] Reusable workflows

## 06.9 — ChangePilot Agent Graph

- [ ] Understand Issue
- [ ] Retrieve Context
- [ ] Architecture Analysis
- [ ] Plan
- [ ] Risk Analysis
- [ ] Test Planning
- [ ] Review
- [ ] Revision
- [ ] Final Result

## 06.10 — LangGraph Observability

- [ ] Inspecionar execução
- [ ] Node timings
- [ ] State transitions
- [ ] Failures
- [ ] Costs

## 06.11 — Fechamento do LangGraph

- [ ] Comparar implementação manual vs LangGraph
- [ ] Identificar valor real da framework
- [ ] Testes
- [ ] ADR
- [ ] Documentação

---

# 07 — Evals e AI Quality Engineering

## 07.1 — Por que testes tradicionais não bastam

- [ ] Determinismo vs probabilístico
- [ ] Unit tests vs evals
- [ ] Quality measurement
- [ ] Regressões de IA

## 07.2 — Criando um Eval Dataset

- [ ] Casos reais
- [ ] Inputs
- [ ] Expected properties
- [ ] Golden answers
- [ ] Metadata
- [ ] Dataset versioning

## 07.3 — Retrieval Evals

- [ ] Recall@K
- [ ] Precision@K
- [ ] MRR
- [ ] NDCG
- [ ] Hit rate

## 07.4 — Generation Evals

- [ ] Correctness
- [ ] Relevance
- [ ] Completeness
- [ ] Faithfulness
- [ ] Citation correctness

## 07.5 — Deterministic Evals

- [ ] Schema validation
- [ ] Exact properties
- [ ] Required citations
- [ ] Tool selection
- [ ] Forbidden behavior

## 07.6 — LLM-as-a-Judge

- [ ] Judge prompts
- [ ] Rubrics
- [ ] Bias
- [ ] Position bias
- [ ] Self-preference
- [ ] Limitations

## 07.7 — Human Evaluation

- [ ] Review rubrics
- [ ] Pairwise comparison
- [ ] Annotation
- [ ] Disagreement
- [ ] Ground truth

## 07.8 — Agent Evals

- [ ] Task success
- [ ] Tool accuracy
- [ ] Number of steps
- [ ] Invalid actions
- [ ] Cost
- [ ] Time
- [ ] Completion quality

## 07.9 — Regression Suite

- [ ] Baseline
- [ ] Candidate version
- [ ] Compare results
- [ ] Detect regressions
- [ ] Quality gates

## 07.10 — Experimentation

- [ ] Prompt A vs Prompt B
- [ ] Model A vs Model B
- [ ] RAG A vs RAG B
- [ ] Statistical considerations
- [ ] Cost-quality frontier

## 07.11 — Fechamento de Evals

- [ ] Criar eval harness do ChangePilot
- [ ] Baseline oficial
- [ ] Integrar no desenvolvimento
- [ ] Documentação

---

# 08 — Fine-Tuning de LLMs

## 08.1 — Quando fine-tuning faz sentido

- [ ] Fine-tuning vs prompting
- [ ] Fine-tuning vs RAG
- [ ] Fine-tuning vs tools
- [ ] Comportamento vs conhecimento
- [ ] Critérios para decidir

## 08.2 — Tipos de Fine-Tuning

- [ ] Supervised Fine-Tuning
- [ ] Instruction tuning
- [ ] Preference tuning
- [ ] LoRA
- [ ] QLoRA
- [ ] Visão geral de RLHF/DPO

## 08.3 — Dataset Engineering

- [ ] Qualidade dos exemplos
- [ ] Input/output pairs
- [ ] Chat datasets
- [ ] Cleaning
- [ ] Deduplication
- [ ] Leakage
- [ ] Train/validation/test split

## 08.4 — Dataset do ChangePilot

- [ ] Selecionar tarefa adequada
- [ ] Gerar/coletar exemplos
- [ ] Normalizar
- [ ] Revisar qualidade
- [ ] Versionar dataset

## 08.5 — Treinamento

- [ ] Base model
- [ ] Hyperparameters
- [ ] Epochs
- [ ] Learning rate
- [ ] Overfitting
- [ ] Checkpoints

## 08.6 — Avaliação do modelo fine-tuned

- [ ] Baseline model
- [ ] Prompted baseline
- [ ] RAG baseline
- [ ] Fine-tuned model
- [ ] Comparação objetiva

## 08.7 — Serving

- [ ] Hosted fine-tuned model
- [ ] Self-hosting em alto nível
- [ ] Quantization
- [ ] GPU considerations
- [ ] Latência
- [ ] Custo operacional

## 08.8 — Fine-Tuning Failure Modes

- [ ] Catastrophic forgetting
- [ ] Overfitting
- [ ] Dataset contamination
- [ ] Behavior degradation
- [ ] Custo sem benefício

## 08.9 — Decisão final no ChangePilot

- [ ] Demonstrar se fine-tuning melhora o produto
- [ ] Manter ou descartar
- [ ] Documentar evidências
- [ ] ADR

---

# 09 — AI Observability, Security e DevOps

## 09.1 — Observability para aplicações de IA

- [ ] Logs
- [ ] Metrics
- [ ] Traces
- [ ] LLM traces
- [ ] Correlation IDs
- [ ] Request lifecycle

## 09.2 — AI Telemetry

- [ ] Model
- [ ] Provider
- [ ] Tokens
- [ ] Cost
- [ ] Latency
- [ ] Tool calls
- [ ] Retrieval results
- [ ] Agent steps

## 09.3 — OpenTelemetry

- [ ] Traces
- [ ] Spans
- [ ] Attributes
- [ ] Propagation
- [ ] Instrumentar API
- [ ] Instrumentar AI operations

## 09.4 — Prompt e Trace Storage

- [ ] O que armazenar
- [ ] O que não armazenar
- [ ] PII
- [ ] Secrets
- [ ] Retention
- [ ] Redaction

## 09.5 — AI Security

- [ ] Prompt injection
- [ ] Indirect prompt injection
- [ ] Data exfiltration
- [ ] Tool abuse
- [ ] Secret leakage
- [ ] Supply-chain considerations

## 09.6 — Guardrails

- [ ] Input validation
- [ ] Output validation
- [ ] Policy layer
- [ ] Tool permissions
- [ ] Sandboxing
- [ ] Human approval

## 09.7 — CI para AI Applications

- [ ] Lint
- [ ] Typecheck
- [ ] Tests
- [ ] Evals
- [ ] Quality thresholds
- [ ] Cost thresholds

## 09.8 — AI-powered CI Analysis

- [ ] Ler logs de CI
- [ ] Classificar falhas
- [ ] Identificar causa provável
- [ ] Relacionar falha ao diff
- [ ] Sugerir correções

## 09.9 — ChangePilot CI Agent

- [ ] Consumir CI failure
- [ ] Buscar contexto no repository
- [ ] Analisar stack trace
- [ ] Gerar hipótese
- [ ] Produzir relatório
- [ ] Evitar auto-fix inseguro inicialmente

## 09.10 — AI-assisted Code Review

- [ ] Diff parsing
- [ ] Context retrieval
- [ ] Review criteria
- [ ] False positives
- [ ] Severity
- [ ] Inline comments

## 09.11 — Deployment

- [ ] Web deployment
- [ ] API deployment
- [ ] Environment variables
- [ ] Secrets
- [ ] Database migrations
- [ ] Health checks
- [ ] Rollback

## 09.12 — Reliability

- [ ] Provider outage
- [ ] Fallback models
- [ ] Circuit breaker
- [ ] Graceful degradation
- [ ] Queues
- [ ] Backpressure

## 09.13 — Cost Engineering

- [ ] Cost per feature
- [ ] Cost per user
- [ ] Token budgets
- [ ] Model routing
- [ ] Caching
- [ ] Batch processing
- [ ] Unit economics

## 09.14 — Fechamento de AI DevOps

- [ ] Production readiness review
- [ ] Threat model
- [ ] Observability review
- [ ] Reliability review
- [ ] ADRs
- [ ] Runbooks

---

# 10 — ChangePilot como Produto SaaS

## 10.1 — Definição do MVP

- [ ] Problema
- [ ] Persona
- [ ] Job to be Done
- [ ] Diferencial
- [ ] Escopo do MVP
- [ ] O que NÃO construir

## 10.2 — GitHub Integration

- [ ] GitHub App
- [ ] OAuth
- [ ] Repository permissions
- [ ] Installation
- [ ] Repositories
- [ ] Issues
- [ ] PRs
- [ ] Commits
- [ ] Webhooks

## 10.3 — Repository Onboarding

- [ ] Connect GitHub
- [ ] Select repository
- [ ] Clone/fetch
- [ ] Index
- [ ] Progress
- [ ] Ready state
- [ ] Reindex

## 10.4 — Background Jobs

- [ ] Identificar operações assíncronas
- [ ] Introduzir `apps/worker`
- [ ] Queue
- [ ] Jobs
- [ ] Retry
- [ ] Dead-letter strategy
- [ ] Idempotency

## 10.5 — Persistence

- [ ] PostgreSQL
- [ ] Schema
- [ ] Organizations
- [ ] Projects
- [ ] Repositories
- [ ] Analyses
- [ ] Agent runs
- [ ] Usage

## 10.6 — Multi-Tenancy

- [ ] Users
- [ ] Organizations
- [ ] Memberships
- [ ] Tenant isolation
- [ ] Authorization
- [ ] Repository isolation

## 10.7 — Change Impact Analyzer

- [ ] Selecionar issue
- [ ] Recuperar contexto
- [ ] Identificar arquivos afetados
- [ ] Identificar arquitetura afetada
- [ ] Identificar riscos
- [ ] Sugerir testes
- [ ] Gerar plano técnico

## 10.8 — Agent Run UI

- [ ] Mostrar execução
- [ ] Steps
- [ ] Tool calls
- [ ] Status
- [ ] Errors
- [ ] Human approvals
- [ ] Final result

## 10.9 — Repository Intelligence UI

- [ ] Semantic search
- [ ] Repository Q&A
- [ ] Sources
- [ ] Code references
- [ ] Architecture visualization
- [ ] Related files

## 10.10 — PR Intelligence

- [ ] Analisar diff
- [ ] Impact analysis
- [ ] Risk analysis
- [ ] Test coverage suggestions
- [ ] Review comments
- [ ] PR summary

## 10.11 — CI Intelligence

- [ ] Visualizar checks
- [ ] Analisar failures
- [ ] Relacionar logs ao código
- [ ] Explicar provável root cause
- [ ] Sugerir próximos passos

## 10.12 — Authentication e Authorization

- [ ] Login
- [ ] Sessions
- [ ] GitHub identity
- [ ] Organizations
- [ ] Roles
- [ ] Permissions

## 10.13 — Usage Limits

- [ ] Requests
- [ ] Tokens
- [ ] Indexed repositories
- [ ] Storage
- [ ] Agent runs
- [ ] Plan limits

## 10.14 — Billing

- [ ] Free tier
- [ ] Paid tier
- [ ] Subscription
- [ ] Metered usage
- [ ] Webhooks
- [ ] Billing state

## 10.15 — Product Analytics

- [ ] Activation
- [ ] Repository connection
- [ ] First analysis
- [ ] Retention
- [ ] Feature usage
- [ ] Cost per customer
- [ ] Conversion

## 10.16 — UX para AI Products

- [ ] Loading states
- [ ] Streaming
- [ ] Sources
- [ ] Confidence
- [ ] Uncertainty
- [ ] Feedback
- [ ] Retry
- [ ] Partial failure
- [ ] Human control

## 10.17 — Performance

- [ ] API latency
- [ ] Retrieval latency
- [ ] LLM latency
- [ ] Streaming UX
- [ ] Cache
- [ ] Background processing
- [ ] Database performance

## 10.18 — Production Security Review

- [ ] Authentication
- [ ] Authorization
- [ ] Tenant isolation
- [ ] Repository permissions
- [ ] Secrets
- [ ] Prompt injection
- [ ] Tool permissions
- [ ] Audit logs

## 10.19 — Production Evals

- [ ] Offline evals
- [ ] Online feedback
- [ ] Regression monitoring
- [ ] Quality dashboards
- [ ] Cost monitoring
- [ ] Model changes

## 10.20 — Portfolio Case Study

- [ ] Arquitetura final
- [ ] Problema resolvido
- [ ] Decisões técnicas
- [ ] RAG architecture
- [ ] MCP architecture
- [ ] Agent architecture
- [ ] LangGraph workflow
- [ ] Evals
- [ ] Fine-tuning experiment
- [ ] Observability
- [ ] DevOps
- [ ] Resultados mensuráveis

## 10.21 — README de Portfólio

- [ ] Product overview
- [ ] Screenshots
- [ ] Architecture diagram
- [ ] Tech stack
- [ ] AI engineering decisions
- [ ] Local setup
- [ ] Demo
- [ ] Trade-offs
- [ ] Roadmap

## 10.22 — Monetização e Go-to-Market

- [ ] Identificar usuário pagante
- [ ] Principal dor
- [ ] Pricing hypothesis
- [ ] Free vs paid
- [ ] Diferencial competitivo
- [ ] Early adopters
- [ ] Feedback loop
- [ ] Validar willingness to pay

---

# 11 — Projeto Final / Capstone

## 11.1 — End-to-End Change Analysis

- [ ] Receber uma issue real
- [ ] Interpretar requisito
- [ ] Buscar contexto
- [ ] Analisar arquitetura
- [ ] Identificar impacto
- [ ] Gerar plano
- [ ] Avaliar riscos
- [ ] Propor testes
- [ ] Produzir resultado com fontes

## 11.2 — End-to-End Agentic Workflow

- [ ] LangGraph orchestration
- [ ] Retrieval
- [ ] Agents
- [ ] Tools
- [ ] Human approval
- [ ] Retry
- [ ] Persistence
- [ ] Observability

## 11.3 — End-to-End PR Workflow

- [ ] Ler issue
- [ ] Analisar repository
- [ ] Acompanhar PR
- [ ] Analisar diff
- [ ] Fazer review
- [ ] Analisar CI
- [ ] Produzir summary

## 11.4 — Benchmark Final

- [ ] Basic LLM
- [ ] Prompted LLM
- [ ] Basic RAG
- [ ] Advanced RAG
- [ ] Agentic workflow
- [ ] Fine-tuned variant, se aplicável
- [ ] Qualidade
- [ ] Latência
- [ ] Custo

## 11.5 — Architecture Review Final

- [ ] Remover abstrações desnecessárias
- [ ] Identificar acoplamentos
- [ ] Rever boundaries
- [ ] Rever segurança
- [ ] Rever observabilidade
- [ ] Rever custos
- [ ] Rever reliability

## 11.6 — Release v1.0

- [ ] CI verde
- [ ] Evals verdes
- [ ] Documentação atualizada
- [ ] Demo funcional
- [ ] Production deployment
- [ ] Repository organizado
- [ ] Case study publicado
- [ ] ChangePilot v1.0
