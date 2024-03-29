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
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsGuard } from 'src/auth/ws-auth.guard';
import { UsersService } from 'src/users/users.service';
import { ConnectCameraDto } from './dto/connect-camera.dto';
import { StreamService } from './stream.service';
import { JwtService } from '@nestjs/jwt';
import { CalibrateCameraDto } from './dto/calibrate-camera.dto';

@WebSocketGateway({ cors: true })
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
    this.streamService.socket = server;
    try {
      await this.streamService.discover();
    } catch (error) {
      this.logger.error('Initial discovery failed');
    }
    this.logger.log(
      `${this.streamService.devices.size} DEVICES(S) ARE CONNNECTED`,
    );
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
      this.logger.log(
        `${this.streamService.users.size} USER(S) ARE CONNNECTED`,
      );
    } catch (error) {
      throw new WsException('Invalid authentication');
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    if (this.streamService.clientsDevice.has(client.id)) {
      const deviceId = this.streamService.clientsDevice.get(client.id);
      await this.streamService.disconnect(deviceId, client.id);
    }
    this.streamService.users.delete(client.id);
    this.logger.log(`${this.streamService.users.size} USER(S) ARE CONNNECTED`);
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
    if (rtData) {
      this.logger.log(`${client.id} joined ${rtData._id}`);
      client.join(rtData._id);
    }

    return rtData;
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('stream:calibrate')
  async handleStreamCalibrate(@MessageBody() data: CalibrateCameraDto) {
    if (!this.streamService.devicesMeta.has(data.id)) {
      throw new WsException("Camera doesn't exist");
    }
    const meta = this.streamService.devicesMeta.get(data.id);
    const newMeta = await this.streamService.calibrate(
      data.id,
      data.focalLength,
      data.shoulderLength,
      data.threshold,
    );
    meta.focalLength = newMeta.focalLength;
    meta.shoulderLength = newMeta.shoulderLength;
    meta.threshold = newMeta.threshold;

    return newMeta;
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('stream:auth')
  async handleStreamAuth(@MessageBody() data: ConnectCameraDto) {
    if (!this.streamService.devicesMeta.has(data.id)) {
      throw new WsException("Camera doesn't exist");
    }

    return await this.streamService.auth(data.id, data.login, data.password);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('stream:refresh')
  async handleStreamRefresh() {
    const devicesMeta = await this.streamService.refresh();
    this.logger.log(
      `${this.streamService.devices.size} DEVICES(S) ARE CONNNECTED`,
    );
    return Object.fromEntries(devicesMeta.entries());
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('stream:devices:meta')
  async handleGetDevicesMeta() {
    return Object.fromEntries(this.streamService.devicesMeta.entries());
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

    return await this.streamService.disconnect(data.id, client.id);
  }
}
