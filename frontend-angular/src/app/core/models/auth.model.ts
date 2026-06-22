export interface LoginRequest {
  email: string;
  senha: string;
  codigoTwoFactor?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: UsuarioInfo;
}

export interface UsuarioInfo {
  id: string;
  nome: string;
  email: string;
  tenantId: string;
  empresaAtualId: string;
  empresaIds?: string[];
  roles: string[];
  permissoes: string[];
}

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  regimeTributario: string;
  status: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  timestamp: string;
  details?: string[];
}
