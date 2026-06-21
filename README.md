# ARGUS PLD — Advanced Risk Governance & Unified Surveillance

**Plataforma de auditoria autônoma de PLD-FT com inteligência artificial, no padrão Big Four.**

<p align="center">
  <img src="docs/screenshots/002-dashboard-dark.png" width="720" alt="ARGUS PLD — Dashboard de Auditoria">
</p>

ARGUS é uma plataforma que conduz avaliações independentes de programas de Prevenção à Lavagem de Dinheiro e Financiamento ao Terrorismo (PLD-FT) em instituições financeiras brasileiras. Utilizando GPT-4o como auditor sênior com function calling multi-turn, o sistema analisa documentos, executa testes de efetividade, cria achados estruturados e produz relatórios profissionais — substituindo semanas de trabalho manual por uma auditoria guiada por IA que segue normas ISA e regulação BACEN.

A plataforma cobre o ciclo completo de auditoria: do planejamento (definição de escopo, materialidade e cronograma), passando pelo fieldwork (coleta e análise de evidências, walkthroughs, entrevistas), testing (amostragem estatística, testes de design e efetividade operacional), até o reporting (memos por pilar, matriz de risco, relatório executivo com exportação PDF).
---

## O Problema

Auditorias de PLD-FT em instituições financeiras no Brasil são processos complexos que envolvem **16 pilares de controle**, dezenas de normas regulatórias (Circular BACEN 3.978, Lei 9.613, CC 4.001, FATF) e centenas de procedimentos de teste. Hoje, esse trabalho é feito de forma predominantemente manual:

- **Tempo**: Uma auditoria completa de PLD-FT leva 4-8 semanas com uma equipe de 3-5 auditores seniores. Boa parte desse tempo é gasto lendo documentos, preenchendo workpapers e cruzando referências regulatórias.
- **Custo**: Big Four e consultorias especializadas cobram R$ 300k-800k por engajamento. Equipes internas raramente têm bandwidth para cobrir os 16 pilares com profundidade.
- **Consistência**: A qualidade depende da experiência individual do auditor. Critérios de avaliação variam entre profissionais, pilares ficam sub-avaliados, achados são registrados com profundidade desigual.
- **Regulação em expansão**: O BACEN e o COAF atualizam normas frequentemente. Manter o framework de testes alinhado com a regulação vigente é um desafio contínuo.
- **Rastreabilidade**: Vincular achados a evidências, evidências a procedimentos, e procedimentos a artigos regulatórios é um trabalho manual propenso a falhas que consome horas de review.

---

## Como a IA Resolve

O ARGUS coloca GPT-4o no papel de auditor sênior digital. Não é um chatbot que responde perguntas — é um agente que **executa ações concretas** na auditoria via function calling:

### O auditor IA age, não apenas conversa

O modelo opera em loop multi-turn (até 5 iterações): analisa o contexto, decide qual ação tomar, executa via function calling, recebe o resultado, raciocina sobre ele, e decide o próximo passo. São **10 tools** que mapeiam diretamente as ações de um auditor real:

| Ação do Auditor Humano | Tool da IA | O que acontece |
|------------------------|-----------|----------------|
| "Preciso da política de PLD" | `request_evidence` | Cria solicitação no PBC Tracker com status, prioridade e due date |
| "Este controle não existe" | `create_finding` | Registra achado CCCE com severidade, referências regulatórias e recomendação |
| "Pilar GOV é Amplamente Efetivo" | `rate_pillar` | Atribui rating calculado com base nos testes executados |
| "Quero testar 25 amostras de KYC" | `request_sample` | Calcula tamanho amostral com FPC e seleciona via PRNG |
| "Executar teste GOV-1.1" | `run_test_procedure` | Executa o procedimento, registra resultado e observações no workpaper |
| "Vincular documento X ao teste Y" | `link_evidence` | Cria vínculo bidirecional evidência-procedimento |
| "Gestão concorda com o achado" | `record_management_response` | Registra agreement, action plan, owner e prazo |

### Análise inteligente de documentos

O sistema lê qualquer documento (PDF, Excel, imagens) usando dois modos de OCR à escolha do auditor:

| Modo | Engine | Melhor para |
|------|--------|-------------|
| **LLM Vision** | GPT-4o Vision API | Documentos com layout complexo, tabelas, contexto semântico |
| **OCR Dedicado** | Tesseract.js (pt + en) | Volume alto, custo zero, texto limpo |

Após a extração, a IA aplica **9 templates de análise especializados** — um para cada tipo de documento de PLD (política, RAIR, ata de comitê, dossiê KYC, relatório de monitoramento, comunicações COAF, etc.) — verificando automaticamente conformidade com artigos específicos da Circular 3.978.

### Cadeia de evidências em 3 níveis

```
Nível 1 — Documental         Nível 2 — Implementação        Nível 3 — Amostragem
┌─────────────────────┐      ┌─────────────────────┐       ┌─────────────────────┐
│ Política existe?    │─pass→│ Sistema implementa? │─pass→ │ Amostra consistente?│
│ Está aprovada?      │      │ Controles operam?   │       │ Exceções na amostra?│
│ Cobre requisitos?   │      │ Prints/relatórios   │       │ Taxa de exceção     │
└────────┬────────────┘      └────────┬────────────┘       └────────┬────────────┘
         │ fail                       │ fail                        │ fail
         ▼                            ▼                             ▼
   create_finding              create_finding                create_finding
```

