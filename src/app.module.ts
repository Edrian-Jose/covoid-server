import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { DetectorModule } from './detector/detector.module';
import { DataModule } from './data/data.module';

@Module({
  imports: [UsersModule, AuthModule, StorageModule, DetectorModule, DataModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
