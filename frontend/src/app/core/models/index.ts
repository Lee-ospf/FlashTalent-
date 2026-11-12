// ── Auth ──────────────────────────────────────────────────────────
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateRecruiterRequest {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  departmentId: number;
}
export interface CreateUserResponse {
  message: string;
  temporaryPassword: string;
}
// ── Candidate ─────────────────────────────────────────────────────
// NOTE: `address` was removed from these DTOs by the backend team.
// Address is now its own resource — see AddressResponse below.
export interface CreateCandidateRequest {
  userId: number;
  phone?: string;
  gender?: string;
  race?: string;
  nationality?: string;
  dateOfBirth?: string;
}

export interface UpdateCandidateRequest {
  phone?: string;
  gender?: string;
  race?: string;
  nationality?: string;
  dateOfBirth?: string;
}

export interface CandidateResponse {
  candidateId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  race?: string;
  nationality?: string;
  dateOfBirth?: string;
  registeredAt: string;
  uploadedDocumentTypes: string[];
}
//--- HR--------------------------------
export type ProjectStatus = 'Active' | 'Closed';

export interface ProjectListItem {
  projectId: number;
  name: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  skillCount: number;
  departmentName: string | null;
  memberCount: number;
  lastMatchedAt: string | null;
  createdByName: string;
  createdAt: string;
}

export interface EmployeeListItem {
  employeeId: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  hireDate?: string | null;
  status?: string;
}
export interface DepartmentResponse {
  departmentId: number;
  name: string;
  isActive: boolean;
  headCount: number; // new
}
export const isActiveProject = (p: ProjectListItem): boolean =>
  p.status === 'Active' || (p.status as unknown) === 0;
// ── Addresses ─────────────────────────────────────────────────────
export type AddressType = 'Residential' | 'Postal';

export interface CreateAddressRequest {
  addressType: AddressType;
  line1: string;
  city: string;
  province: string;
  postalCode: string; // 4-digit SA format, e.g. "2196"
  country?: string; // defaults to "South Africa" server-side
}

export interface UpdateAddressRequest {
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
}

