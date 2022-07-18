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

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async update(updateUserDto: UpdateUserDto): Promise<UserDocument> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    return await this.userModel.findByIdAndUpdate(
      updateUserDto._id,
      updateUserDto,
      { new: true },
    );
  }

  async delete(_id: string): Promise<UserDocument> {
    return await this.userModel.findByIdAndRemove(_id).exec();
  }

  async find(
    user: FindUserDto,
    securePassword = true,
  ): Promise<UserDocument[]> {
    let query = this.userModel.find(user);
    if (!securePassword) {
      query = query.select('+password');
    }
    return await query.exec();
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return (await this.find({ email }))[0];
  }

  async findById(id: string): Promise<UserDocument> {
    return await this.userModel.findById(id).exec();
  }
}
