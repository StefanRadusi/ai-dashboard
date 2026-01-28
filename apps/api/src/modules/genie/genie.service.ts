import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  GenieAskRequest,
  GenieAskResponse,
  GenieResultResponse,
  ColumnInfo,
} from "@ai-dashboard/shared";

@Injectable()
export class GenieService {
  private readonly logger = new Logger(GenieService.name);
  private readonly databricksHost: string;
  private readonly databricksToken: string;
  private readonly genieSpaceId: string;

  constructor(private configService: ConfigService) {
    this.databricksHost = this.configService.get<string>("DATABRICKS_HOST", "");
    this.databricksToken = this.configService.get<string>(
      "DATABRICKS_TOKEN",
      "",
    );
    this.genieSpaceId = this.configService.get<string>("GENIE_SPACE_ID", "");
  }

  async ask(request: GenieAskRequest): Promise<GenieAskResponse> {
    const { question, conversationId } = request;

    // If Databricks is not configured, return mock response
    if (!this.databricksHost || !this.databricksToken || !this.genieSpaceId) {
      this.logger.warn("Databricks not configured, returning mock response");
      return this.getMockAskResponse(question);
    }

    try {
      const url = conversationId
        ? `${this.databricksHost}/api/2.0/genie/spaces/${this.genieSpaceId}/conversations/${conversationId}/messages`
        : `${this.databricksHost}/api/2.0/genie/spaces/${this.genieSpaceId}/start-conversation`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.databricksToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: question }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Genie API error: ${response.status} - ${errorText}`);
        throw new Error(`Genie API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        conversationId: data.conversation_id,
        messageId: data.message_id,
        status: "pending",
      };
    } catch (error) {
      this.logger.error("Error calling Genie API", error);
      throw error;
    }
  }

  async getResult(
    conversationId: string,
    messageId: string,
  ): Promise<GenieResultResponse> {
    // If Databricks is not configured, return mock response
    if (!this.databricksHost || !this.databricksToken || !this.genieSpaceId) {
      this.logger.warn("Databricks not configured, returning mock result");
      return this.getMockResultResponse(conversationId, messageId);
    }

    try {
      // Genie adds the response as attachments to the user's message
      const messageUrl = `${this.databricksHost}/api/2.0/genie/spaces/${this.genieSpaceId}/conversations/${conversationId}/messages/${messageId}`;

      const messageResponse = await fetch(messageUrl, {
        headers: {
          Authorization: `Bearer ${this.databricksToken}`,
        },
      });

      if (!messageResponse.ok) {
        throw new Error(`Failed to get message: ${messageResponse.status}`);
      }

      const messageData = await messageResponse.json();
      const status = messageData.status?.toUpperCase();

      // Still processing - return pending
      const pendingStatuses = ["FILTERING_CONTEXT", "ASKING_AI", "EXECUTING_QUERY", "PENDING"];
      if (pendingStatuses.includes(status) && !messageData.attachments?.length) {
        return {
          conversationId,
          messageId,
          status: "pending",
        };
      }

      // Failed states
      if (status === "FAILED" || status === "CANCELLED") {
        return {
          conversationId,
          messageId,
          status: "failed",
          error: messageData.error?.message || "Query failed",
        };
      }

      // Check for attachments - this is where Genie puts the response
      const attachments = messageData.attachments || [];
      this.logger.debug(`Attachments: ${JSON.stringify(attachments, null, 2)}`);

      // Look for text response
      const textAttachment = attachments.find(
        (a: { text?: { content: string } }) => a.text?.content,
      );

      // Look for query response
      const queryAttachment = attachments.find(
        (a: { query?: { query: string } }) => a.query,
      );

      this.logger.debug(`Text attachment: ${!!textAttachment}, Query attachment: ${!!queryAttachment}`);

      // If we have a query attachment, fetch the results
      if (queryAttachment?.query) {
        const queryResultUrl = `${this.databricksHost}/api/2.0/genie/spaces/${this.genieSpaceId}/conversations/${conversationId}/messages/${messageId}/query-result`;

        const resultResponse = await fetch(queryResultUrl, {
          headers: {
            Authorization: `Bearer ${this.databricksToken}`,
          },
        });

        if (resultResponse.ok) {
          const resultData = await resultResponse.json();
          this.logger.debug(`Full query result: ${JSON.stringify(resultData, null, 2)}`);
          const queryState = resultData.statement_response?.status?.state;

          // If query is still running, return pending
          if (queryState === "PENDING" || queryState === "RUNNING") {
            return {
              conversationId,
              messageId,
              status: "pending",
            };
          }

          // If query failed
          if (queryState === "FAILED" || queryState === "CANCELED") {
            return {
              conversationId,
              messageId,
              status: "failed",
              error: resultData.statement_response?.status?.error?.message || "Query execution failed",
            };
          }

          const columns: ColumnInfo[] =
            resultData.statement_response?.manifest?.schema?.columns?.map(
              (col: { name: string; type_name: string }) => ({
                name: col.name,
                type: col.type_name,
              }),
            ) || [];

          // Handle both data_array (simple) and data_typed_array (typed values) formats
          const dataArray = resultData.statement_response?.result?.data_array || [];
          const dataTypedArray = resultData.statement_response?.result?.data_typed_array || [];

          let data: Record<string, unknown>[];

          if (dataTypedArray.length > 0) {
            // Parse typed array format: [{ values: [{ str: "val" }, { str: "val2" }] }, ...]
            data = dataTypedArray.map((row: { values: Array<Record<string, unknown>> }) => {
              const obj: Record<string, unknown> = {};
              columns.forEach((col, idx) => {
                const typedValue = row.values[idx];
                // Extract the value from typed wrapper (str, int, double, etc.)
                obj[col.name] = typedValue?.str ?? typedValue?.int ?? typedValue?.double ?? typedValue?.bool ?? null;
              });
              return obj;
            });
          } else {
            // Parse simple array format: [["val1", "val2"], ...]
            data = dataArray.map((row: string[]) => {
              const obj: Record<string, unknown> = {};
              columns.forEach((col, idx) => {
                obj[col.name] = row[idx];
              });
              return obj;
            });
          }

          // Build description from available sources
          const description =
            queryAttachment.query.description ||
            textAttachment?.text?.content ||
            (data.length > 0
              ? `Query returned ${data.length} row${data.length !== 1 ? "s" : ""}`
              : "Query executed successfully but returned no results");

          return {
            conversationId,
            messageId,
            status: "completed",
            sql: queryAttachment.query.query,
            description,
            data,
            columns,
          };
        } else {
          this.logger.warn(`Query result fetch failed: ${resultResponse.status}`);
        }
      }

      // Text-only response (no query)
      if (textAttachment) {
        return {
          conversationId,
          messageId,
          status: "completed",
          description: textAttachment.text.content,
        };
      }

      // No attachments yet, still pending
      return {
        conversationId,
        messageId,
        status: "pending",
      };
    } catch (error) {
      this.logger.error("Error getting Genie result", error);
      throw error;
    }
  }

  private getMockAskResponse(question: string): GenieAskResponse {
    return {
      conversationId: `mock-conv-${Date.now()}`,
      messageId: `mock-msg-${Date.now()}`,
      status: "completed",
      description: `Mock response for: "${question}"`,
    };
  }

  private getMockResultResponse(
    conversationId: string,
    messageId: string,
  ): GenieResultResponse {
    return {
      conversationId,
      messageId,
      status: "completed",
      sql: "SELECT * FROM mock_table LIMIT 10",
      description: "Mock data response",
      data: [
        { category: "A", value: 100 },
        { category: "B", value: 200 },
        { category: "C", value: 150 },
        { category: "D", value: 300 },
      ],
      columns: [
        { name: "category", type: "STRING" },
        { name: "value", type: "INT" },
      ],
    };
  }
}
