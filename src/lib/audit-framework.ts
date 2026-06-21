import { Pillar } from './types'

// ============================================================
// ARGUS PLD - Framework Completo de Auditoria PLD-FT
// Base: Circular BACEN 3978/2020, Carta Circular 4001/2020,
//       Resolução CVM 50/2021, Recomendações GAFI/FATF
// 16 Pilares | 100+ Procedimentos de Teste
// ============================================================

export const REGULATORY_FRAMEWORK = {
  bacen_3978: 'Circular BACEN nº 3.978/2020',
  bacen_4001: 'Carta Circular BACEN nº 4.001/2020',
  lei_9613: 'Lei nº 9.613/1998 (Lei de Lavagem de Dinheiro)',
  lei_13810: 'Lei nº 13.810/2019 (Indisponibilidade de Bens - Terrorismo)',
  cvm_50: 'Resolução CVM nº 50/2021',
  coaf_normativas: 'Normativas COAF',
  fatf_40: 'Recomendações GAFI/FATF (40 Recomendações)',
  bacen_res_44: 'Resolução BCB nº 44/2020',
  bacen_res_343: 'Resolução BCB nº 343/2023',
}

const T = (id: string, code: string, desc: string, meth: string, reg: string[], sampleSize?: string, testType?: 'design' | 'operating' | 'both') => ({
  id, code, description: desc, methodology: meth, regulatoryBasis: reg,
  result: 'not_tested' as const, observations: '', evidenceIds: [], sampleIds: [],
  testType: testType || 'design',
  ...(sampleSize ? { sampleSize } : {}),
})

