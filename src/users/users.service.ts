import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUserDto } from './dto/find-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async update(updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    return await this.userModel.findByIdAndUpdate(
      updateUserDto._id,
      updateUserDto,
      { new: true },
    );
  }

  async delete(_id: string): Promise<User> {
    return await this.userModel.remove(_id);
  }

  async find(user: FindUserDto): Promise<User[]> {
    return await this.userModel.find(user).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return (await this.find({ email }))[0];
  }

  async findById(id: string): Promise<User> {
    return await this.userModel.findById(id).exec();
  }
}
