import { ObjectId } from 'mongodb';
import { getCollection } from './mongodb';
import { uploadMarkdown, downloadMarkdown } from './gridfs';
import type {
  Project,
  ProjectQueryParams,
  PaginatedResponse,
  CreateProjectInput,
  UpdateProjectInput,
  VideoEvaluation,
  RepositoryEvaluation
} from '@/types';
import { PAGINATION_DEFAULTS } from '@/types';

// Threshold for storing comments in GridFS (1KB)
const GRIDFS_THRESHOLD = 1000;

/**
 * Load markdown content from GridFS for a project's evaluations
 */
async function loadEvaluationMarkdown(project: Project): Promise<Project> {
  if (!project.evaluations) return project;

  const projectWithContent = { ...project };

  // Load video evaluation comments from GridFS if needed
  if (project.evaluations.videoDemo?.commentsFileId) {
    try {
      const comments = await downloadMarkdown(project.evaluations.videoDemo.commentsFileId);
      projectWithContent.evaluations = {
        ...projectWithContent.evaluations!,
        videoDemo: {
          ...project.evaluations.videoDemo,
          comments
        }
      };
    } catch (error) {
      console.error('Error loading video evaluation markdown:', error);
    }
  }

  // Load repository evaluation comments from GridFS if needed
  if (project.evaluations.repository?.commentsFileId) {
    try {
      const comments = await downloadMarkdown(project.evaluations.repository.commentsFileId);
      projectWithContent.evaluations = {
        ...projectWithContent.evaluations!,
        repository: {
          ...project.evaluations.repository,
          comments
        }
      };
    } catch (error) {
      console.error('Error loading repository evaluation markdown:', error);
    }
  }

  // Load AI analysis from GridFS if needed
  if (project.evaluations.repository?.aiAnalysisFileId) {
    try {
      const aiAnalysis = await downloadMarkdown(project.evaluations.repository.aiAnalysisFileId);
      projectWithContent.evaluations = {
        ...projectWithContent.evaluations!,
        repository: {
          ...projectWithContent.evaluations!.repository!,
          aiAnalysis
        }
      };
    } catch (error) {
      console.error('Error loading AI analysis markdown:', error);
    }
  }

  return projectWithContent;
}

/**
 * Create new project
 */
export async function createProject(
  studentEmail: string,
  data: CreateProjectInput
): Promise<Project> {
  const collection = await getCollection<Project>('projects');

  const now = new Date();
  const project: Omit<Project, '_id'> = {
    name: data.name,
    studentEmail,
    repositoryUrl: data.repositoryUrl,
    videoUrl: data.videoUrl,
    course: data.course,
    edition: data.edition,
    submissionDate: now, // Fecha actual de envío
    status: 'submitted',
    createdAt: now,
    updatedAt: now
  };

  const result = await collection.insertOne(project as any);
  return { ...project, _id: result.insertedId };
}

/**
 * Find project by ID
 */
export async function findProjectById(id: string): Promise<Project | null> {
  const collection = await getCollection<Project>('projects');

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const project = await collection.findOne({ _id: new ObjectId(id) });
  
  if (!project) return null;

  // Load markdown content from GridFS
  return await loadEvaluationMarkdown(project);
}

/**
 * Find projects with filters and pagination
 */
