import { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    Typography,
    Button,
    MenuItem,
    Select,
    TextField,
    Autocomplete,
    CircularProgress,
    Checkbox,
    FormControlLabel,
} from "@mui/material";
import {
    BarChart3,
    TrendingUp,
    ChevronRight
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSnackbar } from "notistack";

import {
    useQuickStatisticsQuery,
    useGenerateReportMutation,
} from "../hooks/useReportsQuery";
import useDebounce from "../hooks/useDebounce";
import { useStudentsQuery } from "../hooks/useStudentExactQuery";

/* =======================
   REPORT TYPES
======================= */

const reportTypes = [
    { id: 1, title: "Student Report", apiUrl: "reports/student-report" },
    { id: 2, title: "Transaction Summary", apiUrl: "reports/transaction-summary-report" },
    { id: 3, title: "Canteen Sales", apiUrl: "reports/tuckshop-sales-report" },
    { id: 5, title: "Inventory", apiUrl: "reports/inventory-report" },
];

export default function Reports() {
    const { enqueueSnackbar } = useSnackbar();

    const [apiUrl, setApiUrl] = useState(reportTypes[0]);
    const [format, setFormat] = useState("csv");
    const [dateRange, setDateRange] = useState("");
    const [frequency, setFrequency] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [student, setStudent] = useState(null);
    const [boardName, setBoardName] = useState("");
    const [filterByStudent, setFilterByStudent] = useState(false);

    const { data: stats } = useQuickStatisticsQuery();
    const [studentSearch, setStudentSearch] = useState("");
    // pagination
    const [page, setPage] = useState(1);
    const limit = 20;

    // ✅ debounce without library (simple)
    const debouncedSearch = useDebounce(studentSearch, 400);

    const { data: studentsRes, isFetching } = useStudentsQuery({
        search: debouncedSearch,
        page,
        limit,
    });

    // depends on your API shape:
    // either { data: [], total: number } OR direct array
    const students = studentsRes?.data ?? studentsRes ?? [];
    const total = studentsRes?.total ?? studentsRes?.count ?? 0;

    const reportMutation = useGenerateReportMutation();

    /* =======================
       PAYLOAD
    ======================= */

    const payload = useMemo(() => {
        let basePayload;

        if (apiUrl.id === 2) {
            basePayload = { dateRange: frequency, format };
        } else if (dateRange === "custom") {
            basePayload = { startDate, endDate, format };
        } else {
            basePayload = { dateRange, format };
        }

        return basePayload;
    }, [apiUrl, dateRange, startDate, endDate, format, frequency]);

    /* =======================
       PDF
    ======================= */

    const sanitizeFileName = (name) =>
        String(name ?? "report")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^\w.-]/g, "_");

    const toTitleCase = (s) =>
        String(s ?? "")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const formatHeader = (key) => {
        const parts = String(key ?? "")
            .split(".")
            .map((p) =>
                p
                    .replace(/_/g, " ")
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .trim()
            )
            .filter(Boolean);

        return toTitleCase(parts.join(" / "));
    };

    const shouldExcludeKey = (key) => {
        const k = String(key ?? "");
        if (k === "_id" || k === "__v") return true;
        if (k.endsWith("._id")) return true;
        return false;
    };

    const normalizeRows = (input) => {
        if (Array.isArray(input)) return input;
        if (typeof Blob !== "undefined" && input instanceof Blob) return [];
        if (input && typeof input === "object") {
            if (Array.isArray(input.data)) return input.data;
            if (input.data && typeof input.data === "object") {
                const nested = normalizeRows(input.data);
                if (nested.length) return nested;
            }
            if (Array.isArray(input.rows)) return input.rows;
            if (input.rows && typeof input.rows === "object") {
                const nested = normalizeRows(input.rows);
                if (nested.length) return nested;
            }
            if (Array.isArray(input.transactions)) return input.transactions;
            if (input.transactions && typeof input.transactions === "object") {
                const nested = normalizeRows(input.transactions);
                if (nested.length) return nested;
            }
            if (Array.isArray(input.records)) return input.records;
            if (Array.isArray(input.results)) return input.results;
            return [input];
        }
        return [];
    };

    const flatten = (obj, prefix = "") => {
        const out = {};
        for (const k in obj) {
            const val = obj[k];
            const key = prefix ? `${prefix}.${k}` : k;
            if (val && typeof val === "object" && !Array.isArray(val)) {
                Object.assign(out, flatten(val, key));
            } else {
                out[key] = Array.isArray(val)
                    ? val
                        .map((v) =>
                            v && typeof v === "object" ? JSON.stringify(v) : String(v ?? "")
                        )
                        .join(", ")
                    : val ?? "";
            }
        }
        return out;
    };

    const getByPath = (obj, path) => {
        if (!obj || typeof obj !== "object") return undefined;
        const parts = String(path ?? "").split(".").filter(Boolean);
        let cur = obj;
        for (const p of parts) {
            if (cur == null) return undefined;
            // bracket access works for non-enumerable props too
            cur = cur[p];
        }
        return cur;
    };

    const formatDateTime = (value) => {
        if (value == null) return "";
        const s = String(value);
        // ISO date support (e.g. 2026-03-11T06:52:07.063Z)
        if (s.includes("T")) {
            const d = new Date(s);
            if (!Number.isNaN(d.getTime())) {
                return d.toLocaleString(undefined, {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
            }
        }
        return s;
    };

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const createExcelBlobFromTable = ({ sheetName, headers, rows }) => {
        const safeSheetName = String(sheetName ?? "Sheet1").slice(0, 31);
        const thead = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
        const tbody = rows
            .map(
                (r) =>
                    `<tr>${r
                        .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                        .join("")}</tr>`
            )
            .join("");

        // Excel-friendly HTML (opens as .xls)
        const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${escapeHtml(safeSheetName)}</x:Name>
            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
  </head>
  <body>
    <table border="1">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  </body>
</html>`;

        return new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    };

    const createStudentReportExcel = (rows) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return null;
        }

        const cols = [
            { header: "Roll No", key: "registration_number" },
            { header: "Student Name", key: "student_name" },
            { header: "Father Name", key: "father_name" },
            { header: "Mother Name", key: "mother_name" },
            { header: "Contact", key: "contact_number" },
            { header: "Gender", key: "gender" },
            { header: "DOB", key: "date_of_birth" },
            { header: "Blood Group", key: "blood_group" },
            { header: "Board", key: "board_name" },
            { header: "Hostel", key: "hostel_name" },
            { header: "Deposit", key: "deposite_amount" },
            { header: "Class", key: "class_info.class_name" },
            { header: "Section", key: "class_info.section" },
            { header: "Academic Year", key: "class_info.academic_year" },
            { header: "Location", key: "location_id.locationName" },
            { header: "Created At", key: "createdAt" },
            { header: "Updated At", key: "updatedAt" },
        ];

        const headers = ["S.No", ...cols.map((c) => c.header)];
        const body = normalizedRows.map((r, idx) => [
            idx + 1,
            ...cols.map((c) => {
                const v = getByPath(r, c.key);
                if (c.key === "createdAt" || c.key === "updatedAt") return formatDateTime(v);
                return v ?? "";
            }),
        ]);

        return createExcelBlobFromTable({
            sheetName: "Student Report",
            headers,
            rows: body,
        });
    };

    const createTransactionSummaryExcel = (rows) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return null;
        }

        const cols = [
            { header: "Roll No", accessor: (t) => t?.registration_number ?? t?.Roll_no ?? "" },
            { header: "Board", accessor: (t) => t?.board_name ?? "" },
            { header: "Transaction", accessor: (t) => t?.transaction ?? "" },
            { header: "Source", accessor: (t) => t?.source ?? "" },
            { header: "Type", accessor: (t) => t?.type ?? "" },
            { header: "Amount", accessor: (t) => t?.amount ?? "" },
            { header: "Created At", accessor: (t) => formatDateTime(t?.createdAt) },
        ];

        const headers = ["S.No", ...cols.map((c) => c.header)];
        const body = normalizedRows.map((t, idx) => [
            idx + 1,
            ...cols.map((c) => c.accessor(t) ?? ""),
        ]);

        return createExcelBlobFromTable({
            sheetName: "Transaction Summary",
            headers,
            rows: body,
        });
    };

    const createCanteenSalesExcel = (rows) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return null;
        }

        const cols = [
            { header: "Roll No", accessor: (r) => r?.registration_number ?? r?.Roll_no ?? "" },
            { header: "Board", accessor: (r) => r?.board_name ?? "" },
            { header: "Product", accessor: (r) => r?.productName ?? "" },
            { header: "Category", accessor: (r) => r?.category ?? "" },
            { header: "Quantity", accessor: (r) => r?.quantity ?? "" },
            { header: "Price", accessor: (r) => r?.price ?? "" },
            { header: "Total Amount", accessor: (r) => r?.totalAmount ?? "" },
            { header: "Created At", accessor: (r) => formatDateTime(r?.createdAt) },
        ];

        const headers = ["S.No", ...cols.map((c) => c.header)];
        const body = normalizedRows.map((r, idx) => [
            idx + 1,
            ...cols.map((c) => c.accessor(r) ?? ""),
        ]);

        return createExcelBlobFromTable({
            sheetName: "Canteen Sales",
            headers,
            rows: body,
        });
    };

    const createInventoryExcel = (rows) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return null;
        }

        const cols = [
            { header: "Item No", accessor: (i) => i?.itemNo ?? "" },
            { header: "Item Name", accessor: (i) => i?.itemName ?? "" },
            { header: "Category", accessor: (i) => i?.category ?? "" },
            { header: "Description", accessor: (i) => i?.description ?? "" },
            { header: "Price", accessor: (i) => i?.price ?? "" },
            { header: "Stock Qty", accessor: (i) => i?.stockQuantity ?? i?.totalQty ?? "" },
            { header: "Status", accessor: (i) => i?.status ?? "" },
            { header: "Created At", accessor: (i) => formatDateTime(i?.createdAt) },
            { header: "Updated At", accessor: (i) => formatDateTime(i?.updatedAt) },
        ];

        const headers = ["S.No", ...cols.map((c) => c.header)];
        const body = normalizedRows.map((i, idx) => [
            idx + 1,
            ...cols.map((c) => c.accessor(i) ?? ""),
        ]);

        return createExcelBlobFromTable({
            sheetName: "Inventory",
            headers,
            rows: body,
        });
    };

    const createPDF = ({ rows, title, fileName }) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return false;
        }

        // Materialize rows into plain JSON so we don't lose values from objects
        // that may have non-enumerable props/getters (can otherwise render as blank rows).
        const materializedRows = normalizedRows.map((r) => {
            if (!r || typeof r !== "object") return { value: r ?? "" };
            try {
                return JSON.parse(JSON.stringify(r));
            } catch {
                return r;
            }
        });

        const doc = new jsPDF("l", "pt", "a4");
        doc.setFontSize(14);
        doc.text(title, 40, 36);
        doc.setFontSize(10);
        doc.text(`Rows: ${normalizedRows.length}`, 40, 52);

        const flat = materializedRows.map(flatten);
        const colSet = new Set();
        const cols = [];
        for (const r of flat) {
            for (const c of Object.keys(r)) {
                if (shouldExcludeKey(c)) continue;
                if (!colSet.has(c)) {
                    colSet.add(c);
                    cols.push(c);
                }
            }
        }

        const head = [["S.No", ...cols.map(formatHeader)]];
        const body = flat.map((r, idx) => [
            String(idx + 1),
            ...cols.map((c) => String(r[c] ?? "")),
        ]);

        autoTable(doc, {
            head,
            body,
            startY: 64,
            theme: "grid",
            styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", cellWidth: "wrap" },
            headStyles: { fontStyle: "bold" },
            horizontalPageBreak: true,
            rowPageBreak: "auto",
        });

        doc.save(fileName);
        return true;
    };

    const createStudentReportPDF = ({ rows, title, fileName }) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return false;
        }

        const columns = [
            { key: "registration_number", header: "Roll No" },
            { key: "student_name", header: "Student Name" },
            { key: "createdAt", header: "Created At" },
            { key: "updatedAt", header: "Updated At" },
            { key: "father_name", header: "Father Name" },
            { key: "mother_name", header: "Mother Name" },
            { key: "contact_number", header: "Contact" },
            { key: "gender", header: "Gender" },
            { key: "board_name", header: "Board" },
            { key: "hostel_name", header: "Hostel" },
            { key: "deposite_amount", header: "Deposit" },
            { key: "class_info.class_name", header: "Class" },
            { key: "class_info.section", header: "Section" },
            { key: "class_info.academic_year", header: "Academic Year" },
            { key: "location_id.locationName", header: "Location" },
        ];

        // Keep only columns that appear in at least one row (avoid too many empty columns).
        const activeCols = columns.filter((c) =>
            normalizedRows.some((r) => {
                const v = getByPath(r, c.key);
                return v !== undefined && v !== null && String(v) !== "";
            })
        );

        const doc = new jsPDF("l", "pt", "a4");
        doc.setFontSize(14);
        doc.text(title, 40, 36);
        doc.setFontSize(10);
        doc.text(`Rows: ${normalizedRows.length}`, 40, 52);

        const head = [["S.No", ...activeCols.map((c) => c.header)]];
        const body = normalizedRows.map((r, idx) => [
            String(idx + 1),
            ...activeCols.map((c) => String(getByPath(r, c.key) ?? "")),
        ]);

        const createdAtColIndex = activeCols.findIndex((c) => c.key === "createdAt");
        const updatedAtColIndex = activeCols.findIndex((c) => c.key === "updatedAt");
        const columnStyles = {};
        // +1 because S.No is the first column in the table
        if (createdAtColIndex >= 0) columnStyles[createdAtColIndex + 1] = { cellWidth: 95 };
        if (updatedAtColIndex >= 0) columnStyles[updatedAtColIndex + 1] = { cellWidth: 95 };

        autoTable(doc, {
            head,
            body,
            startY: 64,
            theme: "grid",
            styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", cellWidth: "wrap" },
            headStyles: { fontStyle: "bold" },
            columnStyles,
            horizontalPageBreak: true,
            rowPageBreak: "auto",
        });

        doc.save(fileName);
        return true;
    };

    const createTransactionSummaryPDF = ({ rows, title, fileName }) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return false;
        }

        const columns = [
            {
                header: "Roll No",
                accessor: (t) => t?.registration_number ?? t?.Roll_no ?? "",
            },
            { header: "Board", accessor: (t) => t?.board_name ?? "" },
            { header: "Transaction", accessor: (t) => t?.transaction ?? "" },
            { header: "Source", accessor: (t) => t?.source ?? "" },
            { header: "Type", accessor: (t) => t?.type ?? "" },
            { header: "Amount", accessor: (t) => t?.amount ?? "" },
            { header: "Created At", accessor: (t) => formatDateTime(t?.createdAt) },
        ];

        const doc = new jsPDF("l", "pt", "a4");
        doc.setFontSize(14);
        doc.text(title, 40, 36);
        doc.setFontSize(10);
        doc.text(`Rows: ${normalizedRows.length}`, 40, 52);

        const head = [["S.No", ...columns.map((c) => c.header)]];
        const body = normalizedRows.map((t, idx) => [
            String(idx + 1),
            ...columns.map((c) => String(c.accessor(t) ?? "")),
        ]);

        autoTable(doc, {
            head,
            body,
            startY: 64,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
            headStyles: { fontStyle: "bold" },
            columnStyles: {
                0: { cellWidth: 30 }, // S.No
                1: { cellWidth: 70 }, // Roll No
                2: { cellWidth: 55 }, // Board
                6: { cellWidth: 60 }, // Amount
                7: { cellWidth: 130 }, // Created At
            },
        });

        doc.save(fileName);
        return true;
    };

    const createTuckShopPDF = ({ rows, title, fileName }) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return false;
        }

        const columns = [
            { header: "Roll No", accessor: (r) => r?.registration_number ?? r?.Roll_no ?? "" },
            { header: "Board", accessor: (r) => r?.board_name ?? "" },
            { header: "Product", accessor: (r) => r?.productName ?? "" },
            { header: "Category", accessor: (r) => r?.category ?? "" },
            { header: "Qty", accessor: (r) => r?.quantity ?? "" },
            { header: "Price", accessor: (r) => r?.price ?? "" },
            { header: "Total", accessor: (r) => r?.totalAmount ?? "" },
            { header: "Created At", accessor: (r) => formatDateTime(r?.createdAt) },
        ];

        const doc = new jsPDF("l", "pt", "a4");
        doc.setFontSize(14);
        doc.text(title, 40, 36);
        doc.setFontSize(10);
        doc.text(`Rows: ${normalizedRows.length}`, 40, 52);

        const head = [["S.No", ...columns.map((c) => c.header)]];
        const body = normalizedRows.map((r, idx) => [
            String(idx + 1),
            ...columns.map((c) => String(c.accessor(r) ?? "")),
        ]);

        autoTable(doc, {
            head,
            body,
            startY: 64,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
            headStyles: { fontStyle: "bold" },
            columnStyles: {
                0: { cellWidth: 30 }, // S.No
                1: { cellWidth: 70 }, // Roll No
                2: { cellWidth: 55 }, // Board
                5: { cellWidth: 35 }, // Qty
                6: { cellWidth: 45 }, // Price
                7: { cellWidth: 55 }, // Total
                8: { cellWidth: 130 }, // Created At
            },
        });

        doc.save(fileName);
        return true;
    };

    const createInventoryPDF = ({ rows, title, fileName }) => {
        const normalizedRows = normalizeRows(rows);
        if (normalizedRows.length === 0) {
            enqueueSnackbar("No data available for the selected filters", { variant: "warning" });
            return false;
        }

        const columns = [
            { header: "Item No", accessor: (i) => i?.itemNo ?? "" },
            { header: "Item Name", accessor: (i) => i?.itemName ?? "" },
            { header: "Category", accessor: (i) => i?.category ?? "" },
            { header: "Price", accessor: (i) => i?.price ?? "" },
            { header: "Stock Qty", accessor: (i) => i?.stockQuantity ?? i?.totalQty ?? "" },
            { header: "Status", accessor: (i) => i?.status ?? "" },
            { header: "Created At", accessor: (i) => formatDateTime(i?.createdAt) },
            { header: "Updated At", accessor: (i) => formatDateTime(i?.updatedAt) },
        ];

        const doc = new jsPDF("l", "pt", "a4");
        doc.setFontSize(14);
        doc.text(title, 40, 36);
        doc.setFontSize(10);
        doc.text(`Rows: ${normalizedRows.length}`, 40, 52);

        const head = [["S.No", ...columns.map((c) => c.header)]];
        const body = normalizedRows.map((i, idx) => [
            String(idx + 1),
            ...columns.map((c) => String(c.accessor(i) ?? "")),
        ]);

        autoTable(doc, {
            head,
            body,
            startY: 64,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", cellWidth: "wrap" },
            headStyles: { fontStyle: "bold" },
            columnStyles: {
                0: { cellWidth: 30 }, // S.No
                1: { cellWidth: 70 }, // Item No
                4: { cellWidth: 55 }, // Price
                5: { cellWidth: 60 }, // Stock Qty
                7: { cellWidth: 130 }, // Created At
                8: { cellWidth: 130 }, // Updated At
            },
        });

        doc.save(fileName);
        return true;
    };

    /* =======================
       SUBMIT
    ======================= */

    const getBackendErrorMessage = (err) => {
        if (!err) return "Report generation failed";
        if (typeof err === "string") return err;

        const data = err?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        if (data?.message) return String(data.message);
        if (data?.error) return String(data.error);

        const errors = data?.errors;
        if (Array.isArray(errors) && errors.length) {
            return errors
                .map((e) => (typeof e === "string" ? e : e?.message))
                .filter(Boolean)
                .join(", ");
        }
        if (errors && typeof errors === "object") {
            const msgs = Object.values(errors)
                .flat()
                .map((e) => (typeof e === "string" ? e : e?.message ?? e))
                .filter(Boolean);
            if (msgs.length) return msgs.join(", ");
        }

        if (err?.message) return String(err.message);
        return "Report generation failed";
    };

    const generate = async () => {
        try {
                const res = await reportMutation.mutateAsync({
                    url: apiUrl.apiUrl,
                    payload: {
                    ...payload,
                    ...(apiUrl.id === 1 &&
                        filterByStudent &&
                        student?.registration_number
                        ? { registration_number: student.registration_number }
                        : {}),
                    ...([1, 2, 3, 5].includes(apiUrl.id) && boardName
                        ? { board_name: boardName }
                        : {}),
                },
                format,
            });

            if (format === "csv") {
                const blob = new Blob([res], { type: "text/csv" });
                download(blob, "report.csv");
            }

            if (format === "excel") {
                const safeTitle = sanitizeFileName(apiUrl.title);
                const excelName = `${safeTitle}.xlsx`;

                // If API returns a real Excel file
                if (typeof Blob !== "undefined" && res instanceof Blob) {
                    const type = String(res.type ?? "").toLowerCase();

                    // Try to detect JSON wrapped in a Blob (common when responseType is blob but API returns JSON)
                    const looksLikeJson =
                        type.includes("application/json") ||
                        type.includes("text/plain") ||
                        type.includes("application/octet-stream") ||
                        type === "";

                    if (looksLikeJson && (type.includes("json") || res.size < 2_000_000)) {
                        try {
                            const text = await res.text();
                            const parsed = JSON.parse(text);
                            if (apiUrl.id === 1) {
                                const excelBlob = createStudentReportExcel(parsed);
                                if (excelBlob) {
                                    download(excelBlob, `${safeTitle}.xls`);
                                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                                    return;
                                }
                            }
                            if (apiUrl.id === 2) {
                                const excelBlob = createTransactionSummaryExcel(parsed);
                                if (excelBlob) {
                                    download(excelBlob, `${safeTitle}.xls`);
                                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                                    return;
                                }
                            }
                            if (apiUrl.id === 3) {
                                const excelBlob = createCanteenSalesExcel(parsed);
                                if (excelBlob) {
                                    download(excelBlob, `${safeTitle}.xls`);
                                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                                    return;
                                }
                            }
                            if (apiUrl.id === 5) {
                                const excelBlob = createInventoryExcel(parsed);
                                if (excelBlob) {
                                    download(excelBlob, `${safeTitle}.xls`);
                                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                                    return;
                                }
                            }
                        } catch {
                            // not JSON, continue to download as file
                        }
                    }

                    download(res, excelName);
                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                    return;
                }

                // JSON response -> build Excel on client (Student Report first)
                if (apiUrl.id === 1) {
                    const excelBlob = createStudentReportExcel(res);
                    if (!excelBlob) return;
                    download(excelBlob, `${safeTitle}.xls`);
                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                    return;
                }

                if (apiUrl.id === 2) {
                    const excelBlob = createTransactionSummaryExcel(res);
                    if (!excelBlob) return;
                    download(excelBlob, `${safeTitle}.xls`);
                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                    return;
                }

                if (apiUrl.id === 3) {
                    const excelBlob = createCanteenSalesExcel(res);
                    if (!excelBlob) return;
                    download(excelBlob, `${safeTitle}.xls`);
                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                    return;
                }

                if (apiUrl.id === 5) {
                    const excelBlob = createInventoryExcel(res);
                    if (!excelBlob) return;
                    download(excelBlob, `${safeTitle}.xls`);
                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                    return;
                }

                // fallback for other reports
                enqueueSnackbar("Excel export not configured for this report yet", { variant: "warning" });
                return;
            }

            if (format === "pdf") {
                const safeTitle = sanitizeFileName(apiUrl.title);
                const fileName = `${safeTitle}.pdf`;

                if (typeof Blob !== "undefined" && res instanceof Blob) {
                    download(res, fileName);
                    enqueueSnackbar("Report generated successfully", { variant: "success" });
                    return;
                }

                const rows = apiUrl.id === 2 ? res?.transactions ?? res : res;

                const ok =
                    apiUrl.id === 1
                        ? createStudentReportPDF({ rows, title: apiUrl.title, fileName })
                        : apiUrl.id === 2
                            ? createTransactionSummaryPDF({ rows, title: apiUrl.title, fileName })
                            : apiUrl.id === 3
                                ? createTuckShopPDF({ rows, title: apiUrl.title, fileName })
                                : apiUrl.id === 5
                                    ? createInventoryPDF({ rows, title: apiUrl.title, fileName })
                                    : createPDF({ rows, title: apiUrl.title, fileName });

                if (!ok) return;
            }

            enqueueSnackbar("Report generated successfully", { variant: "success" });
        } catch (e) {
            enqueueSnackbar(getBackendErrorMessage(e), { variant: "error" });
        }
    };

    const download = (blob, name) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* =======================
       UI
    ======================= */

    return (
        <div className="p-4 md:p-2 md:p-6 bg-gray-50">
            <Typography variant="h5" className="mb-6 font-bold">
                Financial Reports
            </Typography>
            <h3>Generate and view comprehensive financial reports</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">

                {/* Report Type */}
                <Card>
                    <CardContent className="space-y-5">
                        <h1 className="text-2xl font-bold">Report Types</h1>
                        {reportTypes.map((r) => (
                            <div
                                key={r.id}
                                onClick={() => setApiUrl(r)}
                                className={`p-3 border rounded cursor-pointer flex justify-between ${apiUrl.id === r.id && "bg-primary text-white"
                                    }`}
                            >
                                <span>{r.title}</span>
                                <ChevronRight />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                    <CardContent className="space-y-4">
                        <h1 className="text-2xl font-bold">Report Parameters</h1>
                        {apiUrl.id === 2 && (
                            <TextField
                                select
                                fullWidth
                                size="large"
                                label={
                                    <>
                                        Frequency
                                        <span className="text-red-600 "> *</span>
                                    </>
                                }
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                sx={{ marginBottom: "1rem" }}
                            >
                                <MenuItem value="">
                                    Select frequency
                                </MenuItem>

                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="yearly">Yearly</MenuItem>
                            </TextField>
                        )}


                        {apiUrl.id !== 2 && (
                            <>
                                <TextField
                                    select
                                    fullWidth
                                    size="large"
                                    label={
                                        <>
                                            Date Range
                                            {/* <span className="text-red-600 "> *</span> */}
                                        </>
                                    }
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    sx={{ marginBottom: "1rem" }}
                                >
                                    <MenuItem value="">
                                        Select date range
                                    </MenuItem>

                                    <MenuItem value="7daysago">Last 7 days</MenuItem>
                                    <MenuItem value="1monthago">Last 30 days</MenuItem>
                                    <MenuItem value="custom">Custom</MenuItem>
                                </TextField>

                                {dateRange === "custom" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <TextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                        <TextField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                )}
                            </>
                        )}

                        {[1, 2, 3, 5].includes(apiUrl.id) && (
                            <>
                                <TextField
                                    fullWidth
                                    select
                                    size="large"
                                    label="Board Name"
                                    value={boardName}
                                    onChange={(e) => setBoardName(e.target.value)}
                                    sx={{ marginBottom: "1rem" }}
                                >
                                    <MenuItem value="">All Boards</MenuItem>
                                    <MenuItem value="State">
                                        State
                                    </MenuItem>
                                    <MenuItem value="CBSE">CBSE</MenuItem>
                                    <MenuItem value="ICSE">ICSE</MenuItem>
                                    <MenuItem value="IB">IB</MenuItem>
                                </TextField>

                                {apiUrl.id === 1 && <Autocomplete
                                    options={students}
                                    value={student}
                                    loading={isFetching}
                                    filterOptions={(x) => x}
                                    onChange={(_, v) => setStudent(v)}
                                    onInputChange={(_, value, reason) => {
                                        // reason guards avoid resetting when selecting option
                                        if (reason === "input") {
                                            setStudentSearch(value);
                                            setPage(1); // reset to first page on new search
                                        }
                                    }}
                                    getOptionLabel={(o) =>
                                        o ? `${o.registration_number} - ${o.student_name}` : ""
                                    }
                                    isOptionEqualToValue={(o, v) => o?._id === v?._id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Search Student ID"
                                            size="medium"
                                            placeholder="Type registration number..."
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <>
                                                        {isFetching ? <CircularProgress size={18} /> : null}
                                                        {params.InputProps.endAdornment}
                                                    </>
                                                ),
                                            }}
                                        />
                                    )}
                                />}

                                {/* {apiUrl.id === 1 && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={filterByStudent}
                                                onChange={(e) => setFilterByStudent(e.target.checked)}
                                            />
                                        }
                                        label="Generate for selected student only"
                                    />
                                )} */}
                            </>
                        )}

                        <Select fullWidth value={format} onChange={(e) => setFormat(e.target.value)}>
                            <MenuItem value="pdf">PDF</MenuItem>
                            <MenuItem value="excel">Excel</MenuItem>
                            <MenuItem value="csv">CSV</MenuItem>
                        </Select>

                        <Button
                            variant="contained"
                            onClick={generate}
                            disabled={reportMutation.isPending}
                            className="bg-primary!"
                        >
                            {reportMutation.isPending ? "Generating..." : "Generate Report"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Stats */}
                <Card>
                    <CardContent className="space-y-4">
                        <h1 className="text-2xl font-bold">Quick Statistics</h1>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-1">Total System Balance</p>
                                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats?.data?.totalSystemBalance}</p>
                            </div>
                            <div className={`p-2 rounded-lg bg-blue-50 shrink-0 ml-3`}>
                                <BarChart3 className={`h-5 w-5 md:h-6 md:w-6 text-blue-600`} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-1">Monthly Deposits</p>
                                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats?.data?.monthluyDeposits}</p>
                            </div>
                            <div className={`p-2 rounded-lg bg-blue-50 shrink-0 ml-3`}>
                                <TrendingUp className={`h-5 w-5 md:h-6 md:w-6 text-blue-600`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