export function createDefaultPillars(): Pillar[] {
  return [
    // ========================================================
    // PILAR 1 - GOVERNANÇA E ESTRUTURA DE PLD/FT
    // ========================================================
    {
      id: 'pillar-1', number: 1, code: 'GOV',
      name: 'Governança e Estrutura de PLD/FT',
      description: 'Avaliação da estrutura de governança PLD-FT, incluindo tone from the top, estrutura organizacional, comitê de PLD, papel e independência do Compliance Officer, política corporativa e cultura de conformidade.',
      icon: 'Shield',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 2º a 5º',
        'FATF Rec. 18 (Internal Controls)',
      ],
      weight: 10, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'gov-1', code: 'GOV-1', name: 'Estrutura Organizacional PLD-FT',
          description: 'Estrutura dedicada, reporte, independência funcional, segregação de funções, nomeação do diretor responsável.',
          regulatoryBasis: ['Art. 4º Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Falta de independência', 'Acúmulo de funções', 'Recursos insuficientes'],
          testProcedures: [
            T('gov-1-t1', 'GOV-1.1', 'Verificar existência de área/departamento dedicado de PLD-FT com estrutura adequada ao porte.', 'Inspeção documental + entrevista com CO', ['Art. 4º Circular 3.978/2020'], undefined, 'design'),
            T('gov-1-t2', 'GOV-1.2', 'Avaliar a independência funcional da área de PLD-FT e linhas de reporte direto à alta administração.', 'Análise do organograma atualizado + atas de reporte', ['Art. 4º Circular 3.978/2020', 'FATF Rec. 18'], undefined, 'design'),
            T('gov-1-t3', 'GOV-1.3', 'Verificar designação formal do diretor responsável pelo cumprimento das obrigações de PLD-FT conforme UNICAD.', 'Inspeção de ato de nomeação e comunicação ao regulador', ['Art. 4º Circular 3.978/2020'], undefined, 'design'),
            T('gov-1-t4', 'GOV-1.4', 'Analisar organograma atualizado da área de PLD/FT, verificando dimensionamento e qualificação da equipe.', 'Inspeção do organograma + perfis profissionais', ['Art. 4º Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'gov-2', code: 'GOV-2', name: 'Política Corporativa de PLD-FT',
          description: 'Existência, abrangência, aprovação pela Alta Administração, divulgação e atualização da política de PLD-FT.',
          regulatoryBasis: ['Art. 2º e 5º Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Política desatualizada', 'Não aprovada pela diretoria', 'Não abrange todos os requisitos'],
          testProcedures: [
            T('gov-2-t1', 'GOV-2.1', 'Verificar existência de política formal de PLD-FT vigente e versão anterior, com ata de aprovação pela Alta Administração.', 'Inspeção: política vigente + anterior + ata de aprovação', ['Art. 2º e 5º Circular 3.978/2020'], undefined, 'design'),
            T('gov-2-t2', 'GOV-2.2', 'Avaliar se a política contempla todos os elementos mínimos exigidos: KYC, monitoramento, comunicação ao COAF, treinamento, avaliação de efetividade.', 'Gap analysis contra checklist Art. 2º, incisos I a VII', ['Art. 2º Circular 3.978/2020'], undefined, 'design'),
            T('gov-2-t3', 'GOV-2.3', 'Verificar se o programa de PLD-FT abrange todas as unidades de negócio, produtos, canais de distribuição e geografias da instituição (Art. 3º).', 'Gap analysis: inventário de negócios vs. abrangência do programa PLD', ['Art. 3º Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'gov-3', code: 'GOV-3', name: 'Comitê de PLD-FT e Alta Administração',
          description: 'Funcionamento do comitê de PLD, composição, periodicidade, deliberações e envolvimento da Alta Administração.',
          regulatoryBasis: ['Art. 2º Circular 3.978/2020', 'Melhores práticas GAFI'],
          rating: 'not_assessed',
          keyRisks: ['Comitê não funcional', 'Falta de envolvimento da Alta Admin', 'Ausência de deliberações efetivas'],
          testProcedures: [
            T('gov-3-t1', 'GOV-3.1', 'Verificar existência, composição e regimento do Comitê de PLD-FT, incluindo detalhamento de responsabilidades.', 'Inspeção do regimento interno + composição', ['Melhores práticas GAFI'], undefined, 'design'),
            T('gov-3-t2', 'GOV-3.2', 'Avaliar atas de reunião do Comitê de PLD-FT verificando periodicidade, quórum, deliberações e acompanhamento de ações.', 'Amostragem 100% das atas do período auditado', ['Melhores práticas GAFI'], '100% das atas (últimos 12-24 meses)', 'operating'),
            T('gov-3-t3', 'GOV-3.3', 'Analisar atas de reuniões da Alta Administração que tratem de PLD/FT nos últimos 12-24 meses.', 'Inspeção de atas do Conselho/Diretoria com pauta de PLD', ['Art. 5º Circular 3.978/2020'], 'Todas as atas com pauta PLD (12-24 meses)', 'operating'),
          ],
        },
        {
          id: 'gov-4', code: 'GOV-4', name: 'Mapeamento de Processos e Inventário',
          description: 'Mapeamento dos processos de PLD-FT, inventário de sistemas e fluxos operacionais.',
          regulatoryBasis: ['Melhores práticas', 'FATF Rec. 18'],
          rating: 'not_assessed',
          keyRisks: ['Processos não mapeados', 'Fluxo operacional desconhecido', 'Gaps de controle em processos'],
          testProcedures: [
            T('gov-4-t1', 'GOV-4.1', 'Obter mapeamento dos processos de PLD-FT, quando existir, verificando abrangência (onboarding, monitoramento, alertas, COAF, screening).', 'Inspeção do mapeamento de processos + fluxogramas', ['Melhores práticas'], undefined, 'design'),
            T('gov-4-t2', 'GOV-4.2', 'Obter lista de sistemas, aplicações e diretórios relacionados com os processos de PLD-FT.', 'Cross-reference inventário de sistemas vs. processos mapeados', ['Melhores práticas'], undefined, 'design'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 2 - AVALIAÇÃO INTERNA DE RISCOS (AIR)
    // ========================================================
    {
      id: 'pillar-2', number: 2, code: 'AIR',
      name: 'Avaliação Interna de Riscos (AIR)',
      description: 'Avaliação da metodologia, abrangência e qualidade da Avaliação Interna de Risco de LD-FT (RAIR), incluindo riscos inerentes, controles mitigadores, risco residual e aprovação pela Alta Administração.',
      icon: 'BarChart3',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 10 a 15',
        'FATF Rec. 1 (Risk-Based Approach)',
      ],
      weight: 10, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'air-1', code: 'AIR-1', name: 'RAIR e Metodologia',
          description: 'Relatório de Avaliação Interna de Riscos vigente e metodologia de classificação de risco.',
          regulatoryBasis: ['Art. 10 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Metodologia inadequada', 'Não contempla todos os fatores', 'Falta de fundamentação técnica'],
          testProcedures: [
            T('air-1-t1', 'AIR-1.1', 'Obter e analisar o RAIR vigente, verificando existência de metodologia documentada para identificação e classificação de riscos.', 'Inspeção documental do RAIR completo', ['Art. 10 Circular 3.978/2020'], undefined, 'design'),
            T('air-1-t2', 'AIR-1.2', 'Avaliar se o RAIR contempla riscos inerentes por: clientes, produtos/serviços, canais de distribuição e regiões geográficas.', 'Gap analysis contra Art. 10, §1º', ['Art. 10, §1º Circular 3.978/2020'], undefined, 'design'),
            T('air-1-t3', 'AIR-1.3', 'Verificar se o RAIR avalia risco residual considerando eficácia dos controles existentes.', 'Análise técnica da metodologia de risco residual', ['Art. 10 Circular 3.978/2020'], undefined, 'design'),
            T('air-1-t4', 'AIR-1.4', 'Analisar a matriz de risco de PLD/FT (risk assessment detalhado) e sua consistência com o perfil institucional.', 'Análise crítica da matriz de risco vs. perfil real', ['Art. 10 Circular 3.978/2020'], undefined, 'design'),
            T('air-1-t5', 'AIR-1.5', 'Verificar metodologia de classificação de risco contemplando clientes, produtos, canais e geografias.', 'Análise técnica da metodologia + backtesting', ['Art. 10 Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'air-2', code: 'AIR-2', name: 'Atualização, Aprovação e Comunicação',
          description: 'Periodicidade de atualização do RAIR, aprovação pela Alta Administração e apresentações executivas.',
          regulatoryBasis: ['Art. 14 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['RAIR desatualizado', 'Não reflete mudanças', 'Falta de envolvimento da alta admin'],
          testProcedures: [
            T('air-2-t1', 'AIR-2.1', 'Verificar se o RAIR é atualizado a cada 2 anos ou quando há alteração significativa no perfil de risco.', 'Verificação de datas de versão e gatilhos de atualização', ['Art. 14 Circular 3.978/2020'], undefined, 'design'),
            T('air-2-t2', 'AIR-2.2', 'Obter evidências de atualização periódica do RAIR e apresentações executivas sobre riscos de LD/FT à alta administração.', 'Inspeção de apresentações + evidências de comunicação', ['Art. 14 Circular 3.978/2020'], undefined, 'design'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 3 - CADASTRO, KYC E BENEFICIÁRIO FINAL
    // ========================================================
    {
      id: 'pillar-3', number: 3, code: 'KYC',
      name: 'Cadastro, KYC e Beneficiário Final',
      description: 'Avaliação dos procedimentos de identificação, qualificação e verificação de clientes PF/PJ, incluindo onboarding, due diligence (CDD/EDD), identificação de beneficiário final e monitoramento contínuo do cadastro.',
      icon: 'Users',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 16 a 28',
        'Carta Circular 4.001/2020 - Anexo',
        'FATF Rec. 10 (Customer Due Diligence)',
      ],
      weight: 10, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'kyc-1', code: 'KYC-1', name: 'Políticas, Procedimentos e Fluxo de Onboarding',
          description: 'Políticas e procedimentos de KYC/CDD/EDD, fluxo de onboarding (incluindo digital) e requisitos documentais.',
          regulatoryBasis: ['Art. 16 Circular 3.978/2020', 'CC 4.001/2020'],
          rating: 'not_assessed',
          keyRisks: ['Procedimentos inadequados', 'Onboarding digital sem controles suficientes', 'Requisitos inconsistentes'],
          testProcedures: [
            T('kyc-1-t1', 'KYC-1.1', 'Obter e analisar políticas e procedimentos de KYC/CDD/EDD verificando aderência regulatória.', 'Gap analysis contra Circular 3.978/2020 e CC 4.001/2020', ['Art. 16 Circular 3.978/2020'], undefined, 'design'),
            T('kyc-1-t2', 'KYC-1.2', 'Mapear o fluxo de onboarding completo (incluindo onboarding digital), identificando pontos de controle e validação.', 'Walkthrough end-to-end do fluxo de abertura de conta', ['Art. 16 Circular 3.978/2020'], undefined, 'design'),
            T('kyc-1-t3', 'KYC-1.3', 'Verificar a lista de requisitos documentais por tipo de cliente (PF, PJ, PJ simplificada, etc.).', 'Inspeção documental da matriz de documentos', ['CC 4.001/2020 Anexo'], undefined, 'design'),
          ],
        },
        {
          id: 'kyc-2', code: 'KYC-2', name: 'Identificação, Qualificação e Dossiês Cadastrais',
          description: 'Testes substantivos em amostras de cadastros de clientes PF e PJ para verificar completude e acurácia.',
          regulatoryBasis: ['Art. 16 Circular 3.978/2020', 'CC 4.001/2020'],
          rating: 'not_assessed',
          keyRisks: ['Dados incompletos', 'Falta de verificação de identidade', 'Dossiês deficientes'],
          testProcedures: [
            T('kyc-2-t1', 'KYC-2.1', 'Obter base completa de clientes ativa (com classificação de risco) para seleção de amostras.', 'Solicitação de extração de dados do sistema cadastral', ['CC 4.001/2020'], undefined, 'operating'),
            T('kyc-2-t2', 'KYC-2.2', 'Selecionar e testar amostra de dossiês cadastrais de clientes PF e PJ verificando completude e acurácia.', 'Amostragem estratificada por risco: 30 PF + 30 PJ', ['CC 4.001/2020'], '30 PF (10 alto + 10 médio + 10 baixo risco) + 30 PJ', 'operating'),
            T('kyc-2-t3', 'KYC-2.3', 'Testar procedimentos de identificação do beneficiário final em clientes PJ com estrutura societária complexa.', 'Amostragem de PJ com cadeia societária multinível', ['Art. 21 Circular 3.978/2020'], '15 PJ com estrutura societária complexa', 'operating'),
          ],
        },
        {
          id: 'kyc-3', code: 'KYC-3', name: 'Due Diligence Reforçada (EDD)',
          description: 'Procedimentos diferenciados para clientes de alto risco.',
          regulatoryBasis: ['Art. 27 Circular 3.978/2020', 'FATF Rec. 10'],
          rating: 'not_assessed',
          keyRisks: ['EDD não aplicada sistematicamente', 'Critérios de EDD insuficientes'],
          testProcedures: [
            T('kyc-3-t1', 'KYC-3.1', 'Verificar se há procedimentos diferenciados de EDD para clientes alto risco, e testar amostra de aplicação.', 'Inspeção de procedimentos + amostragem de dossiês EDD', ['Art. 27 Circular 3.978/2020'], '15 clientes alto risco', 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 4 - CLASSIFICAÇÃO DE RISCO DE CLIENTES
    // ========================================================
    {
      id: 'pillar-4', number: 4, code: 'CRC',
      name: 'Classificação de Risco de Clientes',
      description: 'Avaliação da metodologia de classificação de risco de clientes, critérios de segmentação, distribuição da carteira por nível de risco e processo de revisão periódica.',
      icon: 'BarChart3',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 16, §2º',
        'FATF Rec. 1 (Risk-Based Approach)',
      ],
      weight: 8, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'crc-1', code: 'CRC-1', name: 'Metodologia e Modelo de Classificação',
          description: 'Metodologia de rating/classificação de risco de clientes, fatores considerados e fundamentação.',
          regulatoryBasis: ['Art. 16, §2º Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Modelo inadequado', 'Fatores insuficientes', 'Classificações não refletem risco real'],
          testProcedures: [
            T('crc-1-t1', 'CRC-1.1', 'Obter e analisar a metodologia de rating/classificação de risco de clientes, verificando fatores considerados e fundamentação técnica.', 'Análise técnica do modelo + documentação', ['Art. 16, §2º Circular 3.978/2020'], undefined, 'design'),
            T('crc-1-t2', 'CRC-1.2', 'Avaliar regras e critérios de segmentação de risco (variáveis, pesos, thresholds).', 'Análise das regras de scoring + backtesting', ['Art. 16, §2º Circular 3.978/2020'], undefined, 'design'),
            T('crc-1-t3', 'CRC-1.3', 'Analisar distribuição da carteira por nível de risco (low, medium, high) e verificar razoabilidade.', 'Análise estatística da distribuição + benchmarking', ['Art. 16, §2º Circular 3.978/2020'], undefined, 'operating'),
            T('crc-1-t4', 'CRC-1.4', 'Identificar e investigar clientes com classificação de risco zerada, nula ou inconsistente (ex.: risco 0) na base ativa - obter justificativa e evidência de tratamento.', 'Data analytics na base de clientes: filtro risco=0/null + investigação de root cause', ['Art. 16 Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
        {
          id: 'crc-2', code: 'CRC-2', name: 'Revisão Periódica e Monitoramento',
          description: 'Processo de revisão periódica da classificação de risco e atualização cadastral.',
          regulatoryBasis: ['Art. 16 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Classificações estáticas', 'Sem trigger de reclassificação'],
          testProcedures: [
            T('crc-2-t1', 'CRC-2.1', 'Verificar existência de processo de revisão periódica da classificação de risco e evidências de execução.', 'Inspeção documental + amostra de reclassificações', ['Art. 16 Circular 3.978/2020'], undefined, 'operating'),
            T('crc-2-t2', 'CRC-2.2', 'Obter base de clientes PEP e verificar evidências de monitoramento reforçado e classificação de risco adequada.', 'Cross-check base PEP vs. classificação de risco', ['Art. 24-26 Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 5 - PESSOAS POLITICAMENTE EXPOSTAS (PEP)
    // ========================================================
    {
      id: 'pillar-5', number: 5, code: 'PEP',
      name: 'Pessoas Politicamente Expostas (PEP)',
      description: 'Avaliação dos procedimentos de identificação, aprovação e monitoramento de PEPs (nacionais, estrangeiras e de organizações internacionais), incluindo familiares e relacionados próximos.',
      icon: 'Crown',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 24 a 26',
        'FATF Rec. 12 (PEPs)',
      ],
      weight: 6, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'pep-1', code: 'PEP-1', name: 'Identificação de PEPs',
          description: 'Mecanismos de identificação no onboarding e monitoramento contínuo, incluindo familiares e relacionados.',
          regulatoryBasis: ['Art. 24-25 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['PEPs não identificados', 'Base desatualizada', 'Falta de screening de relacionados'],
          testProcedures: [
            T('pep-1-t1', 'PEP-1.1', 'Verificar procedimentos e ferramentas de identificação de PEPs no onboarding e monitoramento contínuo.', 'Walkthrough + teste da ferramenta de screening', ['Art. 24 Circular 3.978/2020'], undefined, 'design'),
            T('pep-1-t2', 'PEP-1.2', 'Testar amostra de clientes PEP verificando completude da identificação (titular, familiares, relacionados).', 'Amostragem de PEPs + cross-check bases públicas', ['Art. 25 Circular 3.978/2020'], '20 PEPs identificados + teste negativo em 20 contas', 'operating'),
          ],
        },
        {
          id: 'pep-2', code: 'PEP-2', name: 'Aprovação e Monitoramento Reforçado',
          description: 'Aprovação por alçada superior e monitoramento reforçado de PEPs.',
          regulatoryBasis: ['Art. 26 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Falta de aprovação superior', 'Monitoramento insuficiente'],
          testProcedures: [
            T('pep-2-t1', 'PEP-2.1', 'Verificar se início de relacionamento com PEP passa por aprovação de alçada superior.', 'Amostragem de aberturas de conta PEP + evidência de aprovação', ['Art. 26, I Circular 3.978/2020'], '100% dos novos PEPs no período ou 25', 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 6 - MONITORAMENTO TRANSACIONAL
    // ========================================================
    {
      id: 'pillar-6', number: 6, code: 'MON',
      name: 'Monitoramento Transacional',
      description: 'Avaliação do sistema de monitoramento de operações, incluindo arquitetura do sistema, cenários/regras, parâmetros, mapeamento contra tipologias da CC 4.001/2020, indicadores de performance e calibração.',
      icon: 'Activity',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 29 a 33',
        'Carta Circular 4.001/2020',
        'FATF Rec. 20',
      ],
      weight: 10, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'mon-1', code: 'MON-1', name: 'Sistema e Arquitetura de Monitoramento',
          description: 'Documentação do sistema de monitoramento, arquitetura, funcionamento e integridade dos dados.',
          regulatoryBasis: ['Art. 29 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Sistema inadequado', 'Gaps de cobertura de dados', 'Falta de documentação técnica'],
          testProcedures: [
            T('mon-1-t1', 'MON-1.1', 'Obter documentação completa do sistema de monitoramento (arquitetura e funcionamento).', 'Inspeção da documentação técnica do sistema', ['Art. 29 Circular 3.978/2020'], undefined, 'design'),
            T('mon-1-t2', 'MON-1.2', 'Verificar integridade do fluxo de dados alimentando o sistema de monitoramento (completude e tempestividade).', 'Análise do fluxo de dados + reconciliação amostral', ['Art. 29 Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
        {
          id: 'mon-2', code: 'MON-2', name: 'Cenários, Regras e Parâmetros',
          description: 'Lista de cenários/regras ativas, parâmetros/thresholds, e mapeamento contra tipologias da CC 4.001/2020.',
          regulatoryBasis: ['Art. 29-30 Circular 3.978/2020', 'CC 4.001/2020'],
          rating: 'not_assessed',
          keyRisks: ['Cenários insuficientes', 'Parâmetros mal calibrados', 'Não cobre todas as tipologias'],
          testProcedures: [
            T('mon-2-t1', 'MON-2.1', 'Obter lista completa de cenários/regras ativas e verificar cobertura contra tipologias conhecidas.', 'Gap analysis: cenários vs. tipologias COAF/GAFI/CC 4.001', ['Art. 29 Circular 3.978/2020', 'CC 4.001/2020'], undefined, 'design'),
            T('mon-2-t2', 'MON-2.2', 'Avaliar mapeamento dos cenários para tipologias específicas da Circular 4.001/2020.', 'Cross-reference cenários vs. Anexo CC 4.001/2020', ['CC 4.001/2020'], undefined, 'design'),
            T('mon-2-t3', 'MON-2.3', 'Analisar parâmetros e thresholds de cada cenário, verificando adequação ao perfil de risco.', 'Análise técnica de parâmetros + benchmarking', ['Art. 30 Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'mon-3', code: 'MON-3', name: 'Indicadores de Performance e Calibração',
          description: 'KPIs do monitoramento (volume de alertas, falsos positivos) e processo de calibração periódica.',
          regulatoryBasis: ['Art. 33 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Cenários nunca calibrados', 'Alta taxa de falso positivo', 'Sem métricas de efetividade'],
          testProcedures: [
            T('mon-3-t1', 'MON-3.1', 'Obter indicadores de performance do monitoramento: volume de alertas, taxa de falso positivo, conversion rate.', 'Análise quantitativa dos MIs do sistema', ['Art. 29, 33 Circular 3.978/2020'], undefined, 'operating'),
            T('mon-3-t2', 'MON-3.2', 'Verificar processo formal de calibração periódica dos cenários e evidências de ajustes realizados.', 'Inspeção de histórico de calibrações + justificativas', ['Art. 33 Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
        {
          id: 'mon-4', code: 'MON-4', name: 'Matriz de Tipologias CC 4.001/2020',
          description: 'Mapeamento detalhado de cada tipologia da Carta Circular 4.001/2020 contra cenários de monitoramento implementados.',
          regulatoryBasis: ['CC 4.001/2020', 'Art. 29 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Tipologias não cobertas por cenários', 'Gaps de monitoramento em operações específicas'],
          testProcedures: [
            T('mon-4-t1', 'MON-4.1', 'Obter e analisar matriz de mapeamento tipologia-por-tipologia da CC 4.001/2020 contra cenários implementados, identificando gaps de cobertura.', 'Inspeção da matriz + gap analysis contra todas as tipologias do Anexo', ['CC 4.001/2020'], undefined, 'design'),
            T('mon-4-t2', 'MON-4.2', 'Para tipologias identificadas como cobertas, verificar se os parâmetros dos cenários são adequados para detecção efetiva (back-testing).', 'Back-testing amostral de cenários vs. tipologias', ['CC 4.001/2020'], '5 tipologias de maior risco', 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 7 - GESTÃO DE ALERTAS E INVESTIGAÇÕES
    // ========================================================
    {
      id: 'pillar-7', number: 7, code: 'ALT',
      name: 'Gestão de Alertas e Investigações',
      description: 'Avaliação do workflow de investigação de alertas, políticas e procedimentos de tratamento, SLAs, critérios de encerramento, qualidade da análise e documentação de casos investigados.',
      icon: 'Search',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 31 e 32',
        'FATF Rec. 20',
      ],
      weight: 10, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'alt-1', code: 'ALT-1', name: 'Políticas, Workflow e SLAs',
          description: 'Políticas e procedimentos de tratamento de alertas, workflow de investigação e SLAs definidos.',
          regulatoryBasis: ['Art. 31 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Workflow indefinido', 'SLAs não cumpridos', 'Falta de critérios claros'],
          testProcedures: [
            T('alt-1-t1', 'ALT-1.1', 'Obter políticas e procedimentos de tratamento de alertas e verificar aderência regulatória.', 'Inspeção documental + gap analysis', ['Art. 31 Circular 3.978/2020'], undefined, 'design'),
            T('alt-1-t2', 'ALT-1.2', 'Mapear o workflow completo de investigação desde geração do alerta até decisão final (escalar/arquivar/comunicar).', 'Walkthrough end-to-end + fluxograma', ['Art. 31 Circular 3.978/2020'], undefined, 'design'),
            T('alt-1-t3', 'ALT-1.3', 'Verificar SLAs definidos para tratamento de alertas e obter relatórios de cumprimento.', 'Análise de SLAs + relatórios de aderência', ['Art. 31 Circular 3.978/2020'], undefined, 'design'),
            T('alt-1-t4', 'ALT-1.4', 'Avaliar critérios para encerramento/arquivamento de alertas e verificar consistência na aplicação.', 'Inspeção dos critérios + amostragem de alertas encerrados', ['Art. 31 Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'alt-2', code: 'ALT-2', name: 'Teste Substantivo de Alertas e Casos',
          description: 'Teste de amostra de alertas gerados e casos investigados verificando qualidade e documentação.',
          regulatoryBasis: ['Art. 31, 32 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Análise superficial', 'Documentação insuficiente', 'Backlog de alertas'],
          testProcedures: [
            T('alt-2-t1', 'ALT-2.1', 'Obter base de alertas gerados (últimos 6-12 meses) para seleção de amostras.', 'Solicitação de extração do sistema de alertas', ['Art. 31 Circular 3.978/2020'], undefined, 'operating'),
            T('alt-2-t2', 'ALT-2.2', 'Selecionar e testar amostra de alertas verificando qualidade da análise, documentação e tempestividade.', 'Amostragem estratificada: 15 escalados + 25 arquivados', ['Art. 31 Circular 3.978/2020'], '40 alertas: 15 escalados + 25 arquivados', 'operating'),
            T('alt-2-t3', 'ALT-2.3', 'Analisar casos investigados com documentação completa, verificando profundidade e conclusão.', 'Amostragem de casos complexos investigados', ['Art. 32 Circular 3.978/2020'], '15 casos investigados de maior complexidade', 'operating'),
            T('alt-2-t4', 'ALT-2.4', 'Obter base de transações para análise de data analytics e testes independentes.', 'Solicitação de extração de dados transacionais', ['Art. 29 Circular 3.978/2020'], undefined, 'operating'),
            T('alt-2-t5', 'ALT-2.5', 'Selecionar amostra de operações (transações) para teste independente de monitoramento: verificar se operações de risco foram detectadas pelo sistema.', 'Amostragem de operações de alto valor/risco + back-testing contra cenários', ['Art. 29, 31 Circular 3.978/2020'], '30 operações estratificadas por tipo/valor/risco', 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 8 - COMUNICAÇÃO AO COAF
    // ========================================================
    {
      id: 'pillar-8', number: 8, code: 'COM',
      name: 'Comunicação ao COAF',
      description: 'Avaliação do processo de comunicação de operações suspeitas (COS) e automáticas ao COAF, incluindo política de reporte, tempestividade, qualidade, documentação de decisões e logs/protocolos de envio.',
      icon: 'Send',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 34 a 37',
        'Lei 9.613/1998 - Art. 11',
        'FATF Rec. 20',
      ],
      weight: 8, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'com-1', code: 'COM-1', name: 'Política e Procedimento de Reporte',
          description: 'Política de comunicação ao COAF, processo de decisão e documentação.',
          regulatoryBasis: ['Art. 34 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Subnotificação', 'Critérios subjetivos', 'Processo não documentado'],
          testProcedures: [
            T('com-1-t1', 'COM-1.1', 'Obter e analisar política e procedimento de reporte ao COAF.', 'Inspeção documental + gap analysis regulatório', ['Art. 34 Circular 3.978/2020'], undefined, 'design'),
            T('com-1-t2', 'COM-1.2', 'Avaliar documentação de decisões (comunicar vs. não comunicar) e verificar fundamentação.', 'Amostragem de decisões de comunicação e não-comunicação', ['Art. 34 Circular 3.978/2020'], '15 decisões de comunicar + 15 de não comunicar', 'operating'),
          ],
        },
        {
          id: 'com-2', code: 'COM-2', name: 'Comunicações Realizadas e Tempestividade',
          description: 'Base de comunicações realizadas (COS), tempestividade, qualidade e logs de envio.',
          regulatoryBasis: ['Art. 34-36 Circular 3.978/2020', 'Art. 11 Lei 9.613/1998'],
          rating: 'not_assessed',
          keyRisks: ['Comunicações intempestivas', 'Qualidade insuficiente', 'Falhas de envio'],
          testProcedures: [
            T('com-2-t1', 'COM-2.1', 'Obter base completa de comunicações realizadas ao COAF (COS) no período auditado.', 'Solicitação de extração do SISCOAF/sistema interno', ['Art. 34 Circular 3.978/2020'], undefined, 'operating'),
            T('com-2-t2', 'COM-2.2', 'Testar amostra de comunicações verificando qualidade, completude e tempestividade (24h para Art. 11, §1º).', 'Amostragem + análise de tempestividade', ['Art. 34, 36 Circular 3.978/2020', 'Art. 11 Lei 9.613/1998'], '25 comunicações ou 100% se menor', 'operating'),
            T('com-2-t3', 'COM-2.3', 'Verificar evidências de tempestividade dos reportes e obter logs/protocolos de envio ao SISCOAF.', 'Inspeção de logs do sistema + protocolos de envio', ['Art. 36 Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
        {
          id: 'com-3', code: 'COM-3', name: 'Comunicações Automáticas',
          description: 'Comunicações automáticas (espécie acima do limite, transferências internacionais) e reconciliação.',
          regulatoryBasis: ['Art. 35 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Falhas sistêmicas', 'Comunicações incompletas', 'Falta de reconciliação'],
          testProcedures: [
            T('com-3-t1', 'COM-3.1', 'Verificar processo de geração e envio de comunicações automáticas, incluindo reconciliação.', 'Walkthrough sistêmico + reconciliação amostral', ['Art. 35 Circular 3.978/2020'], undefined, 'design'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 9 - TREINAMENTO, CAPACITAÇÃO E CULTURA
    // ========================================================
    {
      id: 'pillar-9', number: 9, code: 'TRE',
      name: 'Treinamento, Capacitação e Cultura',
      description: 'Avaliação do programa de treinamento em PLD-FT incluindo plano anual, conteúdo programático, registros de participação, treinamentos para alta administração e avaliação de efetividade.',
      icon: 'GraduationCap',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 6º',
        'FATF Rec. 18 (Internal Controls)',
      ],
      weight: 5, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'tre-1', code: 'TRE-1', name: 'Plano e Programa de Treinamento',
          description: 'Plano anual de treinamentos, conteúdo programático e público-alvo diferenciado.',
          regulatoryBasis: ['Art. 6º Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Sem plano anual', 'Conteúdo desatualizado', 'Público-alvo não segmentado'],
          testProcedures: [
            T('tre-1-t1', 'TRE-1.1', 'Obter plano anual de treinamentos em PLD/FT e verificar abrangência e periodicidade.', 'Inspeção do plano anual + cronograma de execução', ['Art. 6º Circular 3.978/2020'], undefined, 'design'),
            T('tre-1-t2', 'TRE-1.2', 'Analisar conteúdo programático dos treinamentos verificando atualização e aderência regulatória.', 'Revisão do conteúdo + materiais didáticos', ['Art. 6º Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'tre-2', code: 'TRE-2', name: 'Execução e Registros de Participação',
          description: 'Registros de participação, taxa de conclusão e cobertura.',
          regulatoryBasis: ['Art. 6º Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Baixa aderência', 'Áreas-chave não treinadas', 'Sem controle de presença'],
          testProcedures: [
            T('tre-2-t1', 'TRE-2.1', 'Obter registros de participação dos últimos 12 meses e analisar taxa de conclusão por área.', 'Análise de relatórios de conclusão + cobertura por área', ['Art. 6º Circular 3.978/2020'], 'Relatório completo + amostra de 20 colaboradores', 'operating'),
            T('tre-2-t2', 'TRE-2.2', 'Verificar treinamentos específicos direcionados à alta administração sobre PLD/FT.', 'Evidência de participação de diretores/conselheiros', ['Art. 6º Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
        {
          id: 'tre-3', code: 'TRE-3', name: 'Avaliação de Efetividade dos Treinamentos',
          description: 'Mecanismos de avaliação de efetividade e retenção de conhecimento.',
          regulatoryBasis: ['Art. 6º Circular 3.978/2020', 'Melhores práticas'],
          rating: 'not_assessed',
          keyRisks: ['Sem avaliação de efetividade', 'Treinamento pro forma'],
          testProcedures: [
            T('tre-3-t1', 'TRE-3.1', 'Obter evidências de avaliação de efetividade dos treinamentos (provas, questionários, etc.).', 'Inspeção de avaliações + resultados + ações de reforço', ['Art. 6º Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 10 - KYE (KNOW YOUR EMPLOYEE)
    // ========================================================
    {
      id: 'pillar-10', number: 10, code: 'KYE',
      name: 'KYE - Conheça Seu Colaborador',
      description: 'Avaliação dos procedimentos de Know Your Employee (KYE), incluindo classificação de risco de colaboradores, screening no onboarding e periódico, relação de colaboradores ativos, capacitação PLD dos responsáveis pelo processo, e monitoramento de conflitos de interesse.',
      icon: 'UserCheck',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 2º (abrangência do programa)',
        'FATF Rec. 18 (Internal Controls - Screening of employees)',
        'Melhores práticas de compliance',
      ],
      weight: 4, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'kye-1', code: 'KYE-1', name: 'Política e Procedimentos de KYE',
          description: 'Política de KYE, screening de colaboradores, background check e due diligence de funcionários.',
          regulatoryBasis: ['FATF Rec. 18', 'Melhores práticas'],
          rating: 'not_assessed',
          keyRisks: ['Colaboradores não avaliados', 'Sem background check', 'Conflitos de interesse não detectados'],
          testProcedures: [
            T('kye-1-t1', 'KYE-1.1', 'Verificar existência de política/procedimento de KYE incluindo screening no onboarding e monitoramento contínuo de colaboradores.', 'Inspeção documental + gap analysis', ['FATF Rec. 18'], undefined, 'design'),
            T('kye-1-t2', 'KYE-1.2', 'Obter relação em Excel de todos os colaboradores ativos, com classificação de risco e data do último screening.', 'Solicitação de extração de dados de RH', ['Melhores práticas'], undefined, 'operating'),
            T('kye-1-t3', 'KYE-1.3', 'Verificar classificação de risco de colaboradores, especialmente daqueles em funções sensíveis de PLD/FT.', 'Análise da metodologia de risco + cross-check com funções críticas', ['FATF Rec. 18'], undefined, 'operating'),
          ],
        },
        {
          id: 'kye-2', code: 'KYE-2', name: 'Capacitação e Testes de Colaboradores PLD',
          description: 'Capacitação específica dos colaboradores responsáveis pelos processos de PLD e amostragem de dossiês.',
          regulatoryBasis: ['Art. 6º Circular 3.978/2020', 'FATF Rec. 18'],
          rating: 'not_assessed',
          keyRisks: ['Equipe PLD não capacitada', 'Turnover sem recapacitação'],
          testProcedures: [
            T('kye-2-t1', 'KYE-2.1', 'Verificar evidências de capacitação específica dos colaboradores responsáveis pelos processos de PLD/FT (certificações, treinamentos especializados).', 'Inspeção de evidências de certificação + currículo funcional', ['Art. 6º Circular 3.978/2020'], undefined, 'operating'),
            T('kye-2-t2', 'KYE-2.2', 'Selecionar amostra de dossiês de colaboradores para verificar completude do screening e background check.', 'Amostragem de colaboradores de áreas sensíveis', ['FATF Rec. 18'], '15 colaboradores em funções PLD-sensíveis', 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 11 - KYP E GESTÃO DE PARCEIROS
    // ========================================================
    {
      id: 'pillar-11', number: 11, code: 'KYP',
      name: 'KYP e Gestão de Parceiros',
      description: 'Avaliação dos procedimentos de due diligence de terceiros (Know Your Partner), classificação de risco de parceiros, cláusulas contratuais de PLD/FT, e monitoramento de parceiros relevantes (subadquirentes, correspondentes, etc.).',
      icon: 'Handshake',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 16 (extensão a terceiros)',
        'FATF Rec. 17 (Reliance on Third Parties)',
        'Resolução BCB nº 343/2023',
      ],
      weight: 6, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'kyp-1', code: 'KYP-1', name: 'Política e Due Diligence de Terceiros',
          description: 'Política de due diligence de terceiros e procedimentos de avaliação de parceiros.',
          regulatoryBasis: ['Circular 3.978/2020', 'FATF Rec. 17'],
          rating: 'not_assessed',
          keyRisks: ['Sem política de KYP', 'DD insuficiente', 'Parceiros de alto risco não monitorados'],
          testProcedures: [
            T('kyp-1-t1', 'KYP-1.1', 'Obter e analisar a política de due diligence de terceiros, verificando escopo e profundidade.', 'Inspeção documental + gap analysis', ['Circular 3.978/2020', 'FATF Rec. 17'], undefined, 'design'),
            T('kyp-1-t2', 'KYP-1.2', 'Obter lista de parceiros relevantes (subadquirentes, correspondentes bancários, etc.) e classificação de risco.', 'Solicitação de inventário de parceiros + rating', ['Resolução BCB nº 343/2023'], undefined, 'design'),
            T('kyp-1-t3', 'KYP-1.3', 'Verificar classificação de risco de terceiros e metodologia aplicada.', 'Análise da metodologia de risco de parceiros', ['Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'kyp-2', code: 'KYP-2', name: 'Dossiês e Cláusulas Contratuais',
          description: 'Dossiês de avaliação de parceiros e cláusulas contratuais de PLD/FT.',
          regulatoryBasis: ['Circular 3.978/2020', 'Resolução BCB nº 343/2023'],
          rating: 'not_assessed',
          keyRisks: ['Dossiês incompletos', 'Sem cláusulas de PLD nos contratos', 'Parceiros sem avaliação'],
          testProcedures: [
            T('kyp-2-t1', 'KYP-2.1', 'Testar amostra de dossiês de avaliação de parceiros verificando completude e periodicidade de renovação.', 'Amostragem de dossiês de parceiros alto risco', ['Circular 3.978/2020'], '10 parceiros de maior risco/relevância', 'operating'),
            T('kyp-2-t2', 'KYP-2.2', 'Verificar existência de cláusulas contratuais de PLD/FT em contratos com parceiros relevantes.', 'Amostragem de contratos + análise de cláusulas PLD', ['Resolução BCB nº 343/2023'], '10 contratos com parceiros relevantes', 'operating'),
          ],
        },
        {
          id: 'kyp-3', code: 'KYP-3', name: 'Aculturamento PLD para Parceiros/Terceiros',
          description: 'Evidências de disseminação da cultura de PLD-FT junto a parceiros e prestadores de serviço terceirizados.',
          regulatoryBasis: ['Circular 3.978/2020', 'Melhores práticas'],
          rating: 'not_assessed',
          keyRisks: ['Parceiros sem conhecimento de PLD', 'Risco reputacional via terceiros'],
          testProcedures: [
            T('kyp-3-t1', 'KYP-3.1', 'Verificar evidências de aculturamento/treinamento de PLD-FT direcionado a parceiros e prestadores de serviço terceirizados.', 'Inspeção de materiais, comunicados, treinamentos + evidências de participação', ['Circular 3.978/2020'], undefined, 'operating'),
            T('kyp-3-t2', 'KYP-3.2', 'Obter relação em Excel de parceiros e prestadores de serviços ativos e verificar quais receberam treinamento/comunicação de PLD.', 'Cross-check lista de parceiros vs. evidências de aculturamento', ['Melhores práticas'], undefined, 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 12 - SANÇÕES E LISTAS RESTRITIVAS
    // ========================================================
    {
      id: 'pillar-12', number: 12, code: 'SAN',
      name: 'Sanções e Listas Restritivas',
      description: 'Avaliação dos procedimentos de screening contra listas de sanções (CSNU, OFAC, UE, nacionais), base de screening, eficácia do matching e procedimentos de indisponibilidade de bens.',
      icon: 'ShieldAlert',
      regulatoryBasis: [
        'Lei 13.810/2019',
        'Resolução COAF nº 31/2019',
        'FATF Rec. 6 e 7',
      ],
      weight: 5, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'san-1', code: 'SAN-1', name: 'Screening de Sanções',
          description: 'Processo e ferramenta de screening contra listas restritivas.',
          regulatoryBasis: ['Lei 13.810/2019', 'FATF Rec. 6'],
          rating: 'not_assessed',
          keyRisks: ['Ferramenta inadequada', 'Listas desatualizadas', 'Falsos negativos'],
          testProcedures: [
            T('san-1-t1', 'SAN-1.1', 'Verificar procedimentos e ferramentas de screening contra listas restritivas (CSNU, OFAC, UE, nacionais).', 'Walkthrough + documentação da ferramenta', ['Lei 13.810/2019'], undefined, 'design'),
            T('san-1-t2', 'SAN-1.2', 'Obter base de screening (sanções/PEPs) do período 01/01/2026 a 30/04/2026 para análise.', 'Solicitação de extração da base de screening', ['Lei 13.810/2019'], undefined, 'operating'),
            T('san-1-t3', 'SAN-1.3', 'Testar eficácia do screening inserindo nomes sancionados (com variações) para verificar detecção.', 'Teste de penetração com nomes sancionados + variações', ['Lei 13.810/2019', 'FATF Rec. 6'], '10 nomes CSNU com variações ortográficas', 'operating'),
          ],
        },
        {
          id: 'san-2', code: 'SAN-2', name: 'Indisponibilidade de Bens',
          description: 'Procedimentos para cumprimento imediato de determinações de indisponibilidade.',
          regulatoryBasis: ['Lei 13.810/2019 - Art. 5º e 6º'],
          rating: 'not_assessed',
          keyRisks: ['Prazo não atendido', 'Processo inexistente'],
          testProcedures: [
            T('san-2-t1', 'SAN-2.1', 'Verificar procedimento documentado para cumprimento imediato de determinações de indisponibilidade de bens.', 'Inspeção documental + simulação de cenário', ['Art. 5º e 6º Lei 13.810/2019'], undefined, 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 13 - SISTEMAS, DADOS E DATA ANALYTICS
    // ========================================================
    {
      id: 'pillar-13', number: 13, code: 'SDA',
      name: 'Sistemas, Dados e Data Analytics',
      description: 'Avaliação da infraestrutura tecnológica que suporta o programa de PLD/FT, incluindo inventário de sistemas, fluxo de dados, controles de acesso (IAM), logs de auditoria e integridade dos dados.',
      icon: 'Database',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 29 (Sistemas)',
        'FATF Rec. 18',
        'Melhores práticas de TI em compliance',
      ],
      weight: 5, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'sda-1', code: 'SDA-1', name: 'Inventário de Sistemas e Fluxo de Dados',
          description: 'Inventário completo de sistemas que suportam PLD/FT e mapeamento do fluxo de dados entre sistemas.',
          regulatoryBasis: ['Art. 29 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Sistemas não inventariados', 'Gaps no fluxo de dados', 'Dados inconsistentes entre sistemas'],
          testProcedures: [
            T('sda-1-t1', 'SDA-1.1', 'Obter inventário completo de sistemas que suportam PLD/FT (cadastro, monitoramento, screening, alertas, comunicações).', 'Inspeção do inventário + entrevistas com TI', ['Art. 29 Circular 3.978/2020'], undefined, 'design'),
            T('sda-1-t2', 'SDA-1.2', 'Mapear fluxo de dados entre sistemas de PLD/FT, identificando pontos de integração e potenciais gaps.', 'Análise do diagrama de fluxo de dados + validação técnica', ['Art. 29 Circular 3.978/2020'], undefined, 'design'),
            T('sda-1-t3', 'SDA-1.3', 'Obter prints de tela do sistema em que são registrados os dados cadastrais dos clientes e das operações (evidência de campos e funcionalidades).', 'Screenshots anotados + walkthrough do sistema', ['Art. 29 Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'sda-2', code: 'SDA-2', name: 'Controles de Acesso e Logs de Auditoria',
          description: 'Controles de acesso (IAM), segregação de funções e trilhas de auditoria nos sistemas de PLD/FT.',
          regulatoryBasis: ['Melhores práticas de TI', 'FATF Rec. 18'],
          rating: 'not_assessed',
          keyRisks: ['Acesso não segregado', 'Sem trilha de auditoria', 'Usuários inativos com acesso'],
          testProcedures: [
            T('sda-2-t1', 'SDA-2.1', 'Avaliar controles de acesso (IAM) aos sistemas de PLD/FT, incluindo perfis, segregação de funções e revisão periódica.', 'Inspeção de política de acesso + extração de acessos ativos', ['Melhores práticas'], undefined, 'design'),
            T('sda-2-t2', 'SDA-2.2', 'Verificar existência e integridade dos logs de auditoria dos sistemas de PLD/FT.', 'Inspeção de logs + teste de integridade', ['Melhores práticas'], undefined, 'design'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 14 - ADEQUAÇÃO AO MODELO DE NEGÓCIO
    // ========================================================
    {
      id: 'pillar-14', number: 14, code: 'ADQ',
      name: 'Adequação ao Modelo de Negócio',
      description: 'Avaliação da adequação do programa de PLD/FT ao modelo de negócio da instituição, incluindo perfil de clientes, volumetria transacional, avaliação de risco por produto, fluxo transacional e descrição de produtos/serviços.',
      icon: 'Briefcase',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 10 (Perfil de risco)',
        'FATF Rec. 1 (Risk-Based Approach)',
      ],
      weight: 5, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'adq-1', code: 'ADQ-1', name: 'Perfil de Clientes e Produtos',
          description: 'Entendimento do perfil de clientes (PF/PJ, segmentos) e produtos/serviços oferecidos.',
          regulatoryBasis: ['Art. 10 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Programa não adequado ao perfil', 'Produtos de risco sem controles específicos'],
          testProcedures: [
            T('adq-1-t1', 'ADQ-1.1', 'Obter perfil de clientes (PF/PJ, segmentos, distribuição geográfica) e verificar consistência com controles de PLD.', 'Análise de dados cadastrais + segmentação', ['Art. 10 Circular 3.978/2020'], undefined, 'design'),
            T('adq-1-t2', 'ADQ-1.2', 'Obter descrição dos produtos e serviços da instituição (adquirência, wallet, crédito, etc.) e avaliação de risco por produto.', 'Inspeção da avaliação de risco por produto', ['Art. 10, §1º Circular 3.978/2020'], undefined, 'design'),
            T('adq-1-t3', 'ADQ-1.3', 'Obter evidência de análise de PLD-FT para novos produtos, serviços e tecnologias lançados no período auditado.', 'Inspeção de pareceres de compliance para novos produtos + registros de aprovação', ['Art. 2º, VII Circular 3.978/2020'], undefined, 'design'),
          ],
        },
        {
          id: 'adq-2', code: 'ADQ-2', name: 'Volumetria e Fluxo Transacional',
          description: 'Volumetria transacional e mapeamento do fluxo transacional (customer journey).',
          regulatoryBasis: ['Art. 10 Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Monitoramento não cobre todos os canais', 'Fluxo transacional com gaps'],
          testProcedures: [
            T('adq-2-t1', 'ADQ-2.1', 'Obter volumetria transacional (quantidade e valores) por produto/canal e verificar coerência com cenários de monitoramento.', 'Análise de dados transacionais + cross-reference com cenários', ['Art. 10 Circular 3.978/2020'], undefined, 'operating'),
            T('adq-2-t2', 'ADQ-2.2', 'Mapear fluxo transacional (customer journey) para produtos relevantes, identificando pontos de risco de LD/FT.', 'Walkthrough do fluxo + identificação de vulnerabilidades', ['Art. 10 Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 15 - CONTROLES INTERNOS, MRC E EFETIVIDADE
    // ========================================================
    {
      id: 'pillar-15', number: 15, code: 'CTR',
      name: 'Controles Internos, MRC e Efetividade',
      description: 'Avaliação dos controles internos de PLD/FT, Matriz de Riscos e Controles (MRC), testes de 1ª e 2ª linha, indicadores de controle, relatórios de auditoria interna, planos de ação e avaliação de efetividade.',
      icon: 'CheckCircle',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 7º a 9º',
        'FATF Rec. 18 (Internal Controls)',
      ],
      weight: 7, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'ctr-1', code: 'CTR-1', name: 'Matriz de Riscos e Controles (MRC)',
          description: 'Existência e qualidade da MRC de PLD/FT com mapeamento de riscos e controles.',
          regulatoryBasis: ['Melhores práticas', 'FATF Rec. 18'],
          rating: 'not_assessed',
          keyRisks: ['MRC inexistente', 'Controles não mapeados', 'Riscos sem controle mitigador'],
          testProcedures: [
            T('ctr-1-t1', 'CTR-1.1', 'Obter e analisar a Matriz de Riscos e Controles Internos (MRC) de PLD/FT.', 'Inspeção da MRC + avaliação de completude', ['Melhores práticas'], undefined, 'design'),
            T('ctr-1-t2', 'CTR-1.2', 'Verificar indicadores de controle (KRIs/KCIs) definidos para PLD/FT e resultados recentes.', 'Análise dos KRIs + tendências dos últimos 12 meses', ['Melhores práticas'], undefined, 'design'),
          ],
        },
        {
          id: 'ctr-2', code: 'CTR-2', name: 'Testes de Controles (1ª e 2ª Linha)',
          description: 'Evidências de testes de controles realizados pela 1ª e 2ª linhas de defesa.',
          regulatoryBasis: ['Art. 7º Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Testes não realizados', 'Escopo insuficiente', 'Sem independência'],
          testProcedures: [
            T('ctr-2-t1', 'CTR-2.1', 'Obter e analisar evidências de testes de controles de PLD/FT realizados pela 1ª e 2ª linha de defesa.', 'Inspeção de relatórios de testes + metodologia aplicada', ['Art. 7º Circular 3.978/2020'], undefined, 'operating'),
            T('ctr-2-t2', 'CTR-2.2', 'Obter e analisar relatórios de auditoria interna anteriores sobre PLD/FT, incluindo escopo e conclusões.', 'Inspeção de relatórios de auditoria interna (últimos 24 meses)', ['Art. 8º Circular 3.978/2020'], undefined, 'operating'),
            T('ctr-2-t3', 'CTR-2.3', 'Obter relatórios do ano anterior e apontamentos em aberto emitidos por auditoria EXTERNA, reguladores e auto-identificados.', 'Inspeção de relatórios externos, cartas regulatórias + tracking de remediation', ['Art. 8º Circular 3.978/2020'], undefined, 'operating'),
            T('ctr-2-t4', 'CTR-2.4', 'Obter planos de ação para com as deficiências identificadas (pontos de melhoria) e verificar status de implementação.', 'Follow-up de cada item: evidência de implementação, prazo, responsável', ['Art. 9º Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
        {
          id: 'ctr-3', code: 'CTR-3', name: 'Planos de Ação e Avaliação de Efetividade',
          description: 'Follow-up de planos de ação e avaliação de efetividade do programa.',
          regulatoryBasis: ['Art. 7º a 9º Circular 3.978/2020'],
          rating: 'not_assessed',
          keyRisks: ['Ações não implementadas', 'Reincidência de deficiências', 'Sem avaliação de efetividade'],
          testProcedures: [
            T('ctr-3-t1', 'CTR-3.1', 'Verificar follow-up de implementação dos planos de ação de auditorias e avaliações anteriores.', 'Acompanhamento de plano de ação + evidências de implementação', ['Art. 9º Circular 3.978/2020'], undefined, 'operating'),
            T('ctr-3-t2', 'CTR-3.2', 'Verificar se há programa de avaliação de efetividade com periodicidade compatível com o perfil de risco.', 'Inspeção de relatórios de efetividade + escopo', ['Art. 7º Circular 3.978/2020'], undefined, 'operating'),
            T('ctr-3-t3', 'CTR-3.3', 'Verificar trilha de auditoria no relatório de efetividade: quem elaborou, quem revisou, datas, versões, e evidência de revisão pelo Comitê/Diretoria.', 'Inspeção de versionamento + evidências de revisão e aprovação', ['Art. 7º Circular 3.978/2020'], undefined, 'operating'),
            T('ctr-3-t4', 'CTR-3.4', 'Obter relatório de avaliação de efetividade de PLD-FT (data base 31/12/2024 ou mais recente) e evidências de discussão com a Alta Administração.', 'Inspeção do relatório completo + ata de discussão', ['Art. 7º Circular 3.978/2020'], undefined, 'operating'),
          ],
        },
      ],
    },

    // ========================================================
    // PILAR 16 - REGISTROS E MANUTENÇÃO
    // ========================================================
    {
      id: 'pillar-16', number: 16, code: 'REG',
      name: 'Registros e Manutenção',
      description: 'Avaliação dos procedimentos de manutenção de registros de transações, cadastros e comunicações, conforme prazo mínimo legal de 10 anos.',
      icon: 'Archive',
      regulatoryBasis: [
        'Circular 3.978/2020 - Art. 38',
        'Lei 9.613/1998 - Art. 10',
        'FATF Rec. 11',
      ],
      weight: 3, overallRating: 'not_assessed', completionPercent: 0,
      subAreas: [
        {
          id: 'reg-1', code: 'REG-1', name: 'Política de Retenção e Acessibilidade',
          description: 'Prazo mínimo de 10 anos e capacidade de recuperação.',
          regulatoryBasis: ['Art. 38 Circular 3.978/2020', 'Art. 10 Lei 9.613/1998'],
          rating: 'not_assessed',
          keyRisks: ['Registros descartados antes do prazo', 'Inacessibilidade'],
          testProcedures: [
            T('reg-1-t1', 'REG-1.1', 'Verificar se a política de retenção prevê manutenção por mínimo 10 anos e testar recuperação de registros antigos.', 'Inspeção de política + teste de recuperação', ['Art. 38 Circular 3.978/2020', 'Art. 10 Lei 9.613/1998'], undefined, 'design'),
          ],
        },
      ],
    },
  ]
}

export const SEVERITY_CONFIG = {
  critical: { label: 'Crítico', color: '#dc2626', bgColor: '#fef2f2', description: 'Deficiência fundamental que expõe a instituição a risco regulatório e/ou reputacional severo. Requer ação imediata.' },
  high: { label: 'Alto', color: '#ea580c', bgColor: '#fff7ed', description: 'Deficiência significativa que compromete a efetividade do programa de PLD-FT. Requer ação prioritária.' },
  medium: { label: 'Médio', color: '#d97706', bgColor: '#fffbeb', description: 'Deficiência que reduz a efetividade de controles específicos. Requer plano de ação com prazo definido.' },
  low: { label: 'Baixo', color: '#65a30d', bgColor: '#f7fee7', description: 'Oportunidade de melhoria ou desvio menor. Requer acompanhamento.' },
}

export const RATING_CONFIG = {
  effective: { label: 'Efetivo', color: '#16a34a', description: 'O controle/pilar atende integralmente aos requisitos regulatórios e melhores práticas.' },
  largely_effective: { label: 'Amplamente Efetivo', color: '#65a30d', description: 'O controle/pilar atende à maioria dos requisitos, com melhorias pontuais necessárias.' },
  partially_effective: { label: 'Parcialmente Efetivo', color: '#d97706', description: 'O controle/pilar apresenta deficiências significativas que comprometem sua efetividade.' },
  ineffective: { label: 'Inefetivo', color: '#dc2626', description: 'O controle/pilar não atende aos requisitos mínimos regulatórios.' },
  not_assessed: { label: 'Não Avaliado', color: '#6b7280', description: 'Pilar ainda não avaliado.' },
}

export const PHASE_CONFIG = {
  planning: { label: 'Planejamento', description: 'Definição de escopo, entendimento da instituição e planejamento dos trabalhos.' },
  fieldwork: { label: 'Trabalho de Campo', description: 'Coleta de evidências, entrevistas e análise documental.' },
  testing: { label: 'Testes', description: 'Execução de procedimentos de teste e amostragem.' },
  reporting: { label: 'Relatório', description: 'Consolidação de achados e elaboração do relatório final.' },
  completed: { label: 'Concluído', description: 'Auditoria finalizada.' },
}