### Phase gates automáticos

A IA respeita a fase da auditoria — não tenta executar testes de efetividade operacional durante o fieldwork, nem criar achados durante o planning. Isso garante que o fluxo siga a metodologia ISA correta:

| Fase | O que a IA pode fazer | Testes |
|------|----------------------|--------|
| **Planning** | Solicitar evidências, entender a instituição | Nenhum |
| **Fieldwork** | Coletar evidências, walkthroughs, vincular documentos | Apenas **Design** |
| **Testing** | Amostragem, testes substantivos | **Operating Effectiveness** |
| **Reporting** | Atribuir ratings, consolidar memos | Nenhum novo |

---

## Fluxo de Uso

### 1. Login e criação de auditoria

Acesse o sistema com uma conta demo (`admin@argus.com` / `admin123`). Na home, clique "Nova Auditoria" e informe: nome, instituição, tipo (banco, corretora, IP, etc.), reguladores aplicáveis e porte.

### 2. Planning

- **Planejamento**: Defina período, materialidade, TER, nível de confiança, limitações
- **Timeline**: Configure milestones e cronograma Gantt com 8 marcos padrão
- **Chat**: A IA solicita proativamente os documentos preliminares (organograma, políticas, RAIR)

### 3. Fieldwork

- Upload de documentos → escolha do modo OCR (LLM Vision ou Tesseract) → análise automática com template especializado → vinculação a procedimentos
- IA executa testes de **Design** automaticamente ao receber evidências
- Entrevistas com 4 templates pré-definidos (Compliance Officer, Operações, TI/Sistemas, Alta Administração)
- A IA avança para Testing quando evidências suficientes foram coletadas

### 4. Testing

- Calculadora de amostras com FPC + expected error rate (ISA 530)
- Testes de **Operating Effectiveness** via amostragem estatística
- Achados auto-gerados no formato CCCE quando teste resulta em fail/partial
- Registro de management response: agreement + action plan com owner e prazo

### 5. Reporting

- Memos por pilar com score de efetividade auto-calculado
- Matriz de risco 5×5 posicionando achados por likelihood × impact
- Rastreabilidade regulatória cross-reference (artigos × pilares × testes)
- Workpaper index com status de revisão (draft → prepared → reviewed → signed off)
- Export: PDF relatório completo, CSV de achados, CSV de evidências, CSV de testes, workpaper pack

---

## Screenshots

### Dark Mode

<table>
<tr>
<td align="center"><strong>Login</strong><br><img src="docs/screenshots/001-login-dark.png" width="400"></td>
<td align="center"><strong>Dashboard</strong><br><img src="docs/screenshots/002-dashboard-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Chat — Auditor IA</strong><br><img src="docs/screenshots/003-chat-dark.png" width="400"></td>
<td align="center"><strong>Procedimentos de Teste</strong><br><img src="docs/screenshots/004-procedures-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Evidências</strong><br><img src="docs/screenshots/005-evidence-dark.png" width="400"></td>
<td align="center"><strong>Achados (CCCE)</strong><br><img src="docs/screenshots/006-findings-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Amostras</strong><br><img src="docs/screenshots/007-samples-dark.png" width="400"></td>
<td align="center"><strong>Data Analytics</strong><br><img src="docs/screenshots/008-analytics-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Entrevistas</strong><br><img src="docs/screenshots/009-interviews-dark.png" width="400"></td>
<td align="center"><strong>Memo (ISA 230)</strong><br><img src="docs/screenshots/010-memo-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>PBC Tracker</strong><br><img src="docs/screenshots/011-pbc-dark.png" width="400"></td>
<td align="center"><strong>Planejamento</strong><br><img src="docs/screenshots/012-planning-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Matriz de Risco 5×5</strong><br><img src="docs/screenshots/013-risk-matrix-dark.png" width="400"></td>
<td align="center"><strong>Timeline Gantt</strong><br><img src="docs/screenshots/014-timeline-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Matriz Regulatória</strong><br><img src="docs/screenshots/015-regulatory-dark.png" width="400"></td>
<td align="center"><strong>Workpaper Index</strong><br><img src="docs/screenshots/016-wpindex-dark.png" width="400"></td>
</tr>
</table>

### Light Mode

