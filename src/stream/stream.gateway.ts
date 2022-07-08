import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConnectCameraDto } from './dto/connect-camera.dto';
import { StreamService } from './stream.service';

@WebSocketGateway()
export class StreamGateway implements OnGatewayInit {
  constructor(private streamService: StreamService) {}
  async afterInit() {
    await this.streamService.discover();
    //Load models in the detector gateway
  }

  @SubscribeMessage('stream:connect')
  async handleStreamConnect(
    @MessageBody() data: ConnectCameraDto,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.streamService.devicesMeta.has(data.id)) {
      throw new WsException("Camera doesn't exist");
    }

    const rtData = await this.streamService.connect(data.id, client.id);
    client.join(rtData.id);
  }

  @SubscribeMessage('stream:disconnect')
  async handleStreamDisconnect(
    @MessageBody() data: ConnectCameraDto,
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.streamService.devicesMeta.has(data.id)) {
      throw new WsException("Camera doesn't exist");
    }

    await this.streamService.disconnect(data.id, client.id);
  }
}
