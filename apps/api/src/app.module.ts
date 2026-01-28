import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database';
import { GenieModule } from './modules/genie/genie.module';
import { WidgetModule } from './modules/widget/widget.module';
import { QueryModule } from './modules/query/query.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    GenieModule,
    WidgetModule,
    QueryModule,
  ],
})
export class AppModule {}
