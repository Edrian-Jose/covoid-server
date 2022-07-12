import { ConfigService } from '@nestjs/config';
import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsGuard } from 'src/auth/ws-auth.guard';
import { UsersService } from 'src/users/users.service';
import { ConnectCameraDto } from './dto/connect-camera.dto';
import { StreamService } from './stream.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway()
export class StreamGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private streamService: StreamService,
    private userService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private readonly logger = new Logger(StreamGateway.name);

  async afterInit(server: Server) {
    await this.streamService.discover();
    this.streamService.socket = server;
    this.logger.log(
      `${this.streamService.devices.size} DEVICES(S) ARE CONNNECTED`,
    );
    //Load models in the detector gateway
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const bearerToken = client.handshake.headers.authorization.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(bearerToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as any;
      const user = await this.userService.findByEmail(decoded.email);
      if (!user) {
        throw new WsException("User doesn't exist");
      }
      if (!this.streamService.users.has(client.id)) {
        this.streamService.users.set(client.id, {
          ...user,
          clientId: client.id,
        });
      }
    } catch (error) {
      throw new WsException('Invalid authentication');
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    if (this.streamService.clientsDevice.has(client.id)) {
      const deviceId = this.streamService.clientsDevice.get(client.id);
      await this.streamService.disconnect(deviceId, client.id);
      this.streamService.users.delete(client.id);
    }
  }

  @UseGuards(WsGuard)
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

  @UseGuards(WsGuard)
  @SubscribeMessage('stream:refresh')
  async handleStreamRefresh() {
    await this.streamService.refresh();
    this.logger.log(
      `${this.streamService.devices.size} DEVICES(S) ARE CONNNECTED`,
    );
  }

  @UseGuards(WsGuard)
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
