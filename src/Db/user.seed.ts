import { DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

export class UserSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);

    const existingUser = await userRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const user = userRepository.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPassword,
        isActive: true,
      });

      await userRepository.save(user);
      console.log('Admin user created successfully');
    }
  }
}