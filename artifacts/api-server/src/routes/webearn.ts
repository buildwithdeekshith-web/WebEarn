import { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  webearnDisputesTable as disputes,
  webearnMessagesTable as messages,
  webearnMilestonesTable as milestones,
  webearnPaymentsTable as payments,
  webearnProjectsTable as projects,
  webearnProposalsTable as proposals,
  webearnReviewsTable as reviews,
  webearnSubmissionsTable as submissions,
  webearnUsersTable as users,
} from "@workspace/db";
import {
  AcceptProposalParams,
  AcceptProposalResponse,
  ApproveProjectParams,
  ApproveProjectResponse,
  CreateProjectBody,
  CreateProjectResponse,
  CreateProposalBody,
  CreateProposalParams,
  CreateProposalResponse,
  CreateReviewBody,
  CreateReviewParams,
  CreateReviewResponse,
  GetAdminOverviewResponse,
  GetCurrentUserResponse,
  GetDashboardResponse,
  GetProjectParams,
  GetProjectResponse,
  GetPublicProfileParams,
  GetPublicProfileResponse,
  GetWorkspaceParams,
  GetWorkspaceResponse,
  ListAdminPaymentsResponse,
  ListAdminProjectsResponse,
  ListAdminUsersQueryParams,
  ListAdminUsersResponse,
  ListDisputesResponse,
  ListMessagesParams,
  ListMessagesResponse,
  ListProjectProposalsParams,
  ListProjectProposalsResponse,
  ListProjectsQueryParams,
  ListProjectsResponse,
  ListUserReviewsParams,
  ListUserReviewsResponse,
  OpenDisputeBody,
  OpenDisputeParams,
  OpenDisputeResponse,
  RequestRevisionBody,
  RequestRevisionParams,
  RequestRevisionResponse,
  ResolveDisputeBody,
  ResolveDisputeParams,
  ResolveDisputeResponse,
  SaveCurrentProfileBody,
  SaveCurrentProfileResponse,
  SendMessageBody,
  SendMessageParams,
  SendMessageResponse,
  SubmitProjectBody,
  SubmitProjectParams,
  SubmitProjectResponse,
  UpdateMilestoneBody,
  UpdateMilestoneParams,
  UpdateMilestoneResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type Viewer = typeof users.$inferSelect;

function authUserId(req: Request): string | null {
  try {
    return getAuth(req).userId ?? null;
  } catch {
    return null;
  }
}

async function viewerFor(req: Request): Promise<Viewer | null> {
  const id = authUserId(req);
  if (!id) return null;
  const [viewer] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return viewer ?? null;
}

async function canAdmin(req: Request): Promise<boolean> {
  const auth = getAuth(req);
  const claims = auth.sessionClaims as Record<string, unknown> | undefined;
  const metadata = claims?.["metadata"] as Record<string, unknown> | undefined;
  if (metadata?.["role"] === "admin") return true;
  const viewer = await viewerFor(req);
  return viewer?.role === "admin";
}

async function projectMember(projectId: number, userId: string): Promise<boolean> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return !!project && (project.businessId === userId || project.studentId === userId);
}

async function projectView(project: typeof projects.$inferSelect) {
  const [business] = await db.select().from(users).where(eq(users.id, project.businessId)).limit(1);
  const proposalRows = await db.select({ id: proposals.id }).from(proposals).where(eq(proposals.projectId, project.id));
  const student = project.studentId
    ? (await db.select().from(users).where(eq(users.id, project.studentId)).limit(1))[0]
    : undefined;
  return {
    id: project.id,
    businessId: project.businessId,
    businessName: business?.name ?? "Local business",
    title: project.title,
    category: project.category,
    about: project.about,
    requiredPages: project.requiredPages,
    requiredFeatures: project.requiredFeatures,
    minBudget: project.minBudget,
    maxBudget: project.maxBudget,
    deadline: project.deadline,
    referenceLinks: project.referenceLinks,
    notes: project.notes,
    status: project.status,
    proposalCount: proposalRows.length,
    studentId: project.studentId,
    studentName: student?.name ?? null,
    previewUrl: project.previewUrl,
    createdAt: project.createdAt,
    paymentStatus: project.paymentStatus,
  };
}

