import { IsNumber, IsString } from 'class-validator';
import { Violation } from 'src/stream/stream';

export class GetViolatorsDto {
  @IsNumber()
  from: number;

  @IsNumber()
  to?: number;

  @IsString({ each: true })
  types?: Violation[];

  @IsNumber({}, { each: true })
  scoreRange?: [number, number];

  @IsNumber({}, { each: true })
  contactRange?: [number, number];
}
