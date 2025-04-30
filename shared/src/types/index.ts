/**
 * Base API response type for successful responses
 */
export type ApiSuccessResponse = {
  success: true;
};

/**
 * Base API response type for error responses
 */
export type ApiErrorResponse = {
  success: false;
  error: string;
};

/**
 * Generic API response type (either success or error)
 */
export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

/**
 * Represents a file update with a path and content
 */
export interface FileUpdate {
  path: string;
  content: string;
}

/**
 * Represents an MDX file with its path and content
 */
export interface MdxFile {
  path: string;
  content: string;
}

/**
 * Result of a file update operation
 */
export interface FileUpdateResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Response for GET /api/mdx endpoint
 */
export interface GetMdxResponse extends ApiSuccessResponse {
  content: string;
}

/**
 * Request body for POST /api/mdx endpoint
 */
export interface PostMdxRequest {
  content: string;
}

/**
 * Response for POST /api/mdx endpoint
 */
export interface PostMdxResponse extends ApiSuccessResponse {
  files: FileUpdateResult[];
}

/**
 * Response for the root endpoint
 */
export interface RootResponse extends ApiSuccessResponse {
  message: string;
  version: string;
}