async function projectViews(rows: (typeof projects.$inferSelect)[]) {
  return Promise.all(rows.map(projectView));
}

async function proposalView(proposal: typeof proposals.$inferSelect) {
  const [student] = await db.select().from(users).where(eq(users.id, proposal.studentId)).limit(1);
  const studentReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.subjectId, proposal.studentId));
  const averageRating = studentReviews.length
    ? studentReviews.reduce((sum, review) => sum + review.rating, 0) / studentReviews.length
    : 0;
  return {
    ...proposal,
    studentName: student?.name ?? "Student",
    studentBio: student?.bio ?? "",
    studentRating: averageRating,
    studentSkills: student?.skills ?? [],
  };
}

async function currentUserData(viewer: Viewer) {
  const reviewRows = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.subjectId, viewer.id));
  const completed = await db.select({ id: projects.id, studentId: projects.studentId, status: projects.status })
    .from(projects)
    .where(and(eq(projects.status, "completed"), or(eq(projects.businessId, viewer.id), eq(projects.studentId, viewer.id))));
  const paid = await db.select({ amount: payments.amount }).from(payments).innerJoin(projects, eq(projects.id, payments.projectId))
    .where(and(eq(projects.studentId, viewer.id), eq(payments.status, "released")));
  return {
    id: viewer.id,
    email: viewer.email,
    name: viewer.name,
    role: viewer.role,
    bio: viewer.bio,
    category: viewer.category,
    location: viewer.location,
    availability: viewer.availability,
    skills: viewer.skills,
    portfolioLinks: viewer.portfolioLinks,
    rating: reviewRows.length ? reviewRows.reduce((sum, item) => sum + item.rating, 0) / reviewRows.length : 0,
    completedProjects: completed.length,
    earnings: paid.reduce((sum, item) => sum + item.amount, 0),
  };
}

async function isAdminOrProjectOwner(req: Request, project: typeof projects.$inferSelect) {
  if (await canAdmin(req)) return true;
  const viewer = await viewerFor(req);
  return !!viewer && viewer.id === project.businessId;
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const id = authUserId(req);
  if (!id) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  const [viewer] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const data = viewer
    ? await currentUserData(viewer)
    : { id, email: "", name: "Complete your profile", role: null, bio: null, category: null, location: null, availability: null, skills: [], portfolioLinks: [], rating: 0, completedProjects: 0, earnings: 0 };
  res.json(GetCurrentUserResponse.parse(data));
});

router.put("/auth/me", async (req, res): Promise<void> => {
  const id = authUserId(req);
  if (!id) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  const parsed = SaveCurrentProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const [saved] = await db.insert(users).values({
    id,
    email: input.email,
    name: input.name,
    role: input.role,
    bio: input.bio ?? "",
    category: input.category ?? "",
    location: input.location ?? "",
    availability: input.availability ?? "",
    skills: input.skills ?? [],
    portfolioLinks: input.portfolioLinks ?? [],
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      email: input.email,
      name: input.name,
      role: input.role,
      bio: input.bio ?? "",
      category: input.category ?? "",
      location: input.location ?? "",
      availability: input.availability ?? "",
      skills: input.skills ?? [],
      portfolioLinks: input.portfolioLinks ?? [],
    },
  }).returning();
  res.json(SaveCurrentProfileResponse.parse(await currentUserData(saved)));
});

router.get("/projects", async (req, res): Promise<void> => {
  const parsed = ListProjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, category, maxBudget, sort } = parsed.data;
  const filters = [eq(projects.status, "open")];
  if (category) filters.push(eq(projects.category, category));
  if (maxBudget !== undefined) filters.push(sql`${projects.minBudget} <= ${maxBudget}`);
  if (search) filters.push(or(ilike(projects.title, `%${search}%`), ilike(projects.about, `%${search}%`))!);
  const rows = await db.select().from(projects)
    .where(and(...filters))
    .orderBy(sort === "budget" ? projects.minBudget : desc(projects.createdAt));
  res.json(ListProjectsResponse.parse(await projectViews(rows)));
});