export interface AddressResponse {
  addressId: number;
  candidateId: number;
  addressType: string; // 'Residential' | 'Postal'
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AddressDetails {
  line1: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
}

// ── Documents ─────────────────────────────────────────────────────
export interface CandidateDocumentResponse {
  candidateDocumentId: number;
  candidateId: number;
  documentType: string; // 'CV' | 'MatricCertificate' | 'Qualification' | 'Certification' | 'Other'
  fileUrl: string;
  originalFileName: string;
  uploadedAt: string;
  qualificationId?: number;
}

export interface MandatoryDocumentsStatusResponse {
  candidateId: number;
  hasCv: boolean;
  hasMatricCertificate: boolean;
  allMandatoryDocumentsPresent: boolean;
  missingDocumentTypes: string[];
}

// ── Vacancies ─────────────────────────────────────────────────────
export interface RequiredDocumentDto {
  documentType: string; // matches DocumentType enum: CV, MatricCertificate, Qualification, Certification, Other
  isMandatory: boolean;
}

export interface VacancyResponse {
  vacancyId: number;
  title: string;
  description: string;
  vacancyType: string; // 'Internal' | 'ClientPlacement'
  departmentId?: number;
  clientId?: number;
  employmentType: string; // 'Permanent' | 'Contract' | 'Internship' | 'PartTime'
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  closingDate?: string;
  minYearsExperience?: number;
  requiredQualifications: string;
  requirements: string;
  status: string; // 'Draft' | 'Published' | 'Closed'
  createdByRecruiterId: number;
  createdAt: string;
  publishedAt?: string;
  skills: VacancySkillDto[];
  requiredDocuments: RequiredDocumentDto[];
}

// ── Applications ──────────────────────────────────────────────────
export interface CreateApplicationRequest {
  candidateId: number;
  vacancyId: number;
}
export interface VacancySkillDto {
  skillId: number;
  isRequired: boolean;
  proficiencyLevel: string;
}
export interface ApplicationResponse {
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  status: string; // 'Applied' | 'UnderReview' | 'Shortlisted' | 'OfferExtended' | 'Hired' | 'NotSelected'
  appliedAt: string;
  updatedAt?: string;
  employeeId?: number | null;
}
export interface ApplicationReviewResponse {
  application: {
    applicationId: number;
    status: string;
    appliedAt: string;
  };
  candidate: {
    candidateId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    cvUrl?: string;
    skills: {
      skillId: number;
      skillName: string;
      category: string;
      proficiencyLevel: string;
    }[];
    qualifications: {
      name: string;
      institution: string;
      yearCompleted: string;
    }[];
    certifications: {
      name: string;
      institution: string;
      yearCompleted: string;
    }[];
    experiences: {
      company: string;
      role: string;
      startDate: string;
      endDate?: string;
      projectsAndDuties?: string;
    }[];
  };
  vacancy: {
    vacancyId: number;
    title: string;
    description: string;
    employmentType: string;
    location?: string;
    minYearsExperience?: number;
    requiredQualifications: string;
    requirements: string;
    vacancyType: string;
    postedFor?: string;
    requiredSkills: {
      skillId: number;
      skillName: string;
      isRequired: boolean;
      proficiencyLevel?: string;
    }[];
  };
}
export interface UpdateApplicationStatusRequest {
  newStatus: string;
  // Optional - the backend now derives who made the change from the logged-in user's
  // token, not from this field. Kept optional rather than removed in case anything
  // else still references it, but it's safe to omit when calling updateStatus().
  changedByUserId?: number;
}
export interface ApplicationActivityEntry {
  eventType: string;
  title: string;
  detail?: string;
  occurredAt: string;
  actorName?: string;
}
// ── API Error shape ───────────────────────────────────────────────
export interface ApiError {
  message: string;
  missingDocumentTypes?: string[];
}
export interface VacancySkillInput {
  skillId: number;
  isRequired: boolean;
  proficiencyLevel: string;
}

export interface RequiredDocumentInput {
  documentType: string;
  isMandatory: boolean;
}

export interface CreateVacancyRequest {
  recruiterId: number;
  title: string;
  description: string;
  vacancyType: 'Internal' | 'ClientPlacement';
  departmentId?: number;
  clientId?: number;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  closingDate: string;
  minYearsExperience: number;
  requiredQualifications: string;
  requirements?: string;
  skills: VacancySkillInput[];
  requiredDocuments: RequiredDocumentInput[];
}

export interface UpdateVacancyRequest extends Omit<
  CreateVacancyRequest,
  'recruiterId'
> {}
export interface SkillResponse {
  skillId: number;
  name: string;
  category: string;
}

export interface DepartmentResponse {
  departmentId: number;
  name: string;
  isActive: boolean;
}

export interface ClientResponse {
  clientId: number;
  clientName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface RecruiterResponse {
  recruiterId: number;
  userId: number;
  jobTitle?: string;
  fullName?: string;
  email?: string;
}
// ── Client (admin) ──────────────────────────────────────────────
export interface CreateClientRequest {
  clientName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// ── Candidate Skills ─────────────────────────────────────────────
export interface CandidateSkillResponse {
  candidateSkillId: number;
  skillId: number;
  skillName: string;
  category: string;
  proficiencyLevel: string;
  addedAt: string;
}

export interface AssignSkillsRequest {
  skills: { skillId: number; proficiencyLevel: string }[];
}

// ── Candidate Experience ──────────────────────────────────────────
export interface CreateExperienceRequest {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  projectsAndDuties?: string;
}

export interface ExperienceResponse {
  candidateExperienceId: number;
  candidateId: number;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  projectsAndDuties?: string;
}

// ── Candidate Qualifications ──────────────────────────────────────
export type QualificationType = 'Education' | 'Certification';

export interface CreateQualificationRequest {
  qualificationType: QualificationType;
  name: string;
  institution: string;
  yearCompleted: string; // ISO date string — backend stores this as DateTime, not a plain year
}

export interface QualificationResponse {
  candidateQualificationId: number;
  candidateId: number;
  qualificationType: string;
  name: string;
  institution: string;
  yearCompleted: string;
}
// ── Interviews ────────────────────────────────────────────────────
export type InterviewType = 'InPerson' | 'Virtual';
export type InterviewCategory =
  | 'Technical'
  | 'Behavioral'
  | 'Panel'
  | 'Managerial';

export interface ScheduleInterviewRequest {
  interviewType: InterviewType;
  interviewCategory: InterviewCategory;
  scheduledAt: string; // ISO string
  durationMinutes?: number;
  location?: string;
  meetingLink?: string;
  // Extra guest emails the organizer wants on the calendar invite, on top
  // of the candidate (e.g. a hiring manager or co-interviewer).
  guestEmails?: string[];
  ignoreCalendarConflicts?: boolean;
}

export interface RescheduleInterviewRequest {
  scheduledAt: string;
  durationMinutes?: number;
  interviewType?: InterviewType;
  location?: string;
  meetingLink?: string;
  // Omit to leave the existing guest list as-is; pass a (possibly empty)
  // array to replace it.
  guestEmails?: string[];
  rescheduleReason: string;
  ignoreCalendarConflicts?: boolean;
}

// ── Calendar integration ─────────────────────────────────────────
export type CalendarIntegrationStatus =
  | 'NotIntegrated'
  | 'Created'
  | 'Updated'
  | 'Cancelled'
  | 'Failed';

export interface CalendarConflictDto {
  conflictStart: string;
  conflictEnd: string;
}

export interface CalendarAvailabilityResponse {
  isAvailable: boolean;
  calendarConnected: boolean;
  calendarProvider?: 'Google' | 'Microsoft' | null;
  conflicts: CalendarConflictDto[];
}

// Shape of the 409 body InterviewsController returns on a scheduling conflict.
export interface CalendarConflictErrorBody {
  message: string;
  conflicts: CalendarConflictDto[];
}

export interface SetInterviewOutcomeRequest {
  outcome: 'Passed' | 'Failed';
  recruiterNotes?: string;
}
export interface InterviewRescheduleResponse {
  oldScheduledAt: string;
  newScheduledAt: string;
  reason: string;
  changedByName: string;
  changedAt: string;
}
export interface InterviewResponse {
  interviewId: number;
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  roundNumber: number;
  interviewType: string;
  interviewCategory: InterviewCategory;
  scheduledAt: string;
  location?: string;
  meetingLink?: string;
  guestEmails: string[];
  status: string; // 'Scheduled' | 'Completed' | 'Cancelled'
  outcome: string; // 'Pending' | 'Passed' | 'Failed'
  recruiterNotes?: string;
  createdAt: string;
  completedAt?: string;

