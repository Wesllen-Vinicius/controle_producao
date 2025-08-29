import { Alert, Share } from "react-native";
import { DayTotals, ExportFormat, ProductTotals } from "../types";
import { toISODate } from "../utils";

// Omitido para brevidade, mas você pode usar 'expo-print' e 'expo-sharing'
// let Print: any = null;
// let Sharing: any = null;
// try {
//   Print = require('expo-print');
//   Sharing = require('expo-sharing');
// } catch (e) {
//   console.log('expo-print e expo-sharing não estão disponíveis.');
// }

const generateCsv = (
  hasProductFilter: boolean,
  data: DayTotals[] | ProductTotals[]
): string => {
  const fmtCsv = (n: number) => String(n.toFixed(2)).replace(".", ",");

  if (hasProductFilter) {
    const header = "Data;Abate;Produzido;Meta;Diferenca;Cumprimento_%\n";
    const rows = (data as DayTotals[]).map((d) => {
      const compliance = d.meta > 0 ? (d.produced / d.meta) * 100 : 0;
      return `${new Date(d.date).toLocaleDateString("pt-BR")};${
        d.abate
      };${fmtCsv(d.produced)};${fmtCsv(d.meta)};${fmtCsv(d.diff)};${fmtCsv(
        compliance
      )}`;
    });
    return header + rows.join("\n");
  } else {
    const header = "Produto;Unidade;Produzido;Meta;Diferenca;Cumprimento_%\n";
    const rows = (data as ProductTotals[]).map((r) => {
      const compliance = r.meta > 0 ? (r.produced / r.meta) * 100 : 0;
      return `${r.name.replace(/;/g, ",")};${r.unit};${fmtCsv(
        r.produced
      )};${fmtCsv(r.meta)};${fmtCsv(r.diff)};${fmtCsv(compliance)}`;
    });
    return header + rows.join("\n");
  }
};

const generateJson = (
  hasProductFilter: boolean,
  data: DayTotals[] | ProductTotals[]
): string => {
  const content = hasProductFilter
    ? { report_type: "daily_breakdown", data }
    : { report_type: "totals_per_product", data };
  return JSON.stringify(content, null, 2);
};

export const handleExport = async (
  format: ExportFormat,
  hasProductFilter: boolean,
  data: DayTotals[] | ProductTotals[]
) => {
  try {
    const timestamp = toISODate(new Date()).replace(/-/g, "");
    const baseFilename = `relatorio_producao_${timestamp}`;
    let content = "";
    let mimeType = "text/plain";

    if (format === "csv") {
      content = generateCsv(hasProductFilter, data);
      mimeType = "text/csv";
    } else if (format === "json") {
      content = generateJson(hasProductFilter, data);
      mimeType = "application/json";
    } else if (format === "pdf") {
      Alert.alert(
        "PDF em breve",
        "A exportação para PDF será implementada futuramente."
      );
      return;
    }

    await Share.share({
      title: `${baseFilename}.${format}`,
      message: content,
    });
  } catch (error: any) {
    Alert.alert(
      "Erro ao Exportar",
      error.message || "Ocorreu um problema ao tentar compartilhar o arquivo."
    );
  }
};