router.post("/projects", async (req, res): Promise<void> => {
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({ error: "Sign in and complete your profile to post a project." });
    return;
  }
  if (viewer.role !== "business") {
    res.status(403).json({ error: "Only business accounts can post projects." });
    return;
  }
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(projects).values({
    ...parsed.data,
    deadline: parsed.data.deadline ? parsed.data.deadline.toISOString().slice(0, 10) : null,
    businessId: viewer.id,
    status: "open",
    paymentStatus: "not_funded",
  }).returning();
  res.status(201).json(CreateProjectResponse.parse(await projectView(created)));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  res.json(GetProjectResponse.parse(await projectView(project)));
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const [existing] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  if (!(await isAdminOrProjectOwner(req, existing))) {
    res.status(403).json({ error: "Only the project owner or an admin can update this project." });
    return;
  }
  const [updated] = await db.update(projects).set(parsed.data).where(eq(projects.id, existing.id)).returning();
  res.json(UpdateProjectResponse.parse(await projectView(updated)));
});

router.get("/projects/:projectId/proposals", async (req, res): Promise<void> => {
  const params = ListProjectProposalsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewer = await viewerFor(req);
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  if (!viewer || (viewer.id !== project.businessId && !await canAdmin(req))) {
    const own = viewer ? await db.select().from(proposals).where(and(eq(proposals.projectId, project.id), eq(proposals.studentId, viewer.id))) : [];
    res.json(ListProjectProposalsResponse.parse(await Promise.all(own.map(proposalView))));
    return;
  }
  const rows = await db.select().from(proposals).where(eq(proposals.projectId, project.id)).orderBy(desc(proposals.createdAt));
  res.json(ListProjectProposalsResponse.parse(await Promise.all(rows.map(proposalView))));
});

router.post("/projects/:projectId/proposals", async (req, res): Promise<void> => {
  const params = CreateProposalParams.safeParse(req.params);
  const parsed = CreateProposalBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({ error: "Sign in to submit a proposal." });
    return;
  }
  if (viewer.role !== "student") {
    res.status(403).json({ error: "Only students can submit proposals." });
    return;
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!project || project.status !== "open") {
    res.status(404).json({ error: "This project is no longer accepting proposals." });
    return;
  }
  const [duplicate] = await db.select().from(proposals).where(and(eq(proposals.projectId, project.id), eq(proposals.studentId, viewer.id))).limit(1);
  if (duplicate) {
    res.status(409).json({ error: "You already sent a proposal for this project." });
    return;
  }
  const [created] = await db.insert(proposals).values({
    ...parsed.data,
    projectId: project.id,
    studentId: viewer.id,
    status: "pending",
  }).returning();
  res.status(201).json(CreateProposalResponse.parse(await proposalView(created)));
});

router.post("/proposals/:proposalId/accept", async (req, res): Promise<void> => {
  const params = AcceptProposalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [proposal] = await db.select().from(proposals).where(eq(proposals.id, params.data.proposalId)).limit(1);
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found." });
    return;
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, proposal.projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const viewer = await viewerFor(req);
  if (!viewer || (viewer.id !== project.businessId && !await canAdmin(req))) {
    res.status(403).json({ error: "Only the business owner can accept a proposal." });
    return;
  }
  const result = await db.transaction(async (tx) => {
    const [updated] = await tx.update(projects).set({
      studentId: proposal.studentId,
      status: "active",
      paymentStatus: "held",
    }).where(and(eq(projects.id, project.id), eq(projects.status, "open"), sql`${projects.studentId} IS NULL`)).returning();
    if (!updated) return null;
    await tx.update(proposals).set({ status: "declined" })
      .where(and(eq(proposals.projectId, project.id), ne(proposals.id, proposal.id)));
    await tx.update(proposals).set({ status: "accepted" }).where(eq(proposals.id, proposal.id));
    await tx.insert(milestones).values([
      { projectId: project.id, title: "Plan and content approved", completed: 0 },
      { projectId: project.id, title: "First website preview", completed: 0 },
      { projectId: project.id, title: "Final handoff", completed: 0 },
    ]);
    await tx.insert(payments).values({ projectId: project.id, amount: proposal.quote, status: "held" });
    return updated;
  });
  if (!result) {
    res.status(409).json({ error: "Another proposal has already been accepted for this project." });
    return;
  }
  res.json(AcceptProposalResponse.parse(await projectView(result)));
});

