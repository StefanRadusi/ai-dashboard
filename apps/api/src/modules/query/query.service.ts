import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ColumnInfo } from '@ai-dashboard/shared';

export interface QueryResult {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
}

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);
  private readonly databricksHost: string;
  private readonly databricksToken: string;
  private readonly warehouseId: string;

  constructor(private configService: ConfigService) {
    this.databricksHost = this.configService.get<string>('DATABRICKS_HOST', '');
    this.databricksToken = this.configService.get<string>('DATABRICKS_TOKEN', '');
    this.warehouseId = this.configService.get<string>('DATABRICKS_WAREHOUSE_ID', '');
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    // If Databricks is not configured, return mock data
    if (!this.databricksHost || !this.databricksToken || !this.warehouseId) {
      this.logger.warn('Databricks not configured, returning mock data');
      return this.getMockResult();
    }

    try {
      // Execute SQL using Databricks SQL Statement Execution API
      const executeUrl = `${this.databricksHost}/api/2.0/sql/statements`;

      this.logger.debug(`Executing SQL: ${sql}`);

      const executeResponse = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.databricksToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_id: this.warehouseId,
          statement: sql,
          wait_timeout: '30s',
        }),
      });

      if (!executeResponse.ok) {
        const errorBody = await executeResponse.text();
        this.logger.error(`Databricks API error: ${executeResponse.status} - ${errorBody}`);
        throw new Error(`Failed to execute query: ${executeResponse.status} - ${errorBody}`);
      }

      const result = await executeResponse.json();
      const status = result.status?.state;

      // If still running, poll for results
      if (status === 'PENDING' || status === 'RUNNING') {
        return this.pollForResult(result.statement_id);
      }

      if (status === 'FAILED') {
        throw new Error(result.status?.error?.message || 'Query failed');
      }

      return this.parseResult(result);
    } catch (error) {
      this.logger.error('Error executing query', error);
      throw error;
    }
  }

  private async pollForResult(statementId: string, maxAttempts = 30): Promise<QueryResult> {
    const statusUrl = `${this.databricksHost}/api/2.0/sql/statements/${statementId}`;

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(statusUrl, {
        headers: {
          Authorization: `Bearer ${this.databricksToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get query status: ${response.status}`);
      }

      const result = await response.json();
      const status = result.status?.state;

      if (status === 'SUCCEEDED') {
        return this.parseResult(result);
      }

      if (status === 'FAILED' || status === 'CANCELED') {
        throw new Error(result.status?.error?.message || 'Query failed');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Query timeout');
  }

  private parseResult(result: Record<string, unknown>): QueryResult {
    const manifest = result.manifest as Record<string, unknown> | undefined;
    const schema = manifest?.schema as Record<string, unknown> | undefined;
    const columnsData = (schema?.columns || []) as Array<{ name: string; type_name: string }>;

    const columns: ColumnInfo[] = columnsData.map((col) => ({
      name: col.name,
      type: col.type_name,
    }));

    const resultData = result.result as Record<string, unknown> | undefined;
    const dataArray = (resultData?.data_array || []) as string[][];
    const dataTypedArray = (resultData?.data_typed_array || []) as Array<{
      values: Array<Record<string, unknown>>;
    }>;

    let data: Record<string, unknown>[];

    if (dataTypedArray.length > 0) {
      data = dataTypedArray.map((row) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          const typedValue = row.values[idx];
          obj[col.name] = typedValue?.str ?? typedValue?.int ?? typedValue?.double ?? typedValue?.bool ?? null;
        });
        return obj;
      });
    } else {
      data = dataArray.map((row) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          obj[col.name] = row[idx];
        });
        return obj;
      });
    }

    return { data, columns };
  }

  private getMockResult(): QueryResult {
    return {
      data: [
        { customerID: 2000112, first_name: 'Lorraine', last_name: 'James', total_sales: 672 },
        { customerID: 2000134, first_name: 'Charles', last_name: 'Wong', total_sales: 519 },
        { customerID: 2000248, first_name: 'Chad', last_name: 'Mills', total_sales: 498 },
      ],
      columns: [
        { name: 'customerID', type: 'LONG' },
        { name: 'first_name', type: 'STRING' },
        { name: 'last_name', type: 'STRING' },
        { name: 'total_sales', type: 'LONG' },
      ],
    };
  }
}
