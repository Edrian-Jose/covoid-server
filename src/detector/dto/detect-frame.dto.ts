import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

class CalibrationDto {
  @IsNumber()
  focalLength: number;

  @IsNumber()
  shoulderLength: number;

  @IsNumber()
  threshold: number;
}

export class DetectFrameDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => CalibrationDto)
  calibration: CalibrationDto;

  @IsString()
  @IsNotEmpty()
  image: string;
}
