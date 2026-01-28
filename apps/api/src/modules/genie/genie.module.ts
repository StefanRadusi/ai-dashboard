import { Module } from '@nestjs/common';
import { GenieController } from './genie.controller';
import { GenieService } from './genie.service';

@Module({
  controllers: [GenieController],
  providers: [GenieService],
  exports: [GenieService],
})
export class GenieModule {}
