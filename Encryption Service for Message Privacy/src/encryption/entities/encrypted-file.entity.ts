import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

@Entity("encrypted_files")
export class EncryptedFile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  conversationId: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @Column("text")
  encryptedData: string;

  @Column()
  iv: string;

  @Column()
  authTag: string;

  @Column()
  fileKeyId: string;

  @Column()
  uploaderId: string;

  @Column({ default: true })
  isEncrypted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;
}