export async function findProjects(
  params: ProjectQueryParams = {}
): Promise<PaginatedResponse<Project>> {
  const collection = await getCollection<Project>('projects');

  const {
    page = PAGINATION_DEFAULTS.PAGE,
    limit = PAGINATION_DEFAULTS.LIMIT,
    studentEmail,
    status,
    course
  } = params;

  // Build query
  const query: any = {};

  if (studentEmail) {
    query.studentEmail = studentEmail;
  }

  if (status) {
    query.status = status;
  }

  if (course) {
    query.course = course;
  }

  // Get total count
  const total = await collection.countDocuments(query);

  // Get paginated results
  const skip = (page - 1) * limit;
  const items = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  // Load markdown content from GridFS for each project
  const itemsWithMarkdown = await Promise.all(
    items.map(project => loadEvaluationMarkdown(project))
  );

  return {
    items: itemsWithMarkdown,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Update project
 */
export async function updateProject(
  id: string,
  data: UpdateProjectInput
): Promise<boolean> {
  const collection = await getCollection<Project>('projects');

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const updateData: any = { updatedAt: new Date() };

  if (data.name) updateData.name = data.name;
  if (data.repositoryUrl) updateData.repositoryUrl = data.repositoryUrl;
  if (data.videoUrl) updateData.videoUrl = data.videoUrl;
  if (data.course) updateData.course = data.course;
  if (data.edition) updateData.edition = data.edition;

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete project
 */
export async function deleteProject(id: string): Promise<boolean> {
  const collection = await getCollection<Project>('projects');

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/**
 * Add video demo evaluation
 */
export async function addVideoEvaluation(
  projectId: string,
  evaluation: Omit<VideoEvaluation, 'evaluatedAt'>
): Promise<boolean> {
  const collection = await getCollection<Project>('projects');

  if (!ObjectId.isValid(projectId)) {
    return false;
  }

  const videoEval: VideoEvaluation = {
    ...evaluation,
    evaluatedAt: new Date()
  };

  // If comments are large, store in GridFS
  if (evaluation.comments.length > GRIDFS_THRESHOLD) {
    const fileId = await uploadMarkdown(
      evaluation.comments,
      `video-eval-${projectId}-${Date.now()}.md`,
      {
        projectId,
        evaluationType: 'video',
        evaluatedBy: evaluation.evaluatedBy
      }
    );
    videoEval.commentsFileId = fileId;
    videoEval.comments = ''; // Store empty string in document, actual content in GridFS
  }

  const result = await collection.updateOne(
    { _id: new ObjectId(projectId) },
    {
      $set: {
        'evaluations.videoDemo': videoEval,
        updatedAt: new Date()
      }
    }
  );

  // Check if both evaluations are complete to update status
  const project = await findProjectById(projectId);
  if (
    project &&
    project.evaluations?.videoDemo &&
    project.evaluations?.repository
  ) {
    await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { status: 'evaluated' } }
    );
  }

  return result.modifiedCount > 0;
}

/**
 * Add repository evaluation
 */
export async function addRepositoryEvaluation(
  projectId: string,
  evaluation: Omit<RepositoryEvaluation, 'evaluatedAt'>
): Promise<boolean> {
  const collection = await getCollection<Project>('projects');

  if (!ObjectId.isValid(projectId)) {
    return false;
  }

  const repoEval: RepositoryEvaluation = {
    ...evaluation,
    evaluatedAt: new Date()
  };

  // If comments are large, store in GridFS
  if (evaluation.comments.length > GRIDFS_THRESHOLD) {
    const fileId = await uploadMarkdown(
      evaluation.comments,
      `repo-eval-${projectId}-${Date.now()}.md`,
      {
        projectId,
        evaluationType: 'repository',
        evaluatedBy: evaluation.evaluatedBy
      }
    );
    repoEval.commentsFileId = fileId;
    repoEval.comments = ''; // Store empty string in document, actual content in GridFS
  }

  // If AI analysis is large, store in GridFS
  if (evaluation.aiAnalysis && evaluation.aiAnalysis.length > GRIDFS_THRESHOLD) {
    const fileId = await uploadMarkdown(
      evaluation.aiAnalysis,
      `ai-analysis-${projectId}-${Date.now()}.md`,
      {
        projectId,
        contentType: 'aiAnalysis',
        aiPromptUsed: evaluation.aiPromptUsed
      }
    );
    repoEval.aiAnalysisFileId = fileId;
    repoEval.aiAnalysis = ''; // Store empty string in document, actual content in GridFS
  }

  const result = await collection.updateOne(
    { _id: new ObjectId(projectId) },
    {
      $set: {
        'evaluations.repository': repoEval,
        updatedAt: new Date()
      }
    }
  );

  // Check if both evaluations are complete to update status
  const project = await findProjectById(projectId);
  if (
    project &&
    project.evaluations?.videoDemo &&
    project.evaluations?.repository
  ) {
    await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { status: 'evaluated' } }
    );
  }

  return result.modifiedCount > 0;
}

/**
 * Count projects by status
 */
export async function countProjectsByStatus(): Promise<
  Record<string, number>
> {
  const collection = await getCollection<Project>('projects');

  const result = await collection
    .aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
    .toArray();

  const counts: Record<string, number> = {
    pending: 0,
    submitted: 0,
    evaluated: 0
  };

  result.forEach((item) => {
    counts[item._id] = item.count;
  });

  return counts;
}

/**
 * Get student average score
 */
export async function getStudentAverageScore(
  studentEmail: string
): Promise<number | null> {
  const collection = await getCollection<Project>('projects');

  const projects = await collection
    .find({
      studentEmail,
      $or: [
        { 'evaluations.videoDemo.score': { $exists: true } },
        { 'evaluations.repository.score': { $exists: true } }
      ]
    })
    .toArray();

  if (projects.length === 0) return null;

  let totalScore = 0;
  let scoreCount = 0;

  projects.forEach((project) => {
    if (project.evaluations?.videoDemo?.score) {
      totalScore += project.evaluations.videoDemo.score;
      scoreCount++;
    }
    if (project.evaluations?.repository?.score) {
      totalScore += project.evaluations.repository.score;
      scoreCount++;
    }
  });

  return scoreCount > 0 ? totalScore / scoreCount : null;
}