<table>
<tr>
<td align="center"><strong>Dashboard</strong><br><img src="docs/screenshots/017-dashboard-light.png" width="400"></td>
<td align="center"><strong>Chat — Auditor IA</strong><br><img src="docs/screenshots/018-chat-light.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Procedimentos de Teste</strong><br><img src="docs/screenshots/019-procedures-light.png" width="400"></td>
<td align="center"><strong>Evidências</strong><br><img src="docs/screenshots/020-evidence-light.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Achados (CCCE)</strong><br><img src="docs/screenshots/021-findings-light.png" width="400"></td>
<td align="center"><strong>Amostras</strong><br><img src="docs/screenshots/022-samples-light.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Data Analytics</strong><br><img src="docs/screenshots/023-analytics-light.png" width="400"></td>
<td align="center"><strong>Entrevistas</strong><br><img src="docs/screenshots/024-interviews-light.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Memo (ISA 230)</strong><br><img src="docs/screenshots/025-memo-light.png" width="400"></td>
<td align="center"><strong>PBC Tracker</strong><br><img src="docs/screenshots/026-pbc-light.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Planejamento</strong><br><img src="docs/screenshots/027-planning-light.png" width="400"></td>
<td align="center"><strong>Matriz de Risco 5×5</strong><br><img src="docs/screenshots/028-risk-matrix-light.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Timeline Gantt</strong><br><img src="docs/screenshots/029-timeline-light.png" width="400"></td>
<td align="center"><strong>Matriz Regulatória</strong><br><img src="docs/screenshots/030-regulatory-light.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Workpaper Index</strong><br><img src="docs/screenshots/031-wpindex-light.png" width="400"></td>
<td align="center"><strong>Login</strong><br><img src="docs/screenshots/032-login-light.png" width="400"></td>
</tr>
</table>

### Detalhes e Recursos Adicionais

<table>
<tr>
<td align="center"><strong>Achado CCCE Expandido</strong><br><img src="docs/screenshots/033-finding-detail-dark.png" width="400"></td>
<td align="center"><strong>Busca Global (Cmd+K)</strong><br><img src="docs/screenshots/034-global-search-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>KYC — Achados (Crítico)</strong><br><img src="docs/screenshots/035-kyc-findings-dark.png" width="400"></td>
<td align="center"><strong>MON — Testes (Design/Operacional)</strong><br><img src="docs/screenshots/036-mon-tests-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Home — Dashboard de Auditorias</strong><br><img src="docs/screenshots/037-home-dashboard-dark.png" width="400"></td>
<td align="center"><strong>Nova Auditoria — Modal</strong><br><img src="docs/screenshots/038-new-audit-modal-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Evidências — OCR Toggle (Vision/Dedicado)</strong><br><img src="docs/screenshots/039-evidence-ocr-toggle-dark.png" width="400"></td>
<td align="center"><strong>Entrevista — Detalhe Expandido</strong><br><img src="docs/screenshots/040-interview-detail-dark.png" width="400"></td>
</tr>
<tr>
<td align="center"><strong>Painel de Exportação</strong><br><img src="docs/screenshots/041-export-panel-dark.png" width="400"></td>
<td></td>
</tr>
</table>

---

## Framework de Auditoria PLD-FT

### 16 Pilares | 40+ Sub-áreas | 101 Procedimentos de Teste

O ARGUS implementa um framework completo de auditoria PLD-FT com **101 procedimentos de teste** classificados por tipo de efetividade:
- **54 testes de Design** — Verificam se controles/políticas existem e estão adequadamente desenhados
- **50 testes de Operating Effectiveness** — Verificam se controles funcionam na prática via amostragem
- Badges visuais: `DESIGN` (indigo) | `OPERACIONAL` (amber) | `AMBOS` (purple)

| # | Código | Pilar | Peso | Sub-áreas | Procedimentos |
|---|--------|-------|------|-----------|---------------|
| 1 | GOV | Governança e Estrutura de PLD/FT | 10% | 4 | 12 |
| 2 | AIR | Avaliação Interna de Riscos (AIR/RAIR) | 10% | 2 | 7 |
| 3 | KYC | Cadastro, KYC e Beneficiário Final | 10% | 4 | 10 |
| 4 | CRC | Classificação de Risco de Clientes | 8% | 2 | 6 |
| 5 | PEP | Pessoas Politicamente Expostas | 6% | 2 | 3 |
| 6 | MON | Monitoramento Transacional | 10% | 4 | 9 |
| 7 | ALT | Gestão de Alertas e Investigações | 10% | 2 | 9 |
| 8 | COM | Comunicação ao COAF | 8% | 3 | 6 |
| 9 | TRE | Treinamento, Capacitação e Cultura | 5% | 3 | 5 |
| 10 | KYE | Conheça Seu Colaborador | 4% | 2 | 5 |
| 11 | KYP | KYP e Gestão de Parceiros | 6% | 3 | 7 |
| 12 | SAN | Sanções e Listas Restritivas | 5% | 3 | 6 |
| 13 | SDA | Sistemas, Dados e Data Analytics | 5% | 2 | 5 |
| 14 | ADQ | Adequação ao Modelo de Negócio | 5% | 2 | 5 |
| 15 | CTR | Controles Internos, MRC e Efetividade | 7% | 3 | 10 |
| 16 | REG | Registros e Manutenção | 3% | 2 | 3 |

### Sub-áreas adicionadas (regulação específica)

| Sub-área | Pilar | Cobertura Regulatória | Procedimentos |
|----------|-------|----------------------|---------------|
| KYC-4 | KYC | Art. 18-20 Circular 3.978 — Identificação não presencial, CDD simplificada | 3 (1D + 2O) |
| MON-4 | MON | CC 4.001/2020 — Matriz de tipologias por cenário de monitoramento | 2 (1D + 1O) |
| SAN-3 | SAN | Lei 13.810/2019 + FATF Rec. 6 — Financiamento ao terrorismo e proliferação | 3 (3D) |
| REG-2 | REG | Art. 39 Circular 3.978 — Confidencialidade e proteção do reportante | 2 (2D) |

