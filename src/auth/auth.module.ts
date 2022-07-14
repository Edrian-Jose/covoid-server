import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { LocalStrategy } from './local.strategy';
import { UsersModule } from './../users/users.module';
import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminStrategy } from './admin.strategy';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    forwardRef(() => UsersModule),
    ConfigModule,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    AdminStrategy,
    JwtStrategy,
    JwtService,
  ],
  exports: [AuthService, LocalStrategy, AdminStrategy, JwtStrategy, JwtService],
  controllers: [AuthController],
})
export class AuthModule {}
