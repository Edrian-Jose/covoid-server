import { IsNumber, IsString } from 'class-validator';
import { Violation } from 'src/stream/stream';

export class GetReportsDto {
  @IsNumber()
  from: number;

  @IsNumber()
  to?: number;

  @IsString({ each: true })
  types?: Violation[];

  @IsNumber({}, { each: true })
  entitiesRange?: [number, number];

  @IsNumber({}, { each: true })
  violatorsRange?: [number, number];
}
