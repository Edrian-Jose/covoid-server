import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private jwt: JwtService, private config: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | any | Promise<boolean | any> {
    const client = context.switchToWs().getClient<Socket>();
    const bearerToken = client.handshake.headers.authorization.split(' ')[1];
    try {
      const decoded = this.jwt.verify(bearerToken, {
        secret: this.config.get<string>('JWT_SECRET'),
      }) as any;

      client.handshake.auth = decoded;
      return decoded;
    } catch (ex) {
      throw new WsException('Invalid authentation');
    }
  }
}