### Marco Regulatório

O framework referencia e valida conformidade com 9 marcos regulatórios:

| Regulação | Escopo | Artigos-chave Mapeados |
|-----------|--------|----------------------|
| **Circular BACEN nº 3.978/2020** | Política, procedimentos e controles de PLD-FT | Art. 2-39 (todos mapeados) |
| **Carta Circular BACEN nº 4.001/2020** | Tipologias e sinais de alerta | Anexo completo (tipologia por tipologia) |
| **Lei nº 9.613/1998** | Lei de Lavagem de Dinheiro | Art. 10 (registros), Art. 11 (comunicações) |
| **Lei nº 13.810/2019** | Indisponibilidade de bens — terrorismo/proliferação | Art. 5-6 (cumprimento imediato) |
| **Resolução CVM nº 50/2021** | PLD para mercado de valores mobiliários | Integração cross-reference |
| **Resolução BCB nº 44/2020** | Avaliação interna de risco | Complementar ao Art. 10 |
| **Resolução BCB nº 343/2023** | Terceiros e correspondentes | KYP + cláusulas contratuais |
| **Normativas COAF** | Regulamentação de inteligência financeira | Comunicações COS/automáticas |
| **40 Recomendações GAFI/FATF** | Padrão internacional PLD-FT | Rec. 1, 6, 7, 10, 11, 12, 17, 18, 20 |

---

## Motor de IA — Detalhes Técnicos

### 10 Function Calling Tools — Multi-Turn (até 5 iterações)

O auditor IA opera via OpenAI function calling com streaming SSE e **loop multi-turn**: o modelo pode chamar múltiplas tools em sequência, receber os resultados, raciocinar sobre eles, e chamar mais tools ou gerar uma resposta final.

| Tool | Descrição | Ação no Store |
|------|-----------|--------------|
| `request_evidence` | Solicitar documento à instituição | `addEvidence()` — status: requested |
| `create_finding` | Registrar achado CCCE | `addFinding()` — com severity + regulatory refs |
| `rate_pillar` | Atribuir rating de efetividade | `updatePillarRating()` |
| `request_sample` | Solicitar seleção de amostra | `addSample()` — com método e tamanho |
| `run_test_procedure` | Executar e registrar teste | `updateTestResult()` + `updateTestWorkpaper()` |
| `link_evidence` | Vincular evidência a procedimento | `linkEvidenceToTest()` — bidirecional |
| `update_sub_area_rating` | Avaliar sub-área | `updateSubAreaRating()` |
| `update_evidence_status` | Aceitar/rejeitar/esclarecer evidência | `updateEvidenceStatus()` — accept/reject/clarify |
| `update_audit_phase` | Avançar fase da auditoria | `updateAuditPhase()` — com phase gate |
| `record_management_response` | Registrar resposta da gestão | `updateFinding()` + `updateFindingActionPlan()` |

### 9 Critérios Especializados de Análise Documental

A API `/api/analyze` aplica prompts especializados baseados no tipo de documento:

| Tipo de Documento | Critérios Aplicados | Artigos Verificados |
|------------------|--------------------|--------------------|
| Avaliação de Efetividade | 8 dimensões (escopo, metodologia, testes, resultados, planos, governança, conformidade, red flags) | Art. 7-9 Circ. 3.978 |
| RAIR / Risk Assessment | Fatores de risco, metodologia, abrangência, aprovação | Art. 10-15 Circ. 3.978 |
| Política de PLD-FT | Checklist Art. 2º incisos I-VII, aprovação, divulgação | Art. 2, 5 Circ. 3.978 |
| Atas de Comitê | Composição, quórum, deliberações, indicadores | Melhores práticas GAFI |
| Treinamento | Conteúdo, público, metodologia, taxa de conclusão | Art. 6 Circ. 3.978 |
| Monitoramento/Alertas | Tipologias CC 4.001, parâmetros, calibração, SLAs | Art. 29-33 Circ. 3.978 |
| Comunicações COAF/SISCOAF | Qualidade narrativa, tempestividade 24h, reconciliação, não-comunicações | Art. 34-37, Lei 9.613 Art. 11 |
| Dossiê KYC/Cadastro | Completude, verificação, beneficiário final, EDD, risco | Art. 16-28 Circ. 3.978 |
| Relatório de Auditoria Interna | Competência, objetividade, escopo, ISA 610 reliance | ISA 610, Art. 8 Circ. 3.978 |

---

## Data Analytics Engine

### 11 Regras Automatizadas de PLD

Cada regra possui `columnHints` para matching fuzzy e `evaluator` para detecção. O mapeamento de colunas do dataset é feito via GPT-4o-mini com 22 campos mapeáveis.