router.get("/projects/:projectId/workspace", async (req, res): Promise<void> => {
  const params = GetWorkspaceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewer = await viewerFor(req);
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  if (!viewer || (viewer.id !== project.businessId && viewer.id !== project.studentId && !await canAdmin(req))) {
    res.status(403).json({ error: "Only project participants can open this workspace." });
    return;
  }
  const [proposal] = await db.select().from(proposals).where(and(eq(proposals.projectId, project.id), eq(proposals.status, "accepted"))).limit(1);
  if (!proposal) {
    res.status(409).json({ error: "This project does not have an accepted proposal yet." });
    return;
  }
  const [milestoneRows, messageRows, submissionRows, disputeRows] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, project.id)),
    db.select().from(messages).where(eq(messages.projectId, project.id)).orderBy(messages.createdAt),
    db.select().from(submissions).where(eq(submissions.projectId, project.id)).orderBy(desc(submissions.createdAt)),
    db.select().from(disputes).where(eq(disputes.projectId, project.id)).orderBy(desc(disputes.createdAt)),
  ]);
  const [business] = await db.select().from(users).where(eq(users.id, project.businessId)).limit(1);
  const [student] = await db.select().from(users).where(eq(users.id, proposal.studentId)).limit(1);
  const [reviewExists] = await db.select().from(reviews).where(and(eq(reviews.projectId, project.id), eq(reviews.reviewerId, viewer.id))).limit(1);
  const messageDtos = await Promise.all(messageRows.map(async (message) => {
    const [sender] = await db.select().from(users).where(eq(users.id, message.senderId)).limit(1);
    return { ...message, senderName: sender?.name ?? "Member" };
  }));
  const disputeDtos = await Promise.all(disputeRows.map(async (dispute) => ({
    ...dispute,
    projectTitle: project.title,
  })));
  const dto = {
    project: await projectView(project),
    proposal: { ...proposal, studentName: student?.name ?? "Student", studentBio: student?.bio ?? "", studentRating: 0, studentSkills: student?.skills ?? [] },
    milestones: milestoneRows.map((item) => ({ ...item, completed: item.completed === 1 })),
    messages: messageDtos,
    submissions: submissionRows,
    disputes: disputeDtos,
    canReview: project.status === "completed" && !reviewExists && !!business && !!student,
  };
  res.json(GetWorkspaceResponse.parse(dto));
});

router.get("/projects/:projectId/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewer = await viewerFor(req);
  if (!viewer || !await projectMember(params.data.projectId, viewer.id)) {
    res.status(403).json({ error: "Only project participants can read messages." });
    return;
  }
  const rows = await db.select().from(messages).where(eq(messages.projectId, params.data.projectId)).orderBy(messages.createdAt);
  const data = await Promise.all(rows.map(async (message) => {
    const [sender] = await db.select().from(users).where(eq(users.id, message.senderId)).limit(1);
    return { ...message, senderName: sender?.name ?? "Member" };
  }));
  res.json(ListMessagesResponse.parse(data));
});

router.post("/projects/:projectId/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  const parsed = SendMessageBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const viewer = await viewerFor(req);
  if (!viewer || !await projectMember(params.data.projectId, viewer.id)) {
    res.status(403).json({ error: "Only project participants can message each other." });
    return;
  }
  const [created] = await db.insert(messages).values({
    projectId: params.data.projectId,
    senderId: viewer.id,
    text: parsed.data.text,
  }).returning();
  res.status(201).json(SendMessageResponse.parse({ ...created, senderName: viewer.name }));
});

