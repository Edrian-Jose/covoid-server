import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConnectCameraDto } from './dto/connect-camera.dto';
import { StreamService } from './stream.service';

@WebSocketGateway()
export class StreamGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(private streamService: StreamService) {}
  @WebSocketServer() public server: Server;

  async afterInit() {
    await this.streamService.discover();
    this.streamService.socket = this.server;
    //Load models in the detector gateway
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    if (this.streamService.clientsDevice.has(client.id)) {
      const deviceId = this.streamService.clientsDevice.get(client.id);
      await this.streamService.disconnect(deviceId, client.id);
    }
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
    return rtData;
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