  // Calendar sync outcome (Google or Microsoft) for this interview (populated by the backend
  // after every schedule/reschedule/cancel/retry call).
  calendarIntegrationStatus: CalendarIntegrationStatus;
  calendarEventId?: string;
  calendarProvider?: string;
  calendarIntegrationError?: string;
}

//_______Precreening_________________
export interface PrescreeningResponse {
  prescreeningId: number;
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  status: string;
  sentAt: string;
  completedFileUrl: string | null;
  completedOriginalFileName: string | null;
  submittedAt: string | null;
  outcome: string;
  recruiterNotes: string | null;
  reviewedAt: string | null;
}

// ── Notifications ─────────────────────────────────────────────────
export interface NotificationResponse {
  notificationId: number;
  notificationType: string;
  subject: string;
  body: string;
  actionUrl?: string;
  isRead: boolean;
  sentAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ── AI Resume Parsing ────────────────────────────────────────────

export interface ParsedSkill {
  name: string;
  category?: string; // 'Technical' | 'SoftSkill' — matches SkillResponse.category directly, no translation needed
  proficiencyLevel: string; // 'Beginner' | 'Intermediate' | 'Expert' — matches this app's vocabulary directly
}

export interface ParsedQualification {
  qualificationType: string; // 'Education' | 'Certification'
  name: string;
  institution: string;
  yearCompleted?: string; // ISO date string, or absent — treat as AI-guessed, not confirmed (see design notes on date reliability)
}

export interface ParsedExperience {
  company: string;
  role: string;
  startDate?: string; // ISO date string, or absent if unclear
  endDate?: string; // absent = current role
  projectsAndDuties?: string;
}

export interface ParsedResumeResponse {
  phone?: string;
  skills: ParsedSkill[];
  qualifications: ParsedQualification[];
  experiences: ParsedExperience[];
}

// ── AI Talent Pool Matching ────────────────────────────────────────
export interface AiTalentPoolMatchResponse {
  talentPoolMatchId: number;
  candidateId: number;
  candidateName: string;
  candidateEmail?: string;
  score: number;
  reasoning: string;
  invitedAt?: string;
  computedAt: string;
}

export interface TalentPoolPullResponse {
  vacancyId: number;
  pulledAt: string;
  vacancyStatus: string;
  matches: AiTalentPoolMatchResponse[];
}

export interface ApplicantRankingResponse {
  vacancyId: number;
  rankedAt: string;
  matches: AiTalentPoolMatchResponse[];
}

export interface InvitedCandidateRow {
  candidateId: number;
  candidateName: string;
  score: number;
  invitedAt: string;
  hasApplied: boolean;
  appliedAt?: string;
}

export interface TalentPoolInviteSummaryResponse {
  vacancyId: number;
  totalInvited: number;
  totalApplied: number;
  invitees: InvitedCandidateRow[];
}

//trailning models
// Training module types. The API serialises enums as strings.

export type AssignmentStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'AwaitingConfirmation'
  | 'Completed'
  | 'NotCompleted';

export type IntakeState = 'Upcoming' | 'Running' | 'Ended';

// ── Programmes ──────────────────────────────────────────────
export interface ProgrammeListItem {
  trainingProgrammeId: number;
  title: string;
  provider: string | null;
  category: string | null;
  durationHours: number | null;
  isActive: boolean;
  skillCount: number;
  intakeCount: number;
  openIntakeCount: number;
  createdAt: string;
}

export interface ProgrammeSkill {
  skillId: number;
  skillName: string;
}

export interface ProgrammeResponse {
  trainingProgrammeId: number;
  title: string;
  description: string | null;
  provider: string | null;
  category: string | null;
  durationHours: number | null;
  url: string | null;
  isActive: boolean;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string | null;
  intakeCount: number;
  openIntakeCount: number;
  skills: ProgrammeSkill[];
}

export interface SaveProgrammeRequest {
  title: string;
  description: string | null;
  provider: string | null;
  category: string | null;
  durationHours: number | null;
  url: string | null;
  skillIds: number[];
}

// ── Intakes ─────────────────────────────────────────────────
export interface IntakeListItem {
  trainingIntakeId: number;
  trainingProgrammeId: number;
  programmeTitle: string;
  name: string;
  startDate: string;
  endDate: string;
  state: IntakeState;
  maxParticipants: number | null;
  assignmentCount: number;
  completedCount: number;
}

export interface IntakeResponse {
  trainingIntakeId: number;
  trainingProgrammeId: number;
  programmeTitle: string;
  name: string;
  startDate: string;
  endDate: string;
  state: IntakeState;
  maxParticipants: number | null;
  spotsLeft: number | null; // null = no maximum
  assignmentCount: number;
  completedCount: number;
  awaitingConfirmationCount: number;
  closedAt: string | null;
  closedByName: string | null;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

export interface SaveIntakeRequest {
  name: string;
  startDate: string | null;
  endDate: string | null;
  maxParticipants: number | null;
}

export interface CreateIntakeRequest extends SaveIntakeRequest {
  trainingProgrammeId: number;
}

// ── Assignments (HR) ────────────────────────────────────────
export interface AssignmentListItem {
  trainingAssignmentId: number;
  trainingIntakeId: number;
  employeeId: number;
  employeeName: string;
  jobTitle: string | null;
  departmentName: string | null;
  status: AssignmentStatus;
  progressPercent: number;
  dueDate: string;
  isOverdue: boolean;
  assignedAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  rejectionReason: string | null;
}

export interface AssignEmployeesRequest {
  employeeIds: number[];
  dueDate: string | null; // null = the intake's end date
}

export interface AssignedEmployee {
  employeeId: number;
  employeeName: string;
  trainingAssignmentId: number;
  dueDate: string;
}

export interface SkippedEmployee {
  employeeId: number;
  employeeName: string | null;
  reason: string;
}

export interface AssignEmployeesResponse {
  added: AssignedEmployee[];
  skipped: SkippedEmployee[];
}

export interface AwaitingConfirmationItem {
  trainingAssignmentId: number;
  employeeId: number;
  employeeName: string;
  jobTitle: string | null;
  departmentName: string | null;
  trainingProgrammeId: number;
  programmeTitle: string;
  trainingIntakeId: number;
  intakeName: string;
  dueDate: string;
  submittedAt: string; // UTC, no Z
  daysWaiting: number;
  wasRejectedBefore: boolean;
  previousRejectionReason: string | null;
}

export interface TrainingReviewResponse {
  trainingAssignmentId: number;
  status: AssignmentStatus;
  confirmedAt: string | null;
  confirmedByUserId: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface NeedsResolutionItem {
  trainingAssignmentId: number;
  employeeId: number;
  employeeName: string;
  jobTitle: string | null;
  departmentName: string | null;
  trainingProgrammeId: number;
  programmeTitle: string;
  trainingIntakeId: number;
  intakeName: string;
  intakeEndDate: string;
  intakeClosedEarly: boolean;
  status: AssignmentStatus;
  progressPercent: number;
  dueDate: string;
  isOverdue: boolean;
}

export interface MoveToIntakeRequest {
  targetIntakeId: number;
  dueDate: string | null;
}

export interface TrainingResolutionResponse {
  trainingAssignmentId: number;
  status: AssignmentStatus;
  notCompletedAt: string | null;
  newTrainingAssignmentId: number | null;
  newTrainingIntakeId: number | null;
  newDueDate: string | null;
}

// ── Compliance ──────────────────────────────────────────────
export interface OverdueTrainingItem {
  trainingAssignmentId: number;
  employeeId: number;
  employeeName: string;
  jobTitle: string | null;
  departmentName: string | null;
  trainingProgrammeId: number;
  programmeTitle: string;
  trainingIntakeId: number;
  intakeName: string;
  status: AssignmentStatus;
  progressPercent: number;
  dueDate: string;
  daysOverdue: number;
}

export interface ComplianceSummary {
  expiringIn90Days: number;
  expiringIn30Days: number;
  expiringIn7Days: number;
  expired: number;
  certificatesWithNoExpiryDate: number;
  overdueTraining: number;
  awaitingConfirmation: number;
}

// ── Employee self-service ───────────────────────────────────
export interface MyTraining {
  trainingAssignmentId: number;
  trainingProgrammeId: number;
  programmeTitle: string;
  provider: string | null;
  category: string | null;
  durationHours: number | null;
  url: string | null;
  trainingIntakeId: number;
  intakeName: string;
  intakeStartDate: string;
  intakeEndDate: string;
  intakeState: IntakeState;
  status: AssignmentStatus;
  progressPercent: number;
  dueDate: string;
  isOverdue: boolean;
  assignedAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  canUpdateProgress: boolean;
  canSubmit: boolean;
  canWithdraw: boolean;
}

export type CareerGoalStatus = 'Active' | 'Achieved' | 'Archived';
export type AdviceStatus = 'Suggested' | 'Accepted' | 'Dismissed';
export type AdviceLevel = 'Beginner' | 'Intermediate' | 'Expert';

export interface CareerGoalResponse {
  careerGoalId: number;
  employeeId: number;
  targetRole: string;
  targetDate: string | null;
  status: CareerGoalStatus;
  shareWithHr: boolean;
  createdAt: string;
  updatedAt: string | null;
  hasAdvice: boolean;
  adviceGeneratedAt: string | null;
}

export interface SaveCareerGoalRequest {
  targetRole: string;
  targetDate: string | null;
  shareWithHr: boolean;
}

export interface AdviceIntake {
  trainingIntakeId: number;
  name: string;
  startDate: string;
  endDate: string;
  spotsLeft: number | null; // null = no maximum
}

export interface AdviceProgramme {
  trainingProgrammeId: number;
  title: string;
  provider: string | null;
  category: string | null;
  durationHours: number | null;
  isActive: boolean;
  nextOpenIntake: AdviceIntake | null;
}

export interface AdviceItem {
  skillSuggestionItemId: number; // the id used by PATCH skill-advice-items/{id}/status
  sortOrder: number;
  skillId: number | null;
  skillName: string;
  targetLevel: AdviceLevel | null;
  advice: string;
  status: AdviceStatus;
  programme: AdviceProgramme | null;
  isAlreadyAssigned: boolean;
  externalIdea: string | null;
}

export interface AdviceResponse {
  skillSuggestionId: number;
  source: 'CareerGoal' | 'Project';
  employeeId: number;
  careerGoalId: number | null;
  projectId: number | null;
  summary: string | null;
  generatedAt: string;
  modelVersion: string | null;
  isStale: boolean;
  generationsLeft: number;
  items: AdviceItem[];
}