router.patch("/projects/:projectId/milestones/:milestoneId", async (req, res): Promise<void> => {
  const params = UpdateMilestoneParams.safeParse(req.params);
  const parsed = UpdateMilestoneBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const viewer = await viewerFor(req);
  if (!viewer || !await projectMember(params.data.projectId, viewer.id)) {
    res.status(403).json({ error: "Only project participants can update milestones." });
    return;
  }
  const [updated] = await db.update(milestones).set({ completed: parsed.data.completed ? 1 : 0 })
    .where(and(eq(milestones.id, params.data.milestoneId), eq(milestones.projectId, params.data.projectId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Milestone not found." });
    return;
  }
  res.json(UpdateMilestoneResponse.parse({ ...updated, completed: updated.completed === 1 }));
});

router.post("/projects/:projectId/submissions", async (req, res): Promise<void> => {
  const params = SubmitProjectParams.safeParse(req.params);
  const parsed = SubmitProjectBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const viewer = await viewerFor(req);
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!viewer || !project || project.studentId !== viewer.id) {
    res.status(403).json({ error: "Only the assigned student can submit website work." });
    return;
  }
  if (!["active", "revision_requested"].includes(project.status)) {
    res.status(409).json({ error: "This project is not accepting a submission right now." });
    return;
  }
  const [submission] = await db.insert(submissions).values({ ...parsed.data, projectId: project.id }).returning();
  const [updated] = await db.update(projects).set({ status: "submitted", previewUrl: parsed.data.url })
    .where(eq(projects.id, project.id)).returning();
  res.status(201).json(SubmitProjectResponse.parse(submission));
  void updated;
});

router.post("/projects/:projectId/revision", async (req, res): Promise<void> => {
  const params = RequestRevisionParams.safeParse(req.params);
  const parsed = RequestRevisionBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const viewer = await viewerFor(req);
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!viewer || !project || (project.businessId !== viewer.id && !await canAdmin(req))) {
    res.status(403).json({ error: "Only the business owner can request revisions." });
    return;
  }
  if (project.status !== "submitted") {
    res.status(409).json({ error: "There is no submitted work to review." });
    return;
  }
  await db.insert(messages).values({ projectId: project.id, senderId: viewer.id, text: `Revision requested: ${parsed.data.message}` });
  const [updated] = await db.update(projects).set({ status: "revision_requested" }).where(eq(projects.id, project.id)).returning();
  res.json(RequestRevisionResponse.parse(await projectView(updated)));
});

router.post("/projects/:projectId/approve", async (req, res): Promise<void> => {
  const params = ApproveProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewer = await viewerFor(req);
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!viewer || !project || (project.businessId !== viewer.id && !await canAdmin(req))) {
    res.status(403).json({ error: "Only the business owner can approve the work." });
    return;
  }
  if (project.status !== "submitted") {
    res.status(409).json({ error: "Only submitted work can be approved." });
    return;
  }
  const [updated] = await db.update(projects).set({ status: "completed", paymentStatus: "released" }).where(eq(projects.id, project.id)).returning();
  await db.update(payments).set({ status: "released", updatedAt: new Date() }).where(eq(payments.projectId, project.id));
  if (project.studentId && project.previewUrl) {
    const [student] = await db.select().from(users).where(eq(users.id, project.studentId)).limit(1);
    if (student && !student.portfolioLinks.includes(project.previewUrl)) {
      await db.update(users).set({ portfolioLinks: [...student.portfolioLinks, project.previewUrl] })
        .where(eq(users.id, student.id));
    }
  }
  res.json(ApproveProjectResponse.parse(await projectView(updated)));
});

router.post("/projects/:projectId/disputes", async (req, res): Promise<void> => {
  const params = OpenDisputeParams.safeParse(req.params);
  const parsed = OpenDisputeBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const viewer = await viewerFor(req);
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!viewer || !project || (project.businessId !== viewer.id && project.studentId !== viewer.id)) {
    res.status(403).json({ error: "Only project participants can open a dispute." });
    return;
  }
  const [opened] = await db.insert(disputes).values({ projectId: project.id, openedBy: viewer.id, reason: parsed.data.reason }).returning();
  await db.update(projects).set({ status: "disputed", paymentStatus: "disputed" }).where(eq(projects.id, project.id));
  await db.update(payments).set({ status: "disputed", updatedAt: new Date() }).where(eq(payments.projectId, project.id));
  res.status(201).json(OpenDisputeResponse.parse({ ...opened, projectTitle: project.title }));
});

