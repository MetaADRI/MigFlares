import type { ReportPeriod, ReportResult, ReportType } from "@/types";
import { api } from "@/services/api";
import { downloadCsvText, tableToCsv } from "@/utils/export";

export interface ReportQuery {
  type: ReportType;
  period: ReportPeriod;
  from?: string;
  to?: string;
}

export const reportsService = {
  async generate(query: ReportQuery): Promise<ReportResult> {
    const { data } = await api.get<ReportResult>("/reports", { params: query });
    return data;
  },

  /** Download the report table as a CSV file. */
  async exportCsv(query: ReportQuery): Promise<void> {
    const result = await this.generate(query);
    downloadCsvText(`${query.type.toLowerCase()}-report-${query.period}.csv`, tableToCsv(result.table));
  },
};
