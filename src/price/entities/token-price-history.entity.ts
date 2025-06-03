import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TokenPriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  symbol: string;

  @Column('decimal')
  price: number;

  @CreateDateColumn()
  timestamp: Date;

  
}
