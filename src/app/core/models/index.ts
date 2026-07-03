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

// ── Addresses ─────────────────────────────────────────────────────
export type AddressType = 'Residential' | 'Postal';

export interface CreateAddressRequest {
  addressType: AddressType;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;   // 4-digit SA format, e.g. "2196"
  country?: string;     // defaults to "South Africa" server-side
}

export interface UpdateAddressRequest {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
}

export interface AddressResponse {
  addressId: number;
  candidateId: number;
  addressType: string;  // 'Residential' | 'Postal'
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Documents ─────────────────────────────────────────────────────
export interface CandidateDocumentResponse {
  candidateDocumentId: number;
  candidateId: number;
  documentType: string;        // 'CV' | 'MatricCertificate' | 'Qualification' | 'Certification' | 'Other'
  fileUrl: string;
  originalFileName: string;
  uploadedAt: string;
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
  documentType: string;   // matches DocumentType enum: CV, MatricCertificate, Qualification, Certification, Other
  isMandatory: boolean;
}

export interface VacancyResponse {
  vacancyId: number;
  title: string;
  description: string;
  vacancyType: string;          // 'Internal' | 'ClientPlacement'
  departmentId?: number;
  clientId?: number;
  employmentType: string;       // 'Permanent' | 'Contract' | 'Internship' | 'PartTime'
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  closingDate?: string;
  minYearsExperience?: number;
  requiredQualifications: string;
  requirements: string;
  status: string;               // 'Draft' | 'Published' | 'Closed'
  createdByRecruiterId: number;
  createdAt: string;
  skillIds: number[];
  requiredDocuments: RequiredDocumentDto[];   // ← NEW: recruiter-defined docs for this specific vacancy
}

// ── Applications ──────────────────────────────────────────────────
export interface CreateApplicationRequest {
  candidateId: number;
  vacancyId: number;
}

export interface ApplicationResponse {
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  status: string;               // 'Applied' | 'UnderReview' | 'Shortlisted' | 'OfferExtended' | 'Hired' | 'NotSelected'
  appliedAt: string;
  updatedAt?: string;
}

export interface UpdateApplicationStatusRequest {
  newStatus: string;
  changedByUserId: number;
}

export interface ApplicationStatusHistoryResponse {
  applicationStatusHistoryId: number;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
  changedAt: string;
}

// ── API Error shape ───────────────────────────────────────────────
export interface ApiError {
  message: string;
  missingDocumentTypes?: string[];
}