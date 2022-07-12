import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamGateway } from './stream.gateway';
import { Camera, CameraSchema } from './camera.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtService } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Camera.name, schema: CameraSchema }]),
    BullModule.registerQueue({
      name: 'stream',
    }),
    UsersModule,
    ConfigModule,
  ],
  providers: [StreamService, StreamGateway, JwtService],
  exports: [StreamService],
})
export class StreamModule {}
