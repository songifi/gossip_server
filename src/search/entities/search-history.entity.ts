import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class SearchHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  query: string;

  @CreateDateColumn()
  createdAt: Date;
}