router.get("/users/:userId/profile", async (req, res): Promise<void> => {
  const params = GetPublicProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [profile] = await db.select().from(users).where(eq(users.id, params.data.userId)).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const [reviewRows, work] = await Promise.all([
    db.select().from(reviews).where(eq(reviews.subjectId, profile.id)).orderBy(desc(reviews.createdAt)),
    db.select().from(projects).where(and(eq(projects.studentId, profile.id), eq(projects.status, "completed"))),
  ]);
  const reviewDtos = await Promise.all(reviewRows.map(async (review) => {
    const [reviewer] = await db.select().from(users).where(eq(users.id, review.reviewerId)).limit(1);
    return { ...review, reviewerName: reviewer?.name ?? "Member" };
  }));
  const dto = {
    id: profile.id,
    name: profile.name,
    role: profile.role ?? "student",
    bio: profile.bio,
    category: profile.category,
    location: profile.location,
    availability: profile.availability,
    skills: profile.skills,
    portfolioLinks: profile.portfolioLinks,
    completedProjects: work.length,
    rating: reviewDtos.length ? reviewDtos.reduce((sum, review) => sum + review.rating, 0) / reviewDtos.length : 0,
    reviews: reviewDtos,
  };
  res.json(GetPublicProfileResponse.parse(dto));
});

router.get("/users/:userId/reviews", async (req, res): Promise<void> => {
  const params = ListUserReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db.select().from(reviews).where(eq(reviews.subjectId, params.data.userId)).orderBy(desc(reviews.createdAt));
  const dto = await Promise.all(rows.map(async (review) => {
    const [reviewer] = await db.select().from(users).where(eq(users.id, review.reviewerId)).limit(1);
    return { ...review, reviewerName: reviewer?.name ?? "Member" };
  }));
  res.json(ListUserReviewsResponse.parse(dto));
});

router.post("/projects/:projectId/reviews", async (req, res): Promise<void> => {
  const params = CreateReviewParams.safeParse(req.params);
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const viewer = await viewerFor(req);
  const [project] = await db.select().from(projects).where(eq(projects.id, params.data.projectId)).limit(1);
  if (!viewer || !project || (project.businessId !== viewer.id && project.studentId !== viewer.id)) {
    res.status(403).json({ error: "Only project participants can leave a review." });
    return;
  }
  if (project.status !== "completed") {
    res.status(409).json({ error: "Reviews are available after work is approved." });
    return;
  }
  const subjectId = viewer.id === project.businessId ? project.studentId : project.businessId;
  if (!subjectId) {
    res.status(409).json({ error: "The other project profile is missing." });
    return;
  }
  const [existing] = await db.select().from(reviews).where(and(eq(reviews.projectId, project.id), eq(reviews.reviewerId, viewer.id))).limit(1);
  if (existing) {
    res.status(409).json({ error: "You already reviewed this project." });
    return;
  }
  const [review] = await db.insert(reviews).values({ ...parsed.data, projectId: project.id, reviewerId: viewer.id, subjectId }).returning();
  res.status(201).json(CreateReviewResponse.parse({ ...review, reviewerName: viewer.name }));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({ error: "Sign in to view your dashboard." });
    return;
  }
  const rows = await db.select().from(projects)
    .where(viewer.role === "business" ? eq(projects.businessId, viewer.id) : eq(projects.studentId, viewer.id))
    .orderBy(desc(projects.createdAt));
  const projectIds = rows.map((project) => project.id);
  const proposalRows = projectIds.length
    ? await db.select().from(proposals).where(inArray(proposals.projectId, projectIds))
    : [];
  const studentProposals = viewer.role === "student"
    ? await db.select().from(proposals).where(eq(proposals.studentId, viewer.id))
    : [];
  const pending = viewer.role === "business"
    ? proposalRows.filter((item) => item.status === "pending").length
    : studentProposals.filter((item) => item.status === "pending").length;
  const completed = rows.filter((project) => project.status === "completed").length;
  const earned = viewer.role === "student"
    ? (await db.select({ amount: payments.amount }).from(payments).innerJoin(projects, eq(projects.id, payments.projectId))
      .where(and(eq(projects.studentId, viewer.id), eq(payments.status, "released")))).reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const activity = rows.slice(0, 6).map((project) => ({
    id: `project-${project.id}`,
    text: `${project.title} is ${project.status.replaceAll("_", " ")}.`,
    createdAt: project.createdAt,
    projectId: project.id,
  }));
  const dto = {
    activeProjects: rows.filter((project) => !["completed", "cancelled"].includes(project.status)).length,
    openProposals: pending,
    completedProjects: completed,
    earnings: earned,
    projects: await projectViews(rows.slice(0, 8)),
    activity,
  };
  res.json(GetDashboardResponse.parse(dto));
});

