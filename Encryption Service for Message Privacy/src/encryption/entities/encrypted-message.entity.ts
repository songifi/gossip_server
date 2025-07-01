import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("encrypted_messages")
export class EncryptedMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  senderId: string;

  @Column()
  recipientId: string;

  @Column()
  conversationId: string;

  @Column("text")
  encryptedContent: string;

  @Column()
  iv: string;

  @Column()
  authTag: string;

  @Column()
  keyId: string;

  @Column()
  algorithm: string;

  @Column({ default: true })
  isEncrypted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;
}
