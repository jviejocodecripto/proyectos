import { Octokit } from '@octokit/rest';

export interface RepositoryInfo {
  readme: string;
  fileStructure: Array<{
    path: string;
    type: string;
    size?: number;
  }>;
  recentCommits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  mainFiles: Record<string, string>;
  stats: {
    stars: number;
    forks: number;
    openIssues: number;
    languages: Record<string, number>;
  };
}

/**
 * Parse GitHub URL to extract owner and repo
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '')
    };
  } catch {
    return null;
  }
}

/**
 * Get repository information from GitHub
 */
export async function getRepositoryInfo(
  repoUrl: string
): Promise<RepositoryInfo> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('URL de GitHub inválida');
  }

  const { owner, repo } = parsed;

  // Create Octokit instance (no auth for public repos)
  const octokit = new Octokit();

  try {
    // Get repository metadata
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    // Get README
    let readme = '';
    try {
      const { data: readmeData } = await octokit.repos.getReadme({
        owner,
        repo
      });
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    } catch (error) {
      console.warn('No README found for repository');
      readme = 'No README available';
    }

    // Get file structure (tree)
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: repoData.default_branch || 'main',
      recursive: 'true'
    });

    const fileStructure = treeData.tree
      .filter((item) => item.type === 'blob' || item.type === 'tree')
      .map((item) => ({
        path: item.path || '',
        type: item.type || '',
        size: item.size
      }));

    // Get recent commits (last 10)
    const { data: commitsData } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 10
    });

    const recentCommits = commitsData.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || ''
    }));

    // Get languages
    const { data: languagesData } = await octokit.repos.listLanguages({
      owner,
      repo
    });

    // Get main files (package.json, main source files, etc.)
    const mainFiles: Record<string, string> = {};
    const filesToFetch = [
      'package.json',
      'README.md',
      'index.js',
      'index.ts',
      'src/index.js',
      'src/index.ts',
      'src/main.js',
      'src/main.ts',
      'app.js',
      'app.ts',
      'main.py',
      'requirements.txt',
      'setup.py'
    ];

    for (const filePath of filesToFetch) {
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath
        });

        if ('content' in fileData && fileData.type === 'file') {
          const content = Buffer.from(fileData.content, 'base64').toString(
            'utf-8'
          );
          mainFiles[filePath] = content;
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    return {
      readme,
      fileStructure,
      recentCommits,
      mainFiles,
      stats: {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        languages: languagesData
      }
    };
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error('Repositorio no encontrado o es privado');
    }
    if (error.status === 403) {
      throw new Error('Límite de API de GitHub alcanzado. Intenta más tarde.');
    }
    throw new Error(
      `Error al acceder al repositorio: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Get file content from repository
 */
export async function getFileContent(
  repoUrl: string,
  filePath: string
): Promise<string> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('URL de GitHub inválida');
  }

  const { owner, repo } = parsed;
  const octokit = new Octokit();

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath
    });

    if ('content' in data && data.type === 'file') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    throw new Error('El archivo no existe o es un directorio');
  } catch (error: any) {
    throw new Error(
      `Error al obtener archivo: ${error.message || 'Unknown error'}`
    );
  }
}
