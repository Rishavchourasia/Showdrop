// Mirrors the backend's AuthDtos (see backend/.../dto/AuthDtos.java).
export interface User {
  id: number;
  email: string;
  fullName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
