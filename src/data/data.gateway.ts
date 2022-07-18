import { UseGuards } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { WsGuard } from 'src/auth/ws-auth.guard';
import { DataService } from './data.service';
import { GetDataDto } from './dto/get-data.dto';
import { GetMeanDataDto } from './dto/get-mean-data.dto';

@WebSocketGateway()
export class DataGateway implements OnGatewayInit {
  constructor(private dataService: DataService) {}
  afterInit(server: any) {
    this.dataService.server = server;
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:violator')
  getDataViolator(@MessageBody() { id }: GetDataDto) {
    return this.dataService.violatorsData.get(id);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:violators')
  getDataViolators() {
    return Object.fromEntries(this.dataService.violatorsData.entries());
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:count')
  getDataCount(@MessageBody() { id }: GetDataDto) {
    return this.dataService.countData.get(id);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:counts')
  getDataCounts() {
    return Object.fromEntries(this.dataService.countData.entries());
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:mean')
  getMeanCountData(@MessageBody() { id }: GetDataDto) {
    return this.dataService.meanCountData.get(id);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:means')
  getNotifications() {
    return Object.fromEntries(this.dataService.meanCountData.entries());
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:mean:combined')
  getManyMeanCountData(@MessageBody() { id }: GetMeanDataDto) {
    if (!this.dataService.meanCountData.size) {
      throw new WsException('No violators yet');
    }
    return this.dataService.getManyMeanCountData(id || []);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:notifs')
  getNotifs() {
    return this.dataService.getNotifications();
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('data:notif')
  getNotif(@MessageBody() { id }: GetDataDto) {
    return this.dataService.getNotifications(id);
  }
}
