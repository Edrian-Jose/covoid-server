import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { DetectorService } from './detector.service';

@WebSocketGateway()
export class DetectorGateway implements OnGatewayInit {
  constructor(private detectorService: DetectorService) {}
  async afterInit() {
    this.detectorService.loadModels();
  }
}
