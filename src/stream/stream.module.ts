import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamGateway } from './stream.gateway';
import { Camera, CameraSchema } from './camera.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Camera.name, schema: CameraSchema }]),
    BullModule.registerQueue({
      name: 'stream',
    }),
  ],
  providers: [StreamService, StreamGateway],
})
export class StreamModule {}
