import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CalibrateCameraDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  focalLength: number;

  @IsNumber()
  shoulderLength: number;

  @IsNumber()
  threshold: number;
}
