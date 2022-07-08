import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { StreamService } from './stream.service';

@WebSocketGateway()
export class StreamGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private streamService: StreamService) {}
  async afterInit() {
    const metas = await this.streamService.discover();
    //Load models in the detector gateway
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    console.log(client.id + ' is connected');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    // this.cameraService.disconnectAll(client.id);
    console.log(client.id + ' disconnected');
  }
}