| # | Regra | Severidade | Lógica de Detecção |
|---|-------|------------|-------------------|
| 1 | Classificação de Risco Zerada | Critical | `risk_column ∈ {'', '0', 'null', 'n/a'}` |
| 2 | Screening Desatualizado | High | `screening_date > 12 meses` ou vazio |
| 3 | KYC Incompleto | High | `≥1 campo obrigatório vazio` em 4 colunas KYC |
| 4 | Gaps de Treinamento PLD | Medium | `status ∈ {'não', 'pendente'}` ou `date > 12m` |
| 5 | Monitoramento Inativo | High | `last_monitoring > 6 meses` |
| 6 | PEP sem EDD | Critical | `PEP = sim AND EDD ∈ {'não', '', '-'}` |
| 7 | Penetração de Sanções | Critical | `sanctions_hit = sim AND blocked ≠ sim` |
| 8 | Tempestividade COAF | High | `report_date - detection_date > 24h` |
| 9 | Inconsistência Risk Scoring | High | `(PEP OR alto_risco) AND score ≤ 30` |
| 10 | Back-testing de Alertas | Critical | `suspicious = sim AND alert_generated ≠ sim` |
| 11 | Alto Risco sem Revisão | High | `risk = alto AND last_review > 12m` |

---

## Amostragem Estatística

### Fórmula com Correção de População Finita (FPC)

```
TER_adj = TER - expected_error_rate
raw     = ⌈ ln(1 - confidence) / ln(1 - TER_adj) ⌉
n       = ⌈ raw / (1 + (raw - 1) / N) ⌉
n_final = min(n, N)
```

| Parâmetro | Descrição | Valores Suportados |
|-----------|-----------|-------------------|
| Confidence | Nível de confiança | 90%, 95%, 99% |
| TER | Tolerable Error Rate | 1-10% |
| Expected Error Rate | Taxa de erro esperada | 0-TER (ajuste pré-cálculo) |
| N | Tamanho da população | 1 a ∞ |
| FPC | Finite Population Correction | Aplicada automaticamente |

**Métodos de seleção**: Random (seed-based PRNG), Estratificada, Julgamental, MUS (Monetary Unit Sampling)

---

## Achados de Auditoria

### Estrutura CCCE + Gestão de Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `title` | string | Título descritivo do achado |
| `severity` | enum | `critical` \| `high` \| `medium` \| `low` |
| `condition` | string | O que foi encontrado (fato) |
| `criteria` | string | O que deveria ser (base regulatória) |
| `cause` | string | Por que ocorre a deficiência |
| `effect` | string | Impacto/risco para a instituição |
| `recommendation` | string | Recomendação de melhoria |
| `managementAgreement` | enum | `agree` \| `partially_agree` \| `disagree` |
| `managementResponse` | string | Texto da resposta da administração |
| `rootCauseCategory` | enum | `people` \| `process` \| `technology` \| `governance` |
| `actionPlan` | object | `{ owner, targetDate, status, description }` |
| `remediationValidated` | boolean | Re-teste de remediação realizado |
| `repeatFindingId` | string? | Link para achado anterior (reincidência) |
| `regulatoryReference` | string[] | Artigos/circulares aplicáveis |

### Workflow de Status

```
Draft → Confirmed → Management Response → Closed
                         │
                         ├── agree → action plan → remediation validation
                         ├── partially_agree → action plan ajustado
                         └── disagree → escalação / reavaliação
```

---

## Score Automático de Efetividade

### Algoritmo de Scoring

```typescript
// Por sub-área: score baseado em resultados de teste
score = (pass × 100 + partial × 50) / total_testados  // 0-100

// Por pilar: média das sub-áreas avaliadas
pillar_score = avg(sub_area_scores)

// Overall: média ponderada pelo peso de cada pilar
overall = Σ(pillar_score × weight) / Σ(weights)
```

| Score | Rating | Descrição |
|-------|--------|-----------|
| ≥ 85 | **Efetivo** | Atende integralmente requisitos e melhores práticas |
| ≥ 65 | **Amplamente Efetivo** | Atende maioria, melhorias pontuais necessárias |
| ≥ 40 | **Parcialmente Efetivo** | Deficiências significativas identificadas |
| < 40 | **Inefetivo** | Não atende requisitos mínimos regulatórios |

---

## Arquitetura

<p align="center">
  <img src="docs/screenshots/argus-architecture.png" width="800" alt="ARGUS PLD — Arquitetura">
</p>

### Stack Tecnológico

