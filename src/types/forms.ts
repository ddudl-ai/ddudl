// Form types based on data-model.md entities for the post writing form refactoring

export interface PostFormData {
  // 기본 정보
  id?: string;              // 수정 모드일 때만 존재
  title: string;            // 제목 (5-300자)
  content: string;          // 본문 내용 (선택)
  authorName: string;       // 작성자명 (로그인 유저에서 자동 설정)
  channelName: string;      // channel 이름

  // 메타데이터
  selectedFlair?: string;   // 선택된 플레어
  allowGuestComments: boolean; // 게스트 comment 허용 여부

  // 타임스탬프
  createdAt?: Date;         // 생성 시간
  updatedAt?: Date;         // 수정 시간
}

export interface UploadedImage {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt: Date;
}

export interface PastedImage extends UploadedImage {
  source: 'clipboard' | 'drag-drop';
}

export interface ImageUploadState {
  // 업로드 상태
  uploading: boolean;
  uploadingFiles: string[];    // 업로드 중인 파일명 목록
  uploadProgress: Map<string, number>; // 파일별 진행률

  // 업로드된 이미지
  images: UploadedImage[];
  pastedImages: PastedImage[];

  // error 상태
  uploadErrors: Map<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  error: string;
  code: string;
  field?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  touched: Set<string>;  // user가 터치한 필드
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  error?: boolean;
  loading?: boolean;
}

// Form State Machine Types
export type FormStatus = 'INITIAL' | 'EDITING' | 'VALIDATING' | 'SUBMITTING' | 'SUCCESS' | 'ERROR';

export type UploadStatus = 'IDLE' | 'PREPARING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

// Validation Rules Types
export interface TitleValidationRules {
  required: boolean;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  messages: {
    required: string;
    minLength: string;
    maxLength: string;
    pattern: string;
  };
}

export interface ContentValidationRules {
  required: boolean;
  maxLength: number;
  validateLinks: boolean;
  sanitizeHtml: boolean;
  messages: {
    maxLength: string;
    invalidLink: string;
  };
}

export interface ImageValidationRules {
  maxSize: number;
  maxCount: number;
  allowedTypes: string[];
  dimensions: {
    maxWidth: number;
    maxHeight: number;
    minWidth: number;
    minHeight: number;
  };
  messages: {
    maxSize: string;
    maxCount: string;
    invalidType: string;
    dimensions: string;
  };
}

export interface AuthorValidationRules {
  required: boolean;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  reserved: string[];
  messages: {
    required: string;
    pattern: string;
    reserved: string;
  };
}

// Storage Types
export interface DraftStorage {
  key: `draft_${string}`;  // draft_{channelName}
  value: {
    formData: Partial<PostFormData>;
    savedAt: Date;
    expiresAt: Date;  // 7일 후
  };
}

export interface TempStorage {
  key: 'temp_upload_queue';
  value: {
    files: File[];
    processedCount: number;
    totalCount: number;
  };
}

// API Contract Types
export interface CreatePostRequest {
  title: string;
  content?: string;
  channelName: string;
  authorName: string;
  flair?: string;
  images?: string[];  // URLs
  allowGuestComments?: boolean;
}

export interface CreatePostResponse {
  post: {
    id: string;
    title: string;
    content?: string;
    authorName: string;
    channelName: string;
    flair?: string;
    images: string[];
    allowGuestComments: boolean;
    createdAt: string;
  };
}

export interface UploadImageRequest {
  file: File;
  optimize?: boolean;  // WebP 변환 여부
}

export interface UploadImageResponse {
  url: string;
  processedSize: number;
  originalSize: number;
  compressionRatio: number;
  format: string;
}

export interface LinkPreviewRequest {
  url: string;
}

export interface LinkPreviewResponse {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// Type Guards
export function isValidPostFormData(data: unknown): data is PostFormData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'title' in data &&
    'authorName' in data &&
    'channelName' in data
  );
}

export function isUploadComplete(state: ImageUploadState): boolean {
  return !state.uploading && state.uploadingFiles.length === 0;
}

export function canSubmitForm(
  formData: PostFormData,
  validation: ValidationState,
  uploadState: ImageUploadState
): boolean {
  return (
    validation.isValid &&
    isUploadComplete(uploadState) &&
    formData.authorName.trim().length >= 3  // 작성자명 required
  );
}