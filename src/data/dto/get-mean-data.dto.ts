import { IsString } from 'class-validator';

export class GetMeanDataDto {
  @IsString({ each: true })
  id?: string[];
}
