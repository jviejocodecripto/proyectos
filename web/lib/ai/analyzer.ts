import Anthropic from '@anthropic-ai/sdk';
import { getRepositoryInfo } from '@/lib/github/client';
import { getActivePrompt } from '@/lib/db/prompts';
import type { RepositoryInfo } from '@/types';

export interface AIAnalysisResult {
  analysis: string;
  suggestedScore: number;
  codeQuality: number;
  documentation: number;
  functionality: number;
  gitUsage: number;
  promptUsed: string; // ID or name of the prompt used
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY not set. AI analysis will not work.');
}

/**
 * Extract score from text using regex
 */
function extractScore(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (match && match[1]) {
    const score = parseFloat(match[1]);
    return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 10);
  }
  return 0;
}

/**
 * Parse AI response to extract scores
 */
function parseAIResponse(text: string): Partial<AIAnalysisResult> {
  const result: Partial<AIAnalysisResult> = {
    analysis: text
  };

  // Extract suggested score
  const suggestedScorePattern =
    /(?:Puntuación\s+[Ss]ugerida|Nota\s+[Ff]inal|Score)[\s:]*(\d+(?:\.\d+)?)\s*\/\s*10/i;
  result.suggestedScore = extractScore(text, suggestedScorePattern);

  // Extract individual scores
  const codeQualityPattern =
    /(?:Calidad\s+del\s+Código|Code\s+Quality)[\s:]*(\d+(?:\.\d+)?)\s*\/\s*10/i;
  result.codeQuality = extractScore(text, codeQualityPattern);

  const documentationPattern =
    /(?:Documentación|Documentation)[\s:]*(\d+(?:\.\d+)?)\s*\/\s*10/i;
  result.documentation = extractScore(text, documentationPattern);

  const functionalityPattern =
    /(?:Funcionalidad|Functionality)[\s:]*(\d+(?:\.\d+)?)\s*\/\s*10/i;
  result.functionality = extractScore(text, functionalityPattern);

  const gitUsagePattern =
    /(?:Gestión\s+de\s+Proyecto|Uso\s+de\s+Git|Git\s+Usage)[\s:]*(\d+(?:\.\d+)?)\s*\/\s*10/i;
  result.gitUsage = extractScore(text, gitUsagePattern);

  // If no suggested score found, calculate average
  if (!result.suggestedScore) {
    const scores = [
      result.codeQuality || 0,
      result.documentation || 0,
      result.functionality || 0,
      result.gitUsage || 0
    ].filter((s) => s > 0);
    if (scores.length > 0) {
      result.suggestedScore =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  return result;
}

/**
 * Generate default prompt template
 */
function getDefaultPrompt(
  projectName: string,
  submissionDate: Date,
  readme: string,
  fileStructure: string,
  mainCode: string,
  commits: string
): string {
  return `Eres un profesor evaluando un proyecto académico de programación. Analiza el siguiente repositorio de GitHub y proporciona una evaluación detallada.

**Información del Proyecto:**
- Nombre: ${projectName}
- Fecha de entrega: ${submissionDate.toISOString().split('T')[0]}

**README:**
${readme.substring(0, 3000)}

**Estructura de archivos (primeros 50):**
${fileStructure}

**Código principal:**
${mainCode.substring(0, 5000)}

**Commits recientes:**
${commits}

**Instrucciones de evaluación:**
Proporciona una evaluación estructurada con las siguientes secciones:

1. **Calidad del Código: X/10**
   - Analiza la estructura, organización, y buenas prácticas
   - Comenta sobre la legibilidad y mantenibilidad

2. **Documentación: X/10**
   - Evalúa el README y comentarios en el código
   - Verifica si hay instrucciones de instalación y uso

3. **Funcionalidad: X/10**
   - Evalúa si el proyecto parece cumplir sus objetivos
   - Comenta sobre la completitud de las características

4. **Gestión de Proyecto: X/10**
   - Analiza el uso de Git (commits, mensajes, frecuencia)
   - Evalúa la organización del proyecto

5. **Puntuación Sugerida: X/10**
   - Proporciona una nota final basada en los criterios anteriores

**Formato de respuesta:**
Usa exactamente el formato "Categoría: X/10" para cada puntuación.
Proporciona comentarios constructivos y específicos.
Menciona tanto fortalezas como áreas de mejora.`;
}

/**
 * Analyze repository using AI
 */
export async function analyzeRepository(
  projectName: string,
  repositoryUrl: string,
  submissionDate: Date,
  customPrompt?: string
): Promise<AIAnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY no configurada. No se puede realizar análisis con IA.'
    );
  }

  try {
    // Get repository information from GitHub
    console.log('Fetching repository information from GitHub...');
    const repoInfo = await getRepositoryInfo(repositoryUrl);

    // Prepare data for AI
    const fileStructure = repoInfo.fileStructure
      .slice(0, 50)
      .map((f) => `${f.type === 'tree' ? '📁' : '📄'} ${f.path}`)
      .join('\n');

    const commits = repoInfo.recentCommits
      .map((c) => `- ${c.message} (${c.author})`)
      .join('\n');

    // Get main code content
    const mainCodePaths = Object.keys(repoInfo.mainFiles).filter(
      (path) => !path.includes('package.json') && !path.includes('README')
    );
    const mainCode =
      mainCodePaths.length > 0
        ? Object.entries(repoInfo.mainFiles)
            .filter(([path]) => mainCodePaths.includes(path))
            .map(([path, content]) => `=== ${path} ===\n${content}`)
            .join('\n\n')
        : 'No main code files found';

    // Fetch active prompt from database if no custom prompt provided
    let promptTemplate = customPrompt;
    let promptUsed = 'default';

    if (!promptTemplate) {
      const activePrompt = await getActivePrompt();
      if (activePrompt) {
        promptTemplate = activePrompt.prompt;
        promptUsed = activePrompt._id?.toString() || activePrompt.name;
      } else {
        promptTemplate = getDefaultPrompt(
          projectName,
          submissionDate,
          repoInfo.readme,
          fileStructure,
          mainCode,
          commits
        );
        promptUsed = 'default';
      }
    } else {
      promptUsed = 'custom';
    }

    // Prepare languages string
    const languages = repoInfo.stats?.languages
      ? Object.keys(repoInfo.stats.languages).join(', ')
      : 'Not detected';

    // Replace all template variables
    const prompt =
      typeof promptTemplate === 'string'
        ? promptTemplate
            .replace(/\{\{projectName\}\}/g, projectName)
            .replace(
              /\{\{submissionDate\}\}/g,
              submissionDate.toISOString().split('T')[0]
            )
            .replace(/\{\{repositoryUrl\}\}/g, repositoryUrl)
            .replace(/\{\{readme\}\}/g, repoInfo.readme.substring(0, 3000))
            .replace(/\{\{fileStructure\}\}/g, fileStructure)
            .replace(/\{\{mainCode\}\}/g, mainCode.substring(0, 5000))
            .replace(/\{\{recentCommits\}\}/g, commits)
            .replace(/\{\{languages\}\}/g, languages)
        : promptTemplate;

    // Call Anthropic API
    console.log('Calling Anthropic API for analysis...');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text from response
    const analysisText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse scores from response
    const parsed = parseAIResponse(analysisText);

    return {
      analysis: analysisText,
      suggestedScore: parsed.suggestedScore || 5,
      codeQuality: parsed.codeQuality || 5,
      documentation: parsed.documentation || 5,
      functionality: parsed.functionality || 5,
      gitUsage: parsed.gitUsage || 5,
      promptUsed
    };
  } catch (error: any) {
    console.error('Error in AI analysis:', error);
    throw new Error(
      `Error en el análisis con IA: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Test function to check if AI is configured
 */
export function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
