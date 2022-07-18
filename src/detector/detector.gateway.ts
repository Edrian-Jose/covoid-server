import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsGuard } from 'src/auth/ws-auth.guard';
import { DetectorService } from './detector.service';
import { DetectFrameDto } from './dto/detect-frame.dto';

@WebSocketGateway({ cors: true })
export class DetectorGateway implements OnGatewayInit {
  constructor(private detectorService: DetectorService) {}
  async afterInit(server: Server) {
    this.detectorService.server = server;
    await this.detectorService.cleanQueues();
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('detect:frame')
  async handleDetectFrame(
    @MessageBody() data: DetectFrameDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.detectorService.detectFrame(client.id, data.image, data.calibration);
  }
}