| Camada | Tecnologia | Versão | Uso |
|--------|-----------|--------|-----|
| Runtime | **Next.js 14** (App Router) | ^14.2 | SSR, API Routes, RSC, Middleware |
| Linguagem | **TypeScript** | ^5.5 | Type safety end-to-end (30+ interfaces) |
| Styling | **Tailwind CSS** + CSS Variables | ^3.4 | Design system light/dark com 50+ variáveis |
| State | **Zustand** + persist middleware | ^4.5 | Estado global com localStorage (35+ actions) |
| Auth | **NextAuth.js** | ^4.24 | Credentials provider, JWT, 5 roles, middleware |
| Database | **Prisma** + SQLite | ^7.8 | 16 modelos, enums, indexes (schema ready) |
| Validation | **Zod** | ^3.25 | Schema validation em todas as API routes |
| LLM | **OpenAI GPT-4o** | ^4.50 | Chat (SSE), Vision, function calling multi-turn |
| OCR | **Tesseract.js** | ^7.0 | OCR dedicado (português + inglês) |
| Embeddings | **OpenAI text-embedding-3-small** | — | RAG: indexação + busca semântica |
| PDF Parsing | **pdf-parse** | ^2.4 | Extração de texto de PDFs |
| Spreadsheets | **xlsx** + **papaparse** | ^0.18 / ^5.5 | Parsing de planilhas Excel e CSV |
| Visualização | **Recharts** | ^2.12 | 6 tipos de gráfico no dashboard |
| Export PDF | **jsPDF** + **jspdf-autotable** | ^4.2 / ^5.0 | Relatório PDF profissional com capa, TOC, tabelas |
| Screenshots | **html2canvas** | ^1.4 | Captura de componentes para export |
| Markdown | **react-markdown** + **remark-gfm** | ^9.0 / ^4.0 | Renderização de respostas IA |
| Upload | **react-dropzone** | ^14.2 | Drag & drop com validação de tipo |
| Datas | **date-fns** | ^3.6 | Formatação e cálculos de datas |
| Animações | **framer-motion** | ^11.2 | Transições e animações de UI |
| IDs | **uuid** | ^9.0 | Geração de identificadores únicos |
| Icons | **Lucide React** + SVGs | ^0.400 | 30+ ícones + Moon/Sun customizados |
| Testes | **Jest** + **Testing Library** | ^30.4 / ^16.3 | 20 testes unitários (utils, rate-limit, audit-log) |
| CI/CD | **GitHub Actions** | — | Lint + typecheck, testes + coverage, build |

---

## Infraestrutura de Produção

### Autenticação e Autorização (NextAuth.js)

| Role | Hierarquia | Permissões |
|------|-----------|------------|
| **ADMIN** | 5 (máximo) | Tudo: criar/editar/excluir auditorias, gerenciar usuários |
| **SENIOR_AUDITOR** | 4 | Criar auditorias, criar achados, atribuir ratings, exportar |
| **AUDITOR** | 3 | Editar auditorias, criar achados, executar testes |
| **REVIEWER** | 2 | Visualizar + exportar, sem edição |
| **READONLY** | 1 (mínimo) | Somente visualização |

**Contas demo**: `admin@argus.com` / admin123 | `auditor@argus.com` / auditor123 | `reviewer@argus.com` / reviewer123

### Banco de Dados (Prisma + SQLite)

Schema com 16 modelos prontos para migração:

```
User, Audit, Pillar, SubArea, TestProcedure, Evidence, Finding, Sample,
ChatMessage, AuditConversation, Interview, AuditMilestone, PillarMemo,
RiskMatrixItem, ImportedDataset, AuditLog
```

Enums: `UserRole`, `AuditPhase`, `Rating`, `Severity`, `TestResult`, `EvidenceStatus`, `FindingStatus`, `SampleStatus`, `SampleMethod`, `MilestoneStatus`, `MemoStatus`

### Validação de Dados (Zod)

Todas as 10 API routes validam payloads com Zod schemas + helper `validateBody()`:

```typescript
const validation = validateBody(chatRequestSchema, body)
if ('error' in validation) {
  return NextResponse.json({ error: validation.error }, { status: 400 })
}
```

### Rate Limiting + Retry

- **Token bucket** in-memory por endpoint/IP
- **Exponential backoff** com jitter para chamadas OpenAI (429, 5xx)
- Respeita `retry-after` header da OpenAI
- Máximo 3 retries com delay progressivo

### Audit Log (Event Sourcing Lite)

30+ tipos de ação rastreáveis: `audit.create`, `finding.create`, `test.execute`, `pillar.rate`, `evidence.upload`, etc.

```typescript
logAuditEvent({
  action: 'finding.create',
  auditId: 'audit-1',
  entityType: 'finding',
  entityId: 'f-123',
  details: { severity: 'high', pillar: 'GOV' },
  userName: 'auditor@argus.com',
})
```

Filtros por audit/user/action/data + export CSV.

### File Storage Abstraction

Interface `StorageProvider` com duas implementações:

| Provider | Config | Uso |
|----------|--------|-----|
| **Local** (default) | Sem configuração | Desenvolvimento, `uploads/` no filesystem |
| **S3** | `STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION` | Produção (requer `@aws-sdk/client-s3`) |

### RAG / Busca Semântica

- Modelo: `text-embedding-3-small`
- Chunking automático por parágrafos
- Indexação por documento com metadata (audit, pillar, entity type)
- Busca por cosine similarity com score mínimo configurável
- Filtros por `auditId`, `entityType`, `topK`

### Internacionalização (i18n)

Infraestrutura pronta com dicionários pt-BR e EN (~100 keys cada):

```typescript
const { t, locale, setLocale } = useTranslation()
t('evidence.status.requested') // → "Solicitada" ou "Requested"
```

---

## Módulos Complementares

### Conclusão por Pilar (Memo) — ISA 230

- Auto-geração a partir de dados reais (testes, evidências, achados)
- 6 seções: Escopo Testado, Resumo de Evidências, Resumo de Testes, Resumo de Achados, Justificativa do Rating, Conclusão
- **Preparer / Reviewer** (ISA 230): Nome do auditor preparador e revisor com timestamps
- Status: Draft → Reviewed → Final
- Campos ISA: Scope Limitations, Unresolved Matters, ISA 610 Reliance

### PBC Tracker (Cross-pillar)

