export interface JwtPayload {
  walletAddress: string;
  iat?: number;
  exp?: number;
}
