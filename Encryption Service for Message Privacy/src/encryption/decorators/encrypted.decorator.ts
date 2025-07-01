import { SetMetadata } from "@nestjs/common";

export const ENCRYPTION_KEY = "encryption";
export const Encrypted = (required = true) =>
  SetMetadata(ENCRYPTION_KEY, required);
