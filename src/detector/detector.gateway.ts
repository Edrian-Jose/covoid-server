import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { DetectorService } from './detector.service';

@WebSocketGateway({ cors: true })
export class DetectorGateway implements OnGatewayInit {
  constructor(private detectorService: DetectorService) {}
  async afterInit() {
    //
    await this.detectorService.cleanQueues();
  }
}