router.get("/admin/overview", async (req, res): Promise<void> => {
  if (!await canAdmin(req)) {
    res.status(403).json({ error: "Admin access is required." });
    return;
  }
  const [userRows, projectRows, disputeRows, paymentRows] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select().from(projects),
    db.select().from(disputes).where(eq(disputes.status, "open")),
    db.select().from(payments).where(eq(payments.status, "held")),
  ]);
  res.json(GetAdminOverviewResponse.parse({
    users: userRows.length,
    projects: projectRows.length,
    openProjects: projectRows.filter((project) => project.status === "open").length,
    activeDisputes: disputeRows.length,
    heldPayments: paymentRows.reduce((sum, payment) => sum + payment.amount, 0),
  }));
});

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!await canAdmin(req)) {
    res.status(403).json({ error: "Admin access is required." });
    return;
  }
  const parsed = ListAdminUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db.select().from(users);
  const filtered = parsed.data.search
    ? rows.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(parsed.data.search!.toLowerCase()))
    : rows;
  const dto = await Promise.all(filtered.map(currentUserData));
  res.json(ListAdminUsersResponse.parse(dto));
});

router.get("/admin/projects", async (req, res): Promise<void> => {
  if (!await canAdmin(req)) {
    res.status(403).json({ error: "Admin access is required." });
    return;
  }
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  res.json(ListAdminProjectsResponse.parse(await projectViews(rows)));
});

router.get("/admin/disputes", async (req, res): Promise<void> => {
  if (!await canAdmin(req)) {
    res.status(403).json({ error: "Admin access is required." });
    return;
  }
  const rows = await db.select().from(disputes).orderBy(desc(disputes.createdAt));
  const dto = await Promise.all(rows.map(async (dispute) => {
    const [project] = await db.select().from(projects).where(eq(projects.id, dispute.projectId)).limit(1);
    return { ...dispute, projectTitle: project?.title ?? "Project" };
  }));
  res.json(ListDisputesResponse.parse(dto));
});

router.post("/admin/disputes/:disputeId/resolve", async (req, res): Promise<void> => {
  if (!await canAdmin(req)) {
    res.status(403).json({ error: "Admin access is required." });
    return;
  }
  const params = ResolveDisputeParams.safeParse(req.params);
  const parsed = ResolveDisputeBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Invalid request." });
    return;
  }
  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, params.data.disputeId)).limit(1);
  if (!dispute) {
    res.status(404).json({ error: "Dispute not found." });
    return;
  }
  const [resolved] = await db.update(disputes).set({ status: parsed.data.resolution === "dismiss" ? "dismissed" : "resolved", resolution: parsed.data.note ?? parsed.data.resolution })
    .where(eq(disputes.id, dispute.id)).returning();
  const paymentStatus = parsed.data.resolution === "release_to_student" ? "released" : parsed.data.resolution === "refund_business" ? "refunded" : "held";
  const projectStatus = parsed.data.resolution === "release_to_student" ? "completed" : parsed.data.resolution === "refund_business" ? "cancelled" : "active";
  await db.update(payments).set({ status: paymentStatus, updatedAt: new Date() }).where(eq(payments.projectId, dispute.projectId));
  await db.update(projects).set({ status: projectStatus, paymentStatus }).where(eq(projects.id, dispute.projectId));
  const [project] = await db.select().from(projects).where(eq(projects.id, dispute.projectId)).limit(1);
  res.json(ResolveDisputeResponse.parse({ ...resolved, projectTitle: project?.title ?? "Project" }));
});

router.get("/admin/payments", async (req, res): Promise<void> => {
  if (!await canAdmin(req)) {
    res.status(403).json({ error: "Admin access is required." });
    return;
  }
  const rows = await db.select().from(payments).orderBy(desc(payments.updatedAt));
  const dto = await Promise.all(rows.map(async (payment) => {
    const [project] = await db.select().from(projects).where(eq(projects.id, payment.projectId)).limit(1);
    return { ...payment, projectTitle: project?.title ?? "Project" };
  }));
  res.json(ListAdminPaymentsResponse.parse(dto));
});

export default router;