- Dashboard consolidado de todas as pendências de evidência
- Due date editável, prioridade (alta/média/baixa), aging (dias desde solicitação)
- Indicador de vencimento, filtros por pilar/status/prioridade, ordenação multi-campo

### Matriz de Risco 5×5

- Grid Likelihood (1-5) × Impact (1-5) com cores automáticas
- Click-to-place: selecione achado → clique na célula
- Sumário: distribuição por nível de risco (baixo/moderado/alto/muito alto/extremo)

### Timeline Gantt

- Barras de fase: Planning → Fieldwork → Testing → Reporting
- Milestones CRUD com auto-população de 8 defaults
- Marcador "Hoje" (linha vermelha tracejada)

### Matriz Regulatória

- Grid Regulamentação × Pilares, auto-gerado via `buildRegulatoryMappings()`
- Células coloridas por compliance: verde/amarelo/vermelho/cinza
- Click → painel de detalhes com procedimentos vinculados

### Entrevistas / Walkthroughs

- 4 templates: Compliance Officer, Operações, TI/Sistemas, Alta Administração
- Q&A estruturado com follow-up, resumo auto-gerado, conclusões

### Workpaper Index

- Referências: `WP-{PILAR}-{SA}-T{N}` (testes), `WP-{PILAR}-F{N}` (achados), `WP-{PILAR}-MEMO`, `WP-{PILAR}-INT{N}`, `WP-{PILAR}-S{N}`
- Edição inline: status (draft/prepared/reviewed/signed_off), prepared by, reviewed by
- Cross-references entre workpapers

### Export Profissional

| Formato | Conteúdo |
|---------|----------|
| PDF Relatório | Capa ARGUS, TOC, sumário executivo, metodologia, avaliação por pilar, achados CCCE, matriz de risco |
| CSV Achados | 15+ colunas (ID, Pilar, Severidade, CCCE, Agreement, Action Plan, Regulatory Refs) |
| CSV Evidências | Status tracker completo com análise IA |
| CSV Testes | Procedimentos com resultado, tipo (D/O), observações, data |
| Workpaper Pack | Índice estruturado + CSV |

---

## Estrutura de Arquivos

```
prisma/
│   └── schema.prisma                        # 16 modelos, 11 enums, indexes
│
.github/
│   └── workflows/ci.yml                     # CI: lint, typecheck, testes, build
│
src/                                          # ~15.800 linhas TypeScript/TSX
├── app/
│   ├── page.tsx                              # Home — CRUD de auditorias
│   ├── layout.tsx                            # Root layout + AuthProvider + ThemeProvider
│   ├── globals.css                           # Design system (50+ CSS vars, light/dark)
│   ├── login/
│   │   └── page.tsx                          # Tela de login com demo accounts
│   ├── audit/[id]/
│   │   └── page.tsx                          # Workspace (14 tabs, sidebar, header, overview)
│   └── api/
│       ├── auth/[...nextauth]/route.ts       # NextAuth handler (credentials + JWT)
│       ├── chat/route.ts                     # SSE stream + 10 tools + multi-turn (5x)
│       ├── analyze/route.ts                  # Análise documental + Vision + 9 templates
│       ├── upload/route.ts                   # Multipart upload + OCR mode toggle
│       ├── ocr/route.ts                      # OCR dedicado via Tesseract.js
│       ├── test-procedure/route.ts           # Teste automatizado com checklist
│       ├── data-analytics/route.ts           # 11 regras PLD + mapeamento GPT-4o-mini
│       ├── report/route.ts                   # Relatório executivo via GPT-4o
│       ├── import/route.ts                   # Import de datasets
│       └── files/[...path]/route.ts          # Static file serving
│
├── components/                               # 24 componentes React
│   ├── ChatPanel.tsx                         # Chat auditor: SSE, function calls, quick actions
│   ├── EvidencePanel.tsx                     # Evidências: upload, análise, OCR toggle
│   ├── FindingsPanel.tsx                     # Achados: CCCE, agreement, root cause, remediation
│   ├── ProceduresPanel.tsx                   # Testes: D/O badges, execução IA, workpapers
│   ├── SamplesPanel.tsx                      # Amostragem: FPC, expected error, PRNG, MUS
│   ├── InterviewsPanel.tsx                   # Entrevistas: templates, Q&A, conclusões
│   ├── PillarMemoPanel.tsx                   # Memo: auto-gen, preparer/reviewer, ISA 230
│   ├── RiskMatrixPanel.tsx                   # Risco: grid 5×5, click-to-place, sumário
│   ├── AuditTimeline.tsx                     # Timeline: Gantt, milestones, "today" marker
│   ├── RegulatoryMatrix.tsx                  # Regulatória: FATF×BACEN, compliance cells
│   ├── WorkpaperIndex.tsx                    # WP Index: cross-refs, inline edit, status
│   ├── ExportPanel.tsx                       # Export: PDF, 3 CSVs, WP pack
│   ├── PBCTracker.tsx                        # PBC: cross-pillar, aging, due dates
│   ├── PlanningPanel.tsx                     # Planning: período, materialidade, TER, priors
│   ├── DataImport.tsx                        # Import: datasets CSV/Excel + analytics
│   ├── PillarSidebar.tsx                     # Sidebar: 16 pilares com progress + rating
│   ├── AuditCharts.tsx                       # Dashboard: 6 gráficos Recharts
│   ├── ReportExport.tsx                      # Export PDF do relatório (header button)
│   ├── GlobalSearch.tsx                      # Busca global (Cmd+K / Ctrl+K)
│   ├── NewAuditModal.tsx                     # Modal de criação de auditoria
│   ├── ThemeProvider.tsx                     # React Context para light/dark theme
│   ├── AuthProvider.tsx                      # NextAuth SessionProvider wrapper
│   ├── Toast.tsx                             # Sistema de notificações toast
│   └── Icons.tsx                             # Lucide re-exports + Moon/Sun customizados
│
├── lib/
│   ├── types.ts                              # 30+ interfaces TypeScript
│   ├── store.ts                              # Zustand store: 35+ actions, persist middleware
│   ├── audit-framework.ts                    # 16 pilares, 40+ sub-áreas, 101 procedimentos
│   ├── prompts.ts                            # System prompt proativo + phase gates + report
│   ├── utils.ts                              # Scoring (3 funções), ratings, regulatory mappings
│   ├── auth.ts                               # NextAuth config: credentials, JWT, roles
│   ├── auth-helpers.ts                       # requireAuth(), canPerformAction(), role hierarchy
│   ├── schemas.ts                            # Zod schemas para todas as API routes
│   ├── db.ts                                 # Prisma client singleton
│   ├── storage.ts                            # StorageProvider: Local + S3
│   ├── rate-limit.ts                         # Token bucket rate limiter
│   ├── openai-client.ts                      # OpenAI singleton + retry com backoff
│   ├── audit-log.ts                          # Event sourcing lite (30+ action types)
│   └── embeddings.ts                         # RAG: chunking, indexação, busca semântica
│
├── i18n/
│   ├── index.ts                              # useTranslation() hook + I18nContext
│   ├── pt-BR.ts                              # Dicionário português (~100 keys)
│   └── en.ts                                 # Dicionário inglês (~100 keys)
│
├── middleware.ts                              # Proteção de rotas (NextAuth JWT)
│
├── __tests__/
│   ├── utils.test.ts                         # Testes unitários: cn, severity, rating, dates
│   ├── rate-limit.test.ts                    # Testes: token bucket, limites, independência
│   └── audit-log.test.ts                     # Testes: log, filtros, clear, export CSV
│
└── generated/
    └── prisma/                               # Prisma Client gerado (auto)
```

