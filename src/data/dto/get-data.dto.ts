import { IsString } from 'class-validator';

export class GetDataDto {
  @IsString()
  id: string;
}
