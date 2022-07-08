import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectCameraDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  login?: string;

  @IsString()
  password?: string;
}