---

## Setup

### Pré-requisitos

- Node.js 18+
- Chave de API da OpenAI (GPT-4o access required)

### Instalação

```bash
git clone <repo-url>
cd argus-pld
npm install
cp .env.example .env.local
```

Edite `.env.local`:

```env
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=sua-chave-secreta-aqui
NEXTAUTH_URL=http://localhost:3000
```

### Inicializar banco de dados (opcional)

```bash
npx prisma db push
npx prisma generate
```

### Executar

```bash
npm run dev
```

Acesse: **http://localhost:3000** → Login com `admin@argus.com` / `admin123`

### Build de produção

```bash
npm run build && npm start
```

### Testes

```bash
npm test                  # Rodar testes
npm run test:coverage     # Com cobertura
npm run typecheck         # Type check
```

---

## Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `next dev` | Servidor de desenvolvimento |
| `build` | `next build` | Build de produção |
| `start` | `next start` | Servidor de produção |
| `lint` | `next lint` | Linting ESLint |
| `test` | `jest` | Testes unitários |
| `test:watch` | `jest --watch` | Testes em modo watch |
| `test:coverage` | `jest --coverage` | Testes com cobertura |
| `typecheck` | `tsc --noEmit` | Verificação de tipos |
| `db:generate` | `prisma generate` | Gerar Prisma Client |
| `db:push` | `prisma db push` | Sincronizar schema com DB |
| `db:studio` | `prisma studio` | Interface visual do banco |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | Sim | Chave da API OpenAI (requer acesso a GPT-4o e GPT-4o-mini) |
| `NEXTAUTH_SECRET` | Sim | Chave secreta para JWT (gere com `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Sim | URL base da aplicação (ex: `http://localhost:3000`) |
| `DATABASE_URL` | Não | URL do banco SQLite (default: `file:./prisma/dev.db`) |
| `STORAGE_PROVIDER` | Não | `local` (default) ou `s3` |
| `S3_BUCKET` | Não | Nome do bucket S3 (se STORAGE_PROVIDER=s3) |
| `S3_REGION` | Não | Região AWS (default: us-east-1) |

---

## Referências Técnicas

| Norma | Aplicação no ARGUS |
|-------|-------------------|
| **ISA 230** | Working papers: preparer/reviewer, status de revisão |
| **ISA 330** | Testes de Design vs. Operating Effectiveness |
| **ISA 500** | Amostragem estatística com FPC |
| **ISA 530** | Projeção de exceções na amostra |
| **ISA 610** | Confiança no trabalho de auditoria interna |
| **ISQM 1** | Controle de qualidade: review workflow |
| **COSO** | Condição-Critério-Causa-Efeito em achados |

---

## Licença

Projeto proprietário. Todos os direitos reservados.
